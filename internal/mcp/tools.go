package mcp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"siphon/internal/capture"
	"siphon/internal/intercept"
)

const instructions = `Siphon intercepts and decrypts HTTP(S) traffic of Android apps (Frida + a local MITM proxy). These tools drive the running Siphon app; it is started automatically if needed.

Typical workflow:
1. status — what is running and what to do next (see "next").
2. list_emulators → start_emulator. Prefer an AVD with rootable=true (a "Google APIs" image without Play Store): Frida needs root. A rooted phone over USB also works.
3. prepare_device — installs and starts frida-server (once per boot).
4. list_apps → start_intercept(appId). Mode "spawn" restarts the app with hooks from launch.
5. wait_for_user — ask the user to act in the app, in the user's language ("Войдите в аккаунт и откройте корзину, затем нажмите «Готово»"). Siphon shows this as a banner with a Done button; the call returns when the user presses it. It returns lastSeq: everything the user did afterwards has seq > lastSeq.
6. list_traffic(since=lastSeq) → get_exchange(id) for headers and decoded bodies; export_traffic saves JSON/HAR to a file.
set_rules can mock, modify, redirect, delay or block requests. When something fails, read the error and the session log: they say what to do.`

type tool struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	InputSchema map[string]any `json:"inputSchema"`
	run         func(ctx context.Context, args json.RawMessage) (string, error)
}

type toolbox struct {
	c     *client
	tools []*tool
}

func (t *toolbox) list() []*tool { return t.tools }

func (t *toolbox) has(name string) bool { return t.find(name) != nil }

func (t *toolbox) find(name string) *tool {
	for _, x := range t.tools {
		if x.Name == name {
			return x
		}
	}
	return nil
}

func (t *toolbox) call(ctx context.Context, name string, args json.RawMessage) (string, error) {
	if len(args) == 0 || string(args) == "null" {
		args = json.RawMessage("{}")
	}
	return t.find(name).run(ctx, args)
}

// ---------- схемы аргументов ----------

func obj(props map[string]any, required ...string) map[string]any {
	s := map[string]any{"type": "object", "properties": props}
	if len(required) > 0 {
		s["required"] = required
	}
	return s
}

func str(desc string) map[string]any { return map[string]any{"type": "string", "description": desc} }
func integer(desc string) map[string]any {
	return map[string]any{"type": "integer", "description": desc}
}
func boolean(desc string) map[string]any {
	return map[string]any{"type": "boolean", "description": desc}
}

func timeoutArg(def int) map[string]any {
	return integer(fmt.Sprintf("How long to wait, seconds (default %d, max 900). On timeout the call returns the current state; call again to keep waiting.", def))
}

var (
	serialArg = str("adb serial of the device. Optional when exactly one device is online.")
	filterArg = str("Filter in the Siphon UI syntax, terms are ANDed: plain words match method/URL/status/app; host:api path:/v1 method:post status:4xx type:json src:com.app kind:websocket is:error; -term excludes.")
	sinceArg  = integer("Only exchanges with seq greater than this (lastSeq from status or wait_for_user).")
)

// decode разбирает аргументы инструмента в структуру T.
func decode[T any](raw json.RawMessage) (T, error) {
	var v T
	if err := json.Unmarshal(raw, &v); err != nil {
		return v, fmt.Errorf("invalid arguments: %w", err)
	}
	return v, nil
}

func waitSeconds(v, def int) int {
	if v <= 0 {
		return def
	}
	return min(v, 900)
}

func pretty(v any) string {
	var b strings.Builder
	enc := json.NewEncoder(&b)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	_ = enc.Encode(v)
	return strings.TrimSpace(b.String())
}

func newToolbox(opts Options) *toolbox {
	t := &toolbox{c: newClient(opts)}
	t.tools = []*tool{
		{Name: "status", run: t.status, InputSchema: obj(map[string]any{}),
			Description: "Siphon state: version and UI address, adb, connected devices (Frida status, root), interception sessions, traffic lastSeq, pending user prompts, and a suggested next step."},
		{Name: "install_adb", run: t.installADB, InputSchema: obj(map[string]any{}),
			Description: "Download the official Android platform-tools (adb, ~15 MB from dl.google.com) into Siphon's data folder. Only needed when status says adb is not found."},
		{Name: "list_emulators", run: t.listEmulators, InputSchema: obj(map[string]any{}),
			Description: "List Android Virtual Devices with state (stopped | starting | booting | running), serial and rootable (no Play Store, so Frida can get root)."},
		{Name: "start_emulator", run: t.startEmulator,
			Description: "Start an AVD and wait until Android has fully booted. An already running AVD is reused. Without name, picks a running or the first rootable AVD.",
			InputSchema: obj(map[string]any{
				"name":       str("AVD name from list_emulators."),
				"headless":   boolean("Run without a window (default false: the user usually needs to see and use the emulator)."),
				"coldBoot":   boolean("Ignore the saved snapshot and boot from scratch (default false)."),
				"timeoutSec": timeoutArg(300),
			})},
		{Name: "prepare_device", run: t.prepareDevice,
			Description: "Make the device ready for interception: check root, install and start frida-server. Fast when Frida already runs.",
			InputSchema: obj(map[string]any{"serial": serialArg, "timeoutSec": timeoutArg(300)})},
		{Name: "list_apps", run: t.listApps,
			Description: "Installed apps on the device (running first) with package id, name and pid. Requires a prepared device.",
			InputSchema: obj(map[string]any{"serial": serialArg, "query": str("Case-insensitive substring of the package id or app name.")})},
		{Name: "start_intercept", run: t.startIntercept,
			Description: "Start intercepting an app and wait until hooks are active. Traffic then appears in list_traffic with source = package id.",
			InputSchema: obj(map[string]any{
				"appId":      str("Package id, e.g. com.example.app."),
				"serial":     serialArg,
				"mode":       str("spawn (default): restart the app with hooks from launch. attach: hook the running process; connections opened earlier are not captured."),
				"safeMode":   boolean("Compatible TLS mode: try it when the app crashes under interception."),
				"timeoutSec": timeoutArg(180),
			}, "appId")},
		{Name: "stop_intercept", run: t.stopIntercept,
			Description: "Stop an interception session (the app keeps running without hooks). Without sessionId stops all active sessions.",
			InputSchema: obj(map[string]any{"sessionId": str("Session id from status or start_intercept.")})},
		{Name: "wait_for_user", run: t.waitForUser,
			Description: "Ask the user to do something (log in, open a screen, reproduce a bug) and wait until they press Done in the Siphon window. Write the message in the user's language. Returns state (done | cancelled | expired), the user's optional reply, lastSeq (traffic from before the request) and a summary of traffic captured since. To keep waiting after a timeout, pass askId instead of message.",
			InputSchema: obj(map[string]any{
				"message":    str("What the user should do, ending with an instruction to press Done."),
				"askId":      str("Continue waiting for an earlier prompt instead of creating a new one."),
				"timeoutSec": timeoutArg(600),
			})},
		{Name: "wait_for_traffic", run: t.waitForTraffic,
			Description: "Wait until a finished exchange matching the filter appears (e.g. the login request). By default only waits for traffic newer than the call.",
			InputSchema: obj(map[string]any{"filter": filterArg, "since": sinceArg, "limit": integer("Max rows to return (default 50)."), "timeoutSec": timeoutArg(120)})},
		{Name: "list_traffic", run: t.listTraffic,
			Description: "Captured exchanges, one line each: id, method, status, URL, content type, sizes, duration, app. Newest last.",
			InputSchema: obj(map[string]any{"filter": filterArg, "since": sinceArg, "limit": integer("Max rows, the newest are kept (default 100).")})},
		{Name: "get_exchange", run: t.getExchange,
			Description: "One exchange in full: request and response headers and decoded bodies (body is in exactly one of json, text or base64), timings, TLS, WebSocket frames.",
			InputSchema: obj(map[string]any{
				"id":           str("Exchange id from list_traffic."),
				"maxBodyChars": integer("Cut each body to this many characters (default 20000). Use export_traffic for the full data."),
			}, "id")},
		{Name: "export_traffic", run: t.exportTraffic,
			Description: "Save traffic to a file: JSON (format siphon/v1: exchanges with headers, decoded bodies, frames) or HAR 1.2. Returns the path and the number of exchanges.",
			InputSchema: obj(map[string]any{
				"path":   str("Output file. Relative paths are resolved against the current directory. Default: ./siphon-<time>.<format>."),
				"format": str("json (default) or har."),
				"filter": filterArg,
				"since":  sinceArg,
				"ids":    map[string]any{"type": "array", "items": map[string]any{"type": "string"}, "description": "Export only these exchange ids."},
			})},
		{Name: "get_rules", run: t.getRules, InputSchema: obj(map[string]any{}),
			Description: "Current traffic rules (mocks, rewrites, redirects, breakpoints), in the order they are checked."},
		{Name: "set_rules", run: t.setRules,
			Description: rulesDoc,
			InputSchema: obj(map[string]any{"rules": map[string]any{"type": "array", "items": map[string]any{"type": "object"}, "description": "The complete new list of rules."}}, "rules")},
		{Name: "clear_traffic", run: t.clearTraffic,
			Description: "Delete captured traffic.",
			InputSchema: obj(map[string]any{"keepPinned": boolean("Keep pinned exchanges (default true).")})},
	}
	return t
}

const rulesDoc = `Replace ALL traffic rules (call get_rules first and send back the ones to keep). The first enabled matching rule applies. Rule fields:
{"name": "…", "enabled": true,
 "match": {"method": "POST", "host": "*.example.com", "path": "/api/*", "url": "regex on full URL", "source": "package id substring", "headerName": "…", "headerValue": "substring"},
 "mock": {"status": 200, "headers": [{"name": "Content-Type", "value": "application/json"}], "body": "…"},
 "redirectTo": "https://staging.example.com",
 "block": "reset",
 "delayMs": 2000,
 "request":  {"setHeaders": [{"name": "…", "value": "…"}], "removeHeaders": ["…"], "replace": [{"find": "…", "with": "…", "regex": false}], "setBody": "…"},
 "response": {"status": 500, "setHeaders": [], "removeHeaders": [], "replace": [], "setBody": "…"},
 "breakRequest": false, "breakResponse": false}
Use only the parts you need. Breakpoints pause the exchange in the Siphon UI until the user resumes it.`

// ---------- устройства ----------

type androidState struct {
	ADB      intercept.ADBStatus     `json:"adb"`
	Devices  []intercept.DeviceView  `json:"devices"`
	Sessions []intercept.SessionInfo `json:"sessions"`
}

func (t *toolbox) android(ctx context.Context) (androidState, error) {
	var a androidState
	_, err := t.c.do(ctx, "GET", "/api/android", nil, &a)
	return a, err
}

// serial выбирает устройство: заданное или единственное подключённое.
func (t *toolbox) serial(ctx context.Context, want string) (string, error) {
	if want != "" {
		return want, nil
	}
	a, err := t.android(ctx)
	if err != nil {
		return "", err
	}
	var online []string
	for _, d := range a.Devices {
		if d.State == "device" {
			online = append(online, d.Serial)
		}
	}
	switch len(online) {
	case 0:
		return "", errors.New("no device online: start one with start_emulator or connect a phone with USB debugging")
	case 1:
		return online[0], nil
	}
	return "", fmt.Errorf("several devices are online (%s): pass serial", strings.Join(online, ", "))
}

func (t *toolbox) status(ctx context.Context, _ json.RawMessage) (string, error) {
	var st struct {
		Version string         `json:"version"`
		DataDir string         `json:"dataDir"`
		Proxy   map[string]any `json:"proxy"`
		Traffic struct {
			LastSeq uint64 `json:"lastSeq"`
		} `json:"traffic"`
		Agent struct {
			Desktop bool `json:"desktop"`
		} `json:"agent"`
	}
	if _, err := t.c.do(ctx, "GET", "/api/state", nil, &st); err != nil {
		return "", err
	}
	a, err := t.android(ctx)
	if err != nil {
		return "", err
	}
	var asks []map[string]any
	_, _ = t.c.do(ctx, "GET", "/api/agent/asks", nil, &asks)

	sessions := make([]map[string]any, 0, len(a.Sessions))
	active := 0
	for _, s := range a.Sessions {
		if s.State == "running" || s.State == "starting" {
			active++
		}
		sessions = append(sessions, map[string]any{
			"id": s.ID, "appId": s.AppID, "serial": s.Serial, "mode": s.Mode, "state": s.State,
			"error": s.Error, "log": logTail(s.Log, 3),
		})
	}
	online, ready := 0, 0
	for _, d := range a.Devices {
		if d.State == "device" {
			online++
			if d.Info != nil && d.Info.Frida == "running" {
				ready++
			}
		}
	}
	next := "Interception is running: use wait_for_user to let the user act in the app, then list_traffic."
	switch {
	case !a.ADB.Found:
		next = "adb is not found: call install_adb, or install Android SDK platform-tools."
	case online == 0:
		next = "No device online: call list_emulators and start_emulator (or ask the user to connect a rooted phone)."
	case ready == 0:
		next = "Call prepare_device to start frida-server."
	case active == 0:
		next = "Call list_apps, then start_intercept with the package id."
	}
	ui := t.c.base + " — Siphon runs without a window: give the user this address to open in a browser, prompts from wait_for_user appear there"
	if st.Agent.Desktop {
		ui = "the Siphon app window"
	}
	return pretty(map[string]any{
		"siphon":             map[string]any{"version": st.Version, "ui": ui, "dataDir": st.DataDir, "manualProxy": st.Proxy},
		"adb":                a.ADB,
		"devices":            a.Devices,
		"sessions":           sessions,
		"traffic":            map[string]any{"lastSeq": st.Traffic.LastSeq},
		"waitingUserPrompts": asks,
		"next":               next,
	}), nil
}

func logTail(log []intercept.LogLine, n int) []string {
	if len(log) > n {
		log = log[len(log)-n:]
	}
	out := make([]string, len(log))
	for i, l := range log {
		out[i] = l.Level + ": " + l.Text
	}
	return out
}

func (t *toolbox) installADB(ctx context.Context, _ json.RawMessage) (string, error) {
	if a, err := t.android(ctx); err != nil {
		return "", err
	} else if a.ADB.Found {
		return "adb is already available: " + a.ADB.Path, nil
	}
	if _, err := t.c.do(ctx, "POST", "/api/android/adb/download", nil, nil); err != nil {
		return "", err
	}
	deadline := time.Now().Add(5 * time.Minute)
	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-time.After(time.Second):
		}
		a, err := t.android(ctx)
		if err != nil {
			return "", err
		}
		if a.ADB.Found && !a.ADB.Downloading {
			return "adb installed: " + a.ADB.Path, nil
		}
		if !a.ADB.Downloading && a.ADB.Error != "" {
			return "", errors.New(a.ADB.Error)
		}
	}
	return "", errors.New("adb download is still running; check status later")
}

type emulatorList struct {
	Emulator struct {
		Found bool   `json:"found"`
		Path  string `json:"path"`
		Error string `json:"error"`
	} `json:"emulator"`
	AVDs []intercept.EmulatorView `json:"avds"`
}

func (t *toolbox) listEmulators(ctx context.Context, _ json.RawMessage) (string, error) {
	var l emulatorList
	if _, err := t.c.do(ctx, "GET", "/api/android/emulators", nil, &l); err != nil {
		return "", err
	}
	return pretty(l), nil
}

const noRootableAVD = `No rootable AVD. Create one with a "Google APIs" image (not "Google Play"), for example:
  sdkmanager "system-images;android-34;google_apis;arm64-v8a"   (x86_64 on Intel/AMD)
  avdmanager create avd -n Siphon_API34 -k "system-images;android-34;google_apis;arm64-v8a" -d pixel_7
Both tools are in the Android SDK cmdline-tools. Then call start_emulator again.`

func (t *toolbox) startEmulator(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		Name       string `json:"name"`
		Headless   bool   `json:"headless"`
		ColdBoot   bool   `json:"coldBoot"`
		TimeoutSec int    `json:"timeoutSec"`
	}](raw)
	if err != nil {
		return "", err
	}
	if args.Name == "" {
		var l emulatorList
		if _, err := t.c.do(ctx, "GET", "/api/android/emulators", nil, &l); err != nil {
			return "", err
		}
		if !l.Emulator.Found {
			return "", errors.New(l.Emulator.Error)
		}
		for _, v := range l.AVDs {
			if v.Rootable && v.State != "stopped" {
				args.Name = v.Name
				break
			}
		}
		for _, v := range l.AVDs {
			if args.Name == "" && v.Rootable {
				args.Name = v.Name
			}
		}
		if args.Name == "" {
			return "", errors.New(noRootableAVD)
		}
	}
	wait := waitSeconds(args.TimeoutSec, 300)
	var v intercept.EmulatorView
	status, err := t.c.do(ctx, "POST", fmt.Sprintf("/api/android/emulators/%s/start?wait=%d", url.PathEscape(args.Name), wait),
		map[string]bool{"headless": args.Headless, "coldBoot": args.ColdBoot}, &v)
	if err != nil {
		return "", err
	}
	if status != 200 {
		return pretty(v) + "\n\nStill booting after " + strconv.Itoa(wait) + " s: call start_emulator again to keep waiting.", nil
	}
	note := ""
	if !v.Rootable {
		note = "\n\nWarning: this AVD has Play Store, adb cannot get root there, so prepare_device will fail. Prefer a Google APIs image."
	}
	return pretty(v) + "\n\nBooted. Next: prepare_device with serial " + v.Serial + "." + note, nil
}

func (t *toolbox) prepareDevice(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		Serial     string `json:"serial"`
		TimeoutSec int    `json:"timeoutSec"`
	}](raw)
	if err != nil {
		return "", err
	}
	serial, err := t.serial(ctx, args.Serial)
	if err != nil {
		return "", err
	}
	wait := waitSeconds(args.TimeoutSec, 300)
	var dev intercept.DeviceView
	status, err := t.c.do(ctx, "POST", fmt.Sprintf("/api/android/devices/%s/prepare?wait=%d", url.PathEscape(serial), wait), nil, &dev)
	if err != nil {
		return "", err
	}
	if status != 200 {
		return fmt.Sprintf("Preparation of %s is still running after %d s: check status and call prepare_device again.", serial, wait), nil
	}
	return pretty(dev) + "\n\nFrida is running. Next: list_apps, then start_intercept.", nil
}

func (t *toolbox) listApps(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		Serial string `json:"serial"`
		Query  string `json:"query"`
	}](raw)
	if err != nil {
		return "", err
	}
	serial, err := t.serial(ctx, args.Serial)
	if err != nil {
		return "", err
	}
	var apps []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		PID  uint32 `json:"pid"`
	}
	if _, err := t.c.do(ctx, "GET", "/api/android/devices/"+url.PathEscape(serial)+"/apps", nil, &apps); err != nil {
		return "", err
	}
	q := strings.ToLower(args.Query)
	var b strings.Builder
	n := 0
	for _, a := range apps {
		if q != "" && !strings.Contains(strings.ToLower(a.ID), q) && !strings.Contains(strings.ToLower(a.Name), q) {
			continue
		}
		n++
		fmt.Fprintf(&b, "%s — %s", a.ID, a.Name)
		if a.PID != 0 {
			fmt.Fprintf(&b, " (running, pid %d)", a.PID)
		}
		b.WriteByte('\n')
	}
	if n == 0 {
		return fmt.Sprintf("No apps on %s match %q.", serial, args.Query), nil
	}
	return fmt.Sprintf("%d apps on %s:\n%s", n, serial, b.String()), nil
}

func (t *toolbox) startIntercept(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		AppID      string `json:"appId"`
		Serial     string `json:"serial"`
		Mode       string `json:"mode"`
		SafeMode   bool   `json:"safeMode"`
		TimeoutSec int    `json:"timeoutSec"`
	}](raw)
	if err != nil {
		return "", err
	}
	if args.AppID == "" {
		return "", errors.New("appId is required")
	}
	serial, err := t.serial(ctx, args.Serial)
	if err != nil {
		return "", err
	}
	wait := waitSeconds(args.TimeoutSec, 180)
	var s intercept.SessionInfo
	req := intercept.StartRequest{Serial: serial, AppID: args.AppID, Mode: args.Mode, SafeMode: args.SafeMode}
	if _, err := t.c.do(ctx, "POST", fmt.Sprintf("/api/android/sessions?wait=%d", wait), req, &s); err != nil {
		return "", err
	}
	out := map[string]any{"id": s.ID, "appId": s.AppID, "serial": s.Serial, "mode": s.Mode, "state": s.State,
		"pid": s.PID, "error": s.Error, "log": logTail(s.Log, 15)}
	switch s.State {
	case "running":
		return pretty(out) + "\n\nHooks are active. Next: wait_for_user (ask the user to use the app), then list_traffic.", nil
	case "starting":
		return pretty(out) + "\n\nStill starting: check status in a moment.", nil
	}
	return "", errors.New(pretty(out) + "\n\nInterception failed; the log above explains why. If the app crashed, retry with safeMode=true.")
}

func (t *toolbox) stopIntercept(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		SessionID string `json:"sessionId"`
	}](raw)
	if err != nil {
		return "", err
	}
	ids := []string{args.SessionID}
	if args.SessionID == "" {
		a, err := t.android(ctx)
		if err != nil {
			return "", err
		}
		ids = nil
		for _, s := range a.Sessions {
			if s.State == "running" || s.State == "starting" {
				ids = append(ids, s.ID)
			}
		}
		if len(ids) == 0 {
			return "No active sessions.", nil
		}
	}
	for _, id := range ids {
		if _, err := t.c.do(ctx, "POST", "/api/android/sessions/"+url.PathEscape(id)+"/stop", nil, nil); err != nil {
			return "", fmt.Errorf("%s: %w", id, err)
		}
	}
	return "Stopped: " + strings.Join(ids, ", "), nil
}

// ---------- пользователь и трафик ----------

type ask struct {
	ID      string `json:"id"`
	State   string `json:"state"`
	Reply   string `json:"reply"`
	LastSeq uint64 `json:"lastSeq"`
}

func (t *toolbox) waitForUser(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		Message    string `json:"message"`
		AskID      string `json:"askId"`
		TimeoutSec int    `json:"timeoutSec"`
	}](raw)
	if err != nil {
		return "", err
	}
	wait := waitSeconds(args.TimeoutSec, 600)
	var a ask
	switch {
	case args.AskID != "":
		_, err = t.c.do(ctx, "GET", fmt.Sprintf("/api/agent/asks/%s?wait=%d", url.PathEscape(args.AskID), wait), nil, &a)
	case strings.TrimSpace(args.Message) != "":
		_, err = t.c.do(ctx, "POST", fmt.Sprintf("/api/agent/asks?wait=%d", wait), map[string]string{"message": args.Message}, &a)
	default:
		return "", errors.New("pass message (or askId to keep waiting)")
	}
	if err != nil {
		return "", err
	}
	out := map[string]any{"askId": a.ID, "state": a.State, "lastSeq": a.LastSeq}
	if a.Reply != "" {
		out["reply"] = a.Reply
	}
	if a.State == "waiting" {
		return pretty(out) + "\n\nThe user has not pressed Done yet. Call wait_for_user with askId to keep waiting.", nil
	}
	var list []capture.Exchange
	if _, err := t.c.do(ctx, "GET", fmt.Sprintf("/api/exchanges?since=%d", a.LastSeq), nil, &list); err == nil {
		out["newExchanges"] = len(list)
		out["byHost"] = hostSummary(list, 15)
	}
	hint := fmt.Sprintf("\n\nNext: list_traffic with since=%d.", a.LastSeq)
	if a.State != "done" {
		hint = "\n\nThe user did not confirm (" + a.State + "). Ask in the chat what to do."
	}
	return pretty(out) + hint, nil
}

func hostSummary(list []capture.Exchange, n int) []string {
	count := map[string]int{}
	for _, e := range list {
		count[e.Host]++
	}
	hosts := make([]string, 0, len(count))
	for h := range count {
		hosts = append(hosts, h)
	}
	sort.Slice(hosts, func(i, j int) bool { return count[hosts[i]] > count[hosts[j]] })
	if len(hosts) > n {
		hosts = hosts[:n]
	}
	for i, h := range hosts {
		hosts[i] = fmt.Sprintf("%s ×%d", h, count[h])
	}
	return hosts
}

func trafficPath(filter string, since uint64, wait int) string {
	v := url.Values{}
	if filter != "" {
		v.Set("filter", filter)
	}
	if since > 0 {
		v.Set("since", strconv.FormatUint(since, 10))
	}
	if wait > 0 {
		v.Set("wait", strconv.Itoa(wait))
	}
	return "/api/exchanges?" + v.Encode()
}

func (t *toolbox) waitForTraffic(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		Filter     string  `json:"filter"`
		Since      *uint64 `json:"since"`
		Limit      int     `json:"limit"`
		TimeoutSec int     `json:"timeoutSec"`
	}](raw)
	if err != nil {
		return "", err
	}
	var since uint64
	if args.Since != nil {
		since = *args.Since
	} else {
		var st struct {
			Traffic struct {
				LastSeq uint64 `json:"lastSeq"`
			} `json:"traffic"`
		}
		if _, err := t.c.do(ctx, "GET", "/api/state", nil, &st); err != nil {
			return "", err
		}
		since = st.Traffic.LastSeq
	}
	wait := waitSeconds(args.TimeoutSec, 120)
	var list []capture.Exchange
	if _, err := t.c.do(ctx, "GET", trafficPath(args.Filter, since, wait), nil, &list); err != nil {
		return "", err
	}
	done := 0
	for _, e := range list {
		if e.State != capture.StatePending {
			done++
		}
	}
	if done == 0 {
		return fmt.Sprintf("Nothing matching %q after seq %d within %d s. Call again to keep waiting.", args.Filter, since, wait), nil
	}
	return rows(list, args.Limit, 50), nil
}

func (t *toolbox) listTraffic(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		Filter string `json:"filter"`
		Since  uint64 `json:"since"`
		Limit  int    `json:"limit"`
	}](raw)
	if err != nil {
		return "", err
	}
	var list []capture.Exchange
	if _, err := t.c.do(ctx, "GET", trafficPath(args.Filter, args.Since, 0), nil, &list); err != nil {
		return "", err
	}
	if len(list) == 0 {
		return "No exchanges match.", nil
	}
	return rows(list, args.Limit, 100), nil
}

func rows(list []capture.Exchange, limit, def int) string {
	if limit <= 0 {
		limit = def
	}
	var b strings.Builder
	if len(list) > limit {
		fmt.Fprintf(&b, "%d exchanges match, showing the newest %d (use since/filter to narrow):\n", len(list), limit)
		list = list[len(list)-limit:]
	} else {
		fmt.Fprintf(&b, "%d exchanges:\n", len(list))
	}
	for _, e := range list {
		b.WriteString(row(e))
		b.WriteByte('\n')
	}
	return strings.TrimRight(b.String(), "\n")
}

func fmtBytes(n int64) string {
	switch {
	case n < 1024:
		return fmt.Sprintf("%d B", n)
	case n < 1<<20:
		return fmt.Sprintf("%.1f KB", float64(n)/1024)
	}
	return fmt.Sprintf("%.1f MB", float64(n)/(1<<20))
}

// row — одна запись в строку: «#12 POST 200 https://… json ↑120 B ↓1.3 KB 230 ms com.app».
func row(e capture.Exchange) string {
	u := e.URL
	if u == "" {
		u = e.Host
		if e.Port != 0 {
			u += ":" + strconv.Itoa(e.Port)
		}
	}
	parts := []string{"#" + e.ID, capture.MethodLabel(e), capture.StatusText(e), u}
	if e.Response != nil {
		if t := capture.ShortType(e.Response.ContentType); t != "" {
			parts = append(parts, t)
		}
	}
	switch {
	case e.Kind == capture.KindRaw || e.Kind == capture.KindWebSocket:
		parts = append(parts, "↑"+fmtBytes(e.BytesOut), "↓"+fmtBytes(e.BytesIn))
		if e.FrameCount > 0 {
			parts = append(parts, strconv.Itoa(e.FrameCount)+" frames")
		}
	case e.Request != nil:
		parts = append(parts, "↑"+fmtBytes(e.Request.Size))
		if e.Response != nil {
			parts = append(parts, "↓"+fmtBytes(e.Response.Size))
		}
	}
	if e.Timing.End > 0 {
		parts = append(parts, fmt.Sprintf("%.0f ms", e.Timing.End))
	}
	if e.Source != "" {
		parts = append(parts, e.Source)
	}
	if e.State == capture.StatePaused {
		parts = append(parts, "[paused on "+e.Breakpoint+" breakpoint]")
	}
	if e.Rule != "" {
		parts = append(parts, "[rule: "+e.Rule+"]")
	}
	if e.Error != "" {
		parts = append(parts, "error: "+e.Error)
	}
	return strings.Join(parts, " ")
}

// cut обрезает строку до n символов, не разрывая UTF-8.
func cut(s string, n int) (string, bool) {
	if len(s) <= n {
		return s, false
	}
	for n > 0 && !utf8.RuneStart(s[n]) {
		n--
	}
	return s[:n], true
}

func trimBody(m *capture.ExportMessage, max int) {
	if m == nil {
		return
	}
	note := func(total int) string {
		return fmt.Sprintf("\n…[cut to %d of %d characters; export_traffic saves the full body]", max, total)
	}
	if len(m.JSON) > max {
		total := len(m.JSON)
		m.Text, _ = cut(string(m.JSON), max)
		m.Text += note(total)
		m.JSON = nil
	}
	if s, cutted := cut(m.Text, max); cutted {
		m.Text = s + note(len(m.Text))
	}
	if s, cutted := cut(m.Base64, max); cutted {
		m.Base64 = s + note(len(m.Base64))
	}
}

func (t *toolbox) getExchange(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		ID           string `json:"id"`
		MaxBodyChars int    `json:"maxBodyChars"`
	}](raw)
	if err != nil {
		return "", err
	}
	id := strings.TrimPrefix(args.ID, "#")
	if id == "" {
		return "", errors.New("id is required")
	}
	var doc capture.Export
	if _, err := t.c.do(ctx, "GET", "/api/export/json?ids="+url.QueryEscape(id), nil, &doc); err != nil {
		return "", err
	}
	if len(doc.Exchanges) == 0 {
		return "", fmt.Errorf("exchange %s not found (deleted or cleared?)", id)
	}
	x := doc.Exchanges[0]
	max := args.MaxBodyChars
	if max <= 0 {
		max = 20000
	}
	trimBody(x.Request, max)
	trimBody(x.Response, max)
	if len(x.Frames) > 50 {
		x.Frames = x.Frames[len(x.Frames)-50:]
	}
	for i := range x.Frames {
		x.Frames[i].Text, _ = cut(x.Frames[i].Text, 2000)
		x.Frames[i].Base64, _ = cut(x.Frames[i].Base64, 2000)
	}
	return pretty(x), nil
}

func (t *toolbox) exportTraffic(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		Path   string   `json:"path"`
		Format string   `json:"format"`
		Filter string   `json:"filter"`
		Since  uint64   `json:"since"`
		IDs    []string `json:"ids"`
	}](raw)
	if err != nil {
		return "", err
	}
	format := strings.ToLower(args.Format)
	if format == "" {
		format = "json"
	}
	if format != "json" && format != "har" {
		return "", errors.New(`format must be "json" or "har"`)
	}
	path := args.Path
	if path == "" {
		path = "siphon-" + time.Now().Format("20060102-150405") + "." + format
	}
	if path, err = filepath.Abs(path); err != nil {
		return "", err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", err
	}
	body := map[string]any{"ids": args.IDs, "since": args.Since, "filter": args.Filter}
	count, size, err := t.c.download(ctx, "/api/export/"+format, body, path)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("Saved %s exchanges to %s (%s, %s).", count, path, strings.ToUpper(format), fmtBytes(size)), nil
}

func (t *toolbox) getRules(ctx context.Context, _ json.RawMessage) (string, error) {
	var list []map[string]any
	if _, err := t.c.do(ctx, "GET", "/api/rules", nil, &list); err != nil {
		return "", err
	}
	if len(list) == 0 {
		return "No rules.", nil
	}
	return pretty(list), nil
}

func (t *toolbox) setRules(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		Rules []json.RawMessage `json:"rules"`
	}](raw)
	if err != nil {
		return "", err
	}
	if args.Rules == nil {
		args.Rules = []json.RawMessage{}
	}
	var list []map[string]any
	if _, err := t.c.do(ctx, "PUT", "/api/rules", args.Rules, &list); err != nil {
		return "", err
	}
	return fmt.Sprintf("%d rules active:\n%s", len(list), pretty(list)), nil
}

func (t *toolbox) clearTraffic(ctx context.Context, raw json.RawMessage) (string, error) {
	args, err := decode[struct {
		KeepPinned *bool `json:"keepPinned"`
	}](raw)
	if err != nil {
		return "", err
	}
	keep := args.KeepPinned == nil || *args.KeepPinned
	if _, err := t.c.do(ctx, "POST", "/api/exchanges/clear", map[string]bool{"keepPinned": keep}, nil); err != nil {
		return "", err
	}
	return "Traffic cleared.", nil
}
