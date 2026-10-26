package adb

import (
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func binName() string {
	if runtime.GOOS == "windows" {
		return "adb.exe"
	}
	return "adb"
}

// Locate ищет adb: переменная SIPHON_ADB, PATH, Android SDK, затем наша
// собственная копия. Системному adb отдаём предпочтение, чтобы не воевать с
// уже запущенным сервером другой версии.
func Locate(dataDir string) (string, error) {
	if p := os.Getenv("SIPHON_ADB"); p != "" {
		if isFile(p) {
			return p, nil
		}
	}
	if p, err := exec.LookPath(binName()); err == nil {
		return p, nil
	}
	for _, root := range sdkRoots() {
		if p := filepath.Join(root, "platform-tools", binName()); isFile(p) {
			return p, nil
		}
	}
	if p := filepath.Join(dataDir, "platform-tools", binName()); isFile(p) {
		return p, nil
	}
	return "", errors.New("adb не найден")
}

func sdkRoots() []string {
	var roots []string
	for _, env := range []string{"ANDROID_HOME", "ANDROID_SDK_ROOT"} {
		if v := os.Getenv(env); v != "" {
			roots = append(roots, v)
		}
	}
	home, _ := os.UserHomeDir()
	switch runtime.GOOS {
	case "darwin":
		roots = append(roots, filepath.Join(home, "Library", "Android", "sdk"))
	case "windows":
		if v := os.Getenv("LOCALAPPDATA"); v != "" {
			roots = append(roots, filepath.Join(v, "Android", "Sdk"))
		}
	default:
		roots = append(roots, filepath.Join(home, "Android", "Sdk"))
	}
	return roots
}

func isFile(p string) bool {
	st, err := os.Stat(p)
	return err == nil && !st.IsDir()
}

func platformToolsURL() (string, error) {
	var osName string
	switch runtime.GOOS {
	case "darwin":
		osName = "darwin"
	case "linux":
		osName = "linux"
	case "windows":
		osName = "windows"
	default:
		return "", fmt.Errorf("платформа %s не поддерживается", runtime.GOOS)
	}
	return "https://dl.google.com/android/repository/platform-tools-latest-" + osName + ".zip", nil
}

// Download скачивает Android platform-tools с dl.google.com в dataDir и
// возвращает путь к adb.
func Download(ctx context.Context, dataDir string, progress func(done, total int64)) (string, error) {
	url, err := platformToolsURL()
	if err != nil {
		return "", err
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("скачивание platform-tools: HTTP %d", resp.StatusCode)
	}

	tmp, err := os.CreateTemp(dataDir, "platform-tools-*.zip")
	if err != nil {
		return "", err
	}
	defer os.Remove(tmp.Name())
	defer tmp.Close()

	var done int64
	buf := make([]byte, 64<<10)
	for {
		n, rerr := resp.Body.Read(buf)
		if n > 0 {
			if _, werr := tmp.Write(buf[:n]); werr != nil {
				return "", werr
			}
			done += int64(n)
			if progress != nil {
				progress(done, resp.ContentLength)
			}
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			return "", rerr
		}
	}
	if err := unzip(tmp.Name(), dataDir); err != nil {
		return "", err
	}
	bin := filepath.Join(dataDir, "platform-tools", binName())
	if !isFile(bin) {
		return "", errors.New("в архиве platform-tools нет adb")
	}
	return bin, nil
}

func unzip(archive, dest string) error {
	zr, err := zip.OpenReader(archive)
	if err != nil {
		return err
	}
	defer zr.Close()

	root, err := filepath.Abs(dest)
	if err != nil {
		return err
	}
	for _, f := range zr.File {
		target := filepath.Join(root, f.Name)
		if !strings.HasPrefix(target, root+string(os.PathSeparator)) {
			return fmt.Errorf("небезопасный путь в архиве: %s", f.Name)
		}
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, f.Mode()|0o600)
		if err != nil {
			rc.Close()
			return err
		}
		_, err = io.Copy(out, rc)
		rc.Close()
		if cerr := out.Close(); err == nil {
			err = cerr
		}
		if err != nil {
			return err
		}
	}
	return nil
}
