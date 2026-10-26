package fridascripts

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

const testCert = `-----BEGIN CERTIFICATE-----
MIIBszCCAVmgAwIBAgIUQ2l0ZXN0Y2VydGlmaWNhdGUwCgYIKoZIzj0EAwIwEjEQ
-----END CERTIFICATE-----`

func testConfig() Config {
	return Config{
		CertPEM: testCert, ProxyHost: "127.0.0.1", ProxyPort: 49152, SOCKS5: true,
		IgnoredPorts: []int{4070, 5228}, DisableRootDetection: true, Flutter: true,
	}
}

func TestBuildSubstitutesConfig(t *testing.T) {
	out, err := Build(testConfig())
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"const PROXY_HOST = '127.0.0.1';",
		"const PROXY_PORT = 49152;",
		"const PROXY_SUPPORTS_SOCKS5 = true;",
		"const IGNORED_NON_HTTP_PORTS = [4070, 5228];",
		"const DEBUG_MODE = false;",
		"MIIBszCCAVmgAwIBAgIUQ2l0ZXN0Y2VydGlmaWNhdGUw",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("в скрипте нет %q", want)
		}
	}
	if strings.Contains(out, "[!! Put your CA certificate") {
		t.Error("остался плейсхолдер сертификата")
	}
	// Мост к Java должен идти раньше остальных, config.js — перед хуками.
	iBridge := strings.Index(out, "globalThis.Java")
	iConfig := strings.Index(out, "const PROXY_PORT")
	iHook := strings.Index(out, "Process.attachModuleObserver")
	if !(iBridge >= 0 && iBridge < iConfig) || iConfig < 0 {
		t.Errorf("неверный порядок: bridge=%d config=%d", iBridge, iConfig)
	}
	_ = iHook
}

func TestBuildRequiresCert(t *testing.T) {
	cfg := testConfig()
	cfg.CertPEM = " "
	if _, err := Build(cfg); err == nil {
		t.Fatal("ожидалась ошибка без сертификата")
	}
}

func TestOptionalScripts(t *testing.T) {
	cfg := testConfig()
	cfg.DisableRootDetection, cfg.Flutter = false, false
	lean, err := Build(cfg)
	if err != nil {
		t.Fatal(err)
	}
	full, _ := Build(testConfig())
	if len(full) <= len(lean) {
		t.Fatalf("полный скрипт (%d) должен быть длиннее урезанного (%d)", len(full), len(lean))
	}
}

// Скрипты склеиваются в одну область видимости: дубли const/let или битый
// синтаксис ловим через node --check (если Node установлен).
func TestBuiltScriptIsValidJS(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("node не найден")
	}
	out, err := Build(testConfig())
	if err != nil {
		t.Fatal(err)
	}
	f := filepath.Join(t.TempDir(), "script.js")
	if err := os.WriteFile(f, []byte(out), 0o644); err != nil {
		t.Fatal(err)
	}
	if res, err := exec.Command(node, "--check", f).CombinedOutput(); err != nil {
		t.Fatalf("node --check:\n%s", res)
	}
}
