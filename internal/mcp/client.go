package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"siphon/internal/app"
	"siphon/internal/paths"
	"siphon/internal/sysproc"
)

// client ходит в HTTP API запущенного Siphon.
type client struct {
	opts Options
	http *http.Client

	mu   sync.Mutex
	base string
}

func newClient(opts Options) *client {
	return &client{opts: opts, http: &http.Client{}}
}

type apiError struct {
	Status int
	Msg    string
}

func (e *apiError) Error() string { return e.Msg }

func (c *client) alive(ctx context.Context, base string) bool {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, base+"/api/state", nil)
	resp, err := c.http.Do(req)
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func discover() string {
	if v := os.Getenv("SIPHON_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	dir, err := paths.DataDir()
	if err != nil {
		return ""
	}
	ep, err := app.ReadEndpoint(dir)
	if err != nil {
		return ""
	}
	return ep.URL
}

// ensure находит запущенный Siphon, а если его нет — запускает и ждёт.
func (c *client) ensure(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.base != "" {
		return c.base, nil
	}
	if c.opts.URL != "" {
		base := strings.TrimRight(c.opts.URL, "/")
		if !c.alive(ctx, base) {
			return "", fmt.Errorf("Siphon не отвечает на %s", base)
		}
		c.base = base
		return base, nil
	}
	if base := discover(); base != "" && c.alive(ctx, base) {
		c.base = base
		return base, nil
	}
	if c.opts.Launch == nil {
		return "", errors.New("Siphon не запущен: откройте приложение Siphon и повторите")
	}
	if err := c.opts.Launch(); err != nil {
		return "", fmt.Errorf("не удалось запустить Siphon: %w", err)
	}
	deadline := time.Now().Add(60 * time.Second)
	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-time.After(500 * time.Millisecond):
		}
		if base := discover(); base != "" && c.alive(ctx, base) {
			c.base = base
			return base, nil
		}
	}
	return "", errors.New("Siphon запущен, но его API не ответил за минуту")
}

// do выполняет запрос к API. out — куда разобрать JSON-ответ (может быть nil).
// Возвращает HTTP-статус; ответы 4xx/5xx превращаются в ошибку с текстом API.
func (c *client) do(ctx context.Context, method, path string, body, out any) (int, error) {
	var raw []byte
	if body != nil {
		var err error
		if raw, err = json.Marshal(body); err != nil {
			return 0, err
		}
	}
	resp, err := c.send(ctx, method, path, raw)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	raw, err = io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, err
	}
	if resp.StatusCode >= 400 {
		var e struct {
			Error string `json:"error"`
		}
		if json.Unmarshal(raw, &e) != nil || e.Error == "" {
			e.Error = strings.TrimSpace(string(raw))
		}
		return resp.StatusCode, &apiError{resp.StatusCode, e.Error}
	}
	if out != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, out); err != nil {
			return resp.StatusCode, fmt.Errorf("неожиданный ответ API: %w", err)
		}
	}
	return resp.StatusCode, nil
}

// send отправляет запрос; если Siphon перезапустился на другом порту, один раз
// находит его заново и повторяет.
func (c *client) send(ctx context.Context, method, path string, body []byte) (*http.Response, error) {
	for attempt := 0; ; attempt++ {
		base, err := c.ensure(ctx)
		if err != nil {
			return nil, err
		}
		req, err := http.NewRequestWithContext(ctx, method, base+path, bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		if body != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		resp, err := c.http.Do(req)
		if err == nil || attempt > 0 || ctx.Err() != nil {
			return resp, err
		}
		c.mu.Lock()
		c.base = ""
		c.mu.Unlock()
	}
}

// download сохраняет ответ API в файл и возвращает число записей (X-Siphon-Count) и байт.
func (c *client) download(ctx context.Context, path string, body any, dest string) (count string, size int64, err error) {
	raw, _ := json.Marshal(body)
	resp, err := c.send(ctx, http.MethodPost, path, raw)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		msg, _ := io.ReadAll(resp.Body)
		return "", 0, fmt.Errorf("экспорт: HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
	}
	f, err := os.Create(dest)
	if err != nil {
		return "", 0, err
	}
	size, err = io.Copy(f, resp.Body)
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	return resp.Header.Get("X-Siphon-Count"), size, err
}

// LaunchSelf запускает этот же исполняемый файл как обычный Siphon (с
// интерфейсом), отвязанным от MCP-клиента. На macOS приложение открывается
// через LaunchServices, чтобы окно и Dock вели себя как обычно.
func LaunchSelf(args ...string) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	if runtime.GOOS == "darwin" {
		if i := strings.Index(exe, ".app/Contents/MacOS/"); i >= 0 {
			// open не передаёт приложению окружение, а каталог данных должен совпасть:
			// по нему MCP-сервер найдёт endpoint.json.
			open := []string{exe[:i+len(".app")]}
			if dir := os.Getenv("SIPHON_DATA_DIR"); dir != "" {
				open = append([]string{"--env", "SIPHON_DATA_DIR=" + dir}, open...)
			}
			return exec.Command("open", open...).Run()
		}
	}
	cmd := exec.Command(exe, args...)
	sysproc.Detach(cmd)
	if err := cmd.Start(); err != nil {
		return err
	}
	return cmd.Process.Release()
}
