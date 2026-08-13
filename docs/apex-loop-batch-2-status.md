# APEX Loop — Batch 2 — Status

Agent: `apex-loop-batch-2` · started 2026-06-11

Cap: 3 iterations (iters 4-6 of the 15-cap). Convergence-stop allowed.
Base branch for iters: `ui/apex-bento-app` (PR #102 still OPEN to main; iters target the integration branch — same as batch 1).

---

## Iter 4

| Field | Value |
|-------|-------|
| Area | Fixture path env override + IPC structured-result envelope |
| Value | **HIGH** |
| Branch | `apex/loop-4-fixture-config-ipc-errors` |
| PR | https://github.com/ItsEliias/CyberOS/pull/106 |
| Base | `ui/apex-bento-app` |
| Sources | https://nodejs.org/api/process.html#processenv (200), https://www.electronjs.org/docs/latest/api/ipc-main (200), https://12factor.net/config (200) |
| Files touched | types.ts, main.ts, preload.ts, App.tsx, EdgeReplicationCard.tsx (5 files, +197/-18) |
| Build | typecheck PASS, build PASS (835 modules, 1.83s) |
| APEX trading-core touched | No (still only reads `APEX/build/prototype/tests/fixtures/jbecker_sample.json` — fixture file unchanged) |

Rationale: closes the silent-blank-card failure mode. Previously a hardcoded 6-level relative path forced operators with non-default APEX checkouts into a 0%-equity-curve dead state; the IPC handler caught all failures and returned `[]`, indistinguishable from "no data". Iter 4 adds the `APEX_BENTO_FIXTURE_PATH` env var (12-factor §III), upgrades the IPC handler to return a `JbeckerFixtureResult` discriminated union with three distinct failure reasons (`not_found | parse_error | read_error`) and a `default | env_override` source tag (per Electron IPC docs: throw-through is unsafe — return structured envelopes). The renderer branches on `fixture.ok`: success renders the card unchanged plus a Fixture Origin section in the drawer; failure renders a `FixtureErrorCard` with the warning pill, error message, resolved path, and a 3-step "How to fix" runbook.

Leftover from batch 1 (`shell.openPath` for runbook button) NOT chosen because it depends on iter 3 (PR #105) being available on the base, which is not the case (iter 3 is still in its own un-merged branch). Picking up `shell.openPath` would either require stacking on `apex/loop-3-gate-runbook-reference` (violating the "branch off `ui/apex-bento-app`" hard rule) or duplicating iter 3's runbook-panel diff (violating "self-contained per iter"). Defer until iter 3 lands.

---

## Iter 5

| Field | Value |
|-------|-------|
| Area | Window-state persistence (size + position + maximize across launches) |
| Value | **MEDIUM** |
| Branch | `apex/loop-5-window-state-persistence` |
| PR | https://github.com/ItsEliias/CyberOS/pull/107 |
| Base | `ui/apex-bento-app` |
| Sources | https://www.electronjs.org/docs/latest/api/browser-window (200), https://www.electronjs.org/docs/latest/api/app (200), https://www.electronjs.org/docs/latest/api/screen (200) |
| Files touched | main.ts (1 file, +112/-3) |
| Build | typecheck PASS, build PASS (835 modules, 2.12s) |
| APEX trading-core touched | No (writes to `app.getPath('userData')` only — never to any APEX path) |

Rationale: launching APEX Bento daily at the hardcoded 1280×820 default at OS-default position is operator friction. Iter 5 persists `getNormalBounds() + isMaximized()` to `userData/window-state.json` on `'close'` and restores on next `createWindow()`. Three safety properties: off-screen restore guard via `screen.getDisplayMatching()` (handles unplugged external monitor), saves `getNormalBounds()` not `getBounds()` (correct underlying restore-size when maximized), and versioned `{version:1, state}` envelope with shape validation (corrupt files fall back to defaults instead of crashing). One-file diff, scoped to `main.ts` only — no preload, types, renderer, or dependency changes.

---

## Iter 6

| Field | Value |
|-------|-------|
| Area | Header refresh button + Cmd/Ctrl+R re-fetch + last-refresh timestamp |
| Value | **MEDIUM** |
| Branch | `apex/loop-6-refresh-button` |
| PR | https://github.com/ItsEliias/CyberOS/pull/108 |
| Base | `ui/apex-bento-app` |
| Sources | https://react.dev/reference/react/useCallback (200), https://www.w3.org/WAI/ARIA/apg/patterns/button/ (200), https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy (200) |
| Files touched | App.tsx, globals.css (2 files, +129/-5) |
| Build | typecheck PASS, build PASS (835 modules, 1.78s) |
| APEX trading-core touched | No (only re-invokes existing read-only IPC handlers) |

Rationale: on the integration branch APEX Bento fetches data exactly once on mount and never re-fetches — making an "observability dashboard" that doesn't actually observe. Iter 6 extracts the fetch into a `refresh(isInitial)` `useCallback`, adds a header `⟳` button with full ARIA semantics (aria-label, aria-busy, focus-visible), binds Cmd/Ctrl+R via document `keydown` handler with `preventDefault` (so it re-fetches instead of triggering a full renderer reload that would wipe component state + open drawers), surfaces a live `last refresh HH:MM:SS` timestamp, de-dupes concurrent refreshes via `refreshingRef`, and adds a spin keyframe animation that respects `prefers-reduced-motion: reduce` per WCAG 2.3.3 (matching iter 2's accessibility semantics).

---
