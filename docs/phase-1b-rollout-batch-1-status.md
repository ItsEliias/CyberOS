# Phase 1b Rollout — Batch 1 Status

Pattern source: PR #87 (Cybertools Launcher shadcn pilot)

| App | Branch | PR | Files touched | Anti-slop affordances deleted | Build | Typecheck |
|-----|--------|----|---------------|-------------------------------|-------|-----------|
| SignalBoard | `ui/signalboard-shadcn` | [#90](https://github.com/ItsEliias/CyberOS/pull/90) | 9 | (1) parallel `:root` token block in globals.css; (2) hardcoded hex accent in `ACCENT` const + CommandPalette inline style blocks; (3) `bg-purple-500/10` Tailwind default palette class; (4) `style={{ background: theme.bgColor }}` root div + themeStore binding | 438 modules, 2.0s | 0 errors |
| ReportForge | `ui/reportforge-shadcn` | [#91](https://github.com/ItsEliias/CyberOS/pull/91) | 9 | (1) parallel `:root` token block in globals.css; (2) off-spec sev color overrides in index.css (`#ff4444`/`#f0a500` vs canonical `#f85149`/`#d29922`); (3) decorative `radial-gradient` background; (4) inline `style={{ background, color }}` on root div | 437 modules, 1.97s | 0 errors |
| VaultCore | `ui/vaultcore-shadcn` | [#92](https://github.com/ItsEliias/CyberOS/pull/92) | 8 | (1) parallel `:root` token block in globals.css; (2) parallel `theme.extend.colors` in tailwind.config.js (13 app accent colors hardcoded); (3) decorative `radial-gradient` background; (4) inline `style={{ background, color }}` on root divs | 1115 kB, 2.63s | 0 errors |
| ReconDesk | `ui/recondesk-shadcn` | [#93](https://github.com/ItsEliias/CyberOS/pull/93) | 8 | (1) parallel `:root` token block in globals.css; (2) parallel `theme.extend.colors` in tailwind.config.js (13 app accent colors hardcoded); (3) decorative `radial-gradient` background; (4) inline `style={{ background, color, position }}` on root div | 1145 kB, 2.01s | 0 errors |

## Per-app accent colors applied

| App | Accent hex | Accent RGB |
|-----|-----------|------------|
| SignalBoard | `#ff6b6b` | `255, 107, 107` |
| ReportForge | `#3fb950` | `63, 185, 80` |
| VaultCore | `#3fb950` | `63, 185, 80` |
| ReconDesk | `#d29922` | `210, 153, 34` |

## Template steps applied to all apps

1. `@import url(tokens.css)` — correct relative depth per globals.css location
2. shadcn token bridge (--background/--card/--primary/--ring etc. mapped to canonical vars)
3. App accent override block + shadcn `--accent` re-bound to `var(--accent-tint2)`
4. `tailwind.config.js` replaced with preset-only
5. `@/` alias added to `electron.vite.config.ts` + `@/*` path in `tsconfig.web.json`
6. `src/renderer/lib/utils.ts` cn() helper created
7. shadcn peer deps added to `package.json`
8. Root div `style={{}}` inline attrs removed; replaced with Tailwind utility classes
