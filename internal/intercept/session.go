package intercept

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"siphon/internal/adb"
	"siphon/internal/frida"
	"siphon/internal/fridascripts"
	"siphon/internal/proxy"
)

type LogLine struct {
	Time  time.Time `json:"time"`
	Level string    `json:"level"` // info | warn | error
	Text  string    `json:"text"`
}

type SessionInfo struct {
	ID        string    `json:"id"`
	Serial    string    `json:"serial"`
	Device    string    `json:"device"`
	AppID     string    `json:"appId"`
	AppName   string    `json:"appName,omitempty"`
	Mode      string    `json:"mode"` // spawn | attach
	SafeMode  bool      `json:"safeMode,omitempty"`
	State     string    `json:"state"` // starting | running | stopped | error
	Error     string    `json:"error,omitempty"`
	ProxyPort int       `json:"proxyPort,omitempty"`
	PID       uint32    `json:"pid,omitempty"`
	Started   time.Time `json:"started"`
	Log       []LogLine `json:"log,omitempty"`
}

type StartRequest struct {
	Serial  string `json:"serial"`
	AppID   string `json:"appId"`
	AppName string `json:"appName"`
	Mode    string `json:"mode"` // spawn (по умолчанию) | attach
	// Значения по умолчанию — включено.
	DisableRootDetection *bool `json:"disableRootDetection"`
	Flutter              *bool `json:"flutter"`
	Debug                bool  `json:"debug"`
	SafeMode             bool  `json:"safeMode"`
}

func (r StartRequest) flag(p *bool) bool { return p == nil || *p }

const maxSessionLog = 500

type Session struct {
	m      *Manager
	req    StartRequest
	cancel context.CancelFunc
	done   chan struct{}

	mu       sync.Mutex
	info     SessionInfo
	log      []LogLine
	listener *proxy.Listener
	client   *frida.Client
}

func (s *Session) snapshot(withLog bool) SessionInfo {
	s.mu.Lock()
	defer s.mu.Unlock()
	info := s.info
	if withLog {
		info.Log = append([]LogLine(nil), s.log...)
	}
	return info
}

func (s *Session) update(fn func(*SessionInfo)) {
	s.mu.Lock()
	if s.info.State == "stopped" || s.info.State == "error" {
		s.mu.Unlock()
		return
	}
	fn(&s.info)
	info := s.info
	s.mu.Unlock()
	s.m.publish(Event{Type: "session", Data: info})
}

func (s *Session) logf(level, format string, a ...any) {
	line := LogLine{Time: time.Now(), Level: level, Text: fmt.Sprintf(format, a...)}
	s.mu.Lock()
	s.log = append(s.log, line)
	if len(s.log) > maxSessionLog {
		s.log = s.log[len(s.log)-maxSessionLog:]
	}
	id := s.info.ID
	s.mu.Unlock()
	s.m.publish(Event{Type: "session-log", Data: map[string]any{"id": id, "line": line}})
}

func (m *Manager) Sessions() []SessionInfo {
	m.mu.Lock()
	ids := append([]string(nil), m.order...)
	list := make([]*Session, 0, len(ids))
	for _, id := range ids {
		if s := m.sessions[id]; s != nil {
			list = append(list, s)
		}
	}
	m.mu.Unlock()
	out := make([]SessionInfo, len(list))
	for i, s := range list {
		out[i] = s.snapshot(true)
	}
	return out
}

// StartIntercept сразу возвращает сессию в состоянии starting; подготовка
// устройства, запуск приложения и загрузка скриптов идут в фоне, а ход дел
// виден в логе сессии.
func (m *Manager) StartIntercept(req StartRequest) (SessionInfo, error) {
	if req.Serial == "" || req.AppID == "" {
		return SessionInfo{}, errors.New("нужны serial устройства и id приложения")
	}
	if req.Mode == "" {
		req.Mode = "spawn"
	}
	if req.Mode != "spawn" && req.Mode != "attach" {
		return SessionInfo{}, errors.New("режим должен быть spawn или attach")
	}
	// Tested with 2GIS 7.30: its bundled OpenSSL accepts CA store injection,
	// while native verify callbacks and Java exception auto-patching crash ART.
	if req.AppID == "ru.dublgis.dgismobile" {
		req.SafeMode = true
		f := false
		req.DisableRootDetection, req.Flutter = &f, &f
	}

	m.mu.Lock()
	if m.busy[req.Serial] {
		m.mu.Unlock()
		return SessionInfo{}, ErrBusy
	}
	// Одно приложение на одном устройстве перехватываем только одной сессией.
	for _, s := range m.sessions {
		st := s.snapshot(false)
		if st.Serial == req.Serial && st.AppID == req.AppID && (st.State == "starting" || st.State == "running") {
			m.mu.Unlock()
			return SessionInfo{}, errors.New("это приложение уже перехватывается")
		}
	}
	m.nextID++
	id := fmt.Sprintf("s%d", m.nextID)
	ctx, cancel := context.WithCancel(m.rootCtx)
	s := &Session{
		m: m, req: req, cancel: cancel, done: make(chan struct{}),
		info: SessionInfo{
			ID: id, Serial: req.Serial, Device: "", AppID: req.AppID, AppName: req.AppName,
			Mode: req.Mode, SafeMode: req.SafeMode, State: "starting", Started: time.Now(),
		},
	}
	m.sessions[id] = s
	m.order = append(m.order, id)
	m.busy[req.Serial] = true
	m.mu.Unlock()

	device := m.deviceModel(req.Serial)
	s.update(func(i *SessionInfo) { i.Device = device })
	m.publishDevices()
	m.publish(Event{Type: "session", Data: s.snapshot(false)})
	go s.run(ctx)
	return s.snapshot(true), nil
}

func (s *Session) fail(err error) {
	if errors.Is(err, context.Canceled) {
		s.stopped("запуск отменён")
		return
	}
	s.finish("error", err.Error())
}

func (s *Session) stopped(reason string) {
	s.finish("stopped", reason)
}

func (s *Session) finish(state, reason string) {
	s.mu.Lock()
	if s.info.State == "stopped" || s.info.State == "error" {
		s.mu.Unlock()
		return
	}
	s.info.State = state
	if state == "error" {
		s.info.Error = reason
	}
	info := s.info
	s.mu.Unlock()
	level := "info"
	if state == "error" {
		level = "error"
	}
	s.logf(level, "%s", reason)
	s.m.publish(Event{Type: "session", Data: info})
	s.cancel()
}

func (s *Session) cleanup() {
	s.cancel()
	s.mu.Lock()
	l, c, port := s.listener, s.client, s.info.ProxyPort
	s.listener, s.client = nil, nil
	s.mu.Unlock()

	if c != nil {
		c.Close()
	}
	if l != nil {
		_ = l.Close()
	}
	if port != 0 {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_ = s.m.adb().ReverseRemove(ctx, s.req.Serial, port)
		cancel()
	}
}

func (s *Session) run(ctx context.Context) {
	m, req := s.m, s.req
	defer close(s.done)
	busy := true
	defer func() {
		if busy {
			m.setBusy(req.Serial, false)
		}
	}()
	defer s.cleanup()

	info, err := m.Inspect(ctx, req.Serial)
	if err != nil {
		s.fail(fmt.Errorf("не удалось опросить устройство: %w", err))
		return
	}
	if info.Frida != "running" {
		s.logf("info", "frida-server не запущен — готовлю устройство")
		unsub := s.relayProgress(req.Serial)
		err := m.prepare(ctx, req.Serial)
		unsub()
		if err != nil {
			s.fail(err)
			return
		}
	}

	l, err := m.engine.Listen("127.0.0.1:0", req.AppID)
	if err != nil {
		s.fail(fmt.Errorf("не удалось открыть порт прокси: %w", err))
		return
	}
	s.mu.Lock()
	s.listener = l
	s.mu.Unlock()
	port := l.Port()
	s.update(func(i *SessionInfo) { i.ProxyPort = port })

	if err := m.adb().Reverse(ctx, req.Serial, port, port); err != nil {
		s.fail(fmt.Errorf("adb reverse не удался: %w", err))
		return
	}
	s.logf("info", "прокси на 127.0.0.1:%d, проброшен на устройство через adb reverse", port)

	client, err := m.connectFrida(ctx, req.Serial)
	if err != nil {
		s.fail(fmt.Errorf("не удалось подключиться к frida-server: %w", err))
		return
	}
	s.mu.Lock()
	s.client = client
	s.mu.Unlock()

	var pid uint32
	if req.Mode == "spawn" {
		s.logf("info", "запускаю %s приостановленным", req.AppID)
		pid, err = m.spawnReady(ctx, req.Serial, req.AppID, client)
		if staleSpawnError(err) && ctx.Err() == nil {
			// Automatic framework recovery is limited to emulators and must not
			// interrupt another app's active interception session.
			if !info.Emulator || m.otherActiveSession(req.Serial, s.snapshot(false).ID) {
				s.fail(fmt.Errorf("%w: %v", errManualRecovery, err))
				return
			}
			s.logf("warn", "Frida потеряла состояние запуска; восстанавливаю Android на эмуляторе и повторю один раз")
			client.Close()
			unsub := s.relayProgress(req.Serial)
			recoveryErr := m.recoverFramework(ctx, req.Serial)
			unsub()
			if recoveryErr != nil {
				s.fail(recoveryErr)
				return
			}
			if err = m.adb().Reverse(ctx, req.Serial, port, port); err != nil {
				s.fail(err)
				return
			}
			client, err = m.connectFrida(ctx, req.Serial)
			if err != nil {
				s.fail(err)
				return
			}
			s.mu.Lock()
			s.client = client
			s.mu.Unlock()
			pid, err = m.spawnReady(ctx, req.Serial, req.AppID, client)
		}
		if err != nil {
			s.fail(fmt.Errorf("не удалось запустить приложение: %w", err))
			return
		}
	} else {
		apps, err := client.EnumerateApplications(ctx)
		if err != nil {
			s.fail(err)
			return
		}
		for _, a := range apps {
			if a.ID == req.AppID {
				pid = a.PID
			}
		}
		if pid == 0 {
			s.fail(errors.New("приложение не запущено — запустите его или выберите режим «перезапустить»"))
			return
		}
	}
	s.update(func(i *SessionInfo) { i.PID = pid })
	resumed := req.Mode != "spawn"
	defer func() {
		// An attach/script error or cancellation must never leave a spawned app suspended.
		if !resumed {
			rctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			_ = client.Resume(rctx, pid)
			cancel()
		}
	}()

	fs, err := client.Attach(ctx, pid)
	if err != nil {
		s.fail(fmt.Errorf("не удалось подключиться к процессу: %w", err))
		return
	}
	fs.OnMessage(s.onScriptMessage)
	fs.OnDetach(func(int) {
		s.stopped("приложение закрылось — перехват остановлен")
	})

	cfg := fridascripts.Config{
		CertPEM: string(m.engine.CA.CertPEM()), ProxyHost: "127.0.0.1", ProxyPort: port,
		SOCKS5: true, Debug: req.Debug,
		DisableRootDetection: req.flag(req.DisableRootDetection),
		Flutter:              req.flag(req.Flutter),
		SafeMode:             req.SafeMode,
	}
	src, err := fridascripts.Build(cfg)
	if err != nil {
		s.fail(err)
		return
	}
	script, err := fs.CreateScript(ctx, src)
	if err != nil {
		s.fail(fmt.Errorf("Frida не приняла скрипт: %w", err))
		return
	}
	if err := script.Load(ctx); err != nil {
		s.fail(fmt.Errorf("не удалось загрузить скрипт: %w", err))
		return
	}
	if req.Mode == "spawn" {
		if err := fs.Resume(ctx); err != nil {
			s.fail(fmt.Errorf("не удалось продолжить запуск приложения: %w", err))
			return
		}
		resumed = true
	}
	if ctx.Err() != nil {
		s.stopped("запуск отменён")
		return
	}
	s.logf("info", "перехват включён")
	s.update(func(i *SessionInfo) { i.State = "running" })
	m.setBusy(req.Serial, false)
	busy = false

	select {
	case <-client.Done():
		s.stopped("соединение с frida потеряно (устройство отключено или frida-server остановлен)")
	case <-ctx.Done():
		s.stopped("перехват остановлен")
	}
}

// relayProgress пересылает прогресс подготовки устройства в лог сессии.
func (s *Session) relayProgress(serial string) func() {
	ch, cancel := s.m.Subscribe()
	stop := make(chan struct{})
	go func() {
		for {
			select {
			case ev, ok := <-ch:
				if !ok {
					return
				}
				if ev.Type != "progress" {
					continue
				}
				if d, ok := ev.Data.(map[string]string); ok && d["serial"] == serial {
					s.logf("info", "%s", d["message"])
				}
			case <-stop:
				return
			}
		}
	}()
	return func() { close(stop); cancel() }
}

func (s *Session) onScriptMessage(m frida.Message) {
	switch m.Type {
	case "log":
		text := strings.TrimSpace(m.LogText())
		if text == "" {
			return
		}
		level := "info"
		switch m.Level {
		case "warning":
			level = "warn"
		case "error":
			level = "error"
		}
		s.logf(level, "%s", text)
	case "error":
		text := m.Description
		if m.FileName != "" {
			text += fmt.Sprintf(" (%s:%d)", m.FileName, m.LineNumber)
		}
		s.logf("error", "ошибка в скрипте: %s", text)
	case "send":
		s.logf("info", "%s", string(m.Payload))
	}
}

func (m *Manager) session(id string) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.sessions[id]
}

// StopSession останавливает перехват (приложение остаётся запущенным, но без хуков).
func (m *Manager) StopSession(id string) error {
	s := m.session(id)
	if s == nil {
		return errors.New("сессия не найдена")
	}
	s.stopped("перехват остановлен пользователем")
	select {
	case <-s.done:
		return nil
	case <-time.After(10 * time.Second):
		return errors.New("сессия ещё завершает работу; повторите остановку")
	}
}

// DismissSession убирает завершённую сессию из списка.
func (m *Manager) DismissSession(id string) error {
	s := m.session(id)
	if s == nil {
		return errors.New("сессия не найдена")
	}
	if st := s.snapshot(false).State; st == "starting" || st == "running" {
		return errors.New("сначала остановите сессию")
	}
	m.mu.Lock()
	delete(m.sessions, id)
	for i, v := range m.order {
		if v == id {
			m.order = append(m.order[:i], m.order[i+1:]...)
			break
		}
	}
	m.mu.Unlock()
	m.publish(Event{Type: "session", Data: SessionInfo{ID: id, State: "removed"}})
	return nil
}

// Shutdown останавливает все сессии.
func (m *Manager) Shutdown() {
	m.mu.Lock()
	list := make([]*Session, 0, len(m.sessions))
	for _, s := range m.sessions {
		list = append(list, s)
	}
	m.mu.Unlock()
	for _, s := range list {
		s.stopped("Siphon закрывается")
	}
	for _, s := range list {
		select {
		case <-s.done:
		case <-time.After(10 * time.Second):
		}
	}
	m.mu.Lock()
	owned := make(map[string]*adb.Root)
	for serial := range m.fridaStreams {
		owned[serial] = m.roots[serial]
	}
	m.mu.Unlock()
	for serial, root := range owned {
		if root != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			_ = m.stopFrida(ctx, serial, root)
			cancel()
		}
	}
}
