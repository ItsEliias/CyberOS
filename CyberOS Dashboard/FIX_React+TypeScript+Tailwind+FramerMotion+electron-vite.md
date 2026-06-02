# FIX: CyberOS Dashboard — React + TypeScript + Tailwind + Framer Motion + electron-vite

## Executive Summary

The JS → React + TypeScript + Tailwind + Framer Motion + electron-vite migration was executed cleanly: the build produces a valid DMG, TypeScript compiles without errors, and the IPC architecture is structurally sound. One genuine runtime bug was found and fixed — the preload's IPC listener unsubscribe functions used `removeAllListeners()` instead of `removeListener()`, which would silently destroy all live-update subscriptions whenever any component that uses them unmounted (including during React StrictMode's double-invoke in dev). All other checklist items audited clean.

---

## Root Cause Analysis

### Bug: Overly Aggressive IPC Listener Teardown
- **Cause**: `ipcRenderer.removeAllListeners(channel)` removes every listener bound to a channel, not just the one registered by a specific callback instance.
- **Impact**: In React development mode (StrictMode), effects are intentionally invoked twice to surface side effects. On the first unmount, `removeAllListeners('ecosystem:update')` and `removeAllListeners('ecosystem:events')` would strip all listeners. The second mount would re-register, but any other component or future subscription to those channels would be silently dropped.
- **Symptoms**: Live config/event pushes from the main process (the 5-second poll and file-watch callbacks) would stop arriving at the renderer after the first StrictMode cleanup cycle in dev. In production this would only surface on component remounts, but it is still incorrect behavior.

---

## Fixes Applied

### Fix 1 — Precise IPC listener teardown in preload

**File**: `src/main/preload.ts`

**Problem**: Both `onStateUpdate` and `onEventsUpdate` returned teardown functions that called `ipcRenderer.removeAllListeners(channel)`. This is incorrect — it removes all registered handlers for the channel, not just the one registered by this call.

**Solution**: Capture the specific listener function as a named constant and pass it to `ipcRenderer.removeListener(channel, listener)` so only that exact callback is removed.

```ts
// Before
onStateUpdate: (cb) => {
  ipcRenderer.on('ecosystem:update', (_e, cfg) => cb(cfg))
  return () => ipcRenderer.removeAllListeners('ecosystem:update')
},

// After
onStateUpdate: (cb) => {
  const listener = (_e: Electron.IpcRendererEvent, cfg: EcosystemConfig) => cb(cfg)
  ipcRenderer.on('ecosystem:update', listener)
  return () => ipcRenderer.removeListener('ecosystem:update', listener)
},
```

Same pattern applied to `onEventsUpdate`.

**Why**: `removeAllListeners` is a process-wide nuclear option for a channel. `removeListener` is the correct scoped teardown for a single subscription, matching the semantics the React `useEffect` cleanup expects.

---

## Migration Issues Found

The following items were audited as part of the migration review. All were found to be correctly implemented — listed here for completeness and evidence.

### 1. Window Loading (Dev vs Prod) — CLEAN
`main.ts` uses `process.env['ELECTRON_RENDERER_URL']` (electron-vite's injected dev-server URL) for dev, and `loadFile(path.join(__dirname, '../renderer/index.html'))` for prod. This is the correct electron-vite pattern. The old `MAIN_WINDOW_VITE_DEV_SERVER_URL` (electron-forge constant) is not present anywhere — no regression.

### 2. Preload Path — CLEAN
`main.ts` references `path.join(__dirname, '../preload/preload.js')`. At runtime, `__dirname` is `out/main/`. The electron-vite config declares the preload input as `src/main/preload.ts` with output key `preload`, which electron-vite emits to `out/preload/preload.js`. Resolving `out/main/../preload/preload.js` = `out/preload/preload.js`. Correct.

### 3. IPC Channel Audit — CLEAN (one naming note below)

| Renderer call | Channel | Main handler |
|---|---|---|
| `window.electronAPI.getState()` | `ecosystem:state` | `ipcMain.handle('ecosystem:state', ...)` ✓ |
| `window.electronAPI.getEvents()` | `ecosystem:events` | `ipcMain.handle('ecosystem:events', ...)` ✓ |
| `window.electronAPI.getVersion()` | `app:version` | `ipcMain.handle('app:version', ...)` ✓ |
| `window.electronAPI.launchApp(path)` | `app:launch` | `ipcMain.handle('app:launch', ...)` ✓ |
| `window.electronAPI.openUrl(url)` | `shell:open` | `ipcMain.handle('shell:open', ...)` ✓ |
| `window.electronAPI.onStateUpdate(cb)` | `ecosystem:update` | `push('ecosystem:update', ...)` via `webContents.send` ✓ |
| `window.electronAPI.onEventsUpdate(cb)` | `ecosystem:events` | `push('ecosystem:events', ...)` via `webContents.send` ✓ |

No missing handlers. No orphaned handlers.

**Note on `ecosystem:events` dual use**: The channel name `ecosystem:events` is used both as an `ipcMain.handle` (invoke) channel and as a `webContents.send` (push) channel. In Electron, `ipcRenderer.invoke` and `ipcRenderer.on` operate on distinct internal mechanisms — invoke uses a request/response envelope with a generated reply channel, while `on` listens only to raw `webContents.send` pushes. They do not interfere. The naming is not ideal for readability but causes no runtime conflict.

### 4. Preload → Renderer API Surface — CLEAN
The `env.d.ts` type declaration for `window.electronAPI` and the actual `contextBridge.exposeInMainWorld('electronAPI', {...})` in `preload.ts` match exactly across all 7 exposed methods. The renderer (`App.tsx`, `AppCard.tsx`) only calls methods that exist in the exposed surface.

### 5. `execPath` values — CLEAN WITH DESIGN NOTE
`GhostVault` and `ReconDesk` cards have `execPath: undefined` hardcoded in `App.tsx`. There is no `ghostvault` or `recondesk` `AppRegistration` key in `EcosystemConfig`, so there is no config-driven `execPath` for these apps. The `AppCard` component correctly guards the launch button behind `{execPath && ...}`, so no button renders and no `launchApp` call is made. This is intentional design — these apps are not user-launchable from the dashboard. If launch support is added later, `EcosystemConfig` and `App.tsx` will need to be updated together.

`VaultCore` uses `cfg.vaultscraper?.execPath` and `CyberLab` uses `cfg.cyberlab?.execPath` — both driven from the config file. If these keys are absent in `~/cybertools-config.json`, the button simply won't appear. No crash.

### 6. Ecosystem Bus — CLEAN
- `BUS_DIR` uses `os.homedir()` + `path.join()`, not a raw `~` string. Safe on all platforms.
- `watchEvents()` calls `ensureDir()` and then writes an empty `[]` to `BUS_FILE` before calling `fs.watch()` if the file doesn't exist. No watch-on-missing-file crash.
- `CYBERTOOLS_CONFIG` in `main.ts` similarly uses `os.homedir()` via `path.join`. Safe.

### 7. React Component Null Safety — CLEAN
All data access in `App.tsx` uses optional chaining (`cfg.cyberlab_status?.active`) with nullish coalescing fallbacks (`?? false`, `?? '—'`). `AppCard` guards `lastActive` before passing it to `timeAgo`. `ActivityFeed`'s `EventRow` uses `event.data && Object.keys(event.data).length > 0` before rendering data keys. No unguarded property access on potentially undefined objects.

### 8. Tailwind `content` Array — CLEAN
`tailwind.config.js` sets `content: ['./src/renderer/**/*.{js,ts,jsx,tsx}']`. All component files live under `src/renderer/components/`, `src/renderer/App.tsx`, `src/renderer/main.tsx`, and `src/renderer/store/`. All are covered by this glob. No Tailwind classes will be purged incorrectly.

### 9. CSP — FUNCTIONAL WITH NOTE
The CSP in `index.html` allows `'self'` for scripts (correct for the bundled renderer) and explicitly allows `https://fonts.googleapis.com` / `https://fonts.gstatic.com` for the Inter font. In production (packaged Electron), pages run from `file://` origin and can make network requests to the allowed hosts if the CSP permits them explicitly — which it does. In offline use, the font will silently fall back to `SF Pro Display` / `system-ui` as declared in the Tailwind font stack. This is acceptable behavior.

---

## Communication Fixes

### IPC Channels
The full IPC surface was audited above. All channels are matched. The `removeListener` fix (Fix 1) is the only communication layer change applied.

### Ecosystem Bus
The bus correctly uses `os.homedir()` + platform-appropriate paths (`Library/Application Support/CyberTools` on macOS). The debounced `fs.watch` ensures the renderer is not flooded with updates on rapid file writes. No changes needed.

---

## Validation Results

### Build
```
npm run build
# → electron-vite build: clean
# → electron-builder: DMG produced for x64 and arm64
# Exit code: 0
```

### TypeScript
```
npm run typecheck
# → tsc --noEmit
# Exit code: 0 (no errors)
```

### IPC Audit
- 5 invoke channels: all matched main↔renderer
- 2 push channels: all matched main→preload→renderer
- 0 mismatches found

### Listener Teardown
- Before fix: `removeAllListeners` — would destroy all channel subscriptions on any unmount
- After fix: `removeListener` with captured reference — scoped correctly to individual subscription

---

## Remaining Concerns

### 1. GhostVault / ReconDesk — No `execPath` in config schema
Neither `GhostVaultStatus` nor `ReconDeskStatus` in `types.ts` includes an `execPath` field, and there are no corresponding `AppRegistration` entries in `EcosystemConfig`. If these apps are ever to be user-launchable from the dashboard, `EcosystemConfig` needs `ghostvault?: AppRegistration` and `recondesk?: AppRegistration`, and `App.tsx`'s `buildCards` needs to read from them (currently hardcodes `execPath: undefined`).

### 2. React StrictMode + `useEffect` deps
`App.tsx`'s `useEffect` lists `[setConfig, setEvents, setVersion]` as dependencies. Zustand store actions are stable references (do not change between renders), so this is safe. But if the store were ever migrated to a pattern where setters are recreated, it would cause infinite re-subscription loops. Low risk with Zustand but worth noting.

### 3. No code signing
The build warns about missing "Developer ID Application" identity. The DMG is unsigned. On macOS, users will need to right-click → Open the first time (Gatekeeper quarantine). This is expected for internal/development-use tools but should be addressed before any wider distribution.

### 4. `ecosystem:events` channel dual-use naming
As noted in the IPC audit, using the same channel name for both `ipcMain.handle` and `webContents.send` push works correctly in Electron but is confusing. Consider renaming the push channel to `ecosystem:events:push` and the pull handle to `ecosystem:events:get` in a future cleanup to make the data flow self-documenting.

### 5. Google Fonts in packaged app
The Inter font is loaded from `fonts.googleapis.com`. In offline or restricted-network environments, the font load will fail silently and fall back to system fonts. Consider embedding Inter as a local asset (`/assets/fonts/`) and serving it via `file://` to guarantee consistent typography and avoid the external network dependency in a desktop app.
