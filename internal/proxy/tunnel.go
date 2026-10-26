package proxy

import (
	"context"
	"crypto/tls"
	"errors"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"siphon/internal/capture"
)

const (
	maxRawCapture  = 4 << 20  // сколько байт сырого потока показываем
	maxRawFrameLen = 64 << 10 // и размер одного кадра
)

type connInfo struct {
	l          *Listener
	clientAddr string
	scheme     string // "http"/"https" внутри туннеля, "" при обычном proxy-запросе
	destHost   string
	destPort   int
	sni        string
	clientTLS  *capture.TLSInfo
	wg         sync.WaitGroup
}

// handleTunnel определяет, что идёт внутри туннеля (TLS, HTTP или что-то
// иное), и передаёт обработчику.
func (l *Listener) handleTunnel(conn *bufConn, host string, port int) {
	kind := "raw"
	sni := ""

	if !serverFirstPorts[port] {
		_ = conn.SetReadDeadline(time.Now().Add(sniffTimeout))
		first, err := conn.r.Peek(1)
		_ = conn.SetReadDeadline(time.Time{})
		switch {
		case err == nil && first[0] == 0x16:
			kind = "tls"
			sni = peekSNI(conn.r)
		case err == nil:
			_ = conn.SetReadDeadline(time.Now().Add(sniffTimeout))
			head, _ := conn.r.Peek(8)
			_ = conn.SetReadDeadline(time.Time{})
			if looksLikeHTTP(head) {
				kind = "http"
			}
		case isTimeout(err):
			// клиент молчит — вероятно, протокол, где первым говорит сервер
		default:
			return
		}
	}

	switch kind {
	case "http":
		l.serveHTTP(conn, &connInfo{
			l: l, clientAddr: conn.RemoteAddr().String(),
			scheme: "http", destHost: host, destPort: port,
		})
	case "tls":
		name := sni
		if name == "" {
			name = host
		}
		if l.e.Settings.IsPassthrough(name) || l.e.Settings.IsPassthrough(host) {
			l.passthroughTLS(conn, host, port, name)
			return
		}
		l.mitmTLS(conn, host, port, sni)
	default:
		l.pipeRaw(conn, host, port)
	}
}

func isTimeout(err error) bool {
	var ne net.Error
	return errors.As(err, &ne) && ne.Timeout()
}

func (l *Listener) mitmTLS(conn *bufConn, host string, port int, sni string) {
	cfg := &tls.Config{
		MinVersion: tls.VersionTLS10,
		NextProtos: []string{"h2", "http/1.1"},
		GetCertificate: func(hi *tls.ClientHelloInfo) (*tls.Certificate, error) {
			name := hi.ServerName
			if name == "" {
				name = host
			}
			return l.e.CA.Leaf(name)
		},
	}
	tc := tls.Server(conn, cfg)
	_ = tc.SetDeadline(time.Now().Add(handshakeTimeout))
	if err := tc.Handshake(); err != nil {
		l.recordTLSFailure(conn, host, port, sni, err)
		return
	}
	_ = tc.SetDeadline(time.Time{})

	st := tc.ConnectionState()
	l.serveHTTP(tc, &connInfo{
		l: l, clientAddr: conn.RemoteAddr().String(),
		scheme: "https", destHost: host, destPort: port, sni: st.ServerName,
		clientTLS: &capture.TLSInfo{
			Version:    tlsVersionName(st.Version),
			Cipher:     tls.CipherSuiteName(st.CipherSuite),
			ALPN:       st.NegotiatedProtocol,
			ServerName: st.ServerName,
		},
	})
}

// recordTLSFailure показывает в списке, что клиент не принял наш сертификат,
// и (если включено) добавляет хост в passthrough, чтобы приложение хотя бы
// продолжило работать при следующей попытке.
func (l *Listener) recordTLSFailure(conn *bufConn, host string, port int, sni string, err error) {
	name := sni
	if name == "" {
		name = host
	}
	msg := err.Error()
	rejected := strings.Contains(msg, "remote error: tls:") ||
		errors.Is(err, io.EOF) || strings.Contains(msg, "connection reset")

	reason := "TLS-рукопожатие не удалось: " + msg
	if rejected {
		reason = "Клиент отверг сертификат Siphon (" + msg + "). Похоже на certificate pinning " +
			"или на то, что CA не установлен в доверенные."
		if l.e.Settings.AutoPassthroughEnabled() && l.e.Settings.AddPassthrough(name) {
			reason += " Хост добавлен в passthrough — повторное подключение пройдёт без расшифровки."
		}
	}

	now := time.Now()
	l.e.Store.Add(&capture.Exchange{
		Kind: capture.KindTLSError, Source: l.label, ClientAddr: conn.RemoteAddr().String(),
		State: capture.StateError, Error: reason, Started: now,
		Scheme: "https", Host: name, Port: port, URL: "https://" + name,
	})
}

func (l *Listener) passthroughTLS(conn *bufConn, host string, port int, name string) {
	up, err := l.e.dial(context.Background(), host, port)
	if err != nil {
		l.e.Store.Add(&capture.Exchange{
			Kind: capture.KindTLSPassthrough, Source: l.label, ClientAddr: conn.RemoteAddr().String(),
			State: capture.StateError, Error: err.Error(), Started: time.Now(),
			Scheme: "https", Host: name, Port: port, URL: "https://" + name,
		})
		return
	}
	defer up.Close()

	ex := l.e.Store.Add(&capture.Exchange{
		Kind: capture.KindTLSPassthrough, Source: l.label, ClientAddr: conn.RemoteAddr().String(),
		State: capture.StatePending, Started: time.Now(),
		Scheme: "https", Host: name, Port: port, URL: "https://" + name,
		ServerAddr: up.RemoteAddr().String(),
	})
	out, in := relay(conn, up, nil, nil)
	l.finishStream(ex.ID, ex.Started, out, in, nil)
}

func (l *Listener) pipeRaw(conn *bufConn, host string, port int) {
	up, err := l.e.dial(context.Background(), host, port)
	if err != nil {
		l.e.Store.Add(&capture.Exchange{
			Kind: capture.KindRaw, Source: l.label, ClientAddr: conn.RemoteAddr().String(),
			State: capture.StateError, Error: err.Error(), Started: time.Now(),
			Scheme: "tcp", Host: host, Port: port, URL: "tcp://" + net.JoinHostPort(host, strconv.Itoa(port)),
		})
		return
	}
	defer up.Close()

	ex := l.e.Store.Add(&capture.Exchange{
		Kind: capture.KindRaw, Source: l.label, ClientAddr: conn.RemoteAddr().String(),
		State: capture.StatePending, Started: time.Now(),
		Scheme: "tcp", Host: host, Port: port, URL: "tcp://" + net.JoinHostPort(host, strconv.Itoa(port)),
		ServerAddr: up.RemoteAddr().String(),
	})
	tapOut := &rawTap{store: l.e.Store, id: ex.ID, dir: "out"}
	tapIn := &rawTap{store: l.e.Store, id: ex.ID, dir: "in"}
	out, in := relay(conn, up, tapOut, tapIn)
	l.finishStream(ex.ID, ex.Started, out, in, nil)
}

func (l *Listener) finishStream(id string, started time.Time, out, in int64, err error) {
	l.e.Store.Update(id, func(e *capture.Exchange) {
		e.BytesOut, e.BytesIn = out, in
		e.Timing.End = msSince(started)
		if err != nil {
			e.State, e.Error = capture.StateError, err.Error()
		} else {
			e.State = capture.StateDone
		}
	})
}

// relay гоняет байты в обе стороны, пока одна из сторон не закроется.
func relay(client, up net.Conn, tapOut, tapIn io.Writer) (out, in int64) {
	var wg sync.WaitGroup
	var nOut, nIn atomic.Int64
	wg.Add(2)

	pipe := func(dst, src net.Conn, tap io.Writer, n *atomic.Int64) {
		defer wg.Done()
		var r io.Reader = src
		if tap != nil {
			r = io.TeeReader(src, tap)
		}
		cnt, err := io.Copy(dst, r)
		n.Add(cnt)
		if err != nil {
			_ = dst.Close()
			_ = src.Close()
			return
		}
		closeWrite(dst)
	}
	go pipe(up, client, tapOut, &nOut)
	go pipe(client, up, tapIn, &nIn)
	wg.Wait()
	return nOut.Load(), nIn.Load()
}

// rawTap складывает куски сырого потока в Store (с ограничением по объёму).
type rawTap struct {
	store *capture.Store
	id    string
	dir   string
	taken int
}

func (t *rawTap) Write(p []byte) (int, error) {
	if t.taken >= maxRawCapture {
		return len(p), nil
	}
	chunk := p
	truncated := false
	if len(chunk) > maxRawFrameLen {
		chunk, truncated = chunk[:maxRawFrameLen], true
	}
	if room := maxRawCapture - t.taken; len(chunk) > room {
		chunk, truncated = chunk[:room], true
	}
	t.taken += len(chunk)
	t.store.AddFrame(t.id, capture.Frame{
		Dir: t.dir, Kind: "data", Time: time.Now(),
		Size: len(p), Truncated: truncated, Data: append([]byte(nil), chunk...),
	})
	return len(p), nil
}

// serveHTTP обслуживает одно соединение стандартным http.Server — он сам
// понимает HTTP/1.1 и HTTP/2 (по ALPN для *tls.Conn).
func (l *Listener) serveHTTP(conn net.Conn, info *connInfo) {
	ln := newSingleListener(conn)
	srv := &http.Server{
		Handler:  &connHandler{info: info},
		ErrorLog: quietLog,
		ConnState: func(_ net.Conn, s http.ConnState) {
			if s == http.StateClosed || s == http.StateHijacked {
				ln.finish()
			}
		},
	}
	_ = srv.Serve(ln)
	// Hijack (WebSocket) продолжает работать в обработчике после Serve.
	info.wg.Wait()
}

func tlsVersionName(v uint16) string {
	switch v {
	case tls.VersionTLS13:
		return "TLS 1.3"
	case tls.VersionTLS12:
		return "TLS 1.2"
	case tls.VersionTLS11:
		return "TLS 1.1"
	case tls.VersionTLS10:
		return "TLS 1.0"
	}
	return ""
}
