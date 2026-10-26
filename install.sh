#!/bin/sh
# Установка Siphon одной командой (macOS и Linux) / One-line installer for macOS and Linux:
#   curl -fsSL https://raw.githubusercontent.com/mixelka75/siphon/main/install.sh | sh
# SIPHON_VERSION=v0.3.0 — конкретная версия / pin a version.
set -eu
REPO="mixelka75/siphon"
tag="${SIPHON_VERSION:-}"
if [ -z "$tag" ]; then
  tag=$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest" | sed 's|.*/tag/||')
fi
[ -n "$tag" ] || { echo "Не удалось определить версию / cannot resolve latest version" >&2; exit 1; }
base="https://github.com/$REPO/releases/download/$tag"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
echo "Siphon $tag"

case "$(uname -s)" in
  Darwin)
    [ "$(uname -r | cut -d. -f1)" -ge 22 ] || { echo "Нужна macOS 13+ / macOS 13+ required" >&2; exit 1; }
    curl -fL --progress-bar -o "$tmp/Siphon.zip" "$base/Siphon-macOS-universal.zip"
    ditto -x -k "$tmp/Siphon.zip" "$tmp"
    dest=/Applications; [ -w "$dest" ] || { dest="$HOME/Applications"; mkdir -p "$dest"; }
    pkill -x Siphon 2>/dev/null || true
    rm -rf "$dest/Siphon.app"; mv "$tmp/Siphon.app" "$dest/"
    xattr -dr com.apple.quarantine "$dest/Siphon.app" 2>/dev/null || true
    echo "Установлено / installed: $dest/Siphon.app"
    open "$dest/Siphon.app"
    ;;
  Linux)
    [ "$(uname -m)" = "x86_64" ] || { echo "Пока только x86_64 / x86_64 only" >&2; exit 1; }
    curl -fL --progress-bar -o "$tmp/siphon.tar.gz" "$base/Siphon-Linux-x64.tar.gz"
    tar -xzf "$tmp/siphon.tar.gz" -C "$tmp"
    sh "$tmp/Siphon-Linux-x64/install.sh"
    ;;
  *) echo "Для Windows скачайте Siphon-Windows-x64.zip со страницы релизов / On Windows grab the zip from Releases" >&2; exit 1;;
esac
