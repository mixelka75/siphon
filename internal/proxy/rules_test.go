package proxy

import (
	"bytes"
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"siphon/internal/capture"
	"siphon/internal/rules"
)

func (r *rig) setRules(t *testing.T, list ...rules.Rule) {
	t.Helper()
	for i := range list {
		list[i].Enabled = true
		if list[i].Name == "" {
			list[i].Name = "тест"
		}
	}
	if err := r.e.Rules.Replace(list); err != nil {
		t.Fatal(err)
	}
}

func (r *rig) waitPaused(t *testing.T, kind string) capture.Exchange {
	t.Helper()
	return r.wait(t, "paused "+kind, func(e capture.Exchange) bool {
		return e.State == capture.StatePaused && e.Breakpoint == kind
	})
}

func get(t *testing.T, c *http.Client, u string) (int, string, http.Header) {
	t.Helper()
	resp, err := c.Get(u)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(b), resp.Header
}

func TestRuleMockDoesNotTouchServer(t *testing.T) {
	r := newRig(t)
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		hits.Add(1)
		_, _ = io.WriteString(w, "real")
	}))
	defer srv.Close()

	r.setRules(t, rules.Rule{
		Name:  "мок API",
		Match: rules.Matcher{Path: "/api/*", Method: "get"},
		Mock: &rules.Mock{Status: 418, Headers: []capture.Header{{Name: "X-Mock", Value: "1"}},
			Body: `{"mocked":true}`},
	})

	status, body, h := get(t, r.client(false), srv.URL+"/api/users?x=1")
	if status != 418 || body != `{"mocked":true}` || h.Get("X-Mock") != "1" {
		t.Fatalf("ответ: %d %q %v", status, body, h)
	}
	if hits.Load() != 0 {
		t.Fatal("мок не должен обращаться к серверу")
	}
	// Правило не по пути — запрос идёт на настоящий сервер.
	if _, body, _ := get(t, r.client(false), srv.URL+"/other"); body != "real" {
		t.Fatalf("не подходящий путь получил %q", body)
	}

	ex := r.wait(t, "mock", func(e capture.Exchange) bool { return e.Rule == "мок API" && e.State == capture.StateDone })
	if ex.Response.Status != 418 || string(r.e.Store.Body(ex.ID, false)) != `{"mocked":true}` {
		t.Fatalf("запись: %+v", ex.Response)
	}
}

func TestRuleMockOverHTTPS(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		_, _ = io.WriteString(w, "real")
	}))
	defer srv.Close()
	r.setRules(t, rules.Rule{Match: rules.Matcher{Path: "/*"}, Mock: &rules.Mock{Body: "fake-https"}})

	status, body, _ := get(t, r.client(false), srv.URL+"/x")
	if status != 200 || body != "fake-https" {
		t.Fatalf("%d %q", status, body)
	}
}

func TestRuleRedirectToOtherServer(t *testing.T) {
	r := newRig(t)
	a := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) { _, _ = io.WriteString(w, "A") }))
	defer a.Close()
	b := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		_, _ = io.WriteString(w, "B:"+q.URL.Path)
	}))
	defer b.Close()
	r.setRules(t, rules.Rule{Match: rules.Matcher{Path: "/prod/*"}, RedirectTo: b.URL})

	if _, body, _ := get(t, r.client(false), a.URL+"/prod/items"); body != "B:/prod/items" {
		t.Fatalf("запрос не ушёл на B: %q", body)
	}
	if _, body, _ := get(t, r.client(false), a.URL+"/free"); body != "A" {
		t.Fatalf("остальные запросы должны идти на A: %q", body)
	}
	ex := r.wait(t, "redirected", func(e capture.Exchange) bool { return e.Edited && e.State == capture.StateDone })
	if !strings.Contains(ex.URL, strings.TrimPrefix(b.URL, "http://")) {
		t.Fatalf("в записи должен быть реальный адрес назначения: %s", ex.URL)
	}
}

func TestRuleRewritesHeadersAndGzipBody(t *testing.T) {
	r := newRig(t)
	var gotReqHeader atomic.Value
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		gotReqHeader.Store(q.Header.Get("X-Req"))
		var gz bytes.Buffer
		zw := gzip.NewWriter(&gz)
		_, _ = zw.Write([]byte(`{"price":100,"secret":"abc"}`))
		zw.Close()
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Remove", "me")
		_, _ = w.Write(gz.Bytes())
	}))
	defer srv.Close()

	r.setRules(t, rules.Rule{
		Match:   rules.Matcher{Path: "/*"},
		Request: rules.Mods{SetHeaders: []capture.Header{{Name: "X-Req", Value: "yes"}}},
		Response: rules.Mods{
			SetHeaders:    []capture.Header{{Name: "X-Added", Value: "1"}},
			RemoveHeaders: []string{"X-Remove"},
			Replace: []rules.Replace{
				{Find: "100", With: "1"},
				{Find: `"secret":"[a-z]+"`, With: `"secret":"***"`, Regex: true},
			},
		},
	})

	// Клиент без прозрачной распаковки: смотрим, что реально пришло по проводу.
	c := r.client(false)
	c.Transport.(*http.Transport).DisableCompression = true
	status, body, h := get(t, c, srv.URL+"/data")
	if status != 200 || body != `{"price":1,"secret":"***"}` {
		t.Fatalf("тело после правки: %d %q", status, body)
	}
	if h.Get("Content-Encoding") != "" {
		t.Fatalf("после правки тела Content-Encoding должен исчезнуть: %q", h.Get("Content-Encoding"))
	}
	if h.Get("X-Added") != "1" || h.Get("X-Remove") != "" {
		t.Fatalf("заголовки ответа: %v", h)
	}
	if gotReqHeader.Load() != "yes" {
		t.Fatalf("заголовок запроса не добавлен: %v", gotReqHeader.Load())
	}
	r.wait(t, "edited", func(e capture.Exchange) bool { return e.Edited && e.State == capture.StateDone })
}

func TestBreakpointEditsRequest(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		b, _ := io.ReadAll(q.Body)
		_, _ = io.WriteString(w, q.Method+"|"+q.Header.Get("X-Edited")+"|"+string(b))
	}))
	defer srv.Close()
	r.setRules(t, rules.Rule{Match: rules.Matcher{Path: "/bp"}, BreakRequest: true})

	type result struct {
		body string
		err  error
	}
	done := make(chan result, 1)
	go func() {
		resp, err := r.client(false).Post(srv.URL+"/bp", "text/plain", strings.NewReader("orig"))
		if err != nil {
			done <- result{err: err}
			return
		}
		defer resp.Body.Close()
		b, _ := io.ReadAll(resp.Body)
		done <- result{body: string(b)}
	}()

	ex := r.waitPaused(t, "request")
	if string(r.e.Store.Body(ex.ID, true)) != "orig" {
		t.Fatalf("на breakpoint тело запроса должно быть доступно: %q", r.e.Store.Body(ex.ID, true))
	}
	select {
	case res := <-done:
		t.Fatalf("запрос не должен уйти, пока он остановлен: %+v", res)
	case <-time.After(150 * time.Millisecond):
	}

	hdrs := []capture.Header{{Name: "Content-Type", Value: "text/plain"}, {Name: "X-Edited", Value: "yes"}}
	body := "edited"
	if err := r.e.Breaks.Resolve(ex.ID, rules.Resolution{Method: "put", Headers: &hdrs, Body: &body}); err != nil {
		t.Fatal(err)
	}
	res := <-done
	if res.err != nil || res.body != "PUT|yes|edited" {
		t.Fatalf("сервер получил %q (%v)", res.body, res.err)
	}
	final := r.wait(t, "done", func(e capture.Exchange) bool { return e.ID == ex.ID && e.State == capture.StateDone })
	if !final.Edited || final.Method != "PUT" || final.Breakpoint != "" {
		t.Fatalf("итоговая запись: %+v", final)
	}
}

func TestBreakpointEditsResponse(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		w.Header().Set("X-Orig", "1")
		_, _ = io.WriteString(w, "hello")
	}))
	defer srv.Close()
	r.setRules(t, rules.Rule{Match: rules.Matcher{Path: "/*"}, BreakResponse: true})

	type result struct {
		status int
		body   string
		hdr    http.Header
	}
	done := make(chan result, 1)
	go func() {
		s, b, h := get(t, r.client(false), srv.URL+"/r")
		done <- result{s, b, h}
	}()

	ex := r.waitPaused(t, "response")
	if ex.Response == nil || ex.Response.Status != 200 || string(r.e.Store.Body(ex.ID, false)) != "hello" {
		t.Fatalf("на breakpoint должен быть виден оригинальный ответ: %+v", ex.Response)
	}
	hdrs := []capture.Header{{Name: "X-New", Value: "2"}}
	body := "patched"
	if err := r.e.Breaks.Resolve(ex.ID, rules.Resolution{Status: 201, Headers: &hdrs, Body: &body}); err != nil {
		t.Fatal(err)
	}
	res := <-done
	if res.status != 201 || res.body != "patched" || res.hdr.Get("X-New") != "2" || res.hdr.Get("X-Orig") != "" {
		t.Fatalf("клиент получил %+v", res)
	}
}

func TestBreakpointDropAbortsClient(t *testing.T) {
	r := newRig(t)
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) { hits.Add(1) }))
	defer srv.Close()
	r.setRules(t, rules.Rule{Match: rules.Matcher{Path: "/*"}, BreakRequest: true})

	errc := make(chan error, 1)
	go func() {
		resp, err := r.client(false).Get(srv.URL + "/x")
		if err == nil {
			resp.Body.Close()
		}
		errc <- err
	}()
	ex := r.waitPaused(t, "request")
	if err := r.e.Breaks.Resolve(ex.ID, rules.Resolution{Drop: true}); err != nil {
		t.Fatal(err)
	}
	if err := <-errc; err == nil {
		t.Fatal("клиент должен получить обрыв соединения")
	}
	if hits.Load() != 0 {
		t.Fatal("оборванный запрос не должен доходить до сервера")
	}
	r.wait(t, "aborted", func(e capture.Exchange) bool { return e.ID == ex.ID && e.State == capture.StateAborted })
}

func TestBreakpointClientGivesUp(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {}))
	defer srv.Close()
	r.setRules(t, rules.Rule{Match: rules.Matcher{Path: "/*"}, BreakRequest: true})

	c := r.client(false)
	c.Timeout = 300 * time.Millisecond
	if _, err := c.Get(srv.URL + "/x"); err == nil {
		t.Fatal("ожидался таймаут клиента")
	}
	r.wait(t, "aborted by client", func(e capture.Exchange) bool { return e.State == capture.StateAborted })
	if r.e.Breaks.IsWaiting("1") {
		t.Fatal("ожидание breakpoint должно сниматься, когда клиент ушёл")
	}
}

func TestBreakpointContinuePreservesCompressedBinaryBodies(t *testing.T) {
	r := newRig(t)
	var compressed bytes.Buffer
	zw := gzip.NewWriter(&compressed)
	_, _ = zw.Write([]byte{0, 255, 1, 2, 0, 128, 3})
	_ = zw.Close()
	wireBody := compressed.Bytes()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		body, _ := io.ReadAll(q.Body)
		if !bytes.Equal(body, wireBody) || q.Header.Get("Content-Encoding") != "gzip" {
			http.Error(w, "request corrupted", 400)
			return
		}
		w.Header().Set("Content-Encoding", "gzip")
		_, _ = w.Write(body)
	}))
	defer srv.Close()
	r.setRules(t, rules.Rule{BreakRequest: true, BreakResponse: true})
	type result struct {
		status   int
		body     []byte
		encoding string
		err      error
	}
	done := make(chan result, 1)
	go func() {
		c := r.client(false)
		c.Transport.(*http.Transport).DisableCompression = true
		q, _ := http.NewRequest("POST", srv.URL+"/binary", bytes.NewReader(wireBody))
		q.Header.Set("Content-Encoding", "gzip")
		resp, err := c.Do(q)
		if err != nil {
			done <- result{err: err}
			return
		}
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		done <- result{resp.StatusCode, body, resp.Header.Get("Content-Encoding"), err}
	}()
	for _, kind := range []string{"request", "response"} {
		ex := r.waitPaused(t, kind)
		if err := r.e.Breaks.Resolve(ex.ID, rules.Resolution{}); err != nil {
			t.Fatal(err)
		}
	}
	res := <-done
	if res.err != nil || res.status != 200 || res.encoding != "gzip" || !bytes.Equal(res.body, wireBody) {
		t.Fatalf("body changed: %+v", res)
	}
}

func TestRuleBlockResetsConnection(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) { _, _ = io.WriteString(w, "x") }))
	defer srv.Close()
	r.setRules(t, rules.Rule{Match: rules.Matcher{Path: "/block"}, Block: "reset"})

	if resp, err := r.client(false).Get(srv.URL + "/block"); err == nil {
		resp.Body.Close()
		t.Fatal("ожидался обрыв соединения")
	}
	ex := r.wait(t, "blocked", func(e capture.Exchange) bool { return e.State == capture.StateError })
	if !strings.Contains(ex.Error, "правилом") {
		t.Fatalf("причина: %q", ex.Error)
	}
	if _, body, _ := get(t, r.client(false), srv.URL+"/ok"); body != "x" {
		t.Fatalf("другие запросы не должны страдать: %q", body)
	}
}

func TestRuleDelay(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) { _, _ = io.WriteString(w, "ok") }))
	defer srv.Close()
	r.setRules(t, rules.Rule{Match: rules.Matcher{Path: "/slow"}, DelayMs: 350})

	start := time.Now()
	get(t, r.client(false), srv.URL+"/slow")
	if d := time.Since(start); d < 340*time.Millisecond {
		t.Fatalf("задержка не сработала: %v", d)
	}
}

func TestRuleOrderDisabledAndFirstMatchWins(t *testing.T) {
	r := newRig(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) { _, _ = io.WriteString(w, "real") }))
	defer srv.Close()

	list := []rules.Rule{
		{Name: "выключено", Enabled: false, Match: rules.Matcher{Path: "/*"}, Mock: &rules.Mock{Body: "disabled"}},
		{Name: "первое", Enabled: true, Match: rules.Matcher{Path: "/a*"}, Mock: &rules.Mock{Body: "first"}},
		{Name: "второе", Enabled: true, Match: rules.Matcher{Path: "/*"}, Mock: &rules.Mock{Body: "second"}},
	}
	if err := r.e.Rules.Replace(list); err != nil {
		t.Fatal(err)
	}
	if _, body, _ := get(t, r.client(false), srv.URL+"/abc"); body != "first" {
		t.Fatalf("/abc: %q", body)
	}
	if _, body, _ := get(t, r.client(false), srv.URL+"/zzz"); body != "second" {
		t.Fatalf("/zzz: %q", body)
	}
}

func TestRulesValidationKeepsOldList(t *testing.T) {
	s := rules.NewSet()
	good := []rules.Rule{{Name: "ok", Enabled: true, Match: rules.Matcher{Host: "a.example.com"}}}
	if err := s.Replace(good); err != nil {
		t.Fatal(err)
	}
	bad := [][]rules.Rule{
		{{Name: "плохой regexp", Match: rules.Matcher{URL: "(["}}},
		{{Name: "плохой редирект", RedirectTo: "ftp://nope"}},
		{{Name: "пустая замена", Response: rules.Mods{Replace: []rules.Replace{{Find: ""}}}}},
		{{Name: "плохой статус", Mock: &rules.Mock{Status: 999}}},
	}
	for _, b := range bad {
		err := s.Replace(b)
		if err == nil || !strings.Contains(err.Error(), b[0].Name) {
			t.Fatalf("%s: ожидалась ошибка с названием правила, получено %v", b[0].Name, err)
		}
	}
	if got := s.Get(); len(got) != 1 || got[0].Name != "ok" {
		t.Fatalf("после отклонённых списков остаться должен прежний: %+v", got)
	}
}

func TestMatcher(t *testing.T) {
	mk := func(m rules.Matcher) *rules.Set {
		s := rules.NewSet()
		if err := s.Replace([]rules.Rule{{Name: "x", Enabled: true, Match: m}}); err != nil {
			t.Fatal(err)
		}
		return s
	}
	u := func(raw string) *url.URL { x, _ := url.Parse(raw); return x }
	req := func(method, raw, src string, h http.Header) rules.Request {
		return rules.Request{Method: method, URL: u(raw), Source: src, Header: h}
	}
	cases := []struct {
		name string
		m    rules.Matcher
		req  rules.Request
		want bool
	}{
		{"поддомен по маске", rules.Matcher{Host: "*.example.com"}, req("GET", "https://api.example.com/x", "", nil), true},
		{"маска не цепляет чужой домен", rules.Matcher{Host: "*.example.com"}, req("GET", "https://example.org/x", "", nil), false},
		{"хост без учёта регистра", rules.Matcher{Host: "API.example.com"}, req("GET", "https://api.EXAMPLE.com/", "", nil), true},
		{"хост с портом", rules.Matcher{Host: "localhost:8080"}, req("GET", "http://localhost:8080/", "", nil), true},
		{"метод", rules.Matcher{Method: "post"}, req("GET", "https://a.com/", "", nil), false},
		{"путь не учитывает query", rules.Matcher{Path: "/api/*"}, req("GET", "https://a.com/api/x?y=1", "", nil), true},
		{"путь точный", rules.Matcher{Path: "/api"}, req("GET", "https://a.com/api/x", "", nil), false},
		{"regexp по URL", rules.Matcher{URL: `/users/\d+$`}, req("GET", "https://a.com/users/42", "", nil), true},
		{"источник", rules.Matcher{Source: "spotify"}, req("GET", "https://a.com/", "com.Spotify.music", nil), true},
		{"заголовок есть", rules.Matcher{HeaderName: "x-token"}, req("GET", "https://a.com/", "", http.Header{"X-Token": {"1"}}), true},
		{"заголовок со значением", rules.Matcher{HeaderName: "x-token", HeaderValue: "abc"}, req("GET", "https://a.com/", "", http.Header{"X-Token": {"xxABCxx"}}), true},
		{"заголовка нет", rules.Matcher{HeaderName: "x-token"}, req("GET", "https://a.com/", "", nil), false},
		{"пустое правило ловит всё", rules.Matcher{}, req("DELETE", "https://zzz.io/q", "", nil), true},
	}
	for _, c := range cases {
		if got := mk(c.m).Match(c.req) != nil; got != c.want {
			t.Errorf("%s: получено %v, ожидалось %v", c.name, got, c.want)
		}
	}
}
