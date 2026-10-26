package proxy

import (
	"bufio"
	"net"
	"sync"
)

// bufConn читает через bufio.Reader, чтобы байты, которые мы «подглядели»
// для определения протокола, не терялись.
type bufConn struct {
	net.Conn
	r *bufio.Reader
}

func (c *bufConn) Read(p []byte) (int, error) { return c.r.Read(p) }

func (c *bufConn) CloseWrite() error {
	if cw, ok := c.Conn.(interface{ CloseWrite() error }); ok {
		return cw.CloseWrite()
	}
	return c.Conn.Close()
}

func closeWrite(c net.Conn) {
	if cw, ok := c.(interface{ CloseWrite() error }); ok {
		_ = cw.CloseWrite()
		return
	}
	_ = c.Close()
}

// singleListener отдаёт http.Server ровно одно соединение, а потом блокирует
// Accept до сигнала done — так Serve не завершится раньше, чем соединение.
type singleListener struct {
	conn net.Conn
	addr net.Addr
	once sync.Once
	done chan struct{}
}

func newSingleListener(c net.Conn) *singleListener {
	return &singleListener{conn: c, addr: c.LocalAddr(), done: make(chan struct{})}
}

func (l *singleListener) Accept() (net.Conn, error) {
	var c net.Conn
	l.once.Do(func() { c = l.conn })
	if c != nil {
		return c, nil
	}
	<-l.done
	return nil, net.ErrClosed
}

func (l *singleListener) Close() error   { return nil }
func (l *singleListener) Addr() net.Addr { return l.addr }

func (l *singleListener) finish() {
	select {
	case <-l.done:
	default:
		close(l.done)
	}
}
