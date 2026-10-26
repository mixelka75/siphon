package adb

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"testing"
	"time"
)

// fakeServer реализует нужное подмножество протокола adb-сервера.
type fakeServer struct {
	ln   net.Listener
	root string // что отвечать на shell "id": "uid=0(root)" или "uid=2000(shell)"
}

func newFakeServer(t *testing.T) *fakeServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	f := &fakeServer{ln: ln, root: "uid=2000(shell)"}
	t.Cleanup(func() { ln.Close() })
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			go f.serve(c)
		}
	}()
	return f
}

func (f *fakeServer) client() *Client { return &Client{Addr: f.ln.Addr().String()} }

func readCmd(r io.Reader) (string, error) {
	var hdr [4]byte
	if _, err := io.ReadFull(r, hdr[:]); err != nil {
		return "", err
	}
	n, _ := strconv.ParseUint(string(hdr[:]), 16, 32)
	buf := make([]byte, n)
	_, err := io.ReadFull(r, buf)
	return string(buf), err
}

func lp(s string) string { return fmt.Sprintf("%04x%s", len(s), s) }

const devList = "emulator-5554\tdevice product:sdk_gphone model:sdk_gphone64_arm64 device:emu64a transport_id:1\n" +
	"R58M123\tunauthorized transport_id:2\n"

func (f *fakeServer) serve(c net.Conn) {
	defer c.Close()
	br := bufio.NewReader(c)
	for {
		cmd, err := readCmd(br)
		if err != nil {
			return
		}
		switch {
		case cmd == "host:version":
			_, _ = io.WriteString(c, "OKAY"+lp("0041"))
			return
		case cmd == "host:devices-l":
			_, _ = io.WriteString(c, "OKAY"+lp(devList))
			return
		case cmd == "host:track-devices-l":
			_, _ = io.WriteString(c, "OKAY"+lp(devList))
			time.Sleep(80 * time.Millisecond)
			_, _ = io.WriteString(c, lp(""))
			time.Sleep(time.Second)
			return
		case strings.HasPrefix(cmd, "host:transport:"):
			if strings.HasSuffix(cmd, ":missing") {
				_, _ = io.WriteString(c, "FAIL"+lp("device 'missing' not found"))
				return
			}
			_, _ = io.WriteString(c, "OKAY")
		case strings.HasPrefix(cmd, "shell:"):
			_, _ = io.WriteString(c, "OKAY")
			script := strings.TrimPrefix(cmd, "shell:")
			// Клиент оборачивает команду в "(\n…\n)\necho маркер$?".
			if strings.HasPrefix(script, "(\n") {
				if i := strings.Index(script, "\n)\necho "); i > 0 {
					script = script[2:i]
				}
			}
			out := "hello\n"
			switch {
			case script == "id":
				out = f.root + "\n"
			case script == "su -c 'id'":
				out = "uid=0(root)\n"
			case strings.HasPrefix(script, "getprop"):
				out = "[ro.product.model]: [Pixel 7]\n[ro.build.version.sdk]: [34]\n[ro.debuggable]: [0]\n"
			}
			code := 0
			if strings.HasPrefix(script, "false") {
				code = 1
			}
			_, _ = io.WriteString(c, out+fmt.Sprintf("__SIPHON_EXIT__:%d\n", code))
			return
		case strings.HasPrefix(cmd, "tcp:"):
			_, _ = io.WriteString(c, "OKAY")
			_, _ = io.Copy(c, br) // эхо
			return
		default:
			_, _ = io.WriteString(c, "FAIL"+lp("unknown command"))
			return
		}
	}
}

func TestDevicesParsing(t *testing.T) {
	f := newFakeServer(t)
	devs, err := f.client().Devices(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(devs) != 2 {
		t.Fatalf("устройств: %d", len(devs))
	}
	if d := devs[0]; d.Serial != "emulator-5554" || d.State != "device" || d.Model != "sdk gphone64 arm64" || !d.IsEmulator() {
		t.Fatalf("%+v", d)
	}
	if devs[1].State != "unauthorized" {
		t.Fatalf("%+v", devs[1])
	}
}

func TestTrackDevices(t *testing.T) {
	f := newFakeServer(t)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var updates [][]Device
	err := f.client().TrackDevices(ctx, func(d []Device) {
		updates = append(updates, d)
		if len(updates) == 2 {
			cancel()
		}
	})
	if err == nil {
		t.Fatal("ожидалась ошибка завершения")
	}
	if len(updates) != 2 || len(updates[0]) != 2 || len(updates[1]) != 0 {
		t.Fatalf("обновления: %+v", updates)
	}
}

func TestShellAndExitCode(t *testing.T) {
	f := newFakeServer(t)
	c := f.client()
	out, code, err := c.Shell(context.Background(), "emulator-5554", "echo hi")
	if err != nil || out != "hello" || code != 0 {
		t.Fatalf("out=%q code=%d err=%v", out, code, err)
	}
	_, code, _ = c.Shell(context.Background(), "emulator-5554", "false")
	if code != 1 {
		t.Fatalf("код возврата %d", code)
	}
	if _, _, err := c.Shell(context.Background(), "missing", "id"); err == nil || !strings.Contains(err.Error(), "not found") {
		t.Fatalf("ожидалась ошибка устройства: %v", err)
	}
}

func TestProps(t *testing.T) {
	f := newFakeServer(t)
	props, err := f.client().Props(context.Background(), "emulator-5554")
	if err != nil {
		t.Fatal(err)
	}
	if props["ro.product.model"] != "Pixel 7" || props["ro.build.version.sdk"] != "34" {
		t.Fatalf("%v", props)
	}
}

func TestDetectRoot(t *testing.T) {
	f := newFakeServer(t)
	r, err := f.client().DetectRoot(context.Background(), "emulator-5554")
	if err != nil || r.Method != "su-c" {
		t.Fatalf("ожидался su-c: %+v %v", r, err)
	}
	f.root = "uid=0(root)"
	r, err = f.client().DetectRoot(context.Background(), "emulator-5554")
	if err != nil || r.Method != "adbd" {
		t.Fatalf("ожидался adbd: %+v %v", r, err)
	}
}

func TestRootWrapQuoting(t *testing.T) {
	r := &Root{Method: "su-c"}
	if got := r.Wrap(`echo 'a b'`); got != `su -c 'echo '\''a b'\'''` {
		t.Fatalf("неверное экранирование: %s", got)
	}
	if got := (&Root{Method: "adbd"}).Wrap("id"); got != "id" {
		t.Fatal(got)
	}
}

// Регрессия: туннель должен переживать отмену контекста, в котором открыт.
func TestTunnelSurvivesContextCancel(t *testing.T) {
	f := newFakeServer(t)
	ctx, cancel := context.WithCancel(context.Background())
	conn, err := f.client().OpenTCP(ctx, "emulator-5554", 24073)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	cancel()
	time.Sleep(100 * time.Millisecond)

	// Своих дедлайнов не ставим: иначе затрём тот, что выставил бы баг.
	// Сторожевой таймер лишь страхует от зависания.
	watchdog := time.AfterFunc(3*time.Second, func() { conn.Close() })
	defer watchdog.Stop()
	if _, err := conn.Write([]byte("ping")); err != nil {
		t.Fatalf("запись после отмены контекста: %v", err)
	}
	buf := make([]byte, 4)
	if _, err := io.ReadFull(conn, buf); err != nil || string(buf) != "ping" {
		t.Fatalf("эхо после отмены контекста: %q %v", buf, err)
	}
}

func TestServerUnavailable(t *testing.T) {
	c := &Client{Addr: "127.0.0.1:1"}
	if _, err := c.Devices(context.Background()); err == nil || !strings.Contains(err.Error(), "adb-сервер недоступен") {
		t.Fatalf("ожидалась понятная ошибка: %v", err)
	}
}
