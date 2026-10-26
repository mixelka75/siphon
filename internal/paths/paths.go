// Package paths определяет, где Siphon хранит свои данные.
package paths

import (
	"os"
	"path/filepath"
)

// DataDir — каталог данных: CA, кэш frida-server, платформенные утилиты, настройки.
//
//	macOS:   ~/Library/Application Support/Siphon
//	Linux:   ~/.config/Siphon
//	Windows: %AppData%\Siphon
//
// Переопределяется переменной SIPHON_DATA_DIR.
func DataDir() (string, error) {
	dir := os.Getenv("SIPHON_DATA_DIR")
	if dir == "" {
		base, err := os.UserConfigDir()
		if err != nil {
			return "", err
		}
		dir = filepath.Join(base, "Siphon")
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	return dir, nil
}
