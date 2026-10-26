#!/bin/bash
# Перерисовывает фон окна DMG из dmg-background.svg в PNG 1x и 2x.
# Нужны rsvg-convert (brew install librsvg) и npm-зависимости ui/ (оттуда берутся шрифты).
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
fonts=$here/../../ui/node_modules/@fontsource-variable
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

mkdir "$tmp/fonts"
cp "$fonts"/roboto-flex/files/roboto-flex-{latin,cyrillic}-full-normal.woff2 \
   "$fonts"/jetbrains-mono/files/jetbrains-mono-{latin,cyrillic}-wght-normal.woff2 "$tmp/fonts/"
cat > "$tmp/fonts.conf" <<EOF
<?xml version="1.0"?>
<fontconfig><dir>$tmp/fonts</dir><cachedir>$tmp/cache</cachedir></fontconfig>
EOF
export FONTCONFIG_FILE=$tmp/fonts.conf

rsvg-convert "$here/dmg-background.svg" -o "$here/dmg-background.png"
rsvg-convert -z 2 "$here/dmg-background.svg" -o "$here/dmg-background@2x.png"
echo "готово: dmg-background.png, dmg-background@2x.png"
