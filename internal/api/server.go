// Package api — HTTP/WebSocket API, которым пользуется интерфейс Siphon.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"io/fs"
	"net"
	"net/http"
	"net/url"
	"runtime"
	"sort"
	"strings"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"siphon/internal/capture"
	"siphon/internal/intercept"
	"siphon/internal/proxy"
)

type Config struct {
	Desktop   bool
	Version   string
	DataDir   string
	ProxyAddr string // адрес ручного прокси, например 127.0.0.1:8000
	Web       fs.FS  // собранный интерфейс (может быть nil)
	// Executable — путь к бинарнику Siphon: с аргументом mcp он работает как
	// MCP-сервер для ИИ-агентов (показываем команду подключения в настройках).
	Executable string
}

type Server struct {
	cfg    Config
	engine *proxy.Engine
	store  *capture.Store
	mgr    *intercept.Manager
	agent  *agentHub
}

func New(cfg Config, engine *proxy.Engine, mgr *intercept.Manager) *Server {
	return &Server{cfg: cfg, engine: engine, store: engine.Store, mgr: mgr, agent: newAgentHub()}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/state", s.handleState)
	mux.HandleFunc("GET /api/events", s.handleEvents)
	mux.HandleFunc("GET /api/ca.pem", s.handleCA)
	mux.HandleFunc("GET /api/ca.der", s.handleCA)

	mux.HandleFunc("GET /api/exchanges", s.handleList)
	mux.HandleFunc("GET /api/exchanges/{id}", s.handleGet)
	mux.HandleFunc("GET /api/exchanges/{id}/body", s.handleBody)
	mux.HandleFunc("GET /api/exchanges/{id}/frames", s.handleFrames)
	mux.HandleFunc("GET /api/exchanges/{id}/curl", s.handleCurl)
	mux.HandleFunc("POST /api/exchanges/{id}/pin", s.handlePin)
	mux.HandleFunc("POST /api/exchanges/delete", s.handleDelete)
	mux.HandleFunc("POST /api/exchanges/clear", s.handleClear)
	mux.HandleFunc("GET /api/export/har", s.handleHAR)
	mux.HandleFunc("POST /api/export/har", s.handleHAR)
	mux.HandleFunc("GET /api/export/json", s.handleExportJSON)
	mux.HandleFunc("POST /api/export/json", s.handleExportJSON)

	mux.HandleFunc("GET /api/rules", s.handleGetRules)
	mux.HandleFunc("PUT /api/rules", s.handlePutRules)
	mux.HandleFunc("POST /api/exchanges/{id}/resume", s.handleResume)
	mux.HandleFunc("POST /api/exchanges/{id}/drop", s.handleDrop)

	mux.HandleFunc("GET /api/settings", s.handleGetSettings)
	mux.HandleFunc("PUT /api/settings", s.handlePutSettings)

	mux.HandleFunc("GET /api/android", s.handleAndroid)
	mux.HandleFunc("POST /api/android/adb/download", s.handleDownloadADB)
	mux.HandleFunc("POST /api/android/devices/{serial}/inspect", s.handleInspect)
	mux.HandleFunc("POST /api/android/devices/{serial}/prepare", s.handlePrepare)
	mux.HandleFunc("POST /api/android/devices/{serial}/stop-frida", s.handleStopFrida)
	mux.HandleFunc("POST /api/android/devices/{serial}/restart-framework", s.handleRestartFramework)
	mux.HandleFunc("GET /api/android/devices/{serial}/apps", s.handleApps)
	mux.HandleFunc("GET /api/android/emulators", s.handleEmulators)
	mux.HandleFunc("POST /api/android/emulators/{name}/start", s.handleStartEmulator)
	mux.HandleFunc("POST /api/android/sessions", s.handleStartSession)
	mux.HandleFunc("POST /api/android/sessions/{id}/stop", s.handleStopSession)
	mux.HandleFunc("DELETE /api/android/sessions/{id}", s.handleDismissSession)

	mux.HandleFunc("GET /api/agent/asks", s.handleAsks)
	mux.HandleFunc("POST /api/agent/asks", s.handleCreateAsk)
	mux.HandleFunc("GET /api/agent/asks/{id}", s.handleGetAsk)
	mux.HandleFunc("POST /api/agent/asks/{id}/answer", s.handleAnswerAsk)
	mux.HandleFunc("DELETE /api/agent/asks/{id}", s.handleWithdrawAsk)

	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		writeErr(w, http.StatusNotFound, errors.New("неизвестный метод API"))
	})
	mux.Handle("/", s.staticHandler())

	return guardWithDesktop(mux, s.cfg.Desktop)
}

// guard защищает API, который управляет прокси и отдаёт весь трафик, от
// DNS-rebinding и от запросов с чужих сайтов.
func guard(next http.Handler) http.Handler {
	return guardWithDesktop(next, false)
}

func desktopOrigin(origin string) bool {
	return origin == "wails://wails" || origin == "http://wails.localhost"
}

func guardWithDesktop(next http.Handler, desktop bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		if h, _, err := net.SplitHostPort(host); err == nil {
			host = h
		}
		host = strings.Trim(host, "[]")
		if host != "127.0.0.1" && host != "localhost" && host != "::1" {
			http.Error(w, "Siphon: доступ только с локального адреса", http.StatusForbidden)
			return
		}
		if desktop && desktopOrigin(r.Header.Get("Origin")) {
			w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition, X-Body-Content-Type, X-Body-Size, X-Body-Truncated, X-Body-Evicted, X-Decode-Error")
			if r.Method == http.MethodOptions {
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				w.WriteHeader(http.StatusNoContent)
				return
			}
		} else if r.Method != http.MethodGet && r.Method != http.MethodHead {
			if origin := r.Header.Get("Origin"); origin != "" {
				u, err := url.Parse(origin)
				if err != nil || u.Host != r.Host {
					http.Error(w, "Siphon: чужой Origin", http.StatusForbidden)
					return
				}
			}
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func readJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20))
	return dec.Decode(v)
}

func (s *Server) staticHandler() http.Handler {
	if s.cfg.Web == nil {
		return http.HandlerFunc(noUI)
	}
	if _, err := fs.Stat(s.cfg.Web, "index.html"); err != nil {
		return http.HandlerFunc(noUI)
	}
	files := http.FileServer(http.FS(s.cfg.Web))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := strings.TrimPrefix(r.URL.Path, "/")
		if p != "" {
			if _, err := fs.Stat(s.cfg.Web, p); err != nil {
				r.URL.Path = "/" // SPA: неизвестные пути отдаём index.html
			}
		}
		files.ServeHTTP(w, r)
	})
}

func noUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(`<!doctype html><meta charset=utf-8><title>Siphon</title>
<body style="font:16px system-ui;max-width:36rem;margin:4rem auto"><h1>Интерфейс не собран</h1>
<p>Выполните <code>make ui</code> (или <code>npm run build</code> в папке <code>ui</code>) и перезапустите Siphon.
API при этом уже работает: <a href="/api/state">/api/state</a>.</p>`))
}

func lanIPs() []string {
	var out []string
	ifaces, _ := net.Interfaces()
	for _, ifc := range ifaces {
		if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, _ := ifc.Addrs()
		for _, a := range addrs {
			if ipn, ok := a.(*net.IPNet); ok {
				if ip4 := ipn.IP.To4(); ip4 != nil && !ip4.IsLinkLocalUnicast() {
					out = append(out, ip4.String())
				}
			}
		}
	}
	sort.Strings(out)
	return out
}

func (s *Server) handleState(w http.ResponseWriter, _ *http.Request) {
	_, port, _ := net.SplitHostPort(s.cfg.ProxyAddr)
	bind, _, _ := net.SplitHostPort(s.cfg.ProxyAddr)
	writeJSON(w, 200, map[string]any{
		"version":  s.cfg.Version,
		"platform": runtime.GOOS,
		"dataDir":  s.cfg.DataDir,
		"ca":       map[string]string{"subject": s.engine.CA.Subject()},
		"proxy":    map[string]any{"port": port, "bind": bind, "lanIPs": lanIPs()},
		"adb":      s.mgr.ADBStatus(),
		"settings": s.engine.Settings.Get(),
		"traffic":  map[string]any{"lastSeq": s.store.LastSeq()},
		"agent":    map[string]any{"executable": s.cfg.Executable, "desktop": s.cfg.Desktop},
	})
}

func (s *Server) handleCA(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/x-x509-ca-cert")
	if strings.HasSuffix(r.URL.Path, ".der") {
		w.Header().Set("Content-Disposition", `attachment; filename="siphon-ca.cer"`)
		_, _ = w.Write(s.engine.CA.CertDER())
		return
	}
	w.Header().Set("Content-Disposition", `attachment; filename="siphon-ca.pem"`)
	_, _ = w.Write(s.engine.CA.CertPEM())
}

// handleEvents — единый WebSocket: события трафика и Android.
func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	opts := &websocket.AcceptOptions{}
	if s.cfg.Desktop && desktopOrigin(r.Header.Get("Origin")) {
		opts.OriginPatterns = []string{"wails", "wails.localhost"}
	}
	c, err := websocket.Accept(w, r, opts)
	if err != nil {
		return
	}
	defer c.CloseNow()
	ctx := c.CloseRead(r.Context())

	type msg struct {
		Ch    string `json:"ch"`
		Event any    `json:"event"`
	}
	send := func(m msg) bool {
		wctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()
		return wsjson.Write(wctx, c, m) == nil
	}

	traffic, cancelT := s.store.Subscribe()
	android, cancelA := s.mgr.Subscribe()
	agent, cancelG := s.agent.Subscribe()
	defer func() { cancelT(); cancelA(); cancelG() }()

	if !send(msg{Ch: "hello", Event: map[string]string{"version": s.cfg.Version}}) {
		return
	}
	for {
		select {
		case <-ctx.Done():
			return
		case ev, ok := <-traffic:
			if !ok {
				// Подписчик не успевал — просим интерфейс перечитать состояние.
				if !send(msg{Ch: "traffic", Event: capture.Event{Type: "resync"}}) {
					return
				}
				traffic, cancelT = s.store.Subscribe()
				continue
			}
			if !send(msg{Ch: "traffic", Event: ev}) {
				return
			}
		case ev, ok := <-android:
			if !ok {
				if !send(msg{Ch: "android", Event: intercept.Event{Type: "resync"}}) {
					return
				}
				android, cancelA = s.mgr.Subscribe()
				continue
			}
			if !send(msg{Ch: "android", Event: ev}) {
				return
			}
		case ev, ok := <-agent:
			if !ok {
				if !send(msg{Ch: "agent", Event: AgentEvent{Type: "resync"}}) {
					return
				}
				agent, cancelG = s.agent.Subscribe()
				continue
			}
			if !send(msg{Ch: "agent", Event: ev}) {
				return
			}
		}
	}
}
