# FIX: ReconDesk — React + TypeScript + Tailwind + Framer Motion + electron-vite

## Executive Summary

Two runtime bugs were found and fixed. The most critical was a preload script path failure that would have made `window.electronAPI` permanently undefined at runtime — every IPC call (load data, save data, get version) would throw. The second was a CSP configuration that blocked Vite's HMR WebSocket in dev and left `connect-src` unspecified, silently killing Google Fonts loading and any future renderer-side network calls. Everything else — data paths, directory creation, IPC channel names, Zustand store, component null-guards, ecosystem-bus paths — is correct.

---

## Root Cause Analysis

### Bug 1 — Preload script not found at runtime (CRITICAL)

**File**: `package.json`

`package.json` contained `"type": "module"`. When Node's module system sees this, it treats the package as ESM. electron-vite's bundler respects this flag and outputs preload and main bundles as `.mjs` files instead of `.js`.

`main.ts` hardcodes the preload path as:
```js
path.join(__dirname, '../preload/preload.js')
```

At runtime this resolves to `out/preload/preload.js`, but the file on disk was `out/preload/preload.mjs`. Electron's `BrowserWindow` silently accepts an invalid preload path; the preload script simply never runs. Result: `window.electronAPI` is never defined. Every call in the renderer (`loadData`, `saveData`, `getVersion`, `openUrl`) throws `TypeError: Cannot read properties of undefined`.

**Fix**: Removed `"type": "module"` from `package.json`. electron-vite does not require it — it handles its own ESM/CJS bundling for each target (main, preload, renderer) internally. Without the flag, electron-vite outputs `out/preload/preload.js` and `out/main/main.js`, matching the hardcoded path.

### Bug 2 — Content Security Policy: missing connect-src and img-src

**File**: `src/renderer/index.html`

The original CSP was:
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com
```

Three gaps:

1. **`connect-src` not listed** — falls back to `default-src 'self'`, which blocks all non-same-origin connections. This silently prevents the Google Fonts CSS fetch (`fonts.googleapis.com`) from completing even though `style-src` allows it. In dev, Vite's HMR WebSocket (`ws://localhost:*`) is also blocked, breaking hot reload.

2. **`script-src` missing `'unsafe-eval'`** — Vite injects sourcemap-related eval in dev mode. Without this, React Fast Refresh / HMR fails in development.

3. **`img-src` not listed** — defaults to `'self'`, blocking `data:` URIs that Tailwind or any inline SVG icon might produce.

**Fix**: Updated CSP to:
```
default-src 'self';
script-src 'self' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com ws: wss:;
img-src 'self' data:
```

---

## Fixes Applied

| # | File | Change |
|---|------|--------|
| 1 | `package.json` | Removed `"type": "module"` — forces `.js` output from electron-vite, matching `preload.js` path in `main.ts` |
| 2 | `src/renderer/index.html` | Added `'unsafe-eval'` to `script-src`; added explicit `connect-src` covering Google Fonts and WebSocket; added `img-src 'self' data:` |

---

## Migration Issues Found

These were pre-existing issues introduced during the vanilla JS → React/TS migration but were not breaking in isolation:

- **`"type": "module"` in package.json** — this is the source of Bug 1. electron-vite template projects (the canonical migration target) do not set `"type": "module"`. It was likely carried over from a Node-only project or added by mistake.

- **CSP carried from vanilla build** — the original CSP was a simplified stub that worked when there was no HMR or ESM dev server. After migration to Vite, it needed the `connect-src` and `'unsafe-eval'` additions.

---

## Communication Fixes

### IPC channels — CORRECT, no changes needed

| Renderer call | Preload channel | Main handler |
|---|---|---|
| `window.electronAPI.loadData()` | `data:load` | `ipcMain.handle('data:load', ...)` |
| `window.electronAPI.saveData(data)` | `data:save` | `ipcMain.handle('data:save', ...)` |
| `window.electronAPI.getVersion()` | `app:version` | `ipcMain.handle('app:version', ...)` |
| `window.electronAPI.openUrl(url)` | `shell:open` | `ipcMain.handle('shell:open', ...)` |

All four channels are correctly registered end-to-end. The `env.d.ts` `Window` declaration matches the preload's `contextBridge.exposeInMainWorld('electronAPI', ...)` exactly.

### `loadURL` vs `loadFile` — CORRECT

`main.ts` uses `process.env['ELECTRON_RENDERER_URL']` (the electron-vite convention) for dev and `loadFile` for production. This is the correct pattern.

### Data file path — CORRECT

`DATA_FILE` is built with `path.join(os.homedir(), '.recondesk', 'data.json')` — `~` is never used raw. `ensureDataDir()` calls `fs.mkdirSync(dir, { recursive: true })` and is called at the top of both `loadData()` and `saveData()`.

### `fs.watch` on non-existent file — CORRECT

`ecosystem-bus.ts` `watchEvents()` creates the file with `fs.writeFileSync(BUS_FILE, '[]', 'utf8')` before calling `fs.watch`. `main.ts` does not call `watchEvents()`, only `emitEvent()`, which guards all file access with try/catch.

### Ecosystem bus paths — CORRECT

Both `BUS_DIR` (`~/Library/Application Support/CyberTools/`) and `CYBERTOOLS_CONFIG` (`~/cybertools-config.json`) use `os.homedir()`. No raw `~` strings.

### Zustand store — CORRECT, no `persist` middleware

The store uses a manual `persist()` method that calls `window.electronAPI.saveData(...)`. It does not use Zustand's `persist` middleware, so there is no localStorage key or storage adapter to misconfigure. Data round-trips cleanly through IPC.

### Tailwind content glob — CORRECT

`tailwind.config.js` content is `'./src/renderer/**/*.{js,ts,jsx,tsx}'`. All component files (`TargetPanel.tsx`, `AttackBoard.tsx`, `TargetAssets.tsx`, `Header.tsx`, `Footer.tsx`, `App.tsx`, `main.tsx`) live under `src/renderer/`. No classes are generated outside this path.

---

## Validation Results

```
npm run build — EXIT 0

electron-vite build output:
  out/main/main.js          ✓ (was .mjs before fix)
  out/preload/preload.js    ✓ (was .mjs before fix — now matches hardcoded path)
  out/renderer/index.html   ✓
  out/renderer/assets/index-*.css   19.55 kB
  out/renderer/assets/index-*.js   517.96 kB

electron-builder:
  dist/ReconDesk-1.0.0.dmg         ✓ (x64)
  dist/ReconDesk-1.0.0-arm64.dmg   ✓ (arm64)
```

---

## Remaining Concerns

1. **Google Fonts in production (offline environments)**: The app loads Inter from `fonts.googleapis.com` at runtime. In offline/air-gapped contexts (common for CTF / HTB use), fonts will silently fall back to `system-ui`. This is cosmetic only — consider bundling Inter locally in `src/renderer/` and serving it as a static asset to guarantee consistent rendering.

2. **No `assets/icon.icns`**: `electron-builder` logs `"default Electron icon is used"`. The build config references `assets/icon.icns` but no icon file exists. This does not break functionality but the shipped DMG will carry the default Electron icon.

3. **Code signing**: `electron-builder` skips macOS code signing (`no valid Developer ID identity`). Unsigned apps will be quarantined by Gatekeeper and may show scary warnings on first launch. For distribution, a valid Apple Developer ID is needed. For local dev/testing, users must right-click → Open on first launch.

4. **`user-select: none` on `button`**: `globals.css` resets `user-select: none` on the root then adds `user-select: text` to `input, textarea, button, select`. Buttons don't need selectable text — this is harmless but slightly inaccurate. No functional impact.

5. **`react` and `react-dom` in `devDependencies` only**: Both are bundled by electron-vite at build time, so this works correctly. However, if electron-builder's `files` glob ever changes to exclude bundled renderer assets, these would need to move to `dependencies`. Current configuration is safe.
