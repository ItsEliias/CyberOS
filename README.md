# CyberOS

A personal cybersecurity operating system — 13 Electron apps, one shared brain, zero servers.

## Overview

CyberOS is a monorepo of 13 purpose-built Electron desktop applications designed to work as a single cohesive "operating system" for one solo security operator, rather than as 13 unrelated tools. It exists to solve a specific problem: authorised penetration testing, HTB/THM lab work, security-intelligence monitoring, and knowledge management each traditionally live in different, disconnected apps (terminal, notes app, spreadsheet, browser tabs, password manager), forcing the operator to manually copy context — the current target, the active lab, credentials found — between all of them.

CyberOS instead treats the whole desktop as one system. Every app owns exactly one domain (recon, notes, credentials, intelligence, reporting, etc.) and runs independently — any one of them can be closed without breaking the others — but they all read and write a shared local state file and a shared event bus, so context (the active lab, the current target, operator profile, pending credentials) propagates automatically across the suite. There is no backend, no cloud account, and no network sync: everything is local files on the operator's own machine, coordinated by convention rather than by a server.

The design brief that governs every screen (`CYBEROS_DESIGN_BIBLE.md`) is explicit that this is **not** meant to look like a "gamer hacker" cyberpunk tool. The stated aesthetic target is "**Proton meets Obsidian meets Arc Browser** inside a premium cyber operations workspace" — restrained, information-dense, dark, and instrument-like, closer to Raycast/Linear/Grafana than to a green-on-black hacker terminal.

## Key Features

Verified against the current `main` branch source and commit history:

- **13 independent Electron apps**, each with its own `electron-vite` build, that together cover an engagement end-to-end:
  - **Cybertools Launcher** — system-tray hub; launches first-party apps + up to 4 user-defined custom slots, shows live cross-app status (active lab, vault scrape state, note count), native desktop notifications, and an App Manager with All/Installed/Available filtering.
  - **CyberOS Dashboard** — ecosystem-wide control plane: live app status grid, aggregated activity feed, operator profile, one-click launch for any registered app.
  - **CyberLab Companion** — HTB/THM/CTF lab companion with a real LLM-backed chat (calls the Anthropic Messages API directly with a user-supplied API key, entered via an in-app setup wizard — not baked in or read from `.env`): command builder, encoders/decoders, cheatsheets, lab tracking, session write-ups.
  - **ReconDesk** — target and attack-surface tracker: ports, discovered credentials, an attack board, CVSS scoring, network-facing IPC handlers.
  - **GhostVault** — plain-Markdown note capture that points at any folder on disk (Obsidian-compatible, no proprietary format, no cloud sync). Includes a local, fully offline regex/heuristic note-structuring engine (no LLM call) and an opt-in per-note password lock (AES-256-GCM via Node's `crypto`) — the vault itself is unencrypted at rest by default, but individual notes can be locked.
  - **VaultCore** — the vault's data backbone: scheduled web/PDF scraping (via Playwright + Cheerio + Turndown) into the shared vault, vault-health checks, conflict resolution, cron-based scheduling.
  - **SignalBoard** — security-intelligence feed aggregator (RSS/Atom via `fast-xml-parser`) with relevance scoring, CVE lookups, a command palette, and source management.
  - **PlaybookStudio** — build, run, and track step-by-step methodology playbooks (OWASP, Active Directory, CCNA, etc.), authored/stored as YAML (`js-yaml`).
  - **CredVault** — local credential and secret manager with TOTP/2FA code generation (`otpauth`) and a lock-screen gate.
  - **ReportForge** — assembles professional engagement reports from Markdown templates and operator-filled variables.
  - **TerminalLink** — embedded dual-pane terminal (`xterm.js` + `node-pty`) with command logging and session replay.
  - **NetworkMap** — D3-based (`d3` v7) visual network topology mapper with nmap-import-oriented views.
  - **NetLab** — a lighter networking study/lab workspace.
- **Cross-app coordination without a server** — every app reads/writes one shared `~/cybertools-config.json` (per-app status blocks, `shared_context`, `operator_profile`, `credvault_pending`) and appends to a shared, watched `ecosystem-events.json` event bus (capped at 150 events, debounced file-watch).
- **Shared design system** (`design-system/`) — CSS custom-property token layer (surfaces, elevation, borders, severity colors) plus a small shared React component kit (`Panel`, `MetricCard`, `SeverityPill`, `SparklineChart`, `Tabs`, etc.) and a Tailwind preset, so all 13 apps render from the same visual language instead of reimplementing it.
- **Active, incremental hardening** — recent commit history (~500 commits) shows a steady stream of real UX/security fixes across the suite: path-traversal guards on file writes, scheme validation before `shell.openExternal`, atomic writes to the shared config file, clipboard-copy buttons gated on actual write success, and IPC input validation — not just feature work.
- **No secrets required to run — except CyberLab Companion's chat.** No `.env` file, no API keys baked into any app; general configuration comes from OS-standard locations (`NODE_ENV`, platform config/data dirs) and the shared local state files described above. The one exception: CyberLab Companion's chat feature needs the user's own Anthropic API key, entered once through its in-app setup wizard and stored locally — every other app, and the rest of CyberLab Companion, runs with zero configuration.

## Tech Stack

- **Platform:** Electron — version pinned per app: `^28.3.3` (`Cybertools Launcher`, oldest), `^33.0.0` (the other 10 apps), `^42.3.3` (`VaultCore`, `TerminalLink`, newest)
- **Bundler:** `electron-vite` — most apps on `^2.0.0`, `VaultCore`/`TerminalLink` on `^5.0.0`; Vite `^5.0.0` under the hood
- **UI:** React `18.x` on `Cybertools Launcher`, `CyberOS Dashboard`, and `CyberLab Companion`; the other 10 apps on React `^19.2.7`. TypeScript ranges from `^5.0.0` up to `^6.0.3` (`PlaybookStudio`), most apps on `^5.0`–`^5.7`
- **Styling:** Tailwind CSS `^3.x` with a shared token layer and Tailwind preset in `design-system/`
- **State:** Zustand — `^4.5.0` in most apps, `^5.x` in `VaultCore` (`^5.0.14`) and `TerminalLink` (`^5.0.3`)
- **Motion:** Framer Motion `^11.x`
- **Fonts:** `@fontsource/geist-sans`, `@fontsource/jetbrains-mono`
- **Notable per-app libraries:**
  - VaultCore — `playwright-core` / `@playwright/browser-chromium`, `cheerio`, `turndown`, `pdf-parse`, `node-cron`, `cron-parser`
  - TerminalLink — `xterm` + `@xterm/addon-*`, `node-pty`, `@electron/rebuild`
  - NetworkMap — `d3`, `@types/d3`
  - SignalBoard — `fast-xml-parser`
  - CredVault — `otpauth`
  - PlaybookStudio — `js-yaml`
- **Packaging:** `electron-builder` (`^24.x` on `Cybertools Launcher`, `^25.x` on most other apps, `^26.x` on `VaultCore`/`TerminalLink`) — DMG (mac), NSIS (Windows), AppImage (Linux)
- **Backend services:** none. No servers, no databases, no cloud accounts — all persistence is local files (JSON config, Markdown vault, encrypted local blobs for CredVault/GhostVault-adjacent secrets).

## Architecture

Each app is a fully standalone `electron-vite` project (own `package.json`, own `electron.vite.config.ts`, own `src/main` + `src/renderer` split); there is no root build step or shared `node_modules`. What ties the 13 apps together are three plain-file conventions plus a shared design-system package:

```
CyberOS/
├── CYBEROS_DESIGN_BIBLE.md      # governing design/product spec — read this first
├── design-system/               # shared CSS tokens, Tailwind preset, React component kit
│   ├── tokens.css
│   ├── tailwind-preset.cjs
│   └── components/              # Panel, MetricCard, SeverityPill, SparklineChart, Tabs...
├── Cybertools Launcher/         # system-tray hub + app orchestrator
├── CyberOS Dashboard/           # ecosystem control plane / status grid
├── Cyberlab Companion/          # AI lab companion (HTB/THM/CTF)
├── ReconDesk/                   # target & attack-surface tracker
├── GhostVault/                  # Markdown note capture (Obsidian-compatible)
├── VaultCore/                   # scraper + vault health + scheduler
├── SignalBoard/                 # intel feed aggregator
├── PlaybookStudio/              # methodology playbooks
├── CredVault/                   # credential / TOTP manager
├── ReportForge/                 # report generator
├── TerminalLink/                # embedded terminal
├── NetworkMap/                  # network topology mapper
├── NetLab/                      # networking study workspace
├── Cyber-Mockups/               # design mockups used as screenshots
├── docs/                        # build logs, phase/loop status notes
└── install.sh / uninstall.sh    # installs the Launcher only
```

Inside a typical app (e.g. `ReconDesk/src/`):

```
src/
├── main/              # Electron main process — window, IPC handlers, ecosystem-bus.ts
├── renderer/          # React UI — App.tsx, components/, stores/ (Zustand)
└── shared/            # types shared between main and renderer
```

**Coordination flow:**

```
   App A (e.g. ReconDesk)              App B (e.g. TerminalLink)
        │  writes status/context             │  reads status/context
        ▼                                     ▼
   ~/cybertools-config.json  ◄── shared, atomically-written JSON state
        │                                     │
        └───────────────┬─────────────────────┘
                         ▼
              ecosystem-events.json   ◄── append-only event bus, fs.watch + debounce
                         │
                         ▼
              CyberOS Dashboard / Cybertools Launcher
              (aggregate status grid + live activity feed)

   GhostVault / VaultCore / SignalBoard / CyberLab / ReportForge
              all read & write Markdown into one shared Obsidian vault folder
```

Most apps ship their own `ecosystem-bus.{js,ts}` file — a thin wrapper around the same file-based pub/sub pattern (emit/read/watch against `ecosystem-events.json`); TerminalLink and VaultCore inline the same logic directly into `main.ts` / `src/main/lib/` instead of a standalone file. Either way there's no shared runtime dependency, just a shared file-format contract.

## Getting Started

CyberOS has no root build — you work inside whichever app folder you want to run.

1. **Clone the repo:**
   ```bash
   git clone https://github.com/ItsEliias/CyberOS.git
   cd CyberOS
   ```
2. **Pick an app and install its dependencies:**
   ```bash
   cd "ReconDesk"        # or any of the 13 app folders
   npm install
   ```
3. **Environment variables:** none are required for 12 of the 13 apps. They read only OS-standard variables (`NODE_ENV`, `PATH`) and platform config/data directories (`APPDATA`/`LOCALAPPDATA` on Windows, `XDG_CONFIG_HOME`/`XDG_DATA_HOME` on Linux, `~/Library/Application Support` on macOS). There is no `.env` file anywhere in the repo. The one exception is **CyberLab Companion**: its chat feature needs your own Anthropic API key, which you paste into its in-app setup wizard on first launch (stored locally, not an env var) — the rest of that app works without it.
4. **Point the vault-aware apps at an Obsidian vault (optional):** GhostVault, VaultCore, SignalBoard, CyberLab Companion, and ReportForge write Markdown into a shared vault folder you choose from inside the app — any existing or empty directory works.
5. **Run it in development:**
   ```bash
   npm run dev
   ```
6. **Or install just the Launcher** (which can then install/launch the other apps via its App Manager):
   ```bash
   ./install.sh
   ```

## Running It

Commands below are per-app (run from inside e.g. `ReconDesk/`); they come straight from each app's `package.json` and are consistent across the suite (a couple of apps use slightly different script names, noted below):

| Command | What it does |
|---|---|
| `npm run dev` (or `npm start`) | Launches the app via `electron-vite dev` — hot-reloading development mode |
| `npm run build` | Production build via `electron-vite build` (some apps also chain `electron-builder` here) |
| `npm run build:mac` / `build:win` / `build:linux` | Builds and packages a distributable for that platform via `electron-builder` |
| `npm run package` / `package:mac` / `package:win` / `package:linux` | Used in place of `build:*` by a few apps (Launcher, GhostVault, ReportForge, CyberLab Companion) — same effect |
| `npm run typecheck` | Type-checks with `tsc --noEmit`, no emitted output |
| `npm run preview` | Previews a production build (where defined) |

No app currently defines a `test` or `lint` script — there is no automated test suite or linter configured at this time.

Two apps have extra setup steps:
- **VaultCore** runs a `sync-lib` step (copies backend `.js` modules into `out/main/lib/`) automatically before `start`/`build`.
- **TerminalLink** runs `electron-rebuild -f -w node-pty` on `postinstall`/`rebuild` because `node-pty` is a native module that must be rebuilt against Electron's ABI.

> **Build note:** apps using ESM (`"type": "module"` in `package.json`) need `output: { format: 'cjs' }` in the preload's `electron-vite` config plus a `preload.cjs` reference — otherwise `electron-vite` emits `.mjs`, which Electron's sandboxed preload can't load, and the app won't start. Check this first if an app fails to launch.

## Project Structure

| Path | Purpose |
|---|---|
| `CYBEROS_DESIGN_BIBLE.md` | The governing design/product spec (vision, philosophy, color system, component standards, IPC/state-management conventions) — the single source of truth for how any app should look and behave |
| `design-system/` | Shared CSS token layer, Tailwind preset, and a small shared React component kit used across apps |
| `<AppName>/` (13 folders) | One self-contained Electron app each, with its own `package.json`, `electron.vite.config.ts`, and `src/{main,renderer,shared}` |
| `<AppName>/<appname>-docs.md` | Deep internal documentation for that app (present for Launcher, Dashboard, CyberLab Companion, ReconDesk, GhostVault, VaultCore) |
| `<AppName>/src/main/ecosystem-bus.ts` (or `.js`) | That app's implementation of the shared file-based event-bus contract (11 of 13 apps; TerminalLink and VaultCore inline the same logic elsewhere) |
| `Cyber-Mockups/` | High-fidelity design mockups (PNG) used as the current visual reference / screenshots |
| `docs/` | Build logs and phase/loop status notes from prior development passes |
| `install.sh` / `uninstall.sh` | Installs/uninstalls the Launcher app only; other apps are installed via the Launcher's App Manager |
| `.gitignore` | Excludes build output, `node_modules`, and all runtime-generated encrypted artifacts (`vault.enc`, `apikey.enc`, `*.cyberos-backup`, etc.) |
| `LICENSE` | MIT license |

## Status

**Actively developed, pre-1.0 across most of the suite.** ~525 commits from the first app scaffolds (26 May 2026) through the latest commit on `main` (13 Aug 2026). All 13 apps have working `electron-vite` scaffolds and are independently runnable; feature completeness varies by app — `CyberOS Dashboard` is versioned `2.0.0` internally, while the rest are at `1.0.0`. Recent `main`-branch history is dominated by real hardening and UX-correctness fixes (path-traversal guards, atomic config writes, clipboard-copy correctness, scheme validation on external links) rather than large new features, suggesting the suite is in a stabilization phase rather than early prototyping.

A large, not-yet-merged body of `ui/*` branches (one or two per app, e.g. `ui/credvault-shadcn`, `ui/networkmap-polish`) is migrating individual apps to a shared shadcn-based component system — this UI convergence work is in progress but not on `main` yet. There is no automated test suite or linter configured for any app at this time.

## License

Released under the [MIT License](./LICENSE) © 2026 Cody Liddell.
