#!/bin/bash
# build.sh — Full build script for CYBERLAB COMPANION
# Run from the project root: bash build.sh
# Requires: Node.js 18+, macOS (for .icns generation)

set -e
cd "$(dirname "$0")"

echo ""
echo "⚡ CYBERLAB COMPANION — Build Script"
echo "======================================"
echo ""

# ── Step 1: Generate icons ──────────────────────────────────────────────────
echo "[1/5] Generating icon files…"
node generate-icons.js

# Create .icns from iconset (macOS built-in tool)
if command -v iconutil &>/dev/null; then
  iconutil -c icns assets/icon.iconset -o assets/icon.icns
  echo "✓ assets/icon.icns created"
else
  echo "⚠  iconutil not found — macOS .icns will use fallback"
fi

# ── Step 2: Combine renderer parts ─────────────────────────────────────────
echo ""
echo "[2/5] Combining renderer parts…"
cat renderer-part1.js renderer-part2.js renderer-part3.js > renderer.js
echo "✓ renderer.js ($(wc -l < renderer.js | tr -d ' ') lines)"

# ── Step 3: Install dependencies ────────────────────────────────────────────
echo ""
echo "[3/5] Installing dependencies…"
npm install --silent
echo "✓ node_modules ready"

# ── Step 4: Build with electron-builder ─────────────────────────────────────
echo ""
echo "[4/5] Building distributable…"

# Detect OS and build accordingly
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "  Platform: macOS → building .dmg"
  CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:mac
  echo ""
  echo "✓ macOS DMG created in dist/"
elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]] || [[ "$OS" == "Windows_NT" ]]; then
  echo "  Platform: Windows → building .exe installer"
  npm run build:win
  echo ""
  echo "✓ Windows installer created in dist/"
else
  echo "  Platform: Linux → building AppImage"
  npm run build:linux
  echo ""
  echo "✓ Linux AppImage created in dist/"
fi

# ── Step 5: Summary ─────────────────────────────────────────────────────────
echo ""
echo "[5/5] Build complete!"
echo ""
echo "Output files:"
ls -lh dist/ 2>/dev/null | grep -v "^total\|^d" | awk '{print "  " $5 "\t" $9}' || echo "  (check dist/ folder)"
echo ""
echo "To run without building: npm start"
echo ""
