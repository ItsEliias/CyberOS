# APEX Loop — Batch 4 — Per-iter Status

Agent: `apex-loop-batch-4` · 2026-06-11

Iters 10-12 of the 15-cap (9 used by batches 1-3, 6 remain). Base branch for every iter: `ui/apex-bento-app` HEAD `1b55750`. Hard rules per master log §2.

## Iter 10 — Renderer permission-request denial

| Field | Value |
|------|-------|
| Theme | Deny all renderer permission requests by default; allowlist `clipboard-sanitized-write` for own origin only |
| Rating | HIGH |
| Independent | YES (does not stack on any prior iter) |
| Branch | `apex/loop-10-permission-handlers` |
| Base | `ui/apex-bento-app` @ `1b55750` |
| PR | https://github.com/ItsEliias/CyberOS/pull/112 |
| Files | `APEX Bento/src/main/main.ts` (1 file, +59/-1) |
| typecheck | PASS |
| build | PASS |
| APEX writes | 0 |
| Forbidden imports | 0 |

### Why rated HIGH

Electron's default permission behaviour auto-approves every renderer request (camera, mic, geolocation, notifications, MIDI, HID, serial, USB, filesystem). The Electron security tutorial explicitly recommends inverting this default. APEX Bento is a read-only observability dashboard with zero need for any of these. Setting both `setPermissionRequestHandler` AND `setPermissionCheckHandler` (the latter is required because "most web APIs do a permission check and then make a permission request if the check is denied" per the session docs) closes the gap with one small file edit.

### Allowlist reasoning

`clipboard-sanitized-write` for `file://` (prod) + `http://localhost:5173` (dev) only. Future-compatible with iter 3 / PR #105's `navigator.clipboard.writeText` for the runbook-path copy button. Sanitized writes are plain-text only — no credential surface.

### Sources (all verified 200 via curl -sIL)

- https://www.electronjs.org/docs/latest/tutorial/security
- https://www.electronjs.org/docs/latest/api/session
- https://www.electronjs.org/docs/latest/api/web-contents

### Convergence check

H found, NOT converged. Proceeding to iter 11.

### Candidates considered but not picked this iter

| Candidate | Rating | Why not picked |
|-----------|--------|----|
| Generic `safeHandle` IPC middleware | L (independent) | At base-branch baseline, all 5 in-memory handlers can't throw; the 6th (jbecker) already has try/catch. Real payoff requires iter 4's envelope work to land first. |
| Diagnostics export (Cmd+Shift+E JSON dump) | M | Held for iter 11 consideration. |
| Theme switcher infrastructure | L | Wiring without payoff (no new theme to ship). |
| Card focus order persistence | L | Marginal UX. |
| Onboarding tour | L | Power-user dashboard. |
| Search across 6 cards | L | Overkill at this scale. |
| Banner expand-on-click | L | Directive already fully visible. |
| `shell.openPath` runbook opener | M (DEPENDS-BLOCKED) | Waits on PR #105. |
| IPC envelope parity | M (DEPENDS-BLOCKED) | Waits on PR #106. |

Permission handling beat diagnostics export this iter because security-by-default is a single-file, well-sourced, citable-from-Electron-security-checklist HIGH while diagnostics export remains an M without a forcing support workflow.

---

## Iter 11 — Renderer process sandbox

| Field | Value |
|------|-------|
| Theme | Flip `BrowserWindow.webPreferences.sandbox` from `false` → `true` (OS-level renderer sandbox) |
| Rating | HIGH |
| Independent | YES (orthogonal to iter 10; both can land in either order) |
| Branch | `apex/loop-11-renderer-sandbox` |
| Base | `ui/apex-bento-app` @ `1b55750` |
| PR | https://github.com/ItsEliias/CyberOS/pull/113 |
| Files | `APEX Bento/src/main/main.ts` (1 file, +9/-1) |
| typecheck | PASS |
| build | PASS |
| APEX writes | 0 |
| Forbidden imports | 0 |

### Why rated HIGH

Electron's security checklist item "Enable process sandboxing" explicitly recommends running the renderer inside Chromium's OS-level sandbox. The base branch had `sandbox: false`, opting out. Combined with the already-set `contextIsolation: true` and `nodeIntegration: false`, this completes the three-leg renderer-isolation stool.

### Compatibility verified

The preload (`src/main/preload.ts`) only imports `contextBridge` + `ipcRenderer` from `electron` — both are on the sandbox allowlist per https://www.electronjs.org/docs/latest/tutorial/sandbox. Preload is already emitted as CommonJS via `electron.vite.config.ts` (`preload.output.format: 'cjs'`), which sandbox mode requires.

### Sources (all verified 200 via curl -sIL)

- https://www.electronjs.org/docs/latest/tutorial/security
- https://www.electronjs.org/docs/latest/tutorial/sandbox
- https://www.electronjs.org/docs/latest/api/browser-window

### Convergence check

H found, NOT converged. Proceeding to iter 12.

### Candidates considered but not picked this iter

| Candidate | Rating | Why not picked |
|-----------|--------|----|
| Diagnostics export (Cmd+Shift+E) | M | Lost to sandbox — security checklist item beat operator-convenience M. |
| `did-fail-load` dev-server fallback | M | Real value but dev-mode-only UX polish; lost to security checklist H. |
| Generic `safeHandle` IPC middleware | L | Same reasoning as iter 10 — handlers can't currently throw. |
| Other L items | L | Same as iter 10 list. |
| `shell.openPath` runbook opener | M (DEPENDS-BLOCKED) | Waits on PR #105. |
| IPC envelope parity | M (DEPENDS-BLOCKED) | Waits on PR #106. |

---

## Iter 12 — Single-instance lock + second-instance focus

| Field | Value |
|------|-------|
| Theme | `app.requestSingleInstanceLock()` + `second-instance` window-focus handler |
| Rating | MEDIUM |
| Independent | YES (orthogonal to iter 10 + iter 11) |
| Branch | `apex/loop-12-single-instance` |
| Base | `ui/apex-bento-app` @ `1b55750` |
| PR | https://github.com/ItsEliias/CyberOS/pull/114 |
| Files | `APEX Bento/src/main/main.ts` (1 file, +33/-10) |
| typecheck | PASS |
| build | PASS |
| APEX writes | 0 |
| Forbidden imports | 0 |

### Why rated MEDIUM (not HIGH)

Documented Electron pattern, prevents real on-disk state races between concurrent instances (acute once iter 5 / PR #107 window-state persistence lands), matches standard desktop UX. Not HIGH because the current base branch doesn't yet have stateful on-disk writes; the value is preemptive bug-prevention + UX polish rather than closing an open security hole.

### Sources (all verified 200 via curl -sIL)

- https://www.electronjs.org/docs/latest/api/app

### Convergence check

This iter's pick (M) signals the H pool has emptied at the base-branch baseline. The remaining pool after iter 12 contains only:

- Diagnostics export (M, speculative)
- `did-fail-load` dev-mode fallback (M, dev-only)
- A long tail of L items
- DEPENDS-BLOCKED items waiting on PR #105 / PR #106

This is the convergence signal — three batches in a row picked off all the H items, and batch 4 reached the bottom of the H pool by iter 12. **Next batch (batch 5) is likely the convergence stop unless PRs #103-#111 land first, which would unblock the DEPENDS-BLOCKED items.**

### Candidates considered but not picked this iter

| Candidate | Rating | Why not picked |
|-----------|--------|----|
| Diagnostics export (Cmd+Shift+E) | M | Speculative without support workflow; bigger surface (new IPC + menu + dialog). |
| `did-fail-load` dev fallback | M | Dev-mode-only UX polish; lost to documented-pattern stability fix. |
| `app.isPackaged` vs `NODE_ENV` | L | Defensive only; Electron docs are pragmatic not prescriptive. |
| `setSpellCheckerEnabled(false)` | L | No text inputs in the UI. |
| Other L items | L | Same as prior iters. |
