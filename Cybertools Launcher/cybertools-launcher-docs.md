# CYBERTOOLS Launcher — Internal Documentation

**Version:** 1.0.0
**Author:** ItsEliias
**App ID:** `com.itsEliias.cybertools-launcher`

---

## Table of Contents

1. [What It Is](#1-what-it-is)
2. [Tech Stack](#2-tech-stack)
3. [File and Folder Map](#3-file-and-folder-map)
4. [UI Architecture](#4-ui-architecture)
5. [Features](#5-features)
6. [Ecosystem Role](#6-ecosystem-role)
7. [IPC — Main / Renderer Communication](#7-ipc--main--renderer-communication)
8. [Inter-App Communication](#8-inter-app-communication)
9. [Data Layer](#9-data-layer)
10. [Use Cases](#10-use-cases)
11. [Entry Points and Build](#11-entry-points-and-build)

---

## 1. What It Is

The CYBERTOOLS Launcher is a **system-tray-first Electron application** that acts as the operational hub for the entire CYBERTOOLS desktop ecosystem. It does not do cybersecurity work itself — it orchestrates everything around it.

Its job is threefold:

**Hub.** It is the single place from which every CYBERTOOLS application is launched. The user never needs to navigate Finder or a dock. One click on the tray icon opens the panel; one more click opens any app in the suite.

**Dashboard.** The launcher reads live status data that other apps continuously write to a shared JSON config file. Without opening CyberLab or VaultCore, the user can see: is a lab session active, which lab is being worked on, how long it has run, how many flags have been captured, whether a vault scrape is in progress, when the next scheduled scrape is, and how many notes exist in the vault.

**Presence layer.** The launcher is always running. It lives in the macOS menu bar (or Windows/Linux system tray). It sends native desktop notifications when important events occur across any app in the suite. It watches the shared ecosystem event bus and displays a unified activity feed combining events from all apps.

### What it launches

Three first-party apps (configured via Settings > Apps):

| Key | Display Name | Launch arg |
|-----|-------------|-----------|
| `cyberlab` | CyberLab Companion | `--launcher-open` |
| `vaultscraper` | VaultCore | `--launcher-open` |
| `ghostvault` | GhostVault | `--launcher-open` |

Plus up to four user-defined **custom slots** — any executable or `.app` bundle on the system.

### Ecosystem orchestration

The launcher does not start a server or broker messages in real time. It uses two coordination mechanisms:

1. **Shared config file** (`~/cybertools-config.json`): polled every 5 seconds by all apps. Status written by each app is read by the launcher and rendered in the panel. Triggers written by the launcher (e.g. `vaultscraper_trigger`) are read by VaultCore to initiate actions.
2. **Shared ecosystem event bus** (`~/Library/Application Support/CyberTools/ecosystem-events.json`): a JSON append log that any app can write to. The launcher watches this file with `fs.watch` and streams new events into the Activity tab in real time.

---

## 2. Tech Stack

### Runtime

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 28 |
| Main process | Node.js (TypeScript, ES modules) |
| Renderer | React 18 + TypeScript |
| State management | Zustand 4 |
| Animation | Framer Motion 11 |
| Styling | Tailwind CSS 3 + CSS custom properties |
| Build | electron-vite 2, Vite 5 |
| Packaging | electron-builder 24 |

### Key design choices

- **No external runtime dependencies in production.** The dependency list is deliberately minimal: React, ReactDOM, Zustand, Framer Motion. Everything else (config, IPC, launching, VPN detection) is pure Node.js built-ins.
- **No AI, no network calls.** The only outbound HTTP is the update check against the GitHub Releases API, and that is fire-and-forget with an 8-second timeout.
- **Transparent frameless window.** The panel is a `BrowserWindow` with `frame: false`, `transparent: true`, and `alwaysOnTop: true`. The visual chrome (rounded corners, shadows) is entirely CSS.
- **Mac dock hidden.** `LSUIElement: true` in the macOS build config and `app.dock.hide()` in code keep the launcher out of the Dock.
- **Single instance lock.** `app.requestSingleInstanceLock()` ensures only one launcher runs at a time; a second launch attempt shows the existing panel.

### TypeScript config

Two `tsconfig` references:

- `tsconfig.node.json` — targets `ES2020`, `module: ESNext`, covers `src/main/**` and `src/shared/**`. Compiles to `out/main`.
- `tsconfig.web.json` — targets `ES2020` with DOM libs, `jsx: react-jsx`, covers `src/renderer/**` and `src/shared/**`. Path alias `@shared/*` resolves to `src/shared/*`. Type-checks only (no emit — Vite handles bundling).

---

## 3. File and Folder Map

```
Cybertools Launcher/
│
├── src/
│   ├── main/
│   │   ├── main.ts              # Electron main process — all orchestration
│   │   ├── config.ts            # Read/write ~/cybertools-config.json
│   │   ├── ecosystem-bus.ts     # Read/write/watch ecosystem-events.json
│   │   ├── launcher-utils.ts    # Status parsers, health checker, formatters
│   │   └── preload.ts           # contextBridge API exposed to renderer
│   │
│   ├── renderer/
│   │   ├── main.tsx             # React entry point
│   │   ├── App.tsx              # Root component, IPC wiring, layout
│   │   ├── env.d.ts             # Declares window.api type
│   │   ├── store/
│   │   │   └── index.ts         # Zustand store (config, vpn, events, UI state)
│   │   ├── components/
│   │   │   ├── SplashScreen.tsx     # Boot splash, animates out after 1.5s
│   │   │   ├── Header.tsx           # Brand, version, VPN dot, settings button
│   │   │   ├── StatsStrip.tsx       # 4-column streak / labs / notes / sources
│   │   │   ├── AppCard.tsx          # Per-app status card (CyberLab/VaultCore/GhostVault)
│   │   │   ├── CustomSlotsGrid.tsx  # 2-column grid of user-pinned apps (max 4)
│   │   │   ├── CustomSlotModal.tsx  # Add/edit/delete a custom slot
│   │   │   ├── ActivityFeed.tsx     # Merged local + ecosystem event feed
│   │   │   ├── UpdateBanner.tsx     # Dismissible banner when newer version found
│   │   │   ├── SettingsPanel.tsx    # Slide-in panel (Apps / Vault / Theme tabs)
│   │   │   └── Footer.tsx           # Theme switcher chips + ItsEliias brand
│   │   ├── lib/
│   │   │   └── utils.ts         # parseCyberlabStatus, parseVaultscraperStatus, formatters
│   │   └── styles/
│   │       └── globals.css      # Core themes + personality overlays via CSS vars
│   │
│   └── shared/
│       └── types.ts             # All shared TypeScript interfaces
│
├── assets/
│   ├── icon.icns                # macOS app icon
│   ├── tray-icon-placeholder.txt
│   └── logo_placeholder.txt
│
├── out/                         # Compiled output (electron-vite build)
│   ├── main/index.js
│   ├── preload/preload.cjs
│   └── renderer/
│
├── dist/                        # Packaged distributable (electron-builder)
│
├── ecosystem-bus.js             # Legacy CommonJS version (pre-TypeScript migration)
├── electron.vite.config.ts      # Build config for all three processes
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json                # Project references root
├── tsconfig.node.json
├── tsconfig.web.json
├── package.json
└── start.sh                     # Dev convenience script
```

### File roles in detail

**`src/main/main.ts`** — The single orchestrating file for everything that runs in the Electron main process. Responsibilities: single-instance lock, tray creation, panel window lifecycle (create/show/hide/toggle), context menu, app launching via `child_process.spawn`, config polling (5s interval), notification diffing, VPN detection (30s interval), update checking, IPC handler registration, ecosystem bus wiring, and startup auto-detection of app paths.

**`src/main/config.ts`** — Pure file I/O module for `~/cybertools-config.json`. Exports: `readConfig`, `writeConfig`, `updateConfig` (atomic read-modify-write), `addActivityEntry`, `clearActivityFeed`, `writeTrigger`. Uses a `.tmp` rename pattern to prevent partial writes from corrupting the config. Merges incoming partial configs with defaults so missing keys never cause runtime errors.

**`src/main/ecosystem-bus.ts`** — Manages `~/Library/Application Support/CyberTools/ecosystem-events.json`. Exports: `readEvents`, `emitEvent`, `watchEvents`. Uses `fs.watch` with an 80ms debounce to avoid reacting to partial writes. Caps events at 150 entries. Uses the same `.tmp` rename pattern for safe writes.

**`src/main/launcher-utils.ts`** — Stateless utility functions used in the main process: `parseCyberlabStatus`, `parseVaultscraperStatus`, `checkAppHealth` (verifies `execPath` exists on disk), `formatDuration`, `formatRelativeTime`, `formatFutureTime`.

**`src/main/preload.ts`** — Defines the `ElectronAPI` interface and exposes it on `window.api` via `contextBridge.exposeInMainWorld`. The renderer never calls `ipcRenderer` directly — all IPC goes through this typed bridge.

**`src/shared/types.ts`** — The single source of truth for all shared types used across main, preload, and renderer. Key interfaces: `CyberToolsConfig`, `CyberlabStatus`, `VaultscraperStatus`, `GhostVaultConfig`, `CustomSlot`, `ActivityEntry`, `VpnStatus`, `UpdateInfo`, `EcosystemEvent`, and the `Parsed*` variants used by status parsers.

**`src/renderer/store/index.ts`** — Zustand store with eight fields: `config`, `vpn`, `updateInfo`, `ecosystemEvents`, `activeTab`, `version`, `splashDone`, `settingsOpen`. Each has a corresponding setter. No derived state or selectors — components read what they need directly.

**`src/renderer/lib/utils.ts`** — Renderer-side copies of the status parsers and formatters (identical logic to `launcher-utils.ts`). Also used by `AppCard` to determine status dot color and status text.

**`src/renderer/styles/globals.css`** — CSS custom property definitions for four core themes (`stealth`, `graphite`, `frost`, `oled`) applied via `[data-core]` attribute, and four personality overlays (`neutral`, `cyberpunk`, `terminal`, `threat`) applied via `[data-personality]` attribute. Tailwind scans only the renderer source.

---

## 4. UI Architecture

The UI is a fixed 480x620px floating panel. It uses a flex column layout with no scrolling at the top level — only the content area scrolls internally.

### Layout layers (top to bottom)

```
┌─────────────────────────────────────────┐  ← SplashScreen (z-50, covers all, fades out)
│ [UpdateBanner]  (conditional, animated) │
│─────────────────────────────────────────│
│ Header (44px)                           │  ← brand / version / VPN dot / settings button
│─────────────────────────────────────────│
│ StatsStrip (4 cols)                     │  ← streak | labs | notes | sources
│─────────────────────────────────────────│
│ Tab Bar: [ tools ] [ activity ]         │  ← animated underline via Framer Motion layoutId
│─────────────────────────────────────────│
│                                         │
│  Content Area (flex-1, overflow-y-auto) │  ← tools tab or activity tab
│                                         │
│─────────────────────────────────────────│
│ Footer (theme chips + ItsEliias)        │
└─────────────────────────────────────────┘

[SettingsPanel]     (z-40, slides in from right, 288px wide)
[CustomSlotModal]   (z-50, centered modal)
```

### Components

**`SplashScreen`** — Covers the entire panel at `z-50`. Shows CYBERTOOLS wordmark and the diamond icon SVG. The main process sends `splash-complete` after 1.5s; `App.tsx` flips `showSplash` to false, triggering a 500ms `opacity: 0` exit via Framer Motion `AnimatePresence`.

**`Header`** — Reads `vpn` and `version` from the Zustand store. Shows a 1.5px green dot with a glow shadow when VPN is active, a red dot when it is off. The settings gear icon calls `onSettingsClick` which sets `settingsOpen: true` in the store.

**`StatsStrip`** — Reads `config.cyberlab_status` and `config.vaultscraper_status` from the store. Renders four metric cells: streak (days), labsDone, vaultNoteCount, totalSources. Shows `—` when data is 0 or absent. Stat values use a CSS gradient via `--stat-grad` that shifts with the active personality theme.

**`AppCard`** — A single component handling three distinct card types via the `appKey` prop. Each variant has its own status dot logic:
- CyberLab: grey (not configured) → grey (offline/stale) → green pulsing (session active) → blue (idle connected)
- VaultCore: grey → blue (idle) → amber (scraping) → red (error)
- GhostVault: grey (not configured) → blue (ready)

CyberLab and VaultCore cards show a 3-column metrics strip (streak/labs/flags for CyberLab; notes/sources/next-scrape for VaultCore) only when status is connected and not stale. VaultCore has an extra refresh button (`↻`) that calls `onUpdateNow`.

**`CustomSlotsGrid`** — Renders user-pinned apps in a 2-column grid. Each slot shows an emoji icon (if set) or a 2-letter abbreviation placeholder. Launch keys are `custom_0` through `custom_3`. Shows `+ Add` when fewer than 4 slots exist. Edit button opens `CustomSlotModal` pre-populated with the slot's data.

**`CustomSlotModal`** — Centered modal at `z-50`. Manages local state for name, execPath, and icon (emoji). The path picker calls `window.api.openFolderPicker()`. Validation: Save button is disabled until both name and execPath are non-empty. Shows a red Delete button when editing an existing slot.

**`ActivityFeed`** — Takes two separate data sources: `entries` (local activity from `config.launcher.activityFeed`) and `ecosystemEvents` (from the ecosystem bus). Merges them into a single chronologically sorted list (newest first, capped at 50) via `buildFeed`. Each item shows a colored dot keyed by app type, the event text, and a relative timestamp. Renders with `AnimatePresence` so new events slide in from the top.

**`UpdateBanner`** — Conditional animated bar at the top of the content area. Visible only when `updateInfo` is non-null in the store. Clicking opens the GitHub release URL via `window.api.openExternal`.

**`SettingsPanel`** — A 288px wide slide-in panel from the right edge of the main panel, covering it at `z-40` with a semi-transparent backdrop. Contains three sub-tabs:
- **Apps** — Lists CyberLab, VaultCore, GhostVault with their current `execPath` and a "Locate app…" button that triggers a folder picker.
- **Vault** — Shows `obsidianVaultPath`, folder picker to change it.
- **Theme** — 2x2 button grid for core theme, 2x2 grid for personality theme. Clicking saves immediately.

**`Footer`** — Displays the `ItsEliias` brand text on the left. On the right: four small square chips for core theme (stealth/graphite/frost/oled), a vertical divider, and four letter chips for personality (N/C/T/T). Active selection highlighted with `--accent`. Changes write to config immediately via `handleSaveConfig` in `App.tsx`.

### Theme system

Themes are applied as HTML attributes on `<body>`:

```
data-core="stealth|graphite|frost|oled"
data-personality="neutral|cyberpunk|terminal|threat"
```

`App.tsx` watches `config.theme` and `config.personalityTheme` and updates these attributes in a `useEffect`. Core themes define surface, border, text, and shadow variables. Personality themes only override `--accent` and `--accent2`. All Tailwind utility classes in this project reference CSS variables (e.g., `bg-[var(--bg)]` or the aliased tokens in `tailwind.config.js`).

---

## 5. Features

### Tray-first operation

The launcher has no persistent window. It lives in the macOS menu bar / Windows system tray. On macOS, `app.dock.hide()` is called at startup and again on `activate`. The `BrowserWindow` has `skipTaskbar: true`.

- **Left click** on tray icon: toggles panel open/close.
- **Double click**: opens panel if not visible.
- **Right click**: native context menu with keyboard shortcuts.
- 300ms cooldown after hide prevents accidental re-open from the closing click.

Panel closes automatically on blur unless a native file dialog is open (`isDialogOpen` flag prevents false dismissal when the system dialog steals focus).

### App launching

`launchApp(appKey)` in `main.ts` handles three scenarios:

1. **macOS `.app` bundle**: `spawn('open', [execPath, '--args', '--launcher-open'])`.
2. **Directory** (Electron project in dev): finds `node_modules/.bin/electron` inside the directory and spawns it with `.` as the entry.
3. **Binary/executable**: spawns the file directly with `['--launcher-open']` as args.

All spawns are `detached: true, stdio: 'ignore'` and `.unref()`'d so the launcher does not block on or take ownership of child processes. On success, an activity entry is written.

Custom slots use an empty args array (no `--launcher-open`).

### Path auto-detection

On `app.whenReady()`, before any UI appears, the launcher scans `~/Documents/Claude/Projects` for known subdirectory names and auto-fills `execPath` in the config for any app that has no path configured yet:

| appKey | Expected directory name |
|--------|------------------------|
| `cyberlab` | `Cyberlab Compaion` |
| `vaultscraper` | `VaultCore` |
| `ghostvault` | `GhostVault` |

### Config polling and notification diffing

`pollConfig()` runs every 5 seconds via `setInterval`. On each tick it reads `~/cybertools-config.json`, pushes the new config to the renderer via `config-update` IPC, and calls `checkNotifications(prev, curr)`.

`checkNotifications` diffs the old and new config to fire native `Notification` objects for:

| Trigger | Notification |
|---------|-------------|
| `cyberlab.installed` appeared | "CyberLab Companion connected to launcher" |
| `vaultscraper.installed` appeared | "VaultCore connected to launcher" |
| `ghostvault.execPath` appeared | "GhostVault connected to launcher" |
| `cyberlab_status.findingsCount` increased | "CyberLab: Flag captured on [lab]" |
| `vaultscraper_status.activeScrape` went from truthy to falsy | "VaultCore: [source] complete — X new, Y updated" |
| `cyberlab_status.sessionActive` went from true to false | Logs "Session complete: [lab]" to activity feed (no notification) |

All notifications are clickable and open the relevant app via `launchApp`.

### VPN detection

`detectVPN()` scans `os.networkInterfaces()` for interface names matching any of: `tun`, `tap`, `vpn`, `proton`, `wg`, `ppp`, `utun`, `ipsec`, `ovpn`, `nord`. Runs at startup and then every 30 seconds. Result is pushed to renderer via `vpn-update` IPC.

### Update checker

Runs 4 seconds after startup via `setTimeout`. Makes an HTTPS GET to the GitHub Releases API URL (configurable via `config.launcher.updateUrl`, defaults to the `itsEliias/cybertools-launcher` repo). Parses `tag_name` from the JSON response. If the stripped version string is newer than the current `APP_VERSION`, sends `update-available` to the renderer. The `UpdateBanner` component responds.

Semver comparison is a simple 3-part numeric loop — no semver library needed.

### Tray context menu

Keyboard shortcuts are declared in the menu template and enforced by Electron natively:

| Action | Shortcut |
|--------|---------|
| Open Launcher | Cmd/Ctrl+O |
| Open CyberLab Companion | Cmd/Ctrl+1 |
| Open VaultCore | Cmd/Ctrl+2 |
| Settings | Cmd/Ctrl+, |
| Quit CyberTools | Cmd/Ctrl+Q |

Settings opens the panel and then sends `open-settings` IPC after a 220ms delay (time for the panel animation to complete).

### Custom slots

- Maximum 4 custom slots stored in `config.launcher.customSlots`.
- Each slot: `{ name: string, execPath: string, icon?: string }` (icon is an emoji character).
- CRUD operations are IPC calls (`add-custom-slot`, `remove-custom-slot`, `update-custom-slot`) that directly `updateConfig`.
- Launch keys: `custom_0` through `custom_3`. These skip the `--launcher-open` argument.

### Fallback tray icon generation

If `assets/tray-icon.png` is missing, `main.ts` generates a valid 32×32 PNG in memory using raw zlib compression and hand-written PNG chunk construction — no external image library. The generated icon is a dark background with a cross/diamond shape in purple (`rgb(180, 79, 255)`).

---

## 6. Ecosystem Role

The CYBERTOOLS Launcher is the **always-on hub** for the ecosystem. Every other app can be running, stopped, or not yet installed — the launcher remains alive in the tray and maintains awareness of them all.

### How it knows app state

Other apps write their status into `~/cybertools-config.json` on a heartbeat (every ~10 seconds in practice). The launcher's 5-second config poll reads this. A status is considered **stale** (app not running) if `lastActive` is more than 60 seconds in the past.

### How it spawns apps

`launchApp(appKey)` is a fire-and-forget spawn. The launcher does not track the PID, does not monitor stdout, and does not kill the child on quit. Apps are fully independent processes; the launcher only starts them.

### How it triggers VaultCore

To initiate an immediate scrape without opening VaultCore, the launcher writes:

```json
{
  "vaultscraper_trigger": {
    "action": "update_now",
    "timestamp": "2026-06-01T12:00:00.000Z"
  }
}
```

into the shared config. VaultCore watches for this key on its own polling interval, acts on it, and clears the key. The launcher writes an activity entry immediately when the trigger is written, not when VaultCore confirms execution.

### Ecosystem event bus

The launcher registers as a bus participant on startup:

```typescript
ecosystemBus.emitEvent('Launcher', 'launcher.opened', {});
```

It then calls `ecosystemBus.watchEvents(callback)` which sets up `fs.watch` on `ecosystem-events.json`. When any app writes a new event to the bus, the callback fires (debounced 80ms), and the launcher pushes the updated events array to the renderer via `ecosystem-events-updated` IPC. The renderer merges these with the local activity feed.

### Known ecosystem event types (from ActivityFeed label map)

| Event type | Display label |
|-----------|--------------|
| `launcher.opened` | Launcher opened |
| `cyberlab.session.started` | CyberLab session started |
| `cyberlab.session.ended` | CyberLab session ended |
| `cyberlab.flag.captured` | Flag captured |
| `vaultscraper.scrape.started` | VaultCore scrape started |
| `vaultscraper.scrape.complete` | VaultCore scrape complete |
| `recondesk.target.added` | ReconDesk: target added |
| `signalboard.item.saved` | SignalBoard: item saved |

The last two (`recondesk`, `signalboard`) are forward-declared in the label map for future apps in the ecosystem that do not yet exist in the launcher codebase but are anticipated in the ecosystem spec.

---

## 7. IPC — Main / Renderer Communication

All IPC is routed through the typed `window.api` bridge defined in `preload.ts` and exposed via `contextBridge`. The renderer never calls `ipcRenderer` directly.

### Invoke channels (request / response)

| Channel | Direction | Payload | Returns |
|---------|-----------|---------|---------|
| `get-config` | Renderer → Main | — | `CyberToolsConfig` |
| `save-config` | Renderer → Main | `Partial<CyberToolsConfig>` | `boolean` |
| `save-config-deep` | Renderer → Main | `Record<string, unknown>` (deep merge) | `boolean` |
| `launch-app` | Renderer → Main | `appKey: string` | `boolean` (success) |
| `update-now` | Renderer → Main | — | `boolean` |
| `get-vpn-status` | Renderer → Main | — | `VpnStatus` |
| `hide-panel` | Renderer → Main | — | `void` |
| `open-file-picker` | Renderer → Main | `{ filters?: FileFilter[] }` | `string \| null` |
| `open-folder-picker` | Renderer → Main | — | `string \| null` |
| `check-file-exists` | Renderer → Main | `filePath: string` | `boolean` |
| `clear-activity` | Renderer → Main | — | `void` |
| `add-activity` | Renderer → Main | `Partial<ActivityEntry>` | `void` |
| `get-version` | Renderer → Main | — | `string` |
| `add-custom-slot` | Renderer → Main | `CustomSlot` | `boolean` |
| `remove-custom-slot` | Renderer → Main | `index: number` | `boolean` |
| `update-custom-slot` | Renderer → Main | `{ index: number, slot: CustomSlot }` | `boolean` |
| `open-external` | Renderer → Main | `url: string` | `void` |
| `ecosystem-read-events` | Renderer → Main | — | `EcosystemEvent[]` |
| `ecosystem-emit` | Renderer → Main | `appName, eventType, data` | `void` |

### Send channels (push from main)

| Channel | When fired | Payload |
|---------|-----------|---------|
| `config-update` | Every config poll tick | `CyberToolsConfig` |
| `vpn-update` | Every 30s VPN check | `VpnStatus` |
| `update-available` | Update checker finds newer version | `UpdateInfo` |
| `splash-complete` | 1.5s after panel `ready-to-show` | — |
| `panel-shown` | `showPanel()` called | — |
| `open-settings` | Settings selected from tray menu | — |
| `ecosystem-events-updated` | `fs.watch` callback fires on bus file | `EcosystemEvent[]` |

### One-way sends (renderer → main)

| Channel | When | Method |
|---------|------|--------|
| `hide-after-splash` | SplashScreen wants to dismiss panel | `ipcRenderer.send` |

---

## 8. Inter-App Communication

The launcher communicates with other CYBERTOOLS apps entirely through **files on disk**. There is no socket, no named pipe, no WebSocket, and no Electron IPC across processes.

### Config file as shared state (`~/cybertools-config.json`)

This is the primary communication channel. It acts as:

- **State board**: other apps write their status into named keys. The launcher reads and renders them.
- **Command channel**: the launcher writes trigger objects that other apps act on.
- **Registry**: apps write their `execPath` and `installed` flags on first launch so the launcher can find and start them.

The file is read and written by both sides. The `.tmp` rename pattern in `config.ts` ensures that readers never see a partial write.

#### Keys written by other apps (read by launcher)

```
cyberlab.installed          boolean — CyberLab has registered
cyberlab.execPath           string  — path to CyberLab
cyberlab_status             object  — heartbeat from CyberLab (every ~10s)
  .sessionActive            boolean
  .currentLab               string | null
  .sessionStart             ISO string
  .sessionTime              string
  .hintLevel                number | null
  .streak                   number
  .labsDone                 number
  .findingsCount            number
  .lastActive               ISO string

vaultscraper.installed      boolean
vaultscraper.execPath       string
vaultscraper_status         object  — heartbeat from VaultCore
  .activeScrape             { name: string, progress: number } | null
  .lastScrape               ISO string | null
  .nextScheduled            ISO string | null
  .vaultNoteCount           number
  .totalSources             number
  .lastScrapeNew            number
  .lastScrapeUpdated        number
  .lastActive               ISO string | null
  .error                    string | undefined

ghostvault.execPath         string — written by GhostVault on first launch
```

#### Keys written by launcher (read by other apps)

```
theme                       string  — core theme name, broadcast to all apps
personalityTheme            string  — personality theme name
obsidianVaultPath           string  — shared vault path
vaultscraper_trigger        object  — command to VaultCore
  .action                   "update_now"
  .timestamp                ISO string
launcher.customSlots        CustomSlot[]
launcher.activityFeed       ActivityEntry[]
```

### Ecosystem event bus (`~/Library/Application Support/CyberTools/ecosystem-events.json`)

All apps (including the launcher itself) append events to this file. The launcher is the only app that actively **watches** the file. It reads the full event array whenever the file changes and pushes it to its renderer.

Each event object:
```json
{
  "id":        "1748000000000-abc12",
  "appName":   "CyberLab",
  "eventType": "cyberlab.session.started",
  "data":      { "lab": "Lame" },
  "timestamp": "2026-06-01T10:00:00.000Z"
}
```

The file is capped at 150 events (oldest dropped). The `ecosystem-bus.js` file in the project root is a CommonJS version of the same module — it exists for other apps that are not yet using the TypeScript build pipeline and need to `require()` the bus.

---

## 9. Data Layer

### `~/cybertools-config.json`

The central shared config. Created by the launcher on first run if absent. Default shape:

```json
{
  "obsidianVaultPath": "",
  "theme": "stealth",
  "personalityTheme": "neutral",
  "cyberlab": { "installed": false, "execPath": "" },
  "cyberlab_status": null,
  "vaultscraper": { "installed": false, "execPath": "" },
  "vaultscraper_status": null,
  "vaultscraper_trigger": null,
  "ghostvault": { "name": "GhostVault", "execPath": "" },
  "ghostvault_status": null,
  "launcher": {
    "customSlots": [],
    "activityFeed": [],
    "updateUrl": ""
  }
}
```

Written with `.tmp` rename to prevent corruption. On read, `mergeWithDefaults` ensures all keys are present even if the file is partial (from an older version or another app).

Activity feed is capped at 50 entries. Entries have the shape:

```typescript
{
  type: 'cyberlab' | 'vaultscraper' | 'ghostvault' | 'launcher' | 'error';
  text: string;
  timestamp: string; // ISO 8601
}
```

### `~/Library/Application Support/CyberTools/ecosystem-events.json`

Ecosystem event bus. Managed entirely by `ecosystem-bus.ts`. Not read into `cybertools-config.json` — it is a separate file. Directory and file are created on first access if absent.

### `assets/tray-icon.png`

Optional. If present at that path relative to the app bundle, used as the tray icon. If absent, a fallback 32×32 PNG is generated in memory at startup.

### `out/` directory

Build artifacts from `electron-vite build`. The `package.json` `main` field points to `out/main/index.js`. The preload is `out/preload/preload.cjs` (CommonJS format required for Electron preload scripts).

---

## 10. Use Cases

### Use case 1: Morning startup

User starts their computer. The CYBERTOOLS Launcher opens automatically (if configured as a login item) or is double-clicked. The 1.5-second splash screen displays. The panel hides to the menu bar. VPN status is checked immediately — the header shows "VPN OFF" in red.

The config is polled. Both CyberLab and VaultCore have their `execPath` set and have written recent `lastActive` timestamps. The stats strip shows yesterday's streak (3d), labs done (12), note count (847), and sources (5). VaultCore's next scheduled scrape is in 2h.

The update checker fires 4 seconds after startup and finds no newer version. No banner appears.

### Use case 2: One-click VaultCore trigger

It is 10am. The user wants to pull in some new articles without opening VaultCore. They click the tray icon. The panel opens. On the VaultCore card they see "Last scrape: 6h ago". They click the `↻` button.

The renderer calls `window.api.updateNow()`. The main process writes `vaultscraper_trigger: { action: "update_now", timestamp: "..." }` to the config. An activity entry "VaultCore update triggered" is added. The panel immediately reflects this in the activity feed.

VaultCore polls the config within 5 seconds, sees the trigger, starts scraping, clears the trigger key, and begins writing `activeScrape` status. On the next launcher poll (up to 5 seconds), the VaultCore card updates to show "Scraping: [source] · 0%". When the scrape completes, VaultCore clears `activeScrape`. The launcher's notification differ fires: "VaultCore: [source] complete — 14 new, 3 updated" appears as a native notification. Clicking it opens VaultCore.

### Use case 3: CyberLab session monitoring

The user is working on an HTB machine. CyberLab Companion is open and writing to the config every 10 seconds. In the launcher, the CyberLab card shows a green pulsing dot: "Active: Lame · 47m 32s". The stats strip shows flags: 2.

The user captures a third flag. CyberLab increments `findingsCount` to 3 in the config. The launcher's notification differ detects the increase and fires: "CyberLab: Flag captured on Lame". The stats strip updates to flags: 3 on the next 5-second poll.

### Use case 4: Pinning a custom app

The user wants quick access to Burp Suite. They click the tray icon, scroll to the empty custom slots area, and click "+ Pin an app". The `CustomSlotModal` opens.

They type "Burp Suite" in the Name field, click the `…` path picker, navigate to `/Applications/Burp Suite Community Edition.app`, and type `🕷` as the icon emoji. They click Add.

`window.api.addCustomSlot(slot)` is called. The main process `updateConfig` pushes the new slot into `config.launcher.customSlots`. The renderer refreshes the config. The `CustomSlotsGrid` now shows a Burp Suite tile with the spider emoji. Clicking Open spawns it via `open /Applications/Burp Suite Community Edition.app`.

### Use case 5: Theme switch across the ecosystem

The user is working a late-night session and wants the OLED theme with Terminal personality. They click the settings gear, select the Theme tab. They click "oled" and then "T" (terminal personality). Each click calls `onSave({ theme: 'oled' })` and `onSave({ personalityTheme: 'terminal' })`.

The main process writes the updated theme values to `~/cybertools-config.json`. `App.tsx` receives the config update via `config-update` IPC and sets `data-core="oled"` and `data-personality="terminal"` on `<body>`. The CSS variables shift immediately: black backgrounds, `--accent: #33ff66`, green text. All cards, chips, and the stats strip gradient update in the same frame.

CyberLab and VaultCore, on their next 5-second config poll, also read `theme: "oled"` and `personalityTheme: "terminal"` and apply the same switch in their own UIs.

### Use case 6: New app registers itself

GhostVault is launched for the first time. It writes its `execPath` into `~/cybertools-config.json` under `ghostvault.execPath`. The launcher's next 5-second poll reads this. `checkNotifications` sees that `prev.ghostvault.execPath` was empty and `curr.ghostvault.execPath` is now set. A native notification fires: "GhostVault connected to launcher". The GhostVault card's status dot changes from grey ("Not configured") to blue ("Ready"). The Open button becomes active.

---

## 11. Entry Points and Build

### Development

```bash
npm install
npm run dev        # electron-vite dev (hot-reload for renderer, restarts main on change)
```

Or with the convenience script:

```bash
./start.sh         # installs deps if needed, then runs: npx electron .
```

In `development` mode (`NODE_ENV === 'development'`), the panel window loads `http://localhost:5173` (Vite dev server). DevTools are enabled. In production, it loads `out/renderer/index.html` from disk.

### Build

```bash
npm run build      # electron-vite build only (outputs to out/)
npm run package    # electron-vite build + electron-builder (outputs to dist/)
```

Platform-specific packaging:

```bash
npm run package:mac    # → dist/mac-arm64/ + .dmg (x64 + arm64)
npm run package:win    # → .exe NSIS installer
npm run package:linux  # → .AppImage + .deb
```

### Startup sequence (runtime)

1. `app.requestSingleInstanceLock()` — quit if another instance exists.
2. `app.dock.hide()` (macOS).
3. `app.whenReady()`:
   a. Auto-detect app paths from `~/Documents/Claude/Projects`.
   b. `setupTray()` — creates `Tray`, sets tooltip, registers click handlers, builds context menu.
   c. `createPanelWindow()` — creates hidden `BrowserWindow` with preload, registers `blur` handler.
   d. `setupIPC()` — registers all `ipcMain.handle` and `ipcMain.on` listeners.
   e. Start `configPollTimer` (5s interval).
   f. `pollConfig()` once immediately.
   g. `startVpnCheck()` — initial VPN detect + 30s interval.
   h. `ecosystemBus.emitEvent('Launcher', 'launcher.opened', {})`.
   i. `ecosystemBus.watchEvents(callback)` — starts `fs.watch` on bus file.
   j. `panelWindow.once('ready-to-show', ...)` — show panel, send `splash-complete` after 1.5s.
   k. `setTimeout(checkForUpdates, 4000)`.

4. `app.on('window-all-closed', e => e.preventDefault())` — keeps the app alive even when all windows close.
5. `app.on('before-quit', ...)` — clears both polling timers.

### Renderer startup sequence

1. `src/renderer/main.tsx` renders `<App />` into `#root`.
2. `App.tsx` `useEffect` runs on mount:
   a. Parallel: `getConfig()`, `getVpnStatus()`, `getVersion()` → stored in Zustand.
   b. Registers all `on*` listeners (config, vpn, updateAvailable, ecosystemUpdated, splashComplete, openSettings, panelShown).
3. `SplashScreen` visible while `showSplash === true`.
4. Main sends `splash-complete` → `showSplash` set to false → Framer Motion exit animation (500ms).
5. `splashDone` set true → main content renders.
6. Theme attributes applied to `<body>` from `config.theme` and `config.personalityTheme`.

### Output structure

```
out/
├── main/
│   └── index.js          # Bundled main process (ESM)
├── preload/
│   └── preload.cjs       # Bundled preload (CommonJS — required by Electron)
└── renderer/
    ├── index.html
    └── assets/
        ├── index-[hash].js
        └── index-[hash].css
```

`package.json` `"main": "out/main/index.js"` and `electron-builder` `files: ["out/**/*", "assets/**/*"]` ensure only these output directories are included in the packaged app.

---

*ItsEliias // CYBERTOOLS Launcher v1.0.0*
