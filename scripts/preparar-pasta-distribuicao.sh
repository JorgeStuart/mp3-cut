#!/usr/bin/env bash
# Copia o instalador mais recente + instruções para uma pasta fácil de zipar e enviar.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/distribuir"
mkdir -p "$DEST"

shopt -s nullglob
APPIMAGES=("$ROOT"/release/MP3-Cortar-*-linux-x86_64.AppImage)
INSTALLERS=("$ROOT"/release/MP3-Cortar-*-win-x64.exe)
DMGS=("$ROOT"/release/MP3-Cortar-*-mac-*.dmg)

if ((${#APPIMAGES[@]})); then
  cp -f "${APPIMAGES[-1]}" "$DEST/"
fi
if ((${#INSTALLERS[@]})); then
  cp -f "${INSTALLERS[-1]}" "$DEST/"
fi
if ((${#DMGS[@]})); then
  cp -f "${DMGS[-1]}" "$DEST/"
fi

cp -f "$ROOT/README.md" "$DEST/LEIA-ME.md"
echo "Pasta pronta: $DEST"
ls -lh "$DEST"
