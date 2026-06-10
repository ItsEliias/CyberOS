# CyberOS → shadcn Rollout Template

> **Reusable recipe for migrating any booting CyberOS app to shadcn/ui, themed
> from the existing `design-system/`.** The Launcher is the pilot; this template
> codifies the steps so the remaining 12 apps follow the same path.

---

## 0. Preconditions (hard, non-negotiable)

> **Hard rule §2 rule 6 — boot before beauty.** If an app does not boot cleanly,
> it is a bug ticket, not a canvas. Do not run this template on it.

Before starting **any** app migration, confirm:

1. **App is in the booting list from Workstream B2.** Check
   `cyberos/bootfix/status` memory or the B2 boot-status table. If the app's
   row is anything other than "booting cleanly," **stop**. Open a bug ticket
   instead.
2. **Human gate H1 is signalled done by the coordinator** — the operator has
   run `/plugin install frontend-design@claude-plugins-official`. The
   `frontend-design` plugin is the primary anti-slop guardrail and **must** be
   active during C2/C3 implementation. The `claude-plugins-official` marketplace
   is already registered globally (`~/.claude/plugins/known_marketplaces.json`),
   so the install is a one-liner.
3. **shadcn MCP is wired** at `CyberOS/.mcp.json` (`mcpServers.shadcn` using
   `bunx -y @jpisnice/shadcn-ui-mcp-server`). Already done as of swarm spawn.
4. **Root `design-system/` is in place** with `tokens.css`,
   `tailwind-preset.cjs`, and the 11 shared components. The template **sources
   all theme variables from `tokens.css`** — never introduce a parallel token
   set. If something is missing, fix the design system first; do not paper over
   it per-app.

---

## 1. Aesthetic north star (apply on every commit)

The target visual quality is **Proton + Obsidian + Arc Browser**:

- **Proton**: calm spacing, a *single* brand accent, restrained chrome, strong
  type hierarchy, no decorative gradients, one obvious affordance state per
  element.
- **Obsidian**: dense information without visual noise, dark-first, monospaced
  numerics, subtle borders, panel chrome that gets out of the way.
- **Arc Browser**: soft layered surfaces (`surface-0 → 1 → 2 → 3`), command
  palette as a *primary* input affordance, `surface-glass` + `backdrop-blur`,
  accent-only hover states (no full button fills for navigation).

**Anti-slop checklist** — must be true after every PR:

- [ ] No purple-to-pink gradients (hero, text fills, or otherwise).
- [ ] No emoji as primary affordance — monochrome SVG icons in the accent color.
- [ ] No Tailwind default palette (`bg-blue-500`, `text-gray-400`, etc.). Every
      color resolves through a token in `tokens.css` or its preset.
- [ ] `--font-display` for prose, `--font-mono` for numerics / code / status.
- [ ] Radius from the ramp (`--radius-xs..xl`), shadows from the elevation ramp
      (`--elevation-1..4`).
- [ ] No `Inter` everywhere — Geist Sans display, JetBrains Mono numerics.
- [ ] No ad-hoc inline `style={{}}` re-encoding the design system. If you need
      a token, use the Tailwind class or `var(--token)` from `tokens.css`.

---

## 2. The 6-step rollout

### Step 1 — Install shadcn config in the app

From the app's root (e.g. `Cybertools Launcher/`, `CredVault/`, etc.):

```bash
npx shadcn@latest init
```

Answers (use defaults unless noted):

- **Style**: New York (denser, more aligned with the Obsidian/Proton density target)
- **Base color**: doesn't matter — we override every variable in Step 2.
- **CSS variables**: **Yes** (we depend on this).
- **Tailwind config**: point at the existing `tailwind.config.{js,ts}` in the app root.
- **Components dir**: `src/renderer/components/ui` (matches Electron renderer
  convention already used by `HelpTip.tsx`).
- **Utils**: `src/renderer/lib/utils.ts` (`cn()` helper, may already exist).
- **React Server Components**: No (Electron renderer is plain React).
- **Import alias**: `@/*` → `src/renderer/*` (update `tsconfig.web.json` and
  `electron.vite.config.ts` if needed).

Install the primitives the app actually needs — **do not bulk-install**. Start with the migration map's primitives table (Launcher map: `button card tabs sheet command tooltip dialog alert badge scroll-area separator toggle-group select switch input`).

```bash
npx shadcn@latest add button card tabs sheet command tooltip dialog alert badge scroll-area separator toggle-group select switch input
```

### Step 2 — Wire `tokens.css` CSS variables into shadcn's theme

The single most important step. shadcn expects `--background`, `--foreground`,
`--card`, `--primary`, `--ring`, etc. We **bind those names to the existing
tokens** so the canonical design system stays the source of truth.

Edit `src/renderer/styles/globals.css` (or the file the app uses as its root
stylesheet):

```css
/* 1. Import the canonical tokens FIRST */
@import url('../../../../design-system/tokens.css');

/* 2. Tailwind layers */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 3. Bridge shadcn's expected variables onto tokens.css */
:root {
  --background:         var(--surface-0);
  --foreground:         var(--text-primary);

  --card:               var(--surface-1);
  --card-foreground:    var(--text-primary);

  --popover:            var(--surface-3);
  --popover-foreground: var(--text-primary);

  --primary:            var(--accent);
  --primary-foreground: var(--text-inverse);

  --secondary:            var(--surface-2);
  --secondary-foreground: var(--text-primary);

  --muted:            var(--surface-1);
  --muted-foreground: var(--text-secondary);

  /* Note: shadcn's --accent is a hover/highlight bg, not our brand accent.
     CyberOS's --accent stays canonical; we rebind shadcn's --accent here. */
  --accent:            var(--accent-tint2);
  --accent-foreground: var(--text-primary);

  --destructive:           var(--danger);
  --destructive-foreground:#0a0a0a;

  --border: var(--border-default);
  --input:  var(--surface-2);
  --ring:   var(--accent-border);

  --radius: var(--radius-md);
}
```

> **Do NOT** also paste shadcn's default HSL palette block. shadcn's `init`
> wizard writes one; **delete it** before committing. Two parallel token sets
> is exactly what this template exists to prevent.

### Step 3 — Rewrite the app's `tailwind.config.{js,ts}` to extend the root preset

Most CyberOS apps today either (a) define a local minimal config, or (b) never
imported the root preset. Replace whatever is there with:

```js
// <app>/tailwind.config.js
const preset = require('../design-system/tailwind-preset.cjs')

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
}
```

This gives the app:

- `bg-surface-{0..3}`, `border-border-{subtle/default/strong}`,
  `text-text-{primary/secondary/muted}` from the preset.
- `bg-app-{cyberlab,recondesk,...}` for canonical per-app accent colors.
- `shadow-elevation-{1..4}`, `duration-{instant/fast/base/slow}`,
  `animate-pulse-dot`, `animate-glow-pulse`.

If the app had its own local CSS-variable theme system (e.g. Launcher's
`data-core` + `data-personality`), keep the *selectors* but **collapse them
onto canonical surfaces**. Personality overlays should now only override
`--accent` / `--accent-rgb` — not surface, border, or text palettes. This
removes parallel-palette drift.

### Step 4 — Replace one-off Tailwind / inline styles with shadcn primitives

Work the migration map's primitives table top to bottom, **smallest component
first**. Order matters: smallest first builds confidence and lets you ship a
correctness check (boot + click test) on every commit before tackling the
spicy refactors.

For each component:

1. Re-read the existing component to confirm functional contract (props in,
   callbacks out, IPC calls, side effects).
2. Replace bespoke chrome with the mapped shadcn primitive (e.g. custom
   slide-in panel → `Sheet`, custom palette → `Command`).
3. **Where a `design-system/components/` component fits the slot, use it
   instead of inventing a new one.** The 11 shared components
   (`Badge / Button / ChartFrame / LiveDot / MetricCard / Panel / SectionHeader
   / SeverityPill / SparklineChart / StatChip / Tabs`) are canonical CyberOS
   primitives — they take priority over shadcn equivalents for anything they
   already cover (`LiveDot`, `MetricCard`, `SparklineChart`, `SeverityPill`,
   `StatChip` have no clean shadcn equivalent and stay as-is).
4. Apply the anti-slop checklist (§1).
5. Delete dead code — every replaced inline-style block, every parallel color
   map (e.g. Launcher's `SearchApp.APP_COLORS`), every `bg-green-400` /
   `bg-gray-500` Tailwind default.

### Step 5 — Preserve functional behaviour, then verify build + boot

Functional parity is non-negotiable. After each component migration:

1. `npm run typecheck` — must pass clean.
2. `npm run build` — must succeed.
3. `npm start` (or the app's `dev` script — usually `electron-vite dev`) — app
   must boot, all primary affordances must work (clicks, IPC, state).
4. Manual smoke: open every modal / panel / palette the component touches.
5. Verify reduced-motion: tokens.css already ships
   `prefers-reduced-motion: reduce` — confirm motion respects it.

If any of these fail, **revert the migration for that component**, file what
broke, fix, then re-apply. Do not stack unverified migrations.

### Step 6 — Commit (one component per commit) and post for review

One component per commit. Commit message format:

```
<app>: migrate <Component> to shadcn (<primitives>)

- Before: <one-liner of what it was — inline styles / parallel tokens / etc.>
- After:  <one-liner of what it is — shadcn <primitive> + tokens.css>
- Boot: clean | Typecheck: pass | Smoke: <what was clicked>
```

Then SendMessage the commit SHA + screenshot path to `reviewer` for
token-fidelity + regression check.

---

## 3. Per-app fork points

While the recipe is shared, three things differ per app:

| Difference | How to handle |
|---|---|
| **Accent color** | Each app already has its canonical accent in `tailwind-preset.cjs` (`app-{name}`) and `tokens.css` comments. Set `:root { --accent: <hex>; --accent-rgb: <r,g,b> }` for the app root, do not invent a new color. |
| **Status semantics** | Apps with health/connection state use `LiveDot`. Apps with severity (ReconDesk, SignalBoard) use `SeverityPill`. Apps with KPIs (CyberLab streak, VaultCore notes) use `MetricCard`. Reuse, don't reinvent. |
| **Routing / state** | Use whatever the app already uses (zustand / context / Redux). The migration does not touch state shape. |

---

## 4. What this template does **not** do

- **Does not redesign APEX.** APEX has no UI yet (eventual AgenticOS
  bento-card surface). frontend-design + this template apply to APEX **only
  when that work begins**, not in this swarm.
- **Does not touch non-booting apps.** If B2 lists an app as failing, it is
  out of scope until the bug is fixed.
- **Does not introduce a new token system.** Every theme variable resolves
  through `tokens.css`. If you find yourself adding a new color or radius
  outside the existing ramp, **stop** — extend `tokens.css` (and the preset)
  *first*, then come back.
- **Does not delete shared design-system components.** The 11 shared
  components are canonical and stay. shadcn fills the gaps they don't cover
  (composite primitives like `Sheet`, `Command`, `Dialog`, `Tooltip`,
  `Select`, `Switch`).
- **Does not change Electron / main-process code.** Renderer-only.

---

## 5. Review checklist for `reviewer` agent

For every per-app PR / commit, `reviewer` verifies:

- [ ] App was in the B2 booting list when the migration started.
- [ ] No new CSS-variable token introduced; everything resolves through
      `tokens.css` (`grep -RIn 'var(--' src/renderer | sort -u` should yield
      only tokens defined in `tokens.css` and the shadcn bridge block).
- [ ] No Tailwind default-palette classes (`bg-{red|green|blue|gray|...}-{1..900}`).
- [ ] No emoji in primary affordances.
- [ ] No gradient-clipped text.
- [ ] `tailwind.config.{js,ts}` extends `../design-system/tailwind-preset.cjs`.
- [ ] Aesthetic north star honoured (Proton + Obsidian + Arc — calm, premium,
      restrained).
- [ ] Boot + smoke test logged in the commit message.
- [ ] Per-app accent unchanged (matches `tailwind-preset.cjs` `app-{name}`).

If any check fails: reject the commit, send the diff back with the failing
items called out.
