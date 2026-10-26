package frida

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"sync"

	"github.com/coder/websocket"
	"github.com/godbus/dbus/v5"
)

// DialFunc открывает «сырое» соединение с frida-server — напрямую по TCP
// или через ADB-туннель.
type DialFunc func(ctx context.Context) (net.Conn, error)

type Client struct {
	w      *wire
	ver    string
	cancel context.CancelFunc
	ws     *websocket.Conn

	smu      sync.Mutex
	sessions map[string]*Session
}

var supportedVersions = []string{"17", "16"}

func Connect(ctx context.Context, dial DialFunc) (*Client, error) {
	httpc := &http.Client{Transport: &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) { return dial(ctx) },
	}}
	ws, _, err := websocket.Dial(ctx, "ws://frida/ws", &websocket.DialOptions{HTTPClient: httpc})
	if err != nil {
		return nil, fmt.Errorf("frida: WebSocket-подключение не удалось: %w", err)
	}
	ws.SetReadLimit(256 << 20)

	netCtx, cancel := context.WithCancel(context.Background())
	c := &Client{
		w:        newWire(websocket.NetConn(netCtx, ws, websocket.MessageBinary)),
		cancel:   cancel,
		ws:       ws,
		sessions: map[string]*Session{},
	}
	c.w.setSignalHandler(c.onSignal)
	if err := c.detectVersion(ctx); err != nil {
		c.Close()
		return nil, err
	}
	return c, nil
}

func (c *Client) Close() {
	c.w.close(nil)
	_ = c.ws.CloseNow()
	c.cancel()
}

// Done закрывается, когда соединение с frida-server потеряно.
func (c *Client) Done() <-chan struct{} { return c.w.done }

func (c *Client) Err() error {
	select {
	case <-c.w.done:
		return c.w.err
	default:
		return nil
	}
}

func (c *Client) hostIface() string { return "re.frida.HostSession" + c.ver }

func (c *Client) hostCall(ctx context.Context, member string, args ...any) ([]any, error) {
	return c.w.call(ctx, c.hostIface(), "/re/frida/HostSession", c.hostIface(), member, args...)
}

func (c *Client) detectVersion(ctx context.Context) error {
	var last error
	for _, v := range supportedVersions {
		c.ver = v
		_, err := c.hostCall(ctx, "QuerySystemParameters")
		if err == nil {
			return nil
		}
		last = err
		var re *RemoteError
		if !errors.As(err, &re) {
			return err
		}
	}
	return fmt.Errorf("frida: неподдерживаемая версия frida-server: %w", last)
}

// Introspect возвращает XML-описание объекта (нужно для отладки протокола).
func (c *Client) Introspect(ctx context.Context, path string) (string, error) {
	body, err := c.w.call(ctx, c.hostIface(), path, "org.freedesktop.DBus.Introspectable", "Introspect")
	if err != nil {
		return "", err
	}
	if len(body) == 0 {
		return "", errors.New("пустой ответ")
	}
	s, _ := body[0].(string)
	return s, nil
}

func (c *Client) SystemParameters(ctx context.Context) (map[string]any, error) {
	body, err := c.hostCall(ctx, "QuerySystemParameters")
	if err != nil {
		return nil, err
	}
	if len(body) == 0 {
		return nil, errors.New("frida: пустой ответ")
	}
	return unwrapDict(body[0]), nil
}

type App struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	PID  uint32 `json:"pid"` // 0 — не запущено
}

func (c *Client) EnumerateApplications(ctx context.Context) ([]App, error) {
	body, err := c.hostCall(ctx, "EnumerateApplications", map[string]dbus.Variant{})
	if err != nil {
		return nil, err
	}
	rows := rowsOf(first(body))
	apps := make([]App, 0, len(rows))
	for _, r := range rows {
		if len(r) < 3 {
			continue
		}
		apps = append(apps, App{ID: asString(r[0]), Name: asString(r[1]), PID: asUint32(r[2])})
	}
	return apps, nil
}

type Process struct {
	PID  uint32 `json:"pid"`
	Name string `json:"name"`
}

func (c *Client) EnumerateProcesses(ctx context.Context) ([]Process, error) {
	body, err := c.hostCall(ctx, "EnumerateProcesses", map[string]dbus.Variant{})
	if err != nil {
		return nil, err
	}
	rows := rowsOf(first(body))
	out := make([]Process, 0, len(rows))
	for _, r := range rows {
		if len(r) < 2 {
			continue
		}
		out = append(out, Process{PID: asUint32(r[0]), Name: asString(r[1])})
	}
	return out, nil
}

// Структура HostSpawnOptions из frida-core: (basbasbassia{sv}).
type spawnOptions struct {
	HasArgv bool
	Argv    []string
	HasEnvp bool
	Envp    []string
	HasEnv  bool
	Env     []string
	Cwd     string
	Stdio   int32
	Aux     map[string]dbus.Variant
}

// Spawn запускает программу (на Android — пакет) приостановленной.
func (c *Client) Spawn(ctx context.Context, program string) (uint32, error) {
	body, err := c.hostCall(ctx, "Spawn", program, spawnOptions{
		Argv: []string{}, Envp: []string{}, Env: []string{}, Aux: map[string]dbus.Variant{},
	})
	if err != nil {
		return 0, err
	}
	return asUint32(first(body)), nil
}

func (c *Client) Resume(ctx context.Context, pid uint32) error {
	_, err := c.hostCall(ctx, "Resume", pid)
	return err
}

func (c *Client) Kill(ctx context.Context, pid uint32) error {
	_, err := c.hostCall(ctx, "Kill", pid)
	return err
}

// Message — сообщение, отправленное скриптом (send(), console.log, ошибка).
type Message struct {
	Type        string          `json:"type"` // send | error | log
	Payload     json.RawMessage `json:"payload"`
	Level       string          `json:"level"`
	Description string          `json:"description"`
	Stack       string          `json:"stack"`
	FileName    string          `json:"fileName"`
	LineNumber  int             `json:"lineNumber"`
}

// LogText — удобный вывод для log-сообщений.
func (m Message) LogText() string {
	var s string
	if err := json.Unmarshal(m.Payload, &s); err == nil {
		return s
	}
	return string(m.Payload)
}

type Session struct {
	c        *Client
	PID      uint32
	id       string
	sinkPath string

	mu        sync.Mutex
	onMessage func(Message)
	backlog   []Message
	onDetach  func(reason int)
	detached  bool
	detachWhy int
}

type scriptID struct{ ID uint32 }

type agentMessage struct {
	Kind    int32
	Script  scriptID
	Text    string
	HasData bool
	Data    []byte
}

const agentMessageKindScript = 1

func (c *Client) Attach(ctx context.Context, pid uint32) (*Session, error) {
	body, err := c.hostCall(ctx, "Attach", pid, map[string]dbus.Variant{})
	if err != nil {
		return nil, err
	}
	idRow := rowOf(first(body))
	if len(idRow) == 0 {
		return nil, errors.New("frida: не получен идентификатор сессии")
	}
	s := &Session{c: c, PID: pid, id: asString(idRow[0])}
	s.sinkPath = "/re/frida/AgentMessageSink/" + s.id

	c.smu.Lock()
	c.sessions[s.id] = s
	c.smu.Unlock()
	c.w.handle(s.sinkPath, "PostMessages", s.postMessages)
	return s, nil
}

// OnDetach вызывается, когда агент отсоединился (приложение закрыто или упало).
func (s *Session) OnDetach(fn func(reason int)) {
	s.mu.Lock()
	s.onDetach = fn
	already, why := s.detached, s.detachWhy
	s.mu.Unlock()
	if already {
		fn(why)
	}
}

func (c *Client) onSignal(_, _, member string, body []any) {
	if member != "AgentSessionDetached" || len(body) < 2 {
		return
	}
	row := rowOf(body[0])
	if len(row) == 0 {
		return
	}
	c.smu.Lock()
	s := c.sessions[asString(row[0])]
	c.smu.Unlock()
	if s == nil {
		return
	}
	s.mu.Lock()
	s.detached, s.detachWhy = true, asInt(body[1])
	fn, why := s.onDetach, s.detachWhy
	s.mu.Unlock()
	if fn != nil {
		fn(why)
	}
}

func (s *Session) iface() string { return "re.frida.AgentSession" + s.c.ver }
func (s *Session) path() string  { return "/re/frida/AgentSession/" + s.id }

func (s *Session) call(ctx context.Context, member string, args ...any) ([]any, error) {
	return s.c.w.call(ctx, s.iface(), s.path(), s.iface(), member, args...)
}

// OnMessage задаёт обработчик сообщений скрипта; накопленные до этого — отдаются сразу.
func (s *Session) OnMessage(fn func(Message)) {
	s.mu.Lock()
	s.onMessage = fn
	backlog := s.backlog
	s.backlog = nil
	s.mu.Unlock()
	for _, m := range backlog {
		fn(m)
	}
}

func (s *Session) postMessages(body []any) ([]any, error) {
	for _, row := range rowsOf(first(body)) {
		if len(row) < 5 {
			continue
		}
		if asInt(row[0]) != agentMessageKindScript {
			continue
		}
		var m Message
		if err := json.Unmarshal([]byte(asString(row[2])), &m); err != nil {
			continue
		}
		s.mu.Lock()
		fn := s.onMessage
		if fn == nil {
			if len(s.backlog) < 1000 {
				s.backlog = append(s.backlog, m)
			}
			s.mu.Unlock()
			continue
		}
		s.mu.Unlock()
		fn(m)
	}
	return nil, nil
}

type Script struct {
	s  *Session
	id scriptID
}

func (s *Session) CreateScript(ctx context.Context, source string) (*Script, error) {
	body, err := s.call(ctx, "CreateScript", source, map[string]dbus.Variant{})
	if err != nil {
		return nil, err
	}
	row := rowOf(first(body))
	if len(row) == 0 {
		return nil, errors.New("frida: не получен идентификатор скрипта")
	}
	return &Script{s: s, id: scriptID{ID: asUint32(row[0])}}, nil
}

func (sc *Script) Load(ctx context.Context) error {
	_, err := sc.s.call(ctx, "LoadScript", sc.id)
	return err
}

// Post отправляет JSON-сообщение внутрь скрипта (recv() на стороне агента).
func (sc *Script) Post(ctx context.Context, v any) error {
	text, err := json.Marshal(v)
	if err != nil {
		return err
	}
	_, err = sc.s.call(ctx, "PostMessages", []agentMessage{{
		Kind: agentMessageKindScript, Script: sc.id, Text: string(text), Data: []byte{},
	}}, uint32(0))
	return err
}

func (s *Session) Resume(ctx context.Context) error { return s.c.Resume(ctx, s.PID) }
func (s *Session) Kill(ctx context.Context) error   { return s.c.Kill(ctx, s.PID) }

func (s *Session) Close(ctx context.Context) error {
	s.c.w.unhandle(s.sinkPath, "PostMessages")
	s.c.smu.Lock()
	delete(s.c.sessions, s.id)
	s.c.smu.Unlock()
	_, err := s.call(ctx, "Close")
	return err
}
