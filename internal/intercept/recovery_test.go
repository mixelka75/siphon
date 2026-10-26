package intercept

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestStaleSpawnErrors(t *testing.T) {
	for _, tc := range []struct {
		text string
		want bool
	}{
		{"Unable to locate android.os.Process.setArgV0() slot", true},
		{"android.os.DeadSystemRuntimeException: android.os.DeadSystemException", true},
		{"re.frida.Error.NotSupported: missing application", false},
		{"unexpectedly timed out while waiting for app to launch", false},
		{"permission denied", false},
	} {
		if got := staleSpawnError(errors.New(tc.text)); got != tc.want {
			t.Errorf("%q: %v", tc.text, got)
		}
	}
	if staleSpawnError(nil) {
		t.Fatal("nil error")
	}
}

func TestFrameworkReadinessRequiresNewZygoteAndPackageManager(t *testing.T) {
	for _, tc := range []struct {
		out  string
		want bool
	}{
		{"42\n1\npackage:/system/framework/framework-res.apk", false},
		{"43\n1\npackage:/system/framework/framework-res.apk", true},
		{"43\r\n1\r\npackage:/system/framework/framework-res.apk\r\n", true},
		{"43\n0\npackage:/system/framework/framework-res.apk", false},
		{"43\n1\ncmd: Can't find service: package", false},
		{"\n1\npackage:/system/framework/framework-res.apk", false},
		{"43\n1", false},
	} {
		if got := frameworkReady(tc.out, "42"); got != tc.want {
			t.Errorf("%q: %v", tc.out, got)
		}
	}
}

func TestStopDuringStartupCancelsADBAndReleasesDevice(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	ready, disconnected := make(chan struct{}), make(chan struct{})
	go func() {
		defer close(disconnected)
		c, err := ln.Accept()
		if err != nil {
			return
		}
		defer c.Close()
		_ = c.SetDeadline(time.Now().Add(5 * time.Second))
		for i := 0; i < 2; i++ {
			hdr := make([]byte, 4)
			if _, err := io.ReadFull(c, hdr); err != nil {
				return
			}
			n, err := strconv.ParseInt(string(hdr), 16, 32)
			if err != nil {
				return
			}
			cmd := make([]byte, n)
			if _, err := io.ReadFull(c, cmd); err != nil {
				return
			}
			if _, err := fmt.Fprint(c, "OKAY"); err != nil {
				return
			}
			if i == 1 && !strings.HasPrefix(string(cmd), "shell:") {
				return
			}
		}
		close(ready)
		_, _ = io.Copy(io.Discard, c)
	}()
	m := New(nil, t.TempDir())
	m.client.Addr = ln.Addr().String()
	s, err := m.StartIntercept(StartRequest{Serial: "test", AppID: "app.test"})
	if err != nil {
		t.Fatal(err)
	}
	select {
	case <-ready:
	case <-time.After(5 * time.Second):
		t.Fatal("ADB did not start")
	}
	if _, err := m.StartIntercept(StartRequest{Serial: "test", AppID: "app.other"}); !errors.Is(err, ErrBusy) {
		t.Fatalf("parallel startup: %v", err)
	}
	if err := m.StopSession(s.ID); err != nil {
		t.Fatal(err)
	}
	if got := m.Sessions()[0]; got.State != "stopped" || got.Error != "" {
		t.Fatalf("%+v", got)
	}
	m.mu.Lock()
	busy := m.busy["test"]
	m.mu.Unlock()
	if busy {
		t.Fatal("device stayed busy")
	}
	select {
	case <-disconnected:
	case <-time.After(time.Second):
		t.Fatal("ADB connection leaked")
	}
}

func TestConcurrentSessionTerminationIsFinal(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	m := New(nil, t.TempDir())
	s := &Session{m: m, cancel: cancel, info: SessionInfo{ID: "s", State: "starting"}}
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Go(func() {
			s.stopped("stop")
			s.update(func(i *SessionInfo) { i.State = "running" })
			s.fail(errors.New("late failure"))
		})
	}
	wg.Wait()
	if ctx.Err() == nil || s.snapshot(false).State != "stopped" {
		t.Fatal(s.snapshot(false))
	}
}
