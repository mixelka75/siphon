#!/bin/bash
# Подписывает Siphon.app, отправляет на нотаризацию в Apple и собирает DMG и ZIP.
#   packaging/macos/package.sh desktop/build/bin/Siphon.app dist
#
# Секреты (в CI — из GitHub Secrets, см. .github/workflows/build.yml):
#   MACOS_CERTIFICATE_P12       сертификат «Developer ID Application» вместе с ключом, .p12 в base64
#   MACOS_CERTIFICATE_PASSWORD  пароль от .p12
#   APPLE_API_KEY_P8            ключ App Store Connect API: содержимое AuthKey_XXXXXXXXXX.p8
#   APPLE_API_KEY_ID            Key ID этого ключа
#   APPLE_API_ISSUER_ID         Issuer ID (у командного ключа; у личного ключа его нет)
# Без сертификата делается ad-hoc подпись: приложение работает, но при первом запуске macOS
# его блокирует. С сертификатом, но без ключа API приложение подписано, но не нотаризовано.
set -euo pipefail
app=${1:?путь к Siphon.app}
out=${2:?каталог для DMG и ZIP}
here=$(cd "$(dirname "$0")" && pwd)
dmg=$out/Siphon-macOS-universal.dmg
zip=$out/Siphon-macOS-universal.zip
tmp=$(mktemp -d)
keychain=""
cleanup() {
  if [[ -n $keychain ]]; then security delete-keychain "$keychain" 2>/dev/null || true; fi
  rm -rf "$tmp"
}
trap cleanup EXIT
mkdir -p "$out"

output() { if [[ -n ${GITHUB_OUTPUT:-} ]]; then echo "$1" >> "$GITHUB_OUTPUT"; fi; }
# Предупреждения нужны только в релизной сборке: в PR и локально ad-hoc — норма.
warn() { if [[ -n ${RELEASE_BUILD:-} ]]; then echo "::warning::$*"; else echo "$*"; fi; }

identity=""
if [[ -n ${MACOS_CERTIFICATE_P12:-} ]]; then
  # Временная связка ключей: сертификат не попадает в системную и удаляется при выходе.
  keychain=$tmp/signing.keychain-db
  pass=$(uuidgen)
  security create-keychain -p "$pass" "$keychain"
  security set-keychain-settings -lut 3600 "$keychain"
  security unlock-keychain -p "$pass" "$keychain"
  base64 --decode <<<"$MACOS_CERTIFICATE_P12" > "$tmp/cert.p12"
  security import "$tmp/cert.p12" -k "$keychain" -f pkcs12 -P "${MACOS_CERTIFICATE_PASSWORD:-}" -T /usr/bin/codesign
  # Промежуточный сертификат Apple на случай, если его нет ни в .p12, ни на машине.
  if curl -fsSL https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer -o "$tmp/g2.cer"; then
    security import "$tmp/g2.cer" -k "$keychain" >/dev/null 2>&1 || true
  fi
  security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$pass" "$keychain" >/dev/null
  # shellcheck disable=SC2046 # пути связок ключей без пробелов
  security list-keychains -d user -s "$keychain" $(security list-keychains -d user | tr -d '"')
  identity=$(security find-identity -v -p codesigning "$keychain" | awk '/"Developer ID Application: / { print $2; exit }')
  if [[ -z $identity ]]; then
    echo "::error::В MACOS_CERTIFICATE_P12 нет сертификата «Developer ID Application» с закрытым ключом"
    exit 1
  fi
  security find-identity -v -p codesigning "$keychain" | grep "$identity"
fi

# Hardened runtime обязателен для нотаризации. Ad-hoc сборки подписываем с ним же,
# чтобы несовместимость всплывала ещё в PR, а не в релизе.
if [[ -n $identity ]]; then
  codesign --force --options runtime --timestamp --sign "$identity" "$app"
else
  warn "MACOS_CERTIFICATE_P12 не задан: ad-hoc подпись, macOS заблокирует первый запуск"
  codesign --force --options runtime --sign - "$app"
fi
codesign --verify --strict --verbose=2 "$app"
lipo -archs "$app/Contents/MacOS/Siphon"

notary=()
if [[ -n $identity && -n ${APPLE_API_KEY_P8:-} ]]; then
  printf '%s\n' "$APPLE_API_KEY_P8" > "$tmp/key.p8"
  notary=(--key "$tmp/key.p8" --key-id "${APPLE_API_KEY_ID:?нужен APPLE_API_KEY_ID}")
  if [[ -n ${APPLE_API_ISSUER_ID:-} ]]; then notary+=(--issuer "$APPLE_API_ISSUER_ID"); fi
elif [[ -n $identity ]]; then
  warn "APPLE_API_KEY_P8 не задан: приложение подписано, но не нотаризовано"
fi

notarize() {
  local res=$tmp/notary.json id status
  echo "Нотаризация $(basename "$1"), обычно 1–10 минут…"
  xcrun notarytool submit "$1" "${notary[@]}" --wait --timeout 30m --output-format json > "$res" || true
  id=$(plutil -extract id raw "$res" 2>/dev/null || true)
  status=$(plutil -extract status raw "$res" 2>/dev/null || true)
  echo "  ${status:-нет ответа} ${id}"
  if [[ $status != Accepted ]]; then
    cat "$res"
    if [[ -n $id ]]; then xcrun notarytool log "$id" "${notary[@]}" || true; fi
    echo "::error::Apple не приняла $(basename "$1") на нотаризацию, подробности выше"
    exit 1
  fi
}

# Сначала нотаризуем и «степлим» само приложение: тогда и копия из DMG, и копия из ZIP
# проходят Gatekeeper даже без интернета.
if ((${#notary[@]})); then
  ditto -c -k --keepParent "$app" "$tmp/app.zip"
  notarize "$tmp/app.zip"
  xcrun stapler staple "$app"
fi

"$here/make-dmg.sh" "$app" "$dmg"
if [[ -n $identity ]]; then
  codesign --force --timestamp --sign "$identity" "$dmg"
fi
if ((${#notary[@]})); then
  notarize "$dmg"
  xcrun stapler staple "$dmg"
  spctl --assess --type execute --verbose=2 "$app"
  spctl --assess --type open --context context:primary-signature --verbose=2 "$dmg"
  output notarized=true
else
  output notarized=false
fi

ditto -c -k --sequesterRsrc --keepParent "$app" "$zip"
ls -l "$out"
