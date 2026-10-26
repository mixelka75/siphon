package intercept

import (
	"context"
	"crypto/sha512"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ulikunitz/xz"

	"siphon/internal/adb"
)

const (
	FridaVersion = "17.24.3"
	// Нестандартный порт и имя файла: часть приложений ищет frida-server по 27042 и по имени.
	FridaPort        = 24073
	fridaDefaultPort = 27042
	fridaDevicePath  = "/data/local/tmp/.siphon-frida-" + FridaVersion
)

// SHA-512 распакованных бинарников frida-server для Android (сверены с релизами
// github.com/frida/frida). Скачанный файл с другим хэшем не используется.
var fridaSRI = map[string]string{
	"arm":    "sha512-uLRBtRMtcjAOp+0xp/nvrfQQJ5E5ohCra4+egYiMrOSBxu7j+fTiEsQ9Tk+Kyh5OECgpT6S572XqbC5CGpJeMw==",
	"arm64":  "sha512-+jCToMXhr+uGyurJbjkbKMAOawTeDnCfk0L6fu41yWGWzy47pICvdRqveQfpfWKvYqM4UQX2g8LaRo3buaAnpg==",
	"x86":    "sha512-tKxIPp+PEngNoNVPuSMtNLXr3uIgiYzg03GAbvPqqCkFm0g2YWDZwIpiFqxaAzmqkIV4cV66vcDxnKM038vFVQ==",
	"x86_64": "sha512-9wVQvYIERI484nmwFXVtW5rH0leVU0qOmqDjQNJ7xYYnTceGXEF8bIOWDtK5wYqc3+wKmSAbFFOOtfK+VIYd0A==",
}

var abiToArch = map[string]string{
	"arm64-v8a":   "arm64",
	"armeabi-v7a": "arm",
	"armeabi":     "arm",
	"x86":         "x86",
	"x86_64":      "x86_64",
}

// ArchFromABIs выбирает архитектуру frida-server по списку ABI устройства.
func ArchFromABIs(abis []string) (string, error) {
	for _, abi := range abis {
		if arch, ok := abiToArch[strings.TrimSpace(abi)]; ok {
			return arch, nil
		}
	}
	return "", fmt.Errorf("неизвестная архитектура устройства: %s", strings.Join(abis, ","))
}

// fridaServerBinary возвращает путь к локальной копии frida-server нужной
// архитектуры, скачивая её при необходимости.
func (m *Manager) fridaServerBinary(ctx context.Context, arch string, progress func(string)) (string, error) {
	want, ok := fridaSRI[arch]
	if !ok {
		return "", fmt.Errorf("нет проверочного хэша для архитектуры %s", arch)
	}
	dir := filepath.Join(m.dataDir, "frida")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	path := filepath.Join(dir, fmt.Sprintf("frida-server-%s-android-%s", FridaVersion, arch))

	if sum, err := hashFile(path); err == nil && sum == want {
		return path, nil
	}

	progress(fmt.Sprintf("Скачиваю frida-server %s (%s)…", FridaVersion, arch))
	url := fmt.Sprintf("https://github.com/frida/frida/releases/download/%s/frida-server-%s-android-%s.xz",
		FridaVersion, FridaVersion, arch)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("скачивание frida-server: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("скачивание frida-server: HTTP %d", resp.StatusCode)
	}
	xr, err := xz.NewReader(resp.Body)
	if err != nil {
		return "", err
	}

	tmp, err := os.CreateTemp(dir, "download-*")
	if err != nil {
		return "", err
	}
	defer os.Remove(tmp.Name())
	h := sha512.New()
	if _, err := io.Copy(io.MultiWriter(tmp, h), xr); err != nil {
		tmp.Close()
		return "", fmt.Errorf("распаковка frida-server: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return "", err
	}
	if got := "sha512-" + base64.StdEncoding.EncodeToString(h.Sum(nil)); got != want {
		return "", errors.New("хэш скачанного frida-server не совпал с ожидаемым — файл отброшен")
	}
	if err := os.Rename(tmp.Name(), path); err != nil {
		return "", err
	}
	return path, nil
}

func hashFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha512.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return "sha512-" + base64.StdEncoding.EncodeToString(h.Sum(nil)), nil
}

// fridaPortOnDevice сообщает, на каком порту слушает frida-server (0 — нигде).
func (m *Manager) fridaPortOnDevice(ctx context.Context, serial string) int {
	for _, port := range []int{FridaPort, fridaDefaultPort} {
		cctx, cancel := context.WithTimeout(ctx, 1500*time.Millisecond)
		conn, err := m.adb().OpenTCP(cctx, serial, port)
		cancel()
		if err == nil {
			conn.Close()
			return port
		}
	}
	return 0
}

func (m *Manager) fridaInstalled(ctx context.Context, serial string) bool {
	out, _, err := m.adb().Shell(ctx, serial, "test -x "+fridaDevicePath+" && echo yes")
	return err == nil && strings.TrimSpace(out) == "yes"
}

func (m *Manager) installFrida(ctx context.Context, serial, arch string, progress func(string)) error {
	local, err := m.fridaServerBinary(ctx, arch, progress)
	if err != nil {
		return err
	}
	progress("Копирую frida-server на устройство…")
	if err := m.adb().Push(ctx, serial, local, fridaDevicePath); err != nil {
		return err
	}
	if _, code, err := m.adb().Shell(ctx, serial, "chmod 755 "+fridaDevicePath); err != nil || code != 0 {
		return fmt.Errorf("не удалось выставить права на frida-server (код %d): %v", code, err)
	}
	return nil
}

// launchFrida запускает frida-server в переднем плане внутри adb-сессии и держит
// её открытой: фоновый запуск (`nohup … &`) adbd убивает при закрытии сессии,
// поэтому поступаем как HTTP Toolkit — живой поток на всё время работы сервера.
func (m *Manager) launchFrida(ctx context.Context, serial string, root *adb.Root, progress func(string)) error {
	progress("Запускаю frida-server от root…")
	cmd := root.Wrap(fmt.Sprintf("%s -l 127.0.0.1:%d", fridaDevicePath, FridaPort))
	stream, err := m.adb().ShellStream(ctx, serial, cmd)
	if err != nil {
		return fmt.Errorf("не удалось открыть сессию запуска: %w", err)
	}

	deadline := time.Now().Add(12 * time.Second)
	for time.Now().Before(deadline) {
		if m.fridaPortOnDevice(ctx, serial) != 0 {
			m.mu.Lock()
			m.fridaStreams[serial] = stream
			m.mu.Unlock()
			// Читаем вывод, чтобы буферы не переполнялись; EOF означает падение сервера.
			go func() {
				defer stream.Close()
				_, _ = io.Copy(io.Discard, stream)
				m.mu.Lock()
				if cur, ok := m.fridaStreams[serial]; ok && cur == stream {
					delete(m.fridaStreams, serial)
				}
				m.mu.Unlock()
			}()
			return nil
		}
		select {
		case <-ctx.Done():
			stream.Close()
			return ctx.Err()
		case <-time.After(400 * time.Millisecond):
		}
	}
	stream.Close()
	return errors.New("frida-server не запустился за 12 секунд (проверьте SELinux и права root)")
}

// stopFrida закрывает сессию, в которой работает frida-server (этого достаточно),
// и для надёжности посылает pkill.
func (m *Manager) stopFrida(ctx context.Context, serial string, root *adb.Root) error {
	m.mu.Lock()
	stream := m.fridaStreams[serial]
	delete(m.fridaStreams, serial)
	m.mu.Unlock()
	if stream != nil {
		defer stream.Close()
	}
	// Anchor the pattern so pkill cannot match the shell invoking it. Include
	// older Siphon versions to make upgrades stop their server too.
	_, _, err := m.adb().Shell(ctx, serial, root.Wrap("pkill -f '^/data/local/tmp/[.]siphon-frida-' || true"))
	return err
}
