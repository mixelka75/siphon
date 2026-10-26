// Package proxy — MITM-прокси: HTTP/1.1, HTTP/2, WebSocket, CONNECT, SOCKS5,
// расшифровка TLS «на лету» и сырой TCP для всего остального.
package proxy

import (
	"bufio"
	"bytes"
	"context"
	"crypto/tls"
	"errors"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"

	"siphon/internal/capture"
	"siphon/internal/certs"
	"siphon/internal/rules"
)

var errBadProxyURL = errors.New("ожидается адрес вида http://host:port или socks5://host:port")

const (
	sniffTimeout     = time.Second
	handshakeTimeout = 15 * time.Second
	dialTimeout      = 15 * time.Second
)

type Engine struct {
	CA       *certs.Authority
	Store    *capture.Store
	Settings *Settings
	Rules    *rules.Set
	Breaks   *rules.Breakpoints

	tmu        sync.Mutex
	transports map[string]*http.Transport
}

func NewEngine(ca *certs.Authority, store *capture.Store, settings *Settings) *Engine {
	return &Engine{
		CA: ca, Store: store, Settings: settings,
		Rules: rules.NewSet(), Breaks: rules.NewBreakpoints(),
		transports: map[string]*http.Transport{},
	}
}

// Listener — один порт прокси. У каждой Android-сессии свой Listener со своей
// меткой, поэтому записи можно привязать к приложению и устройству.
type Listener struct {
	e     *Engine
	ln    net.Listener
	label string

	mu     sync.Mutex
	conns  map[net.Conn]struct{}
	closed bool
}

func (e *Engine) Listen(addr, label string) (*Listener, error) {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, err
	}
	l := &Listener{e: e, ln: ln, label: label, conns: map[net.Conn]struct{}{}}
	go l.acceptLoop()
	return l, nil
}

func (l *Listener) Addr() net.Addr { return l.ln.Addr() }
func (l *Listener) Port() int      { return l.ln.Addr().(*net.TCPAddr).Port }
func (l *Listener) Label() string  { return l.label }

func (l *Listener) Close() error {
	l.mu.Lock()
	l.closed = true
	conns := make([]net.Conn, 0, len(l.conns))
	for c := range l.conns {
		conns = append(conns, c)
	}
	l.mu.Unlock()

	err := l.ln.Close()
	for _, c := range conns {
		_ = c.Close()
	}
	return err
}

func (l *Listener) track(c net.Conn) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return false
	}
	l.conns[c] = struct{}{}
	return true
}

func (l *Listener) untrack(c net.Conn) {
	l.mu.Lock()
	delete(l.conns, c)
	l.mu.Unlock()
}

func (l *Listener) acceptLoop() {
	for {
		c, err := l.ln.Accept()
		if err != nil {
			return
		}
		if !l.track(c) {
			_ = c.Close()
			return
		}
		go func() {
			defer l.untrack(c)
			l.serveConn(c)
		}()
	}
}

func (l *Listener) serveConn(raw net.Conn) {
	defer raw.Close()
	if tc, ok := raw.(*net.TCPConn); ok {
		_ = tc.SetNoDelay(true)
	}

	br := bufio.NewReaderSize(raw, 32<<10)
	_ = raw.SetReadDeadline(time.Now().Add(30 * time.Second))
	first, err := br.Peek(1)
	_ = raw.SetReadDeadline(time.Time{})
	if err != nil {
		return
	}
	conn := &bufConn{Conn: raw, r: br}

	if first[0] == 0x05 {
		l.handleSOCKS(conn)
		return
	}
	l.handleProxyHTTP(conn)
}

// handleProxyHTTP: клиент настроен на HTTP-прокси. Либо CONNECT-туннель,
// либо обычные запросы в absolute-form.
func (l *Listener) handleProxyHTTP(conn *bufConn) {
	_ = conn.SetReadDeadline(time.Now().Add(30 * time.Second))
	head, _ := conn.r.Peek(8)
	_ = conn.SetReadDeadline(time.Time{})

	if bytes.HasPrefix(head, []byte("CONNECT ")) {
		req, err := http.ReadRequest(conn.r)
		if err != nil {
			return
		}
		host, port := splitHostPort(req.Host, 443)
		if l.isSelf(host, port) {
			_, _ = io.WriteString(conn, "HTTP/1.1 508 Loop Detected\r\nContent-Length: 0\r\n\r\n")
			return
		}
		if _, err := io.WriteString(conn, "HTTP/1.1 200 Connection Established\r\n\r\n"); err != nil {
			return
		}
		l.handleTunnel(conn, host, port)
		return
	}
	l.serveHTTP(conn, &connInfo{l: l, clientAddr: conn.RemoteAddr().String()})
}

func (l *Listener) isSelf(host string, port int) bool {
	if port != l.Port() {
		return false
	}
	ip := net.ParseIP(host)
	return host == "localhost" || (ip != nil && (ip.IsLoopback() || ip.IsUnspecified()))
}

func splitHostPort(hostport string, defPort int) (string, int) {
	h, p, err := net.SplitHostPort(hostport)
	if err != nil {
		return trimBrackets(hostport), defPort
	}
	n, err := strconv.Atoi(p)
	if err != nil || n <= 0 {
		n = defPort
	}
	return h, n
}

func trimBrackets(h string) string {
	if len(h) > 1 && h[0] == '[' && h[len(h)-1] == ']' {
		return h[1 : len(h)-1]
	}
	return h
}

func (e *Engine) dial(ctx context.Context, host string, port int) (net.Conn, error) {
	d := net.Dialer{Timeout: dialTimeout, KeepAlive: 30 * time.Second}
	return d.DialContext(ctx, "tcp", net.JoinHostPort(host, strconv.Itoa(port)))
}

// transport возвращает общий http.Transport для upstream-запросов.
// Тела не распаковываем (DisableCompression): клиент получает байты как есть.
func (e *Engine) transport(insecure bool) *http.Transport {
	proxyStr := e.Settings.upstreamProxy()
	key := strconv.FormatBool(insecure) + "|" + proxyStr

	e.tmu.Lock()
	defer e.tmu.Unlock()
	if t, ok := e.transports[key]; ok {
		return t
	}

	var proxyFn func(*http.Request) (*url.URL, error)
	if proxyStr != "" {
		if u, err := url.Parse(proxyStr); err == nil {
			proxyFn = http.ProxyURL(u)
		}
	}
	t := &http.Transport{
		Proxy:                 proxyFn,
		DialContext:           (&net.Dialer{Timeout: dialTimeout, KeepAlive: 30 * time.Second}).DialContext,
		TLSClientConfig:       &tls.Config{InsecureSkipVerify: insecure},
		ForceAttemptHTTP2:     true,
		DisableCompression:    true,
		MaxIdleConns:          256,
		MaxIdleConnsPerHost:   16,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   handshakeTimeout,
		ExpectContinueTimeout: time.Second,
	}
	e.transports[key] = t
	return t
}

var quietLog = log.New(io.Discard, "", 0)
