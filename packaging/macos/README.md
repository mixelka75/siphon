# Сборка для macOS: подпись, нотаризация, DMG

`package.sh` подписывает `Siphon.app` сертификатом Developer ID, отправляет его на нотаризацию в Apple
и собирает `Siphon-macOS-universal.dmg` (с оформленным окном) и `.zip`. В CI это делает job `macos`
в [build.yml](../../.github/workflows/build.yml) для тегов `v*` и ручного запуска. Без секретов сборка
не падает: приложение получает ad-hoc подпись, а релизные заметки подсказывают, как обойти Gatekeeper.

## Секреты GitHub

**Settings → Secrets and variables → Actions → New repository secret**:

| Секрет | Что это |
|---|---|
| `MACOS_CERTIFICATE_P12` | сертификат «Developer ID Application» вместе с закрытым ключом, файл `.p12` в base64 |
| `MACOS_CERTIFICATE_PASSWORD` | пароль, заданный при экспорте `.p12` |
| `APPLE_API_KEY_P8` | ключ App Store Connect API: содержимое `AuthKey_XXXXXXXXXX.p8` целиком |
| `APPLE_API_KEY_ID` | Key ID этого ключа (10 символов) |
| `APPLE_API_ISSUER_ID` | Issuer ID (UUID над списком ключей). Для личного ключа (Individual Key) не нужен |

### Сертификат Developer ID

Создать его может только Account Holder.

1. Xcode → **Settings → Accounts** → ваша команда → **Manage Certificates…** → **+** → **Developer ID Application**.
   Или на [developer.apple.com](https://developer.apple.com/account/resources/certificates/add) → Developer ID Application,
   с CSR из «Связки ключей».
2. «Связка ключей» → «Мои сертификаты» → «Developer ID Application: …» → правый клик → **Экспортировать** → `.p12` с паролем.
   Раскройте строку сертификата и убедитесь, что под ним есть закрытый ключ.
3. Загрузите в GitHub:

   ```sh
   base64 -i DeveloperID.p12 | gh secret set MACOS_CERTIFICATE_P12
   gh secret set MACOS_CERTIFICATE_PASSWORD   # спросит пароль
   ```

### Ключ App Store Connect API (для нотаризации)

1. [App Store Connect](https://appstoreconnect.apple.com/access/integrations/api) → **Пользователи и доступ → Интеграции →
   App Store Connect API** → **Team Keys** → **+**, роль **Developer**.
2. Скачайте `AuthKey_XXXXXXXXXX.p8`. Скачать его можно только один раз.
3. Загрузите в GitHub:

   ```sh
   gh secret set APPLE_API_KEY_P8 < AuthKey_XXXXXXXXXX.p8
   gh secret set APPLE_API_KEY_ID --body XXXXXXXXXX
   gh secret set APPLE_API_ISSUER_ID --body 00000000-0000-0000-0000-000000000000
   ```

### Проверка

**Actions → Build & Release → Run workflow** на `main`. В логе job `macos` должны быть строки `Accepted`
и `source=Notarized Developer ID`. После этого можно ставить тег: релиз соберётся подписанным,
а в заметках не будет инструкции про «неизвестного разработчика».

## Окно DMG

Фон рисуется из [dmg-background.svg](dmg-background.svg), расстановка иконок задана в [dmg-settings.py](dmg-settings.py)
(координаты должны совпадать). После правки SVG перерисуйте PNG командой `./render-background.sh`
(нужны `brew install librsvg` и `npm install` в `ui/`). DMG собирает [dmgbuild](https://github.com/dmgbuild/dmgbuild)
без AppleScript и Finder, поэтому сборка работает и в CI.

Локально: `make dmg` (ad-hoc подпись, файлы в `bin/`).
