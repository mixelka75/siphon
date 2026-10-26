package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDesktopOriginsStayRestricted(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) })
	for _, tc := range []struct {
		desktop              bool
		origin, host, method string
		status               int
		cors                 bool
	}{
		{true, "wails://wails", "127.0.0.1:1234", "POST", 200, true},
		{true, "http://wails.localhost", "127.0.0.1:1234", "OPTIONS", 204, true},
		{true, "https://evil.test", "127.0.0.1:1234", "POST", 403, false},
		{true, "wails://wails", "evil.test", "POST", 403, false},
		{false, "wails://wails", "127.0.0.1:1234", "POST", 403, false},
		{false, "http://127.0.0.1:1234", "127.0.0.1:1234", "POST", 200, false},
	} {
		r := httptest.NewRequest(tc.method, "http://"+tc.host+"/api/state", nil)
		r.Header.Set("Origin", tc.origin)
		w := httptest.NewRecorder()
		guardWithDesktop(next, tc.desktop).ServeHTTP(w, r)
		if w.Code != tc.status || (w.Header().Get("Access-Control-Allow-Origin") != "") != tc.cors {
			t.Errorf("%+v: %d %v", tc, w.Code, w.Header())
		}
	}
}
