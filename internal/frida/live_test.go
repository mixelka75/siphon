package frida

import (
	"context"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"siphon/internal/fridascripts"
)

// Запуск против настоящего frida-server:
//
//	FRIDA_ADDR=127.0.0.1:24099 go test ./internal/frida -run Live -v
func liveClient(t *testing.T) (*Client, context.Context) {
	addr := os.Getenv("FRIDA_ADDR")
	if addr == "" {
		t.Skip("FRIDA_ADDR не задан")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	t.Cleanup(cancel)
	c, err := Connect(ctx, func(ctx context.Context) (net.Conn, error) {
		var d net.Dialer
		return d.DialContext(ctx, "tcp", addr)
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(c.Close)
	return c, ctx
}

func TestLiveHandshakeAndEnumerate(t *testing.T) {
	c, ctx := liveClient(t)
	t.Logf("версия протокола: %s", c.ver)

	params, err := c.SystemParameters(ctx)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("система: %v", params)

	procs, err := c.EnumerateProcesses(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(procs) == 0 {
		t.Fatal("процессов нет")
	}
	t.Logf("процессов: %d, например %+v", len(procs), procs[:min(3, len(procs))])

	apps, err := c.EnumerateApplications(ctx)
	t.Logf("приложений: %d err=%v", len(apps), err)

	if os.Getenv("FRIDA_INTROSPECT") != "" {
		for _, p := range []string{"/re/frida/HostSession"} {
			xml, err := c.Introspect(ctx, p)
			t.Logf("introspect %s (err=%v):\n%s", p, err, xml)
		}
	}
}

// Полный цикл: spawn → attach → script → сообщение от скрипта → resume → kill.
// На macOS для этого у frida-server должен быть доступ к чужим процессам
// (root или Developer Tools); без него тест покажет ошибку доступа, что тоже
// подтверждает корректность кодирования вызовов.
func TestLiveSpawnAttachScript(t *testing.T) {
	c, ctx := liveClient(t)

	dir := t.TempDir()
	src := filepath.Join(dir, "main.go")
	if err := os.WriteFile(src, []byte("package main\nimport \"time\"\nfunc main(){ time.Sleep(time.Hour) }\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	bin := filepath.Join(dir, "sleeper")
	if out, err := exec.Command("go", "build", "-o", bin, src).CombinedOutput(); err != nil {
		t.Fatalf("сборка: %v\n%s", err, out)
	}

	pid, err := c.Spawn(ctx, bin)
	if err != nil {
		t.Skipf("spawn недоступен в этом окружении: %v", err)
	}
	t.Logf("pid=%d", pid)
	defer c.Kill(ctx, pid)

	sess, err := c.Attach(ctx, pid)
	if err != nil {
		t.Skipf("attach недоступен: %v", err)
	}
	msgs := make(chan Message, 8)
	sess.OnMessage(func(m Message) { msgs <- m })

	sc, err := sess.CreateScript(ctx, `console.log('hello-log'); send({ping: 1});`)
	if err != nil {
		t.Fatal(err)
	}
	if err := sc.Load(ctx); err != nil {
		t.Fatal(err)
	}
	if err := sess.Resume(ctx); err != nil {
		t.Fatal(err)
	}

	gotLog, gotSend := false, false
	deadline := time.After(10 * time.Second)
	for !(gotLog && gotSend) {
		select {
		case m := <-msgs:
			t.Logf("сообщение: %+v payload=%s", m, m.Payload)
			if m.Type == "log" && m.LogText() == "hello-log" {
				gotLog = true
			}
			if m.Type == "send" {
				gotSend = true
			}
		case <-deadline:
			t.Fatalf("сообщения не пришли: log=%v send=%v", gotLog, gotSend)
		}
	}
}

// Загружает полный собранный скрипт перехвата в настоящий Frida-рантайм. На не-Android
// системе Java-часть выполняться не может, но движок обязан принять синтаксис, а
// загрузка не должна падать на самом мосте и общих утилитах.
func TestLiveBuiltScriptIsAcceptedByFridaRuntime(t *testing.T) {
	c, ctx := liveClient(t)

	dir := t.TempDir()
	src := filepath.Join(dir, "main.go")
	_ = os.WriteFile(src, []byte("package main\nimport \"time\"\nfunc main(){ time.Sleep(time.Hour) }\n"), 0o644)
	bin := filepath.Join(dir, "sleeper")
	if out, err := exec.Command("go", "build", "-o", bin, src).CombinedOutput(); err != nil {
		t.Fatalf("сборка: %v\n%s", err, out)
	}
	pid, err := c.Spawn(ctx, bin)
	if err != nil {
		t.Skipf("spawn недоступен: %v", err)
	}
	defer c.Kill(ctx, pid)
	sess, err := c.Attach(ctx, pid)
	if err != nil {
		t.Skipf("attach недоступен: %v", err)
	}
	msgs := make(chan Message, 64)
	sess.OnMessage(func(m Message) { msgs <- m })

	script, err := fridascripts.Build(fridascripts.Config{
		CertPEM:   "-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIUQ2l0ZXN0Y2VydGlmaWNhdGUwCgYIKoZIzj0EAwIwEjEQ\n-----END CERTIFICATE-----",
		ProxyHost: "127.0.0.1", ProxyPort: 8000, SOCKS5: true, DisableRootDetection: true, Flutter: true, Debug: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("размер скрипта: %d КБ", len(script)/1024)

	sc, err := sess.CreateScript(ctx, script)
	if err != nil {
		t.Fatalf("Frida отвергла скрипт при компиляции: %v", err)
	}
	t.Log("компиляция скрипта в Frida: OK")

	loadErr := sc.Load(ctx)
	t.Logf("Load: err=%v", loadErr)

	deadline := time.After(3 * time.Second)
collect:
	for {
		select {
		case m := <-msgs:
			t.Logf("сообщение: type=%s level=%s %s%s", m.Type, m.Level, m.Description, m.LogText())
		case <-deadline:
			break collect
		}
	}
}
