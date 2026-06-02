# CYBERLAB COMPANION — Internal Documentation

**Author:** ItsEliias  
**Version:** 1.0  
**Status:** Active Development  
**Ecosystem:** CYBERTOOLS

---

## 1. What Cyberlab Companion Is

Cyberlab Companion is an AI-assisted cybersecurity lab environment for hands-on security practitioners. It is the third flagship application in the CYBERTOOLS ecosystem.

**Core purpose:** To serve as a mission-control companion while a user works through penetration testing labs, Capture-the-Flag challenges, and cybersecurity training exercises. It tracks what has been found, structures the methodology, provides AI guidance calibrated to the user's chosen hint level, and produces polished writeups on session completion.

**Who uses it:** Cybersecurity students, HTB/TryHackMe practitioners, CTF competitors, and self-taught pentesters who want a structured, AI-assisted workspace rather than a scattered collection of terminal windows and notes documents.

**Problem it solves:**

- Lab sessions are chaotic — findings get lost, methodology goes out of order, and momentum stalls when stuck.
- Writeup production after a lab is time-consuming and inconsistent.
- Learners do not know when to use which tool, or what their next logical step should be.
- There is no single environment that tracks labs, stores commands, manages credentials found, flags captured, notes written, and provides contextual AI guidance simultaneously.

Cyberlab Companion consolidates all of this into one desktop-native application that understands the full session context at every moment.

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop runtime | Electron | ^33.0.0 |
| Build system | electron-vite | ^2.0.0 |
| Renderer framework | React | ^18.2.0 |
| State management | Zustand | ^4.5.0 |
| Animations | Framer Motion | ^11.0.0 |
| Code highlighting | react-syntax-highlighter | ^15.5.0 |
| Styling | Tailwind CSS | ^3.4.1 |
| Build bundler | Vite | ^5.0.0 |
| Packager | electron-builder | ^25.1.8 |
| Language | JavaScript (main/renderer) + TypeScript config files |
| AI model | Claude (claude-sonnet-4-20250514 via Anthropic API) |
| Chart library | Chart.js 4.4.1 (CDN, loaded at runtime) |
| Syntax highlighting (runtime) | highlight.js 11.9.0 (CDN, loaded at runtime) |

**Key architectural notes:**

- `contextIsolation: true`, `nodeIntegration: false` — the renderer has zero access to Node.js APIs. All privileged operations go through IPC.
- The renderer is a traditional multi-file HTML/JS structure (not a React SPA), built before the project was migrated to electron-vite. The `src/` directory contains a newer TypeScript/React scaffold that is not yet wired to `index.html`. The active UI is the root-level `index.html` + `renderer.js` (which loads `renderer-part1.js`, `renderer-part2.js`, `renderer-part3.js`).
- `react-syntax-highlighter`, `framer-motion`, and `zustand` are listed as runtime dependencies but are consumed by the `src/` scaffold, not the current live UI.
- No external databases. All persistence is local JSON files on disk.

---

## 3. App Structure — Full File Map

```
Cyberlab Compaion/
├── main.js                   Main process entry: IPC, Claude API, VPN, sessions, file I/O
├── preload.js                contextBridge surface — exposes electronAPI to renderer
├── ecosystem-bus.js          Shared local event bus (JSON file on disk)
├── index.html                Single HTML file; full application layout
├── renderer.js               Renderer entry — concatenates/delegates to the three part files
├── renderer-part1.js         Themes, sounds (AudioContext), session state model, AI prompts
├── renderer-part2.js         AppState object, utility helpers, splash, wizard, top bar, tabs
├── renderer-part3.js         All panels: command builder, reverse shells, encoder, cheatsheets,
│                             notes, snippets, kanban tracker, progress screen, settings, IPC
│                             listeners, V2 layout, phase screens, dashboard, overview
├── commandbuilder.js         Tool definitions (TOOL_CATEGORIES, TOOLS[]) with buildCommand()
├── reverseshell.js           SHELL_LANGUAGES[], payload templates, encode/generate functions
├── encoder.js                Encode/decode/hash operations (Base64, URL, HTML, Hex, ROT13,
│                             MD5, SHA-1, SHA-256, JWT decode) — all local, no API
├── cheatsheets.js            CHEATSHEETS{} — bundled offline reference data (nmap, etc.)
├── labtracker.js             Lab card CRUD module: columns, platforms, difficulties
├── session.js                Session model, finding types, flag patterns, methodology phases,
│                             writeup system prompt builder, mistake tracker
├── progress.js               SKILL_TREE{}, ACHIEVEMENTS[], stats aggregation logic
├── snippets.js               Personal snippet library CRUD with usage counting
├── sounds.js                 Web Audio API sound effects — all synthesised, no audio files
├── themes.js                 CSS variable maps for all themes (legacy single-layer version)
├── style.css                 All application CSS including theme variables, layout, animations
├── tailwind.config.js        Tailwind configuration
├── postcss.config.js         PostCSS configuration
├── electron.vite.config.ts   electron-vite build config (points to src/ for future migration)
├── tsconfig.json             TypeScript root config
├── tsconfig.node.json        TypeScript config for main process
├── tsconfig.web.json         TypeScript config for renderer
├── package.json              Dependencies, build targets, scripts
├── generate-icons.js         Icon generation utility
├── build.sh / build-all-dmg.sh  Build shell scripts
├── start.sh                  Development start script
├── assets/
│   ├── logo.png / icon.icns / icon.ico / icon.png   Application icons
├── src/
│   ├── main/main.ts          New main process (not yet active)
│   ├── main/preload.ts       New preload (not yet active)
│   ├── renderer/             React/TypeScript renderer scaffold (not yet active)
│   └── shared/               Shared types/utilities
├── out/                      electron-vite build output
└── dist/                     electron-builder distribution packages
```

---

## 4. UI Architecture — All Panels and Screens

The UI is a single-page application divided into a persistent left sidebar, a top bar, a tab bar for sessions, and a screen container that swaps between named screens.

### Left Sidebar

Always visible. Contains:

- **Brand header** — "CC" logo mark, "CYBERLAB" app name, "// ItsEliias" creator tag.
- **Primary navigation** — 14 labelled nav items with icons:
  - Dashboard, Overview, Chat (Lab), Exploits, Enum, Privilege Esc., Post-Exploitation, Loot & Creds, Notes, Bookmarks, Commands, Active Recon, Reports (Progress), Settings
- **Session browser** — "All Sessions" button opens the session list modal.
- **User row** — operator avatar, username ("ItsEliias"), role ("Operator").
- **Lab progress widget** — overall progress bar, and four live stats: Machines Hacked, Flags Captured, Hints Used, Time Spent.

### Top Bar

Always visible. Contains:

- **App identity** — logo, "CYBERLAB COMPANION", "// ItsEliias".
- **Session indicator** — pulsing dot + current session name ("No active session" when idle).
- **VPN chip** — live indicator of VPN connection status (interface name / "No VPN").
- **Quick nav pills** — Progress and Tracker shortcuts.
- **Theme dropdown** — workspace quick-switch (Stealth, Graphite, Frost, OLED).
- **Settings icon button**.
- **Focus Mode button**.
- **API status dot** — green when Claude API key is valid.

### Tab Bar

Below the top bar. Each open lab session gets its own tab. Tabs show the lab name and a close button. The `+` button opens the new-session modal. Tabs allow running multiple concurrent sessions.

### Screen Container

The main content area. Only one screen is active at a time. All screens:

| Screen ID | Nav Label | Description |
|---|---|---|
| `dashboard` | Dashboard | Home screen: operator stats, recent sessions, pentest tip, quick actions |
| `overview` | Overview | Active session summary: target info, findings counters, methodology phases |
| `lab` | Chat | Three-panel lab workspace (target panel, AI chat, tools/notes right panel) |
| `exploits` | Exploits | Phase-specific findings list + tool library for exploit-category tools |
| `enum` | Enum | Phase screen for enumeration findings and recon/enum tool library |
| `privesc` | Privilege Esc. | Phase screen for privilege escalation findings and privesc tool library |
| `postex` | Post-Exploitation | Phase screen for post-ex findings and post-ex tool library |
| `loot` | Loot & Creds | Phase screen for credentials, flags, hashes, and quick credential commands |
| `notes` | Notes | Global and per-session notes grid with search and source filter |
| `bookmarks` | Bookmarks | Bookmarked notes across all sessions |
| `commands` | Commands | Command builder, reverse shell generator, encoder, cheatsheet reference |
| `recon` | Active Recon | Active recon tools panel |
| `progress` | Reports | XP, skill tree, achievements, radar chart, activity chart |
| `tracker` | Tracker | Kanban board for lab pipeline management |
| `settings` | Settings | API key, Obsidian vault, theme, font size, toggles, version |

### Lab Screen — Three-Panel Layout

The most complex screen, active during a session:

**Target Panel (left, fixed width)**
- Active target name, status dot, platform selector, difficulty badge
- IP address, hostname, OS, and release note (editable inline)
- Findings sections: Open Ports, Services, Credentials, Users, Flags (with fraction display), CVEs
- Methodology phase progress checklist
- Hint level control (slider + −/+ buttons, labels: Nudge / Hint / Guidance / Walkthrough / Full Solution)
- Session timer and action buttons: Mark Complete, Add Finding, Session Summary, Generate Writeup

**Center Panel (AI Chat)**
- Chat history display with syntax-highlighted code blocks
- Typing indicator while Claude is generating
- Image attachment area (drag/drop or file picker)
- Terminal output paste area (collapsible)
- Quick-pill buttons: What next?, Give me a hint, Analyse output, I'm stuck, What tool?, Full solution, Teach me, + Custom
- Message input (auto-resizing textarea, Ctrl+Enter to send)
- Context selector (shows which session context is active)
- Auto-commands indicator
- Teach Me toggle

**Right Panel (Tools + Notes)**
- Tool filter tabs: All, Recon, Enum, Exploit, PrivEsc, Post
- Tool search input
- Tool cards with run (▶) and click-to-paste behaviour, auto-filling target IP
- Custom tool management (add/remove)
- Notes panel with Notes/Bookmarks sub-tabs, per-note textarea with auto-save and bookmark toggle

---

## 5. Features

### 5.1 Session Management

Sessions are the core unit of work. Each session tracks a single lab or CTF challenge.

- **Create:** Click `+` tab button or "New Session" on dashboard. Modal collects lab name, platform (HTB, THM, PentesterLab, PortSwigger, PG Practice, CTF, VulnHub, Cisco, Other), difficulty (Easy, Medium, Hard, Insane), lab type, target IP, OS, and optional timer (exam mode).
- **Lab types:** HTB/THM Linux, HTB/THM Windows, CTF, Cisco/Networking, Web App, OSINT/CTF, Other. The lab type sets the methodology phase set.
- **Multiple tabs:** Multiple sessions can be open concurrently in tabs. Switching tabs updates all panels to the active session.
- **Autosave:** Every 60 seconds the main process fires an `autosave-tick` event. The renderer serialises all tabs with chat history and saves each to `~/.cyberlab-companion/sessions/session_<id>.json`.
- **Resume:** Sessions list modal shows all saved sessions. "Resume" restores the full session state including chat history, findings, and methodology state.
- **Delete:** Removes the session JSON file from disk.
- **Mark Complete:** Triggers the writeup generation button and emits a session-complete sound.

### 5.2 AI Assistant (Claude Integration)

The AI assistant is always context-aware of the active session. Every message sent to Claude includes the full system prompt with:

- Session name, platform, difficulty
- Target IP, hostname, OS
- Current hint level (1–5) and its behaviour definition
- Teach Me Mode status
- All methodology phases and which are completed
- All current findings (ports, users, credentials, CVEs, flags, services, files, hashes)

**Hint levels:**

| Level | Label | Behaviour |
|---|---|---|
| 1 | Nudge | One sentence, zero tool or technique names |
| 2 | Hint | General category of technique only |
| 3 | Guidance | Names the tool/technique and explains why, no exact command |
| 4 | Walkthrough | Full steps, exact commands, expected output |
| 5 | Full Solution | Every command in order with full explanation |

**Teach Me Mode:** When active, Claude responds only with Socratic guiding questions and never gives the answer directly.

**Automatic finding extraction:** Every AI response is parsed for `[FINDING:type] value` markers. Findings are also detected with regex patterns: `HTB{...}`, `THM{...}`, `FLAG{...}`, `picoCTF{...}`, and the general `word{content}` flag format. Extracted findings are automatically added to the target panel.

**Quick pills:** Pre-built prompt shortcuts for common questions ("What next?", "Give me a hint", "Analyse output", "I'm stuck", "What tool?", "Full solution"). A custom pill can be created with any prompt text.

**Image attachment:** Users can attach screenshots or terminal captures to a message. The image is base64-encoded and included in the Claude API payload.

**Terminal output paste:** A collapsible textarea for pasting raw terminal output. When submitted, it is appended to the user message so Claude can analyse it.

**Mistake tracking:** The session records repeated commands, hint escalations per topic, and methodology phase completion order anomalies. These patterns are surfaced in the session summary.

### 5.3 Methodology Tracker

Standard set of phases for pentesting labs:
`Reconnaissance → Enumeration → Exploitation → Post-Exploitation → Privilege Escalation → Lateral Movement → Flag Capture`

For OSINT/CTF labs a different set is applied:
`Passive Recon → Active Recon → Username/Identity Enumeration → Metadata Analysis → Domain/Infrastructure Intel → Social Engineering Analysis → Reporting`

Phases are displayed in the target panel and the Overview screen. Clicking a phase marks it complete. The active phase is tracked and surfaced in every AI prompt. Out-of-order completions are flagged as methodology breaks.

### 5.4 Findings Management

Eight finding types: PORT, CRED, CVE, FLAG, FILE, SERVICE, USER, HASH.

- Findings can be added manually via the "Add Finding" button or extracted automatically from AI responses.
- Each finding has an ID, value, and timestamp.
- Duplicate detection prevents the same value being added twice.
- Flags are validated against the standard CTF format `word{content}`.
- The findings panel in the target panel shows live counts and lists. Each finding has a delete button.
- All findings are embedded in every subsequent AI prompt.

### 5.5 Command Builder

A structured form-based command generator. Covers 9 tool categories: Recon, Web, SMB/AD, Auth, Exploit, Post-Exploit, Net, OSINT, Misc.

Each tool has:
- Label, description, install instruction, reference URL
- Parameter schema (text inputs, selects, checkboxes, textareas) with placeholder values
- `buildCommand(params)` function that produces the final command string

Tools include: nmap (quick/full/UDP/script), masscan, rustscan, gobuster, ffuf, feroxbuster, nikto, SQLmap, Hydra, Metasploit, hashcat, john, enum4linux, smbclient, ldapsearch, impacket tools, BloodHound-python, and many more.

Target IP from the active session is auto-filled into IP/target/host parameter fields. The built command can be copied or sent directly to the AI chat.

### 5.6 Reverse Shell Generator

Generates ready-to-use reverse shell payloads for 17 languages/tools:
Bash, Python 2, Python 3, PHP, PowerShell, Perl, Ruby, Java, Golang, Node.js, Socat, Awk, Lua, Netcat, Ncat, BusyBox nc, Telnet.

Three encoding options: Raw, Base64, URL Encoded.

Output includes:
- Encoded payload
- Netcat listener command (`nc -lvnp <port>`)
- Shell stabilisation commands (pty spawn, TERM, stty)

The payload can be copied individually, or sent directly to the AI chat with context about the intended use. The listener IP placeholder defaults to the session's tun0 interface.

### 5.7 Encoder / Decoder

Local encode/decode/hash panel — no API calls, runs entirely in the browser context.

Supported operations:
- Base64 encode/decode
- URL encode/decode
- HTML encode/decode
- Hex encode/decode
- ROT13
- Text → Binary / Binary → Text
- Decimal → Hex / Hex → Decimal
- MD5 hash (pure JS implementation)
- SHA-1 hash (Web Crypto API)
- SHA-256 hash (Web Crypto API)
- JWT decode (shows header and payload)

**Chain mode:** Up to three operations can be chained in sequence. Each step shows the intermediate result.

Quick-action buttons for common patterns. Swap button exchanges input and output. Copy button copies the result to clipboard.

### 5.8 Cheatsheet Reference

Bundled offline reference database. Zero network calls. Topics include (from `cheatsheets.js`): nmap flags, and additional topics defined in the data object.

Each cheatsheet entry has a flag/command, description, copy button, and a "discuss in chat" button that pre-populates the AI message input.

**Port lookup:** Enter a port number to instantly identify the associated service.

Full-text search filters cheatsheet content in real time.

### 5.9 Lab Tracker (Kanban)

Four-column kanban board: Backlog, In Progress, Completed, Abandoned.

- **Card data:** name, platform, difficulty, IP, OS, notes, URL, completion timestamp
- **Drag and drop:** Cards can be dragged between columns. Moving to Completed triggers a session-complete sound.
- **HTB API sync:** Authenticates with an HTB API token (JWT), extracts user ID from the JWT payload, tries multiple endpoint patterns to retrieve machine history, falls back to activity feed if full history is unavailable. Returns machine name, difficulty, OS, and URL.
- **THM sync:** Fetches completed rooms from the public TryHackMe user profile API.
- **Bulk import:** Paste newline-separated lab names (optionally with `,Difficulty`). All are added to the Backlog column.
- **Filters:** Search by name/notes, filter by platform and difficulty.
- **Start session:** Opening a card detail modal shows a "Start Session" button that creates a new session tab pre-populated from the card's data and moves the card to In Progress.

### 5.10 Progress & Gamification

**Skill Tree:** Eight domains, each with multiple skill nodes:
- Web Security (SQL Injection, XSS, SSRF, File Upload, Auth Bypass, API Hacking, IDOR, SSTI)
- Network (Port Scanning, Packet Analysis, MITM, Firewall Bypass, VPN/Tunnelling, Cisco/Networking, Protocol Analysis)
- Active Directory (Kerberoasting, AS-REP Roasting, Pass the Hash, BloodHound, GPO Abuse, DCSync, Silver/Golden Ticket)
- Privilege Escalation (SUID/SGID, Sudo Misconfig, Cron Jobs, PATH Hijacking, Kernel Exploits, Token Impersonation, DLL Hijacking)
- Cryptography (Hash Cracking, Encoding/Decoding, RSA, AES, Classic Ciphers, JWT)
- Forensics (File Carving, Steganography, Memory Analysis, Log Analysis, PCAP Analysis)
- Reverse Engineering (Static Analysis, Dynamic Analysis, Buffer Overflow, ROP Chains, Debugging)
- OSINT (Username Recon, Metadata, Google Dorking, Social Engineering, Domain Intel)

Node unlocking is inferred from chat content and commands used, matched against keyword lists.

**Achievements:** Named badges with unlock conditions tracked against session stats. Examples: First Blood, Script Kiddie No More, Root Hunter, Speed Runner, Persistence (7-day streak), On a Roll (30-day streak), and more.

**Charts:**
- Radar chart: skill level per domain (Chart.js)
- Bar chart: session activity over last 14 days (Chart.js)

**AI progress analysis:** "Analyse My Progress" button sends a summary of stats and session count to Claude and asks for weakness identification, practice recommendations, and an actionable training tip. The response appears in the AI chat.

### 5.11 Writeup Generation

On session completion, "Generate Writeup" invokes Claude with a strict system prompt that produces a structured technical writeup.

The prompt enforces:
- Write only what succeeded (no failed attempts, no hint acknowledgement)
- Neutral voice throughout
- Every command in fenced code blocks with correct language tag
- Exact output snippets where available
- Fixed section order (YAML frontmatter, Overview, Reconnaissance, Enumeration, Exploitation, Post-Exploitation/PrivEsc, Flags, If I Did This Again, Lessons Learned)
- Alternate section structures for CTF, Cisco/Networking, and Web App labs

Context sent to Claude includes: all findings, all commands copied during the session, elapsed time, completed methodology phases, flags captured, and a digest of AI-suggested steps.

**Export options:**
- Save to Obsidian vault: writes a `.md` file to `<vault>/Writeups/<platform>/<lab-name>.md`
- Export PDF: uses Electron's `printToPDF()` to produce an A4 PDF via native save dialog

### 5.12 Snippet Library

Personal command snippet store. Each snippet has a title, content, tags, and usage count.

- Create, edit, delete snippets
- Tag filtering and full-text search
- Copy to clipboard
- "Send to chat" injects the snippet content into the message input and switches to the lab screen
- Persisted to `~/.cyberlab-companion/snippets.json`

### 5.13 Notes System

Two note contexts:

- **Session notes:** Attached to a specific session. Saved with session data. Appear in the right-panel Notes tab during a lab.
- **Global notes:** Not tied to a session. Available regardless of active tab.

Notes support bookmark toggle (★), full-text, and per-source filtering from the dedicated Notes screen. Auto-save on textarea blur.

### 5.14 Phase Screens

Five dedicated screens for specific attack phases. Each screen has:
- A findings list for that phase (add manually or enter key submits)
- A tool library drawn from the matching tool category in `DEFAULT_TOOLS`
- Library tools can be added to findings list or clicked to paste command into AI input

Phases: Exploits, Enum, PrivEsc, Post-Exploitation, Loot & Creds.

### 5.15 Theme System

Two-layer architecture:

**Core themes (workspace/background):** Stealth (default), Graphite, Frost, OLED  
**Personality themes (atmosphere/accent):** Neutral, Cyberpunk, Terminal, Threat

Users combine one core and one personality theme (e.g. "Stealth + Cyberpunk"). The combination is displayed as a label ("Stealth + Neutral").

Each combination adjusts CSS variables across the entire application. The personality layer also controls: syntax highlighting theme, body classes for texture/vignette/cursor effects, and font family (monospace for Cyberpunk/Terminal, system-ui for others).

Theme changes are immediate, animated with a 300ms CSS transition, and persisted to the shared ecosystem config file.

### 5.16 Sound System

All sounds are synthesised at runtime using the Web Audio API — no audio files bundled. Events with audio feedback:

| Event | Sound |
|---|---|
| Finding added | Short high-frequency sine |
| Flag captured | Three-note ascending triangle chord |
| Achievement unlocked | Four-note ascending cascade |
| Session complete | Three-note sine sequence |
| API error | Two descending sawtooth tones |
| Timer expiry | Two square wave pulses |
| Focus mode toggle | Eight-tone sweep |
| Theme switch / click | Short sine click |

Sounds are globally enabled/disabled and have a master volume control. Both persist to the config.

### 5.17 VPN Monitor

Checks OS network interfaces every 30 seconds (interval in main process). Looks for known VPN interface names: `tun0`, `tun1`, `tap0`, `tap1`, `ppp0`, `ppp1`, `utun0`–`utun5`, `wg0`. Reports interface name and IPv4 address if detected.

Status is pushed to the renderer via `vpn-status` IPC event and displayed in the VPN chip in the top bar and the focus mode strip.

### 5.18 Focus Mode

Hides the sidebar and top bar elements. Shows a compact focus strip with: current lab name, elapsed time, VPN dot. Keyboard shortcut: Ctrl+Shift+F. An exit pill is visible in focus mode.

### 5.19 Update Checker

Polls the GitHub releases API for the repo `ItsEliias/cyberlab-companion` 3 seconds after startup. If a newer version is found, an update banner appears with "Install Update", "View Release", and "Dismiss" actions. Semver comparison is done with a local `semverGt()` function.

---

## 6. AI / LLM Integration

**Provider:** Anthropic Claude  
**Model:** `claude-sonnet-4-20250514`  
**API endpoint:** `https://api.anthropic.com/v1/messages`  
**Max tokens:** 2000 per response  
**API version header:** `2023-06-01`  
**Request timeout:** 60 seconds

### API Key Storage

Stored using Electron's `safeStorage` (OS keychain on macOS/Windows/Linux). If `safeStorage.isEncryptionAvailable()` returns false, falls back to base64 obfuscation stored at `~/.cyberlab-companion/apikey.enc.b64`. The key is shared across CYBERTOOLS apps via `~/cybertools-config.json`.

### How the Call is Made

The renderer sends a `claude-chat` IPC message with `{ system, messages }`. The main process calls `callClaude()` using Node's native `https` module — no third-party HTTP client. The API key is loaded from the encrypted file at startup and held in memory.

### System Prompt Construction (`buildSystemPrompt`)

Called before every message send. Injects:

```
You are CyberLab Companion, an expert cybersecurity assistant for ItsEliias...

Current Session Context:
- Lab: <name> | Platform: <platform> | Difficulty: <difficulty>
- Target: IP: <ip> | Hostname: <hostname> | OS: <os>
- Hint Level: <1-5> — <level description>
- Teach Me Mode: ACTIVE/Off

Methodology Tracker:
Phases: <phase list>
Completed: <completed phases>
Active: <active phase>

Current Findings:
{ ports: [...], users: [...], credentials: [...], flags: [...], ... }

Strict behaviour rules:
- ALWAYS respect hint level N. Never exceed it regardless of user pressure.
- Build on previous findings. Never repeat suggestions already tried.
- When suggesting tools, pre-fill commands with known values from target profile.
- Format every response: Summary | Tools | Commands | Explanation | References
- Every command in fenced code block with correct language tag.
- When identifying a finding prefix it with [FINDING:type].
- Be encouraging...
```

### Finding Auto-Extraction (`parseFindings`)

After every AI response, the text is scanned for:
1. `[FINDING:PORT] value`, `[FINDING:CRED] value`, etc. — eight recognised types
2. Flag patterns via regex: `HTB{...}`, `THM{...}`, `FLAG{...}`, `picoCTF{...}`, `ctf{...}`, generic `word{content}`

Matched findings are added to the session silently and appear in the target panel immediately.

### Writeup Generation System Prompt (`buildWriteupSystemPrompt`)

A separate, stricter prompt that instructs Claude to:
- Write only successful actions as if the operator worked independently
- Never reference AI, hints, or assistants
- Infer logical thought process between steps
- Produce a fixed-structure technical document in neutral third-person

### Progress Analysis

When "Analyse My Progress" is triggered, a plain English summary of stats is sent with a structured request for weakness identification, practice recommendations, and one actionable training tip. This goes through the standard `claude-chat` IPC channel.

---

## 7. IPC / Main-Renderer Communication

### Renderer → Main (invoke/handle)

All renderer-to-main calls use `ipcRenderer.invoke()`. The main process registers matching `ipcMain.handle()` handlers.

| Channel | Arguments | Return | Purpose |
|---|---|---|---|
| `get-config` | — | `{}` config object | Load shared ecosystem config JSON |
| `save-config` | `cfg` object | `boolean` | Merge and persist config |
| `get-output-dir` | — | `string` path | Return `~/.cyberlab-companion` |
| `save-api-key` | `key` string | `boolean` | Encrypt and persist API key |
| `has-api-key` | — | `boolean` | Check if encrypted key file exists |
| `test-api-key` | `key` string | `{ success, error? }` | Make a test Claude API call |
| `claude-chat` | `{ system, messages }` | `{ success, data? }` | Forward message to Claude API |
| `save-session` | session data object | `{ success, path? }` | Write session JSON to disk |
| `load-session` | `id` string | session object or null | Read session JSON from disk |
| `list-sessions` | — | session[] | List all session JSON files |
| `delete-session` | `id` string | `boolean` | Delete session JSON file |
| `save-writeup` | `{ content, labName, platform, vaultPath }` | `{ success, path? }` | Write markdown to Obsidian vault |
| `export-pdf` | `{ content, labName }` | `{ success, path? }` | Print current webContents to PDF |
| `scan-vault` | `vaultPath` string | `string[]` note names | Walk vault dir for `.md` files |
| `pick-folder` | — | `string` or null | Show native folder picker dialog |
| `check-vpn` | — | `{ status, interface?, ip? }` | Read OS network interfaces |
| `check-update` | — | `{ available, version?, url? }` | Poll GitHub releases API |
| `sync-htb` | `apiKey` string | `{ success, labs[], partial? }` | HTB API authentication + machine fetch |
| `sync-thm` | `username` string | `{ success, labs[] }` | TryHackMe public profile fetch |
| `update-launcher-status` | status object | — | Write status to ecosystem config |
| `ecosystem-emit` | `appName, eventType, data` | `true` | Write event to ecosystem bus file |
| `save-progress` | progress data | `boolean` | Persist progress.json |
| `load-progress` | — | data or null | Load progress.json |
| `save-lab-tracker` | labs data | `boolean` | Persist labs.json |
| `load-lab-tracker` | — | data or null | Load labs.json |
| `save-snippets` | snippets data | `boolean` | Persist snippets.json |
| `load-snippets` | — | data or null | Load snippets.json |
| `open-external` | `url` string | — | Open URL in system browser |
| `get-version` | — | `string` '1.0' | Return APP_VERSION |
| `get-platform` | — | `string` | Return `process.platform` |

### Main → Renderer (send)

| Channel | Payload | When |
|---|---|---|
| `vpn-status` | `{ status, interface?, ip? }` | Every 30 seconds |
| `autosave-tick` | — | Every 60 seconds |
| `update-available` | `{ version, url }` | 3 seconds after launch if update found |
| `focus-window` | — | Window gains focus |

### preload.js Events API

The renderer subscribes via:
- `electronAPI.onVpnStatus(cb)` — live VPN status updates
- `electronAPI.onAutosaveTick(cb)` — triggers autosave loop
- `electronAPI.onUpdateAvailable(cb)` — shows update banner
- `electronAPI.onFocusWindow(cb)` — refreshes session display on window focus

Listeners are cleaned up with `electronAPI.removeAllListeners(channel)`.

---

## 8. Ecosystem Communication

### Ecosystem Bus (`ecosystem-bus.js`)

**Mechanism:** A shared JSON file at:
```
~/Library/Application Support/CyberTools/ecosystem-events.json    (macOS)
```
(On Linux/Windows the path uses `os.homedir()` equivalents.)

**Format:** An array of event objects, newest first, capped at 150 events:
```json
{
  "id": "1748765432-abc12",
  "timestamp": "2025-06-01T10:30:00.000Z",
  "app": "CyberLab",
  "event": "cyberlab.session.started",
  "data": { "name": "Lame" }
}
```

**Reading:** `readEvents()` — synchronous file read, returns array.  
**Writing:** `emitEvent(appName, eventType, data)` — prepends event, trims to 150, writes back.  
**Watching:** `watchEvents(callback)` — `fs.watch()` on the file with 80ms debounce. Used by the Launcher to detect activity from all apps.

### Events Emitted by Cyberlab Companion

| Event type | When fired | Data |
|---|---|---|
| `cyberlab.session.started` | Session JSON is saved | `{ name: labName }` |
| `cyberlab.htb.synced` | HTB sync returns results | `{ count: N }` |
| `cyberlab.thm.synced` | THM sync returns results | `{ count: N }` |

Any call to `window.electronAPI.ecosystemEmit(appName, eventType, data)` from the renderer also writes to the bus via the `ecosystem-emit` IPC handler.

### Shared Ecosystem Config (`~/cybertools-config.json`)

A JSON file shared across all CYBERTOOLS apps. Cyberlab Companion reads and writes keys:
- `apiKeyConfigured` — boolean, set when API key is saved
- `obsidianVault` — path to vault, shared with GhostVault and VaultCore
- `cyberlab` — `{ installed, version, execPath }`, written at startup for Launcher registration
- `cyberlab_status` — `{ activeSession, elapsedTime, hintLevel, streak, lastActive }`, updated as session state changes; cleared to null on app quit
- `updateCheckUrl` — optional override for the update check URL

### Launcher Integration

On startup, Cyberlab Companion calls `registerWithLauncher()` which writes `cyberlab.installed = true`, the version, and executable path to the shared config. This is how the Cybertools Launcher discovers the app.

When `--launcher-open` is passed as a command-line argument (the Launcher passes this when the user clicks the app in the launcher), the window is focused.

### Connection to Other Ecosystem Apps

| App | Connection |
|---|---|
| **Cybertools Launcher** | Reads `cyberlab_status` from shared config and `ecosystem-events.json` for activity feed |
| **GhostVault** | Shares `obsidianVault` path via shared config; writeups are saved to the same vault |
| **VaultCore** | May index the same Obsidian vault path |
| **CyberOS Dashboard** | Reads ecosystem events from the shared bus |
| **ReconDesk, SignalBoard** | Event bus is readable by all; CyberLab emits session and sync events |

---

## 9. Data Layer

### Storage Locations

| File | Path | Contents |
|---|---|---|
| Shared config | `~/cybertools-config.json` | Cross-app settings, launcher registration, vault path |
| Encrypted API key | `~/.cyberlab-companion/apikey.enc` | OS-encrypted API key bytes |
| API key fallback | `~/.cyberlab-companion/apikey.enc.b64` | Base64-encoded API key (no OS keychain) |
| Progress data | `~/.cyberlab-companion/progress.json` | Skill tree, achievements, XP, stats |
| Lab tracker | `~/.cyberlab-companion/labs.json` | All kanban cards across columns |
| Snippets | `~/.cyberlab-companion/snippets.json` | Personal snippet library |
| Sessions | `~/.cyberlab-companion/sessions/session_<id>.json` | Individual session files |
| Ecosystem bus | `~/Library/Application Support/CyberTools/ecosystem-events.json` | Shared event log |

### Session JSON Schema (key fields)

```json
{
  "id": "unique-id",
  "name": "Lab Name",
  "labName": "Lab Name",
  "platform": "HTB",
  "difficulty": "Medium",
  "labType": "HTB/THM Linux",
  "startTime": 1748765432000,
  "endTime": null,
  "target": { "ip": "", "hostname": "", "os": "Unknown", "notes": "" },
  "findings": {
    "ports": [{ "id": "...", "value": "22/tcp", "addedAt": "..." }],
    "users": [], "credentials": [], "flags": [], "cves": [],
    "files": [], "hashes": [], "services": []
  },
  "methodology": {
    "phases": ["Reconnaissance", "Enumeration", "..."],
    "completed": [],
    "activePhase": null
  },
  "hintLevel": 1,
  "teachMeMode": false,
  "chat": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }],
  "toolsUsed": [],
  "commandsCopied": [],
  "notesList": [{ "id": "...", "text": "", "createdAt": 0, "bookmark": false }],
  "timer": { "enabled": false, "totalSeconds": 7200, "elapsed": 0, "running": false, "overtime": false },
  "complete": false,
  "mistakes": { "repeatedCommands": {}, "skippedSteps": [], "hintEscalations": {}, "methodologyBreaks": [] },
  "phaseFindings": { "exploits": [], "enum": [], "privesc": [], "postex": [], "loot": [] }
}
```

### What is NOT Persisted

- In-memory chart instances
- Drag state
- Focus mode state
- Custom pills (session only)
- Renderer-side `AppState.globalNotes` across restarts (not yet persisted to disk — global notes live only while the app is open)

---

## 10. Use Cases — End-to-End Scenarios

### Scenario 1: Starting an HTB Machine (Lame)

1. User opens Cyberlab Companion. Dashboard shows no active sessions.
2. Clicks "+ New Session". Modal: name "Lame", platform "HTB", difficulty "Easy", type "HTB/THM Linux", IP "10.10.10.3", OS "Linux".
3. Session tab created. Lab screen opens. Target panel shows Lame, Easy, HTB, IP populated.
4. User types in chat: "I've just started Lame. What should I do first?" — hint level is 1 (Nudge).
5. Claude responds with a one-sentence nudge about initial reconnaissance. No tool names.
6. User opens Command Builder, selects Recon > nmap (quick). IP auto-fills. Clicks Build Command. Copies `nmap -sV -sC -p- --min-rate 5000 10.10.10.3`.
7. User runs nmap in terminal. Pastes output into the terminal output area and submits.
8. Claude analyses the output. Response includes `[FINDING:PORT] 21/tcp`, `[FINDING:PORT] 22/tcp`, `[FINDING:SERVICE] Samba 3.0.20`.
9. Ports 21, 22 and Samba service appear automatically in the target panel.
10. User marks Reconnaissance as complete in the methodology tracker. Active phase advances to Enumeration.
11. Session auto-saves every 60 seconds. Ecosystem bus receives `cyberlab.session.started` event. Launcher shows CyberLab as active.

### Scenario 2: Getting Stuck and Escalating Hints

1. User has been trying to exploit a service for 40 minutes with no progress.
2. Hint level is at 1 (Nudge). User clicks "+" twice to raise to 3 (Guidance).
3. Asks: "What tool and approach should I use for this Samba service?"
4. Claude names the tool and explains why without giving the exact command.
5. Still stuck. User raises hint to 4 (Walkthrough). Gets full steps and exact commands.
6. The session's `hintEscalations` mistake tracker records the escalation topic.

### Scenario 3: Completing a Machine and Generating a Writeup

1. User captures user and root flags. Both appear automatically in Findings panel.
2. Marks methodology phases complete. Clicks "✓ Done".
3. Writeup button appears. Clicks "Generate Writeup".
4. Claude produces a full technical writeup in the correct format: YAML frontmatter, Overview, Reconnaissance, Enumeration, Exploitation, Post-Exploitation, Flags, If I Did This Again, Lessons Learned.
5. User previews writeup in the chat area.
6. Clicks "Save to Obsidian". File written to `~/Documents/MyVault/Writeups/HTB/Lame.md`.
7. Session complete sound plays. Achievement "First Blood" unlocks.
8. Progress screen updates: +1 labs pwned, +2 flags captured, XP added.

### Scenario 4: Managing a Lab Pipeline

1. User goes to Tracker screen. Kanban board shows empty columns.
2. Clicks "Sync HTB". Enters HTB API token in Settings first.
3. API returns 12 completed machines. All added to Backlog (deduplication prevents overlaps).
4. User drags "Lame" from Backlog to Completed (already done).
5. User adds "Bastard" manually: clicks "+ Add Lab", fills in name, selects HTB/Hard.
6. Adds "Forest" and "Active" to Backlog by bulk import: pastes both names.
7. Opens "Bastard" card. Clicks "Start Session" — new session tab created and card moves to In Progress.

### Scenario 5: CTF Competition Mode

1. User creates a new session. Name: "PlaidCTF 2025 - Rev Challenge". Type: "OSINT/CTF". Timer enabled: 60 minutes.
2. Methodology phases switch to OSINT set: Passive Recon → Active Recon → ... → Reporting.
3. Exam mode countdown timer is visible in the target panel. Timer expiry sound plays if time runs out.
4. User uses Encoder panel to decode a base64 string found in the challenge.
5. Uses Cheatsheet panel (ROT13 section) to identify an encoding used in a clue.
6. Flags are in format `pctf{...}`. When AI response contains `pctf{s0lved}`, it is auto-extracted and appears in findings.
7. Writeup uses the CTF section structure: Overview, Challenge Description, Solution, Flag, Techniques Used, Lessons Learned.

### Scenario 6: Offline Work (No API Key / No Internet)

1. User is on a plane. No internet, no Claude API key.
2. Offline banner appears at top of screen.
3. Command Builder, Reverse Shell Generator, Encoder, Cheatsheets, and Lab Tracker all work fully.
4. Notes can be written. Snippets can be created.
5. Session is opened and findings can be added manually.
6. On reconnection, user sends accumulated questions to the AI in one message.

---

## 11. Entry Points and Build

### Development

```bash
npm run dev
# or
npm start
# or
./start.sh
```

`electron-vite dev` starts the app in dev mode. Hot reload is available for the renderer via Vite. The live UI loads `index.html` from the root, not from `src/renderer/` — see note on migration status in Section 3.

### Production Build

```bash
npm run build          # Build only (out/ directory)
npm run package:mac    # Build + create macOS DMG (x64 + arm64)
npm run package:win    # Build + create Windows NSIS installer (x64)
npm run package:linux  # Build + create AppImage + deb
```

Shell scripts:
```bash
./build.sh             # macOS build
./build-all-dmg.sh     # All platform DMGs
```

**Output locations:**
- `out/` — compiled JS (electron-vite output, referenced by `"main": "out/main/index.js"` in package.json)
- `dist/` — packaged distributable (electron-builder output)

### electron-vite Config (`electron.vite.config.ts`)

Points to `src/main/main.ts` (main process) and `src/renderer/index.html` (renderer). These are the future React/TypeScript targets. The current working app at the project root is loaded by Electron's `loadFile('index.html')` in `main.js`, bypassing the vite build for the root-level files.

### App Lifecycle (main.js)

```
app.whenReady()
  ├── ensureDirs()             Create ~/.cyberlab-companion and sessions/
  ├── loadApiKeySecure()       Load encrypted key into memory
  ├── registerIPC()            Register all ipcMain.handle() handlers
  ├── createWindow()           BrowserWindow 1400×900, loads index.html
  ├── registerWithLauncher()   Write to ~/cybertools-config.json
  ├── startIntervals()         VPN poll (30s), autosave tick (60s)
  └── checkForUpdates()        After 3s delay, sends update-available if needed

app.on('window-all-closed')
  └── stopIntervals() → app.quit() (non-macOS)

app.on('before-quit')
  └── stopIntervals() → clear launcher status
```

### Security Configuration

- `contextIsolation: true` — renderer and main are isolated
- `nodeIntegration: false` — renderer has no Node.js access
- `webSecurity: true` — same-origin policy enforced
- External URLs are intercepted and opened in the system browser, never in the app
- New window creation is blocked entirely
- Navigation away from `file://` is blocked

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
img-src 'self' data: blob:;
font-src 'self' https://cdnjs.cloudflare.com;
connect-src 'self';
media-src 'self'
```

CDN resources: highlight.js and Chart.js are loaded from `cdnjs.cloudflare.com`. The Anthropic API is called from the main process (Node.js) and is not subject to the renderer CSP.

---

## Ecosystem Fit

Within the CYBERTOOLS ecosystem, Cyberlab Companion is the **active operations layer** — it is where the user spends the majority of their time during a hacking session. Its role relative to other apps:

- **GhostVault** receives writeup output from Cyberlab Companion (Obsidian vault path is shared).
- **VaultCore** may index and scrape the same vault where writeups are stored.
- **Cybertools Launcher** displays Cyberlab's active session status and receives session events via the ecosystem bus.
- **CyberOS Dashboard** reads the ecosystem event log to display cross-app activity.
- **ReconDesk** (if developed) would complement reconnaissance workflows that currently happen inside Cyberlab's recon panel and phase screens.
- **SignalBoard** would receive operational events from Cyberlab for monitoring or notification purposes.

The shared config file (`~/cybertools-config.json`) is the ecosystem's synchronisation spine. The ecosystem event bus (`ecosystem-events.json`) is the broadcast channel. Cyberlab Companion is a first-class contributor to both.

---

*// ItsEliias — CYBERTOOLS Ecosystem*
