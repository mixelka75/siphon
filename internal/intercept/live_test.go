package intercept

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"siphon/internal/capture"
	"siphon/internal/certs"
	"siphon/internal/proxy"
)

// Opt-in device regression: SIPHON_LIVE_ANDROID=emulator-5554
// SIPHON_LIVE_APP=ru.dublgis.dgismobile SIPHON_LIVE_HOST=.2gis.com
// go test ./internal/intercept -run TestLiveAndroidCapture -v -timeout 3m
func TestLiveAndroidCapture(t *testing.T) {
	serial, appID := os.Getenv("SIPHON_LIVE_ANDROID"), os.Getenv("SIPHON_LIVE_APP")
	if serial == "" || appID == "" {
		t.Skip("live Android device/app not selected")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 150*time.Second)
	defer cancel()
	dir := t.TempDir()
	ca, err := certs.LoadOrCreate(dir + "/ca")
	if err != nil {
		t.Fatal(err)
	}
	settings := proxy.NewSettings()
	d := settings.Get()
	d.AutoPassthrough = false
	_ = settings.Set(d)
	e := proxy.NewEngine(ca, capture.NewStore(), settings)
	m := New(e, dir)
	m.Init(ctx)
	defer m.Shutdown()
	for i := 0; i < 100 && !m.ADBStatus().Running; i++ {
		time.Sleep(50 * time.Millisecond)
	}
	f := false
	s, err := m.StartIntercept(StartRequest{Serial: serial, AppID: appID, SafeMode: true, DisableRootDetection: &f, Flutter: &f})
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		for _, l := range m.session(s.ID).snapshot(true).Log {
			t.Log(l.Level, l.Text)
		}
	}()
	for {
		st := m.session(s.ID).snapshot(false)
		if st.State == "error" || st.State == "stopped" {
			t.Fatalf("app stopped: %s %s", st.State, st.Error)
		}
		for _, ex := range e.Store.List() {
			if ex.Kind == capture.KindHTTP && ex.State == capture.StateDone && ex.Response != nil && ex.Response.Size > 0 && ex.Response.Status >= 200 && ex.Response.Status < 400 && strings.Contains(ex.Host, os.Getenv("SIPHON_LIVE_HOST")) {
				t.Logf("decrypted %s %s -> %d (%d bytes)", ex.Method, ex.Host, ex.Response.Status, ex.Response.Size)
				return
			}
		}
		select {
		case <-ctx.Done():
			for _, ex := range e.Store.List() {
				t.Log(ex.Kind, ex.State, ex.Host, ex.Error)
			}
			t.Fatal("no successful decrypted response from target host")
		case <-time.After(time.Second):
		}
	}
}
