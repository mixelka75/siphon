// Package intercept связывает ADB, frida-server и прокси: готовит устройство
// и запускает перехват трафика конкретного Android-приложения.
package intercept

import (
	"context"
	"errors"
	"net"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"siphon/internal/adb"
	"siphon/internal/frida"
	"siphon/internal/proxy"
)

type Event struct {
	Type string `json:"type"` // adb | devices | progress | session | session-log
	Data any    `json:"data"`
}

type ADBStatus struct {
	Found       bool   `json:"found"`
	Path        string `json:"path,omitempty"`
	Running     bool   `json:"running"`
	Downloading bool   `json:"downloading,omitempty"`
	Error       string `json:"error,omitempty"`
}

type DeviceInfo struct {
	Manufacturer   string `json:"manufacturer,omitempty"`
	AndroidVersion string `json:"androidVersion,omitempty"`
	SDK            int    `json:"sdk,omitempty"`
	Arch           string `json:"arch,omitempty"`
	Emulator       bool   `json:"emulator"`
	Debuggable     bool   `json:"debuggable"`
	// Root: "" — ещё не проверяли, иначе способ получения (adbd | su-c | su-0).
	Root string `json:"root,omitempty"`
	// Frida: running | launch-required | setup-required
	Frida        string `json:"frida"`
	FridaVersion string `json:"fridaVersion"`
}

type DeviceView struct {
	adb.Device
	Info *DeviceInfo `json:"info,omitempty"`
	Busy bool        `json:"busy,omitempty"`
	// Ошибка последней подготовки: нужна, чтобы её было видно и после перезагрузки страницы.
	PrepareError string `json:"prepareError,omitempty"`
}

var (
	ErrBusy = errors.New("с этим устройством уже что-то делается")
	// ErrNoRootHint — понятное объяснение для пользователя.
	ErrNoRootHint = errors.New("на устройстве нет root-доступа, а он нужен для frida-server. " +
		"Подойдёт эмулятор Android без Google Play (образ «Google APIs») или телефон с Magisk")
)

type Manager struct {
	engine  *proxy.Engine
	dataDir string

	mu           sync.Mutex
	rootCtx      context.Context
	client       *adb.Client
	adbState     ADBStatus
	devices      []adb.Device
	infos        map[string]*DeviceInfo
	roots        map[string]*adb.Root
	busy         map[string]bool
	prepErr      map[string]string
	fridaStreams map[string]net.Conn
	sessions     map[string]*Session
	order        []string
	nextID       int
	trackCan     context.CancelFunc

	subMu   sync.Mutex
	subs    map[int]chan Event
	nextSub int
}

func New(engine *proxy.Engine, dataDir string) *Manager {
	return &Manager{
		engine:       engine,
		dataDir:      dataDir,
		client:       adb.NewClient(""),
		infos:        map[string]*DeviceInfo{},
		roots:        map[string]*adb.Root{},
		busy:         map[string]bool{},
		prepErr:      map[string]string{},
		fridaStreams: map[string]net.Conn{},
		sessions:     map[string]*Session{},
		subs:         map[int]chan Event{},
		rootCtx:      context.Background(),
	}
}

func (m *Manager) adb() *adb.Client {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.client
}

// Subscribe — поток событий для интерфейса. Медленный подписчик отключается.
func (m *Manager) Subscribe() (<-chan Event, func()) {
	ch := make(chan Event, 1024)
	m.subMu.Lock()
	id := m.nextSub
	m.nextSub++
	m.subs[id] = ch
	m.subMu.Unlock()
	return ch, func() {
		m.subMu.Lock()
		if c, ok := m.subs[id]; ok {
			delete(m.subs, id)
			close(c)
		}
		m.subMu.Unlock()
	}
}

func (m *Manager) publish(ev Event) {
	m.subMu.Lock()
	defer m.subMu.Unlock()
	for id, ch := range m.subs {
		select {
		case ch <- ev:
		default:
			delete(m.subs, id)
			close(ch)
		}
	}
}

func (m *Manager) progress(serial, msg string) {
	m.publish(Event{Type: "progress", Data: map[string]string{"serial": serial, "message": msg}})
}

// Init находит adb, запускает сервер и начинает следить за устройствами.
func (m *Manager) Init(ctx context.Context) {
	m.mu.Lock()
	m.rootCtx = ctx
	m.mu.Unlock()
	go func() {
		bin, err := adb.Locate(m.dataDir)
		if err != nil {
			m.setADB(ADBStatus{Error: "adb не найден"})
			// Возможно, adb-сервер уже запущен без нашего ведома.
			m.startTracking(ctx)
			return
		}
		m.useBinary(ctx, bin)
	}()
}

func (m *Manager) useBinary(ctx context.Context, bin string) {
	c := adb.NewClient(bin)
	m.mu.Lock()
	m.client = c
	m.mu.Unlock()

	st := ADBStatus{Found: true, Path: bin}
	if err := c.StartServer(ctx); err != nil {
		st.Error = err.Error()
	} else {
		st.Running = true
	}
	m.setADB(st)
	m.startTracking(ctx)
}

func (m *Manager) setADB(st ADBStatus) {
	m.mu.Lock()
	m.adbState = st
	m.mu.Unlock()
	m.publish(Event{Type: "adb", Data: st})
}

func (m *Manager) ADBStatus() ADBStatus {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.adbState
}

// DownloadADB скачивает Android platform-tools и подключает их.
func (m *Manager) DownloadADB(ctx context.Context) error {
	st := m.ADBStatus()
	if st.Downloading {
		return ErrBusy
	}
	st.Downloading, st.Error = true, ""
	m.setADB(st)

	bin, err := adb.Download(ctx, m.dataDir, nil)
	if err != nil {
		st.Downloading, st.Error = false, "не удалось скачать platform-tools: "+err.Error()
		m.setADB(st)
		return err
	}
	m.useBinary(m.rootContext(), bin)
	return nil
}

// Context — корневой контекст менеджера (живёт, пока работает приложение).
func (m *Manager) Context() context.Context { return m.rootContext() }

func (m *Manager) rootContext() context.Context {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.rootCtx
}

func (m *Manager) startTracking(ctx context.Context) {
	m.mu.Lock()
	if m.trackCan != nil {
		m.trackCan()
	}
	tctx, cancel := context.WithCancel(ctx)
	m.trackCan = cancel
	m.mu.Unlock()
	go m.trackLoop(tctx)
}

func (m *Manager) trackLoop(ctx context.Context) {
	for ctx.Err() == nil {
		err := m.adb().TrackDevices(ctx, func(devs []adb.Device) {
			m.mu.Lock()
			wasDown := !m.adbState.Running && m.adbState.Found
			if wasDown || m.adbState.Error != "" && m.adbState.Found {
				m.adbState.Running, m.adbState.Error = true, ""
			}
			st := m.adbState
			m.mu.Unlock()
			if wasDown {
				m.publish(Event{Type: "adb", Data: st})
			}
			m.setDevices(devs)
		})
		if ctx.Err() != nil {
			return
		}
		m.setDevices(nil)
		if m.adb().Bin != "" {
			sctx, cancel := context.WithTimeout(ctx, 20*time.Second)
			_ = m.adb().StartServer(sctx)
			cancel()
		}
		_ = err
		select {
		case <-ctx.Done():
			return
		case <-time.After(3 * time.Second):
		}
	}
}

func (m *Manager) setDevices(devs []adb.Device) {
	m.mu.Lock()
	m.devices = devs
	alive := map[string]bool{}
	for _, d := range devs {
		alive[d.Serial] = true
	}
	for serial := range m.infos {
		if !alive[serial] {
			delete(m.infos, serial)
			delete(m.roots, serial)
			delete(m.prepErr, serial)
		}
	}
	for serial, stream := range m.fridaStreams {
		if !alive[serial] {
			_ = stream.Close()
			delete(m.fridaStreams, serial)
		}
	}
	m.mu.Unlock()
	m.publishDevices()
}

func (m *Manager) publishDevices() {
	m.publish(Event{Type: "devices", Data: m.Devices()})
}

func (m *Manager) Devices() []DeviceView {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]DeviceView, 0, len(m.devices))
	for _, d := range m.devices {
		out = append(out, DeviceView{Device: d, Info: m.infos[d.Serial], Busy: m.busy[d.Serial], PrepareError: m.prepErr[d.Serial]})
	}
	return out
}

func (m *Manager) setPrepareError(serial, msg string) {
	m.mu.Lock()
	if msg == "" {
		delete(m.prepErr, serial)
	} else {
		m.prepErr[serial] = msg
	}
	m.mu.Unlock()
}

func (m *Manager) setBusy(serial string, v bool) bool {
	m.mu.Lock()
	if v && m.busy[serial] {
		m.mu.Unlock()
		return false
	}
	if v {
		m.busy[serial] = true
	} else {
		delete(m.busy, serial)
	}
	m.mu.Unlock()
	m.publishDevices()
	return true
}

// Inspect собирает сведения об устройстве и состояние frida-server.
// Root здесь не проверяется: на телефоне с Magisk это вызвало бы диалог.
func (m *Manager) Inspect(ctx context.Context, serial string) (*DeviceInfo, error) {
	props, err := m.adb().Props(ctx, serial)
	if err != nil {
		return nil, err
	}
	abis := strings.Split(props["ro.product.cpu.abilist"], ",")
	if props["ro.product.cpu.abilist"] == "" {
		abis = []string{props["ro.product.cpu.abi"]}
	}
	arch, _ := ArchFromABIs(abis)
	sdk, _ := strconv.Atoi(props["ro.build.version.sdk"])

	info := &DeviceInfo{
		Manufacturer:   props["ro.product.manufacturer"],
		AndroidVersion: props["ro.build.version.release"],
		SDK:            sdk,
		Arch:           arch,
		Emulator:       strings.HasPrefix(serial, "emulator-") || props["ro.kernel.qemu"] == "1",
		Debuggable:     props["ro.debuggable"] == "1",
		FridaVersion:   FridaVersion,
	}
	switch {
	case m.fridaPortOnDevice(ctx, serial) != 0:
		info.Frida = "running"
	case m.fridaInstalled(ctx, serial):
		info.Frida = "launch-required"
	default:
		info.Frida = "setup-required"
	}

	m.mu.Lock()
	if r := m.roots[serial]; r != nil {
		info.Root = r.Method
	}
	m.infos[serial] = info
	m.mu.Unlock()
	m.publishDevices()
	return info, nil
}

func (m *Manager) rootFor(ctx context.Context, serial string) (*adb.Root, error) {
	m.mu.Lock()
	r := m.roots[serial]
	m.mu.Unlock()
	if r != nil {
		return r, nil
	}
	r, err := m.adb().DetectRoot(ctx, serial)
	if errors.Is(err, adb.ErrNoRoot) {
		info, _ := m.Inspect(ctx, serial)
		if info != nil && (info.Debuggable || info.Emulator) {
			if rerr := m.adb().RestartAdbdAsRoot(ctx, serial); rerr == nil {
				r, err = m.adb().DetectRoot(ctx, serial)
			}
		}
	}
	if err != nil {
		if errors.Is(err, adb.ErrNoRoot) {
			return nil, ErrNoRootHint
		}
		return nil, err
	}
	m.mu.Lock()
	m.roots[serial] = r
	m.mu.Unlock()
	return r, nil
}

// Prepare доводит устройство до состояния «frida-server работает».
func (m *Manager) Prepare(ctx context.Context, serial string) error {
	if !m.setBusy(serial, true) {
		return ErrBusy
	}
	defer m.setBusy(serial, false)
	return m.prepare(ctx, serial)
}

func (m *Manager) prepare(ctx context.Context, serial string) error {
	progress := func(s string) { m.progress(serial, s) }

	info, err := m.Inspect(ctx, serial)
	if err != nil {
		return err
	}
	if info.Frida == "running" {
		progress("Frida уже работает")
		return nil
	}

	progress("Проверяю root-доступ (если на телефоне появится запрос — разрешите)…")
	root, err := m.rootFor(ctx, serial)
	if err != nil {
		return err
	}
	if info.Frida == "setup-required" {
		if info.Arch == "" {
			return errors.New("не удалось определить архитектуру устройства")
		}
		if err := m.installFrida(ctx, serial, info.Arch, progress); err != nil {
			return err
		}
	}
	if err := m.launchFrida(ctx, serial, root, progress); err != nil {
		return err
	}
	progress("Готово")
	_, err = m.Inspect(ctx, serial)
	return err
}

// PrepareAsync запускает подготовку в фоне. Ход виден в событиях progress, а
// итог — в событии prepare-done (с полем error при неудаче).
func (m *Manager) PrepareAsync(serial string) error {
	if !m.setBusy(serial, true) {
		return ErrBusy
	}
	m.setPrepareError(serial, "")
	go func() {
		err := m.prepare(m.rootContext(), serial)
		res := map[string]string{"serial": serial}
		if err != nil {
			res["error"] = err.Error()
			m.setPrepareError(serial, err.Error())
		}
		m.setBusy(serial, false)
		m.publish(Event{Type: "prepare-done", Data: res})
	}()
	return nil
}

// StopFrida останавливает frida-server на устройстве.
func (m *Manager) StopFrida(ctx context.Context, serial string) error {
	if !m.setBusy(serial, true) {
		return ErrBusy
	}
	defer m.setBusy(serial, false)
	for _, s := range m.Sessions() {
		if s.Serial == serial && (s.State == "starting" || s.State == "running") {
			if err := m.StopSession(s.ID); err != nil {
				return err
			}
		}
	}
	root, err := m.rootFor(ctx, serial)
	if err != nil {
		return err
	}
	if err := m.stopFrida(ctx, serial, root); err != nil {
		return err
	}
	_, err = m.Inspect(ctx, serial)
	return err
}

var errFridaDown = errors.New("frida-server на устройстве не запущен")

func (m *Manager) connectFrida(ctx context.Context, serial string) (*frida.Client, error) {
	port := m.fridaPortOnDevice(ctx, serial)
	if port == 0 {
		return nil, errFridaDown
	}
	return frida.Connect(ctx, func(ctx context.Context) (net.Conn, error) {
		return m.adb().OpenTCP(ctx, serial, port)
	})
}

// Apps возвращает установленные приложения (запущенные — первыми).
func (m *Manager) Apps(ctx context.Context, serial string) ([]frida.App, error) {
	c, err := m.connectFrida(ctx, serial)
	if err != nil {
		return nil, err
	}
	defer c.Close()
	apps, err := c.EnumerateApplications(ctx)
	if err != nil {
		return nil, err
	}
	sort.Slice(apps, func(i, j int) bool {
		ri, rj := apps[i].PID != 0, apps[j].PID != 0
		if ri != rj {
			return ri
		}
		return strings.ToLower(apps[i].Name) < strings.ToLower(apps[j].Name)
	})
	return apps, nil
}

func (m *Manager) deviceModel(serial string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, d := range m.devices {
		if d.Serial == serial {
			if d.Model != "" {
				return d.Model
			}
			return d.Serial
		}
	}
	return serial
}
