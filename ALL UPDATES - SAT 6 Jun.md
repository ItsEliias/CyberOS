# CyberOS — All Updates · Saturday 6 June 2026

Comprehensive log of everything shipped in today's session. Commits land on
`auto-design`, get merged to `main`, and pushed to
`https://github.com/ItsEliias/CyberOS.git`.

`main` HEAD at write-time: **`7b23a9d`**.

---

## 1 · Black-screen render fixes (6 apps)

Most apps in the ecosystem opened with a black window when launched from the
Launcher. Root causes were a mix of CSP, build, and React-mount bugs.

| App | Root cause | Fix |
|---|---|---|
| GhostVault | CSP `script-src 'self'` (no `'unsafe-eval'`) | Added `'unsafe-eval'` + `font-src` |
| SignalBoard | CSP missing `'unsafe-eval'` **AND** preload emitted as ESM `.mjs` due to `package.json "type":"module"` → async preload race, `window.electronAPI` undefined when bootstrap useEffect ran | Forced preload format to `cjs` / `.cjs`, updated `main.ts` to load `preload.cjs` |
| NetworkMap | Same CSP + missing `postcss.config.js` + `tailwind.config.js` pointed to `../../design-system/...` instead of `../design-system/...` | All three fixed |
| PlaybookStudio | Same CSP + missing `postcss.config.js` | Both fixed |
| ReportForge | Same CSP | Added |
| VaultCore | Boot `useEffect` had no `.catch`, dashboard `vaultStats.totalNotes.toLocaleString()` crashed when `totalNotes` undefined | `.catch` guard, `?.` optional chaining |

10 diagnostic agents in parallel pinpointed each. All apps now render.

## 2 · Launcher arm64 fix

`findAppBundle` in the Launcher walked `dist/` in alphabetical order and picked
the x64 `mac/` build before the arm64 one. Switched to prefer `mac-arm64`.

## 3 · CredVault Dashboard + Password Generator + "Needs attention"

CredVault's post-unlock screen was sparse. Built:
- **`VaultDashboard.tsx`** — right-pane content when no credential is selected:
  4 stat cards (Credentials / Strong passwords / Breached / Pending imports),
  Quick Actions (Add / Generate / Import / HIBP), Recently used list,
  Security tip card.
- **"Needs attention"** weakest-passwords list (5 lowest scoring entries,
  click to jump to credential).
- **`PasswordGeneratorModal.tsx`** — length slider, char-class toggles,
  ambiguous filter, live strength meter, Copy + Use-in-new-credential
  handoff. Uses `crypto.getRandomValues` with modulo-bias rejection.

## 4 · Distinct app icons (12 apps + Launcher)

Generated rounded-square `.icns` per app using PIL + `iconutil` from a
2-letter monogram and the app's accent color:

CV peach · GV blue · VC green · SB red · NM amber · PB blue · TL matrix-green
· NL purple · RD amber · RF green · CL purple · CT (launcher) purple.

Wired into each `package.json`'s existing `build.mac.icon` path (`assets/icon.icns`
or `assets/logo.icns`).

## 5 · Red X actually quits

Overrode the macOS dock-survival convention in every app — `window-all-closed`
handler now calls `app.quit()` unconditionally. VaultCore additionally had a
`window.on('close')` that hid-to-tray; removed.

## 6 · CamelCase product names

- `VAULTCORE` → `VaultCore`
- `CYBERLAB COMPANION` → `CyberLab Companion`
- `TerminalLink` → `TermLink` (rebranded; dir stays `TerminalLink`)

Launcher `APP_FALLBACK_PRODUCTS`, tray menu, and `launchApp` `appName` strings
all updated to match.

## 7 · Launcher minimize button + tray menu cleanup

- Header gained a minimize button (uses existing `hide-panel` IPC).
- Tray menu labels lost the redundant `Open ` prefix.
- `/Applications/{productName}.app` fallback when config has no `execPath` so
  tray clicks actually launch the apps (was silently no-op'ing for fresh
  installs).
- Greyed-out unavailable apps in the menu.

## 8 · Phase 1 swarm features (4 parallel agents)

### SignalBoard custom feeds (`#ff6b6b`)
- New `feeds.ts` exports `probeFeed(url)` (auto-detects RSS vs Atom via
  `fast-xml-parser`, pulls the feed's `<title>`).
- New `CustomFeedsEditor.tsx` in Settings: add URL, status dot, enable/disable
  per feed, remove. Validates URL shape + dedupes.
- Custom feeds reuse the existing `FeedSource` pipeline (`addSource` mints
  ids as `custom-${Date.now()}`); items merge into the main feed automatically.
- Items rendered with a coral "Custom" badge to distinguish from built-in.

### VaultCore scheduled-scrape UI (`#3fb950`)
- `ScheduleModal.tsx`: enable toggle, 5 cron presets (Every 15 min, Hourly,
  Daily 9am, Daily midnight, Weekly Mon 9am) + custom cron input + live
  next-run preview via `cron-parser`, conflict strategy (skip / overwrite /
  append), Run-now button.
- Per-row "Next run: in 2h 14m" subtitle, 2 s polling for the
  in-progress scrape pulse, 30 s refresher for relative times.
- New IPC: `update-source-schedule`, `get-active-scrape`,
  `compute-next-run`.
- Added `cron-parser` dependency.

### TermLink external shell hook (`#00ff41`)
- Opt-in "External Shell Hook" Settings section with multi-select for
  zsh / bash / fish.
- Per-shell snippet wrapped in `# >>> CYBERTOOLS-TERMLINK-HOOK >>>` /
  `# <<< CYBERTOOLS-TERMLINK-HOOK <<<` markers; idempotent install
  + clean uninstall (strips the marker block precisely).
- zsh: `add-zsh-hook preexec`; bash: `trap _cybertools_termlink_debug DEBUG`;
  fish: `function … --on-event fish_preexec`.
- Each shell writes JSONL records `{ts,cwd,cmd,shell,pid}` to
  `~/.cybertools/term-log.jsonl`.
- Main process tails the file via `fs.watch` + 1 s `setInterval`, ingests
  each new line through the existing `log-commands` pipeline tagged
  `source:'external'`.

### CyberLab Companion HTB + TryHackMe API (`#b44fff`)
- New `platforms.ts` with HTB v4 fetchers (`/user/info`, `/machine/active`,
  `/profile/progress/machines/os/{id}`, `/profile/activity/{id}`) and THM
  best-effort `/api/user` + `/api/user/{username}`.
- Tokens stored encrypted via Electron `safeStorage` at
  `~/.cyberlab-companion/htb-token.enc` and `thm-token.enc`. Plain-text
  base64 fallback when `safeStorage` unavailable.
- `ApiConnections.tsx`: Save & Connect / Test / Refresh / Disconnect
  per platform.
- `PlatformStatsBlock` on Stats view — 5 min poll, refresh button.
- HTB active machine name written to
  `shared_context.activeLab` so ReconDesk and TermLink pick up the lab
  automatically.
- All HTTP calls wrapped in try/catch + `AbortController` (15 s timeout);
  401/403 surfaces "token rejected" clearly without crashing.

## 9 · Phase 2 foundation (led myself)

### CredVault SSO + 2FA + Recovery key
- New `src/main/security.ts`: shared SSO state writer, TOTP (RFC 6238 /
  SHA-1 / 6-digit / 30 s step) with our own base32 codec, recovery key
  generator (240-bit, 8 × 6 base32 groups, PBKDF2-hashed for verify).
- IPC: `vault:totp-{status,setup,confirm,disable,verify}`,
  `vault:recovery-{status,generate,verify}`, `sso:refresh`.
- Unlock now returns `twoFactorRequired`; LockScreen shows a 6-digit
  prompt before completing the session when TOTP is enabled.
- New Settings `SecuritySection` handles 2FA setup (`otpauth://` URI +
  base32 secret display) and Recovery Key generation with copy /
  download / "I've saved it" flow.
- Lock ends the SSO session; unlock begins it.

### ReconDesk → CredVault auto-link with lab folders
- ReconDesk's `credential-tracker.ts` reads
  `shared_context.activeLab` and tags every new `PendingCredential` with
  `lab` + `suggestedFolder = "Labs / {activeLab || targetName}"`.
- CredVault's approval flow pre-fills `folder` and `labName` from the
  pending entry. Emits `recondesk.credential.found` event.

### Universal activity feed
- Launcher `ActivityFeed.tsx` normalises both bus field shapes
  (`appName`/`eventType` and legacy `app`/`event`).
- 12-app color/label registry, friendly labels for ~25 event types with
  data interpolation (e.g. "Scrape complete: HN (12 new, 3 updated)").
- Per-app filter chips, click-to-expand JSON payload, cap raised to 100.

## 10 · HelpTip `?` tooltip pass (8 apps · 4 parallel agents)

Every major feature block in CredVault, Launcher, NetLab, ReportForge,
NetworkMap, PlaybookStudio, GhostVault, and ReconDesk now has a small
`?` icon that opens a 240-260 px popover with a 1-2 sentence explanation.

CDP verification confirmed 5-12 tooltip triggers per app in the live DOM.

## 11 · ⌘K command palette — Launcher first

- `CommandPalette.tsx` overlay: search input, grouped sections (App /
  Action / Settings), ↑↓ navigate, ↵ run, ⎋ close.
- Global ⌘K shortcut shows panel if hidden then sends
  `command-palette:toggle`; renderer also handles in-window ⌘K so the
  palette works even when the global shortcut is blocked.
- Commands: open every installed app via existing `launchApp` IPC,
  Run VaultCore update, Refresh app statuses, Minimise launcher,
  Open Launcher settings. Reads live install status so "Not installed"
  hints stay accurate.

## 12 · Backup framework + cloud sync stub

Settings → Backup tab:

- Opt-in toggle (default off) — forces folder pick on enable.
- "Back up now" → `tar.gz` of `~/cybertools-config.json` + every
  CyberOS app's Application Support dir + `~/.cybertools/`. Stored to
  the chosen folder as `cyberos-backup-{ISO}.tar.gz`.
- "Restore from file…" → file picker, `tar -xzf` into `$HOME` so paths
  land back where the apps look for them.
- Emits `launcher.backup.created` / `launcher.backup.restored` events
  on the ecosystem bus.

Cloud sync stub: opt-in toggle + provider picker (iCloud / Dropbox /
Google), explicitly labelled "integration not yet shipped" so the user
isn't misled — provider integrations are deferred until credentials
are available.

## 13 · Backup encryption (AES-GCM) + scheduling

- New `Encrypt snapshots` toggle. When on, snapshots are wrapped in
  AES-256-GCM with a PBKDF2-derived (200k iters, SHA-256) key over
  the tar.gz, written as `cyberos-backup-{ISO}.cyberos-backup`.
- File format: 4-byte `CBKP` magic + 16-byte salt + 12-byte IV +
  16-byte GCM auth tag + ciphertext. Import auto-detects via the
  magic header and prompts for the password.
- Restore validates the auth tag — wrong password surfaces a clear
  error.

Scheduling:

- Daily / weekly / manual frequency picker.
- Launcher main starts a scheduler that checks every 30 min: if
  elapsed since `lastRun` > frequency interval, runs a snapshot
  in-place.
- Scheduled encrypted backups need a password — added a "Save
  scheduled password" affordance that stashes the password via
  `safeStorage` (macOS keychain) with Clear + status badge.
- Scheduler updates `backup.lastRun` and broadcasts the updated config
  to the renderer so the UI badge stays fresh.

## 14 · ⌘K command palette in every app (swarm of 4 agents → 11 apps)

Each app gets a self-contained `CommandPalette.tsx` tinted to its
accent. Command sets cover:

| App | Highlights |
|---|---|
| **CredVault** | Add credential · Generate password · Run HIBP · Lock vault · view switchers · Copy username/password of last-used · fuzzy `Open: <service>` |
| **VaultCore** | view switchers · Run all scrapes · Refresh stats · Pause/Resume schedules · `Run: <source>` |
| **GhostVault** | New note · Quick capture · Search · view switchers · Switch theme (4) · Switch personality (4) · `Open: <title>` |
| **SignalBoard** | Refresh feeds · Add custom feed (scrolls to settings section) · Mark all read · severity filter toggles · `Open: <feed item>` |
| **NetworkMap** | New empty graph · Import scan · Clear filters · Toggle minimap · `Open graph: <name>` |
| **PlaybookStudio** | New playbook · view switchers · Run current playbook · Export to ReportForge · Open templates · `Open: <playbook>` |
| **TermLink** | New session · Toggle split / broadcast · navigation · "Run snippet" (from store) · "Connect via SSH" (from profiles). Reused existing component, swapped trigger to ⌘K (was ⌘⇧P). |
| **NetLab** | New lab · Start/Pause/Resume current · Mark step complete · `Open: <lab>` |
| **ReconDesk** | New target · 7 tab switchers · Run port scan (opens nmap import) · Export current target · `Open: <name> (<ip>)`. Moved GlobalSearch from ⌘K to ⌘⇧F. |
| **ReportForge** | New report · view switchers · Export current (Markdown / PDF) via existing flow · Add section · Add finding · `Open: <title>` |
| **CyberLab Companion** | Refresh platform stats · 14 panel jumps · Connect HackTheBox / TryHackMe (scrolls to ApiConnections) · Start session · Mark current lab complete · `Open: <lab>` |

## 15 · SSO soft-lock chain (GhostVault + VaultCore)

- Each app exposes `getSSO` + `openCredVault` IPCs reading the shared
  `cybertools-config.json` `sso` field.
- Settings: "Require CredVault session" toggle (default off).
- When on AND CredVault SSO state shows locked or expired, an
  `SSOLockScreen` overlay covers the app with the explanation, an
  "Open CredVault" jump button, and a manual "Check again" button.
- State polled every 5 s; when CredVault unlocks, the lock screen
  dissolves on its own.
- Honest threat model: this is a UI gate, not vault-key gating.
  Defends against friends / shoulder surfers, not attackers with file
  access.

## 16 · Tray-menu per-app action submenus (11-app consumer swarm)

Launcher tray menu now shows submenus per installed app with quick
actions on top of "Open":

- **CredVault**: Add credential · Generate password · Run HIBP · Lock vault
- **VaultCore**: Run all scrapes · Refresh stats
- **GhostVault**: New note · Quick capture
- **SignalBoard**: Refresh feeds · Add custom feed
- **NetworkMap**: New empty graph · Import scan
- **PlaybookStudio**: New playbook
- **TermLink**: New session
- **NetLab**: New lab
- **ReconDesk**: New target
- **ReportForge**: New report
- **CyberLab Companion**: Refresh platform stats

Click writes a `pending_actions` array entry to
`~/cybertools-config.json` `{ app, action, requestedAt }`, then launches
the app. Each app's main process consumes the matching entry 800 ms
after `ready-to-show` / `did-finish-load`, sends a `pending-action`
IPC to the renderer, which dispatches the same code path the in-app ⌘K
palette uses. CredVault buffers non-lock actions in a ref when the
vault is still locked and flushes them 200 ms after unlock so
first-time tray clicks aren't dropped.

## Brainstorm scoreboard

The full list of items from the user's brainstorm earlier and their
state:

| # | Item | State |
|---|---|---|
| 1 | SSO + 2FA | ✅ TOTP + SSO state + GhostVault/VaultCore soft-lock |
| 2 | Recovery Key | ✅ |
| 3 | Auto-lock | ✅ broadcast + soft-lock listeners |
| 4 | Command palette | ✅ Launcher + 11 apps |
| 5 | Universal activity feed | ✅ |
| 6 | Recon → CredVault | ✅ with `Labs / {lab}` folders |
| 7 | Backups | ✅ plain + encrypted + scheduled |
| 8 | Cloud sync | ⚠ opt-in stub only (deferred — no provider credentials) |
| 9 | Profile system | ❌ skipped per user |
| 10 | VaultCore scrape scheduler UI | ✅ |
| 11 | SignalBoard custom feeds | ✅ |
| 12 | CyberLab HTB / TryHackMe API | ✅ |
| 13 | TermLink shell hook | ✅ |
| – | Bonus `?` tooltips | ✅ all apps |
| – | Tray-menu action submenus | ✅ (new today) |

## Verification snapshot

End-to-end CDP / screenshot verification on all 12 apps confirmed:

- All apps render correctly (no JS errors)
- New components present in DOM (Dashboard, Custom Feeds, ApiConnections,
  ScheduleModal, External Shell Hook section, HelpTips, CommandPalette,
  BackupSection, SSOLockScreen, tray pending-action consumers)
- All apps installed as arm64 in `/Applications`
- CamelCase names across the board

## Commits today (auto-design / main)

```
7b23a9d Merge auto-design: tray-menu per-app action submenus
cef0f01 CyberOS: tray-menu per-app action submenus + 11-app consumer pipeline
acca2e3 Merge auto-design: per-app ⌘K palettes + SSO soft-lock chain
c8f461a CyberOS: per-app ⌘K command palettes + SSO soft-lock chain
ed7326c Launcher: backup encryption (AES-GCM) + scheduled snapshots
cb4f642 Merge auto-design: ⌘K command palette + backup framework
8936c54 Launcher: ⌘K command palette + backup framework + cloud sync stub
270ed82 Merge auto-design: HelpTip ? tooltips across 8 apps
efd7c8b CyberOS: HelpTip "?" tooltip pass across 8 remaining apps
06a7fe9 Merge auto-design: Phase 1+2 swarm output
26a5a43 CyberOS: SSO foundation, custom feeds, HTB/THM API, scheduler UI,
        shell hook, universal activity feed, recon→CredVault auto-link
02d5bab CyberOS: consistent CamelCase product names + Launcher minimize button
1e30549 Merge auto-design: app icons + CredVault polish + Launcher tray fix
3f8eaeb CyberOS: app icons + CredVault polish + Launcher tray fix
09859bc Merge auto-design: launcher arm64 fix, 7 app render fixes, X-quits-app
73f5b1f CyberOS: red X actually quits app (was hiding on macOS)
d9bb5e9 CyberOS: fix black-screen rendering across 6 apps + launcher arm64
```

— End of doc. Autonomous improvement loop continues from here.
