package proxy

import (
	"encoding/binary"
	"io"
	"net"
	"time"
)

// handleSOCKS — минимальный SOCKS5-сервер (только CONNECT, без авторизации).
// Через него Frida-скрипт отправляет весь TCP-трафик приложения, в том числе
// не-HTTP, который мы показываем как сырые потоки.
func (l *Listener) handleSOCKS(conn *bufConn) {
	_ = conn.SetDeadline(time.Now().Add(15 * time.Second))
	defer conn.SetDeadline(time.Time{})

	head := make([]byte, 2)
	if _, err := io.ReadFull(conn, head); err != nil || head[0] != 0x05 {
		return
	}
	methods := make([]byte, head[1])
	if _, err := io.ReadFull(conn, methods); err != nil {
		return
	}
	noAuth := false
	for _, m := range methods {
		if m == 0x00 {
			noAuth = true
		}
	}
	if !noAuth {
		_, _ = conn.Write([]byte{0x05, 0xFF})
		return
	}
	if _, err := conn.Write([]byte{0x05, 0x00}); err != nil {
		return
	}

	req := make([]byte, 4)
	if _, err := io.ReadFull(conn, req); err != nil || req[0] != 0x05 {
		return
	}
	var host string
	switch req[3] {
	case 0x01:
		b := make([]byte, 4)
		if _, err := io.ReadFull(conn, b); err != nil {
			return
		}
		host = net.IP(b).String()
	case 0x03:
		n := make([]byte, 1)
		if _, err := io.ReadFull(conn, n); err != nil {
			return
		}
		b := make([]byte, n[0])
		if _, err := io.ReadFull(conn, b); err != nil {
			return
		}
		host = string(b)
	case 0x04:
		b := make([]byte, 16)
		if _, err := io.ReadFull(conn, b); err != nil {
			return
		}
		host = net.IP(b).String()
	default:
		socksReply(conn, 0x08)
		return
	}
	pb := make([]byte, 2)
	if _, err := io.ReadFull(conn, pb); err != nil {
		return
	}
	port := int(binary.BigEndian.Uint16(pb))

	if req[1] != 0x01 { // поддерживаем только CONNECT
		socksReply(conn, 0x07)
		return
	}
	if l.isSelf(host, port) {
		socksReply(conn, 0x02)
		return
	}
	if err := socksReply(conn, 0x00); err != nil {
		return
	}
	_ = conn.SetDeadline(time.Time{})
	l.handleTunnel(conn, host, port)
}

func socksReply(w io.Writer, code byte) error {
	_, err := w.Write([]byte{0x05, code, 0x00, 0x01, 0, 0, 0, 0, 0, 0})
	return err
}
