package intercept

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"siphon/internal/frida"
)

// Do not restart Android for arbitrary Frida errors (missing packages, permissions,
// timeouts). Only these failures can indicate a stale Android spawn agent.
func staleSpawnError(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(err.Error())
	return strings.Contains(s, "setargv0") || strings.Contains(s, "deadsystemexception") || strings.Contains(s, "deadsystemruntimeexception")
}

func frameworkReady(out, oldPID string) bool {
	lines := strings.Split(strings.TrimSpace(out), "\n")
	if len(lines) < 3 {
		return false
	}
	pid := strings.TrimSpace(lines[0])
	return pid != "" && pid != oldPID && strings.TrimSpace(lines[1]) == "1" && strings.HasPrefix(strings.TrimSpace(lines[2]), "package:")
}

// recoverFramework is called while the caller owns the device's busy flag.
// A framework restart invalidates the Frida server's references to system_server.
func (m *Manager) recoverFramework(ctx context.Context, serial string) error {
	ctx, cancel := context.WithTimeout(ctx, 100*time.Second)
	defer cancel()
	root, err := m.rootFor(ctx, serial)
	if err != nil {
		return err
	}
	client := m.adb()
	probe, cancelProbe := context.WithTimeout(ctx, 5*time.Second)
	oldPID, code, err := client.Shell(probe, serial, "pidof zygote64 || pidof zygote")
	cancelProbe()
	oldPID = strings.TrimSpace(oldPID)
	if err != nil || code != 0 || oldPID == "" {
		return fmt.Errorf("не удалось определить zygote перед восстановлением: %s (код %d): %v", oldPID, code, err)
	}
	m.progress(serial, "Останавливаю Frida перед перезапуском Android…")
	if err := m.stopFrida(ctx, serial, root); err != nil {
		return err
	}
	m.progress(serial, "Перезапускаю Android framework; приложения на устройстве закроются…")
	out, code, err := client.Shell(ctx, serial, root.Wrap("setprop ctl.restart zygote"))
	if err != nil || code != 0 {
		return fmt.Errorf("перезапуск Android не удался (код %d): %s: %v", code, out, err)
	}

	m.progress(serial, "Жду новый zygote и готовность менеджера пакетов…")
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	stable := 0
	for stable < 2 {
		select {
		case <-ctx.Done():
			return fmt.Errorf("Android не восстановился: %w", ctx.Err())
		case <-ticker.C:
		}
		probe, cancelProbe := context.WithTimeout(ctx, 4*time.Second)
		out, code, err := client.Shell(probe, serial, "pidof zygote64 || pidof zygote; getprop sys.boot_completed; pm path android")
		cancelProbe()
		if err == nil && code == 0 && frameworkReady(out, oldPID) {
			stable++
		} else {
			stable = 0
		}
	}
	m.progress(serial, "Android готов; запускаю Frida заново…")
	return m.prepare(ctx, serial)
}

func (m *Manager) otherActiveSession(serial, except string) bool {
	for _, s := range m.Sessions() {
		if s.Serial == serial && s.ID != except && (s.State == "starting" || s.State == "running") {
			return true
		}
	}
	return false
}

// RestartFrameworkAsync is an explicit user action; unlike automatic recovery it
// can also be used on physical rooted devices. Progress survives a page reload.
func (m *Manager) RestartFrameworkAsync(serial string) error {
	if !m.setBusy(serial, true) {
		return ErrBusy
	}
	m.setPrepareError(serial, "")
	go func() {
		var err error
		for _, s := range m.Sessions() {
			if s.Serial == serial && (s.State == "starting" || s.State == "running") {
				if stopErr := m.StopSession(s.ID); stopErr != nil {
					err = stopErr
					break
				}
			}
		}
		if err == nil {
			err = m.recoverFramework(m.rootContext(), serial)
		}
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

var errManualRecovery = errors.New("Frida не смогла запустить приложение. Запустите его вручную и выберите «К запущенному», либо нажмите «Восстановить Android» в карточке устройства")

// After a framework restart, PackageManager can resolve the launcher before
// Frida's Android helper is ready. Retry only that transient error, and only
// when Android confirms that the target has a launcher activity.
func (m *Manager) spawnReady(ctx context.Context, serial, appID string, client *frida.Client) (uint32, error) {
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	for {
		pid, err := client.Spawn(ctx, appID)
		if err == nil || !strings.Contains(err.Error(), "Unable to find a front-door activity") {
			return pid, err
		}
		q := "'" + strings.ReplaceAll(appID, "'", `'\''`) + "'"
		out, code, probeErr := m.adb().Shell(ctx, serial, "cmd package resolve-activity --brief "+q)
		if probeErr != nil || code != 0 || !strings.Contains(out, appID+"/") {
			return 0, err
		}
		select {
		case <-ctx.Done():
			return 0, fmt.Errorf("Android не подготовил запуск приложения: %w", ctx.Err())
		case <-time.After(time.Second):
		}
	}
}
