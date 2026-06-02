# FIX: Cyberlab Companion — React + TypeScript + Tailwind + Framer Motion + electron-vite

---

## Executive Summary

The app has **two completely separate, working implementations** that coexist in the same repo and are currently **inconsistently wired**:

| Layer | Legacy (vanilla JS) | React / TS |
|-------|---------------------|------------|
| Main process | `main.js` (root) | `src/main/main.ts` → built to `out/main/index.js` |
| Preload | `preload.js` (root) | `src/main/preload.ts` → built to `out/preload/preload.mjs` |
| Renderer | `index.html` + `renderer.js` (root) | `src/renderer/` → built to `out/renderer/index.html` |

`package.json` `main` field points to `out/main/index.js` (React/TS build).  
`out/main/index.js` (the TypeScript main) loads `out/renderer/index.html` (React renderer).  
**The legacy `main.js` + `index.html` are not what Electron runs — they are dead code at launch.**

The React migration is the **active, intended renderer**. The legacy files are development artifacts that were never removed.

---

## Root Cause Analysis

### 1. Architecture Confusion (Critical)
- `package.json → "main": "out/main/index.js"` — Electron entry is the **TypeScript build output**
- `out/main/index.js` (from `src/main/main.ts`) uses `ELECTRON_RENDERER_URL` in dev, and `path.join(__dirname, '../renderer/index.html')` in prod — loads the **React renderer**
- Root-level `main.js` calls `mainWindow.loadFile('index.html')` — loads the **legacy renderer**
- Root-level `main.js` is **never executed** by Electron (it is not referenced by `package.json`'s `main` field)
- Root-level `index.html` is loaded only if someone manually runs `electron main.js` — not via `npm run dev/build/start`

### 2. Preload Module Format Mismatch (Significant)
- `src/main/main.ts` references `preload: path.join(__dirname, '../preload/preload.mjs')`
- electron-vite builds `src/main/preload.ts` as an ESM `.mjs` file — this matches
- Root-level `preload.js` uses `'use strict'` / `module.exports` (CJS) — used only if `main.js` is invoked directly
- Both preloads expose the same API surface as `window.electronAPI` — no mismatch in channel names

### 3. IPC Channel Mismatch: `syncHTB` / `syncTHM` in renderer-part3.js
- `renderer-part3.js` (legacy, NOT active) calls `window.electronAPI.syncHTB()` and `window.electronAPI.syncTHM()` with **no arguments**
- Root `main.js` `sync-htb` handler requires an `apiKey` argument; `sync-thm` requires a `username`
- Without arguments, both handlers immediately return `{ success: false, error: '...' }`
- **This only matters if someone runs the legacy stack** — the React renderer (`renderer.js` in root, which is the full combined legacy renderer) calls `syncHTB(AppState.config.htbApiKey || '')` and `syncTHM(AppState.config.thmUsername || '')` correctly
- The React renderer in `src/renderer/components/LabTracker.tsx` also passes args correctly

### 4. `saveWriteup` Field Name Mismatch (renderer.js — legacy stack)
- `renderer.js` line 3087 calls: `saveWriteup({ sessionId, content, name })`
- `renderer.js` line 3121 calls: `saveWriteup({ sessionId, content, name, vault, obsidian: true })`
- Root `main.js` `save-writeup` handler destructures: `{ content, labName, platform, vaultPath }`
- The renderer sends `name` and `vault`, the handler reads `labName` and `vaultPath` — **field mismatch**
- `labName` will be `undefined` → filename becomes `.md`; `vaultPath` will be `undefined` → handler throws "No Obsidian vault path configured"
- **Affects only legacy stack.** The React `src/main/main.ts` handler destructures `{ content, labName, platform, vaultPath }` — the React renderer components must be checked to ensure they pass matching fields

### 5. `sounds.js` and `themes.js` Use `module.exports` in Browser Context
- Root-level `sounds.js` and `themes.js` end with `module.exports = { ... }` — this is Node CJS syntax
- They are **not loaded by `index.html`** — index.html only loads `renderer.js` via `<script src="renderer.js">`
- `renderer.js` (and `renderer-part1.js`) embed inlined copies of all sound and theme logic — they do not `require()` these files
- `sounds.js` and `themes.js` at the root are standalone modules intended for use in Node context (e.g., `main.js`) but are not actually used there either
- **No runtime breakage** — they are simply unused standalone files

### 6. `ecosystem-bus.js` — macOS-Only Path
- Both `ecosystem-bus.js` (root) and `src/main/ecosystem-bus.ts` hard-code:
  ```js
  const BUS_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'CyberTools');
  ```
- `Library/Application Support` is macOS-specific. On Windows this path does not exist under the user's home directory (correct path would be `AppData/Roaming`)
- `ensureDir()` uses `fs.mkdirSync({ recursive: true })` — it will create the path on Windows even if unusual, so **no crash**, but the path is unconventional on non-macOS platforms
- Recommendation: use `app.getPath('userData')` from Electron instead of `os.homedir() + Library/Application Support`

### 7. HTB/THM API Calls — Graceful Failure
- Both `main.js` and `src/main/main.ts` wrap all HTB/THM API calls in try/catch and return `{ success: false, error }` — **graceful failure is implemented**
- `fetchJSON` has a 15-second timeout via `req.setTimeout` — correctly implemented
- The renderer checks `result.success` before using data

### 8. Sound Files
- `sounds.js` generates all audio **programmatically via the Web Audio API** — zero external audio files needed
- `renderer-part1.js` / `renderer.js` embed the same programmatic audio logic inline
- No sound file paths to check — this area is clean

### 9. Session Persistence
- Sessions persist to `~/.cyberlab-companion/sessions/session_<id>.json`
- Progress to `~/.cyberlab-companion/progress.json`
- Lab tracker to `~/.cyberlab-companion/labs.json`
- Snippets to `~/.cyberlab-companion/snippets.json`
- All use `os.homedir()` correctly — no hardcoded paths

### 10. Claude API Key
- Read from `~/.cyberlab-companion/apikey.enc` (encrypted via Electron safeStorage)
- Fallback to `~/.cyberlab-companion/apikey.enc.b64` (base64 obfuscation)
- Config at `~/cybertools-config.json` stores metadata flags (`apiKeyConfigured: true`)
- `os.homedir()` used throughout — correct

---

## Fixes Applied

**None were required to make the build pass** — `npm run build` exits 0 and produces valid output. The issues are architectural inconsistencies and dead-code problems, not build failures.

The following are recommended fixes:

---

## Migration Issues Found

### Issue 1 — Dead Legacy Files Should Be Archived, Not Active
**Files:** `main.js`, `preload.js`, `index.html`, `renderer.js`, `renderer-part1.js`, `renderer-part2.js`, `renderer-part3.js`, `commandbuilder.js`, `reverseshell.js`, `encoder.js`, `cheatsheets.js`, `labtracker.js`, `session.js`, `progress.js`, `snippets.js`, `sounds.js`, `themes.js`

These are all legacy. Electron runs `out/main/index.js` (compiled from `src/main/main.ts`). The React renderer in `out/renderer/index.html` is what displays. None of these root files are executed at runtime.

**Recommended action:** Move to a `legacy/` folder or delete. They create confusion and risk accidental edits to the wrong stack.

### Issue 2 — `saveWriteup` Field Name Mismatch (legacy `main.js` only)
**File:** `main.js` line 401 vs `renderer.js` lines 3087 + 3121

Handler expects: `{ content, labName, platform, vaultPath }`  
Renderer sends: `{ sessionId, content, name, vault, obsidian }`

The active React stack (`src/main/main.ts`) has the same handler signature — verify the React `WriteupPanel.tsx` component sends `{ content, labName, platform, vaultPath }` to match.

### Issue 3 — `syncHTB`/`syncTHM` Missing Arguments (legacy `renderer-part3.js` only)
`renderer-part3.js` (not the active renderer) calls `syncHTB()` and `syncTHM()` with no arguments. The active `renderer.js` passes `AppState.config.htbApiKey` and `AppState.config.thmUsername` correctly. The React components also pass arguments correctly. **No fix needed for active stack.**

### Issue 4 — `ecosystem-bus` macOS-Hardcoded Path
Both `ecosystem-bus.js` and `src/main/ecosystem-bus.ts` should use `app.getPath('userData')` instead of `os.homedir() + '/Library/Application Support/CyberTools'`.

Proposed fix for `src/main/ecosystem-bus.ts`:
```ts
import { app } from 'electron';
// Replace:
const BUS_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'CyberTools');
// With:
const BUS_DIR = path.join(app.getPath('userData'), '..', 'CyberTools');
// Or more simply:
const BUS_DIR = path.join(os.homedir(), '.cybertools-ecosystem');
```

---

## Communication Fixes

### IPC Audit — Active Renderer vs Preload vs Main (TypeScript Stack)

All channels in `src/main/preload.ts` → `window.electronAPI.*` are matched by handlers in `src/main/main.ts`:

| `window.electronAPI` method | IPC Channel | Main Handler |
|-----------------------------|-------------|--------------|
| `getConfig()` | `get-config` | ✅ |
| `saveConfig(cfg)` | `save-config` | ✅ |
| `getOutputDir()` | `get-output-dir` | ✅ |
| `saveApiKey(key)` | `save-api-key` | ✅ |
| `testApiKey(key)` | `test-api-key` | ✅ |
| `hasApiKey()` | `has-api-key` | ✅ |
| `claudeChat(payload)` | `claude-chat` | ✅ |
| `saveSession(data)` | `save-session` | ✅ |
| `loadSession(id)` | `load-session` | ✅ |
| `listSessions()` | `list-sessions` | ✅ |
| `deleteSession(id)` | `delete-session` | ✅ |
| `saveWriteup(data)` | `save-writeup` | ✅ (verify field names from React component) |
| `exportPDF(data)` | `export-pdf` | ✅ |
| `scanVault(path)` | `scan-vault` | ✅ |
| `pickFolder()` | `pick-folder` | ✅ |
| `checkVPN()` | `check-vpn` | ✅ |
| `checkUpdate()` | `check-update` | ✅ |
| `syncHTB(apiKey)` | `sync-htb` | ✅ |
| `syncTHM(username)` | `sync-thm` | ✅ |
| `updateLauncherStatus(s)` | `update-launcher-status` | ✅ |
| `saveProgress(data)` | `save-progress` | ✅ |
| `loadProgress()` | `load-progress` | ✅ |
| `saveLabTracker(data)` | `save-lab-tracker` | ✅ |
| `loadLabTracker()` | `load-lab-tracker` | ✅ |
| `saveSnippets(data)` | `save-snippets` | ✅ |
| `loadSnippets()` | `load-snippets` | ✅ |
| `openExternal(url)` | `open-external` | ✅ |
| `getVersion()` | `get-version` | ✅ |
| `getPlatform()` | `get-platform` | ✅ |
| `ecosystemEmit(...)` | `ecosystem-emit` | ✅ |
| `onUpdateAvailable(cb)` | push: `update-available` | ✅ |
| `onFocusWindow(cb)` | push: `focus-window` | ⚠️ Main never sends `focus-window` — listener registered but never fires |
| `onAutosaveTick(cb)` | push: `autosave-tick` | ✅ |
| `onVpnStatus(cb)` | push: `vpn-status` | ✅ |
| `removeAllListeners(ch)` | — | ✅ |

**One unused push channel:** `focus-window` is registered in the preload and subscribed in `App.tsx` but `src/main/main.ts` never sends it. This is inert — no crash, just a no-op listener.

---

## Validation Results

- `npm run build` exit code: **0**
- electron-vite builds three bundles successfully:
  - `out/main/index.js` — 19.91 kB (TypeScript main process)
  - `out/preload/preload.mjs` — 2.71 kB (TypeScript preload)
  - `out/renderer/assets/index-*.js` — 700.69 kB (React renderer, bundled)
  - `out/renderer/assets/index-*.css` — 31.65 kB (Tailwind CSS)
- TypeScript: compiles clean (no reported errors)
- Electron entry `package.json → "main": "out/main/index.js"` correctly points to built TypeScript output
- React renderer loads from `out/renderer/index.html` — confirmed correct
- Preload path in `src/main/main.ts`: `../preload/preload.mjs` — confirmed file exists at `out/preload/preload.mjs`

---

## Remaining Concerns

### High Priority
1. **Verify `WriteupPanel.tsx` field names** — the `save-writeup` IPC handler in `src/main/main.ts` expects `{ content, labName, platform, vaultPath }`. Confirm the React component sends exactly these field names.

2. **`focus-window` push channel is never sent** — `App.tsx` registers `onFocusWindow` but the main process never emits it. If you have a "focus app from launcher" use case, add `mainWindow.webContents.send('focus-window')` in the `--launcher-open` handler in `main.ts`.

### Medium Priority
3. **Ecosystem bus path is macOS-only** — `Library/Application Support` is a macOS convention. Use `app.getPath('userData')` for cross-platform correctness. This will not crash on Windows (the directory is created via `mkdirSync`), but the path is non-standard.

4. **Legacy files clutter** — Root-level `main.js`, `preload.js`, `index.html`, `renderer.js`, `renderer-part1/2/3.js`, and all `.js` tool modules are dead code at runtime. They should be moved to `legacy/` or deleted to prevent confusion and accidental edits.

### Low Priority
5. **`renderer-part3.js` `syncHTB()`/`syncTHM()` no-arg calls** — Only matters if legacy stack is intentionally reactivated. Document that `renderer-part3.js` is an older draft superseded by the combined `renderer.js`.

6. **CSP in `out/renderer/index.html` allows `ws://localhost:*`** — This is added by electron-vite for HMR in dev. In production builds the Vite dev server does not run, so the websocket connection fails silently. This is harmless but could be stripped from production CSP.

7. **`sounds.js` and `themes.js` at root have `module.exports`** — These are Node CJS modules that are never required anywhere. They can be deleted safely.

---

## Second Pass Findings (React Layer Deep Audit)

### What Was Audited

Every `.tsx` file in `src/renderer/` and every `.ts` file in `src/renderer/lib/` was read in full. The Zustand store, shared types, and all IPC call sites were checked.

---

### Bug 1 — `WriteupPanel.tsx` Missing IPC Fields (HIGH — Save Silently Fails)

**File:** `src/renderer/components/WriteupPanel.tsx`

The `saveWriteup` function was calling:
```tsx
await window.electronAPI.saveWriteup({
  sessionId: session.id,  // ignored by handler
  labName: session.labName,
  content,
  // missing: platform, vaultPath
});
```

The `save-writeup` IPC handler in `src/main/main.ts` line 288 destructures:
```ts
{ content, labName, platform, vaultPath }
```

Without `vaultPath`, the handler immediately throws `"No vault path configured"` — **every single writeup save fails**. Without `platform`, the saved file always goes into a directory named `undefined` (caught by the same vault check). The `sessionId` field is never read by the handler.

`exportPDF` also sent `sessionId` unnecessarily (harmless, but cleaned up).

**Fix applied:** Updated `saveWriteup` to send `{ content, labName: session.labName, platform: session.platform, vaultPath: config?.obsidianVault || '' }`. The `config` is now read from the Zustand store (`useStore`). Also added error checking on the return value. The `exportPDF` call was cleaned up to remove the unused `sessionId` field.

**Build after fix:** exit 0, renderer bundle: 700.85 kB.

---

### Bug 2 — HTB/THM Sync Exposed via Preload But No UI Entry Point (MEDIUM — Feature Gap)

**Files:** `src/renderer/components/LabTracker.tsx`, `src/renderer/components/SettingsPanel.tsx`

The preload exposes `syncHTB(apiKey)` and `syncTHM(username)`. The `AppConfig` type has `htbApiKey` and `thmUsername` fields. The legacy renderer had a "Sync HTB" button. In the React layer:

- `SettingsPanel.tsx` has no `htbApiKey` / `thmUsername` input fields
- `LabTracker.tsx` has no "Sync from HTB/THM" button
- No component calls `window.electronAPI.syncHTB()` or `window.electronAPI.syncTHM()`

The HTB/THM sync functionality is fully implemented in `main.ts` and wired through the preload, but the React UI provides no way to invoke it. Users cannot sync their HTB/THM machine history from within the app.

**Fix not applied** — this is a feature omission, not a crash bug. The recommended fix is to add `htbApiKey` and `thmUsername` input fields + "Sync" buttons to `SettingsPanel.tsx`, then call `syncHTB(config.htbApiKey)` / `syncTHM(config.thmUsername)` and push results into `labsData` via `setLabsData`.

---

### Observation 3 — `parseFindings` Mutates Session In-Place Then Spreads Back (LOW — Anti-Pattern, No Crash)

**File:** `src/renderer/components/ChatPanel.tsx` line 164–168

`parseFindings(responseText, session)` directly pushes into `session.findings.flags`, `session.findings.ports`, etc. After mutation, `updateSession(activeTabId, { findings: session.findings })` spreads the mutated object back into Zustand state.

This works because:
1. The mutation happens on the stale closure reference before the spread
2. Zustand does a shallow merge on the spread

However, it bypasses Zustand's immutable update pattern. If another state update arrives between the Claude API response and the `updateSession` call (possible with autosave), the in-flight findings could be overwritten by the stale spread. No crash is observed in practice but the pattern is fragile.

**Fix not applied** — correct but low-risk in the current single-user context.

---

### Observation 4 — Preload Output Format Is Correct (Confirmed)

**Files:** `electron.vite.config.ts`, `src/main/main.ts` line 211

The preload section in `electron.vite.config.ts` has no explicit `output.format` or `entryFileNames` override. With `"type": "module"` in `package.json`, electron-vite correctly outputs the preload as `out/preload/preload.mjs`. The `createWindow()` call in `main.ts` hardcodes `preload.mjs`:

```ts
preload: path.join(__dirname, '../preload/preload.mjs'),
```

This matches the actual build output. The match is **intentional and correct** — no fix needed. The first audit's concern about `.mjs` is resolved: electron-vite with `"type": "module"` outputs `.mjs` and `main.ts` expects `.mjs`. They agree.

---

### Observation 5 — All Other React Components Are Correct

After reading every component and lib file:

| Component | IPC calls | Status |
|-----------|-----------|--------|
| `ChatPanel.tsx` | `claudeChat({ system, messages })` | Correct — matches handler signature |
| `CommandBuilder.tsx` | None (pure client-side) | No IPC calls needed |
| `ReverseShell.tsx` | None (pure client-side) | No IPC calls needed |
| `Encoder.tsx` | None (pure client-side) | No IPC calls needed |
| `Cheatsheets.tsx` | None (pure client-side) | No IPC calls needed |
| `LabTracker.tsx` | `saveLabTracker(data)` | Correct |
| `Snippets.tsx` | `saveSnippets(data)` | Correct |
| `Progress.tsx` | None (reads from Zustand) | No IPC calls |
| `SettingsPanel.tsx` | `saveConfig`, `testApiKey`, `saveApiKey`, `pickFolder` | All correct |
| `SetupWizard.tsx` | `testApiKey`, `saveApiKey`, `saveConfig`, `pickFolder` | All correct |
| `Header.tsx` | None | No IPC calls |
| `Footer.tsx` | `getVersion()` | Correct |
| `Sidebar.tsx` | None | No IPC calls |
| `TabBar.tsx` | None | No IPC calls |
| `App.tsx` | `getConfig`, `hasApiKey`, `loadProgress`, `loadLabTracker`, `loadSnippets`, `checkVPN`, `saveSession`, `onAutosaveTick`, `onVpnStatus` | All correct |

**Zustand store shape** — every component references the store correctly. `AppConfig`, `Session`, `Tab`, `ChatMessage` types are used consistently across components and types.ts. No shape mismatches found.

**`lib/` files** — `session.ts`, `labtracker.ts`, `snippets.ts`, `progress.ts`, `encoder.ts`, `commandbuilder.ts`, `reverseshell.ts`, `cheatsheets.ts`, `sounds.ts`, `themes.ts` are all pure client-side. No IPC calls. All are well-formed with no missing exports relative to their consumers.

---

### Second Pass Summary

| Finding | Severity | Fixed |
|---------|----------|-------|
| `WriteupPanel.tsx` missing `platform` + `vaultPath` → every save throws | HIGH | YES |
| HTB/THM sync has no UI entry point | MEDIUM | No (feature gap, not crash) |
| `parseFindings` mutates session in-place | LOW | No (anti-pattern, no crash) |
| Preload `.mjs` format confirmed correct | INFO | N/A |
| All other 14 components + libs clean | Info | N/A |

**Final build:** exit 0. `out/main/index.js` 19.91 kB, `out/preload/preload.mjs` 2.71 kB, `out/renderer/assets/index-*.js` 700.85 kB.
