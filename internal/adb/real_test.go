package adb

import (
	"context"
	"os"
	"testing"
	"time"
)

// Сетевой тест с настоящим adb: скачивает platform-tools от Google, поднимает
// adb-сервер на отдельном порту и опрашивает его.
//
//	SIPHON_NET_TESTS=1 go test ./internal/adb -run Real -v
func TestRealPlatformToolsAndServer(t *testing.T) {
	if os.Getenv("SIPHON_NET_TESTS") == "" {
		t.Skip("SIPHON_NET_TESTS не задан")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	dir := t.TempDir()
	bin, err := Download(ctx, dir, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("adb: %s", bin)
	if found, err := Locate(dir); err != nil || found == "" {
		t.Fatalf("Locate: %q %v", found, err)
	}

	// Отдельный порт, чтобы не трогать adb-сервер пользователя.
	t.Setenv("ANDROID_ADB_SERVER_PORT", "15037")
	c := NewClient(bin)
	if err := c.StartServer(ctx); err != nil {
		t.Fatal(err)
	}
	defer c.run(context.Background(), 10*time.Second, "kill-server")

	ver, err := c.Version(ctx)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("версия протокола adb-сервера: %s", ver)

	devs, err := c.Devices(ctx)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("устройств: %d", len(devs))

	tctx, tcancel := context.WithTimeout(ctx, 3*time.Second)
	defer tcancel()
	got := make(chan int, 1)
	_ = c.TrackDevices(tctx, func(d []Device) {
		select {
		case got <- len(d):
		default:
		}
		tcancel()
	})
	select {
	case n := <-got:
		t.Logf("track-devices отдал начальный список: %d", n)
	default:
		t.Fatal("track-devices не прислал начальный список")
	}
}

// Проверка на настоящем устройстве или эмуляторе (без root):
//
//	SIPHON_REAL_DEVICE=emulator-5554 SIPHON_ADB=~/Library/Android/sdk/platform-tools/adb \
//	  go test ./internal/adb -run RealDevice -v
//
// Поднимает на устройстве nc-сервер и подключается к нему через сервис adb tcp:PORT —
// тем же способом, которым клиент Frida подключается к frida-server.
func TestRealDeviceTunnelAndShell(t *testing.T) {
	serial := os.Getenv("SIPHON_REAL_DEVICE")
	if serial == "" {
		t.Skip("SIPHON_REAL_DEVICE не задан")
	}
	bin, err := Locate(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	c := NewClient(bin)
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	props, err := c.Props(ctx, serial)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("модель=%q sdk=%s abi=%s build=%s", props["ro.product.model"], props["ro.build.version.sdk"],
		props["ro.product.cpu.abilist"], props["ro.build.type"])
	if props["ro.build.version.sdk"] == "" {
		t.Fatal("getprop не разобран")
	}

	out, code, err := c.Shell(ctx, serial, "echo out; echo err 1>&2; exit 3")
	t.Logf("shell: out=%q code=%d err=%v", out, code, err)
	if err != nil || code != 3 {
		t.Fatalf("код возврата должен быть 3, получен %d (%v)", code, err)
	}

	const port = 24099
	// Сервер на устройстве живёт ровно в этом блокирующем Shell: отдаёт строку
	// первому подключившемуся и завершается. Фоновых процессов не оставляем.
	srvDone := make(chan error, 1)
	go func() {
		_, _, err := c.Shell(ctx, serial, "echo hello-from-device | nc -l -p 24099")
		srvDone <- err
	}()
	time.Sleep(900 * time.Millisecond)

	connCtx, cancelConn := context.WithCancel(ctx)
	conn, err := c.OpenTCP(connCtx, serial, port)
	if err != nil {
		t.Fatalf("OpenTCP: %v", err)
	}
	defer conn.Close()
	cancelConn() // туннель обязан пережить отмену контекста, в котором открыт

	buf := make([]byte, 64)
	_ = conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	n, _ := conn.Read(buf)
	if got := string(buf[:n]); got != "hello-from-device\n" {
		t.Fatalf("из туннеля прочитано %q", got)
	}
	select {
	case err := <-srvDone:
		if err != nil {
			t.Fatalf("серверный Shell завершился с ошибкой: %v", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("nc на устройстве не завершился после отдачи данных")
	}

	// Порт, на котором никто не слушает, — быстрая понятная ошибка, а не зависание.
	ctx2, cancel2 := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel2()
	start := time.Now()
	if conn2, err := c.OpenTCP(ctx2, serial, 24098); err == nil {
		conn2.Close()
		t.Fatal("ожидался отказ для закрытого порта")
	} else {
		t.Logf("закрытый порт: %v (за %v)", err, time.Since(start).Round(time.Millisecond))
	}
}
