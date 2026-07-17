#!/usr/bin/env bash
# Vendors self-hosted EmulatorJS into public/emulatorjs/data (gitignored — run after clone).
# Pulls the loader + built emulator + the GBA (mGBA) core so the app runs without EmulatorJS's CDN.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DST="$ROOT/public/emulatorjs/data"
CDN="https://cdn.emulatorjs.org/stable/data"
REPO="https://github.com/EmulatorJS/EmulatorJS.git"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ Cloning EmulatorJS (loader + compression + localization)..."
git clone --depth 1 "$REPO" "$TMP/ejs"

echo "→ Downloading built emulator bundle..."
curl -sSL -o "$TMP/emulator.min.zip" "$CDN/emulator.min.zip"
unzip -o "$TMP/emulator.min.zip" -d "$TMP/emu" >/dev/null

echo "→ Downloading GBA core (mGBA)..."
mkdir -p "$DST/cores"
for f in mgba-wasm.data mgba-legacy-wasm.data; do
  curl -sSL -o "$DST/cores/$f" "$CDN/cores/$f"
done

echo "→ Assembling $DST ..."
cp "$TMP/ejs/data/loader.js" "$DST/"
cp "$TMP/ejs/data/version.json" "$DST/"
cp "$TMP/emu/emulator.min.js" "$TMP/emu/emulator.min.css" "$DST/"
cp -r "$TMP/ejs/data/compression" "$DST/"
cp -r "$TMP/ejs/data/localization" "$DST/"

echo "✓ EmulatorJS vendored ($(du -sh "$DST" | cut -f1)). Add more cores by downloading"
echo "  \$CDN/cores/<core>-wasm.data into $DST/cores/"
