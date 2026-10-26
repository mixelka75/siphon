package capture

import (
	"strconv"
	"strings"
)

// Query отбирает записи для списка и экспорта. Пустые поля не ограничивают.
type Query struct {
	IDs   []string
	Since uint64 // только записи с Seq > Since
	// Filter — тот же синтаксис, что в строке фильтра интерфейса:
	// host:api status:4xx method:post type:json src:com.app is:error -слово
	Filter string
}

// Select возвращает подходящие записи в исходном порядке.
func (q Query) Select(list []Exchange) []Exchange {
	var want map[string]bool
	if len(q.IDs) > 0 {
		want = make(map[string]bool, len(q.IDs))
		for _, id := range q.IDs {
			want[id] = true
		}
	}
	match := ParseFilter(q.Filter)
	out := make([]Exchange, 0, len(list))
	for _, e := range list {
		if e.Seq <= q.Since || (want != nil && !want[e.ID]) || !match(e) {
			continue
		}
		out = append(out, e)
	}
	return out
}

// ParseFilter повторяет parseFilter из ui/src/format.ts, чтобы агенты и
// интерфейс понимали фильтр одинаково.
func ParseFilter(q string) func(Exchange) bool {
	var preds []func(Exchange) bool
	for _, raw := range strings.Fields(q) {
		neg := strings.HasPrefix(raw, "-") && len(raw) > 1
		term := strings.ToLower(raw)
		if neg {
			term = term[1:]
		}
		var p func(Exchange) bool
		if key, val, ok := strings.Cut(term, ":"); ok && key != "" {
			p = fieldPredicate(key, val)
		}
		if p == nil {
			t := term
			p = func(e Exchange) bool { return strings.Contains(haystack(e), t) }
		}
		if neg {
			inner := p
			p = func(e Exchange) bool { return !inner(e) }
		}
		preds = append(preds, p)
	}
	return func(e Exchange) bool {
		for _, p := range preds {
			if !p(e) {
				return false
			}
		}
		return true
	}
}

func haystack(e Exchange) string {
	u := e.URL
	if u == "" {
		u = e.Host
	}
	return strings.ToLower(e.Method + " " + u + " " + StatusText(e) + " " + e.Source)
}

func status(e Exchange) int {
	if e.Response == nil {
		return 0
	}
	return e.Response.Status
}

func fieldPredicate(key, val string) func(Exchange) bool {
	switch key {
	case "method":
		return func(e Exchange) bool {
			m := e.Method
			if m == "" {
				m = MethodLabel(e)
			}
			return strings.ToLower(m) == val
		}
	case "host":
		return func(e Exchange) bool { return strings.Contains(strings.ToLower(e.Host), val) }
	case "path":
		return func(e Exchange) bool { return strings.Contains(strings.ToLower(e.Path), val) }
	case "src", "source", "app":
		return func(e Exchange) bool { return strings.Contains(strings.ToLower(e.Source), val) }
	case "type":
		return func(e Exchange) bool {
			ct := ""
			if e.Response != nil {
				ct = e.Response.ContentType
			}
			return strings.Contains(ShortType(ct), val) || strings.Contains(strings.ToLower(ct), val)
		}
	case "kind":
		return func(e Exchange) bool { return strings.Contains(e.Kind, val) }
	case "status":
		if len(val) == 3 && strings.HasSuffix(val, "xx") && val[0] >= '1' && val[0] <= '5' {
			return func(e Exchange) bool { s := status(e); return s > 0 && strconv.Itoa(s)[0] == val[0] }
		}
		return func(e Exchange) bool { s := status(e); return s > 0 && strconv.Itoa(s) == val }
	case "is":
		switch val {
		case "error":
			return func(e Exchange) bool { return e.State == StateError || e.Kind == KindTLSError || status(e) >= 400 }
		case "pinned":
			return func(e Exchange) bool { return e.Pinned }
		case "pending":
			return func(e Exchange) bool { return e.State == StatePending }
		}
	}
	return nil
}

func StatusText(e Exchange) string {
	switch {
	case e.Kind == KindTLSError:
		return "TLS"
	case e.State == StateError:
		return "ERR"
	case e.State == StateAborted:
		return "ABT"
	case e.Kind == KindWebSocket && status(e) == 101:
		if e.State == StateDone {
			return "WS"
		}
		return "WS•"
	case e.Kind == KindRaw:
		if e.State == StateDone {
			return "TCP"
		}
		return "TCP•"
	case e.Kind == KindTLSPassthrough:
		return "TLS→"
	case status(e) > 0:
		return strconv.Itoa(status(e))
	}
	return "…"
}

func MethodLabel(e Exchange) string {
	switch e.Kind {
	case KindWebSocket:
		return "WS"
	case KindRaw:
		return "TCP"
	case KindTLSError, KindTLSPassthrough:
		return "TLS"
	}
	return e.Method
}

// ShortType — короткий тип содержимого, как в колонке интерфейса.
func ShortType(ct string) string {
	if ct == "" {
		return ""
	}
	t, _, _ := strings.Cut(ct, ";")
	t = strings.ToLower(strings.TrimSpace(t))
	switch {
	case strings.Contains(t, "json"):
		return "json"
	case strings.Contains(t, "html"):
		return "html"
	case strings.Contains(t, "xml"):
		return "xml"
	case strings.Contains(t, "javascript"):
		return "js"
	case strings.Contains(t, "css"):
		return "css"
	case strings.Contains(t, "protobuf"), strings.Contains(t, "grpc"):
		return "proto"
	case strings.HasPrefix(t, "image/"):
		return strings.ReplaceAll(t[6:], "svg+xml", "svg")
	case strings.HasPrefix(t, "text/"):
		return t[5:]
	case strings.HasPrefix(t, "video/"):
		return "video"
	case strings.HasPrefix(t, "audio/"):
		return "audio"
	case strings.Contains(t, "x-www-form-urlencoded"):
		return "form"
	case strings.Contains(t, "octet-stream"):
		return "bin"
	}
	if _, after, ok := strings.Cut(t, "/"); ok {
		return after
	}
	return t
}
