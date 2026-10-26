// Package fridascripts собирает Frida-скрипт для перехвата трафика Android-
// приложения: редирект на прокси, доверие нашему CA и снятие certificate
// pinning. Сами скрипты — AGPL-3.0, см. scripts/LICENSE и scripts/SOURCE.md.
package fridascripts

import (
	"embed"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

//go:embed all:scripts
var files embed.FS

type Config struct {
	CertPEM   string
	ProxyHost string
	ProxyPort int
	// SOCKS5: прокси понимает SOCKS5, значит, нативный hook может отправлять через него и не-HTTP трафик.
	SOCKS5 bool
	// Порты не-HTTP трафика, которые не нужно редиректить.
	IgnoredPorts []int
	Debug        bool

	DisableRootDetection bool // скрыть от приложения признаки root
	Flutter              bool // отключить pinning во Flutter-приложениях
	SafeMode             bool // только Java TLS: без нативных callback и автопатчера исключений
}

func read(name string) (string, error) {
	b, err := files.ReadFile("scripts/" + name)
	if err != nil {
		return "", fmt.Errorf("fridascripts: %w", err)
	}
	return string(b), nil
}

type replacement struct {
	name string
	re   *regexp.Regexp
	with string
}

// applyConfig подставляет значения в config.js. Каждая подстановка обязана
// сработать ровно один раз: если формат скрипта изменится при обновлении,
// мы узнаем об этом сразу, а не получим молча неработающий перехват.
func applyConfig(tmpl string, cfg Config) (string, error) {
	ports := "[" + strings.Trim(strings.Join(intsToStrings(cfg.IgnoredPorts), ", "), " ") + "]"
	reps := []replacement{
		{"CERT_PEM", regexp.MustCompile("(?s)(const CERT_PEM = `)[^`]*(`)"), strings.TrimSpace(cfg.CertPEM)},
		{"PROXY_HOST", regexp.MustCompile(`(const PROXY_HOST = ')[^']*(')`), cfg.ProxyHost},
		{"PROXY_PORT", regexp.MustCompile(`(const PROXY_PORT = )\d+(;)`), strconv.Itoa(cfg.ProxyPort)},
		{"PROXY_SUPPORTS_SOCKS5", regexp.MustCompile(`(const PROXY_SUPPORTS_SOCKS5 = )(?:true|false)(;)`), strconv.FormatBool(cfg.SOCKS5)},
		{"IGNORED_NON_HTTP_PORTS", regexp.MustCompile(`(?s)(const IGNORED_NON_HTTP_PORTS = )\[[^\]]*\](;)`), ports},
		{"DEBUG_MODE", regexp.MustCompile(`(const DEBUG_MODE = )(?:true|false)(;)`), strconv.FormatBool(cfg.Debug)},
	}
	out := tmpl
	for _, r := range reps {
		loc := r.re.FindAllStringSubmatchIndex(out, -1)
		if len(loc) != 1 {
			return "", fmt.Errorf("fridascripts: в config.js не найдено поле %s (формат скриптов изменился?)", r.name)
		}
		m := loc[0]
		// Склеиваем вручную, чтобы символы «$» в значении не трактовались как шаблон.
		out = out[:m[3]] + r.with + out[m[4]:]
	}
	return out, nil
}

func intsToStrings(in []int) []string {
	out := make([]string, len(in))
	for i, n := range in {
		out[i] = strconv.Itoa(n)
	}
	return out
}

// Build возвращает единый скрипт, который нужно загрузить в приложение.
// Порядок важен: мост к Java и config.js определяют то, что используют остальные.
func Build(cfg Config) (string, error) {
	if strings.TrimSpace(cfg.CertPEM) == "" {
		return "", fmt.Errorf("fridascripts: не задан сертификат")
	}
	configTmpl, err := read("config.js")
	if err != nil {
		return "", err
	}
	config, err := applyConfig(configTmpl, cfg)
	if err != nil {
		return "", err
	}

	parts := []string{"frida-java-bridge.js", "", "native-connect-hook.js", "native-openssl-trust.js"}
	if !cfg.SafeMode {
		parts = append(parts, "native-tls-hook.js")
	}
	parts = append(parts,
		"android/android-proxy-override.js",
		"android/android-system-certificate-injection.js",
		"android/android-certificate-unpinning.js",
	)
	if !cfg.SafeMode {
		parts = append(parts, "android/android-certificate-unpinning-fallback.js")
	}
	if cfg.DisableRootDetection {
		parts = append(parts, "android/android-disable-root-detection.js")
	}
	if cfg.Flutter {
		parts = append(parts, "android/android-disable-flutter-certificate-pinning.js")
	}

	var sb strings.Builder
	for _, name := range parts {
		if name == "" { // место config.js
			sb.WriteString(config)
			sb.WriteString("\n")
			continue
		}
		src, err := read(name)
		if err != nil {
			return "", err
		}
		sb.WriteString(src)
		sb.WriteString("\n")
	}
	return sb.String(), nil
}
