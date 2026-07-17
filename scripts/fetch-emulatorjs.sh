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
mkdir -p "$DST/cores/reports"
for f in mgba-wasm.data mgba-legacy-wasm.data; do
  curl -sSL -o "$DST/cores/$f" "$CDN/cores/$f"
done
# Core report enables core caching (avoids re-download); its absence only warns.
curl -sSL -o "$DST/cores/reports/mgba.json" "$CDN/cores/reports/mgba.json"

echo "→ Assembling $DST ..."
# loader.js MUST come from the same stable CDN release as emulator.min.js.
# The GitHub repo's loader.js expects an ES-module emulator (import()/default),
# but the stable emulator.min.js is a classic script — mixing them yields
# "EmulatorJS failed to load. Check for missing files."
curl -sSL -o "$DST/loader.js" "$CDN/loader.js"
curl -sSL -o "$DST/version.json" "$CDN/version.json"
cp "$TMP/emu/emulator.min.js" "$TMP/emu/emulator.min.css" "$DST/"
cp -r "$TMP/ejs/data/compression" "$DST/"
cp -r "$TMP/ejs/data/localization" "$DST/"

echo "✓ EmulatorJS vendored ($(du -sh "$DST" | cut -f1)). Add more cores by downloading"
echo "  \$CDN/cores/<core>-wasm.data into $DST/cores/"
