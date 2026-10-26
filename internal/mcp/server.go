// Package mcp — MCP-сервер (Model Context Protocol) поверх stdio: через него
// ИИ-агенты (Claude Code, Cursor, Codex…) управляют запущенным Siphon. Сам
// сервер — тонкий клиент HTTP API; если Siphon не запущен, он его запускает.
package mcp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"slices"
	"sync"
)

// Поддерживаемые версии протокола, новые — первыми. Нам нужны только tools,
// а они во всех этих версиях устроены одинаково.
var protocolVersions = []string{"2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"}

type Options struct {
	Version string
	// URL — адрес API Siphon. Пусто — взять из endpoint.json в каталоге данных.
	URL string
	// Launch запускает Siphon, если он не запущен (nil — не запускать).
	Launch func() error
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type server struct {
	opts  Options
	tools *toolbox

	outMu sync.Mutex
	out   *bufio.Writer

	mu       sync.Mutex
	inflight map[string]context.CancelFunc
	wg       sync.WaitGroup
}

// Serve обрабатывает сообщения JSON-RPC (по одному в строке), пока не закроется in.
func Serve(ctx context.Context, in io.Reader, out io.Writer, opts Options) error {
	s := &server{opts: opts, tools: newToolbox(opts), out: bufio.NewWriter(out), inflight: map[string]context.CancelFunc{}}
	ctx, cancel := context.WithCancel(ctx)
	defer func() {
		cancel()
		s.wg.Wait()
	}()
	r := bufio.NewReaderSize(in, 1<<20)
	for {
		line, err := r.ReadBytes('\n')
		if line = bytes.TrimSpace(line); len(line) > 0 {
			s.handle(ctx, line)
		}
		if errors.Is(err, io.EOF) {
			return nil
		}
		if err != nil {
			return err
		}
	}
}

func (s *server) send(msg map[string]any) {
	msg["jsonrpc"] = "2.0"
	raw, err := json.Marshal(msg)
	if err != nil {
		raw, _ = json.Marshal(map[string]any{"jsonrpc": "2.0", "id": msg["id"], "error": rpcError{-32603, err.Error()}})
	}
	s.outMu.Lock()
	defer s.outMu.Unlock()
	_, _ = s.out.Write(append(raw, '\n'))
	_ = s.out.Flush()
}

func (s *server) reply(id json.RawMessage, result any) {
	s.send(map[string]any{"id": id, "result": result})
}

func (s *server) fail(id json.RawMessage, code int, msg string) {
	s.send(map[string]any{"id": id, "error": rpcError{code, msg}})
}

func (s *server) handle(ctx context.Context, line []byte) {
	var msg struct {
		ID     json.RawMessage `json:"id"`
		Method string          `json:"method"`
		Params json.RawMessage `json:"params"`
	}
	if err := json.Unmarshal(line, &msg); err != nil {
		s.fail(json.RawMessage("null"), -32700, "parse error: "+err.Error())
		return
	}
	if msg.ID == nil || string(msg.ID) == "null" {
		s.notification(msg.Method, msg.Params)
		return
	}
	if msg.Method == "" {
		return // ответ клиента на наш запрос — мы их не шлём
	}
	switch msg.Method {
	case "initialize":
		var p struct {
			ProtocolVersion string `json:"protocolVersion"`
		}
		_ = json.Unmarshal(msg.Params, &p)
		version := protocolVersions[0]
		if slices.Contains(protocolVersions, p.ProtocolVersion) {
			version = p.ProtocolVersion
		}
		s.reply(msg.ID, map[string]any{
			"protocolVersion": version,
			"capabilities":    map[string]any{"tools": map[string]any{"listChanged": false}},
			"serverInfo":      map[string]any{"name": "siphon", "title": "Siphon", "version": s.opts.Version},
			"instructions":    instructions,
		})
	case "ping":
		s.reply(msg.ID, map[string]any{})
	case "tools/list":
		s.reply(msg.ID, map[string]any{"tools": s.tools.list()})
	case "tools/call":
		var p struct {
			Name      string          `json:"name"`
			Arguments json.RawMessage `json:"arguments"`
		}
		if err := json.Unmarshal(msg.Params, &p); err != nil {
			s.fail(msg.ID, -32602, "invalid params: "+err.Error())
			return
		}
		if !s.tools.has(p.Name) {
			s.fail(msg.ID, -32602, "unknown tool: "+p.Name)
			return
		}
		// Инструменты бывают долгими (ждут пользователя), поэтому выполняем их
		// параллельно: ping и отмена должны проходить.
		cctx, cancel := context.WithCancel(ctx)
		key := string(msg.ID)
		s.mu.Lock()
		s.inflight[key] = cancel
		s.mu.Unlock()
		s.wg.Add(1)
		go func() {
			defer s.wg.Done()
			defer func() {
				s.mu.Lock()
				delete(s.inflight, key)
				s.mu.Unlock()
				cancel()
			}()
			text, err := s.tools.call(cctx, p.Name, p.Arguments)
			if cctx.Err() != nil && ctx.Err() == nil {
				return // отменено клиентом: по протоколу не отвечаем
			}
			if err != nil {
				s.reply(msg.ID, map[string]any{"content": []any{textContent(err.Error())}, "isError": true})
				return
			}
			s.reply(msg.ID, map[string]any{"content": []any{textContent(text)}})
		}()
	default:
		s.fail(msg.ID, -32601, fmt.Sprintf("method not found: %s", msg.Method))
	}
}

func (s *server) notification(method string, params json.RawMessage) {
	if method != "notifications/cancelled" {
		return
	}
	var p struct {
		RequestID json.RawMessage `json:"requestId"`
	}
	if json.Unmarshal(params, &p) != nil {
		return
	}
	s.mu.Lock()
	cancel := s.inflight[string(p.RequestID)]
	s.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

func textContent(text string) map[string]any {
	return map[string]any{"type": "text", "text": text}
}
