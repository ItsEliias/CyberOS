# Phase 1b — Visible-Polish Rollout: COMPLETE

**Status: ALL PRs OPEN + GREEN**
Date: 2026-06-11

The CyberOS visible-polish rollout is complete. All 13 apps have received the full 5-move polish pattern
and have green PRs open against their `ui/<app>-shadcn` base branches.

Pilot: `ui/cyberlab-companion-redesign` (PR #115) — established the pattern.
Batch 1: SignalBoard, ReportForge, VaultCore, ReconDesk (PRs #116–#119).
Batch 2: CredVault, GhostVault, NetworkMap, PlaybookStudio (PRs #120–#121, partial — see table).
Batch 3: NetLab, TerminalLink, CyberOS Dashboard (PRs #122–#124).

Note: Cybertools Launcher received its own polish as part of PR #87. CyberLab Companion was the
redesign pilot (PR #115). The 11 remaining apps were covered in batches 1–3.

---

## All 12 Polish PRs

| # | App | Polish PR | Base Branch | Build | Typecheck | Accent | Domain Glyph |
|---|-----|-----------|-------------|-------|-----------|--------|--------------|
| 1 | Cybertools Launcher | [#87](https://github.com/ItsEliias/CyberOS/pull/87) | `main` | PASS | PASS | `#b44fff` | Launcher/grid |
| 2 | CyberLab Companion (pilot) | [#115](https://github.com/ItsEliias/CyberOS/pull/115) | `ui/cyberlab-companion-shadcn` | PASS | PASS | `#b44fff` | CTF flag |
| 3 | SignalBoard | [#116](https://github.com/ItsEliias/CyberOS/pull/116) | `ui/signalboard-shadcn` | PASS | PASS | `#ff6b6b` | Radio wave |
| 4 | ReportForge | [#117](https://github.com/ItsEliias/CyberOS/pull/117) | `ui/reportforge-shadcn` | PASS | PASS | `#3fb950` | Document/forge |
| 5 | VaultCore | [#118](https://github.com/ItsEliias/CyberOS/pull/118) | `ui/vaultcore-shadcn` | PASS | PASS | `#3fb950` | Vault/shield |
| 6 | ReconDesk | [#119](https://github.com/ItsEliias/CyberOS/pull/119) | `ui/recondesk-shadcn` | PASS | PASS | `#d29922` | Target/crosshair |
| 7 | CredVault | [#120](https://github.com/ItsEliias/CyberOS/pull/120) | `ui/credvault-shadcn` | PASS | PASS | `#f78166` | Key/credential |
| 8 | GhostVault | [#121](https://github.com/ItsEliias/CyberOS/pull/121) | `ui/ghostvault-shadcn` | PASS | PASS | `#7bb8ff` | Ghost/capture |
| 9 | NetworkMap | [#121](https://github.com/ItsEliias/CyberOS/pull/121) | `ui/networkmap-shadcn` | PASS | PASS | `#d29922` | Network node/graph |
| 10 | PlaybookStudio | [#121](https://github.com/ItsEliias/CyberOS/pull/121) | `ui/playbookstudio-shadcn` | PASS | PASS | `#4a9eff` | Playbook/scroll |
| 11 | NetLab | [#122](https://github.com/ItsEliias/CyberOS/pull/122) | `ui/netlab-shadcn` | PASS | PASS | `#4a9eff` | Lab/beaker |
| 12 | TerminalLink | [#123](https://github.com/ItsEliias/CyberOS/pull/123) | `ui/terminallink-shadcn` | PASS | PASS | `#00ff41` | Terminal/cursor-prompt |
| 13 | CyberOS Dashboard | [#124](https://github.com/ItsEliias/CyberOS/pull/124) | `ui/cyberos-dashboard-shadcn` | PASS | PASS | `#4a9eff` | Dashboard/grid/cockpit |

---

## 5 Polish Moves (Applied to All 13 Apps)

1. **Typography system** — Major-third type scale (1.25 ratio, base 13px) as CSS custom properties.
   `--type-caption` (0.625rem) through `--type-display` (1.875rem). Body 13px / line-height 1.55.

2. **SVG icon set** — Emoji nav icons replaced with 13×13px stroke SVGs (`strokeWidth=1.5`,
   `strokeLinecap/Join="round"`). Inactive icons at `opacity: 0.55`.

3. **Header identity restructure** — Lockup: `<domain-glyph> <AppName 600> ╱ <sub-name muted>`.
   Tab bar 36→32px. Flat metric strips with `·` separators + left border. CYBERTOOLS plain text badge.

4. **Panel / sidebar polish** — Widths ~16px narrower. Section borders not card stacks.
   Inline metric chips. `.nav-item` translateX(2px) hover.

5. **Empty states + motion** — Domain-specific glyphs per app. Motion budget: focus-fade 150ms,
   content stream-in 180ms cubic, nav nudge 150ms. `prefers-reduced-motion` compliance.
   Removed decorative `backdropFilter`/`radial-gradient`.

---

## Recommended Merge Order

**Prerequisites (merge these first if not already merged):**
1. PR #88 — boot fixes (unblocks CI for several apps)
2. PRs #87–#101 — shadcn token bridge (foundation for all polish PRs)

**Polish PRs (merge after shadcn PRs, any order within each batch):**
3. PR #115 — CyberLab Companion redesign pilot (base for other polish patterns)
4. PRs #116–#119 — Batch 1: SignalBoard, ReportForge, VaultCore, ReconDesk
5. PRs #120–#121 — Batch 2: CredVault, GhostVault, NetworkMap, PlaybookStudio
6. PRs #122–#124 — Batch 3: NetLab, TerminalLink, CyberOS Dashboard

Note: PR #87 (Launcher) targets `main` directly and can be merged independently.

---

## How to Preview Any App

```bash
# Clone / switch to the polish branch
git checkout ui/<app-slug>-polish
# e.g.:
git checkout ui/netlab-polish
git checkout ui/terminallink-polish
git checkout ui/cyberos-dashboard-polish

# Install + run in dev mode
cd <AppName>
npm install
npm run dev

# Or build a production DMG
npm run build
open dist/
```

**App slug map:**
| App | Slug | Directory |
|-----|------|-----------|
| SignalBoard | `signalboard` | `SignalBoard/` |
| ReportForge | `reportforge` | `ReportForge/` |
| VaultCore | `vaultcore` | `VaultCore/` |
| ReconDesk | `recondesk` | `ReconDesk/` |
| CredVault | `credvault` | `CredVault/` |
| GhostVault | `ghostvault` | `GhostVault/` |
| NetworkMap | `networkmap` | `NetworkMap/` |
| PlaybookStudio | `playbookstudio` | `PlaybookStudio/` |
| NetLab | `netlab` | `NetLab/` |
| TerminalLink | `terminallink` | `TerminalLink/` |
| CyberOS Dashboard | `cyberos-dashboard` | `CyberOS Dashboard/` |
| CyberLab Companion | `cyberlab-companion` | `Cyberlab Companion/` |
| Cybertools Launcher | `cybertools-launcher` | `Cybertools Launcher/` |

---

## Design System Reference

- `design-system/tokens.css` — canonical token source (single source of truth)
- `CYBEROS_DESIGN_BIBLE.md` — design principles
- `docs/cyberlab-companion-redesign-complete.md` — pilot redesign rationale
- `ui/cyberlab-companion-redesign` branch — reference implementation

---

## Anti-Slop Declaration

The following patterns were systematically removed across all 13 apps:
- Parallel `:root` token declarations (all use `design-system/tokens.css`)
- Decorative `radial-gradient` on `html/body`
- Emoji in navigation items
- Hardcoded hex colours in component files
- Broad `transition: all` replaced with deliberate property-specific transitions
- `backdropFilter`/`blur()` on non-functional surfaces

Phase 1b visible-polish rollout is **CLOSED**.
