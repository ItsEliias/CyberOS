# CyberOS Boot-Fix Root Cause — 2026-06-10

## Summary

Six installed CyberOS Electron apps crash on launch with a macOS "A JavaScript error
occurred in the main process / ReferenceError" dialog. The crash fires before any window
opens, making the app completely unusable.

Affected (installed Jun 6): PlaybookStudio, NetLab, GhostVault, NetworkMap, CredVault,
CyberLab Companion.

Working: CyberTools Launcher, ReconDesk, VaultCore, SignalBoard, ReportForge (none have
an ipc/ subdirectory with cross-directory platform imports).

## Root Cause: Rollup Inline + Missing Import

The CyberOS architecture vendors a per-app copy of `src/main/platform.ts`, which exports
three path helpers: `userDataDir`, `sharedConfigPath`, and `ecosystemBusPath`. These are
used by multiple files in `src/main/`.

When electron-vite (Rollup) bundles the main process into a single output file, it inlines
all imported modules. If Rollup's deduplication fails (or if a symbol is used but was never
explicitly imported), one of two bug modes appears in the output:

### Bug Mode A — Missing Import (NetworkMap, CredVault)

A file calls a platform function at module top level but does not import it. The function
is inlined once from the file that DID import it, but Rollup must rename it with a `$1`
suffix to resolve TDZ ordering. The call site in the file that never imported it still
references the bare name — which no longer exists.

- **NetworkMap** `src/main/main.ts` line 15: `const CYBERTOOLS_CONFIG = sharedConfigPath()`
  — `sharedConfigPath` was never imported (only `userDataDir` was on line 8). The bundle
  defined `sharedConfigPath$1` (from `pendingActions.ts`'s import) and the bare
  `sharedConfigPath()` call at line 113 of the bundle crashed at runtime.
  Fix: add `sharedConfigPath` to the import on line 8.

- **CredVault** `src/main/ipc/credvault.ts` line 34: `const APP_SUPPORT = userDataDir('CredVault')`
  — imported only `sharedConfigPath` from `'../platform'`, not `userDataDir`. The bundle
  defined `userDataDir$1` (from `cryptoManager.ts` / `vault-crypto.ts`) and the bare
  `userDataDir()` call in the ipc section crashed at runtime.
  Fix: add `userDataDir` to the import in `ipc/credvault.ts`.

### Bug Mode B — `.js` Extension Import Forcing Duplicate Resolution (CyberLab Companion)

`src/main/main.ts` imported `'./ecosystem-bus.js'`, `'./ipc-extras.js'`, `'./pendingActions.js'`,
and `'./platforms.js'` with explicit `.js` extensions. Rollup/vite resolves `.js`-suffixed
imports via a different resolution chain than bare module specifiers, causing `platform.ts`
to be inlined twice. One copy's `sharedConfigPath` was renamed to `sharedConfigPath$1`,
leaving two call sites at lines 73 and 405 of the bundle referencing the bare (undefined)
name.

Note: `platforms.ts` (HTB/THM integration) is a different file from `platform.ts` (path
helpers). The `.js` extension on `'./platforms.js'` forced a separate resolution pass.
Fix: strip all `.js` extensions from imports in `main.ts`.

### Not-A-Bug — Self-Healed (PlaybookStudio, NetLab, GhostVault)

These apps had their source bugs fixed in an earlier session (prior to Jun 7 build). Their
local `out/main/*.js` builds (Jun 7–9) are already clean. The installed apps in
`/Applications/` are the stale Jun 6 versions. Fix: rebuild DMG and reinstall only.

## Why the Working Apps Avoid This

ReconDesk, VaultCore, SignalBoard, ReportForge, CyberTools Launcher: none have an `ipc/`
subdirectory with cross-directory platform imports. All platform imports are in `src/main/`
files using `'./platform'`, and every symbol used is explicitly imported. No TDZ ambiguity.

## Scope Wider Than Initially Diagnosed

A full sweep of all 13 apps revealed that the "used but not imported" bug is not limited to
the 6 originally affected apps. Additional files across working apps also had missing
imports — they boot today only because their installed (Jun 6) builds happened to be built
from an earlier source version where the pattern didn't yet exist. A fresh rebuild of any
of these apps without the source fix would produce the same crash.

Files fixed beyond the 6 primary targets:

| App | File | Added Import |
|-----|------|-------------|
| PlaybookStudio | `src/main/ipc-handlers.ts` | `userDataDir` |
| PlaybookStudio | `src/main/main.ts` | `userDataDir` |
| GhostVault | `src/main/main.ts` | `sharedConfigPath`; removed `.js` extensions on peer imports |
| GhostVault | `src/main/ecosystem-bus.ts` | `ecosystemBusPath` |
| GhostVault | `src/main/pendingActions.ts` | `sharedConfigPath` |
| CyberLab Companion | `src/main/ipc-extras.ts` | `sharedConfigPath`; removed `.js` extension |
| CyberLab Companion | `src/main/pendingActions.ts` | `sharedConfigPath` |
| ReconDesk | `src/main/credential-tracker.ts` | `ecosystemBusPath` |
| VaultCore | `src/main/pendingActions.ts` | `sharedConfigPath` |
| ReportForge | `src/main/ecosystem-bus.ts` | `ecosystemBusPath` |
| ReportForge | `src/main/pendingActions.ts` | `sharedConfigPath` |
| TerminalLink | `src/main/pendingActions.ts` | `sharedConfigPath` |

TerminalLink (not yet installed) had the same Mode A missing-import pattern in its
`pendingActions.ts`. Fixed. CYBEROST-001 is resolved.

## Prevention

Add a pre-build grep check to each affected app:

```bash
# Catch missing platform imports before build
grep -rn "userDataDir\|sharedConfigPath\|ecosystemBusPath" src/main/ \
  | grep -v "from.*platform" \
  | grep -v "^.*\/\/" \
  | grep -v "platform\.ts"
```

A CI rule that rejects `from.*'\.\.\/platform'` in `src/main/ipc/` files (enforcing that
ipc files import via `'../platform'` and explicitly list every symbol they use) would also
catch Mode A bugs before they reach a build.
