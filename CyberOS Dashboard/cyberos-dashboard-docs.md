# CyberOS Dashboard — Internal Documentation

> ItsEliias // CyberOS Dashboard v1.0

---

## Table of Contents

1. [What CyberOS Dashboard Is](#1-what-cyberos-dashboard-is)
2. [Tech Stack](#2-tech-stack)
3. [App Structure](#3-app-structure)
4. [UI Architecture](#4-ui-architecture)
5. [Features](#5-features)
6. [IPC / Main-Renderer Communication](#6-ipc--main-renderer-communication)
7. [Ecosystem Communication](#7-ecosystem-communication)
8. [Data Layer](#8-data-layer)
9. [Use Cases](#9-use-cases)
10. [Entry Points](#10-entry-points)
11. [Build and Run](#11-build-and-run)

---

## 1. What CyberOS Dashboard Is

CyberOS Dashboard is the **ecosystem-wide control plane** for the CYBERTOOLS suite. It is a desktop-native Electron application that gives the operator a single, persistent view across every CYBERTOOLS application running on the machine.

The dashboard does not duplicate any individual application's features. Its sole responsibility is **awareness and orchestration**: showing which apps are alive, surfacing their live operational metrics, presenting a real-time activity feed of cross-app events, and providing one-click launch for apps that register an executable path.

### Who uses it

A single operator (ItsEliias) who runs the CYBERTOOLS ecosystem day-to-day. The typical session involves the dashboard sitting open on one monitor while GhostVault, VaultCore, CyberLab, or ReconDesk are running their workloads.

### Problem it solves

Without a hub, checking the status of four separate Electron apps means switching windows constantly. The dashboard collapses that into a unified read — one window that answers: what is running, what is each app doing right now, what happened recently across the ecosystem, and does anything need attention.

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop shell | Electron | ^33.0.0 |
| Build / dev server | electron-vite | ^2.0.0 |
| UI framework | React | ^18.0.0 |
| Styling | Tailwind CSS | ^3.0.0 |
| Animation | Framer Motion | ^11.0.0 |
| State management | Zustand | ^4.5.0 |
| Language | TypeScript | ^5.0.0 |
| Bundler | Vite | ^5.0.0 |
| Packaging | electron-builder | ^25.0.0 |
| CSS processing | PostCSS + Autoprefixer | ^8 / ^10 |

**Runtime dependencies** (shipped in the app): `framer-motion`, `zustand`.

All other packages (React, Tailwind, Vite, TypeScript, Electron) are dev-only and are excluded from the distributed bundle.

**App metadata:**

- `appId`: `com.itsEliias.cyberos-dashboard`
- `productName`: `CyberOS Dashboard`
- `author`: `ItsEliias`
- macOS targets: dmg (x64 + arm64); Windows: NSIS (x64); Linux: AppImage + deb

---

## 3. App Structure

```
CyberOS Dashboard/
├── src/
│   ├── main/
│   │   ├── main.ts              # Electron main process entry point
│   │   ├── preload.ts           # Context-bridge — exposes electronAPI to renderer
│   │   └── ecosystem-bus.ts     # File-based ecosystem event bus (read/write/watch)
│   ├── renderer/
│   │   ├── index.html           # HTML shell, loads Inter font, sets CSP
│   │   ├── main.tsx             # React entry — mounts <App /> into #root
│   │   ├── App.tsx              # Root component, layout orchestrator, data bootstrap
│   │   ├── globals.css          # Global resets, scrollbar styling, drag-region rules
│   │   ├── env.d.ts             # TypeScript ambient declaration for window.electronAPI
│   │   ├── store/
│   │   │   └── index.ts         # Zustand store — config, events, version state
│   │   └── components/
│   │       ├── Header.tsx       # Top bar: title, online count, live clock
│   │       ├── Footer.tsx       # Status bar: branding, vault path, last event
│   │       ├── AppCard.tsx      # Per-app status card with metrics and launch button
│   │       └── ActivityFeed.tsx # Right-panel live event stream from ecosystem bus
│   └── shared/
│       └── types.ts             # Shared TypeScript interfaces used by main + renderer
├── electron.vite.config.ts      # electron-vite build config (main, preload, renderer)
├── tailwind.config.js           # Tailwind theme — CYBERTOOLS Stealth color palette
├── postcss.config.js            # PostCSS plugins (tailwindcss, autoprefixer)
├── tsconfig.json                # Root tsconfig — references node + web configs
├── tsconfig.node.json           # TS config for main process (ES2022, Node types)
├── tsconfig.web.json            # TS config for renderer (ES2020, DOM, react-jsx)
├── package.json                 # Dependencies, scripts, electron-builder config
└── out/                         # Compiled output (gitignored in practice)
    ├── main/main.js
    ├── preload/preload.mjs
    └── renderer/
```

### File responsibilities in brief

| File | Responsibility |
|---|---|
| `main.ts` | Window creation, IPC handlers, polling loop, ecosystem bus watcher, lifecycle events |
| `preload.ts` | Bridges IPC channels into `window.electronAPI` via `contextBridge` |
| `ecosystem-bus.ts` | Reads/writes/watches `ecosystem-events.json` on disk |
| `App.tsx` | Bootstraps data from IPC, builds card data, renders layout |
| `store/index.ts` | In-memory Zustand store holding `config`, `events`, `version` |
| `Header.tsx` | App identity, live online-app counter, live HH:MM:SS clock |
| `Footer.tsx` | Branding attribution, vault path hint, most-recent event |
| `AppCard.tsx` | Animated per-app status panel with metrics grid and launch action |
| `ActivityFeed.tsx` | Scrollable right-side panel showing up to 50 recent ecosystem events |
| `types.ts` | Shared type contract: `EcosystemConfig`, `EcosystemEvent`, per-app status interfaces |

---

## 4. UI Architecture

The renderer is a **single-screen React application** — there is no router. The entire UI fits in one fixed-size window (default 1200 × 750 px, minimum 900 × 600 px) and never navigates away from the dashboard view.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Header (48px)  [traffic lights] CYBEROS // ItsEliias  N/4 ⏱ │
├───────────────────────────────────────┬──────────────────────┤
│                                       │                      │
│  Ecosystem Applications               │   Activity (256px)   │
│  ┌──────────┐  ┌──────────┐          │   ─────────────────  │
│  │GhostVault│  │VaultCore │          │   GhostVault note     │
│  └──────────┘  └──────────┘          │   CyberLab session    │
│  ┌──────────┐  ┌──────────┐          │   VaultCore scrape    │
│  │CyberLab  │  │ReconDesk │          │   ...                 │
│  └──────────┘  └──────────┘          │                      │
│                                       │                      │
│  Ecosystem Health ████░░ ████░░ ...   │                      │
│                                       │                      │
├───────────────────────────────────────┴──────────────────────┤
│ Footer (28px)  ItsEliias // CyberOS Dashboard   vault: X     │
└──────────────────────────────────────────────────────────────┘
```

### Navigation

There is no navigation. The layout is fully static after boot. The only interactive elements are:

- **Launch / Focus buttons** on individual AppCards (when an `execPath` is registered for that app)
- **Scrollable ActivityFeed** panel on the right

### Window chrome

- `titleBarStyle: 'hiddenInset'` — native macOS title bar is hidden; traffic light buttons are repositioned to `{ x: 16, y: 16 }` and sit inside the custom header.
- The header row carries `class="drag-region"` so the operator can drag the window by the header. Interactive elements inside the header carry `class="no-drag"` to opt out.
- Background colour is set at the `BrowserWindow` level (`#0e1117`) so there is no white flash on load.

---

## 5. Features

### 5.1 Ecosystem Application Cards

Four app cards are displayed in a 2×2 grid. Each card covers one CYBERTOOLS application:

| App | Accent Color | Metrics shown |
|---|---|---|
| GhostVault | `#7bb8ff` (blue) | Notes total, last capture (time ago) |
| VaultCore | `#3fb950` (green) | Vault notes, sources, active scrape, last scrape |
| CyberLab | `#b44fff` (purple) | Current lab (highlighted), labs done, streak, findings |
| ReconDesk | `#d29922` (amber) | Active target (highlighted), targets total, attack cards |

Each card shows:

- **Name and subtitle** — app identity
- **Online / offline pill** — green dot when the heartbeat is recent (within 30 s), grey when stale or absent
- **Accent top-line** — a 1 px colored rule along the top edge of the card, only visible when the app is online (animated in via Framer Motion)
- **Metrics grid** — 2-column grid of small data chips; highlighted metrics (current lab, active target) render in accent blue
- **Last seen** / "active" footer — shows elapsed time since the last heartbeat when offline
- **Launch / Focus button** — only rendered when `execPath` is present in the ecosystem config; label reads "Focus →" when online, "Open →" when offline

Cards animate border color on hover (accent-tinted when active, grey when inactive) via Framer Motion `whileHover`.

### 5.2 Ecosystem Health Bar

Below the app card grid, a compact summary row renders one horizontal progress bar per app. When an app is online its bar fills to 100% in its accent color; when offline the bar is empty. This gives an at-a-glance cross-ecosystem health signal without reading individual cards.

### 5.3 Activity Feed

A 256 px wide right panel displays the 50 most recent cross-app ecosystem events sourced from the shared event bus file. Features:

- Color-coded app origin dot (matches per-app accent colors)
- Human-readable event label (mapped via `EVENT_LABELS` table; falls back to formatted event key)
- Optional data snippet (first two key/value pairs from the event's data payload)
- Relative timestamp (`now`, `Xs`, `Xm`, `Xh`)
- New events slide in from the right with a fade (Framer Motion `AnimatePresence`)
- List auto-scrolls to top on new arrival
- Empty state: "No ecosystem events yet. Launch an app to see activity."

### 5.4 Live Header Stats

- **Online count** — `N / 4 apps online` updated reactively; number renders green when ≥1, muted when 0
- **Live clock** — HH:MM:SS ticking every second (local time)
- **App version** — read from main process on startup, displayed as `vX.Y.Z`

### 5.5 Footer Status Bar

Compact 28 px status bar showing:

- `ItsEliias // CyberOS Dashboard` — persistent branding
- **Vault path** — if `obsidianVaultPath` is set in the ecosystem config, shows the final path segment (vault folder name) as a contextual hint
- **Last event** — app name + event key of the most recent ecosystem event

### 5.6 App Launch

When an app card has an `execPath` registered (sourced from `cybertools-config.json`), clicking the launch button calls `window.electronAPI.launchApp(execPath)`. The main process validates the path exists, spawns the binary via `execFile` (detached), and falls back to `shell.openPath` for macOS `.app` bundles.

---

## 6. IPC / Main-Renderer Communication

### Security model

- `contextIsolation: true` — renderer runs in an isolated context
- `nodeIntegration: false` — renderer has no direct Node access
- `sandbox: false` — preload script runs in the Electron preload context, not the sandboxed renderer context
- All Node/Electron APIs are accessed exclusively through the `contextBridge`

### Exposed API: `window.electronAPI`

Declared in `src/renderer/env.d.ts` and implemented in `src/main/preload.ts`.

| Method | Direction | IPC Channel | Description |
|---|---|---|---|
| `getState()` | renderer → main (invoke) | `ecosystem:state` | Returns annotated `EcosystemConfig` from `cybertools-config.json` |
| `getEvents()` | renderer → main (invoke) | `ecosystem:events` | Returns up to 50 most recent `EcosystemEvent[]` from the bus file |
| `getVersion()` | renderer → main (invoke) | `app:version` | Returns the app version string |
| `launchApp(execPath)` | renderer → main (invoke) | `app:launch` | Spawns a CYBERTOOLS app binary; returns `{ ok, error? }` |
| `openUrl(url)` | renderer → main (invoke) | `shell:open` | Opens a URL in the system default browser |
| `onStateUpdate(cb)` | main → renderer (push) | `ecosystem:update` | Receives config push every 5 seconds from the polling loop |
| `onEventsUpdate(cb)` | main → renderer (push) | `ecosystem:events` | Receives event bus push whenever the bus file changes |

### Push flow (main → renderer)

The main process has two background mechanisms that push data without the renderer asking:

1. **Config poll** — `setInterval` every 5 000 ms reads `cybertools-config.json`, annotates heartbeat freshness, and sends the result over `ecosystem:update`.
2. **Bus watcher** — `fs.watch` on `ecosystem-events.json` with an 80 ms debounce; fires `ecosystem:events` with the latest 50 events whenever the file changes.

Both are torn down on `window-all-closed`.

---

## 7. Ecosystem Communication

### Shared config file

**Path:** `~/cybertools-config.json`

This is the primary integration mechanism between all CYBERTOOLS apps. Each application writes its operational state into this JSON file. The dashboard reads it every 5 seconds and on demand. Structure matches `EcosystemConfig` from `src/shared/types.ts`.

Fields the dashboard reads:

| Field | Source app | What it contains |
|---|---|---|
| `cyberlab_status` | CyberLab | `active`, `lastActive`, `sessionActive`, `currentLab`, `sessionStart`, `hintLevel`, `streak`, `labsDone`, `findingsCount` |
| `vaultscraper_status` | VaultCore | `active`, `lastActive`, `activeScrape`, `lastScrape`, `nextScheduled`, `vaultNoteCount`, `totalSources`, `lastScrapeNew`, `lastScrapeUpdated` |
| `ghostvault_status` | GhostVault | `active`, `lastActive`, `lastCapture`, `noteCount` |
| `recondesk_status` | ReconDesk | `active`, `lastActive`, `activeTarget`, `targetCount`, `cardCount` |
| `cyberlab.execPath` | CyberLab setup | Path to CyberLab binary (used for launch button) |
| `vaultscraper.execPath` | VaultCore setup | Path to VaultCore binary (used for launch button) |
| `obsidianVaultPath` | Any app | Path to Obsidian vault; shown in footer |
| `theme` | Any app | Shared theme preference (read but not yet applied dynamically) |

### Heartbeat / presence detection

The dashboard applies an **offline threshold of 30 seconds**. When reading the config, the main process calls `isOnline(lastActive)` for each app's status block. If the `lastActive` ISO timestamp is more than 30 000 ms in the past (or absent), `active` is set to `false` before the config is sent to the renderer. This annotation happens in `annotateConfig()` in `main.ts` and is not persisted back to disk.

### Shared event bus

**Path:** `~/Library/Application Support/CyberTools/ecosystem-events.json`

All CYBERTOOLS applications can write to this file. The dashboard:

- Reads it on startup (`getEvents`)
- Watches it with `fs.watch` (80 ms debounce) for real-time updates
- Emits two events of its own:
  - `{ app: 'CyberOS', event: 'dashboard:launched', data: { version } }` — on app ready
  - `{ app: 'CyberOS', event: 'dashboard:closed', data: {} }` — on window-all-closed

**Bus invariants:**
- Events are stored newest-first (prepended via `unshift`)
- Capped at 150 events total; older entries are spliced off
- Each event has a unique `id` composed of `Date.now()` + 5-character random base-36 suffix
- The dashboard displays up to 50 events in the UI

### Known event types (from ActivityFeed label map)

| Event key | Display label |
|---|---|
| `app:launched` | launched |
| `app:closed` | closed |
| `dashboard:launched` | dashboard opened |
| `dashboard:closed` | dashboard closed |
| `note:created` | note created |
| `note:saved` | note saved |
| `scrape:started` | scrape started |
| `scrape:completed` | scrape completed |
| `session:started` | session started |
| `session:saved` | session saved |
| `target:added` | target added |
| `target:removed` | target removed |

Unrecognised event keys fall back to a formatted version of the key (dots and colons replaced with spaces).

---

## 8. Data Layer

The dashboard is **entirely read-only** with respect to persistent data. It does not write to `cybertools-config.json` (other apps own it). It writes only two event entries to `ecosystem-events.json` (on launch and close).

### Files the dashboard reads

| File | Location | Format | Purpose |
|---|---|---|---|
| `cybertools-config.json` | `~/cybertools-config.json` | JSON object | Ecosystem-wide app status and registration config |
| `ecosystem-events.json` | `~/Library/Application Support/CyberTools/ecosystem-events.json` | JSON array | Cross-app event log |

### In-memory state (Zustand store)

The renderer holds all runtime state in a Zustand store (`src/renderer/store/index.ts`). There is no persistence layer on the renderer side — state is rebuilt from the IPC calls on every app launch.

| State key | Type | Source |
|---|---|---|
| `config` | `EcosystemConfig` | Loaded via `getState()`, updated via `onStateUpdate` push |
| `events` | `EcosystemEvent[]` | Loaded via `getEvents()`, updated via `onEventsUpdate` push |
| `version` | `string` | Loaded once via `getVersion()` |

### Schema: EcosystemEvent

```typescript
interface EcosystemEvent {
  id: string          // e.g. "1717180000000-k3j9x"
  timestamp: string   // ISO 8601
  app: string         // e.g. "GhostVault", "CyberLab", "CyberOS"
  event: string       // e.g. "note:created", "session:started"
  data: Record<string, unknown>  // arbitrary key-value payload
}
```

### Schema: AppStatus (base)

```typescript
interface AppStatus {
  active: boolean       // computed by dashboard from lastActive; not persisted
  lastActive: string    // ISO 8601 — last heartbeat written by the app
}
```

Each per-app status interface (`CyberLabStatus`, `VaultScraperStatus`, `GhostVaultStatus`, `ReconDeskStatus`) extends `AppStatus` with domain-specific fields (see `src/shared/types.ts` for full definitions).

---

## 9. Use Cases

### UC-1: Morning ecosystem check

The operator opens CyberOS Dashboard at the start of a session. The app reads `cybertools-config.json` immediately and shows which apps were running during the previous session. Cards for apps with stale heartbeats (> 30 s) render offline. The Activity feed shows what happened overnight — VaultCore completed a scheduled scrape, GhostVault saved a note. The operator has full situational awareness within seconds.

### UC-2: Launching VaultCore from the dashboard

VaultCore is offline. Its card shows the "Open →" button because `vaultscraper.execPath` is registered in `cybertools-config.json`. The operator clicks it. The main process calls `execFile(execPath, [], { detached: true })`. VaultCore starts. Within 30 seconds VaultCore writes its heartbeat to `cybertools-config.json`. The dashboard's next 5-second poll picks it up, annotates `active: true`, and pushes the updated config to the renderer. The VaultCore card transitions to online state — green dot, filled health bar, accent top-line appears.

### UC-3: Monitoring a live VaultCore scrape

VaultCore starts a scrape and writes `activeScrape: "HackTheBox Writeups"` to its status block. The dashboard's polling loop picks this up within 5 seconds. The VaultCore card's "Active scrape" metric updates from "idle" to "HackTheBox Writeups". Simultaneously, VaultCore emits a `scrape:started` event to the bus file. The dashboard's `fs.watch` fires within 80 ms, the Activity feed prepends a new green "VaultCore — scrape started" entry with the target name visible in the data snippet.

### UC-4: CyberLab session awareness

The operator is running a HackTheBox challenge in CyberLab. CyberLab writes its heartbeat and status — `currentLab: "Codify"`, `streak: 12`, `labsDone: 47`, `findingsCount: 3` — every few seconds. The CyberLab card on the dashboard shows this data live (highlighted in accent blue for the lab name). The header counter shows "2 / 4 apps online" as both CyberLab and GhostVault are running.

### UC-5: Detecting a crashed app

GhostVault was running but the process was killed unexpectedly. GhostVault stops writing heartbeats. After 30 seconds the dashboard's next config poll calls `isOnline(lastActive)` and finds the gap exceeds the threshold. It annotates `ghostvault_status.active = false` and pushes the updated config. The GhostVault card transitions to offline — the accent top-line fades out, the green dot turns grey, "last seen Xm ago" appears in the card footer. The operator knows something is wrong without switching windows.

### UC-6: Reviewing historical ecosystem activity

After a long session, the operator wants to see what each app did. The Activity feed is scrollable and holds up to 50 events ordered newest-first. The operator scrolls down to see events from earlier in the session: note saves, session starts, scrape completions, target additions. Each entry shows the originating app in its accent color, making the feed easy to scan.

### UC-7: External link / reference opening

The ecosystem (via future event data or UI additions) may include URLs. The `openUrl` IPC method is available on `window.electronAPI` for this purpose. It delegates to `shell.openExternal`, which opens the URL in the system browser while keeping the Electron window as the active app.

---

## 10. Entry Points

### Main process (`src/main/main.ts`)

Electron's main process entry point. Responsibilities:

1. **Window creation** — `createWindow()` sets up a `BrowserWindow` with the custom title bar, background color, and preload script. In dev it loads from the Vite dev server URL (`ELECTRON_RENDERER_URL`); in production it loads `out/renderer/index.html`.
2. **IPC handler registration** — registers five `ipcMain.handle` handlers (`ecosystem:state`, `ecosystem:events`, `app:version`, `app:launch`, `shell:open`) before the window is created, so they are available immediately.
3. **Config polling loop** — a `setInterval` every 5 000 ms reads, annotates, and pushes `EcosystemConfig` to the renderer via `ecosystem:update`.
4. **Bus file watcher** — `watchEvents()` returns a `fs.FSWatcher` on `ecosystem-events.json`. On change (debounced 80 ms) it pushes updated events to the renderer via `ecosystem:events`.
5. **Boot event emission** — emits `{ app: 'CyberOS', event: 'dashboard:launched' }` to the ecosystem bus on startup.
6. **Teardown** — on `window-all-closed`, clears the poll interval, closes the bus watcher, emits `dashboard:closed`, and quits (non-macOS) or stays alive (macOS).

### Preload script (`src/main/preload.ts`)

Runs in the preload context with access to `ipcRenderer`. Uses `contextBridge.exposeInMainWorld('electronAPI', {...})` to surface a typed API surface to the renderer. The exposed object contains both invoke-style request methods and push-style listener registration methods (which return unsubscribe functions).

### Renderer entry (`src/renderer/main.tsx`)

Mounts the React tree into `#root`. Wraps `<App />` in `React.StrictMode`. Imports `globals.css` which applies Tailwind base layers and global resets.

### `App.tsx` bootstrap sequence

On first render, `App` calls three IPC invocations in parallel via `useEffect`:

```
getState()   → setConfig()
getEvents()  → setEvents()
getVersion() → setVersion()
```

Then registers two push listeners:

```
onStateUpdate(setConfig)   → returns unsub
onEventsUpdate(setEvents)  → returns unsub
```

Cleanup on unmount calls both unsub functions.

---

## 11. Build and Run

### Prerequisites

- Node.js (v18+ recommended)
- `npm install` in the project root

### Development

```bash
npm run dev
# or
npm start
```

`electron-vite dev` starts the Vite dev server for the renderer and launches Electron pointing to it via `ELECTRON_RENDERER_URL`. Hot module replacement is active for the renderer; changes to `main.ts` or `preload.ts` require a restart.

### Type checking

```bash
npm run typecheck
```

Runs `tsc --noEmit` against both the node and web tsconfig targets.

### Production build

```bash
npm run build        # build for current platform
npm run build:mac    # macOS dmg (x64 + arm64)
npm run build:win    # Windows NSIS installer
npm run build:linux  # AppImage + deb
```

Build sequence:

1. `electron-vite build` — compiles and bundles all three targets (main, preload, renderer) into `out/`
2. `electron-builder` — packages the `out/` directory into the platform-native installer/archive in `dist/`

### Output directories

| Directory | Contents |
|---|---|
| `out/main/` | Compiled main process (`main.js`) |
| `out/preload/` | Compiled preload script (`preload.mjs`) |
| `out/renderer/` | Bundled React app (HTML + hashed JS + CSS) |
| `dist/` | Final distributable installers/archives |

### Vite / build configuration

`electron.vite.config.ts` configures three separate Vite build targets:

- **main** — uses `externalizeDepsPlugin` (Electron + Node built-ins are not bundled); input: `src/main/main.ts`
- **preload** — uses `externalizeDepsPlugin`; input: `src/main/preload.ts`
- **renderer** — uses `@vitejs/plugin-react`; root: `src/renderer`; path alias `@shared` → `src/shared`

### Content Security Policy

Set in `src/renderer/index.html`:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com
```

Google Fonts (Inter) is loaded at runtime. All scripts must be same-origin — no inline scripts from third parties.

---

## Appendix: Ecosystem Integration Diagram

```
~/cybertools-config.json          ~/Library/Application Support/CyberTools/ecosystem-events.json
         │                                              │
         │  write heartbeat + status                    │  write events
         │◄──────────────────────────                   │◄───────────────────
    GhostVault                                     GhostVault
    VaultCore                                      VaultCore
    CyberLab                                       CyberLab
    ReconDesk                                      ReconDesk
         │                                              │
         │  read every 5s                               │  fs.watch (80ms debounce)
         ▼                                              ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                     CyberOS Dashboard                           │
  │                        main.ts                                  │
  │                                                                 │
  │  annotateConfig()           watchEvents()                       │
  │  → push ecosystem:update    → push ecosystem:events             │
  │                         │                │                      │
  │               ──────────┼────────────────┼──────────            │
  │                         ▼                ▼                      │
  │                    preload.ts (contextBridge)                   │
  │                         │                                       │
  │                         ▼                                       │
  │                   renderer / React                              │
  │                  Zustand store                                  │
  │                  (config, events)                               │
  │                         │                                       │
  │           ┌─────────────┼─────────────────┐                    │
  │           ▼             ▼                 ▼                    │
  │       AppCards    HealthBar         ActivityFeed                │
  └─────────────────────────────────────────────────────────────────┘
```

---

*ItsEliias // CyberOS Dashboard v1.0 — CYBERTOOLS Ecosystem*
