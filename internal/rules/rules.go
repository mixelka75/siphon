// Package rules — правила обработки трафика: моки, редиректы, подмена
// заголовков и тел, задержки, обрыв соединения и breakpoints.
//
// Работает как у HTTP Toolkit: запрос проверяется по списку сверху вниз, срабатывает
// первое подходящее включённое правило.
package rules

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"siphon/internal/capture"
)

type Matcher struct {
	Method string `json:"method,omitempty"` // GET, POST… пусто — любой
	Host   string `json:"host,omitempty"`   // маска с *: api.example.com, *.example.com
	Path   string `json:"path,omitempty"`   // маска с * по пути без query: /api/*
	URL    string `json:"url,omitempty"`    // регулярное выражение по полному URL
	Source string `json:"source,omitempty"` // подстрока id приложения-источника
	// Заголовок запроса: имя и подстрока значения (значение можно не задавать).
	HeaderName  string `json:"headerName,omitempty"`
	HeaderValue string `json:"headerValue,omitempty"`
}

type Replace struct {
	Find  string `json:"find"`
	With  string `json:"with"`
	Regex bool   `json:"regex,omitempty"`
}

// Mods — изменения запроса или ответа при прохождении через прокси.
type Mods struct {
	SetHeaders    []capture.Header `json:"setHeaders,omitempty"`
	RemoveHeaders []string         `json:"removeHeaders,omitempty"`
	Replace       []Replace        `json:"replace,omitempty"` // поиск/замена в теле (текст)
	SetBody       *string          `json:"setBody,omitempty"` // полностью заменить тело
	Status        int              `json:"status,omitempty"`  // только для ответа
}

func (m Mods) NeedsBody() bool { return len(m.Replace) > 0 || m.SetBody != nil }

func (m Mods) Empty() bool {
	return len(m.SetHeaders) == 0 && len(m.RemoveHeaders) == 0 && !m.NeedsBody() && m.Status == 0
}

// Mock — ответ, который отдаёт сам Siphon, не обращаясь к серверу.
type Mock struct {
	Status     int              `json:"status"`
	Headers    []capture.Header `json:"headers,omitempty"`
	Body       string           `json:"body,omitempty"`
	BodyBase64 string           `json:"bodyBase64,omitempty"` // приоритетнее Body
}

type Rule struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Enabled bool    `json:"enabled"`
	Match   Matcher `json:"match"`

	DelayMs int    `json:"delayMs,omitempty"`
	Mock    *Mock  `json:"mock,omitempty"`
	Block   string `json:"block,omitempty"` // "reset" — оборвать соединение
	// Отправить запрос на другой сервер: схема и хост берутся отсюда, путь — из запроса
	// (если здесь задан путь, он заменяет исходный).
	RedirectTo string `json:"redirectTo,omitempty"`
	Request    Mods   `json:"request"`
	Response   Mods   `json:"response"`

	BreakRequest  bool `json:"breakRequest,omitempty"`
	BreakResponse bool `json:"breakResponse,omitempty"`
}

// Request — то, по чему подбирается правило.
type Request struct {
	Method string
	URL    *url.URL
	Source string
	Header http.Header
}

type compiled struct {
	rule Rule
	host *regexp.Regexp
	path *regexp.Regexp
	url  *regexp.Regexp
}

func glob(pattern string, caseInsensitive bool) (*regexp.Regexp, error) {
	parts := strings.Split(pattern, "*")
	for i, p := range parts {
		parts[i] = regexp.QuoteMeta(p)
	}
	expr := "^" + strings.Join(parts, ".*") + "$"
	if caseInsensitive {
		expr = "(?i)" + expr
	}
	return regexp.Compile(expr)
}

func compile(r Rule) (*compiled, error) {
	c := &compiled{rule: r}
	var err error
	if r.Match.Host != "" {
		if c.host, err = glob(r.Match.Host, true); err != nil {
			return nil, fmt.Errorf("маска хоста: %w", err)
		}
	}
	if r.Match.Path != "" {
		if c.path, err = glob(r.Match.Path, false); err != nil {
			return nil, fmt.Errorf("маска пути: %w", err)
		}
	}
	if r.Match.URL != "" {
		if c.url, err = regexp.Compile(r.Match.URL); err != nil {
			return nil, fmt.Errorf("выражение для URL: %w", err)
		}
	}
	for _, rep := range append(append([]Replace(nil), r.Request.Replace...), r.Response.Replace...) {
		if rep.Find == "" {
			return nil, errors.New("в замене пустой шаблон поиска")
		}
		if rep.Regex {
			if _, err := regexp.Compile(rep.Find); err != nil {
				return nil, fmt.Errorf("регулярное выражение замены: %w", err)
			}
		}
	}
	if r.RedirectTo != "" {
		u, err := url.Parse(r.RedirectTo)
		if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
			return nil, errors.New("адрес перенаправления должен быть вида https://host[:port][/path]")
		}
	}
	for _, mods := range []Mods{r.Request, r.Response} {
		if err := (Resolution{Status: mods.Status, Headers: &mods.SetHeaders}).Validate(); err != nil {
			return nil, err
		}
	}
	if r.Mock != nil {
		if err := (Resolution{Status: r.Mock.Status, Headers: &r.Mock.Headers}).Validate(); err != nil {
			return nil, err
		}
		if r.Mock.BodyBase64 != "" {
			if _, err := base64.StdEncoding.DecodeString(r.Mock.BodyBase64); err != nil {
				return nil, errors.New("неверный base64 тела мока")
			}
		}
	}
	if r.DelayMs < 0 {
		return nil, errors.New("задержка не может быть отрицательной")
	}
	if r.Block != "" && r.Block != "reset" {
		return nil, errors.New("неизвестный способ блокировки")
	}
	return c, nil
}

func (c *compiled) matches(q Request) bool {
	m := c.rule.Match
	if m.Method != "" && !strings.EqualFold(m.Method, q.Method) {
		return false
	}
	if q.URL == nil {
		return false
	}
	if c.host != nil {
		host := q.URL.Hostname()
		hostport := q.URL.Host
		if !c.host.MatchString(host) && !c.host.MatchString(hostport) {
			return false
		}
	}
	if c.path != nil && !c.path.MatchString(q.URL.Path) {
		return false
	}
	if c.url != nil && !c.url.MatchString(q.URL.String()) {
		return false
	}
	if m.Source != "" && !strings.Contains(strings.ToLower(q.Source), strings.ToLower(m.Source)) {
		return false
	}
	if m.HeaderName != "" {
		vals := q.Header.Values(m.HeaderName)
		if len(vals) == 0 {
			return false
		}
		if m.HeaderValue != "" {
			found := false
			for _, v := range vals {
				if strings.Contains(strings.ToLower(v), strings.ToLower(m.HeaderValue)) {
					found = true
				}
			}
			if !found {
				return false
			}
		}
	}
	return true
}

// Set — упорядоченный список правил.
type Set struct {
	mu       sync.RWMutex
	list     []*compiled
	onChange func([]Rule)
	seq      int
}

func NewSet() *Set { return &Set{} }

func (s *Set) OnChange(fn func([]Rule)) {
	s.mu.Lock()
	s.onChange = fn
	s.mu.Unlock()
}

func (s *Set) Get() []Rule {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Rule, len(s.list))
	for i, c := range s.list {
		out[i] = c.rule
	}
	return out
}

// Replace заменяет весь список (так же работает и интерфейс). Невалидное правило
// отклоняет весь список с понятным сообщением; старый список остаётся.
func (s *Set) Replace(rules []Rule) error {
	next := make([]*compiled, 0, len(rules))
	s.mu.Lock()
	seen := map[string]bool{}
	for i := range rules {
		r := rules[i]
		if r.ID == "" || seen[r.ID] {
			s.seq++
			r.ID = "r" + strconv.Itoa(s.seq) + "-" + strconv.Itoa(i)
		}
		seen[r.ID] = true
		if r.Mock != nil && r.Mock.Status == 0 {
			m := *r.Mock
			m.Status = 200
			r.Mock = &m
		}
		c, err := compile(r)
		if err != nil {
			s.mu.Unlock()
			name := r.Name
			if name == "" {
				name = fmt.Sprintf("#%d", i+1)
			}
			return fmt.Errorf("правило «%s»: %w", name, err)
		}
		next = append(next, c)
	}
	s.list = next
	cb := s.onChange
	s.mu.Unlock()
	if cb != nil {
		cb(s.Get())
	}
	return nil
}

// Match возвращает копию первого подходящего включённого правила.
func (s *Set) Match(q Request) *Rule {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, c := range s.list {
		if c.rule.Enabled && c.matches(q) {
			r := c.rule
			return &r
		}
	}
	return nil
}

// ---- применение изменений ----

func (m Mods) ApplyHeaders(h http.Header) {
	for _, name := range m.RemoveHeaders {
		h.Del(name)
	}
	for _, kv := range m.SetHeaders {
		h.Set(kv.Name, kv.Value)
	}
}

// ApplyBody применяет SetBody и замены к (уже распакованному) телу.
func (m Mods) ApplyBody(body []byte) []byte {
	if m.SetBody != nil {
		body = []byte(*m.SetBody)
	}
	for _, rep := range m.Replace {
		if rep.Regex {
			if re, err := regexp.Compile(rep.Find); err == nil {
				body = re.ReplaceAll(body, []byte(rep.With))
			}
			continue
		}
		body = []byte(strings.ReplaceAll(string(body), rep.Find, rep.With))
	}
	return body
}

// RedirectURL подставляет в target схему и хост (и путь, если он задан) из RedirectTo.
func (r *Rule) RedirectURL(target *url.URL) (*url.URL, error) {
	if r.RedirectTo == "" {
		return target, nil
	}
	to, err := url.Parse(r.RedirectTo)
	if err != nil {
		return nil, err
	}
	out := *target
	out.Scheme, out.Host = to.Scheme, to.Host
	if to.Path != "" && to.Path != "/" {
		out.Path, out.RawPath = to.Path, to.RawPath
	}
	return &out, nil
}
