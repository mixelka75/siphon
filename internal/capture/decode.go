package capture

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"compress/zlib"
	"fmt"
	"io"
	"strings"

	"github.com/andybalholm/brotli"
	"github.com/klauspost/compress/zstd"
)

// Защита от «бомб» при распаковке.
const maxDecoded = 256 << 20

// Decode снимает Content-Encoding (в том числе составной, например "gzip, br").
// Для неизвестной кодировки возвращает исходные данные и ошибку.
func Decode(contentEncoding string, data []byte) ([]byte, error) {
	if strings.TrimSpace(contentEncoding) == "" {
		return data, nil
	}
	parts := strings.Split(contentEncoding, ",")
	out := data
	for i := len(parts) - 1; i >= 0; i-- {
		enc := strings.ToLower(strings.TrimSpace(parts[i]))
		var r io.Reader
		switch enc {
		case "", "identity":
			continue
		case "gzip", "x-gzip":
			zr, err := gzip.NewReader(bytes.NewReader(out))
			if err != nil {
				return data, err
			}
			r = zr
		case "deflate":
			if zr, err := zlib.NewReader(bytes.NewReader(out)); err == nil {
				r = zr
			} else {
				r = flate.NewReader(bytes.NewReader(out)) // «сырой» deflate без zlib-обёртки
			}
		case "br":
			r = brotli.NewReader(bytes.NewReader(out))
		case "zstd":
			zr, err := zstd.NewReader(bytes.NewReader(out))
			if err != nil {
				return data, err
			}
			defer zr.Close()
			r = zr
		default:
			return data, fmt.Errorf("неизвестная кодировка %q", enc)
		}
		decoded, err := io.ReadAll(io.LimitReader(r, maxDecoded))
		if err != nil && len(decoded) == 0 {
			return data, err
		}
		out = decoded
	}
	return out, nil
}
