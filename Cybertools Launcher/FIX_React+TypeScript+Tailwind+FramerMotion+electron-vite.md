# FIX: Cybertools Launcher — React + TypeScript + Tailwind + Framer Motion + electron-vite

## Executive Summary

Six runtime issues were identified and five were fixed. The most critical was a data-shape mismatch between the legacy `ecosystem-bus.js` (writing `app:` / `event:` fields) and the TypeScript `EcosystemEvent` type (expecting `appName` / `eventType`), which would have silently broken the entire Activity Feed for any events written by the legacy file. The second critical issue was that `ecosystem-bus.js` uses CommonJS `require()` in a package with `"type": "module"`, meaning it would throw a `ReferenceError` at runtime if any process tried to `require()` it directly. Additionally, a typo in the auto-detect path would have prevented CyberLab from ever being auto-located, and unhandled `spawn` error events could crash the main process when a configured app binary is missing.

---

## Root Cause Analysis

### 1. Ecosystem bus field name divergence (CRITICAL)
`ecosystem-bus.js` (CommonJS legacy) writes events with shape:
```js
{ id, timestamp, app: appName, event: eventType, data }
```
The TypeScript `EcosystemEvent` interface and `src/main/ecosystem-bus.ts` both use:
```ts
{ id, appName, eventType, data, timestamp }
```
`ActivityFeed.tsx` reads `e.appName` and `e.eventType`. Any event written by the legacy file would render with `undefined` type color and `undefined` event label — silently broken UI, no crash.

### 2. Legacy `ecosystem-bus.js` is un-loadable as CommonJS (CRITICAL)
`package.json` has `"type": "module"`. This makes every `.js` file in the project an ES Module. The legacy `ecosystem-bus.js` uses `require()` which is not available in ES Module scope. Running it directly (or any non-bundled process `require()`-ing it) throws:
```
ReferenceError: require is not defined in ES module scope
```
The TS build is unaffected (bundled by electron-vite), but `main.js` (the legacy CJS entry point) explicitly does `require('./ecosystem-bus')`, which would crash on load.

### 3. `watchEvents` watcher leak on repeated calls
`ecosystem-bus.ts` keeps `fsWatcher` and `watchDebounceTimer` as module-level globals. If `watchEvents` is called more than once (e.g. during dev hot-reload), the previous `FSWatcher` is orphaned — it keeps firing callbacks but its cleanup function is overwritten and can never be called.

### 4. Spawn ENOENT unhandled error event
`launchApp()` calls `spawn(...).unref()` without attaching an `'error'` listener first. If the binary doesn't exist or lacks execute permissions, Node emits an `'error'` event on the child process. With no listener, Node.js converts this to an uncaught exception that crashes the main process. The `try/catch` around `spawn()` does NOT catch async `'error'` events.

### 5. Auto-detect path typo
```js
{ key: 'cyberlab', dir: 'Cyberlab Compaion' }  // missing 'n'
```
The directory is `Cyberlab Companion`. The typo means auto-detection for CyberLab always silently fails on first launch — users have to configure the path manually.

### 6. `main.js` references `./ecosystem-bus` (not `.cjs`)
The legacy `main.js` entry does `require('./ecosystem-bus')`, which after renaming to `.cjs` would break without updating the reference.

---

## Fixes Applied

### Fix 1 — Rename legacy bus to `.cjs` and align field names
**File:** `ecosystem-bus.cjs` (renamed from `ecosystem-bus.js`)

The file is renamed to `.cjs` so it can use `require()` in an ES Module package. The `emitEvent` function's event shape is updated to match `EcosystemEvent`:

```js
// Before
events.unshift({
  id:        `...`,
  timestamp: new Date().toISOString(),
  app:       appName,
  event:     eventType,
  data
});

// After
events.unshift({
  id       : `...`,
  appName,
  eventType,
  data,
  timestamp: new Date().toISOString()
});
```

`watchEvents` is also updated to return a proper cleanup function `() => void` (matching the TS interface contract) instead of returning the raw `FSWatcher`.

### Fix 2 — `main.js` updated to `require('./ecosystem-bus.cjs')`
**File:** `main.js`

```js
// Before
const ecosystemBus = require('./ecosystem-bus');

// After
const ecosystemBus = require('./ecosystem-bus.cjs');
```

### Fix 3 — Watcher leak fixed in `ecosystem-bus.ts`
**File:** `src/main/ecosystem-bus.ts`

Added teardown of any previous watcher at the start of `watchEvents`:
```ts
// Close any previous watcher before starting a new one
if (watchDebounceTimer) { clearTimeout(watchDebounceTimer); watchDebounceTimer = null; }
if (fsWatcher) { fsWatcher.close(); fsWatcher = null; }
```

### Fix 4 — Spawn error events absorbed before `.unref()`
**Files:** `src/main/main.ts`, `main.js`

```ts
// Before
spawn(execPath, args, { detached: true, stdio: 'ignore' }).unref();

// After
const child = spawn(execPath, args, { detached: true, stdio: 'ignore' });
child.on('error', (err) => {
  console.error(`[launch] spawn error for ${execPath}:`, err.message);
});
child.unref();
```
Applied to all three spawn call sites (darwin `.app`, directory dev mode, plain executable) in both `main.ts` and `main.js`.

### Fix 5 — Auto-detect typo corrected
**Files:** `src/main/main.ts`, `main.js`

```js
// Before
{ key: 'cyberlab', dir: 'Cyberlab Compaion' }

// After
{ key: 'cyberlab', dir: 'Cyberlab Companion' }
```

---

## Migration Issues Found

### TS `ecosystem-bus.ts` is what the build actually uses
`main.ts` imports `from './ecosystem-bus.js'` — electron-vite resolves this to `src/main/ecosystem-bus.ts` at build time (the `.js` extension in TS imports is the standard ESM convention). The legacy `ecosystem-bus.js/cjs` is only used by `main.js` (the old legacy CJS entry point that predates the TS rewrite). Both now coexist with aligned schemas.

### `main.js` vs `src/main/main.ts` — dual entry points
There are two parallel main process implementations: the legacy `main.js` (CommonJS) and the modern `src/main/main.ts` (TypeScript, bundled by electron-vite). `package.json` points `"main"` to `"out/main/index.js"` (the compiled TS version). The legacy `main.js` is not wired into the electron-vite build pipeline and is not used in production. It exists as a reference/fallback but should be considered deprecated.

### `ecosystem-bus.js` (original) — still present
The original `ecosystem-bus.js` was **not deleted** to avoid breaking any external Cyber Apps that might reference it by path. It is now superseded by `ecosystem-bus.cjs`. The `.js` version remains broken (cannot `require()`). External apps that use it should be migrated to reference `ecosystem-bus.cjs` or the shared events file path directly.

---

## Communication Fixes

### IPC Symmetry Audit — All channels verified symmetric

| Channel | Preload call | `ipcMain.handle` | Notes |
|---------|-------------|-----------------|-------|
| `get-config` | `api.getConfig()` | `ipcMain.handle('get-config')` | OK |
| `save-config` | `api.saveConfig(updates)` | `ipcMain.handle('save-config')` | OK |
| `save-config-deep` | `api.saveConfigDeep(updates)` | `ipcMain.handle('save-config-deep')` | OK |
| `launch-app` | `api.launchApp(appKey)` | `ipcMain.handle('launch-app')` | OK |
| `update-now` | `api.updateNow()` | `ipcMain.handle('update-now')` | OK |
| `hide-panel` | `api.hidePanel()` | `ipcMain.handle('hide-panel')` | OK |
| `get-vpn-status` | `api.getVpnStatus()` | `ipcMain.handle('get-vpn-status')` | OK |
| `open-file-picker` | `api.openFilePicker(opts)` | `ipcMain.handle('open-file-picker')` | OK |
| `open-folder-picker` | `api.openFolderPicker()` | `ipcMain.handle('open-folder-picker')` | OK |
| `check-file-exists` | `api.checkFileExists(path)` | `ipcMain.handle('check-file-exists')` | OK |
| `clear-activity` | `api.clearActivity()` | `ipcMain.handle('clear-activity')` | OK |
| `add-activity` | `api.addActivity(entry)` | `ipcMain.handle('add-activity')` | OK |
| `get-version` | `api.getVersion()` | `ipcMain.handle('get-version')` | OK |
| `add-custom-slot` | `api.addCustomSlot(slot)` | `ipcMain.handle('add-custom-slot')` | OK |
| `remove-custom-slot` | `api.removeCustomSlot(i)` | `ipcMain.handle('remove-custom-slot')` | OK |
| `update-custom-slot` | `api.updateCustomSlot(i, slot)` | `ipcMain.handle('update-custom-slot')` | OK |
| `open-external` | `api.openExternal(url)` | `ipcMain.handle('open-external')` | OK |
| `ecosystem-read-events` | `api.ecosystemReadEvents()` | `ipcMain.handle('ecosystem-read-events')` | OK |
| `ecosystem-emit` | `api.ecosystemEmit(...)` | `ipcMain.handle('ecosystem-emit')` | OK |
| `hide-after-splash` | `api.signalHideAfterSplash()` | `ipcMain.on('hide-after-splash')` | Preload defined, never called from renderer — dead code, harmless |

Push channels (main → renderer, no reply needed):

| Channel | `webContents.send(...)` | `ipcRenderer.on(...)` listener |
|---------|------------------------|-------------------------------|
| `config-update` | `pollConfig()` | `api.onConfigUpdate(cb)` |
| `vpn-update` | `startVpnCheck()` | `api.onVpnUpdate(cb)` |
| `update-available` | `checkForUpdates()` | `api.onUpdateAvailable(cb)` |
| `splash-complete` | `ready-to-show` handler | `api.onSplashComplete(cb)` |
| `panel-shown` | `showPanel()` | `api.onPanelShown(cb)` |
| `open-settings` | tray context menu | `api.onOpenSettings(cb)` |
| `ecosystem-events-updated` | `watchEvents` callback | `api.onEcosystemUpdated(cb)` |

No mismatches found.

---

## Validation Results

- `npm run build` exits 0 before fixes: YES
- `npm run build` exits 0 after fixes: YES
- Build output sizes unchanged for renderer (531.73 kB) and preload (3.23 kB)
- Main bundle grew from 24.07 kB to 24.43 kB (spawn error handler addition)

---

## Remaining Concerns

### `ecosystem-bus.js` original file not deleted
The original broken file remains at root. External Cyber Apps that `require('./ecosystem-bus')` from this directory would still hit the broken version. Recommendation: delete `ecosystem-bus.js` once all consumers are confirmed to use `ecosystem-bus.cjs`.

### `fs.watch` behavior on Linux with atomic renames
`emitEvent()` uses atomic rename (`writeFileSync tmp` + `renameSync`). On Linux, `inotify`-based `fs.watch` loses the watch after the target is renamed away. The fix applied (watcher teardown guard) addresses double-subscription, but does not add watcher re-attachment after rename on Linux. Since `~/Library` path implies macOS primary use, and macOS `kqueue` survives renames, this is low risk.

### `main.js` legacy entry is untested dead code
The legacy `main.js` is not referenced by `package.json "main"` (which points to `out/main/index.js`). It has no build step and diverges from `src/main/main.ts`. Bugs fixed in the TS source need to be manually mirrored here. Recommend deleting `main.js` and marking `ecosystem-bus.cjs` as the sole legacy-interop artifact.

### `signalHideAfterSplash` dead preload API
`preload.ts` exposes `api.signalHideAfterSplash()` and `ipcMain.on('hide-after-splash')` exists in main, but nothing in the renderer calls it. The panel hides via the blur handler after splash. If splash hide behavior changes, this channel is available but currently unused.

### `personalityTheme` not in `getDefaultConfig()`
`personalityTheme` is optional in the TypeScript type but not present in `getDefaultConfig()`. The `mergeWithDefaults` spread (`{ ...def, ...raw }`) correctly preserves it from the file. However, if the raw JSON has no `personalityTheme` key, the config object won't have the field either, and renderer code falls back to `'neutral'`. This is intentional optional-field behavior, not a bug.
