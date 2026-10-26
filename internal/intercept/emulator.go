package intercept

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"siphon/internal/adb"
)

// EmulatorView — AVD и его текущее состояние.
type EmulatorView struct {
	adb.AVD
	// State: stopped | starting (процесс запущен, adb устройства ещё не видит) |
	// booting (Android загружается) | running (загрузка завершена).
	State  string `json:"state"`
	Serial string `json:"serial,omitempty"`
	Error  string `json:"error,omitempty"`
}

type emulatorLaunch struct {
	serial  string
	logPath string
	mu      sync.Mutex
	exited  bool
	err     string
}

func (l *emulatorLaunch) status() (bool, string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.exited, l.err
}

func tailFile(path string, n int) string {
	raw, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	lines := strings.Split(strings.TrimSpace(string(raw)), "\n")
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	return strings.Join(lines, "\n")
}

// emulatorState опрашивает запущенный эмулятор: имя AVD и завершена ли загрузка.
func (m *Manager) emulatorState(ctx context.Context, serial string) (name string, booted bool) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	out, _, err := m.adb().Shell(ctx, serial, "getprop ro.boot.qemu.avd_name; getprop ro.kernel.qemu.avd_name; getprop sys.boot_completed")
	if err != nil {
		return "", false
	}
	lines := strings.Split(strings.ReplaceAll(out, "\r", ""), "\n")
	for len(lines) < 3 {
		lines = append(lines, "")
	}
	name = strings.TrimSpace(lines[0])
	if name == "" {
		name = strings.TrimSpace(lines[1])
	}
	return name, strings.TrimSpace(lines[2]) == "1"
}

// Emulators возвращает все AVD с их состоянием.
func (m *Manager) Emulators(ctx context.Context) ([]EmulatorView, error) {
	avds, err := adb.ListAVDs()
	if err != nil {
		return nil, err
	}
	m.mu.Lock()
	devs := append([]adb.Device(nil), m.devices...)
	launches := make(map[string]*emulatorLaunch, len(m.launches))
	for k, v := range m.launches {
		launches[k] = v
	}
	m.mu.Unlock()

	type running struct {
		serial, state string
	}
	byName := map[string]running{}
	bySerial := map[string]bool{}
	for _, d := range devs {
		if !d.IsEmulator() {
			continue
		}
		bySerial[d.Serial] = true
		if d.State != "device" {
			continue
		}
		name, booted := m.emulatorState(ctx, d.Serial)
		if name == "" {
			continue
		}
		st := "booting"
		if booted {
			st = "running"
		}
		byName[name] = running{d.Serial, st}
	}

	out := make([]EmulatorView, 0, len(avds))
	for _, a := range avds {
		v := EmulatorView{AVD: a, State: "stopped"}
		if r, ok := byName[a.Name]; ok {
			v.State, v.Serial = r.state, r.serial
		} else if l := launches[a.Name]; l != nil {
			exited, errText := l.status()
			switch {
			case !exited && bySerial[l.serial]:
				v.State, v.Serial = "booting", l.serial
			case !exited:
				v.State, v.Serial = "starting", l.serial
			case errText != "":
				v.Error = errText
			}
		}
		out = append(out, v)
	}
	return out, nil
}

func (m *Manager) emulator(ctx context.Context, name string) (EmulatorView, error) {
	list, err := m.Emulators(ctx)
	if err != nil {
		return EmulatorView{}, err
	}
	for _, v := range list {
		if v.Name == name {
			return v, nil
		}
	}
	return EmulatorView{}, fmt.Errorf("AVD %q не найден", name)
}

// StartEmulator запускает AVD, если он ещё не запущен, и сразу возвращается.
// Дождаться загрузки — WaitEmulator.
func (m *Manager) StartEmulator(ctx context.Context, name string, opts adb.EmulatorOptions) (EmulatorView, error) {
	v, err := m.emulator(ctx, name)
	if err != nil || v.State != "stopped" {
		return v, err
	}
	if !m.ADBStatus().Running {
		return v, errors.New("adb не запущен: без него Siphon не увидит эмулятор. Установите platform-tools или скачайте их на странице Android")
	}
	bin, err := adb.LocateEmulator()
	if err != nil {
		return v, err
	}
	m.mu.Lock()
	taken := map[string]bool{}
	for _, d := range m.devices {
		taken[d.Serial] = true
	}
	for _, l := range m.launches {
		if exited, _ := l.status(); !exited {
			taken[l.serial] = true
		}
	}
	m.mu.Unlock()
	port, err := adb.FreeEmulatorPort(taken)
	if err != nil {
		return v, err
	}
	l := &emulatorLaunch{serial: fmt.Sprintf("emulator-%d", port), logPath: filepath.Join(m.dataDir, "logs", "emulator-"+name+".log")}
	cmd, err := adb.StartEmulator(bin, name, port, opts, l.logPath)
	if err != nil {
		return v, err
	}
	m.mu.Lock()
	if m.launches == nil {
		m.launches = map[string]*emulatorLaunch{}
	}
	m.launches[name] = l
	m.mu.Unlock()
	go func() {
		err := cmd.Wait()
		l.mu.Lock()
		l.exited = true
		if err != nil {
			l.err = "эмулятор завершился: " + err.Error()
			if tail := tailFile(l.logPath, 8); tail != "" {
				l.err += "\n" + tail
			}
		}
		l.mu.Unlock()
		m.publish(Event{Type: "emulators"})
	}()
	m.publish(Event{Type: "emulators"})
	v.State, v.Serial = "starting", l.serial
	return v, nil
}

// WaitEmulator ждёт, пока Android на эмуляторе полностью загрузится
// (sys.boot_completed=1), процесс эмулятора завершится или выйдет время.
func (m *Manager) WaitEmulator(ctx context.Context, name string) (EmulatorView, error) {
	tick := time.NewTicker(2 * time.Second)
	defer tick.Stop()
	for {
		v, err := m.emulator(ctx, name)
		if err != nil {
			return v, err
		}
		switch {
		case v.State == "running":
			m.publish(Event{Type: "emulators"})
			return v, nil
		case v.State == "stopped" && v.Error != "":
			return v, errors.New(v.Error)
		case v.State == "stopped":
			return v, errors.New("эмулятор не запущен")
		}
		select {
		case <-ctx.Done():
			return v, nil // не ошибка: вызывающий видит текущее состояние
		case <-tick.C:
		}
	}
}
