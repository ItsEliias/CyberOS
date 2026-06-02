# ReconDesk — Internal Documentation

**Version:** 1.0.0
**Author:** ItsEliias
**Ecosystem:** CYBERTOOLS
**App ID:** `com.itsEliias.recondesk`

---

## 1. What ReconDesk Is

ReconDesk is a desktop-native penetration testing and recon workspace built as an Electron application. Its purpose is to serve as the operational hub for tracking attack targets, documenting discovered ports and credentials (Assets), and managing the structured workflow of an engagement through a kanban-style Attack Board.

It is not a scanner or a tool that performs active network operations. It is a structured intelligence workspace — the place where a practitioner records what they find, organises it by stage, and tracks progress from initial recon through to loot. It replaces ad-hoc notes, scattered terminal windows, and manual spreadsheets with a cohesive tactical interface.

**Target users:** CTF players (HackTheBox, TryHackMe), pentesters, security researchers who want one focused workspace for managing engagement data throughout a session.

**Design intent:** Premium, cinematic, restrained. The interface is built to feel like a professional SOC or operations console — not a gamer hacker UI. It fits the wider CYBERTOOLS aesthetic of "Proton meets Obsidian meets Arc Browser inside a premium cyber operations workspace."

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop runtime | Electron | ^33.0.0 |
| Build / dev server | electron-vite | ^2.0.0 |
| Renderer framework | React | ^18.0.0 |
| Language | TypeScript | ^5.0.0 |
| Styling | Tailwind CSS | ^3.0.0 |
| Animations | Framer Motion | ^11.0.0 |
| Client state | Zustand | ^4.5.0 |
| Bundler | Vite | ^5.0.0 |
| Packaging | electron-builder | ^25.0.0 |

**Runtime dependencies (shipped in app):**
- `framer-motion` — layout animations, spring transitions, AnimatePresence
- `zustand` — centralised renderer state store with persist action

**No external API calls.** All data is local. There are no network requests from within the app, no npm packages for HTTP clients, no third-party data sources. The app is fully offline.

---

## 3. App Structure — File and Folder Map

```
ReconDesk/
├── src/
│   ├── main/
│   │   ├── main.ts              — Electron main process; window creation, IPC handlers, data I/O, status writer
│   │   ├── preload.ts           — contextBridge API surface exposed to renderer
│   │   └── ecosystem-bus.ts     — CYBERTOOLS shared event bus (file-based pub/sub)
│   ├── renderer/
│   │   ├── index.html           — HTML shell; CSP, Inter font, root div
│   │   ├── main.tsx             — React root; mounts <App /> into #root
│   │   ├── App.tsx              — Root component; layout, tab routing, initial data load
│   │   ├── globals.css          — Global styles; scrollbar, drag region, Tailwind directives
│   │   ├── env.d.ts             — TypeScript ambient declaration for window.electronAPI
│   │   ├── store/
│   │   │   └── index.ts         — Zustand store; all state and actions for targets, cards, ports, credentials
│   │   └── components/
│   │       ├── Header.tsx       — App header; drag region, title, active target IP badge
│   │       ├── Footer.tsx       — Status bar; version, active target count, card progress
│   │       ├── TargetPanel.tsx  — Left sidebar; target list, add-target form
│   │       ├── AttackBoard.tsx  — Main board tab; six-stage kanban with card CRUD
│   │       └── TargetAssets.tsx — Assets tab; ports registry and credentials registry
│   └── shared/
│       └── types.ts             — All shared TypeScript types used by main and renderer
├── electron.vite.config.ts      — electron-vite build config; main, preload, renderer entries
├── tailwind.config.js           — Tailwind theme; Stealth palette, fonts, shadows
├── postcss.config.js            — PostCSS (autoprefixer)
├── tsconfig.json                — Root tsconfig; references node and web configs
├── tsconfig.node.json           — Main process TS config (ES2022, Node types)
├── tsconfig.web.json            — Renderer TS config (ES2020, DOM, JSX)
├── package.json                 — App metadata, scripts, deps, electron-builder config
└── out/                         — Build output (generated; not committed)
    ├── main/main.js
    ├── preload/preload.mjs
    └── renderer/
```

---

## 4. UI Architecture

The app uses a three-zone layout: a fixed Header, a scrollable body split between a left sidebar and a right main panel, and a fixed Footer status bar.

### 4.1 Header (`Header.tsx`)

A 48px drag-enabled titlebar. On macOS, `titleBarStyle: 'hiddenInset'` hides the native title and positions traffic lights at `{ x: 16, y: 16 }`. The header includes a 72px spacer to clear the traffic light buttons, the `RECONDESK` wordmark, the `// ItsEliias` byline, and — when a target is selected — a monospace badge showing the active target's IP address in accent colour.

### 4.2 TargetPanel — Left Sidebar (`TargetPanel.tsx`)

A 224px-wide fixed sidebar listing all targets. Each target row shows:
- A coloured status dot (green = active, blue = completed, grey = abandoned)
- Target name (truncated)
- IP address in monospace
- Platform tag (HTB / THM / CTF / Custom)
- Card count badge (if any cards exist)

Clicking a row sets it as the active target (or deselects it). Hovering reveals a delete button. A `+` button at the top expands an animated inline form to add a new target (name, IP, platform, OS fields).

### 4.3 Right Panel — Tab Bar

A 36px tab bar sits above the right panel with two tabs: **Board** and **Assets**. An animated `framer-motion` underline indicator (`layoutId="tab-indicator"`) slides between tabs using a spring transition. Changing the active target automatically resets to the Board tab.

### 4.4 AttackBoard — Board Tab (`AttackBoard.tsx`)

The main operational surface. Renders six stage columns side by side in a horizontally-scrollable container:

| Column | Stage ID |
|---|---|
| Recon | `recon` |
| Enum | `enum` |
| Exploit | `exploit` |
| Post | `post` |
| PrivEsc | `privesc` |
| Loot | `loot` |

Each column shows only cards belonging to the active target and the current stage. Each card (`CardItem`) displays:
- A clickable status dot that cycles through `todo → inprogress → done → blocked`
- Card title
- A delete button (visible on hover)
- An expandable detail area (click the card) containing: a monospace command block (if set), a resizable notes textarea, and a stage-reassignment dropdown

A `+` button per column expands an inline form to add a card with a title and optional command string.

When no target is selected, the board shows an empty-state message.

### 4.5 TargetAssets — Assets Tab (`TargetAssets.tsx`)

Two stacked sub-sections for the active target:

**Ports section:** A list of all recorded ports. Each row shows port number (colour-coded by state: green = open, yellow = filtered, grey = closed), protocol, service name, and version string. Add-port form accepts: port number, protocol (tcp/udp), state, service, version, and notes. Validated to 1–65535.

**Credentials section:** A list of captured credentials. Each row shows credential type label, username, password/hash/token (monospace), and service. Add-credential form switches between a password field (for `plaintext` type) and a hash/key/token field (for `hash`, `key`, `token` types). Requires at minimum a username or a hash value.

### 4.6 Footer (`Footer.tsx`)

A 28px status bar showing:
- Left: `ItsEliias // ReconDesk v{version}` (version fetched via IPC on mount)
- Right: count of active targets, and `{done} / {total} cards done`

---

## 5. Features

### 5.1 Target Management

- Add a target with: name, IP address, platform (`HTB`, `THM`, `CTF`, `Custom`), OS string
- Targets default to `active` status with empty tags, ports, and credentials arrays
- Delete a target (also deletes all associated cards)
- Set any target as the active working context; deselect by clicking again
- Targets are persisted immediately on any mutation

### 5.2 Attack Board (Kanban)

- Six fixed stages matching a standard pentest methodology: Recon, Enum, Exploit, Post, PrivEsc, Loot
- Cards belong to a specific target and stage
- Each card has: title, optional command string, optional notes, stage, status (`todo` / `inprogress` / `done` / `blocked`)
- Status cycles by clicking the card's status dot — no dropdown required
- Cards can be reassigned to a different stage via the expanded detail dropdown
- Cards can be given free-form notes inline via a resizable textarea
- Cards can store a command string (displayed in a styled monospace block when expanded)
- Add a card to any stage with a title + optional command form
- Delete any card
- All card mutations persist immediately

### 5.3 Port Registry

- Track discovered ports per target
- Fields: port number (1–65535), protocol (tcp/udp), state (open/filtered/closed), service name, version string, notes
- Visual state coding: open = green, filtered = yellow, closed = grey
- Add and delete individual port records
- Persisted as part of the target object

### 5.4 Credential Vault

- Capture credentials discovered during an engagement
- Credential types: `plaintext`, `hash`, `key`, `token`
- Fields: type, service, username, password (plaintext type) or hash/key/token value (other types)
- Displayed with monospace formatting for sensitive values
- Add and delete individual credentials
- Persisted as part of the target object

### 5.5 Persistence

Every state mutation calls `store.persist()`, which invokes `window.electronAPI.saveData()`. The main process writes the full `ReconDeskData` object to `~/.recondesk/data.json` as formatted JSON. On app launch, data is loaded from that file and hydrated into the Zustand store via `window.electronAPI.loadData()`.

### 5.6 Ecosystem Status Broadcasting

Every time data is saved, the main process also writes a `recondesk_status` key into `~/cybertools-config.json`. This is the shared ecosystem config file read by other CYBERTOOLS applications. Additionally, a `setInterval` running every 10 seconds refreshes this status write even without explicit user action, keeping other apps informed of ReconDesk's live state.

---

## 6. Data Sources

ReconDesk does not query any external data sources or APIs. It is a pure local workspace. All intelligence is entered manually by the user as they discover it through their own tools (nmap, gobuster, Burp Suite, etc.).

The only external resource fetched at runtime is the Inter font from Google Fonts via the renderer's HTML `<link>` tag — this is a UI asset, not operational data, and is subject to the CSP policy (`style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com`).

---

## 7. IPC — Main / Renderer Communication

Communication between the renderer and main process is mediated by the `contextBridge` in `preload.ts`. The renderer never has direct Node.js or Electron API access (`contextIsolation: true`, `nodeIntegration: false`).

The bridge exposes `window.electronAPI` with four methods:

| Method | IPC Channel | Direction | Payload | Return |
|---|---|---|---|---|
| `loadData()` | `data:load` | renderer → main | none | `ReconDeskData` |
| `saveData(data)` | `data:save` | renderer → main | `ReconDeskData` | `boolean` (true) |
| `getVersion()` | `app:version` | renderer → main | none | `string` |
| `openUrl(url)` | `shell:open` | renderer → main | `string` (URL) | `void` |

All channels use `ipcMain.handle` / `ipcRenderer.invoke` (promise-based, no fire-and-forget). There are no renderer-to-renderer channels, no push notifications from main to renderer, and no IPC listeners on the renderer side.

**`data:save` side effects:** Beyond writing `data.json`, this handler also calls `writeStatus()` to update `~/cybertools-config.json` and will call `emitEvent()` if ecosystem bus logic is wired into save in a future update. Currently `emitEvent` is only called on `app:launched` and `app:closed`.

---

## 8. Ecosystem Communication

ReconDesk participates in the CYBERTOOLS ecosystem through two mechanisms: the shared config file and the ecosystem event bus.

### 8.1 Shared Config File — `~/cybertools-config.json`

This file is the ecosystem-wide shared state. ReconDesk writes a `recondesk_status` key into it on every save and on a 10-second polling interval. The value is a `ReconDeskStatus` object:

```typescript
interface ReconDeskStatus {
  active: boolean        // always true while app is running
  lastActive: string     // ISO timestamp of last write
  activeTarget?: string  // name of the currently selected target (if any)
  targetCount: number    // total targets in the workspace
  cardCount: number      // total cards in the workspace
}
```

The main process reads the existing file before writing to avoid overwriting keys set by other apps. It merges `recondesk_status` into the shared object and rewrites the file. Other CYBERTOOLS apps (Launcher, CyberLab, GhostVault, VaultCore) can read this file to display ReconDesk's current operational state.

### 8.2 Ecosystem Event Bus — `~/Library/Application Support/CyberTools/ecosystem-events.json`

`ecosystem-bus.ts` implements a lightweight file-based pub/sub system shared across all CYBERTOOLS apps. Events are prepended to a JSON array capped at 150 entries.

**Events emitted by ReconDesk:**

| Event Type | When | Data |
|---|---|---|
| `app:launched` | `app.whenReady()` | `{ version: string }` |
| `app:closed` | `window-all-closed` | `{}` |

Each event record has the shape:
```typescript
{
  id: string          // "{timestamp}-{random5chars}"
  timestamp: string   // ISO 8601
  app: string         // "ReconDesk"
  event: string       // event type
  data: object        // event payload
}
```

The bus also exports a `watchEvents()` function using `fs.watch` with an 80ms debounce, allowing any app in the ecosystem to react to events in near-real time. ReconDesk does not currently consume events from the bus (no watcher is registered in main.ts), but the function is available for future use.

### 8.3 Ecosystem Positioning

In the CYBERTOOLS hierarchy, ReconDesk serves as the **engagement intelligence layer**: the place where raw findings from external tools are structured and tracked. Other apps would typically consume its status to display context:

- **CYBERTOOLS Launcher** — can read `recondesk_status` to show the active target name and engagement progress in its ecosystem telemetry feed
- **GhostVault** — a natural companion for writing detailed recon notes referenced alongside ReconDesk cards
- **CyberLab** — shares the same HTB/THM workflow context; CyberLab sessions map directly to ReconDesk targets
- **VaultCore** — could ingest ReconDesk port and credential data as structured intelligence for vault indexing

---

## 9. Data Layer

### 9.1 Primary Data File

**Path:** `~/.recondesk/data.json`

The directory is created automatically on first run. The file is plain JSON, written with 2-space indentation via `JSON.stringify(data, null, 2)`. Reads are wrapped in try/catch with a fallback to `defaultData()`.

**Root schema (`ReconDeskData`):**

```typescript
{
  targets: Target[]
  cards: AttackCard[]
  activeTargetId: string | null
  version: string
}
```

**Target schema:**

```typescript
{
  id: string                    // "{timestamp}-{random5chars}"
  name: string
  ip: string
  os?: string
  platform: 'HTB' | 'THM' | 'CTF' | 'Custom'
  status: 'active' | 'completed' | 'abandoned'
  tags: string[]
  notes?: string
  ports: Port[]
  credentials: Credential[]
  createdAt: string             // ISO 8601
  updatedAt: string             // ISO 8601, updated on every mutation
}
```

**Port schema:**

```typescript
{
  id: string
  number: number                // 1–65535
  protocol: 'tcp' | 'udp'
  service?: string
  version?: string
  state: 'open' | 'filtered' | 'closed'
  notes?: string
}
```

**Credential schema:**

```typescript
{
  id: string
  username?: string
  password?: string             // populated for type 'plaintext'
  hash?: string                 // populated for types 'hash' | 'key' | 'token'
  type: 'plaintext' | 'hash' | 'key' | 'token'
  service?: string
  notes?: string
}
```

**AttackCard schema:**

```typescript
{
  id: string
  targetId: string              // foreign key to Target.id
  title: string
  notes?: string
  command?: string
  stage: 'recon' | 'enum' | 'exploit' | 'post' | 'privesc' | 'loot'
  status: 'todo' | 'inprogress' | 'done' | 'blocked'
  findings: string[]            // reserved; not yet populated via UI
  createdAt: string
  updatedAt: string
}
```

### 9.2 Ecosystem Config File

**Path:** `~/cybertools-config.json`

Shared flat JSON object. ReconDesk owns the `recondesk_status` key. Reading the full object first and merging prevents ReconDesk from clobbering keys written by other CYBERTOOLS apps.

### 9.3 Ecosystem Event Bus File

**Path:** `~/Library/Application Support/CyberTools/ecosystem-events.json`

JSON array of up to 150 event objects, newest first. Created automatically if absent.

---

## 10. Use Cases

### 10.1 HackTheBox Active Machine Session

A user launches ReconDesk, adds a new target "Lame" with IP `10.10.10.3`, platform `HTB`, OS `Linux`. They switch to the Attack Board and add a card in the Recon column titled "nmap full port scan" with command `nmap -sV -sC -oA lame 10.10.10.3`. As they run the scan externally, they expand the card and paste findings into the notes field, then cycle its status to `done`. They move to the Enum column, add a card for SMB enumeration, and so on through Exploit and PrivEsc. After rooting the box, a Loot card captures the `root.txt` flag. The entire session state persists between launches.

### 10.2 Multi-Target CTF Competition

A user adds three targets representing different challenge machines: "Web01", "Crypto01", "Pwn01". Each target has its own Attack Board. Switching targets in the sidebar instantly reloads the relevant board. The footer shows `3 active targets` and the combined card progress across all three. IP badges in the header update to reflect the currently-selected machine.

### 10.3 Port and Credential Documentation

After running nmap against a target, the user switches to the Assets tab and adds each discovered port with its service and version string (e.g., port 22/tcp, `ssh`, `OpenSSH 7.4`). When they later extract credentials via a web form or SMB relay, they add them to the Credentials section with the appropriate type. A hash is stored as `type: hash` with the raw hash value; a discovered SSH key is stored as `type: key`.

### 10.4 Methodology Tracking Across a Pentest Engagement

A professional pentester adds a target for a client web server. They use the six-stage Attack Board as a structured checklist — Recon cards for initial OSINT steps, Enum cards for directory brute-forcing and header analysis, Exploit cards for each vulnerability attempt, Post cards for persistence and enumeration of the compromised host, PrivEsc cards for local privilege escalation vectors, and Loot cards for sensitive files and credentials extracted. The `blocked` status flags any cards awaiting additional information or tools.

### 10.5 TryHackMe Learning Room

A user works through a guided TryHackMe room. They add the room's target with platform `THM`. They create Attack Board cards that mirror the room's task list, using the command field to store the exact commands demonstrated in the writethrough. As they complete each task, they cycle its status to `done`. The board gives them a persistent visual map of their progress that survives browser refreshes and app restarts, unlike the THM web interface alone.

### 10.6 Ecosystem-Aware Workflow with GhostVault

A user keeps GhostVault open alongside ReconDesk. GhostVault (or the Launcher) reads `~/cybertools-config.json` and surfaces the active target name in its activity feed. The user writes detailed methodology notes in GhostVault, referencing the same target name and IP, while using ReconDesk's structured board and asset registry to track the discrete data points. The two apps complement each other: GhostVault for long-form narrative, ReconDesk for structured intelligence.

---

## 11. Entry Points and Build

### 11.1 Development

```bash
npm run dev
# equivalent to: electron-vite dev
```

electron-vite starts a Vite dev server for the renderer and compiles the main and preload processes. The renderer URL is injected via `ELECTRON_RENDERER_URL` environment variable, which `main.ts` detects to load the dev server URL instead of the built `index.html`.

### 11.2 Type Checking

```bash
npm run typecheck
# runs: tsc --noEmit
```

Validates all TypeScript across both the Node (main/preload) and web (renderer) configs without emitting output.

### 11.3 Production Build

```bash
npm run build
# runs: electron-vite build && electron-builder
```

electron-vite compiles all three targets (main → `out/main/main.js`, preload → `out/preload/preload.mjs`, renderer → `out/renderer/`) and electron-builder packages the result into `dist/`.

**Platform-specific build commands:**

```bash
npm run build:mac     # → .dmg (x64 + arm64 universal)
npm run build:win     # → NSIS installer (x64)
npm run build:linux   # → .AppImage + .deb
```

### 11.4 Startup Sequence

1. `app.whenReady()` fires
2. `createWindow()` opens the `BrowserWindow` (1280×800, min 900×600, `#0e1117` background, `hiddenInset` titlebar)
3. Main process loads `~/.recondesk/data.json` and calls `writeStatus()` to populate the ecosystem config immediately
4. `emitEvent('ReconDesk', 'app:launched', { version })` is written to the ecosystem event bus
5. A `setInterval` (10s) is started to refresh `cybertools-config.json` continuously
6. The renderer mounts `<App />`, which calls `window.electronAPI.loadData()` and hydrates the Zustand store
7. The UI renders with the persisted target list and last-active context

### 11.5 Shutdown Sequence

1. `window-all-closed` fires
2. The status interval is cleared
3. `emitEvent('ReconDesk', 'app:closed', {})` is written to the event bus
4. On non-macOS: `app.quit()` is called. On macOS: the app stays in the dock per convention

### 11.6 Build Output Structure

```
out/
├── main/main.js          — compiled main process (CJS via rollup)
├── preload/preload.mjs   — compiled preload (ESM)
└── renderer/
    ├── index.html
    └── assets/
        ├── index-*.js    — bundled renderer (React + Zustand + Framer Motion)
        └── index-*.css   — compiled Tailwind output
```

electron-builder packages `out/**/*` and `assets/**/*` into the final distributable under `dist/`.

---

## 12. Design System

### 12.1 Colour Tokens (Tailwind theme — Stealth palette)

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#0e1117` | App background |
| `panel` | `#161b22` | Card surfaces, sidebar |
| `border` | `#30363d` | All dividers and borders |
| `accent` | `#4a9eff` | Primary interactive colour, in-progress indicators |
| `accent2` | `#7bb8ff` | Secondary highlights |
| `text` | `#c9d1d9` | Primary readable text |
| `muted` | `#8b949e` | Labels, secondary text, placeholders |
| `success` | `#3fb950` | Open ports, done status, active targets |
| `warning` | `#d29922` | Filtered ports |
| `danger` | `#f85149` | Blocked cards, delete actions |

### 12.2 Typography

- **Sans-serif:** Inter, SF Pro Display, system-ui
- **Monospace:** JetBrains Mono, SF Mono, Menlo
- Font smoothing: `-webkit-font-smoothing: antialiased`
- Loaded at runtime: Inter from Google Fonts (weights 300–600)

### 12.3 Motion

All transitions use Framer Motion. Key patterns:
- Sidebar forms: `height: 0 → auto, opacity: 0 → 1`, duration 0.18s
- Card entry/exit: `opacity + y offset`, duration implicit (layout-driven)
- Tab indicator: `layoutId="tab-indicator"` spring, stiffness 400, damping 35
- Card detail expansion: height animation, 0.15s

### 12.4 Window Chrome

- macOS-native `hiddenInset` titlebar removes the default frame
- Traffic lights positioned at `{ x: 16, y: 16 }`
- Header uses `-webkit-app-region: drag` for drag-to-move
- Interactive elements inside the header use `.no-drag` class to remain clickable

---

*ItsEliias // ReconDesk v1.0.0*
