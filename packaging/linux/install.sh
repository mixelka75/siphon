#!/bin/sh
# Устанавливает Siphon в домашний каталог без sudo / Installs Siphon into $HOME, no sudo.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
bin="$HOME/.local/bin"; share="$HOME/.local/share"
mkdir -p "$bin" "$share/siphon" "$share/applications" "$share/icons/hicolor/512x512/apps"
install -m755 "$here/siphon" "$share/siphon/siphon"
ln -sf "$share/siphon/siphon" "$bin/siphon"
cp "$here/siphon.png" "$share/icons/hicolor/512x512/apps/siphon.png"
sed -e "s|@EXEC@|$share/siphon/siphon|" -e "s|@ICON@|siphon|" "$here/siphon.desktop" > "$share/applications/siphon.desktop"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$share/applications" >/dev/null 2>&1 || true
echo "Siphon установлен / installed: $share/siphon/siphon"
case ":$PATH:" in *":$bin:"*) ;; *) echo "Добавьте $bin в PATH / add $bin to PATH";; esac
# Проверка системных библиотек / check runtime libraries
if ! ldd "$share/siphon/siphon" 2>/dev/null | grep -q "not found"; then :; else
  echo "Не хватает библиотек / missing libraries. Debian/Ubuntu: sudo apt install libgtk-3-0 libwebkit2gtk-4.1-0"
fi
