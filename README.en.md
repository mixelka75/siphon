<div align="center">

<img src="desktop/build/appicon.png" width="112" alt="Siphon">

# siphon.

**HTTP(S) traffic inspector for Android apps.**<br>
Pick an app — see all of its requests in plain text. No manual certificate setup.

[![Release](https://img.shields.io/github/v/release/mixelka75/siphon?style=flat-square&color=ff4f1a&labelColor=121212)](https://github.com/mixelka75/siphon/releases/latest)
[![Build](https://img.shields.io/github/actions/workflow/status/mixelka75/siphon/build.yml?style=flat-square&labelColor=121212)](https://github.com/mixelka75/siphon/actions)
![Platforms](https://img.shields.io/badge/macOS%20%C2%B7%20Windows%20%C2%B7%20Linux-121212?style=flat-square)

[Русский](README.md) · **English**

<picture>
  <source media="(prefers-color-scheme: light)" srcset="docs/screenshots/traffic-light.png">
  <img src="docs/screenshots/traffic-dark.png" alt="Siphon: request list and response details" width="920">
</picture>

</div>

## What is it

Siphon runs [Frida](https://frida.re) on an Android device, routes the chosen app's traffic through itself and bypasses
certificate pinning. You see requests and responses, can edit them on the fly, mock server replies and export traffic as HAR or JSON.
It is a native desktop window (not a browser tab) and everything stays on your machine.

- **One-click interception** — connect a phone or emulator, pick an app, hit "Intercept".
- **Sets itself up** — Siphon downloads `adb` and `frida-server` for you if they are missing.
- **Rules and breakpoints** — mock, redirect, edit headers/bodies, delay, drop; pause on a request or response.
- **Any client** — besides Android it is a plain HTTP/HTTPS/SOCKS5 proxy for browsers, Postman, simulators.
- **Smart viewer** — JSON, forms, images, hex; gzip/brotli/zstd; HTTP/2, WebSocket, SSE, gRPC; HAR, JSON and cURL export.
- **AI agents** — a built-in MCP server: the agent starts the emulator and interception, asks you to go through a scenario in the app and analyzes the traffic.

## Install

Grab a build from [**Releases**](https://github.com/mixelka75/siphon/releases/latest).

| OS | File | Requirements |
|---|---|---|
| **macOS** 13+ (Apple Silicon & Intel) | `Siphon-macOS-universal.dmg` | — |
| **Windows** 10/11 x64 | `Siphon-Windows-x64.zip` | [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled on Windows 11) |
| **Linux** x64 (Debian 12 / Ubuntu 24.04+) | `Siphon-Linux-x64.tar.gz` | `libgtk-3-0`, `libwebkit2gtk-4.1-0` |

### macOS

**Easiest** — one command in Terminal (downloads, installs into Applications and launches):

```sh
curl -fsSL https://raw.githubusercontent.com/mixelka75/siphon/main/install.sh | sh
```

**Or manually:** open the `.dmg` and drag Siphon into Applications.

The app is not signed with a paid Apple Developer ID, so macOS stops it on first launch:

- **"Apple could not verify Siphon is free of malware"** — open **System Settings → Privacy & Security** and click
  **"Open Anyway"** at the bottom. On macOS 13/14 right-click the app → **Open** is enough.
- **"Siphon is damaged and can't be opened"** — this is the same quarantine flag, the file is fine. Remove it:

  ```sh
  xattr -dr com.apple.quarantine /Applications/Siphon.app
  ```

One-time step; afterwards it opens like any other app.

### Windows

Unzip and run `Siphon.exe`. If SmartScreen says "Windows protected your PC" — **More info → Run anyway** (the build is unsigned).
A physical phone needs your vendor's USB driver (for Pixel: [Google USB Driver](https://developer.android.com/studio/run/win-usb)); emulators need none.

### Linux

```sh
sudo apt install libgtk-3-0 libwebkit2gtk-4.1-0     # dependencies
tar xzf Siphon-Linux-x64.tar.gz && cd Siphon-Linux-x64 && ./install.sh
```

Installs into `~/.local` (no sudo) and adds a launcher entry. The one-liner above works on Linux too.

## Quick start

1. Start an emulator or plug in a phone with USB debugging enabled.
2. Open **Android → Prepare device**. If `adb` is not installed, Siphon offers to download Google's official
   platform-tools (~15 MB) — click "Download".
3. Pick an app and press **Intercept**. "Restart" injects hooks from the very start of the app.
4. Switch to **Traffic**. Requests show up on their own.

> **Root is required.** Use a **Google APIs** emulator image (without Google Play) or a rooted/Magisk phone.
> No need to install a certificate on the phone.

## AI agents

Siphon is an MCP server for Claude Code, Cursor, Codex and other agents. Setup for Claude Code (macOS):

```sh
claude mcp add --scope user siphon -- /Applications/Siphon.app/Contents/MacOS/Siphon mcp
```

Then just ask: "Start an emulator, intercept `com.example.shop`, I'll log in, then describe the API and write a client".
The agent starts the emulator, prepares the device and turns on interception. Then it shows a banner in the Siphon
window and waits until you press Done. After that it reads the decrypted traffic.
The command for your system is in **Settings → AI agents**; details and the HTTP API for agents without MCP are in [docs/AI.en.md](docs/AI.en.md).

## Shortcuts and filters

| | |
|---|---|
| `⌘1`…`⌘4` / `Ctrl+1`…`4` | sections: Traffic, Android, Rules, Settings |
| `⌘K` / `Ctrl+K` | search traffic |
| `↑` `↓`, `Delete` | navigate / delete a request |

Filter: `host:api status:4xx method:post type:json src:com.app is:error -word`

## Troubleshooting

| Symptom | What to do |
|---|---|
| Device not listed | Enable USB debugging and accept the key on the phone; install a USB driver on Windows; add [udev rules](https://developer.android.com/studio/run/device#setting-up) on Linux |
| "Root required" | Use a Google APIs emulator (no Play Store) or a Magisk phone |
| App crashes while intercepted | Turn on **"Compatible TLS"** on the interception card |
| Emulator hangs after Frida | **"Recover Android"** button on the Android page |
| Some requests show as "TLS passthrough" | The app pinned its certificate; that is not a decrypted request. Try "Restart" mode |

More on interception, the 2GIS profile and Frida recovery: [docs/ANDROID.en.md](docs/ANDROID.en.md).

## Build from source

Requires Go 1.27.3+ and Node 22+. Native builds: Xcode Command Line Tools on macOS; GCC, pkg-config, GTK 3 and
WebKitGTK 4.1 (`-dev`) on Linux. Wails is pinned to 2.17.0.

```sh
make setup             # UI npm dependencies
make test              # vet, Go race tests, TypeScript
make native            # native app for the current OS
make native-windows    # Siphon.exe
make native-linux      # Docker → bin/linux-amd64/siphon
make build             # bin/siphon: browser mode (127.0.0.1:8484)
```

**Releases are built by GitHub Actions.** Just push a tag:

```sh
git tag v0.3.0 && git push origin v0.3.0
```

The pipeline builds macOS (universal, ad-hoc signed, `.dmg` and `.zip`), Windows and Linux, computes `SHA256SUMS.txt`
and publishes the release. Every push to `main` also builds all three platforms (artifacts under the Actions tab).

## Limitations

- The UI lives in the system WebView (React), not a separate SwiftUI/WinUI/GTK implementation.
- No iOS, arbitrary request editor (resend) or code generation yet.
- The upstream proxy does not apply to WebSocket and raw TCP.
- No Frida version can promise to bypass pinning in every app.
- Binaries are not signed with Apple/Microsoft certificates. The macOS build carries a local ad-hoc signature.

Data: macOS `~/Library/Application Support/Siphon`, Linux `~/.config/Siphon`, Windows `%AppData%\Siphon`
(override with `SIPHON_DATA_DIR`). Finished traffic is kept in memory — export HAR or JSON to keep it.

## Repository layout and licenses

`cmd/siphon` — CLI · `desktop` — native window · `internal/proxy`, `rules`, `capture` — traffic ·
`internal/adb`, `frida`, `intercept`, `fridascripts` — Android · `internal/api` — local API · `ui` — interface.

`internal/fridascripts/scripts` bundles [HTTP Toolkit](https://github.com/httptoolkit/frida-interception-and-unpinning)
scripts (AGPL-3.0-or-later) with their LICENSE and source notes. `native-openssl-trust.js` is Siphon's own.
