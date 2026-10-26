package adb

import (
	"bufio"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"

	"siphon/internal/sysproc"
)

// AVD — виртуальное устройство Android Emulator.
type AVD struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName,omitempty"`
	Target      string `json:"target,omitempty"` // android-34
	Tag         string `json:"tag,omitempty"`    // google_apis | google_apis_playstore | default …
	ABI         string `json:"abi,omitempty"`
	PlayStore   bool   `json:"playStore"`
	// Rootable: образ без Google Play, adbd там переключается в root — Frida заработает.
	Rootable bool `json:"rootable"`
}

func emulatorBinName() string {
	if runtime.GOOS == "windows" {
		return "emulator.exe"
	}
	return "emulator"
}

// LocateEmulator ищет бинарник Android Emulator: SIPHON_EMULATOR, Android SDK, PATH.
// Обёртку tools/emulator из старых SDK не берём — она не умеет современные образы.
func LocateEmulator() (string, error) {
	if p := os.Getenv("SIPHON_EMULATOR"); p != "" && isFile(p) {
		return p, nil
	}
	roots := sdkRoots()
	if runtime.GOOS == "darwin" {
		roots = append(roots, "/opt/homebrew/share/android-commandlinetools", "/usr/local/share/android-commandlinetools")
	}
	for _, root := range roots {
		if p := filepath.Join(root, "emulator", emulatorBinName()); isFile(p) {
			return p, nil
		}
	}
	if p, err := exec.LookPath(emulatorBinName()); err == nil {
		return p, nil
	}
	return "", errors.New("Android Emulator не найден: установите его в Android Studio (SDK Manager → Android Emulator) или укажите путь в SIPHON_EMULATOR")
}

// avdHome — каталог с описаниями AVD (те же правила, что у самого эмулятора).
func avdHome() string {
	if v := os.Getenv("ANDROID_AVD_HOME"); v != "" {
		return v
	}
	if v := os.Getenv("ANDROID_USER_HOME"); v != "" {
		return filepath.Join(v, "avd")
	}
	if v := os.Getenv("ANDROID_SDK_HOME"); v != "" {
		return filepath.Join(v, ".android", "avd")
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".android", "avd")
}

func readINI(path string) map[string]string {
	f, err := os.Open(path)
	if err != nil {
		return nil
	}
	defer f.Close()
	out := map[string]string{}
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		k, v, ok := strings.Cut(sc.Text(), "=")
		if ok {
			out[strings.TrimSpace(k)] = strings.TrimSpace(v)
		}
	}
	return out
}

// ListAVDs читает ~/.android/avd/*.ini и config.ini каждого устройства.
func ListAVDs() ([]AVD, error) {
	home := avdHome()
	files, err := filepath.Glob(filepath.Join(home, "*.ini"))
	if err != nil {
		return nil, err
	}
	var out []AVD
	for _, f := range files {
		top := readINI(f)
		if top == nil {
			continue
		}
		a := AVD{Name: strings.TrimSuffix(filepath.Base(f), ".ini"), Target: top["target"]}
		dir := top["path"]
		if dir == "" || !isFile(filepath.Join(dir, "config.ini")) {
			dir = filepath.Join(home, a.Name+".avd")
		}
		cfg := readINI(filepath.Join(dir, "config.ini"))
		if cfg == nil {
			continue // ссылка на удалённое устройство
		}
		a.DisplayName = cfg["avd.ini.displayname"]
		a.Tag = cfg["tag.id"]
		a.ABI = cfg["abi.type"]
		if a.Target == "" {
			a.Target = cfg["target"]
		}
		a.PlayStore = cfg["PlayStore.enabled"] == "true" || cfg["PlayStore.enabled"] == "yes" || strings.Contains(a.Tag, "playstore")
		a.Rootable = !a.PlayStore
		out = append(out, a)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Rootable != out[j].Rootable {
			return out[i].Rootable
		}
		return out[i].Name < out[j].Name
	})
	return out, nil
}

type EmulatorOptions struct {
	Headless bool `json:"headless"` // без окна (-no-window)
	ColdBoot bool `json:"coldBoot"` // не поднимать снапшот (-no-snapshot-load)
}

// FreeEmulatorPort подбирает чётный консольный порт: по нему заранее известен
// serial будущего устройства (emulator-<port>).
func FreeEmulatorPort(taken map[string]bool) (int, error) {
	for port := 5554; port <= 5680; port += 2 {
		if taken["emulator-"+strconv.Itoa(port)] {
			continue
		}
		free := true
		for _, p := range []int{port, port + 1} {
			l, err := net.Listen("tcp", "127.0.0.1:"+strconv.Itoa(p))
			if err != nil {
				free = false
				break
			}
			l.Close()
		}
		if free {
			return port, nil
		}
	}
	return 0, errors.New("нет свободного порта для эмулятора (5554–5681)")
}

// StartEmulator запускает AVD отдельным процессом: эмулятор продолжит работать
// и после закрытия Siphon. Вывод эмулятора пишется в logPath.
func StartEmulator(bin, name string, port int, opts EmulatorOptions, logPath string) (*exec.Cmd, error) {
	args := []string{"-avd", name, "-port", strconv.Itoa(port), "-no-boot-anim"}
	if opts.Headless {
		args = append(args, "-no-window")
	}
	if opts.ColdBoot {
		args = append(args, "-no-snapshot-load")
	}
	if err := os.MkdirAll(filepath.Dir(logPath), 0o700); err != nil {
		return nil, err
	}
	logFile, err := os.Create(logPath)
	if err != nil {
		return nil, err
	}
	cmd := exec.Command(bin, args...)
	cmd.Dir = filepath.Dir(bin)
	cmd.Stdout, cmd.Stderr = logFile, logFile
	sysproc.Detach(cmd)
	err = cmd.Start()
	logFile.Close()
	if err != nil {
		return nil, fmt.Errorf("не удалось запустить эмулятор: %w", err)
	}
	return cmd, nil
}
