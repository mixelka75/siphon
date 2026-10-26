package proxy

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptrace"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"siphon/internal/capture"
	"siphon/internal/rules"
)

// Сколько байт одного тела держим в памяти для показа.
const maxBodyCapture = 64 << 20

type connHandler struct{ info *connInfo }

func (h *connHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	info := h.info
	info.wg.Add(1)
	defer info.wg.Done()
	l := info.l

	target, direct := h.target(r)
	if direct {
		l.serveLanding(w, r)
		return
	}
	if target == nil {
		http.Error(w, "Siphon: не удалось определить адрес назначения", http.StatusBadRequest)
		return
	}
	if isWebSocketUpgrade(r) && r.ProtoMajor == 1 {
		h.serveWebSocket(w, r, target)
		return
	}
	h.serveRequest(w, r, target)
}

// target определяет, куда на самом деле шёл запрос.
// direct=true — клиент обратился к самому прокси (страница с сертификатом).
func (h *connHandler) target(r *http.Request) (u *url.URL, direct bool) {
	info := h.info
	if info.scheme == "" {
		if r.URL.IsAbs() {
			cp := *r.URL
			return &cp, false
		}
		return nil, true
	}

	// Внутри туннеля. Имя из CONNECT/SOCKS главнее заголовка Host; если же
	// пришёл голый IP (так делает нативный hook), берём имя из SNI/Host.
	host := info.destHost
	if net.ParseIP(host) != nil {
		if info.sni != "" {
			host = info.sni
		} else if hh, _ := splitHostPort(r.Host, 0); hh != "" {
			host = hh
		}
	}
	cp := *r.URL
	cp.Scheme = info.scheme
	cp.Host = hostPort(host, info.destPort, info.scheme)
	cp.User = nil
	return &cp, false
}

func hostPort(host string, port int, scheme string) string {
	def := 80
	if scheme == "https" || scheme == "wss" {
		def = 443
	}
	if strings.Contains(host, ":") { // IPv6
		host = "[" + host + "]"
	}
	if port == def || port == 0 {
		return host
	}
	return host + ":" + strconv.Itoa(port)
}

func urlPort(u *url.URL) int {
	if p := u.Port(); p != "" {
		n, _ := strconv.Atoi(p)
		return n
	}
	switch u.Scheme {
	case "https", "wss":
		return 443
	}
	return 80
}

var hopByHop = []string{
	"Connection", "Proxy-Connection", "Keep-Alive", "Proxy-Authenticate",
	"Proxy-Authorization", "Te", "Trailer", "Transfer-Encoding", "Upgrade",
}

func removeHopByHop(h http.Header) {
	// Заголовки, перечисленные в Connection, тоже относятся к hop-by-hop.
	for _, v := range h.Values("Connection") {
		for _, f := range strings.Split(v, ",") {
			if f = strings.TrimSpace(f); f != "" {
				h.Del(f)
			}
		}
	}
	for _, k := range hopByHop {
		h.Del(k)
	}
}

func toHeaders(h http.Header, host string) []capture.Header {
	out := make([]capture.Header, 0, len(h)+1)
	if host != "" {
		out = append(out, capture.Header{Name: "Host", Value: host})
	}
	for name, vals := range h {
		for _, v := range vals {
			out = append(out, capture.Header{Name: name, Value: v})
		}
	}
	return out
}

func msSince(t time.Time) float64 {
	return float64(time.Since(t).Microseconds()) / 1000
}

// tap запоминает начало потока байт (до лимита) и считает общий размер.
type tap struct {
	mu        sync.Mutex
	max       int
	buf       []byte
	total     int64
	truncated bool
}

func (t *tap) write(p []byte) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.total += int64(len(p))
	room := t.max - len(t.buf)
	if room <= 0 {
		t.truncated = true
		return
	}
	if len(p) > room {
		p = p[:room]
		t.truncated = true
	}
	t.buf = append(t.buf, p...)
}

func (t *tap) snapshot() (data []byte, total int64, truncated bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.buf, t.total, t.truncated
}

type tapReader struct {
	rc    io.ReadCloser
	tap   *tap
	onEOF func()
	once  sync.Once
}

func (t *tapReader) Read(p []byte) (int, error) {
	n, err := t.rc.Read(p)
	if n > 0 {
		t.tap.write(p[:n])
	}
	if err == io.EOF {
		t.once.Do(t.onEOF)
	}
	return n, err
}

func (t *tapReader) Close() error { return t.rc.Close() }

func (h *connHandler) serveRequest(w http.ResponseWriter, r *http.Request, target *url.URL) {
	l := h.info.l
	started := time.Now()

	hostHeader := r.Host
	if hostHeader == "" {
		hostHeader = target.Host
	}

	snap := l.e.Store.Add(&capture.Exchange{
		Kind: capture.KindHTTP, Source: l.label, ClientAddr: h.info.clientAddr,
		State: capture.StatePending, Started: started,
		Method: r.Method, Scheme: target.Scheme, Host: target.Hostname(), Port: urlPort(target),
		Path: target.RequestURI(), URL: target.String(), Proto: r.Proto,
		ClientTLS: h.info.clientTLS,
		Request: &capture.Message{
			Headers:     toHeaders(r.Header, hostHeader),
			Size:        max(r.ContentLength, 0),
			ContentType: r.Header.Get("Content-Type"),
			Encoding:    r.Header.Get("Content-Encoding"),
		},
	})
	f := &flow{
		h: h, w: w, r: r, id: snap.ID, started: started, target: target,
		hostHeader: hostHeader, reqTap: &tap{max: maxBodyCapture},
	}
	f.run()
}

// flow — путь одного HTTP-запроса через прокси со всеми стадиями правил.
type flow struct {
	h          *connHandler
	w          http.ResponseWriter
	r          *http.Request
	id         string
	started    time.Time
	target     *url.URL
	hostHeader string
	rule       *rules.Rule

	reqTap     *tap
	reqDoneNs  atomic.Int64
	serverAddr string
}

func (f *flow) engine() *Engine                   { return f.h.info.l.e }
func (f *flow) store() *capture.Store             { return f.h.info.l.e.Store }
func (f *flow) markReqDone()                      { f.reqDoneNs.CompareAndSwap(0, int64(time.Since(f.started))+1) }
func (f *flow) update(fn func(*capture.Exchange)) { f.store().Update(f.id, fn) }

func (f *flow) sleep(ms int) bool {
	select {
	case <-time.After(time.Duration(ms) * time.Millisecond):
		return true
	case <-f.r.Context().Done():
		return false
	}
}

func (f *flow) run() {
	e := f.engine()
	f.rule = e.Rules.Match(rules.Request{
		Method: f.r.Method, URL: f.target, Source: f.h.info.l.label, Header: f.r.Header,
	})
	rule := f.rule
	if rule != nil {
		name := rule.Name
		if name == "" {
			name = "без названия"
		}
		f.update(func(ex *capture.Exchange) { ex.Rule = name })

		if rule.DelayMs > 0 && !f.sleep(rule.DelayMs) {
			f.markAborted()
			return
		}
		if rule.Block == "reset" {
			f.update(func(ex *capture.Exchange) {
				ex.State, ex.Error = capture.StateError, "соединение оборвано правилом"
				ex.Timing.End = msSince(f.started)
			})
			panic(http.ErrAbortHandler)
		}
	}

	out := f.buildRequest()
	needBody := rule != nil && (rule.Mock != nil || rule.BreakRequest || rule.Request.NeedsBody())

	var reqBody []byte
	if needBody {
		var ok bool
		if reqBody, ok = f.readRequestBody(); !ok {
			return
		}
	} else if f.r.Body != nil && f.r.Body != http.NoBody {
		out.Body = &tapReader{rc: f.r.Body, tap: f.reqTap, onEOF: f.markReqDone}
	} else {
		f.markReqDone()
	}

	if rule != nil && rule.Mock != nil {
		f.serveMock(rule.Mock)
		return
	}

	edited := false
	if rule != nil && rule.BreakRequest {
		res, ok := f.pause("request")
		if !ok {
			return
		}
		var err error
		if reqBody, err = f.applyRequestResolution(out, reqBody, res); err != nil {
			f.fail(http.StatusBadRequest, err.Error())
			return
		}
		edited = true
	}
	if rule != nil && !rule.Request.Empty() {
		rule.Request.ApplyHeaders(out.Header)
		if host := out.Header.Get("Host"); host != "" {
			out.Host = host
			out.Header.Del("Host")
		}
		if rule.Request.NeedsBody() {
			plain := reqBody
			decodable := true
			if enc := out.Header.Get("Content-Encoding"); enc != "" {
				if dec, err := capture.Decode(enc, reqBody); err == nil {
					plain = dec
					out.Header.Del("Content-Encoding")
				} else {
					decodable = false
				}
			}
			if decodable {
				reqBody = rule.Request.ApplyBody(plain)
			}
		}
		edited = true
	}
	if rule != nil && rule.RedirectTo != "" {
		u, err := rule.RedirectURL(out.URL)
		if err != nil {
			f.fail(http.StatusBadGateway, err.Error())
			return
		}
		out.URL, out.Host = u, u.Host
		edited = true
	}
	if needBody {
		out.Body = io.NopCloser(bytes.NewReader(reqBody))
		out.ContentLength = int64(len(reqBody))
		out.Header.Del("Content-Length")
		out.TransferEncoding = nil
	}
	if edited {
		f.recordEditedRequest(out, reqBody, needBody)
	}
	f.forward(out)
}

func (f *flow) buildRequest() *http.Request {
	u := *f.target
	out := f.r.Clone(f.r.Context())
	out.URL = &u
	out.Host = f.hostHeader
	out.RequestURI = ""
	out.Close = false
	removeHopByHop(out.Header)
	if _, ok := out.Header["User-Agent"]; !ok {
		out.Header["User-Agent"] = []string{""} // не дать Go подставить свой User-Agent
	}
	return out
}

func (f *flow) readRequestBody() ([]byte, bool) {
	if f.r.Body == nil || f.r.Body == http.NoBody {
		f.markReqDone()
		return nil, true
	}
	data, err := io.ReadAll(io.LimitReader(f.r.Body, maxBodyCapture+1))
	if err != nil {
		f.failRequest(err)
		return nil, false
	}
	if len(data) > maxBodyCapture {
		f.fail(http.StatusRequestEntityTooLarge, "тело запроса слишком велико, чтобы применять к нему правило")
		return nil, false
	}
	f.reqTap.write(data)
	f.markReqDone()
	return data, true
}

// pause останавливает запрос на breakpoint и ждёт решения. Возвращает false,
// если дальше идти не нужно (клиент ушёл) — оборванный пользователем запрос
// завершается паникой http.ErrAbortHandler, которая обрывает соединение/поток.
func (f *flow) pause(kind string) (rules.Resolution, bool) {
	body := f.reqTap
	if kind == "request" {
		data, _, _ := body.snapshot()
		f.store().SetBody(f.id, true, data)
	}
	res, err := f.engine().Breaks.WaitReady(f.r.Context(), f.id, func() {
		f.update(func(ex *capture.Exchange) { ex.State, ex.Breakpoint = capture.StatePaused, kind })
	})
	if err != nil {
		f.update(func(ex *capture.Exchange) {
			ex.State, ex.Breakpoint, ex.Error = capture.StateAborted, "", "клиент оборвал соединение на breakpoint"
			ex.Timing.End = msSince(f.started)
		})
		return res, false
	}
	if res.Drop {
		f.update(func(ex *capture.Exchange) {
			ex.State, ex.Breakpoint, ex.Error = capture.StateAborted, "", "оборвано пользователем на breakpoint"
			ex.Timing.End = msSince(f.started)
		})
		panic(http.ErrAbortHandler)
	}
	f.update(func(ex *capture.Exchange) { ex.State, ex.Breakpoint = capture.StatePending, "" })
	return res, true
}

func headersFrom(list []capture.Header) http.Header {
	h := http.Header{}
	for _, kv := range list {
		h.Add(kv.Name, kv.Value)
	}
	return h
}

func (f *flow) applyRequestResolution(out *http.Request, body []byte, res rules.Resolution) ([]byte, error) {
	if res.Method != "" {
		out.Method = strings.ToUpper(strings.TrimSpace(res.Method))
	}
	if res.URL != "" {
		u, err := url.Parse(strings.TrimSpace(res.URL))
		if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
			return body, errors.New("адрес запроса должен быть вида https://host/path")
		}
		out.URL, out.Host = u, u.Host
	}
	if res.Headers != nil {
		h := http.Header{}
		for _, kv := range *res.Headers {
			if strings.EqualFold(kv.Name, "host") {
				out.Host = kv.Value
				continue
			}
			h.Add(kv.Name, kv.Value)
		}
		removeHopByHop(h)
		if _, ok := h["User-Agent"]; !ok {
			h["User-Agent"] = []string{""}
		}
		out.Header = h
	}
	if nb, set, err := res.BodyBytes(); err != nil {
		return body, errors.New("тело запроса: неверный base64")
	} else if set {
		body = nb
		out.Header.Del("Content-Encoding") // новое тело — открытым текстом
	}
	return body, nil
}

// recordEditedRequest показывает в списке запрос в том виде, в каком он реально уходит на сервер.
func (f *flow) recordEditedRequest(out *http.Request, body []byte, bodyKnown bool) {
	if bodyKnown {
		f.reqTap = &tap{max: maxBodyCapture}
		f.reqTap.write(body)
	}
	f.update(func(ex *capture.Exchange) {
		ex.Edited = true
		ex.Method = out.Method
		ex.Scheme, ex.Host, ex.Port = out.URL.Scheme, out.URL.Hostname(), urlPort(out.URL)
		ex.Path, ex.URL = out.URL.RequestURI(), out.URL.String()
		ex.Request = &capture.Message{
			Headers:     toHeaders(out.Header, out.Host),
			Size:        int64(len(body)),
			ContentType: out.Header.Get("Content-Type"),
			Encoding:    out.Header.Get("Content-Encoding"),
		}
	})
}

func (f *flow) finishReqBody() {
	data, total, trunc := f.reqTap.snapshot()
	if len(data) > 0 {
		f.store().SetBody(f.id, true, data)
	}
	f.update(func(ex *capture.Exchange) {
		if ex.Request != nil {
			m := *ex.Request
			m.Size, m.Truncated = total, trunc
			ex.Request = &m
		}
		if ns := f.reqDoneNs.Load(); ns > 0 {
			ex.Timing.RequestDone = float64(ns) / 1e6
		}
	})
}

func (f *flow) serveMock(m *rules.Mock) {
	body := []byte(m.Body)
	if m.BodyBase64 != "" {
		if b, err := base64.StdEncoding.DecodeString(m.BodyBase64); err == nil {
			body = b
		}
	}
	hdr := f.w.Header()
	for _, kv := range m.Headers {
		hdr.Add(kv.Name, kv.Value)
	}
	if hdr.Get("Content-Type") == "" && len(body) > 0 {
		hdr.Set("Content-Type", http.DetectContentType(body))
	}
	hdr.Set("Content-Length", strconv.Itoa(len(body)))
	status := m.Status
	if status == 0 {
		status = http.StatusOK
	}
	f.w.WriteHeader(status)
	_, werr := f.w.Write(body)

	f.finishReqBody()
	if len(body) > 0 {
		f.store().SetBody(f.id, false, body)
	}
	f.update(func(ex *capture.Exchange) {
		ex.Response = &capture.Message{
			Status: status, StatusText: http.StatusText(status), Headers: toHeaders(hdr, ""),
			Size: int64(len(body)), ContentType: hdr.Get("Content-Type"), Encoding: hdr.Get("Content-Encoding"),
		}
		ex.Timing.ResponseStart = msSince(f.started)
		ex.Timing.End = ex.Timing.ResponseStart
		ex.State = capture.StateDone
		if werr != nil {
			ex.State, ex.Error = capture.StateAborted, "клиент оборвал соединение"
		}
	})
}

func (f *flow) forward(out *http.Request) {
	e := f.engine()
	trace := &httptrace.ClientTrace{
		GotConn: func(i httptrace.GotConnInfo) {
			if i.Conn != nil {
				f.serverAddr = i.Conn.RemoteAddr().String()
			}
		},
	}
	out = out.WithContext(httptrace.WithClientTrace(out.Context(), trace))

	insecure := e.Settings.IgnoreCertErrors(out.URL.Hostname())
	resp, err := e.transport(insecure).RoundTrip(out)
	f.markReqDone()
	if err != nil {
		f.finishReqBody()
		f.failRequest(err)
		return
	}

	rule := f.rule
	if rule != nil && (rule.BreakResponse || rule.Response.NeedsBody()) {
		f.respondBuffered(resp)
		return
	}
	f.respondStreaming(resp)
}

func (f *flow) recordResponse(status int, hdr http.Header, size int64, resp *http.Response) {
	f.update(func(ex *capture.Exchange) {
		ex.Response = &capture.Message{
			Status: status, StatusText: http.StatusText(status), Headers: toHeaders(hdr, ""),
			Size: size, ContentType: hdr.Get("Content-Type"), Encoding: hdr.Get("Content-Encoding"),
		}
		ex.ServerAddr = f.serverAddr
		ex.ServerTLS = serverTLSInfo(resp.TLS)
		ex.Timing.ResponseStart = msSince(f.started)
	})
}

func (f *flow) respondStreaming(resp *http.Response) {
	defer resp.Body.Close()
	rule := f.rule

	hdr := f.w.Header()
	for k, vv := range resp.Header {
		hdr[k] = append([]string(nil), vv...)
	}
	removeHopByHop(hdr)
	status := resp.StatusCode
	edited := false
	if rule != nil && !rule.Response.Empty() {
		rule.Response.ApplyHeaders(hdr)
		if rule.Response.Status != 0 {
			status = rule.Response.Status
		}
		edited = true
	}

	f.recordResponse(status, hdr, max(resp.ContentLength, 0), resp)
	if edited {
		f.update(func(ex *capture.Exchange) { ex.Edited = true })
	}
	f.w.WriteHeader(status)

	respTap := &tap{max: maxBodyCapture}
	_, copyErr := copyBody(f.w, resp.Body, respTap, resp.ContentLength < 0)

	// Трейлеры (например, grpc-status) доступны только после чтения тела.
	for k, vv := range resp.Trailer {
		for _, v := range vv {
			hdr.Add(http.TrailerPrefix+k, v)
		}
	}

	f.finishReqBody()
	data, total, trunc := respTap.snapshot()
	if len(data) > 0 {
		f.store().SetBody(f.id, false, data)
	}
	f.update(func(ex *capture.Exchange) {
		if ex.Response != nil {
			m := *ex.Response
			m.Size, m.Truncated = total, trunc
			if len(resp.Trailer) > 0 {
				m.Headers = append(append([]capture.Header(nil), m.Headers...), toHeaders(resp.Trailer, "")...)
			}
			ex.Response = &m
		}
		ex.Timing.End = msSince(f.started)
		switch {
		case copyErr == nil:
			ex.State = capture.StateDone
		case f.r.Context().Err() != nil:
			ex.State, ex.Error = capture.StateAborted, "клиент оборвал соединение"
		default:
			ex.State, ex.Error = capture.StateError, copyErr.Error()
		}
	})
}

// respondBuffered читает ответ целиком — нужно, чтобы остановить его на breakpoint
// или поменять тело.
func (f *flow) respondBuffered(resp *http.Response) {
	defer resp.Body.Close()
	rule := f.rule

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyCapture+1))
	if err != nil {
		f.finishReqBody()
		f.failRequest(err)
		return
	}
	if len(body) > maxBodyCapture {
		f.finishReqBody()
		f.fail(http.StatusBadGateway, "ответ слишком велик, чтобы менять его правилом или breakpoint'ом")
		return
	}

	hdr := resp.Header.Clone()
	removeHopByHop(hdr)
	status := resp.StatusCode
	edited := false

	// Сначала фиксируем оригинал: на breakpoint пользователь должен увидеть его.
	f.finishReqBody()
	f.recordResponse(status, hdr, int64(len(body)), resp)
	f.store().SetBody(f.id, false, body)

	if rule.BreakResponse {
		res, ok := f.pause("response")
		if !ok {
			return
		}
		if res.Status != 0 {
			status, edited = res.Status, true
		}
		if res.Headers != nil {
			hdr, edited = headersFrom(*res.Headers), true
			removeHopByHop(hdr)
		}
		if nb, set, err := res.BodyBytes(); err == nil && set {
			body, edited = nb, true
			hdr.Del("Content-Encoding") // новое тело — открытым текстом
		}
	}
	if m := rule.Response; !m.Empty() {
		m.ApplyHeaders(hdr)
		if m.NeedsBody() {
			plain := body
			ok := true
			if enc := hdr.Get("Content-Encoding"); enc != "" {
				if dec, err := capture.Decode(enc, body); err == nil {
					plain = dec
					hdr.Del("Content-Encoding")
				} else {
					ok = false // неизвестная кодировка: тело не трогаем, чтобы не испортить
				}
			}
			if ok {
				body = m.ApplyBody(plain)
			}
		}
		if m.Status != 0 {
			status = m.Status
		}
		edited = true
	}

	hdr.Del("Transfer-Encoding")
	hdr.Set("Content-Length", strconv.Itoa(len(body)))
	out := f.w.Header()
	for k, vv := range hdr {
		out[k] = append([]string(nil), vv...)
	}
	f.w.WriteHeader(status)
	_, werr := f.w.Write(body)

	if edited {
		f.store().SetBody(f.id, false, body)
	}
	f.update(func(ex *capture.Exchange) {
		ex.Response = &capture.Message{
			Status: status, StatusText: http.StatusText(status), Headers: toHeaders(hdr, ""),
			Size: int64(len(body)), ContentType: hdr.Get("Content-Type"), Encoding: hdr.Get("Content-Encoding"),
		}
		ex.Edited = ex.Edited || edited
		ex.Timing.End = msSince(f.started)
		ex.State = capture.StateDone
		if werr != nil {
			ex.State, ex.Error = capture.StateAborted, "клиент оборвал соединение"
		}
	})
}

func (f *flow) markAborted() {
	f.update(func(ex *capture.Exchange) {
		ex.State, ex.Error = capture.StateAborted, "клиент оборвал запрос"
		ex.Timing.End = msSince(f.started)
	})
}

// fail завершает запись ошибкой и отвечает клиенту текстом Siphon.
func (f *flow) fail(status int, msg string) {
	f.update(func(ex *capture.Exchange) {
		ex.State, ex.Error = capture.StateError, msg
		ex.Timing.End = msSince(f.started)
	})
	f.w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	f.w.Header().Set("X-Siphon-Error", "rule")
	f.w.WriteHeader(status)
	fmt.Fprintf(f.w, "Siphon: %s\n", msg)
}

func (f *flow) failRequest(err error) {
	state, msg := capture.StateError, err.Error()
	if errors.Is(err, context.Canceled) || f.r.Context().Err() != nil {
		state, msg = capture.StateAborted, "клиент оборвал запрос"
	}
	f.update(func(ex *capture.Exchange) {
		ex.State, ex.Error = state, msg
		ex.Timing.End = msSince(f.started)
	})
	if state == capture.StateAborted {
		return
	}

	hint := ""
	if strings.Contains(msg, "x509:") || strings.Contains(msg, "tls:") {
		hint = "\n\nСертификат сервера не прошёл проверку. Если это ожидаемо, добавьте хост в " +
			"«игнорировать ошибки сертификата» в настройках Siphon."
	}
	f.w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	f.w.Header().Set("X-Siphon-Error", "upstream")
	f.w.WriteHeader(http.StatusBadGateway)
	fmt.Fprintf(f.w, "Siphon: не удалось получить ответ от сервера.\n\n%s%s\n", msg, hint)
}

// copyBody пишет тело клиенту и параллельно запоминает его. Для потоков без
// известной длины (SSE, gRPC, chunked) сбрасываем буфер после каждого чтения.
func copyBody(w http.ResponseWriter, src io.Reader, t *tap, flush bool) (int64, error) {
	rc := http.NewResponseController(w)
	buf := make([]byte, 32<<10)
	var total int64
	for {
		n, err := src.Read(buf)
		if n > 0 {
			t.write(buf[:n])
			if _, werr := w.Write(buf[:n]); werr != nil {
				return total, werr
			}
			total += int64(n)
			if flush {
				_ = rc.Flush()
			}
		}
		if err == io.EOF {
			return total, nil
		}
		if err != nil {
			return total, err
		}
	}
}

func serverTLSInfo(cs *tls.ConnectionState) *capture.TLSInfo {
	if cs == nil {
		return nil
	}
	info := &capture.TLSInfo{
		Version:    tlsVersionName(cs.Version),
		Cipher:     tls.CipherSuiteName(cs.CipherSuite),
		ALPN:       cs.NegotiatedProtocol,
		ServerName: cs.ServerName,
	}
	if len(cs.PeerCertificates) > 0 {
		c := cs.PeerCertificates[0]
		info.CertSubject = c.Subject.String()
		info.CertIssuer = c.Issuer.String()
		info.CertExpires = c.NotAfter.UTC().Format(time.RFC3339)
	}
	return info
}

// serveLanding — страница, которую видит человек, открывший адрес прокси в
// браузере: ссылка на сертификат.
func (l *Listener) serveLanding(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/ca.pem", "/ca.crt":
		w.Header().Set("Content-Type", "application/x-x509-ca-cert")
		w.Header().Set("Content-Disposition", `attachment; filename="siphon-ca.pem"`)
		_, _ = w.Write(l.e.CA.CertPEM())
	case "/ca.der", "/ca.cer":
		w.Header().Set("Content-Type", "application/x-x509-ca-cert")
		w.Header().Set("Content-Disposition", `attachment; filename="siphon-ca.cer"`)
		_, _ = w.Write(l.e.CA.CertDER())
	case "/":
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Siphon</title><body style="font:16px system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem">
<h1>Siphon proxy работает</h1>
<p>Чтобы расшифровывать HTTPS, установите корневой сертификат:</p>
<p><a href="/ca.pem">siphon-ca.pem</a> · <a href="/ca.der">siphon-ca.cer</a></p>`)
	default:
		http.NotFound(w, r)
	}
}
