#!/bin/bash
# Собирает DMG с оформленным окном: фон, расстановка иконок, ярлык «Программы».
#   packaging/macos/make-dmg.sh path/to/Siphon.app out.dmg
# dmgbuild пишет .DS_Store сам, без AppleScript и Finder, поэтому работает и в CI без экрана.
set -euo pipefail
app=$1 dmg=$2
here=$(cd "$(dirname "$0")" && pwd)

venv=${DMGBUILD_VENV:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}/siphon-dmgbuild}
if [[ ! -x $venv/bin/dmgbuild ]]; then
  python3 -m venv "$venv"
  "$venv/bin/pip" install -q dmgbuild==1.6.5 ds-store==1.3.1 mac-alias==2.2.2
fi

rm -f "$dmg"
"$venv/bin/dmgbuild" -s "$here/dmg-settings.py" \
  -D app="$app" -D background="$here/dmg-background.png" Siphon "$dmg"
