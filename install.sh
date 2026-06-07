#!/usr/bin/env bash
# CyberOS — Launcher installer
# Installs just the Launcher. Open the Launcher and use the App Manager
# to install individual apps.
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCHER_DIR="$SCRIPT_DIR/Cybertools Launcher"
PRODUCT_NAME="CyberTools Launcher"

# ── Platform detect ───────────────────────────────────────────────────────────

case "$(uname -s)" in
  Darwin)
    OS="mac"
    APP_BUNDLE="$PRODUCT_NAME.app"
    INSTALL_PATH="/Applications/$APP_BUNDLE"
    PACKAGE_SCRIPT="package:mac"
    ;;
  Linux)
    OS="linux"
    APP_BUNDLE=""   # AppImage is a single file, not a bundle
    INSTALL_PATH="$HOME/.local/bin/cybertools-launcher.AppImage"
    PACKAGE_SCRIPT="package:linux"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    OS="windows"
    echo -e "${YELLOW}Detected Windows shell environment.${NC}"
    echo "  On Windows, run \`npm run package:win\` inside \"Cybertools Launcher/\""
    echo "  then run the generated installer in dist/ manually."
    exit 0
    ;;
  *)
    echo -e "${RED}✗ Unsupported OS: $(uname -s)${NC}"
    exit 1
    ;;
esac

echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║     CyberOS Launcher Installer     ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${NC}"
echo -e "  Target OS: ${YELLOW}${OS}${NC}\n"

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

echo -e "${CYAN}→ Packaging for ${OS}...${NC}"
npm run "$PACKAGE_SCRIPT" -- --publish=never 2>&1 | grep -v "^$" | tail -5

# ── Install ───────────────────────────────────────────────────────────────────

if [[ "$OS" == "mac" ]]; then
  APP_SRC=$(find "$LAUNCHER_DIR/dist" -name "$APP_BUNDLE" -maxdepth 4 2>/dev/null | head -1)
  if [[ -z "$APP_SRC" ]]; then
    APP_SRC=$(find "$LAUNCHER_DIR" -name "$APP_BUNDLE" -not -path "*/node_modules/*" 2>/dev/null | head -1)
  fi
  if [[ -z "$APP_SRC" ]]; then
    echo -e "${RED}✗ Could not find $APP_BUNDLE after packaging.${NC}"
    exit 1
  fi
  echo -e "${CYAN}→ Installing to $INSTALL_PATH...${NC}"
  if [[ -d "$INSTALL_PATH" ]]; then
    echo -e "${YELLOW}  Replacing existing installation...${NC}"
    rm -rf "$INSTALL_PATH"
  fi
  cp -R "$APP_SRC" "/Applications/"

elif [[ "$OS" == "linux" ]]; then
  APP_SRC=$(find "$LAUNCHER_DIR/dist" -maxdepth 2 -name "*.AppImage" 2>/dev/null | head -1)
  if [[ -z "$APP_SRC" ]]; then
    echo -e "${RED}✗ Could not find .AppImage after packaging.${NC}"
    echo "  Check $LAUNCHER_DIR/dist/ — a .deb may have been produced instead."
    exit 1
  fi
  mkdir -p "$(dirname "$INSTALL_PATH")"
  echo -e "${CYAN}→ Installing to $INSTALL_PATH...${NC}"
  cp "$APP_SRC" "$INSTALL_PATH"
  chmod +x "$INSTALL_PATH"
fi

echo -e "\n${GREEN}✓ CyberTools Launcher installed successfully!${NC}"
if [[ "$OS" == "mac" ]]; then
  echo -e "  Open ${CYAN}$INSTALL_PATH${NC} or find it in Spotlight."
else
  echo -e "  Run ${CYAN}$INSTALL_PATH${NC} or add it to your application menu."
fi
echo -e "  Use the ${YELLOW}App Manager${NC} inside the Launcher to install individual apps.\n"
