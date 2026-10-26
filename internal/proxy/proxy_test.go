package proxy

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	xproxy "golang.org/x/net/proxy"

	"siphon/internal/capture"
	"siphon/internal/certs"
)

type rig struct {
	e *Engine
	l *Listener
}

func newRig(t *testing.T) *rig {
	t.Helper()
	ca, err := certs.LoadOrCreate(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	settings := NewSettings()
	if err := settings.Set(SettingsData{InsecureUpstream: true, AutoPassthrough: true}); err != nil {
		t.Fatal(err)
	}
	e := NewEngine(ca, capture.NewStore(), settings)
	l, err := e.Listen("127.0.0.1:0", "test")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { l.Close() })
	return &rig{e: e, l: l}
}

func (r *rig) proxyURL() *url.URL {
	return &url.URL{Scheme: "http", Host: r.l.Addr().String()}
}

func (r *rig) client(h2 bool) *http.Client {
	tr := &http.Transport{
		Proxy:             http.ProxyURL(r.proxyURL()),
		TLSClientConfig:   &tls.Config{RootCAs: r.e.CA.Pool()},
		ForceAttemptHTTP2: h2,
	}
	return &http.Client{Transport: tr, Timeout: 10 * time.Second}
}

func (r *rig) wait(t *testing.T, what string, pred func(capture.Exchange) bool) capture.Exchange {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		for _, ex := range r.e.Store.List() {
			if pred(ex) {
				return ex
			}
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("не дождались записи: %s; есть: %+v", what, r.e.Store.List())
	return capture.Exchange{}
}

func done(kind string) func(capture.Exchange) bool {
	return func(e capture.Exchange) bool { return e.Kind == kind && e.State == capture.StateDone }
}

func TestHTTPSOverHTTP1(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		b, _ := io.ReadAll(q.Body)
		w.Header().Set("X-Test", "yes")
		_, _ = w.Write([]byte("echo:" + string(b)))
	}))
	defer srv.Close()

	resp, err := r.client(false).Post(srv.URL+"/a/b?x=1", "text/plain", strings.NewReader("hello"))
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if string(body) != "echo:hello" || resp.Header.Get("X-Test") != "yes" {
		t.Fatalf("неверный ответ: %q %v", body, resp.Header)
	}

	ex := r.wait(t, "http done", done(capture.KindHTTP))
	if ex.Method != "POST" || ex.Scheme != "https" || ex.Path != "/a/b?x=1" || ex.Response.Status != 200 {
		t.Fatalf("неверная запись: %+v", ex)
	}
	if got := string(r.e.Store.Body(ex.ID, true)); got != "hello" {
		t.Fatalf("тело запроса: %q", got)
	}
	if got := string(r.e.Store.Body(ex.ID, false)); got != "echo:hello" {
		t.Fatalf("тело ответа: %q", got)
	}
	if ex.ServerTLS == nil || ex.ClientTLS == nil {
		t.Fatalf("нет информации о TLS: %+v", ex)
	}
}

func TestHTTPSOverHTTP2(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		_, _ = io.WriteString(w, "proto="+q.Proto)
	}))
	srv.EnableHTTP2 = true
	srv.StartTLS()
	defer srv.Close()

	resp, err := r.client(true).Get(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.ProtoMajor != 2 {
		t.Fatalf("клиент получил %s, ожидался HTTP/2", resp.Proto)
	}
	if string(body) != "proto=HTTP/2.0" {
		t.Fatalf("upstream не по HTTP/2: %q", body)
	}
	ex := r.wait(t, "h2 done", done(capture.KindHTTP))
	if ex.Proto != "HTTP/2.0" || ex.ServerTLS.ALPN != "h2" {
		t.Fatalf("proto=%s alpn=%s", ex.Proto, ex.ServerTLS.ALPN)
	}
}

func TestPlainHTTPViaProxy(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		_, _ = io.WriteString(w, "plain")
	}))
	defer srv.Close()

	resp, err := r.client(false).Get(srv.URL + "/p")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if string(body) != "plain" {
		t.Fatalf("тело: %q", body)
	}
	ex := r.wait(t, "plain", done(capture.KindHTTP))
	if ex.Scheme != "http" || ex.Path != "/p" {
		t.Fatalf("%+v", ex)
	}
}

func TestGzipBodyKeptEncodedAndDecodable(t *testing.T) {
	r := newRig(t)
	var gz bytes.Buffer
	zw := gzip.NewWriter(&gz)
	_, _ = zw.Write([]byte(`{"ok":true}`))
	zw.Close()
	raw := gz.Bytes()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(raw)
	}))
	defer srv.Close()

	resp, err := r.client(false).Get(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body) // Go сам распакует gzip для клиента
	resp.Body.Close()
	if string(body) != `{"ok":true}` {
		t.Fatalf("клиент получил %q", body)
	}
	ex := r.wait(t, "gzip", done(capture.KindHTTP))
	stored := r.e.Store.Body(ex.ID, false)
	if !bytes.Equal(stored, raw) {
		t.Fatal("в Store должен лежать исходный gzip")
	}
	dec, err := capture.Decode(ex.Response.Encoding, stored)
	if err != nil || string(dec) != `{"ok":true}` {
		t.Fatalf("decode: %q %v", dec, err)
	}
}

func (r *rig) socksClient() *http.Client {
	d, err := xproxy.SOCKS5("tcp", r.l.Addr().String(), nil, xproxy.Direct)
	if err != nil {
		panic(err)
	}
	return &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				return d.(xproxy.ContextDialer).DialContext(ctx, network, addr)
			},
			TLSClientConfig: &tls.Config{RootCAs: r.e.CA.Pool()},
		},
	}
}

func TestHTTPSOverSOCKS5(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		_, _ = io.WriteString(w, "via-socks")
	}))
	defer srv.Close()

	resp, err := r.socksClient().Get(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if string(body) != "via-socks" {
		t.Fatalf("тело: %q", body)
	}
	ex := r.wait(t, "socks https", done(capture.KindHTTP))
	if ex.Scheme != "https" {
		t.Fatalf("%+v", ex)
	}
}

func TestRawTCPOverSOCKS5(t *testing.T) {
	r := newRig(t)
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	go func() {
		c, err := ln.Accept()
		if err != nil {
			return
		}
		defer c.Close()
		line, _ := bufio.NewReader(c).ReadString('\n')
		_, _ = c.Write([]byte("re:" + line))
	}()

	d, _ := xproxy.SOCKS5("tcp", r.l.Addr().String(), nil, xproxy.Direct)
	conn, err := d.Dial("tcp", ln.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	_, _ = conn.Write([]byte("ping\n"))
	reply, _ := bufio.NewReader(conn).ReadString('\n')
	conn.Close()
	if reply != "re:ping\n" {
		t.Fatalf("ответ: %q", reply)
	}

	ex := r.wait(t, "raw done", done(capture.KindRaw))
	if ex.BytesOut != 5 || ex.BytesIn != 8 {
		t.Fatalf("out=%d in=%d", ex.BytesOut, ex.BytesIn)
	}
	frames := r.e.Store.Frames(ex.ID)
	if len(frames) < 2 || string(frames[0].Data) != "ping\n" || frames[0].Dir != "out" {
		t.Fatalf("кадры: %+v", frames)
	}
}

func TestWebSocketFramesCaptured(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		c, err := websocket.Accept(w, q, nil)
		if err != nil {
			return
		}
		defer c.CloseNow()
		typ, data, err := c.Read(q.Context())
		if err != nil {
			return
		}
		_ = c.Write(q.Context(), typ, append([]byte("echo:"), data...))
		_ = c.Close(websocket.StatusNormalClosure, "bye")
	}))
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, "wss"+strings.TrimPrefix(srv.URL, "https")+"/ws", &websocket.DialOptions{
		HTTPClient: r.client(false),
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := c.Write(ctx, websocket.MessageText, []byte("hello")); err != nil {
		t.Fatal(err)
	}
	_, reply, err := c.Read(ctx)
	if err != nil || string(reply) != "echo:hello" {
		t.Fatalf("ответ: %q %v", reply, err)
	}
	_ = c.Close(websocket.StatusNormalClosure, "")

	ex := r.wait(t, "ws done", done(capture.KindWebSocket))
	var out, in string
	for _, f := range r.e.Store.Frames(ex.ID) {
		if f.Kind != "text" {
			continue
		}
		if f.Dir == "out" {
			out = string(f.Data)
		} else {
			in = string(f.Data)
		}
	}
	if out != "hello" || in != "echo:hello" {
		t.Fatalf("кадры: out=%q in=%q (%+v)", out, in, r.e.Store.Frames(ex.ID))
	}
}

func TestPinnedClientRecordedAndAutoPassthrough(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		_, _ = io.WriteString(w, "real-server")
	}))
	defer srv.Close()

	// Клиент «запинен»: доверяет только настоящему сертификату сервера.
	pool := x509.NewCertPool()
	pool.AddCert(srv.Certificate())
	pinned := &http.Client{Timeout: 5 * time.Second, Transport: &http.Transport{
		Proxy:           http.ProxyURL(r.proxyURL()),
		TLSClientConfig: &tls.Config{RootCAs: pool},
	}}

	if _, err := pinned.Get(srv.URL); err == nil {
		t.Fatal("ожидалась ошибка проверки сертификата")
	}
	ex := r.wait(t, "tls error", func(e capture.Exchange) bool { return e.Kind == capture.KindTLSError })
	if !strings.Contains(ex.Error, "pinning") {
		t.Fatalf("сообщение: %s", ex.Error)
	}
	host := srv.Listener.Addr().(*net.TCPAddr).IP.String()
	if !r.e.Settings.IsPassthrough(host) {
		t.Fatal("хост должен попасть в passthrough")
	}

	// Повтор проходит напрямую — клиент видит настоящий сертификат.
	resp, err := pinned.Get(srv.URL)
	if err != nil {
		t.Fatalf("повторный запрос: %v", err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if string(body) != "real-server" {
		t.Fatalf("тело: %q", body)
	}
	r.wait(t, "passthrough", func(e capture.Exchange) bool { return e.Kind == capture.KindTLSPassthrough })
}

func TestLandingPageServesCA(t *testing.T) {
	r := newRig(t)
	resp, err := http.Get("http://" + r.l.Addr().String() + "/ca.pem")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if !bytes.Equal(body, r.e.CA.CertPEM()) {
		t.Fatal("отдан не тот сертификат")
	}
}

func TestParseSNI(t *testing.T) {
	c, s := net.Pipe()
	go func() {
		_ = tls.Client(c, &tls.Config{ServerName: "api.example.com", InsecureSkipVerify: true}).Handshake()
	}()
	_ = s.SetReadDeadline(time.Now().Add(2 * time.Second))
	br := bufio.NewReaderSize(s, 32<<10)
	if _, err := br.Peek(5); err != nil {
		t.Fatal(err)
	}
	if got := peekSNI(br); got != "api.example.com" {
		t.Fatalf("SNI = %q", got)
	}
	s.Close()
	c.Close()
}

func TestHostPortHelper(t *testing.T) {
	cases := map[string]struct {
		h string
		p int
	}{
		"example.com:8443": {"example.com", 8443},
		"example.com":      {"example.com", 443},
		"[::1]:80":         {"::1", 80},
	}
	for in, want := range cases {
		h, p := splitHostPort(in, 443)
		if h != want.h || p != want.p {
			t.Errorf("%s → %s:%d, ожидалось %s:%d", in, h, p, want.h, want.p)
		}
	}
	_ = strconv.Itoa
}

// Регрессия: пустые списки должны сериализоваться как [], а не null,
// иначе интерфейс падает при отрисовке настроек.
func TestSettingsListsNeverNilInJSON(t *testing.T) {
	d := NewSettings().Get()
	raw, err := json.Marshal(d)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), "null") {
		t.Fatalf("в JSON настроек есть null: %s", raw)
	}
}
