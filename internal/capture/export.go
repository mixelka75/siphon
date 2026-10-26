package capture

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"
)

// BodyFunc возвращает сохранённое тело записи (req=true — запроса).
type BodyFunc func(id string, req bool) []byte

func quote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'"
}

// Заголовки, которые curl выставляет сам.
var curlSkip = map[string]bool{"host": true, "content-length": true, "connection": true}

// CurlCommand собирает команду curl, повторяющую запрос.
func CurlCommand(e Exchange, body []byte) string {
	if e.Request == nil {
		return ""
	}
	var parts []string
	pipe := ""
	parts = append(parts, "curl", quote(e.URL))
	if e.Method != "" && e.Method != "GET" {
		parts = append(parts, "-X", e.Method)
	}

	headers := append([]Header(nil), e.Request.Headers...)
	compressed := false
	for _, h := range headers {
		name := strings.ToLower(h.Name)
		if curlSkip[name] {
			continue
		}
		if name == "accept-encoding" {
			compressed = true
			continue
		}
		parts = append(parts, "-H", quote(h.Name+": "+h.Value))
	}
	if compressed {
		parts = append(parts, "--compressed")
	}

	if len(body) > 0 {
		if decoded, err := Decode(e.Request.Encoding, body); err == nil {
			body = decoded
		}
		if utf8.Valid(body) {
			parts = append(parts, "--data-raw", quote(string(body)))
		} else {
			pipe = "echo " + quote(base64.StdEncoding.EncodeToString(body)) + " | base64 -d | "
			parts = append(parts, "--data-binary", "@-")
		}
	}
	return pipe + strings.Join(parts, " ")
}

func isTextual(contentType string, data []byte) bool {
	if bytes.IndexByte(data, 0) >= 0 || !utf8.Valid(data) {
		return false
	}
	ct := strings.ToLower(contentType)
	if ct == "" {
		return true
	}
	for _, p := range []string{"text/", "json", "xml", "javascript", "x-www-form-urlencoded", "html", "yaml", "graphql"} {
		if strings.Contains(ct, p) {
			return true
		}
	}
	return false
}

type harNV struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

func harHeaders(hs []Header) []harNV {
	out := make([]harNV, 0, len(hs))
	for _, h := range hs {
		out = append(out, harNV{h.Name, h.Value})
	}
	return out
}

// HAR формирует архив HAR 1.2 из HTTP-записей.
func HAR(list []Exchange, body BodyFunc, version string) ([]byte, error) {
	entries := make([]map[string]any, 0, len(list))
	for _, e := range list {
		if (e.Kind != KindHTTP && e.Kind != KindWebSocket) || e.Request == nil {
			continue
		}

		qs := []harNV{}
		if u, err := url.Parse(e.URL); err == nil {
			for k, vs := range u.Query() {
				for _, v := range vs {
					qs = append(qs, harNV{k, v})
				}
			}
		}
		reqBody := body(e.ID, true)
		req := map[string]any{
			"method": e.Method, "url": e.URL, "httpVersion": e.Proto,
			"cookies": []any{}, "headers": harHeaders(e.Request.Headers), "queryString": qs,
			"headersSize": -1, "bodySize": e.Request.Size,
		}
		if len(reqBody) > 0 {
			dec, err := Decode(e.Request.Encoding, reqBody)
			if err != nil {
				dec = reqBody
			}
			req["postData"] = map[string]any{"mimeType": e.Request.ContentType, "text": string(dec)}
		}

		resp := map[string]any{
			"status": 0, "statusText": "", "httpVersion": e.Proto, "cookies": []any{}, "headers": []harNV{},
			"content": map[string]any{"size": 0, "mimeType": ""}, "redirectURL": "", "headersSize": -1, "bodySize": -1,
		}
		if r := e.Response; r != nil {
			content := map[string]any{"size": r.Size, "mimeType": r.ContentType}
			if raw := body(e.ID, false); len(raw) > 0 {
				dec, err := Decode(r.Encoding, raw)
				if err != nil {
					dec = raw
				}
				content["size"] = len(dec)
				if isTextual(r.ContentType, dec) {
					content["text"] = string(dec)
				} else {
					content["text"] = base64.StdEncoding.EncodeToString(dec)
					content["encoding"] = "base64"
				}
			}
			redirect := ""
			for _, h := range r.Headers {
				if strings.EqualFold(h.Name, "location") {
					redirect = h.Value
				}
			}
			resp = map[string]any{
				"status": r.Status, "statusText": r.StatusText, "httpVersion": e.Proto, "cookies": []any{},
				"headers": harHeaders(r.Headers), "content": content, "redirectURL": redirect,
				"headersSize": -1, "bodySize": r.Size,
			}
		}

		total := e.Timing.End
		wait := e.Timing.ResponseStart - e.Timing.RequestDone
		if wait < 0 {
			wait = 0
		}
		entry := map[string]any{
			"startedDateTime": e.Started.UTC().Format(time.RFC3339Nano),
			"time":            total,
			"request":         req,
			"response":        resp,
			"cache":           map[string]any{},
			"timings": map[string]any{
				"send": e.Timing.RequestDone, "wait": wait, "receive": max(total-e.Timing.ResponseStart, 0),
			},
			"_source": e.Source,
		}
		if e.ServerAddr != "" {
			if host, _, ok := strings.Cut(e.ServerAddr, ":"); ok && !strings.Contains(e.ServerAddr, "[") {
				entry["serverIPAddress"] = host
			}
		}
		entries = append(entries, entry)
	}

	doc := map[string]any{"log": map[string]any{
		"version": "1.2",
		"creator": map[string]string{"name": "Siphon", "version": version},
		"entries": entries,
	}}
	return json.MarshalIndent(doc, "", "  ")
}
