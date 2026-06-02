# GhostVault — Internal Documentation

**Version:** 1.0.0
**Author:** ItsEliias
**Ecosystem:** CYBERTOOLS
**App ID:** com.itsEliias.ghostvault

---

## Table of Contents

1. [What GhostVault Is](#1-what-ghostvault-is)
2. [Tech Stack](#2-tech-stack)
3. [App Structure — File and Folder Map](#3-app-structure--file-and-folder-map)
4. [UI Architecture — Screens and Panels](#4-ui-architecture--screens-and-panels)
5. [Features](#5-features)
6. [Security Model](#6-security-model)
7. [IPC — Main to Renderer Communication](#7-ipc--main-to-renderer-communication)
8. [Ecosystem Communication](#8-ecosystem-communication)
9. [Data Layer](#9-data-layer)
10. [Use Cases](#10-use-cases)
11. [Entry Points and Build](#11-entry-points-and-build)

---

## 1. What GhostVault Is

GhostVault is an AI-powered markdown note capture and vault management workspace. It is the knowledge management pillar of the CYBERTOOLS ecosystem — the application where all operational notes, meeting records, pentest logs, recon output, and personal capture land, get structured, and are stored.

The app describes itself as: *"Obsidian fused with a tactical cyber workspace."* It is designed for long sessions, fast capture, and operational clarity — not for cloud sync, collaboration, or generic productivity. It runs entirely offline. There is no remote API, no account, and no telemetry leaving the machine.

### Core concept

A user points GhostVault at any directory on their filesystem. That directory becomes the **vault**. GhostVault reads and writes plain `.md` files inside it, organized into named folders. The vault is a standard folder — it is also readable by Obsidian, VS Code, or any text editor. GhostVault adds a structured UI, a live markdown editor, AI processing, a floating capture window, and ecosystem telemetry on top of the raw filesystem.

### What kind of vault

GhostVault is a **plain-file markdown vault**, not an encrypted database. Every note is a `.md` file on disk. The vault location is any directory the user selects. The app imposes no proprietary format. Data is always portable because it is just files.

The vault is not a "secret vault" in the password-manager sense — it does not encrypt at rest. The name "GhostVault" refers to the tactical, low-profile nature of the CYBERTOOLS brand and the operational focus of the tool.

### Who it is for

- Security researchers logging HTB machines, pentest sessions, and recon output
- Professionals capturing customer calls, meeting notes, and project status
- Anyone who wants a fast, local, AI-assisted markdown workspace that connects to the rest of the CYBERTOOLS ecosystem

---

## 2. Tech Stack

### Runtime
- **Electron 33** — cross-platform desktop shell
- **electron-vite 2** — build tooling (Vite + Rollup for main, preload, and renderer)
- **TypeScript 5.3** — main process and renderer

### Renderer
- **React 18** — UI framework
- **Zustand 4.5** — global state (single store, no Redux)
- **Framer Motion 11** — all animations (sidebar collapse, modal fade/scale, toast)
- **Tailwind CSS 3.4** — utility classes; all color variables are CSS custom properties, not Tailwind values
- **PostCSS / Autoprefixer** — CSS processing

### Main Process
- **Node.js built-ins only** — `fs`, `os`, `path`, `http`, `https` — no third-party npm packages in production
- **Ollama** — optional, local-only LLM integration over HTTP on `localhost:11434`

### Build and package
- **electron-builder 25** — packaging to DMG (macOS), NSIS installer (Windows), AppImage/deb (Linux)
- **electron-vite build** — produces `out/main/index.js`, `out/preload/preload.cjs`, `out/renderer/`

### Key design decision: no npm packages in production runtime
The main process uses zero npm dependencies at runtime — only Node.js built-ins. This keeps the packaged app lean and avoids supply-chain risk in the process that has filesystem access.

---

## 3. App Structure — File and Folder Map

```
GhostVault/
├── src/
│   ├── main/
│   │   ├── main.ts              — Electron main process: window creation, IPC handlers, config, vault I/O, Ollama, status writer
│   │   ├── preload.ts           — Context bridge: exposes typed API to renderer via window.ghostvault and window.electronAPI
│   │   └── ecosystem-bus.ts    — Writes events to the shared CYBERTOOLS ecosystem event log
│   ├── renderer/
│   │   ├── index.html           — Main window HTML entry point
│   │   ├── capture.html         — Capture window HTML entry point (separate Vite entry)
│   │   ├── main.tsx             — Main window React root (mounts <App />)
│   │   ├── capture.tsx          — Capture window React root (mounts <CaptureApp />)
│   │   ├── App.tsx              — Root component for main window: layout, event subscriptions, all top-level handlers
│   │   ├── CaptureApp.tsx       — Root component for capture window: minimal form, folder selector, save
│   │   ├── env.d.ts             — TypeScript ambient declarations (window.ghostvault, window.electronAPI types)
│   │   ├── store/
│   │   │   └── index.ts         — Zustand store: all app state (vault, notes, editor, AI, theme, etc.)
│   │   ├── components/
│   │   │   ├── Sidebar.tsx      — Left navigation: nav items, folder tree, note list, search bar, collapse toggle
│   │   │   ├── EditorView.tsx   — Note editor: toolbar, mode switcher (edit/split/preview), textarea, live preview, status bar
│   │   │   ├── CaptureView.tsx  — In-window quick capture form (embedded in main window, not the floating window)
│   │   │   ├── VaultView.tsx    — Vault info panel: stats (notes/folders/pinned), path display, change vault
│   │   │   ├── TemplatesView.tsx — Template picker: three mode groups, insert into editor
│   │   │   ├── SettingsView.tsx — Settings panel: vault path, theme picker, editor options, Ollama config, about
│   │   │   ├── SetupWizard.tsx  — First-run wizard: 3-step (welcome → theme → vault)
│   │   │   └── Modals.tsx       — All modals: NewNoteModal, NewFolderModal, QuickCaptureModal, AiOverlay, AiMenu, NoteContextMenu, Toast
│   │   └── lib/
│   │       ├── local-ai-engine.js — Pure JS offline AI processor (no LLM calls, regex + structural rules)
│   │       ├── local-ai.ts        — TypeScript wrapper around local-ai-engine.js
│   │       ├── markdown.ts        — Custom markdown-to-HTML parser (no third-party library)
│   │       └── templates.ts       — 19 note templates across work/cyber/personal categories
│   └── shared/
│       └── types.ts             — Shared TypeScript interfaces: GhostVaultConfig, NoteFile, ActiveNote, ThemeConfig, etc.
├── assets/
│   └── icon.icns                — macOS app icon
├── out/                         — Build output (gitignored in practice, present here)
├── dist/                        — Packaged app output (DMG files)
├── package.json
├── electron.vite.config.ts      — electron-vite config: three separate Vite builds (main, preload, renderer)
├── tailwind.config.js           — Tailwind config: maps Tailwind color names to CSS custom properties
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
├── ecosystem-bus.js             — Legacy JS copy of ecosystem-bus (superseded by src/main/ecosystem-bus.ts)
├── local-ai.js                  — Legacy JS copy (superseded by src/renderer/lib/local-ai-engine.js)
├── main.js / preload.js / renderer.js / templates.js — Legacy flat JS files (superseded by src/ TypeScript)
├── start.sh                     — Shell script to start the app in dev mode
└── ghostvault-docs.md           — This file
```

### Legacy flat JS files

The root contains `main.js`, `preload.js`, `renderer.js`, `templates.js`, `local-ai.js`, and `ecosystem-bus.js`. These are an earlier, non-TypeScript iteration of the app. The canonical source code is entirely inside `src/`. The legacy files are not used by the current build system (`electron.vite.config.ts` explicitly points at `src/main/main.ts` and `src/main/preload.ts`).

---

## 4. UI Architecture — Screens and Panels

GhostVault uses a **two-window** architecture.

### Main Window

The main window (`src/renderer/App.tsx`) is a full-screen split-panel layout:

```
[ Sidebar (w-56 or w-12 collapsed) ]  [ Main Content Area (flex-1) ]
```

The main content area renders one of five views, selected by `activeView` in the Zustand store:

| View ID | Component | Purpose |
|---|---|---|
| `notes` | `EditorView` | Note editor with live markdown preview |
| `capture` | `CaptureView` | Embedded quick-capture form |
| `vault` | `VaultView` | Vault stats, path, and change-vault button |
| `templates` | `TemplatesView` | Template picker organized by mode |
| `settings` | `SettingsView` | Full settings panel |

#### Sidebar

The sidebar has two sections:

1. **Navigation bar** — always visible, five icon+label nav items: Notes, Capture, Vault, Templates, Settings. Active item is highlighted. In collapsed mode only icons show.
2. **Note list** — visible only when `activeView === 'notes'` and sidebar is not collapsed. Contains:
   - Search input (filters by name and folder, client-side only)
   - "+ Note" and "+ Folder" action buttons
   - Folder sections (collapsible, state persisted to `localStorage`)
   - A "Pinned" section at the top if any notes are pinned
   - A "Root" section for notes not in any subfolder
   - Note count footer
3. **Collapse toggle** — bottom button, toggles sidebar width between `w-56` and `w-12`

#### EditorView

Three-panel toolbar + editor + preview:

- **Toolbar**: shows folder/note name, Edit/Split/Preview mode switcher, Templates button, AI button, Capture button, Pin button, Always-on-top button, Save button with dirty-state awareness
- **Edit pane**: monospace `<textarea>` with Tab-to-indent, auto-continuing list bullets on Enter, Cmd+S save, Cmd+T timestamp insertion
- **Preview pane**: rendered HTML from the custom markdown parser, shown in split or preview mode
- **Status bar**: live word count, character count, line count

#### Floating Capture Window

A separate frameless, always-on-top, transparent BrowserWindow (`CaptureApp.tsx`). Triggered by `Cmd+N` global shortcut or the toggle-capture IPC call. It has:
- macOS-style traffic-light close button (wired to hide, not destroy)
- Folder selector (populated from the vault's real directories)
- Optional title field
- Monospace textarea with Cmd+Enter to save, Escape to close
- Save button that closes the window after 800ms on success

This window is created once and hidden/shown rather than destroyed and recreated. Its theme stays in sync with the main window via the `theme-change` IPC push message.

#### Modals and Overlays (Modals.tsx)

All modals are rendered inside the main window via `AnimatePresence`:

| Modal | Trigger | Content |
|---|---|---|
| `NewNoteModal` | Cmd+N in main window, "+ Note" button | Folder selector + title input |
| `NewFolderModal` | "+ Folder" button | Single folder name input |
| `QuickCaptureModal` | Cmd+P or `quick-capture` IPC event, Capture toolbar button | Folder + title + textarea; Cmd+Enter or Ctrl+Enter to save |
| `AiMenu` | Cmd+/ or AI toolbar button | 7 AI actions, AI context switcher |
| `AiOverlay` | After triggering an AI action | Shows result (or processing spinner), Apply/Discard buttons |
| `NoteContextMenu` | Right-click on a note in sidebar | Rename (inline input), Reveal in Finder, Delete |
| `ToastContainer` | App-wide toast notifications | Success/error/warn/info toasts, auto-dismiss at 2800ms |

#### Setup Wizard

`SetupWizard.tsx` is shown instead of the main layout when `cfg.vaultPath` is not set. Three steps with animated transitions (Framer Motion `AnimatePresence`):
1. Welcome screen
2. Theme picker (live preview applied to `document.documentElement` attributes immediately)
3. Vault directory picker with "use existing structure" checkbox

Once complete, calls `onComplete(vaultPath)` and the main app mounts normally.

---

## 5. Features

### 5.1 Vault Management

GhostVault treats any directory on the filesystem as a vault. On first setup, it creates six default folders inside the chosen directory: `Notes`, `Meetings`, `Projects`, `Study`, `Tasks`, `Archive`. If the user enables "use existing structure" during setup, these are not created and whatever directories already exist are used.

Notes are listed by recursive filesystem walk, filtered to `.md` files only, sorted by modification time descending. Hidden files and directories (starting with `.`) are skipped.

The user can:
- **Change vault** at any time from Settings or VaultView — opens a native directory picker
- **Create folders** from the sidebar "+ Folder" button
- **Reveal the vault or a note** in Finder via "Reveal in Finder"

### 5.2 Note Editor

The editor is a plain `<textarea>` with:
- **Three modes**: Edit (textarea only), Split (textarea + preview side by side), Preview (rendered HTML only)
- **Autosave**: 2 seconds after the last keystroke, configurable off in Settings
- **Manual save**: Cmd+S, or Save button in toolbar
- **Keyboard enhancements**:
  - Tab inserts two spaces (no focus trap)
  - Enter continues list bullets (ordered and unordered, auto-incrementing numbers)
  - Cmd+T inserts a timestamp at the cursor
- **Status bar**: live word count, character count, line count
- **Pin notes**: marks a note's path in a `Set<string>` persisted as JSON in the config file's `pins` field; pinned notes appear in the "Pinned" sidebar section
- **Always-on-top**: toggles the main window's `alwaysOnTop` property, useful for note-taking alongside other applications

### 5.3 Quick Capture (Floating Window)

The floating capture window is the core fast-capture workflow. It is always available via `Cmd+N` (global, works even when GhostVault is not focused) and can be shown from inside the main window via the toolbar or `Cmd+P`.

On save, the note is written to `vaultPath/folder/title.md` (or auto-titled `Quick Note YYYY-MM-DD HH:mm.md` if no title is given). After saving, the main window receives a `vault-refresh` IPC push and reloads the note list.

The capture window is also accessible from within the main window as an embedded `CaptureView` (the `capture` sidebar nav item), which provides the same folder/title/content form without opening a second window.

### 5.4 Markdown Rendering

GhostVault ships a **custom markdown parser** (`src/renderer/lib/markdown.ts`) — no third-party markdown library. It handles:
- Fenced code blocks with language labels
- Inline code
- H1–H6 headings
- Horizontal rules
- Blockquotes
- Bold, italic, bold+italic, strikethrough
- `[[wiki-links]]` — rendered as styled spans (visual only, no navigation)
- `#hashtags` — highlighted as styled spans
- Tables (with header row detection)
- Checkboxes (`- [ ]` and `- [x]`)
- Unordered and ordered lists with indent levels
- Images
- Links (intercepted via `window.ghostvault.openExternal` to open in the system browser)
- Auto-detected IPv4 addresses — rendered as `<code class="ip-addr">` for visual highlighting in cybersecurity notes

### 5.5 Local AI Engine (Offline)

`src/renderer/lib/local-ai-engine.js` is a **pure JavaScript, zero-dependency AI processor** that runs entirely in the renderer process. No LLM calls are made. It uses regex pattern matching, structural heuristics, and content-preserving rules.

#### AI context modes

AI behavior is governed by a context setting with three values:

| Context | Intended use |
|---|---|
| `work` | Customer calls, meetings, project updates, tasks |
| `cyber` | Pentesting notes, HTB machines, recon, IOCs |
| `personal` | Journals, brain dumps, reminders, ideas |

#### AI actions (7 total)

| Action | Mode key | What it does |
|---|---|---|
| Format Note | `format` | Detects note type, extracts contact info and actions, structures with headers. Adapts for `work`/`cyber`/`personal` context |
| Summarize | `summarize` | Extracts key points, contacts, dates, action items into a structured summary |
| Extract TODOs | `todos` | Identifies action verbs, explicit checkboxes, urgency keywords; buckets into Urgent/Soon/To Do/Done sections |
| Extract Key Info | `iocs` | In `work`/`personal`: extracts contacts, dates, amounts into a table. In `cyber`: full IOC extract — IPs, ports, domains, URLs, hashes, CVEs |
| Clean Up | `cleanup` | Capitalizes sentence starts, breaks wall-of-text paragraphs, removes blank lines, deduplicates, normalizes bullets, fixes code fence pairing |
| Structure Raw | `terminal` | Detects input type (terminal output, email, chat/log, error log, nmap output) and wraps/parses accordingly |
| Build Report | `report` | Generates a professional report with Overview, Details, Contact Information, Dates, and Next Steps sections |

#### Detection patterns

The engine uses named regex patterns (`RX`) to identify:
- Phone numbers, email addresses, URLs
- Dates (formatted and relative — "tomorrow", "EOD", "ASAP")
- Times
- Proper names (with a strict non-name exclusion list)
- IPv4 addresses
- MD5/SHA1/SHA256 hashes (by length)
- Currency amounts
- CVE identifiers

#### Note type detection

For `work` context, the engine auto-detects one of: `customer`, `meeting`, `project`, `study`, `tasks`, `general` — and adapts the output structure accordingly (e.g., customer notes get a Contact section, meeting notes get an Attendees/Discussion structure).

#### Philosophy

The engine's explicit design rule (documented in comments) is **content preservation**: never rewrite what the user wrote, only add structure around it. Names, phone numbers, IPs, dates, and amounts are kept verbatim.

### 5.6 Ollama Integration (Optional, Local LLM)

When Ollama is running on `localhost:11434`, GhostVault uses it as a higher-quality AI backend instead of the local engine. The main process:
1. Checks `http://localhost:11434/api/tags` on startup (and on manual refresh)
2. Lists available models
3. When an AI action is triggered and Ollama is running, sends a crafted prompt to `http://localhost:11434/api/generate` (non-streaming, 60s timeout)

Three context-aware system prompts are defined in `buildOllamaPrompt()` in `main.ts`:
- `work` — Preserves all names/numbers/dates exactly, adds professional markdown structure, extracts action items as checkboxes, no buzzwords
- `cyber` — Preserves all IPs/ports/hashes/CVEs, wraps commands in code blocks, uses Target Info → Open Ports → Findings → Commands → Next Steps structure
- `personal` — Minimal reformatting, keeps the writer's voice, only adds structure if genuinely needed

Default model is `mistral`. User can select any installed model in Settings.

If Ollama is not running, the action falls through to the local AI engine transparently.

### 5.7 Templates

19 templates across three mode groups:

**Work** (6): Customer Call, Meeting Notes, Project Update, Task List, Quick Thought, Weekly Review

**Cyber** (7): HTB Machine, Web App Recon, PrivEsc Checklist, Enumeration, Exploit Notes, Recon Report, Lab Writeup

**Personal** (6): Journal Entry, Brain Dump, Reminder, Idea, Study Notes, General Note

Templates are functions that receive the current ISO timestamp and return a pre-structured markdown string. They are inserted into the editor by replacing `editorContent` in the Zustand store, which triggers autosave.

### 5.8 Theming System

GhostVault implements the CYBERTOOLS layered theme architecture.

**Core themes** (4) define backgrounds, surfaces, borders, and contrast:

| Theme | Feel | Background |
|---|---|---|
| `stealth` | Tactical, cinematic (default) | `#0e1117` |
| `graphite` | Professional, Proton-inspired | `#111318` |
| `frost` | Light, SOC analyst | `#f0f4f8` |
| `oled` | Ultra-minimal, distraction-free | `#000000` |

**Personality themes** (4) define the accent color only:

| Theme | Accent | Feel |
|---|---|---|
| `neutral` | `#4a9eff` | Restrained, professional |
| `cyberpunk` | `#b44eff` | Synthwave, cinematic |
| `terminal` | `#33ff66` | Green console, tactical |
| `threat` | `#ff4a4a` | Alert-state, offensive |

Themes are applied via `data-core` and `data-personality` attributes on `document.documentElement`. All colors are CSS custom properties consumed by Tailwind and component inline styles.

The capture window stays in sync: when the user changes the theme in Settings, a `theme-change` IPC message is pushed to the capture window so it applies the same attributes.

---

## 6. Security Model

### What GhostVault does and does not do

GhostVault does **not** encrypt notes at rest. The vault is a plain directory of `.md` files. Access control is whatever the OS filesystem provides. If the vault directory is on an encrypted disk, notes benefit from that encryption.

GhostVault does **not** send any data to external services. All AI processing is either offline (local engine) or local-network Ollama. No telemetry is transmitted.

### Electron security settings

The main process configures every BrowserWindow with:
- `contextIsolation: true` — renderer and main process are isolated
- `nodeIntegration: false` — no Node.js APIs in renderer
- `sandbox: false` — preload has access to Node.js (necessary to call `ipcRenderer`)

The preload script (`preload.ts`) uses `contextBridge.exposeInMainWorld` to expose a typed, minimal API surface (`window.ghostvault`, `window.electronAPI`). The renderer cannot access `fs`, `path`, `os`, or any Electron internals directly.

### Input sanitization

File and folder names created by the app strip characters that are illegal on common filesystems:
```
/[/\\?%*:|"<>]/g  →  replaced with '-'
```

This applies to new note titles, renamed note titles, and capture note titles.

### Filesystem boundaries

All vault I/O (read, write, delete, rename) happens through the IPC handlers in `main.ts`. The renderer cannot construct arbitrary file paths — it calls `write-note` with a full path, but that path is derived from `vaultPath + folder + filename` where `vaultPath` is set by the user via a native OS dialog (not a text input). Hidden files (`.`-prefixed) are skipped in all directory listings.

### Global shortcut

`Cmd+N` is registered as a global shortcut. It toggles the capture window. `Cmd+Shift+G` focuses the main window and fires the `quick-capture` IPC event. These shortcuts are unregistered on `window-all-closed`.

### Threat model

GhostVault addresses:
- **Data portability** — plain `.md` files are never locked in
- **Privacy** — no cloud sync, no accounts, no analytics
- **Availability** — fully offline, no dependencies on external services

It does not address:
- **Encryption at rest** — vault is plaintext
- **Multi-user access control** — single-user desktop app
- **Malicious local code** — if an attacker has local code execution, contextIsolation is moot

---

## 7. IPC — Main to Renderer Communication

All IPC uses Electron's `ipcMain.handle` / `ipcRenderer.invoke` pattern (request-response). Push messages from main to renderer use `webContents.send`.

### Request-Response Handlers (renderer invokes → main responds)

#### Config

| Channel | Args | Returns | Description |
|---|---|---|---|
| `get-config` | — | `GhostVaultConfig` | Read `~/ghostvault-config.json` |
| `save-config` | `Partial<GhostVaultConfig>` | `boolean` | Merge-write to config file; pushes `theme-change` to capture window if theme changed |
| `get-version` | — | `string` | App version string `'1.0.0'` |

#### Window management

| Channel | Args | Returns | Description |
|---|---|---|---|
| `set-always-on-top` | `boolean` | `boolean` | Sets window `alwaysOnTop`, persists to config, pushes `aot-change` |
| `get-always-on-top` | — | `boolean` | Returns current `alwaysOnTop` state |
| `minimize-window` | — | `void` | Minimizes main window |
| `close-window` | — | `void` | Closes main window |

#### Vault and note operations

| Channel | Args | Returns | Description |
|---|---|---|---|
| `load-vault` | `vaultPath: string` | `{ notes: NoteFile[], folders: string[] }` | Full recursive vault scan; returns sorted note list and first-level folders |
| `list-notes` | `vaultPath: string` | `NoteFile[]` | Same as load-vault but notes only |
| `read-note` | `filePath: string` | `string` | Read file content as UTF-8 |
| `write-note` | `filePath: string, content: string` | `boolean` | Write file, creates parent directories; updates `lastCaptureTime` and status |
| `delete-note` | `filePath: string` | `boolean` | `fs.unlinkSync`; decrements `vaultNoteCount` |
| `rename-note` | `oldPath: string, newPath: string` | `boolean` | `fs.renameSync`, creates parent dirs |
| `new-note` | `vaultPath, folder, title` | `NewNoteResult` | Creates `.md` file with title + timestamp header; increments count |
| `create-folder` | `vaultPath, folderName` | `boolean` | `fs.mkdirSync` |
| `list-folders` | `vaultPath: string` | `string[]` | First-level directories, skipping hidden |
| `pick-vault-dir` | `{ skipFolderCreate?: boolean }` | `string \| null` | Native OS directory picker dialog; creates default folders if not skipping |
| `reveal-in-finder` | `path: string` | `void` | `shell.showItemInFolder` |
| `open-external` | `url: string` | `void` | `shell.openExternal` |

#### Capture window

| Channel | Args | Returns | Description |
|---|---|---|---|
| `toggle-capture` | — | `void` | Shows or hides the capture window; creates it if first use |
| `hide-capture` | — | `void` | Hides capture window |
| `minimize-capture` | — | `void` | Minimizes capture window |
| `save-capture-note` | `{ folder, title?, text }` | `SaveCaptureResult` | Writes note to vault; pushes `vault-refresh` to main window |
| `get-capture-theme` | — | `ThemeConfig` | Returns `captureTheme` from config |
| `save-capture-theme` | `ThemeConfig` | `boolean` | Saves capture theme to config |

#### AI

| Channel | Args | Returns | Description |
|---|---|---|---|
| `ollama-check` | — | `OllamaStatus` | Checks `localhost:11434/api/tags`; returns `{ running, models }` |
| `ollama-format` | `{ text, mode, ctx, model? }` | `OllamaFormatResult` | Builds context-aware prompt, calls Ollama, returns result or error key |

#### Ecosystem

| Channel | Args | Returns | Description |
|---|---|---|---|
| `ecosystem-emit` | `appName, eventType, data` | `true` | Calls `ecosystemBus.emitEvent` to write to shared event log |

---

### Push Messages (main → renderer via `webContents.send`)

| Channel | Payload | Sent when |
|---|---|---|
| `quick-capture` | — | `Cmd+Shift+G` global shortcut fires |
| `vault-refresh` | — | A capture note is saved (triggers main window to reload notes) |
| `theme-change` | `ThemeConfig` | User saves a new theme in Settings |
| `aot-change` | `boolean` | Always-on-top is toggled |
| `capture-folders` | `string[]` | Capture window is shown; sends current vault folder list |
| `new-note-shortcut` | — | (Defined in preload listener but not currently sent from main) |

---

## 8. Ecosystem Communication

GhostVault participates in the CYBERTOOLS ecosystem through two mechanisms: the **shared status file** and the **ecosystem event log**.

### Shared Status File — `~/cybertools-config.json`

GhostVault reads and writes a shared JSON file at `~/cybertools-config.json`. This file is the ecosystem's cross-app state file — other apps (Launcher, VaultCore, CyberLab) also read and write their own keys in it.

GhostVault writes to the `ghostvault_status` key:

```json
{
  "ghostvault_status": {
    "active": true,
    "lastActive": "2025-06-01T14:32:00.000Z",
    "lastCapture": "2025-06-01T14:30:00.000Z",
    "noteCount": 47
  }
}
```

| Field | Type | Description |
|---|---|---|
| `active` | `boolean` | `true` while app is running, set to `false` on quit |
| `lastActive` | ISO string | Updated every 15 seconds while running |
| `lastCapture` | ISO string \| null | Timestamp of the last note write (any note save or capture) |
| `noteCount` | number | Count of `.md` files in the current vault, recursively |

**Update frequency**: on startup, on every note write or delete, and on a 15-second interval while the app is running. On quit (`before-quit`), `active` is set to `false`.

**Write safety**: the file is read, merged (existing keys from other apps are preserved), and written back atomically (no temp-file rename strategy here — it's a direct `writeFileSync`).

**Null vault**: if no vault is configured, `noteCount` is 0 and `lastCapture` is null.

The Launcher and other CYBERTOOLS apps can read this file to display GhostVault's activity status in their dashboards and activity feeds.

### Ecosystem Event Log — `~/Library/Application Support/CyberTools/ecosystem-events.json`

`src/main/ecosystem-bus.ts` provides a single `emitEvent(appName, eventType, data)` function. It appends events to a shared JSON array at the above path, capped at 150 events.

Event structure:
```json
{
  "id": "1748789520000-abc12",
  "appName": "GhostVault",
  "eventType": "ghostvault.app.opened",
  "data": {},
  "timestamp": "2025-06-01T14:32:00.000Z"
}
```

**Write safety**: uses a `.tmp` + `fs.renameSync` atomic write to avoid corruption.

**Events emitted by GhostVault**:

| Event type | When emitted | Data |
|---|---|---|
| `ghostvault.app.opened` | On `app.whenReady()` | `{}` |

**Events the renderer can emit** via `electronAPI.ecosystemEmit(appName, eventType, data)` → `ecosystem-emit` IPC channel → `ecosystemBus.emitEvent`. The renderer does not currently call this directly, but the bridge is wired and available.

**Ecosystem event consumers**: the CYBERTOOLS Launcher and CyberOS Dashboard can read this file to populate their activity feeds. ReconDesk and SignalBoard (other ecosystem apps visible in the Cyber Apps directory) may also read it.

### What GhostVault does not yet do

GhostVault does not currently:
- Subscribe to events from other apps (it only emits)
- Push notes to VaultCore
- Receive context from CyberLab (e.g., auto-populating a note with an HTB machine IP)

These are planned ecosystem integrations per the master spec's "long-term direction" section.

---

## 9. Data Layer

### Storage format

All notes are **plain UTF-8 Markdown files** (`.md`). No database. No metadata sidecar files. GhostVault does not write `.obsidian/` configs or any proprietary metadata.

New notes get a standard header:
```markdown
# Note Title

*Created: 2025-06-01 14:32*

---

```

Captured notes:
```markdown
# Quick Note 2025-06-01 14:32

*Captured: 2025-06-01 14:32*

---

[user content]
```

### File locations

| Path | Contents |
|---|---|
| `~/ghostvault-config.json` | App configuration (see schema below) |
| `~/cybertools-config.json` | Shared ecosystem status file |
| `~/.ghostvault/` | Created on startup (currently empty — reserved for future use such as cached indexes) |
| `~/Library/Application Support/CyberTools/ecosystem-events.json` | Ecosystem event log (macOS path) |
| `[vaultPath]/**/*.md` | All user notes |
| `[vaultPath]/Notes/`, `Meetings/`, etc. | Default folder structure (created on vault setup unless "use existing structure" is selected) |

### Config schema — `~/ghostvault-config.json`

```typescript
interface GhostVaultConfig {
  vaultPath?       : string;                    // Absolute path to vault directory
  theme?           : { core: CoreTheme; personality: PersonalityTheme };
  editorMode?      : 'edit' | 'split' | 'preview';  // Persisted editor mode
  alwaysOnTop?     : boolean;
  autosave?        : boolean;                   // Default: true (2s debounce)
  pins?            : string;                    // JSON.stringify of string[] of pinned file paths
  aiCtx?           : 'work' | 'cyber' | 'personal';
  ollamaModel?     : string;                    // e.g. 'mistral', 'llama3'
  ollamaEnabled?   : boolean;
  useExistingStructure?: boolean;               // Skip creating default folders
  captureTheme?    : { core: CoreTheme; personality: PersonalityTheme };
  windowWidth?     : number;
  windowHeight?    : number;
  windowX?         : number;
  windowY?         : number;
  firstRun?        : boolean;
}
```

Window position and size are saved on every close and restored on next open.

### NoteFile schema (in-memory, returned by IPC)

```typescript
interface NoteFile {
  name    : string;   // Filename without .md extension
  filename: string;   // Full filename including .md
  path    : string;   // Absolute path
  rel     : string;   // Path relative to vault root (e.g. "Notes/my-note.md")
  folder  : string;   // Parent folder name relative to vault root
  mtime   : number;   // fs.statSync.mtimeMs — used for sort order
  size    : number;   // File size in bytes
}
```

Notes are sorted descending by `mtime` (most recently modified first) at the `listVaultNotes` level in `main.ts`. This sort order is the source of truth; the sidebar renders in whatever order the array arrives.

### localStorage (renderer)

The sidebar uses `localStorage` to persist per-folder open/closed state:
- Key format: `folder-open-{folderKey}` where `folderKey` is the folder name or `pinned`/`/`
- Value: `"true"` or `"false"`
- Default: `true` (open)

---

## 10. Use Cases

### Use Case 1 — Capturing a customer call note

A support engineer is on a call and needs to capture notes fast.

1. Press `Cmd+N` — the floating capture window appears over the current screen
2. Select folder `Meetings` from the dropdown
3. Type a title: `Jane Smith — billing issue`
4. Type into the textarea: raw notes as the call progresses
5. Press `Cmd+Enter` to save

Result: a `.md` file is written to `[vault]/Meetings/Jane Smith — billing issue.md` with a timestamp header. The main window receives `vault-refresh` and the new note appears at the top of the Meetings folder in the sidebar.

After the call, open GhostVault's main window, select the note, and press `Cmd+/` → "Format Note" with context set to `work`. The local AI engine detects it as a customer note, extracts the phone/email if present, organizes actions into checkboxes, and shows a preview. Press "Apply to Note."

---

### Use Case 2 — HTB machine walkthrough

A security researcher starts a new HackTheBox machine.

1. Open GhostVault main window
2. Navigate to Templates → Cyber → "HTB Machine"
3. Click the template — it inserts the HTB template pre-filled with placeholders into the editor and switches to the Notes view
4. Fill in the machine IP, OS, difficulty, nmap output
5. As the session progresses, paste terminal output directly into the note
6. Use `Cmd+/` → "Extract Key Info" (with `cyber` context) to pull all IPs, open ports, hashes, and CVEs into a structured IOC table
7. Use "Format Note" to structure the raw session into Target Info, Open Ports, Findings, Commands, Next Steps sections

The finished note is a clean Obsidian-compatible markdown file in the Cyber folder. Other ecosystem apps (CyberLab) can reference the same vault.

---

### Use Case 3 — Retrieving a note from a large vault

A user has 200+ notes across 8 folders.

1. Open the sidebar (main window, Notes view)
2. Type into the search bar — the note list filters client-side by note name and folder name with every keystroke
3. Click the matching note — it opens in the editor
4. To find it on disk: right-click → "Reveal in Finder"

The search is purely in-memory (no index, no fuzzy matching) — it's a simple `String.includes` on both `n.name` and `n.folder` after lowercasing.

---

### Use Case 4 — Cross-app ecosystem activity

The CYBERTOOLS Launcher displays an activity feed from all ecosystem apps.

When GhostVault:
- Opens: emits `ghostvault.app.opened` to the event log
- Saves a note: updates `noteCount` and `lastCapture` in `~/cybertools-config.json`
- Is running: `ghostvault_status.active = true` with 15-second heartbeats

The Launcher reads `~/cybertools-config.json` and can display:
- "GhostVault active — 47 notes — last capture 3 min ago"
- Activity feed entry: "GhostVault opened"

The Launcher can also monitor the event log at `~/Library/Application Support/CyberTools/ecosystem-events.json` for richer cross-app event history.

---

### Use Case 5 — Writing a weekly review with autosave

A user wants to write a weekly review without worrying about saving.

1. `Cmd+N` → New Note modal → select `Notes` folder, title `Week 23 Review`
2. Navigate to Templates → Personal → "Weekly Review" — the template is inserted
3. Start typing in the editor (split mode, so preview updates live)
4. Autosave fires 2 seconds after each pause in typing — the note is written to disk silently
5. The dirty indicator ("Save" button) turns to "Saved" automatically

No explicit save required. On next launch, the note appears at the top of the sidebar.

---

### Use Case 6 — Switching themes for a night session

1. Go to Settings view
2. Under Theme, click "OLED" core theme — preview applies immediately to the entire UI
3. Click "Terminal" personality — accent color changes to `#33ff66`
4. Theme is saved to `~/ghostvault-config.json` as `{ core: "oled", personality: "terminal" }`
5. The capture window, which may already be open, receives a `theme-change` IPC push and applies the same theme attributes

On next launch, the saved theme is applied before the window is shown.

---

## 11. Entry Points and Build

### Development

```bash
npm run dev
# or
npm start
```

Runs `electron-vite dev`. Three Vite dev servers start:
- Main process: watches `src/main/main.ts`, rebuilds and restarts Electron on change
- Preload: watches `src/main/preload.ts`
- Renderer: Vite HMR on `http://localhost:5173`; two entry points: `index.html` (main window) and `capture.html` (capture window)

Dev mode opens DevTools in detached mode on the main window.

The `start.sh` script is a macOS `.command` file that runs `npm run dev` from the project directory.

### Build

```bash
npm run build
```

Runs `electron-vite build`. Output goes to `out/`:
- `out/main/index.js` — bundled main process
- `out/preload/preload.cjs` — CommonJS preload (required by Electron)
- `out/renderer/` — renderer bundle (two HTML entry points + hashed JS/CSS assets)

### Package

```bash
npm run package          # Build + package for current platform
npm run package:mac      # macOS DMG (x64 + arm64)
npm run package:win      # Windows NSIS installer (x64)
npm run package:linux    # AppImage + deb
```

Packaged output goes to `dist/`. The macOS build produces both `GhostVault-1.0.0.dmg` (x64) and `GhostVault-1.0.0-arm64.dmg`.

### App entry point

Electron reads `"main": "out/main/index.js"` from `package.json`. That file starts the main process. The main process creates the `BrowserWindow`, which loads either `http://localhost:5173` (dev) or `out/renderer/index.html` (production).

The capture window loads either `http://localhost:5173/capture.html` (dev) or `out/renderer/capture.html` (production).

### TypeScript config

Three tsconfig files:
- `tsconfig.json` — root config, references the others
- `tsconfig.node.json` — main and preload processes (Node.js types, ESNext module)
- `tsconfig.web.json` — renderer (DOM types, bundler module resolution, `@shared` alias to `src/shared`)

The `@shared` alias is configured in both `tsconfig.web.json` and `electron.vite.config.ts` under `renderer.resolve.alias`.

---

*ItsEliias // CYBERTOOLS Ecosystem — GhostVault v1.0.0*
