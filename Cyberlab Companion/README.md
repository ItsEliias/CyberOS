# CYBERLAB COMPANION ⚡

An AI-powered cybersecurity lab assistant for Hack The Box, TryHackMe, and CTF machines. Built with Electron + Claude API.

---

## Features

- **AI Chat** — Claude-powered assistant with full session context, [FINDING:type] extraction, and typing indicators
- **Hint Ladder** — 5 levels from Nudge to Full Solution, controlled per-session
- **Teach Me Mode** — Socratic-only responses that guide rather than give answers
- **Methodology Tracker** — Recon → Enum → Exploit → Post-Exploit → PrivEsc → Lateral → Flag Capture
- **Command Builder** — Parameterised command generator for 40+ tools (nmap, gobuster, sqlmap, impacket, bloodhound…)
- **Reverse Shell Generator** — 17 languages with Base64/URL/PowerShell encoding
- **Encoder/Decoder** — Base64, URL, HTML, Hex, ROT13, Binary, MD5, SHA1, SHA256, JWT decode, and 3-op chain mode
- **Cheat Sheets** — nmap, Linux/Windows privesc, web enum, AD attacks, rev shells, hash identification
- **Kanban Lab Tracker** — Backlog → In Progress → Completed → Abandoned with drag-drop
- **Snippet Manager** — Store and search reusable commands; type `::` in chat to quick-insert
- **Progress & Gamification** — 18 achievements, 8-domain skill tree, XP, activity charts (Chart.js)
- **Session Management** — Autosave every 60s, multi-tab (up to 5), session restore, writeup export
- **Obsidian Integration** — Auto-wikilink generation and direct vault save
- **PDF Export** — Export writeups as formatted PDFs
- **4 Themes** — Cyberpunk, Terminal, Stealth (default), Warrior
- **VPN Monitor** — Detects tun0/tap0 every 30s, shown in top bar
- **Focus Mode** — Hides all UI chrome except the chat (F11 or button)
- **Offline Mode** — Command builder, encoder, cheat sheets, and shell generator work without API

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- A Claude API key (get one at [console.anthropic.com](https://console.anthropic.com))

### Install & Run

```bash
# 1. Clone or download this project
cd cyberlab-companion

# 2. Combine the renderer parts into renderer.js
cat renderer-part1.js renderer-part2.js renderer-part3.js > renderer.js
# On Windows:
# type renderer-part1.js renderer-part2.js renderer-part3.js > renderer.js

# 3. Install dependencies
npm install

# 4. Start the app
npm start
```

On first launch, the **Setup Wizard** will guide you through:
1. Welcome screen
2. Claude API key (tested live before saving)
3. Obsidian vault path (optional)
4. Theme selection
5. Done — app opens

---

## Build (Distributable)

```bash
# All platforms (requires correct OS or cross-compile toolchain)
npm run build

# Windows installer (.exe)
npm run build:win

# macOS DMG
npm run build:mac

# Linux AppImage + .deb
npm run build:linux
```

Built files go to `dist/`.

> **Icon note:** Place your icon files at `assets/icon.ico` (Windows), `assets/icon.icns` (macOS), and `assets/icon.png` (Linux) before building. See `assets/logo_placeholder.txt` for details.

---

## Project Structure

```
cyberlab-companion/
├── main.js               # Electron main process — IPC, Claude API, VPN, autosave
├── preload.js            # contextBridge — safe API surface for renderer
├── index.html            # App markup — all screens, modals, panels
├── style.css             # All 4 themes, animations, responsive layout
├── renderer.js           # Frontend logic (combined from parts below)
│
├── renderer-part1.js     # Inlined module logic (themes, sounds, session,
│                         #   commands, shells, encoder, progress, cheatsheets)
├── renderer-part2.js     # App state, init, splash, wizard, tabs, chat
├── renderer-part3.js     # Panels, kanban, progress screen, settings, IPC boot
│
├── session.js            # Session state & finding parser (CommonJS — used by main.js)
├── themes.js             # CSS var maps & applyTheme (CommonJS)
├── commandbuilder.js     # Tool definitions & buildCommand() (CommonJS)
├── reverseshell.js       # Shell templates & generateShell() (CommonJS)
├── encoder.js            # Encode/decode/hash operations (CommonJS)
├── progress.js           # Skill tree, achievements, computeStats (CommonJS)
├── labtracker.js         # Kanban card CRUD (CommonJS)
├── snippets.js           # Snippet CRUD & search (CommonJS)
├── sounds.js             # Web Audio API sound system (CommonJS)
├── cheatsheets.js        # Static cheat sheet data (CommonJS)
│
├── package.json          # npm manifest + electron-builder config
├── assets/
│   ├── logo_placeholder.txt
│   ├── icon.ico          # (add before building for Windows)
│   ├── icon.icns         # (add before building for macOS)
│   └── icon.png          # (add before building for Linux)
└── README.md
```

> **Why are there renderer-part*.js files?**
> `renderer.js` would be ~210KB as a single file. It was split into three parts for easier editing and to avoid context-window limits during AI-assisted development. Combine them with `cat` before running.

---

## Architecture Notes

- **contextIsolation: true, nodeIntegration: false** — The renderer cannot use `require()`. All Node/Electron access goes through the `contextBridge` API defined in `preload.js`.
- **renderer.js is self-contained** — All logic from the CommonJS module files is inlined into `renderer.js` so it works in the browser context.
- **Claude API calls are made from main.js** — The renderer sends messages via `window.electronAPI.claudeChat()`, which forwards them to the Anthropic API in the main process. API keys are stored via `safeStorage`.
- **Sessions are saved as JSON** — Stored in the user data directory (`app.getPath('userData')/sessions/`).

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + T` | New tab |
| `Ctrl/Cmd + W` | Close current tab |
| `Ctrl/Cmd + 1-5` | Switch to tab N |
| `Ctrl/Cmd + S` | Save session |
| `Ctrl/Cmd + K` | Open snippet search |
| `F11` | Toggle focus mode |
| `Esc` | Exit focus mode / close modal |
| `::` in chat | Trigger snippet quick-insert |
| `Enter` | Send message |
| `Shift + Enter` | New line in chat |

---

## Themes

| Theme | Accent | Style |
|---|---|---|
| **Cyberpunk** | `#b44fff` | Purple/cyan neon, grid texture |
| **Terminal** | `#00ff41` | Classic green-on-black CRT |
| **Stealth** | `#4a9eff` | Dark blue, GitHub-dark inspired (default) |
| **Warrior** | `#cc0000` | Deep red, vignette overlay |

---

## Finding Tags

The AI automatically extracts findings from its responses using `[FINDING:TYPE]` tags:

| Tag | Meaning |
|---|---|
| `[FINDING:PORT]` | Open port discovered |
| `[FINDING:CRED]` | Credential found |
| `[FINDING:CVE]` | CVE identifier |
| `[FINDING:FLAG]` | Flag captured |
| `[FINDING:FILE]` | File of interest |
| `[FINDING:SERVICE]` | Running service |
| `[FINDING:USER]` | Username discovered |
| `[FINDING:HASH]` | Hash value |

These appear as badges under AI messages and accumulate in the Findings panel on the left.

---

## Troubleshooting

**App won't start after `npm start`**
- Make sure you've combined the renderer parts: `cat renderer-part*.js > renderer.js`
- Run `npm install` again

**API calls failing**
- Open Settings and use the "Test" button next to the API key field
- Ensure your key starts with `sk-ant-`
- Check your internet connection (API calls are made from the main process, not the renderer)

**VPN not detected**
- The app looks for `tun0` and `tap0` interfaces. Other VPN interfaces (e.g. `wg0`) may not be detected by default
- You can disable VPN monitoring in Settings if not needed

**Obsidian saves not appearing**
- Confirm the vault path is the root of your Obsidian vault (the folder containing `.obsidian/`)
- Writeups are saved as `<session-name>.md` with auto-generated wikilinks

---

## Credits

Built by ItsEliias using Electron and the Anthropic Claude API (claude-sonnet-4-20250514).
