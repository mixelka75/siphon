package frida

import (
	"net"
	"testing"
)

type recordingConn struct {
	net.Conn
	writes []int
}

func (r *recordingConn) Write(p []byte) (int, error) {
	r.writes = append(r.writes, len(p))
	return len(p), nil
}

// Регрессия: frida-server обрывает соединение на слишком большом WebSocket-сообщении,
// поэтому крупные D-Bus-сообщения (скрипт перехвата ~700 КБ) обязаны уходить частями.
func TestWriteAllSplitsLargeMessages(t *testing.T) {
	rc := &recordingConn{}
	w := &wire{conn: rc}
	const total = 700 << 10
	if err := w.writeAll(make([]byte, total)); err != nil {
		t.Fatal(err)
	}
	sum := 0
	for _, n := range rc.writes {
		if n > maxWSChunk {
			t.Fatalf("запись размером %d превышает предел %d", n, maxWSChunk)
		}
		sum += n
	}
	if sum != total {
		t.Fatalf("записано %d из %d байт", sum, total)
	}
	if len(rc.writes) < 2 {
		t.Fatal("большое сообщение должно уйти несколькими записями")
	}
}
