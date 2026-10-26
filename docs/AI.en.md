# Siphon and AI agents

Siphon can act as an MCP server ([Model Context Protocol](https://modelcontextprotocol.io)). Connect it to
Claude Code, Cursor, Codex or another agent, and the agent will:

1. start an Android emulator (it picks an image that has root);
2. prepare the device: install and start frida-server;
3. start intercepting the app you name;
4. ask you to do something in the app (log in, open a screen, reproduce a bug) and wait until you press Done;
5. read the decrypted traffic and do what you asked: describe the API, write a client, find a bug, save the traffic as JSON.

Example request to the agent:

> Start an emulator and intercept `com.example.shop`. I'll log in and add an item to the cart.
> Then describe the auth and cart API and write a Python client for it.

## Setup

Siphon shows the exact command for your system in **Settings → AI agents** (the button copies it).

**Claude Code** (macOS):

```sh
claude mcp add --scope user siphon -- /Applications/Siphon.app/Contents/MacOS/Siphon mcp
```

Linux: `claude mcp add --scope user siphon -- ~/.local/bin/siphon mcp`.
Windows: the path to `Siphon.exe` with the `mcp` argument.

**Other clients** (Cursor, Claude Desktop, etc.) use a stdio server:

```json
{
  "mcpServers": {
    "siphon": { "command": "/Applications/Siphon.app/Contents/MacOS/Siphon", "args": ["mcp"] }
  }
}
```

**Codex** (`~/.codex/config.toml`):

```toml
[mcp_servers.siphon]
command = "/Applications/Siphon.app/Contents/MacOS/Siphon"
args = ["mcp"]
```

From source: `go build -o bin/siphon ./cmd/siphon`, then `bin/siphon mcp`.

How it works: `Siphon mcp` opens no window. It is a thin client for the HTTP API of a running Siphon. It reads the
API address from `endpoint.json` in the data folder. If Siphon is not running, the MCP server starts the app.
The CLI build starts without opening a browser; the agent gets the UI address from `status` and passes it to you.
To set the address explicitly, use `siphon mcp --url http://127.0.0.1:8484` or the `SIPHON_URL` variable.

## Workflow

| Step | Tool | What happens |
|---|---|---|
| 1 | `status` | What is running, plus a hint for the next step (`next`) |
| 2 | `list_emulators` → `start_emulator` | Starts an AVD and waits until Android has fully booted. Without a name, an AVD with `rootable: true` is picked |
| 3 | `prepare_device` | Root, frida-server install and start |
| 4 | `list_apps` → `start_intercept` | Intercepts the app; `spawn` mode restarts it with hooks from launch |
| 5 | `wait_for_user` | A banner in the Siphon window with your task and a Done button; the agent waits for it |
| 6 | `list_traffic` → `get_exchange` | Traffic after the request (`since=lastSeq`), headers and decoded bodies |
| 7 | `export_traffic` | Saves the selection as JSON or HAR |

Interception needs root: an emulator with a **Google APIs** image (no Google Play) or a phone with Magisk.
If there is no suitable AVD, `start_emulator` gives the agent the `sdkmanager` and `avdmanager` commands to create one.

### Prompts for the user

`wait_for_user` shows an "AI agent is waiting for you" banner in the Siphon window with the task. Do it in the app and
press **Done**. The comment field lets you tell the agent something, e.g. "captcha, logged in via SMS".
**Cancel** tells the agent you declined; it will ask in the chat what to do next.

The agent gets `state` (`done`, `cancelled` or `expired`), your comment and `lastSeq`: everything you did after the
prompt has `seq > lastSeq`. If the agent stops waiting (the call is cancelled or crashes), the banner goes away after a minute.

## Tools

| Tool | Arguments | Result |
|---|---|---|
| `status` | — | version, adb, devices, sessions, `traffic.lastSeq`, waiting prompts, `next` |
| `install_adb` | — | downloads Google's platform-tools (≈15 MB) when adb is missing |
| `list_emulators` | — | AVDs: `state` (stopped, starting, booting, running), `serial`, `rootable`, `playStore` |
| `start_emulator` | `name?`, `headless?`, `coldBoot?`, `timeoutSec?` (300) | waits for `sys.boot_completed`; a running AVD is reused |
| `prepare_device` | `serial?`, `timeoutSec?` (300) | device with `info.frida = running` |
| `list_apps` | `serial?`, `query?` | `id — name (running, pid)` |
| `start_intercept` | `appId`, `serial?`, `mode?` (spawn, attach), `safeMode?`, `timeoutSec?` (180) | session and log tail; on failure an error with the log |
| `stop_intercept` | `sessionId?` | without an id stops all active sessions |
| `wait_for_user` | `message` or `askId`, `timeoutSec?` (600) | `state`, `reply`, `lastSeq`, number of new exchanges and hosts |
| `wait_for_traffic` | `filter?`, `since?`, `limit?`, `timeoutSec?` (120) | waits for a finished exchange matching the filter |
| `list_traffic` | `filter?`, `since?`, `limit?` (100) | one line per exchange: `#id method status URL type ↑↓size time app` |
| `get_exchange` | `id`, `maxBodyChars?` (20000) | the full exchange in export format; long bodies are cut |
| `export_traffic` | `path?`, `format?` (json, har), `filter?`, `since?`, `ids?` | file path and number of exchanges |
| `get_rules` / `set_rules` | `rules` | rules: mock, redirect, header and body edits, delay, reset, breakpoints |
| `clear_traffic` | `keepPinned?` (true) | clears traffic |

`serial` may be omitted when one device is connected. All waits are capped at 15 minutes. On timeout a tool returns
the current state and can be called again.

The filter is the same as in Siphon's search box: words match method, URL, status and app;
`host:api path:/v1 method:post status:4xx type:json src:com.app kind:websocket is:error is:pending`, `-word` excludes.

## JSON export format

The **JSON** button on the traffic page (or in an exchange's header), the `export_traffic` tool and `/api/export/json`
all produce the same `siphon/v1` format:

```json
{
  "format": "siphon/v1",
  "creator": { "name": "Siphon", "version": "0.2.0" },
  "exported": "2026-10-26T15:44:31Z",
  "count": 1,
  "exchanges": [
    {
      "id": "2", "seq": 2, "kind": "http", "state": "done", "source": "com.example.shop",
      "started": "2026-10-26T18:44:31.5+03:00",
      "method": "POST", "url": "https://api.example.com/v1/login", "host": "api.example.com", "proto": "HTTP/2.0",
      "timing": { "requestDone": 0.1, "responseStart": 159.2, "end": 159.3 },
      "request": {
        "headers": [{ "name": "Content-Type", "value": "application/json" }],
        "size": 22, "contentType": "application/json",
        "json": { "login": "demo", "password": "…" }
      },
      "response": {
        "status": 200, "statusText": "OK", "headers": [], "size": 450, "contentType": "application/json", "encoding": "gzip",
        "json": { "token": "…" }
      }
    }
  ]
}
```

- Bodies are already decoded (gzip, br, zstd, deflate) and stored in exactly one field: `json` (valid JSON),
  `text` (UTF-8) or `base64` (binary). `size` and `encoding` describe the body as it was on the wire.
- `decodeError`: the encoding could not be removed; `base64` holds the original bytes.
- WebSocket and TCP: `frames` with `dir` (`out` from the app, `in` to it), `kind`, `time`, `text` or `base64`.
- Other fields match `GET /api/exchanges/{id}`: TLS details, the matched rule (`rule`), `edited`, `pinned`.
- `truncated: true` means the body exceeded the limit and was not stored in full; `bodyEvicted: true` means it was dropped from memory.

## HTTP API for agents without MCP

An agent that can only run commands can use `curl`. The API accepts connections from `127.0.0.1` only.
Its address is in `endpoint.json` in the data folder:
macOS `~/Library/Application Support/Siphon`, Linux `~/.config/Siphon`, Windows `%AppData%\Siphon`.

```sh
S=$(python3 -c 'import json,os;print(json.load(open(os.path.expanduser("~/Library/Application Support/Siphon/endpoint.json")))["url"])')

curl -s "$S/api/android/emulators"                                        # AVDs and their state
curl -s -X POST "$S/api/android/emulators/Siphon_API34/start?wait=300"     # start and wait for boot
curl -s -X POST "$S/api/android/devices/emulator-5554/prepare?wait=300"    # frida-server
curl -s "$S/api/android/devices/emulator-5554/apps"
curl -s -X POST "$S/api/android/sessions?wait=180" -d '{"serial":"emulator-5554","appId":"com.example.shop"}'
curl -s -X POST "$S/api/agent/asks?wait=600" -d '{"message":"Log in and press Done"}'
curl -s "$S/api/exchanges?since=12&filter=host:api"                        # traffic after the prompt
curl -s "$S/api/export/json?since=12" -o traffic.json
```

`?wait=SEC` makes a call blocking (15 minutes at most). 200 means done, 202 means the time ran out and it is not ready
yet: call again (for a prompt, `GET /api/agent/asks/{id}?wait=SEC`).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/state` | version, proxy, adb, `traffic.lastSeq` |
| GET | `/api/android` | adb, devices, sessions with logs |
| POST | `/api/android/adb/download` | download platform-tools |
| GET | `/api/android/emulators` | AVDs with state |
| POST | `/api/android/emulators/{name}/start?wait=` | body `{"headless":false,"coldBoot":false}` |
| POST | `/api/android/devices/{serial}/prepare?wait=` | prepare the device |
| GET | `/api/android/devices/{serial}/apps` | apps |
| POST | `/api/android/sessions?wait=` | `{"serial","appId","mode":"spawn","safeMode":false}` |
| POST | `/api/android/sessions/{id}/stop` | stop interception |
| GET | `/api/exchanges?since=&filter=&ids=&limit=&wait=` | list without bodies; `wait` waits for a finished exchange in the selection |
| GET | `/api/exchanges/{id}/body?side=request\|response` | body (decoded; `raw=1` as on the wire) |
| GET | `/api/exchanges/{id}/curl` | cURL command |
| GET, POST | `/api/export/json`, `/api/export/har` | export; selection in the query or the body `{"ids":[],"since":0,"filter":""}` |
| GET, PUT | `/api/rules` | the whole rule list |
| POST | `/api/exchanges/{id}/resume`, `/drop` | release or drop an exchange paused on a breakpoint |
| POST | `/api/exchanges/clear` | `{"keepPinned":true}` |
| GET, POST | `/api/agent/asks` | waiting prompts; create a prompt `{"message"}` (`?wait=`) |
| GET, DELETE | `/api/agent/asks/{id}` | state (`?wait=`); withdraw a prompt |

## Security and limitations

- The agent sees all intercepted traffic, including passwords, tokens and cookies. Do not intercept other people's
  accounts, and do not connect an agent you would not show this data to.
- The API listens on `127.0.0.1` only and rejects requests from other websites. Local programs can reach it.
- Tested on macOS with an Android 14 arm64 emulator (Google APIs) and Chrome: the agent started interception over MCP,
  waited for Done and read the decrypted requests. `Siphon.exe mcp` has not been tested on Windows yet: it is a
  GUI app, and not every client gives it stdio. If it does not work, use the HTTP API.
- An emulator started by Siphon keeps running after Siphon exits. Its output goes to `logs/` in the data folder.

← [README](../README.en.md) · [Русский](AI.md)
