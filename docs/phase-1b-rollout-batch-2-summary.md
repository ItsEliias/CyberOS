# Phase 1b Rollout — Batch 2 Summary

Agent: `ui-rollout-batch-2`
Date: 2026-06-11
Pattern source: PR #87 (Launcher pilot) + batch-1 PRs #90-#93

## PRs opened

| App | PR | Branch | Status |
|-----|----|--------|--------|
| CredVault | [#94](https://github.com/ItsEliias/CyberOS/pull/94) | `ui/credvault-shadcn` | Open, build green, typecheck pass |
| GhostVault | [#95](https://github.com/ItsEliias/CyberOS/pull/95) | `ui/ghostvault-shadcn` | Open, build green, typecheck pass |
| NetworkMap | [#96](https://github.com/ItsEliias/CyberOS/pull/96) | `ui/networkmap-shadcn` | Open, build green, typecheck blocked by PR #88 |
| PlaybookStudio | [#97](https://github.com/ItsEliias/CyberOS/pull/97) | `ui/playbookstudio-shadcn` | Open, build green, typecheck pass |

## Totals

- Apps migrated: 4 / 4
- Failures: 0
- Total anti-slop affordances deleted: 16 (4 per app)
- Builds green: 4 / 4
- Typecheck clean: 3 / 4 (NetworkMap blocked by pre-existing PR #88 issue)

## What was applied (all 4 apps)

- Parallel `:root` token blocks deleted — replaced with `@import url(tokens.css)` at correct relative depth
- shadcn token bridge added (`--background`, `--card`, `--primary`, `--ring` etc. bound to tokens)
- Per-app accent override block with correct canonical colors
- shadcn `--accent` re-bound to `var(--accent-tint2)` (avoids brand color collision on hover states)
- `tailwind.config.js` parallel `theme.extend.colors` deleted; preset-only
- `@/` alias added to `electron.vite.config.ts`
- `@/*` path mapping added to `tsconfig.web.json`
- `src/renderer/lib/utils.ts` cn() helper created (clsx + tailwind-merge)
- shadcn peer deps added: `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`
- Decorative `radial-gradient` backgrounds deleted
- Hardcoded accent rgba in focus/selection rules replaced with token vars

## Per-app decisions

### GhostVault — personality overlay handling
GhostVault has `data-core`/`data-personality` overlay selectors (similar to batch-1 VaultCore). Applied same approach: `data-core` blocks preserved but surface palette removed (surfaces now canonical from tokens.css); only legacy `--bg`/`--bg2`/`--bg3`/`--panel` etc. set as aliases over canonical tokens. `data-personality` blocks kept as accent-only. New components should use canonical surface tokens directly.

### GhostVault — legacy var aliases
`--bg`, `--bg2`, `--bg3`, `--panel`, `--panel2`, `--border`, `--border2`, `--input-bg`, `--input-border`, `--text`, `--text-dim` etc. preserved as aliases pointing to canonical tokens (same VaultCore batch-1 pattern). Existing components reading these vars remain functional.

### NetworkMap — accent normalisation
Old tailwind.config.js had `#ff8c42` (orange) for NetworkMap accent. tokens.css specifies `#d29922` (amber/gold). This PR normalises to the canonical value. Confirmed against `tailwind-preset.cjs` `app-networkmap`.

### NetworkMap — broken typecheck script
The `.bin/tsc` wrapper in this app's node_modules is a corrupt flat file (not a symlink) referencing a non-existent `../lib/tsc.js` path. This causes `npm run typecheck` to fail with `MODULE_NOT_FOUND`. This is a pre-existing boot-fix issue tracked in PR #88. Running TypeScript directly via `node node_modules/typescript/lib/tsc.js` confirms the same 4 pre-existing unused-variable errors on both main and this branch — no new errors introduced.

### PlaybookStudio — dual CSS files
PlaybookStudio has two CSS files: `index.css` (imported first — was a legacy `:root` vars stub) and `globals.css` (imported after — main stylesheet). The shadcn token bridge was placed in `globals.css`. The `index.css` stub was stripped to a bare reset only (the `:root` vars block deleted).

## Operator action required

- Merge PR #88 (`fix/boot-cyberos-2026-06-10`) to unblock NetworkMap's CI typecheck
- Review + merge PRs #94-#97 in any order (no inter-dependencies)
