package proxy

import (
	"bufio"
	"context"
	"crypto/tls"
	"encoding/binary"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"siphon/internal/capture"
)

func isWebSocketUpgrade(r *http.Request) bool {
	return strings.EqualFold(r.Header.Get("Upgrade"), "websocket") &&
		strings.Contains(strings.ToLower(r.Header.Get("Connection")), "upgrade")
}

func (h *connHandler) dialUpstreamConn(ctx context.Context, target *url.URL, insecure bool) (net.Conn, error) {
	e := h.info.l.e
	conn, err := e.dial(ctx, target.Hostname(), urlPort(target))
	if err != nil {
		return nil, err
	}
	if target.Scheme != "https" && target.Scheme != "wss" {
		return conn, nil
	}
	tc := tls.Client(conn, &tls.Config{
		ServerName:         target.Hostname(),
		InsecureSkipVerify: insecure,
		NextProtos:         []string{"http/1.1"},
	})
	_ = tc.SetDeadline(time.Now().Add(handshakeTimeout))
	if err := tc.HandshakeContext(ctx); err != nil {
		_ = conn.Close()
		return nil, err
	}
	_ = tc.SetDeadline(time.Time{})
	return tc, nil
}

// serveWebSocket пересылает апгрейд как есть и разбирает кадры в обе стороны.
// Расширение permessage-deflate вырезаем из запроса, чтобы кадры можно было
// прочитать без распаковки.
func (h *connHandler) serveWebSocket(w http.ResponseWriter, r *http.Request, target *url.URL) {
	l := h.info.l
	e := l.e
	started := time.Now()

	scheme := "ws"
	if target.Scheme == "https" {
		scheme = "wss"
	}
	hostHeader := r.Host
	if hostHeader == "" {
		hostHeader = target.Host
	}

	snap := e.Store.Add(&capture.Exchange{
		Kind: capture.KindWebSocket, Source: l.label, ClientAddr: h.info.clientAddr,
		State: capture.StatePending, Started: started,
		Method: r.Method, Scheme: scheme, Host: target.Hostname(), Port: urlPort(target),
		Path: target.RequestURI(), URL: scheme + "://" + target.Host + target.RequestURI(), Proto: r.Proto,
		ClientTLS: h.info.clientTLS,
		Request:   &capture.Message{Headers: toHeaders(r.Header, hostHeader)},
	})
	id := snap.ID

	fail := func(status int, msg string) {
		e.Store.Update(id, func(ex *capture.Exchange) {
			ex.State, ex.Error = capture.StateError, msg
			ex.Timing.End = msSince(started)
		})
		http.Error(w, "Siphon: "+msg, status)
	}

	insecure := e.Settings.IgnoreCertErrors(target.Hostname())
	up, err := h.dialUpstreamConn(r.Context(), target, insecure)
	if err != nil {
		fail(http.StatusBadGateway, "не удалось подключиться к WebSocket-серверу: "+err.Error())
		return
	}
	defer up.Close()

	out := r.Clone(r.Context())
	out.URL = target
	out.Host = hostHeader
	out.RequestURI = ""
	out.Header.Del("Sec-WebSocket-Extensions")
	out.Header.Del("Proxy-Connection")
	if _, ok := out.Header["User-Agent"]; !ok {
		out.Header["User-Agent"] = []string{""}
	}
	if err := out.Write(up); err != nil {
		fail(http.StatusBadGateway, "ошибка отправки апгрейда: "+err.Error())
		return
	}
	upReader := bufio.NewReader(up)
	resp, err := http.ReadResponse(upReader, out)
	if err != nil {
		fail(http.StatusBadGateway, "сервер не ответил на апгрейд: "+err.Error())
		return
	}

	e.Store.Update(id, func(ex *capture.Exchange) {
		ex.Response = &capture.Message{
			Status: resp.StatusCode, StatusText: http.StatusText(resp.StatusCode),
			Headers: toHeaders(resp.Header, ""),
		}
		ex.ServerAddr = up.RemoteAddr().String()
		if tc, ok := up.(*tls.Conn); ok {
			cs := tc.ConnectionState()
			ex.ServerTLS = serverTLSInfo(&cs)
		}
		ex.Timing.ResponseStart = msSince(started)
	})

	client, brw, err := http.NewResponseController(w).Hijack()
	if err != nil {
		e.Store.Update(id, func(ex *capture.Exchange) { ex.State, ex.Error = capture.StateError, err.Error() })
		return
	}
	defer client.Close()

	if resp.StatusCode != http.StatusSwitchingProtocols {
		// Сервер отказал в апгрейде — отдаём его ответ как обычный HTTP.
		_ = resp.Write(client)
		e.Store.Update(id, func(ex *capture.Exchange) {
			ex.State = capture.StateDone
			ex.Timing.End = msSince(started)
		})
		return
	}

	var sb strings.Builder
	sb.WriteString("HTTP/1.1 101 Switching Protocols\r\n")
	_ = resp.Header.Write(&sb)
	sb.WriteString("\r\n")
	if _, err := io.WriteString(client, sb.String()); err != nil {
		return
	}

	tapOut := &wsTap{store: e.Store, id: id, dir: "out"}
	tapIn := &wsTap{store: e.Store, id: id, dir: "in"}
	var nOut, nIn atomic.Int64
	var wg sync.WaitGroup
	wg.Add(2)
	go func() { // клиент → сервер
		defer wg.Done()
		n, _ := io.Copy(up, io.TeeReader(brw.Reader, tapOut))
		nOut.Add(n)
		_ = up.Close()
		_ = client.Close()
	}()
	go func() { // сервер → клиент
		defer wg.Done()
		n, _ := io.Copy(client, io.TeeReader(upReader, tapIn))
		nIn.Add(n)
		_ = up.Close()
		_ = client.Close()
	}()
	wg.Wait()

	l.finishStream(id, started, nOut.Load(), nIn.Load(), nil)
}

// wsTap — потоковый парсер WebSocket-кадров (RFC 6455). Он только подслушивает
// байты, ничего не меняя в потоке.
type wsTap struct {
	store *capture.Store
	id    string
	dir   string

	state     int // 0 — заголовок, 1 — тело кадра
	hdr       [14]byte
	hdrLen    int
	fin       bool
	opcode    byte
	masked    bool
	mask      [4]byte
	remaining int64
	maskPos   int

	msgKind  string
	msgBuf   []byte
	msgTotal int64
	msgTrunc bool
	ctlBuf   []byte
}

const maxWSCapture = 1 << 20

func (t *wsTap) Write(p []byte) (int, error) {
	n := len(p)
	for len(p) > 0 {
		if t.state == 0 {
			for len(p) > 0 && t.hdrLen < t.headerNeeded() {
				t.hdr[t.hdrLen] = p[0]
				t.hdrLen++
				p = p[1:]
			}
			if t.hdrLen < t.headerNeeded() {
				break
			}
			t.parseHeader()
			t.state = 1
			if t.remaining == 0 {
				t.endFrame()
			}
			continue
		}

		take := int64(len(p))
		if take > t.remaining {
			take = t.remaining
		}
		t.consume(p[:take])
		t.remaining -= take
		p = p[take:]
		if t.remaining == 0 {
			t.endFrame()
		}
	}
	return n, nil
}

func (t *wsTap) headerNeeded() int {
	if t.hdrLen < 2 {
		return 2
	}
	need := 2
	switch t.hdr[1] & 0x7f {
	case 126:
		need += 2
	case 127:
		need += 8
	}
	if t.hdr[1]&0x80 != 0 {
		need += 4
	}
	return need
}

func (t *wsTap) parseHeader() {
	t.fin = t.hdr[0]&0x80 != 0
	t.opcode = t.hdr[0] & 0x0f
	t.masked = t.hdr[1]&0x80 != 0
	off := 2
	switch l := t.hdr[1] & 0x7f; l {
	case 126:
		t.remaining = int64(binary.BigEndian.Uint16(t.hdr[2:4]))
		off = 4
	case 127:
		t.remaining = int64(binary.BigEndian.Uint64(t.hdr[2:10]))
		off = 10
	default:
		t.remaining = int64(l)
	}
	if t.masked {
		copy(t.mask[:], t.hdr[off:off+4])
	}
	t.maskPos = 0
}

func (t *wsTap) consume(chunk []byte) {
	isControl := t.opcode >= 8
	for _, b := range chunk {
		if t.masked {
			b ^= t.mask[t.maskPos%4]
			t.maskPos++
		}
		if isControl {
			if len(t.ctlBuf) < 125 {
				t.ctlBuf = append(t.ctlBuf, b)
			}
			continue
		}
		t.msgTotal++
		if len(t.msgBuf) < maxWSCapture {
			t.msgBuf = append(t.msgBuf, b)
		} else {
			t.msgTrunc = true
		}
	}
}

func (t *wsTap) endFrame() {
	t.state, t.hdrLen = 0, 0

	switch t.opcode {
	case 0x8, 0x9, 0xA:
		kind := map[byte]string{0x8: "close", 0x9: "ping", 0xA: "pong"}[t.opcode]
		t.emit(kind, t.ctlBuf, int64(len(t.ctlBuf)), false)
		t.ctlBuf = nil
		return
	case 0x1:
		t.msgKind = "text"
	case 0x2:
		t.msgKind = "binary"
	}
	if t.fin {
		t.emit(t.msgKind, t.msgBuf, t.msgTotal, t.msgTrunc)
		t.msgBuf, t.msgTotal, t.msgTrunc, t.msgKind = nil, 0, false, ""
	}
}

func (t *wsTap) emit(kind string, data []byte, size int64, truncated bool) {
	t.store.AddFrame(t.id, capture.Frame{
		Dir: t.dir, Kind: kind, Time: time.Now(),
		Size: int(size), Truncated: truncated, Data: append([]byte(nil), data...),
	})
}
