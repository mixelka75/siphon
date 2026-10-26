package adb

import (
	"os"
	"path/filepath"
	"testing"
)

func TestListAVDs(t *testing.T) {
	home := t.TempDir()
	t.Setenv("ANDROID_AVD_HOME", home)
	write := func(name, content string) {
		if err := os.MkdirAll(filepath.Dir(filepath.Join(home, name)), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(home, name), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("Play.ini", "path="+filepath.Join(home, "Play.avd")+"\ntarget=android-37.0\n")
	write("Play.avd/config.ini", "PlayStore.enabled=true\ntag.id=google_apis_playstore\nabi.type=arm64-v8a\n")
	// path указывает в никуда: каталог ищется рядом по имени.
	write("Siphon_API34.ini", "path=/nowhere/Siphon.avd\ntarget=android-34\n")
	write("Siphon_API34.avd/config.ini", "PlayStore.enabled=false\ntag.id=google_apis\nabi.type=arm64-v8a\navd.ini.displayname=Siphon API34\n")
	write("Gone.ini", "path=/nowhere/Gone.avd\n")

	list, err := ListAVDs()
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 {
		t.Fatalf("got %+v", list)
	}
	if a := list[0]; a.Name != "Siphon_API34" || !a.Rootable || a.PlayStore || a.Tag != "google_apis" || a.DisplayName != "Siphon API34" || a.Target != "android-34" {
		t.Errorf("rootable AVD must come first: %+v", a)
	}
	if a := list[1]; a.Name != "Play" || a.Rootable || !a.PlayStore {
		t.Errorf("play store AVD: %+v", a)
	}
}

func TestFreeEmulatorPortSkipsTaken(t *testing.T) {
	port, err := FreeEmulatorPort(map[string]bool{"emulator-5554": true})
	if err != nil {
		t.Fatal(err)
	}
	if port == 5554 || port%2 != 0 || port < 5556 {
		t.Fatalf("port %d", port)
	}
}
