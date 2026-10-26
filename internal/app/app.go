// Package app owns the shared backend lifecycle for the CLI and native desktop app.
package app

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"siphon/internal/api"
	"siphon/internal/capture"
	"siphon/internal/certs"
	"siphon/internal/intercept"
	"siphon/internal/paths"
	"siphon/internal/proxy"
	"siphon/internal/rules"
	"siphon/internal/webui"
)

type Config struct {
	Version, DataDir, UIAddr, ProxyAddr string
	Desktop                             bool
}

type App struct {
	URL, ProxyAddr, DataDir string
	Manager                 *intercept.Manager
	cancel                  context.CancelFunc
	server                  *http.Server
	proxy                   *proxy.Listener
	once                    sync.Once
}

func Start(parent context.Context, cfg Config) (*App, error) {
	dir := cfg.DataDir
	var err error
	if dir == "" {
		dir, err = paths.DataDir()
	} else {
		err = os.MkdirAll(dir, 0700)
	}
	if err != nil {
		return nil, err
	}
	ca, err := certs.LoadOrCreate(filepath.Join(dir, "ca"))
	if err != nil {
		return nil, err
	}
	settings := proxy.NewSettings()
	settingsPath := filepath.Join(dir, "settings.json")
	if raw, err := os.ReadFile(settingsPath); err == nil {
		var d proxy.SettingsData
		if json.Unmarshal(raw, &d) == nil {
			_ = settings.Set(d)
		}
	}
	settings.OnChange(func(d proxy.SettingsData) { saveJSON(settingsPath, d) })
	engine := proxy.NewEngine(ca, capture.NewStore(), settings)
	rulesPath := filepath.Join(dir, "rules.json")
	if raw, err := os.ReadFile(rulesPath); err == nil {
		var list []rules.Rule
		if json.Unmarshal(raw, &list) == nil {
			if err := engine.Rules.Replace(list); err != nil {
				log.Printf("правила: %v", err)
			}
		}
	}
	engine.Rules.OnChange(func(list []rules.Rule) { saveJSON(rulesPath, list) })
	if cfg.ProxyAddr == "" {
		cfg.ProxyAddr = "127.0.0.1:8000"
	}
	mainProxy, err := engine.Listen(cfg.ProxyAddr, "manual")
	if err != nil {
		host, _, splitErr := net.SplitHostPort(cfg.ProxyAddr)
		if splitErr != nil {
			return nil, err
		}
		mainProxy, err = engine.Listen(net.JoinHostPort(host, "0"), "manual")
		if err != nil {
			return nil, err
		}
	}
	if cfg.UIAddr == "" {
		cfg.UIAddr = "127.0.0.1:0"
	}
	ln, err := net.Listen("tcp", cfg.UIAddr)
	if err != nil {
		host, _, splitErr := net.SplitHostPort(cfg.UIAddr)
		if splitErr == nil {
			ln, err = net.Listen("tcp", net.JoinHostPort(host, "0"))
		}
	}
	if err != nil {
		mainProxy.Close()
		return nil, err
	}
	ctx, cancel := context.WithCancel(parent)
	mgr := intercept.New(engine, dir)
	mgr.Init(ctx)
	exe, _ := os.Executable()
	srv := api.New(api.Config{Version: cfg.Version, DataDir: dir, ProxyAddr: mainProxy.Addr().String(), Web: webui.FS(), Desktop: cfg.Desktop, Executable: exe}, engine, mgr)
	a := &App{URL: "http://" + ln.Addr().String(), ProxyAddr: mainProxy.Addr().String(), DataDir: dir, Manager: mgr, cancel: cancel, proxy: mainProxy,
		server: &http.Server{Handler: srv.Handler(), ReadHeaderTimeout: 10 * time.Second}}
	go func() {
		if err := a.server.Serve(ln); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP: %v", err)
			cancel()
		}
	}()
	saveJSON(filepath.Join(dir, EndpointFile), Endpoint{URL: a.URL, Proxy: a.ProxyAddr, PID: os.Getpid(), Version: cfg.Version, Desktop: cfg.Desktop})
	return a, nil
}

// EndpointFile лежит в каталоге данных, пока Siphon запущен: по нему ИИ-агенты
// и MCP-сервер находят API (в нативном приложении порт случайный).
const EndpointFile = "endpoint.json"

type Endpoint struct {
	URL     string `json:"url"`
	Proxy   string `json:"proxy"`
	PID     int    `json:"pid"`
	Version string `json:"version"`
	Desktop bool   `json:"desktop"`
}

// ReadEndpoint читает адрес запущенного Siphon из каталога данных.
func ReadEndpoint(dataDir string) (Endpoint, error) {
	var ep Endpoint
	raw, err := os.ReadFile(filepath.Join(dataDir, EndpointFile))
	if err != nil {
		return ep, err
	}
	err = json.Unmarshal(raw, &ep)
	return ep, err
}

func (a *App) Close() {
	a.once.Do(func() {
		// Файл убираем, только если он наш: рядом мог стартовать второй Siphon.
		if ep, err := ReadEndpoint(a.DataDir); err == nil && ep.PID == os.Getpid() {
			_ = os.Remove(filepath.Join(a.DataDir, EndpointFile))
		}
		a.cancel()
		a.Manager.Shutdown()
		_ = a.proxy.Close()
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = a.server.Shutdown(ctx)
	})
}

func saveJSON(path string, v any) {
	raw, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".siphon-*")
	if err != nil {
		log.Printf("сохранение %s: %v", path, err)
		return
	}
	name := f.Name()
	defer os.Remove(name)
	if _, err = f.Write(raw); err == nil {
		err = f.Sync()
	}
	if closeErr := f.Close(); err == nil {
		err = closeErr
	}
	if err == nil {
		err = os.Rename(name, path)
	}
	if err != nil {
		log.Print(fmt.Errorf("сохранение %s: %w", path, err))
	}
}
