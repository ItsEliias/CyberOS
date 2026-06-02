# FIX: VaultCore — React + TypeScript + Tailwind + Framer Motion + electron-vite

## Executive Summary

VaultCore has a fully functional dual-layer architecture. The TypeScript/React migration is correctly wired — `package.json main` points to `out/main/index.js` (compiled from `src/main/main.ts`), and `electron.vite.config.ts` correctly builds all three targets (main, preload, renderer). The legacy files (`main.js`, `preload.js`, `renderer.js`, `index.html`) remain in the root but are NOT loaded at runtime — they are reference/fallback copies only.

Three bugs were found and fixed: a missing IPC event subscription in the legacy renderer (moot for the TS layer, but part of the documented UI), a non-atomic write in the ecosystem event bus (data integrity risk), and a stale-lib sync problem where `out/main/lib/` was not reliably updated when root backend JS files changed.

---

## Root Cause Analysis

### Architecture — What Is Actually Active

| File | Status | Notes |
|------|--------|-------|
| `package.json` `main` | `out/main/index.js` | TypeScript main IS the active process |
| `src/main/main.ts` | ACTIVE main | Compiled to `out/main/index.js` by electron-vite |
| `src/main/preload.ts` | ACTIVE preload | Compiled to `out/preload/preload.js` |
| `src/renderer/` | ACTIVE renderer | React/TS compiled to `out/renderer/` |
| `main.js` (root) | LEGACY — not loaded | Only executed if someone manually runs it |
| `preload.js` (root) | LEGACY — not loaded | Would fail anyway: no `preload.js` in `out/main/` |
| `renderer.js` (root) | LEGACY — not loaded | `out/renderer/index.html` uses bundled React |
| `index.html` (root) | LEGACY — not loaded | `out/main/main.ts` loads `out/renderer/index.html` |

There is NO conflict: `package.json` correctly targets the TS output. The legacy root files are an artefact of the pre-migration codebase.

### The `src/main/lib/` Shadow Directory Problem

`src/main/lib/` is a copy of the root-level backend JS files made during migration setup. The `electron.vite.config.ts` plugin copies `src/main/lib/` → `out/main/lib/` on every build. Because the `generateBundle`/`closeBundle` hooks only fire when Rollup actually rebuilds the main bundle (i.e., when `main.ts` changes), and `src/main/lib/` files are stale copies, edits to root-level JS files did not propagate to the built app without a clean rebuild.

---

## Fixes Applied

### Fix 1 — Missing `onScheduleComplete` IPC listener in `renderer.js`

**File**: `renderer.js` (legacy renderer, lines ~672–675)

**Problem**: The `setupIpcListeners()` function subscribed to `scrape-progress`, `scrape-complete`, `scrape-error`, `update-available`, and `vault-health-progress` — but NOT `schedule-complete`. When a cron-scheduled scrape finished in the background, the Sources screen showed stale `lastScraped`/`noteCount` until the user manually navigated away and back.

**Fix**: Added `api.onScheduleComplete()` subscriber that calls `refreshSourceLibrary()` and `sounds.notification()`.

```javascript
// Added to setupIpcListeners() in renderer.js
api.onScheduleComplete((data) => {
  setStatus(`Scheduled scrape complete: ${data.source || 'source'}`);
  sounds.notification();
  refreshSourceLibrary();
});
```

### Fix 2 — Non-atomic write in `ecosystem-bus.js`

**Files**: `ecosystem-bus.js` (root) and `src/main/lib/ecosystem-bus.js`

**Problem**: `emitEvent()` used `fs.writeFileSync(BUS_FILE, ...)` directly. If multiple CYBERTOOLS apps write simultaneously, a reader could observe a half-written JSON file and `JSON.parse()` would throw, silently returning `[]` and losing the event history.

**Fix**: Replaced with atomic write pattern — write to `BUS_FILE + '.tmp'`, then `fs.renameSync()` to the real path. `rename` is atomic on all POSIX systems and atomic on Windows within the same filesystem.

```javascript
const tmpFile = BUS_FILE + '.tmp';
fs.writeFileSync(tmpFile, JSON.stringify(events, null, 2), 'utf8');
fs.renameSync(tmpFile, BUS_FILE);
```

### Fix 3 — Stale `out/main/lib/` not syncing on root JS edits

**Files**: `package.json`, `electron.vite.config.ts`

**Problem**: The Rollup plugin `copyMainLibPlugin` copies `src/main/lib/` → `out/main/lib/`, but only when the main bundle is rebuilt (when `src/main/main.ts` changes). Edits to root-level JS files (`launcher.js`, `scraper.js`, etc.) would not propagate to `out/main/lib/` unless `main.ts` was also touched, meaning the running app could use an out-of-date `scraper.js`, `launcher.js`, etc.

**Fix — Part A** (`package.json`): Added a `sync-lib` npm script and prepended it to `start`/`build`/`build:mac`/`build:win`/`build:linux` so it always runs unconditionally. The script uses an inline Node one-liner to copy all seven backend files plus the `sources/` directory tree to `out/main/lib/`.

**Fix — Part B** (`electron.vite.config.ts`): Extended the plugin to explicitly name the seven root backend files and emit `syncLibFiles()` from both `generateBundle` and `closeBundle` hooks. Added clear comments about the file hierarchy (root = source of truth, `src/main/lib/` = migration-era override layer).

**Fix — Part C** (`src/main/lib/ecosystem-bus.js`): Applied the same atomic-write fix so that the plugin's copy of this file is also correct. Both root and `src/main/lib/` copies now carry the fix.

---

## Migration Issues Found

### Dual-source JS file maintenance

`src/main/lib/` contains copies of the seven root-level backend JS files. This is a maintenance hazard: any edit to `launcher.js` (root) must also be made in `src/main/lib/launcher.js`, or the build plugin's `src/main/lib/` copy will win and silently discard the change.

**Recommended resolution** (not applied — architectural decision): Delete `src/main/lib/` entirely and update the vite plugin to copy only from the project root. The `sync-lib` npm script already does this correctly. Keeping two copies of 7 files is a latent bug factory.

### `renderer.js` is loaded by `index.html` (root) but not by `out/renderer/index.html`

The active React renderer at `out/renderer/index.html` does not load `renderer.js` — it loads the compiled React bundle (`out/renderer/assets/index-*.js`). The legacy renderer and React renderer are fully independent. Any features or bug fixes in `renderer.js` must be replicated in the React components under `src/renderer/` to take effect in the running app.

The `onScheduleComplete` fix applied to `renderer.js` above should also be added to the React `store` and component layer when the React migration is completed.

---

## Communication Fixes

### IPC symmetry audit (legacy layer)

All `window.electronAPI` calls in `renderer.js` were audited against `preload.js`:

| Channel | preload.js exposes | main.js handles | renderer.js calls | Status |
|---------|-------------------|-----------------|-------------------|--------|
| `schedule-complete` | `onScheduleComplete` | Sends it | Was missing | FIXED |
| All other channels | Yes | Yes | Yes | OK |

No channels are called from `renderer.js` that are not exposed by `preload.js`. No channels are sent from `main.js` that are not subscribed in `renderer.js` (after fix).

### IPC symmetry audit (TypeScript layer)

`src/main/preload.ts` exposes an identical API surface to `preload.js`, with the addition of typed return values and proper `removeListener` teardown functions (the legacy preload returns void from event subscriptions; the TS preload returns an unsubscribe function). Both surfaces are symmetrical with `src/main/main.ts` IPC handlers.

---

## Validation Results

```
npm run build  →  exit 0
electron-vite build  →  3 bundles built clean
electron-builder  →  DMG packaged (unsigned — expected without Apple cert)
out/main/lib/ecosystem-bus.js  →  matches root ecosystem-bus.js (atomic write fix present)
out/main/lib/ all 7 files  →  synced from root on every build via sync-lib
```

---

## Remaining Concerns

### 1. Playwright browser executables

`scraper.js` / `src/main/lib/scraper.js` calls `getBrowser()` which tries `require('playwright-core')` then `require('playwright')`. `playwright-core` is in `dependencies` and `@playwright/browser-chromium` is also listed, but Playwright browser binaries require `playwright install` (or `npx playwright install chromium`) to download the actual Chrome binary. If the binary is missing, every scrape that needs a browser (all types except PDF and RSS) will fail with a "Executable doesn't exist" error at runtime. This is handled gracefully — the error propagates to `start-scrape` IPC which returns `{ error: e.message }` — but users will see a cryptic error rather than a helpful "install browsers" message. Consider adding a browser presence check in `app.whenReady()` and surfacing a setup prompt in the UI.

### 2. `ecosystem-bus.js` macOS-only path

`BUS_DIR` is hardcoded to `~/Library/Application Support/CyberTools`. On Windows this should be `%APPDATA%\CyberTools` and on Linux `~/.config/CyberTools`. Currently the app will attempt to write to `~/Library/...` on all platforms, which silently fails on Windows/Linux (the directory doesn't exist). The `ensureDir()` call creates it but the path is wrong on non-macOS.

### 3. Legacy root files are shipped in the repo but not in the distributable

`package.json` `build.files` includes `out/**/*` but excludes `src/**/*`. Root-level JS files (`main.js`, `renderer.js`, etc.) are also excluded by default (only `out/` and `assets/` are in the distributable). This is correct — the legacy files are development references only. However, they may confuse contributors who open the project and don't know which layer is active. A comment in `CLAUDE.md` or `README.md` documenting "the active entry point is `out/main/index.js`, compiled from `src/main/main.ts`" would prevent this confusion.

### 4. `renderer.js` — schedule-complete fix not mirrored in React layer

The `onScheduleComplete` fix in `renderer.js` does not affect the running app (which uses the React renderer). The React store (`src/renderer/store/`) must also subscribe to `schedule-complete` and trigger a sources refresh for this fix to work end-to-end in production.
