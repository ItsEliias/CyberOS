#!/usr/bin/env bash
# CyberOS — Launcher installer
# Installs just the Launcher to /Applications.
# Open the Launcher and use the App Manager to install individual apps.
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCHER_DIR="$SCRIPT_DIR/Cybertools Launcher"
PRODUCT_NAME="CyberTools Launcher"
APP_BUNDLE="$PRODUCT_NAME.app"

echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║     CyberOS Launcher Installer     ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${NC}"

# ── Prerequisites ─────────────────────────────────────────────────────────────

check_dep() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✗ $1 not found. Please install it first.${NC}"
    exit 1
  fi
}

check_dep node
check_dep npm

NODE_VER=$(node -e "process.exit(parseInt(process.versions.node.split('.')[0]) < 18 ? 1 : 0)" 2>/dev/null && echo "ok" || echo "old")
if [[ "$NODE_VER" == "old" ]]; then
  echo -e "${RED}✗ Node.js 18+ required. Current: $(node --version)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version), npm $(npm --version)${NC}"

# ── Install dependencies ───────────────────────────────────────────────────────

echo -e "\n${CYAN}→ Installing dependencies...${NC}"
cd "$LAUNCHER_DIR"
npm install --silent

# ── Build ─────────────────────────────────────────────────────────────────────

echo -e "${CYAN}→ Building Launcher...${NC}"
npm run build

# ── Package ───────────────────────────────────────────────────────────────────

echo -e "${CYAN}→ Packaging for macOS...${NC}"
npm run package:mac -- --publish=never 2>&1 | grep -v "^$" | tail -5

# ── Copy to /Applications ─────────────────────────────────────────────────────

APP_SRC=$(find "$LAUNCHER_DIR/dist" -name "$APP_BUNDLE" -maxdepth 4 2>/dev/null | head -1)
if [[ -z "$APP_SRC" ]]; then
  # Fallback: check release dir
  APP_SRC=$(find "$LAUNCHER_DIR" -name "$APP_BUNDLE" -not -path "*/node_modules/*" 2>/dev/null | head -1)
fi

if [[ -z "$APP_SRC" ]]; then
  echo -e "${RED}✗ Could not find $APP_BUNDLE after packaging.${NC}"
  echo "  Run manually: npm run package:mac inside \"Cybertools Launcher/\""
  exit 1
fi

INSTALL_PATH="/Applications/$APP_BUNDLE"
echo -e "${CYAN}→ Installing to $INSTALL_PATH...${NC}"

if [[ -d "$INSTALL_PATH" ]]; then
  echo -e "${YELLOW}  Replacing existing installation...${NC}"
  rm -rf "$INSTALL_PATH"
fi

cp -R "$APP_SRC" "/Applications/"

echo -e "\n${GREEN}✓ CyberTools Launcher installed successfully!${NC}"
echo -e "  Open ${CYAN}$INSTALL_PATH${NC} or find it in Spotlight."
echo -e "  Use the ${YELLOW}App Manager${NC} inside the Launcher to install individual apps.\n"
