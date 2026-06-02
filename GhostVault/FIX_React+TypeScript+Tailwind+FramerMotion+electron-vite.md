# FIX: GhostVault — React + TypeScript + Tailwind + Framer Motion + electron-vite

## Executive Summary

Six runtime bugs were found and fixed. None crashed the TypeScript compiler (either typed with `any`-compatible signatures or in a plain `.js` file), so `npm run build` was already passing despite all bugs being present. The most serious issues were two **component prop signature mismatches** that would cause runtime crashes or the setup wizard to silently drop user theme/vault preferences, plus a **ReferenceError** in the local AI engine that would throw whenever a user ran the "Extract TODOs" action on a note with no tasks.

Build status before: exit 0 (silent runtime bugs).
Build status after fixes: exit 0 — confirmed clean.

---

## Root Cause Analysis

The migration from vanilla JS → React + TypeScript introduced multiple component interface mismatches that TypeScript did not catch because:
- `SetupWizard` prop rename (`onFinish` → component uses it, App calls `onComplete`) was a pure naming inconsistency that compiled via structural typing tolerance.
- `Sidebar` callback signatures drifted: parent App.tsx kept `(x, y, path)` coordinates from the old vanilla JS handler while Sidebar was rewritten to pass `(e: React.MouseEvent, note: NoteFile)`.
- The JS-only local AI engine has no TypeScript coverage, so `text` (undefined, should be `raw`) went undetected.
- CSS classes are generated as strings inside `markdown.ts` but never validated against `globals.css`.

---

## Fixes Applied

### Fix 1 — SetupWizard prop name and signature mismatch
**Files:** `src/renderer/components/SetupWizard.tsx`, `src/renderer/App.tsx`

**Bug:** `SetupWizard` declared prop `onFinish(vaultPath, theme, useExisting)`. `App.tsx` passed `onComplete={handleSetupComplete}` where `handleSetupComplete` only accepted `(path: string)`. Two problems:
1. Wrong prop name (`onComplete` vs `onFinish`) → component never called its prop, setup wizard's "Launch" button silently did nothing.
2. App handler discarded the theme and `useExistingStructure` flag chosen by the user during wizard.

**Fix:** Renamed `SetupWizard` prop to `onComplete` (matching what App already passed). Expanded `handleSetupComplete` to accept `(vaultPath, theme, useExisting)`, save all three to config, and apply theme attributes to `document.documentElement` immediately.

### Fix 2 — Sidebar `onOpenNote` callback signature mismatch
**Files:** `src/renderer/App.tsx`

**Bug:** `Sidebar` calls `onOpenNote(note: NoteFile)` passing the full note object. App's `openNote` callback was typed as `(notePath: string)` and did `notes.find(n => n.path === notePath)` — if called with a `NoteFile` object, it would stringify the object, `find` would return undefined, and the function would silently return without opening any note.

**Fix:** Changed `openNote` to accept `(note: NoteFile)` directly, eliminating the redundant `notes.find()` lookup since the note object is already available from the sidebar.

### Fix 3 — Sidebar `onContextMenu` callback signature mismatch
**Files:** `src/renderer/App.tsx`

**Bug:** App passed `onContextMenu={(x, y, path) => setContextMenu({x, y, path})}` with the old vanilla-JS signature. Sidebar calls `onContextMenu(e: React.MouseEvent, note: NoteFile)`. This would pass a `MouseEvent` object as `x` and a `NoteFile` as `y`, corrupting the context menu position and path — the menu would appear at `[object MouseEvent]`, `[object Object]` coordinates and show no valid note path.

**Fix:** Changed the App prop to `(e, note) => setContextMenu({ x: e.clientX, y: e.clientY, path: note.path })`.

### Fix 4 — `processTODOs` ReferenceError: `text is not defined`
**File:** `src/renderer/lib/local-ai-engine.js`, line 574

**Bug:** The fallback message inside `processTODOs` referenced `text.length`. The function parameter is named `raw`, not `text`. This causes a `ReferenceError` thrown into the LocalAI `try/catch`, which returns `{ error: "Processing error: text is not defined" }` to the renderer — the user sees an error toast when they use "Extract TODOs" on a note with no action items.

**Fix:** Changed `text.length` → `raw.length`.

### Fix 5 — Missing CSS classes for markdown renderer
**File:** `src/renderer/styles/globals.css`

**Bug:** `src/renderer/lib/markdown.ts` generates HTML elements with these class names: `wiki-link`, `md-tag`, `ip-addr`, `code-lang`, `empty-state`, `empty-icon`, `empty-title`, `empty-sub`, `md-check`, `md-check done`. Only `wikilink` (wrong name — renderer uses `wiki-link`) existed in globals.css. All others were unstyled, causing: invisible empty-state placeholder, unformatted checkboxes, missing IP highlighting, no tag badges, no code-language labels.

**Fix:** Added all missing CSS classes to globals.css. Also corrected the existing `.wikilink` selector — left it in place for legacy compatibility but added `.wiki-link` which is what the renderer actually emits.

### Fix 6 — Missing `--accent` / `--accent2` fallback in `:root`
**File:** `src/renderer/styles/globals.css`

**Bug:** `--accent` and `--accent2` were only defined under `[data-personality="..."]` attribute selectors. If the attribute hadn't been applied yet (e.g., during the first React render tick before `useEffect` fires), any CSS property referencing `var(--accent)` would resolve to the CSS initial value (transparent/empty), causing momentary unstyled flickers or permanently unstyled elements in SSR/static contexts.

**Fix:** Added `--accent: #4a9eff; --accent2: #7bb8ff;` (neutral defaults) directly inside the `:root` / `[data-core="stealth"]` block as a safe fallback. The `[data-personality]` selectors still override correctly at higher specificity.

---

## Migration Issues Found

| Issue | Category | Severity |
|-------|----------|----------|
| `onFinish` → `onComplete` prop rename not propagated | Prop contract drift | Critical — wizard non-functional |
| Theme/useExisting discarded in App handler | Logic omission | High — user config lost |
| `onOpenNote(path)` vs `onOpenNote(note)` | Signature drift | High — notes can't be opened |
| `onContextMenu(x,y,path)` vs `(e,note)` | Signature drift | High — context menu broken |
| `text` vs `raw` variable name | Vanilla JS → no types | Medium — ReferenceError on empty TODO |
| `wiki-link` class never styled | CSS-JSX gap | Medium — unstyled links |
| `md-tag`, `ip-addr`, `md-check` never styled | CSS-JSX gap | Medium — missing UI elements |
| `empty-state` classes never styled | CSS-JSX gap | Low — missing empty placeholder |
| `--accent` no `:root` fallback | CSS specificity | Low — flash of unstyled content |

---

## Communication Fixes

**IPC symmetry (both windows):** Verified — the single preload at `out/preload/preload.cjs` is used by both `mainWindow` and `captureWindow` (both windows reference `preloadPath` at `main.ts:197`). All IPC channels called by the capture renderer (`get-config`, `load-vault`, `save-capture-note`, `hide-capture`, `get-capture-theme`, `save-capture-theme`) are registered in main and exposed in the preload. No missing IPC channels.

**Two-window preload:** Both windows share the same preload — correct for this app's architecture. Each window gets a separate renderer context with its own `contextBridge` instance.

**`capture-folders` channel:** Main sends `capture-folders` on `ready-to-show` and `sendCaptureFolders()`. The preload exposes `onCaptureFolders`. `CaptureApp.tsx` doesn't subscribe to it (it uses direct IPC via `getConfig` + `loadVault` instead), so the push-style `capture-folders` event is effectively unused — harmless, but redundant. No functional bug.

---

## Validation Results

```
npm run build 2>&1 | tail -5

../../out/renderer/assets/globals-D3MtYmcQ.css   28.37 kB
../../out/renderer/assets/capture-Cbl4ZHR3.js     6.15 kB
../../out/renderer/assets/globals-BpF856hE.js   214.33 kB
../../out/renderer/assets/index-D9jqNRsh.js     397.63 kB
✓ built in 1.25s
```

Exit code: 0. All 415 modules transformed cleanly.

---

## Remaining Concerns

1. **`markdown.ts` regex pipeline does not escape HTML before inline processing** — block-level elements (headings, code blocks) are generated before inline formatting, but if a code block contains `**text**`, the bold regex will match inside it, corrupting the output. This is a correctness bug in the renderer but not a crash.

2. **`listVaultNotes` returns empty `rel` for root notes** — `walk(vaultPath, '')` starts with empty `relBase`, so root-level `.md` files get `rel: ''` and `folder: '/'`. Sidebar shows these under `byFolder['']` but the fallback in `byFolder['']` requires exact key matching. Works in practice because `byFolder['']` is checked alongside `byFolder['/']`.

3. **No `fs.watch` on vault directory** — live file updates from external editors (Obsidian, etc.) require a manual refresh or app restart. Not a bug, but a common expectation for a vault app.

4. **`window.location.reload()` used for vault change** — `SettingsView` and `VaultView` both call `window.location.reload()` after changing the vault path. In production Electron this works, but loses all in-memory state (unsaved edits, open modals). A proper store reset without page reload would be more robust.

5. **Ollama `callOllama` does not stream** — `stream: false` is correct for simplicity, but a 60-second timeout with no UI feedback beyond "Processing…" may feel frozen to users for large notes. Consider adding a streaming mode with incremental result display.
