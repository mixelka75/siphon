package proxy

import (
	"bufio"
	"bytes"
)

var httpMethods = [][]byte{
	[]byte("GET "), []byte("POST "), []byte("PUT "), []byte("HEAD "), []byte("DELETE "),
	[]byte("OPTIONS "), []byte("PATCH "), []byte("TRACE "), []byte("CONNECT "),
}

func looksLikeHTTP(b []byte) bool {
	for _, m := range httpMethods {
		if bytes.HasPrefix(b, m) {
			return true
		}
	}
	return false
}

// Порты протоколов, где первым говорит сервер: ждать клиента бессмысленно.
var serverFirstPorts = map[int]bool{21: true, 22: true, 25: true, 110: true, 143: true, 587: true, 3306: true}

// peekSNI заглядывает в буфер и достаёт server_name из TLS ClientHello,
// не потребляя байты.
func peekSNI(br *bufio.Reader) string {
	hdr, err := br.Peek(5)
	if err != nil || hdr[0] != 0x16 || hdr[1] != 0x03 {
		return ""
	}
	recLen := int(hdr[3])<<8 | int(hdr[4])
	want := 5 + recLen
	if want > br.Size() {
		want = br.Size()
	}
	rec, _ := br.Peek(want)
	return parseSNI(rec)
}

type reader struct {
	b   []byte
	bad bool
}

func (r *reader) take(n int) []byte {
	if r.bad || n < 0 || n > len(r.b) {
		r.bad = true
		return nil
	}
	out := r.b[:n]
	r.b = r.b[n:]
	return out
}

func (r *reader) u8() int {
	b := r.take(1)
	if b == nil {
		return 0
	}
	return int(b[0])
}

func (r *reader) u16() int {
	b := r.take(2)
	if b == nil {
		return 0
	}
	return int(b[0])<<8 | int(b[1])
}

func parseSNI(rec []byte) string {
	if len(rec) < 6 || rec[0] != 0x16 || rec[5] != 0x01 {
		return ""
	}
	r := &reader{b: rec[5:]}
	r.take(4)  // тип + длина handshake
	r.take(2)  // версия клиента
	r.take(32) // random
	r.take(r.u8())
	r.take(r.u16()) // cipher suites
	r.take(r.u8())  // compression
	extLen := r.u16()
	if r.bad {
		return ""
	}
	if extLen > len(r.b) {
		extLen = len(r.b)
	}
	exts := &reader{b: r.b[:extLen]}
	for !exts.bad && len(exts.b) >= 4 {
		typ := exts.u16()
		data := exts.take(exts.u16())
		if exts.bad {
			return ""
		}
		if typ != 0 { // server_name
			continue
		}
		list := &reader{b: data}
		list.take(2) // длина списка
		for !list.bad && len(list.b) >= 3 {
			nameType := list.u8()
			name := list.take(list.u16())
			if list.bad {
				return ""
			}
			if nameType == 0 {
				return string(name)
			}
		}
	}
	return ""
}
