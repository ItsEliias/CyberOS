#!/usr/bin/env bash
# CyberOS — Complete uninstaller
# Removes all CyberOS apps from /Applications, clears config & cache.
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${RED}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║      CyberOS Uninstaller           ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}This will remove ALL CyberOS apps and data. Continue? [y/N]${NC} "
read -r CONFIRM
if [[ "${CONFIRM,,}" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

# ── App bundles to remove ─────────────────────────────────────────────────────

APPS=(
  "CyberTools Launcher"
  "CredVault"
  "VaultCore"
  "GhostVault"
  "SignalBoard"
  "NetworkMap"
  "PlaybookStudio"
  "TerminalLink"
  "CyberLab"
  "CYBERLAB COMPANION"
  "NetLab"
  "ReconDesk"
  "ReportForge"
  "CyberOS Dashboard"
  "VAULTCORE"
)

removed=0
for app in "${APPS[@]}"; do
  path="/Applications/$app.app"
  if [[ -d "$path" ]]; then
    echo -e "  ${CYAN}→ Removing $path${NC}"
    rm -rf "$path"
    ((removed++)) || true
  fi
done

# ── User data & config ────────────────────────────────────────────────────────

SUPPORT="$HOME/Library/Application Support"
PREFS="$HOME/Library/Preferences"
CACHES="$HOME/Library/Caches"

data_dirs=(
  "$SUPPORT/cybertools-launcher"
  "$SUPPORT/CyberTools Launcher"
  "$SUPPORT/credvault"
  "$SUPPORT/CredVault"
  "$SUPPORT/vaultcore"
  "$SUPPORT/VaultCore"
  "$SUPPORT/ghostvault"
  "$SUPPORT/GhostVault"
  "$SUPPORT/signalboard"
  "$SUPPORT/SignalBoard"
  "$SUPPORT/networkmap"
  "$SUPPORT/NetworkMap"
  "$SUPPORT/playbookstudio"
  "$SUPPORT/PlaybookStudio"
  "$SUPPORT/terminallink"
  "$SUPPORT/TerminalLink"
)

for d in "${data_dirs[@]}"; do
  if [[ -d "$d" ]]; then
    echo -e "  ${YELLOW}→ Removing data: $d${NC}"
    rm -rf "$d"
  fi
done

# Remove preference files
find "$PREFS" -name "com.cybertools*" -o -name "com.credvault*" -o -name "com.ghostvault*" \
  -o -name "com.vaultcore*" -o -name "com.signalboard*" -o -name "com.networkmap*" \
  -o -name "com.playbookstudio*" -o -name "com.terminallink*" 2>/dev/null | while read -r f; do
  echo -e "  ${YELLOW}→ Removing pref: $f${NC}"
  rm -f "$f"
done

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
if [[ $removed -gt 0 ]]; then
  echo -e "${GREEN}✓ Removed $removed CyberOS app(s) from /Applications.${NC}"
else
  echo -e "${YELLOW}No CyberOS apps found in /Applications.${NC}"
fi
echo -e "${GREEN}✓ CyberOS fully uninstalled.${NC}\n"
