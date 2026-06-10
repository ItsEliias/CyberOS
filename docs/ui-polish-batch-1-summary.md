# UI Polish Batch 1 — Summary

Reference pilot: CyberLab Companion redesign (PR #115).

## Batch scope

4 apps polished in one sequential pass: SignalBoard, ReportForge, VaultCore, ReconDesk.

## 5 moves applied per app

### 1. Typography system
All 4 apps received the 7-step major-third type scale (1.25×, base 13px) as CSS custom
properties `--type-caption` (10px) through `--type-display` (25px), with `font-size: var(--type-body)`
and `line-height: 1.55` on `html, body, #root`.

### 2. SVG icon set
- **SignalBoard**: 6 nav icons replaced — RSS arcs, calendar, bookmark, line-chart, nodes, gear (13×13px, strokeWidth=1.5, round caps/joins)
- **ReportForge**: Library header document/scroll SVG (15×15px)
- **VaultCore**: 11 nav items replaced with custom SVGs stored in `ICONS: Record<ActiveViewVC, React.ReactNode>`; VaultHealthView emoji-to-SVG lookup map
- **ReconDesk**: Target/crosshair SVG glyph in TitleBar identity lockup and Sidebar section header; multi-ring crosshair in EmptyState

### 3. Header identity restructure
All app headers: height 44px, `var(--surface-0)` bg, `var(--border-subtle)` border, domain
glyph + app name (`font-weight: 600`, `var(--text-primary)`) + "╱ subname" (`var(--text-muted)`,
caption size). Decorative radial-gradient and accent-underline gradients removed.

### 4. Panel/sidebar polish
- Sidebar widths reduced ~16px per app
- Section headers separated by `var(--border-subtle)`
- `.nav-item` CSS class with `translateX(2px)` hover nudge replaces JS `onMouseEnter/Leave` handlers
- Flat `·` metric strips in status bars using `.status-metric`/`.status-sep` classes
- `var(--surface-0)` bg + `var(--border-subtle)` border on all status bars

### 5. Empty states + motion
Domain-specific glyphs:
- SignalBoard: RSS concentric-arcs + filled circle
- ReportForge: document/scroll with page-fold and horizontal rules
- VaultCore: vault/key/lock — rect arch + circle
- ReconDesk: multi-ring crosshair with cardinal lines

Exactly 3 deliberate animations per app, all wrapped in `prefers-reduced-motion: reduce`:
1. Focus-ring fade: 150ms ease (focus-ring fadeIn keyframe)
2. Content stream-in: 180ms cubic-bezier(0.2,0.8,0.2,1)
3. Nav hover nudge: translateX(2px) 150ms

## What was removed
- Decorative `backdrop-filter: blur()` on `.glass-card`
- Decorative radial-gradient glow rings on empty states
- Breathing/scale animations on empty state icons
- Amber/green accent underline gradient on headers
- Broad `button, a, input, select { transition: all }` rule narrowed to `button` only

## PRs
| PR | App | Base |
|----|-----|------|
| #116 | SignalBoard | `ui/signalboard-shadcn` |
| #117 | ReportForge | `ui/reportforge-shadcn` |
| #118 | VaultCore | `ui/vaultcore-shadcn` |
| #119 | ReconDesk | `ui/recondesk-shadcn` |
