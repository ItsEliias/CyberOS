#!/bin/bash
# CYBERTOOLS — Build all 4 apps as macOS DMGs (unsigned)
# Run from your Mac terminal:
#   cd ~/Documents/Claude/Projects/Cyberlab\ Compaion
#   bash build-all-dmg.sh

set -e

PROJECTS="$(cd "$(dirname "$0")/.." && pwd)"

build_app() {
  local name="$1"
  local dir="$2"
  echo ""
  echo "════════════════════════════════════════"
  echo "  Building: $name"
  echo "════════════════════════════════════════"
  cd "$dir"
  CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --publish never
  echo "  ✓ $name — done"
}

build_app "CyberLab Companion"  "$PROJECTS/Cyberlab Compaion"
build_app "VaultCore"           "$PROJECTS/Vault Scraper"
build_app "GhostVault"          "$PROJECTS/GhostVault"
build_app "CYBERTOOLS Launcher" "$PROJECTS/Cybertools Launcher"

echo ""
echo "════════════════════════════════════════"
echo "  All builds complete!"
echo "  DMGs saved in each app's dist/ folder"
echo "════════════════════════════════════════"
