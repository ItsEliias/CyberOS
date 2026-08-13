# APEX Loop — Batch 4 — Summary

Agent: `apex-loop-batch-4` · 2026-06-11

## Result: 3 iterations executed, all shipped as separate PRs. No convergence stop. No failed iters.

| # | Theme | Value | Files | PR | Build |
|---|-------|-------|-------|----|----|
| 10 | Deny renderer permission requests by default (allowlist `clipboard-sanitized-write` for own origin) | HIGH | 1 (+59/-1) | https://github.com/ItsEliias/CyberOS/pull/112 | PASS |
| 11 | Enable OS-level renderer process sandbox (`sandbox: true`) | HIGH | 1 (+9/-1) | https://github.com/ItsEliias/CyberOS/pull/113 | PASS |
| 12 | Single-instance lock + `second-instance` window focus | MEDIUM | 1 (+33/-10) | https://github.com/ItsEliias/CyberOS/pull/114 | PASS |

Total: **3 file edits** (all to the same file `APEX Bento/src/main/main.ts` — but on three separate branches so zero in-batch conflict), **+101 net lines**, **0 lines written to APEX trading-core**, **0 imports from forbidden paths**.

## Theme: Electron security checklist completion

Batch 4 is the "security checklist" batch. Two of the three iters (10 + 11) close items directly named on Electron's official security tutorial at https://www.electronjs.org/docs/latest/tutorial/security:

- Item: "Handle session permission requests" → iter 10 (PR #112)
- Item: "Enable process sandboxing" → iter 11 (PR #113)

The third iter (12, single-instance lock) is a documented Electron stability pattern that also prevents real on-disk state races in iter 5 / PR #107.

After batch 4, the only Electron security-checklist items that remain unaddressed are (a) CSP — already in place via `<meta http-equiv="Content-Security-Policy">` in `index.html` since the initial APEX Bento commit, and (b) `setOpenWindowHandler` deny — already in place since the initial commit. APEX Bento is now substantively compliant with Electron's documented security recommendations.

## Base branch

All three iters branched off `origin/ui/apex-bento-app` at `1b55750`. Per the hard rule "Per iter: `git checkout ui/apex-bento-app && git pull && git checkout -b apex/loop-<n>-<area>`."

## Same-file conflict risk between batch-4 PRs

All three iters edit `APEX Bento/src/main/main.ts`, but each edits a different region:

| PR | main.ts region edited | First/last line on base |
|----|----------------------|-------------------------|
| #112 (iter 10) | New section `setupPermissions()` between IPC handlers and Window; `session` added to top-level `electron` import; `setupPermissions()` called inside `whenReady` body | New section ~124-180; import line 1; call inside whenReady ~166 |
| #113 (iter 11) | `BrowserWindow.webPreferences.sandbox` single flag flipped + 6-line comment block | Lines 140-146 |
| #114 (iter 12) | New `requestSingleInstanceLock` block wrapping the existing app-lifecycle section | Lines 163-176 |

Conflict matrix:
- **#112 vs #113**: zero overlap. PR #112 doesn't touch webPreferences; PR #113 doesn't touch the IPC/permission section.
- **#112 vs #114**: PR #112 adds a call to `setupPermissions()` inside `app.whenReady()`. PR #114 wraps the `app.whenReady()` block inside an `if (gotTheLock) else` structure. Trivial rebase — the `setupPermissions()` call line lands inside #114's wrapped block.
- **#113 vs #114**: zero overlap (webPreferences vs lifecycle wrap).

All three are mergeable in any order with at most a 1-line context-shift rebase on the #112 + #114 pair.

## Cross-batch conflict matrix (main.ts touchpoints across all 12 iters)

| Iter (PR) | main.ts region |
|-----------|----------------|
| 4 (#106) | IPC handler block + fixture path constant + types import |
| 5 (#107) | createWindow body (window-state persistence helpers + bounds restore + 'close' listener) |
| 7 (#109) | New menu region before whenReady; `Menu.setApplicationMenu(buildMenu())` call inside whenReady |
| 10 (#112) | New `setupPermissions` region; `session` import; `setupPermissions()` call inside whenReady |
| 11 (#113) | `webPreferences.sandbox` single line + comment |
| 12 (#114) | Top-level lifecycle wrap in `if (gotTheLock) { ... } else { app.quit() }` |

All six regions are non-overlapping. Iter 11's sandbox flip is on a specific `webPreferences` field that no other iter touches. Iter 12's wrap captures any other in-place edits inside its `else` branch — trivial 1-line indentation contexts. Iter 10 adds three call sites (`setupPermissions()` inside whenReady, plus its own function) that don't intersect with the others.

The merger sequence with minimal conflicts is:
1. Land #112 + #113 + #114 in any order (independent regions)
2. Land #106 + #107 + #109 after the batch-4 trio (rebases pick up the `if (gotTheLock)` indentation context but no real content conflict)

## Deferred / not-picked candidates after batch 4

| Candidate | Status |
|-----------|--------|
| Diagnostics export (Cmd+Shift+E JSON snapshot) | M, deferred. Lost across all three batches. Speculative without a forcing support workflow. |
| `did-fail-load` dev-server fallback page | M, deferred. Dev-mode-only UX polish. |
| Generic `safeHandle` IPC error-handling middleware | L (independent of iter 4). In-memory handlers can't throw uncaught. |
| `shell.openPath` runbook opener | M (DEPENDS-BLOCKED) — waits on PR #105. |
| IPC envelope parity for 5 handlers | M (DEPENDS-BLOCKED) — waits on PR #106. |
| Theme switcher infrastructure | L — wiring without payoff. |
| Card focus order persistence | L. |
| Onboarding tour | L. |
| Search across 6 cards | L. |
| Banner expand-on-click | L. |
| `app.isPackaged` over `NODE_ENV` | L — defensive only; Electron docs pragmatic not prescriptive. |
| `setSpellCheckerEnabled(false)` | L — no text inputs. |
| `webviewTag` / `nodeIntegrationInWorker` / `nodeIntegrationInSubFrames` explicit defaults | L — all default-safe in current Electron. |

## Sources cited (all verified resolving 200 via `curl -sIL` at commit time)

Iter 10:
- https://www.electronjs.org/docs/latest/tutorial/security
- https://www.electronjs.org/docs/latest/api/session
- https://www.electronjs.org/docs/latest/api/web-contents

Iter 11:
- https://www.electronjs.org/docs/latest/tutorial/security
- https://www.electronjs.org/docs/latest/tutorial/sandbox
- https://www.electronjs.org/docs/latest/api/browser-window

Iter 12:
- https://www.electronjs.org/docs/latest/api/app

## Convergence / cap reason

Stopped at the 3-iter cap, **not** at convergence — but the H pool has emptied at the base-branch baseline. Iter 12's M pick was deliberate (genuine value + Electron-documented + atomic) rather than the highest H available. The remaining candidate pool:

- **No H items** that are independent and unblocked at the base branch
- **2 M items** (diagnostics export, did-fail-load fallback) — both have caveats noted above
- **A long tail of L items**
- **2 M (DEPENDS-BLOCKED) items** awaiting PR #105 and #106 to merge

**Forecast for any future batch 5:** likely converges (no H/M independent) unless prior PRs land first. If PR #105 and #106 land, the DEPENDS-BLOCKED M items become eligible. If iter 5 (PR #107) lands, the case for diagnostics export strengthens (because window-state is now operator-relevant state worth dumping). If none of those PRs land, batch 5 should convergence-stop and write `docs/apex-loop-converged.md`.

Cumulative usage: **12 of 15 iterations**. **3 iterations remain** within the 15-cap.

## Hard-rule audit (batch 4)

| Rule | Compliance |
|------|------------|
| Branch-only, never commit to main | PASS — all 3 iters on `apex/loop-N-*` branches |
| Green before PR | PASS — typecheck + build green on every iter |
| Self-contained per iter | PASS — every PR is one bounded edit to `main.ts`; each branched off `ui/apex-bento-app` directly, not off any other iter branch |
| No stacking on prior iter branches | PASS |
| APEX trading-core READ-ONLY | PASS — zero writes to any APEX path. Iter 10 reads `webContents.getURL()` for origin checks; iter 11 changes a config flag; iter 12 calls Electron app-lifecycle APIs. Nothing touches the APEX repo. |
| No forbidden imports | PASS — only `electron`, `path`, `url`, `fs` (the existing imports from the base) |
| No capital / trades / credentials | PASS — security and stability hardening only |
| One theme per iteration | PASS |
| Sourced or doesn't ship | PASS — every iter cites Electron docs URLs, all verified 200 via `curl -sIL` |
| Convergence stop check ran | PASS — H/M/L rating performed on every iter; iter 12 explicitly noted the H pool draining |
| Value rating per iter | PASS |
| Didn't ship L-value churn to hit 3 | PASS — iter 12 is genuine M (Electron-documented pattern), not filler |

## Files touched (union across all 3 iters)

```
APEX Bento/src/main/main.ts  (iter 10, iter 11, iter 12 — different regions per branch)
```

One file, three non-overlapping regions, three separate branches.

## Stacking notes for `overnight-reviewer`

All three batch-4 PRs are OPEN against `ui/apex-bento-app`. None have been merged. See "Same-file conflict risk between batch-4 PRs" table above — all three land in any order with at most a 1-line indentation context shift between #112 and #114.

Recommended merge order across all 12 open PRs (incorporating batch 4):

1. #103 (iter 1, a11y) — most files; land first
2. #104 (iter 2, motion + live region)
3. #105 (iter 3, runbook reference) — unlocks `shell.openPath` candidate
4. #113 (iter 11, sandbox) — single-line config flip; lowest conflict surface
5. #112 (iter 10, permissions) — adds setup function + import
6. #106 (iter 4, fixture env + IPC envelope) — unlocks IPC envelope parity candidates
7. #114 (iter 12, single-instance lock) — wraps the lifecycle block; lands well after the setup functions are in place
8. #107 (iter 5, window-state) — depends on #114 for race protection in practice (though merge-clean either way)
9. #108 (iter 6, refresh)
10. #109 (iter 7, menu)
11. #110 (iter 8, ErrorBoundary)
12. #111 (iter 9, dt-util)
