// Package frida — клиент протокола Frida на чистом Go (без cgo и без Node).
//
// Frida-server отдаёт свой D-Bus-протокол поверх WebSocket (путь /ws). Это
// peer-to-peer соединение без SASL-авторизации и без Hello, поэтому готовые
// клиенты вроде godbus.Conn не подходят: здесь только кадрирование потока и
// диспетчеризация вызовов, а сами значения кодирует godbus.
package frida

import (
	"bytes"
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"sync"
	"sync/atomic"

	"github.com/godbus/dbus/v5"
)

// RemoteError — D-Bus-ошибка, вернувшаяся от frida-server.
type RemoteError struct {
	Name    string
	Message string
}

func (e *RemoteError) Error() string {
	if e.Message == "" {
		return e.Name
	}
	return e.Name + ": " + e.Message
}

type callResult struct {
	body []any
	err  error
}

type handlerFn func(body []any) ([]any, error)

type wire struct {
	conn net.Conn

	wmu    sync.Mutex
	serial atomic.Uint32

	pmu     sync.Mutex
	pending map[uint32]chan callResult

	hmu      sync.RWMutex
	handlers map[string]handlerFn // ключ: "path|member"
	signalFn func(path, iface, member string, body []any)

	done    chan struct{}
	errOnce sync.Once
	err     error
}

func newWire(conn net.Conn) *wire {
	w := &wire{
		conn:     conn,
		pending:  map[uint32]chan callResult{},
		handlers: map[string]handlerFn{},
		done:     make(chan struct{}),
	}
	go w.readLoop()
	return w
}

func (w *wire) handle(path, member string, fn handlerFn) {
	w.hmu.Lock()
	w.handlers[path+"|"+member] = fn
	w.hmu.Unlock()
}

func (w *wire) setSignalHandler(fn func(path, iface, member string, body []any)) {
	w.hmu.Lock()
	w.signalFn = fn
	w.hmu.Unlock()
}

func (w *wire) unhandle(path, member string) {
	w.hmu.Lock()
	delete(w.handlers, path+"|"+member)
	w.hmu.Unlock()
}

func (w *wire) close(err error) {
	w.errOnce.Do(func() {
		if err == nil {
			err = io.ErrClosedPipe
		}
		w.err = err
		close(w.done)
		_ = w.conn.Close()

		w.pmu.Lock()
		for serial, ch := range w.pending {
			ch <- callResult{err: err}
			delete(w.pending, serial)
		}
		w.pmu.Unlock()
	})
}

// call вызывает метод и ждёт ответ.
func (w *wire) call(ctx context.Context, dest, path, iface, member string, args ...any) ([]any, error) {
	msg := &dbus.Message{
		Type: dbus.TypeMethodCall,
		Headers: map[dbus.HeaderField]dbus.Variant{
			dbus.FieldPath:        dbus.MakeVariant(dbus.ObjectPath(path)),
			dbus.FieldInterface:   dbus.MakeVariant(iface),
			dbus.FieldMember:      dbus.MakeVariant(member),
			dbus.FieldDestination: dbus.MakeVariant(dest),
		},
		Body: args,
	}
	if len(args) > 0 {
		msg.Headers[dbus.FieldSignature] = dbus.MakeVariant(dbus.SignatureOf(args...))
	}

	// serial нужен до отправки, чтобы зарегистрировать ожидание ответа.
	ch := make(chan callResult, 1)
	w.pmu.Lock()
	select {
	case <-w.done:
		w.pmu.Unlock()
		return nil, w.err
	default:
	}
	w.pmu.Unlock()

	w.wmu.Lock()
	serial := w.serial.Add(1)
	w.pmu.Lock()
	w.pending[serial] = ch
	w.pmu.Unlock()

	var buf bytes.Buffer
	err := msg.EncodeTo(&buf, binary.LittleEndian)
	if err == nil {
		b := buf.Bytes()
		binary.LittleEndian.PutUint32(b[8:12], serial)
		err = w.writeAll(b)
	}
	w.wmu.Unlock()
	if err != nil {
		w.pmu.Lock()
		delete(w.pending, serial)
		w.pmu.Unlock()
		return nil, err
	}

	select {
	case res := <-ch:
		return res.body, res.err
	case <-ctx.Done():
		w.pmu.Lock()
		delete(w.pending, serial)
		w.pmu.Unlock()
		return nil, ctx.Err()
	case <-w.done:
		return nil, w.err
	}
}

func readRaw(r io.Reader) ([]byte, error) {
	head := make([]byte, 16)
	if _, err := io.ReadFull(r, head); err != nil {
		return nil, err
	}
	var order binary.ByteOrder
	switch head[0] {
	case 'l':
		order = binary.LittleEndian
	case 'B':
		order = binary.BigEndian
	default:
		return nil, fmt.Errorf("frida: неверный порядок байт D-Bus: %#x", head[0])
	}
	bodyLen := order.Uint32(head[4:8])
	fieldsLen := order.Uint32(head[12:16])
	if bodyLen > 128<<20 || fieldsLen > 1<<20 {
		return nil, errors.New("frida: слишком большое D-Bus-сообщение")
	}
	headerLen := 16 + int(fieldsLen)
	pad := (8 - headerLen%8) % 8
	rest := make([]byte, headerLen-16+pad+int(bodyLen))
	if _, err := io.ReadFull(r, rest); err != nil {
		return nil, err
	}
	return append(head, rest...), nil
}

func (w *wire) readLoop() {
	for {
		raw, err := readRaw(w.conn)
		if err != nil {
			w.close(err)
			return
		}
		var order binary.ByteOrder = binary.LittleEndian
		if raw[0] == 'B' {
			order = binary.BigEndian
		}
		serial := order.Uint32(raw[8:12])

		msg, err := dbus.DecodeMessage(bytes.NewReader(raw))
		if err != nil {
			w.close(fmt.Errorf("frida: не удалось разобрать D-Bus-сообщение: %w", err))
			return
		}

		switch msg.Type {
		case dbus.TypeMethodReply:
			w.deliver(msg, callResult{body: msg.Body})
		case dbus.TypeError:
			name, _ := msg.Headers[dbus.FieldErrorName].Value().(string)
			text := ""
			if len(msg.Body) > 0 {
				text, _ = msg.Body[0].(string)
			}
			w.deliver(msg, callResult{err: &RemoteError{Name: name, Message: text}})
		case dbus.TypeMethodCall:
			go w.serveCall(msg, serial)
		case dbus.TypeSignal:
			w.hmu.RLock()
			fn := w.signalFn
			w.hmu.RUnlock()
			if fn != nil {
				path, _ := msg.Headers[dbus.FieldPath].Value().(dbus.ObjectPath)
				iface, _ := msg.Headers[dbus.FieldInterface].Value().(string)
				member, _ := msg.Headers[dbus.FieldMember].Value().(string)
				fn(string(path), iface, member, msg.Body)
			}
		}
	}
}

func (w *wire) deliver(msg *dbus.Message, res callResult) {
	rs, ok := msg.Headers[dbus.FieldReplySerial].Value().(uint32)
	if !ok {
		return
	}
	w.pmu.Lock()
	ch := w.pending[rs]
	delete(w.pending, rs)
	w.pmu.Unlock()
	if ch != nil {
		ch <- res
	}
}

// serveCall отвечает на вызовы, которые frida-server делает в нашу сторону
// (в первую очередь AgentMessageSink.PostMessages).
func (w *wire) serveCall(msg *dbus.Message, serial uint32) {
	path, _ := msg.Headers[dbus.FieldPath].Value().(dbus.ObjectPath)
	member, _ := msg.Headers[dbus.FieldMember].Value().(string)

	w.hmu.RLock()
	fn := w.handlers[string(path)+"|"+member]
	w.hmu.RUnlock()

	reply := &dbus.Message{
		Flags:   dbus.FlagNoReplyExpected,
		Headers: map[dbus.HeaderField]dbus.Variant{dbus.FieldReplySerial: dbus.MakeVariant(serial)},
	}
	switch {
	case fn != nil:
		out, err := fn(msg.Body)
		if err != nil {
			reply.Type = dbus.TypeError
			reply.Headers[dbus.FieldErrorName] = dbus.MakeVariant("org.freedesktop.DBus.Error.Failed")
			reply.Body = []any{err.Error()}
			reply.Headers[dbus.FieldSignature] = dbus.MakeVariant(dbus.SignatureOf("s"))
		} else {
			reply.Type = dbus.TypeMethodReply
			reply.Body = out
			if len(out) > 0 {
				reply.Headers[dbus.FieldSignature] = dbus.MakeVariant(dbus.SignatureOf(out...))
			}
		}
	default:
		// Peer.Ping и незнакомые вызовы подтверждаем пустым ответом: иначе
		// frida-server может зависнуть в ожидании.
		reply.Type = dbus.TypeMethodReply
	}

	var buf bytes.Buffer
	if err := reply.EncodeTo(&buf, binary.LittleEndian); err != nil {
		return
	}
	b := buf.Bytes()
	binary.LittleEndian.PutUint32(b[8:12], w.serial.Add(1))

	w.wmu.Lock()
	_ = w.writeAll(b)
	w.wmu.Unlock()
}

// Предел размера одного WebSocket-сообщения у frida-server ограничен (порядка 128 КБ),
// а собранный скрипт перехвата весит около 700 КБ. D-Bus идёт по WebSocket как
// поток байт, поэтому режем запись на части. Вызывать под wmu.
const maxWSChunk = 32 << 10

func (w *wire) writeAll(b []byte) error {
	for len(b) > 0 {
		n := min(len(b), maxWSChunk)
		if _, err := w.conn.Write(b[:n]); err != nil {
			return err
		}
		b = b[n:]
	}
	return nil
}
