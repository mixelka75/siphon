# Siphon и ИИ-агенты

Siphon умеет работать как MCP-сервер ([Model Context Protocol](https://modelcontextprotocol.io)). Подключите его к
Claude Code, Cursor, Codex или другому агенту, и агент сам:

1. запустит эмулятор Android (выберет образ, на котором есть root);
2. подготовит устройство: поставит и запустит frida-server;
3. включит перехват нужного приложения;
4. попросит вас что-то сделать в приложении (войти, открыть экран, повторить ошибку) и подождёт, пока вы нажмёте «Готово»;
5. прочитает расшифрованный трафик и сделает то, о чём вы просили: опишет API, напишет клиент, найдёт ошибку, сохранит трафик в JSON.

Пример запроса агенту:

> Подними эмулятор, перехвати приложение `com.example.shop`. Я войду в аккаунт и положу товар в корзину.
> Потом опиши API авторизации и корзины и напиши клиент на Python.

## Подключение

Точная команда для вашей системы есть в Siphon: **Настройки → ИИ-агенты** (кнопка копирует её).

**Claude Code** (macOS):

```sh
claude mcp add --scope user siphon -- /Applications/Siphon.app/Contents/MacOS/Siphon mcp
```

Linux: `claude mcp add --scope user siphon -- ~/.local/bin/siphon mcp`.
Windows: путь к `Siphon.exe` с аргументом `mcp`.

**Другие клиенты** (Cursor, Claude Desktop и т. п.) — сервер stdio:

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
# wait_for_user и запуск эмулятора ждут до 900 с, а Codex по умолчанию обрывает вызов через 60 с.
tool_timeout_sec = 960
```

Из исходников: `go build -o bin/siphon ./cmd/siphon`, затем `bin/siphon mcp`.

Как это устроено: `Siphon mcp` не открывает окно. Это тонкий клиент к HTTP API уже запущенного Siphon. Адрес API
он берёт из файла `endpoint.json` в каталоге данных. Если Siphon не запущен, MCP-сервер откроет приложение сам.
CLI-сборка запускается без окна браузера; адрес интерфейса агент получит в `status` и передаст вам.
Адрес можно задать явно: `siphon mcp --url http://127.0.0.1:8484` или переменная `SIPHON_URL`.

## Сценарий

| Шаг | Инструмент | Что происходит |
|---|---|---|
| 1 | `status` | Что запущено, и подсказка, что делать дальше (поле `next`) |
| 2 | `list_emulators` → `start_emulator` | Запуск AVD и ожидание полной загрузки Android. Без имени выбирается AVD с `rootable: true` |
| 3 | `prepare_device` | root, установка и запуск frida-server |
| 4 | `list_apps` → `start_intercept` | Перехват приложения; режим `spawn` перезапускает его с хуками с самого старта |
| 5 | `wait_for_user` | Баннер в окне Siphon с вашей задачей и кнопкой «Готово»; агент ждёт нажатия |
| 6 | `list_traffic` → `get_exchange` | Трафик после просьбы (`since=lastSeq`), заголовки и раскодированные тела |
| 7 | `export_traffic` | Сохранить выборку в JSON или HAR |

Для перехвата нужен root. Подходит эмулятор с образом **Google APIs** без Google Play или телефон с Magisk.
Если подходящего AVD нет, `start_emulator` подскажет агенту команды `sdkmanager` и `avdmanager`, чтобы его создать.

### Просьба к пользователю

`wait_for_user` показывает в окне Siphon баннер «ИИ-агент ждёт вас» с текстом задачи. Сделайте в приложении то,
что просят, и нажмите **Готово**. В поле комментария можно что-то написать агенту, например «капча, вошёл через SMS».
**Отмена** сообщает агенту, что вы отказались, и он спросит в чате, что делать дальше.

Агент получает `state` (`done`, `cancelled` или `expired`), ваш комментарий и `lastSeq`: всё, что вы сделали после
просьбы, имеет `seq > lastSeq`. Если агент перестал ждать (вызов отменён или упал), баннер исчезнет через минуту.

## Инструменты

| Инструмент | Аргументы | Результат |
|---|---|---|
| `status` | — | версия, adb, устройства, сессии, `traffic.lastSeq`, ждущие просьбы, `next` |
| `install_adb` | — | скачивает platform-tools от Google (≈15 МБ), если adb нет |
| `list_emulators` | — | AVD: `state` (stopped, starting, booting, running), `serial`, `rootable`, `playStore` |
| `start_emulator` | `name?`, `headless?`, `coldBoot?`, `timeoutSec?` (300) | ждёт `sys.boot_completed`; запущенный AVD не перезапускается |
| `prepare_device` | `serial?`, `timeoutSec?` (300) | устройство с `info.frida = running` |
| `list_apps` | `serial?`, `query?` | `id — имя (running, pid)` |
| `start_intercept` | `appId`, `serial?`, `mode?` (spawn, attach), `safeMode?`, `timeoutSec?` (180) | сессия и хвост лога; при неудаче ошибка с логом |
| `stop_intercept` | `sessionId?` | без id останавливает все активные сессии |
| `wait_for_user` | `message` или `askId`, `timeoutSec?` (600) | `state`, `reply`, `lastSeq`, число новых запросов и хосты |
| `wait_for_traffic` | `filter?`, `since?`, `limit?`, `timeoutSec?` (120) | ждёт завершённый запрос, подходящий под фильтр |
| `list_traffic` | `filter?`, `since?`, `limit?` (100) | по строке на запрос: `#id метод статус URL тип ↑↓размер время приложение` |
| `get_exchange` | `id`, `maxBodyChars?` (20000) | запись целиком в формате экспорта; длинные тела обрезаются |
| `export_traffic` | `path?`, `format?` (json, har), `filter?`, `since?`, `ids?` | путь к файлу и число записей |
| `get_rules` / `set_rules` | `rules` | правила: mock, redirect, правка заголовков и тел, задержка, обрыв, breakpoints |
| `clear_traffic` | `keepPinned?` (true) | очищает трафик |

`serial` можно не указывать, если подключено одно устройство. Все ожидания ограничены 15 минутами. Если время
вышло, инструмент вернёт текущее состояние, и его можно вызвать снова.

Фильтр — тот же, что в строке поиска Siphon: слова ищутся в методе, URL, статусе и приложении;
`host:api path:/v1 method:post status:4xx type:json src:com.app kind:websocket is:error is:pending`, `-слово` исключает.

## Формат JSON-экспорта

Кнопка **JSON** на странице трафика (или в карточке запроса), инструмент `export_traffic` и `/api/export/json`
выдают один и тот же формат `siphon/v1`:

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

- Тело уже раскодировано (gzip, br, zstd, deflate) и лежит ровно в одном поле: `json` (валидный JSON),
  `text` (UTF-8) или `base64` (двоичные данные). `size` и `encoding` описывают тело так, как оно шло по сети.
- `decodeError` — кодировку не удалось снять, в `base64` лежат исходные байты.
- WebSocket и TCP: `frames` с полями `dir` (`out` — от приложения, `in` — к нему), `kind`, `time`, `text` или `base64`.
- Остальные поля совпадают с `GET /api/exchanges/{id}`: TLS-сведения, сработавшее правило (`rule`), `edited`, `pinned`.
- `truncated: true` — тело было больше лимита и сохранено не целиком; `bodyEvicted: true` — тело вытеснено из памяти.

## HTTP API для агентов без MCP

Агент, который умеет только запускать команды, может работать через `curl`. API доступен только с `127.0.0.1`.
Адрес лежит в `endpoint.json` в каталоге данных:
macOS `~/Library/Application Support/Siphon`, Linux `~/.config/Siphon`, Windows `%AppData%\Siphon`.

```sh
S=$(python3 -c 'import json,os;print(json.load(open(os.path.expanduser("~/Library/Application Support/Siphon/endpoint.json")))["url"])')

curl -s "$S/api/android/emulators"                                        # AVD и их состояние
curl -s -X POST "$S/api/android/emulators/Siphon_API34/start?wait=300"     # запуск и ожидание загрузки
curl -s -X POST "$S/api/android/devices/emulator-5554/prepare?wait=300"    # frida-server
curl -s "$S/api/android/devices/emulator-5554/apps"
curl -s -X POST "$S/api/android/sessions?wait=180" -d '{"serial":"emulator-5554","appId":"com.example.shop"}'
curl -s -X POST "$S/api/agent/asks?wait=600" -d '{"message":"Войдите в аккаунт и нажмите «Готово»"}'
curl -s "$S/api/exchanges?since=12&filter=host:api"                        # трафик после просьбы
curl -s "$S/api/export/json?since=12" -o traffic.json
```

Параметр `?wait=SEC` делает вызов блокирующим (не дольше 15 минут). 200 — дождались, 202 — время вышло и ещё не готово:
повторите вызов (для просьбы — `GET /api/agent/asks/{id}?wait=SEC`).

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/state` | версия, прокси, adb, `traffic.lastSeq` |
| GET | `/api/android` | adb, устройства, сессии с логом |
| POST | `/api/android/adb/download` | скачать platform-tools |
| GET | `/api/android/emulators` | AVD с состоянием |
| POST | `/api/android/emulators/{name}/start?wait=` | тело `{"headless":false,"coldBoot":false}` |
| POST | `/api/android/devices/{serial}/prepare?wait=` | подготовка устройства |
| GET | `/api/android/devices/{serial}/apps` | приложения |
| POST | `/api/android/sessions?wait=` | `{"serial","appId","mode":"spawn","safeMode":false}` |
| POST | `/api/android/sessions/{id}/stop` | остановить перехват |
| GET | `/api/exchanges?since=&filter=&ids=&limit=&wait=` | список без тел; `wait` ждёт завершённую запись в выборке |
| GET | `/api/exchanges/{id}/body?side=request\|response` | тело (раскодированное; `raw=1` — как по сети) |
| GET | `/api/exchanges/{id}/curl` | команда cURL |
| GET, POST | `/api/export/json`, `/api/export/har` | экспорт; выборка в query или в теле `{"ids":[],"since":0,"filter":""}` |
| GET, PUT | `/api/rules` | правила целиком |
| POST | `/api/exchanges/{id}/resume`, `/drop` | отпустить или оборвать запрос на breakpoint |
| POST | `/api/exchanges/clear` | `{"keepPinned":true}` |
| GET, POST | `/api/agent/asks` | ждущие просьбы; создать просьбу `{"message"}` (`?wait=`) |
| GET, DELETE | `/api/agent/asks/{id}` | состояние (`?wait=`); отозвать просьбу |

## Безопасность и ограничения

- Агент видит весь перехваченный трафик, в том числе пароли, токены и cookie. Не перехватывайте чужие аккаунты.
  Не давайте агенту доступ, если не готовы показать ему эти данные.
- API слушает только `127.0.0.1` и отклоняет запросы со сторонних сайтов. Локальные программы доступ к нему имеют.
- Проверено на macOS: эмулятор Android 14 arm64 (Google APIs), Chrome. Агент через MCP запустил перехват,
  дождался «Готово», прочитал расшифрованные запросы. На Windows `Siphon.exe mcp` пока не проверялся:
  это GUI-приложение, и не всякий клиент передаёт ему stdio. Если не заработает, используйте HTTP API.
- Эмулятор, запущенный Siphon, продолжает работать после закрытия Siphon. Вывод эмулятора пишется в `logs/` в каталоге данных.

← [README](../README.md) · [English](AI.en.md)
