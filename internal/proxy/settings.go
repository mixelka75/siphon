package proxy

import (
	"net/url"
	"sort"
	"strings"
	"sync"
)

// SettingsData — настройки прокси, которые правятся из UI и сохраняются на диск.
type SettingsData struct {
	// Не проверять сертификаты upstream-серверов вообще.
	InsecureUpstream bool `json:"insecureUpstream"`
	// Автоматически пропускать без расшифровки хосты, чей клиент отверг наш сертификат.
	AutoPassthrough bool `json:"autoPassthrough"`
	// Хосты (или *.маски), TLS которых не расшифровывается.
	PassthroughHosts []string `json:"passthroughHosts"`
	// Хосты, у которых ошибки сертификата сервера игнорируются.
	IgnoreCertHosts []string `json:"ignoreCertHosts"`
	// Внешний прокси (http://, https://, socks5://), через который идёт upstream-трафик.
	UpstreamProxy string `json:"upstreamProxy"`
}

type Settings struct {
	mu       sync.RWMutex
	d        SettingsData
	onChange func(SettingsData)
}

func NewSettings() *Settings {
	return &Settings{d: SettingsData{AutoPassthrough: true}}
}

// OnChange задаёт колбэк, вызываемый после каждого изменения (для сохранения на диск).
func (s *Settings) OnChange(fn func(SettingsData)) {
	s.mu.Lock()
	s.onChange = fn
	s.mu.Unlock()
}

func (s *Settings) Get() SettingsData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	d := s.d
	// Непустые срезы: nil превратился бы в JSON null, а клиенты ждут массив.
	d.PassthroughHosts = append([]string{}, d.PassthroughHosts...)
	d.IgnoreCertHosts = append([]string{}, d.IgnoreCertHosts...)
	return d
}

func (s *Settings) Set(d SettingsData) error {
	if d.UpstreamProxy != "" {
		u, err := url.Parse(d.UpstreamProxy)
		if err != nil || u.Host == "" {
			return &url.Error{Op: "parse", URL: d.UpstreamProxy, Err: errBadProxyURL}
		}
	}
	d.PassthroughHosts = normalizeHosts(d.PassthroughHosts)
	d.IgnoreCertHosts = normalizeHosts(d.IgnoreCertHosts)

	s.mu.Lock()
	s.d = d
	cb := s.onChange
	s.mu.Unlock()
	if cb != nil {
		cb(s.Get())
	}
	return nil
}

func (s *Settings) IsPassthrough(host string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return matchAny(s.d.PassthroughHosts, host)
}

func (s *Settings) IgnoreCertErrors(host string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.d.InsecureUpstream || matchAny(s.d.IgnoreCertHosts, host)
}

func (s *Settings) AutoPassthroughEnabled() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.d.AutoPassthrough
}

// AddPassthrough добавляет хост в список и сообщает, был ли он новым.
func (s *Settings) AddPassthrough(host string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" {
		return false
	}
	s.mu.Lock()
	if matchAny(s.d.PassthroughHosts, host) {
		s.mu.Unlock()
		return false
	}
	s.d.PassthroughHosts = normalizeHosts(append(s.d.PassthroughHosts, host))
	cb := s.onChange
	s.mu.Unlock()
	if cb != nil {
		cb(s.Get())
	}
	return true
}

func (s *Settings) upstreamProxy() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.d.UpstreamProxy
}

func normalizeHosts(in []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(in))
	for _, h := range in {
		h = strings.ToLower(strings.TrimSpace(h))
		if h == "" || seen[h] {
			continue
		}
		seen[h] = true
		out = append(out, h)
	}
	sort.Strings(out)
	return out
}

func matchAny(patterns []string, host string) bool {
	host = strings.ToLower(strings.TrimSuffix(host, "."))
	for _, p := range patterns {
		if p == host {
			return true
		}
		if strings.HasPrefix(p, "*.") && strings.HasSuffix(host, p[1:]) {
			return true
		}
	}
	return false
}
