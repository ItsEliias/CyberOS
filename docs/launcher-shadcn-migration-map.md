# Launcher → shadcn Migration Map

> **Pilot for CyberOS UI rollout (Workstream C, C1).**
> Source of truth for the `ui-builder` agent's Launcher redesign. Every primitive
> below is themed from `/design-system/tokens.css` — no parallel token set.

---

## 0. Context

- **App**: `Cybertools Launcher/` (Electron + Vite + React 18 + Tailwind 3 + framer-motion + zustand).
- **Today's UI**: ~15 hand-rolled React components, ~3,100 LOC of renderer, inline styles + a local Tailwind config + a **local** CSS-variable theme system (`--bg`, `--bg2`, `--panel`, `--accent`, `--card-bg`, `--stat-grad`, etc.) keyed off `data-core="stealth|graphite|frost|oled"` and `data-personality="neutral|cyberpunk|terminal|threat"`.
- **Critical finding**: The Launcher **does not** import `design-system/tokens.css`, **does not** import any of the 11 shared components in `design-system/components/`, and **does not** extend the root `design-system/tailwind-preset.cjs`. It has drifted into its own parallel mini design system. The migration is therefore *additive* to the root design system, not a replacement of one shared layer with another.
- **Aesthetic north star**: **Proton + Obsidian + Arc Browser** — calm, premium, restrained, intentional. No purple gradient hero, no generic AI-assistant chrome, no Arial-everywhere.

---

## 1. Root `design-system/` inventory (canonical)

### `tokens.css` exports (CSS custom properties, themed at `:root`)

| Token group | Variables | Purpose |
|---|---|---|
| Surfaces | `--surface-0` `--surface-1` `--surface-2` `--surface-3` `--surface-glass` `--surface-glass-strong` | Layered depth (canvas → cards → modals → frosted panels) |
| Elevation | `--elevation-0..4` | Shadow stack |
| Borders | `--border-subtle` `--border-default` `--border-strong` `--border-glass` | Border opacities |
| Text | `--text-primary` `--text-secondary` `--text-muted` `--text-inverse` | Type colors |
| Severity | `--sev-critical/high/medium/low/info` + `-bg` tints | Security semantics |
| States | `--state-online/offline/blocked/pending` | Status dots |
| Semantic | `--success` `--warning` `--danger` `--info` | Action semantics |
| Accent | `--accent` `--accent-rgb` `--accent-tint` `--accent-tint2/3` `--accent-glow/2` `--accent-dim` `--accent-border` | Per-app accent (overridden by app root) |
| Typography | `--font-display` (Geist Sans → Inter → system) `--font-mono` (JetBrains Mono → Fira Code) + `--text-2xs..3xl` | Type ramp |
| Radius | `--radius-xs/sm/md/lg/xl/full` | Corner ramp |
| Motion | `--motion-instant/fast/base/slow` + `--ease` `--ease-in` `--ease-out` `--spring` | Timing |
| Globals | scrollbar, focus, selection, drag-region utilities | Layout primitives |
| Animations | `statusPulse`, `glowPulse`, `prefers-reduced-motion` reset | Motion |
| Per-app accents | (comments) Launcher: `#b44fff` (purple) | App theming |

### `tailwind-preset.cjs` (apps `extends`)
Surfaces the same tokens to Tailwind utility classes: `bg-surface-{0..3}`, `text-text-{primary..muted}`, `border-border-{subtle/default/strong}`, `text-sev-{critical..info}`, `bg-accent`, `bg-app-{launcher,recondesk,...}`, font families, type ramp, radius, `shadow-elevation-{1..4}`, `backdrop-blur-*`, `duration-{instant/fast/base/slow}`, `animate-pulse-dot`/`glow-pulse`.

### 11 shared components in `design-system/components/`

| Component | Purpose | Themed from |
|---|---|---|
| `Badge.tsx` | Color-coded label (`default/success/warning/danger/info/purple/accent`), optional dot | Hardcoded sev/state colors + `--accent-rgb` |
| `Button.tsx` | `forwardRef`, variants `primary/ghost/danger/subtle`, sizes `xs/sm/md`, loading state | Tailwind preset (accent, border-*, surface-*) |
| `ChartFrame.tsx` | Recharts `ResponsiveContainer` wrapper with title/subtitle/actions/height | Tailwind preset + tokens |
| `LiveDot.tsx` | Pulsing status dot (`online/offline/pending/blocked`) | Hardcoded state colors + `statusPulse` keyframe |
| `MetricCard.tsx` | KPI card with animated count-up (framer-motion), optional sparkline, delta | tokens + `var(--accent)` |
| `Panel.tsx` | `forwardRef` surface; modes `glass/elevated/active/noPad`, depth 1–4 | Tailwind preset (surface, border, shadow) |
| `SectionHeader.tsx` | Title/subtitle + accent bar + slot for actions | tokens (`var(--accent)`) |
| `SeverityPill.tsx` | `critical/high/medium/low/info` pill with optional dot | Hardcoded sev colors |
| `SparklineChart.tsx` | Tiny Recharts area chart | `var(--accent)` |
| `StatChip.tsx` | Inline `label: value` chip, mono optional, color-tinted bg/border | `var(--accent)` |
| `Tabs.tsx` | Segmented control, accent tab indicator, optional count badges | Tailwind preset + accent |

These 11 are the **shared library every CyberOS app should be using**. The Launcher uses **none of them**. That is the gap.

---

## 2. Launcher renderer inventory (`Cybertools Launcher/src/renderer/`)

| File | LOC | Role | Uses shared DS? | Uses Tailwind? | Uses inline styles? |
|---|---|---|---|---|---|
| `App.tsx` | 160 | Root layout, tab bar, splash gate, settings/palette mounts | No | Yes (utility) | Yes (heavy: `var(--bg)`, `var(--text)`, tab indicator) |
| `main.tsx` | — | React root | No | — | — |
| `SearchApp.tsx` | 200+ | Separate command-bar window, search results, `AppChip` (one-off colors) | No | Yes | Yes (one-off `APP_COLORS` map per app, *not* the design-system accents) |
| `components/Header.tsx` | 177 | Drag-region top bar, CyberOS lockup, SSO countdown, VPN dot, settings/minimise buttons | No | Yes | Heavy inline (`background: rgba(10,12,20,0.95)`, hardcoded color hexes) |
| `components/StatsStrip.tsx` | 45 | 4-up stat tiles (streak/labs/notes/apps) with gradient text | No | Yes | Yes (`var(--stat-grad)` + bg-clip text) |
| `components/Footer.tsx` | 60 | Core/personality chip selector | No | Yes | Yes (hardcoded hex `#d29922`, bordered swatches) |
| `components/AppCard.tsx` | 391 | **6 variants** of status card (cyberlab/vaultscraper/ghostvault/recondesk/signalboard/cyberos) — each repeats the same shell with per-app status parsing, dot color logic, optional 2/3-cell mini-grid | No | Yes | Yes (`var(--card-bg)`, `var(--accent)`, inline `boxShadow`) |
| `components/AppManager.tsx` | 339 | App grid; install/uninstall flow; status polling | No | Yes | Mixed |
| `components/ActivityFeed.tsx` | 321 | Activity list with timestamps + event icons | No | Yes | Mixed |
| `components/BackupSection.tsx` | 408 | iCloud/Dropbox/Google backup config in Settings | No | Yes | Mixed |
| `components/SettingsPanel.tsx` | 254 | Slide-in right drawer; 4 tabs (apps/vault/theme/backup); core+personality picker | No | Yes | Heavy inline (`var(--panel)`, `var(--bg3)`, `var(--accent)`) |
| `components/CommandPalette.tsx` | 428 | Floating ⌘K palette with fuzzy search, app+action+settings sections | No | No (almost pure inline style objects) | **Yes — entire component is inline** |
| `components/CustomSlotsGrid.tsx` | 78 | Custom user slots grid | No | Yes | Mixed |
| `components/CustomSlotModal.tsx` | 131 | Add/edit custom slot modal | No | Yes | Mixed |
| `components/NewAppCard.tsx` | 252 | "Add app" tile | No | Yes | Mixed |
| `components/UpdateBanner.tsx` | 59 | App-update toast | No | Yes | Mixed |
| `components/SplashScreen.tsx` | 46 | Splash overlay | No | Yes | Mixed |
| `components/ui/HelpTip.tsx` | 111 | Tooltip / info bubble | No | Yes | Mixed |

**Totals**: 15 renderer components + 1 SearchApp + 1 utility, ~3,100 LOC. **0** import `design-system/`. **0** import the root tailwind preset. CommandPalette is essentially CSS-in-JS via the `style` prop.

### Tailwind config drift (`Cybertools Launcher/tailwind.config.js`)

Launcher's preset defines its **own** color tokens that *do not match* root `tokens.css`:
- `--bg` `--bg2` `--bg3` `--panel` `--border` `--text` `--text-muted` `--text-dim` `--accent` (Launcher) vs.
- `--surface-0..3`, `--border-subtle/default/strong`, `--text-primary/secondary/muted`, `--accent` (root).

These name-collide loosely but are **different palettes** at different opacities, set on different selectors (`data-core` in Launcher vs `:root` in root). This is the parallel-token-set the rollout template must collapse.

---

## 3. Migration map: Launcher concept → shadcn primitive → CyberOS DS skin

> shadcn is installed unstyled. Each primitive's CSS variables are rewritten to **read from `tokens.css`** (e.g. `--primary: var(--accent)`, `--card: var(--surface-1)`). We **never** introduce a parallel `--background`/`--foreground` token set; we map shadcn's expected variables onto our existing ones.

### 3a. Primitives table

| Launcher today | shadcn primitive | CyberOS DS component still useful? | Token mapping (shadcn var → CyberOS) | Notes |
|---|---|---|---|---|
| `App.tsx` outer chrome (`<div>` + `var(--bg)`) | `Sidebar`-less plain shell + `ScrollArea` for content | — | `--background → var(--surface-0)` | Keep Electron `-webkit-app-region` semantics. |
| Tab bar in `App.tsx` (custom buttons + `motion.div` indicator) | shadcn `Tabs` (Radix-backed) | `design-system/Tabs.tsx` is a near-1:1 alternative; **shadcn wins** because it adds keyboard a11y + ARIA | `--ring → var(--accent-border)`, active indicator color = `var(--accent)` | Drop the bespoke `motion.layoutId="tab-indicator"`; use shadcn's data-state-driven underline + framer for the fill. |
| `Header.tsx` drag-region bar | Custom layout + shadcn `Button` (`variant="ghost"`, `size="icon"`) for settings/minimise | `Badge` from DS for VPN/SSO pills *or* shadcn `Badge` themed | `--secondary → var(--surface-glass)`, `--secondary-foreground → var(--text-primary)` | Keep the existing CyberOS hexagon SVG lockup — it is identity, not slop. |
| VPN dot, SSO dot in Header | shadcn doesn't have one; use **`design-system/LiveDot.tsx`** | LiveDot stays — it already encodes the pulse + state colors | n/a | LiveDot is already token-aligned. |
| `Footer.tsx` core/personality chips | shadcn `ToggleGroup` (`variant="outline"`, `size="sm"`) | Could also use DS `StatChip` for personalities but `ToggleGroup` gives a11y for free | active state color = `var(--accent)`, inactive = `var(--text-muted)` | The chips are settings, not data. ToggleGroup matches the semantic. |
| `StatsStrip.tsx` 4-up gradient stat tiles | shadcn `Card` (`variant="ghost"`) divided | **Replace gradient text with `MetricCard.tsx` (DS)** | MetricCard already uses `accentColor` + `textShadow`; honest premium vs. gradient slop | The current `linear-gradient(135deg, #d29922, #f0b842)` clipped to text is the *exact* AI-slop affordance we want to delete. |
| `AppCard.tsx` (6 hand-rolled status cards) | shadcn `Card` + `Card{Header,Content,Footer}` + shadcn `Button` for "Open" | DS `LiveDot` for status dot, DS `Badge` for "Connected/Idle/Error" labels | `--card → var(--surface-1)`, `--card-foreground → var(--text-primary)`, `--border → var(--border-default)` | Collapse 391 LOC of `if (appKey === '...')` repetition into **one** `<AppStatusCard>` driven by per-app status parsers. The dot/glow/Open button are identical across variants. |
| 3-cell mini-grid inside AppCard (Streak/Labs/Flags) | shadcn `Card` (inner) + grid | DS `StatChip` is a closer fit, but a row of inline `StatChip` reads cleaner than 3 inner cards | inner bg = `var(--surface-2)`, label = `var(--text-muted)` | Use DS `StatChip` for honesty (it's already the design language). |
| `SettingsPanel.tsx` slide-in right drawer | shadcn `Sheet` (`side="right"`) | DS `Tabs` for the 4 internal tabs OR shadcn `Tabs` — pick shadcn for consistency | `--popover → var(--surface-3)`, `--popover-foreground → var(--text-primary)` | Sheet ships the focus trap, ESC-to-close, and overlay you currently hand-roll with framer. |
| Settings → Apps tab "Locate app…" row | shadcn `Card` (`variant="ghost"`) + shadcn `Button` (`variant="outline"`, `size="sm"`) | DS `LiveDot` for installed indicator (currently a `bg-green-400` Tailwind class) | n/a | Replace `bg-green-400`/`bg-gray-500` (AI-slop Tailwind defaults) with `LiveDot status="online|offline"`. |
| Settings → Theme tab core/personality grid | shadcn `ToggleGroup` (single-select, `variant="outline"`) | — | n/a | Same as Footer; one component, two consumers. |
| `CommandPalette.tsx` ⌘K (currently 428 LOC of inline-styled CSS-in-JS) | **shadcn `Command`** (CmdK) — this is what shadcn was built for | DS `Badge` for the group labels (`App` / `Action` / `Settings`), DS `LiveDot` for active-item accent dot | `--popover → var(--surface-glass-strong)`, `--accent → var(--accent-tint2)` | Highest-value migration: deletes the most ad-hoc code, gains keyboard a11y + screen-reader support for free. |
| `ActivityFeed.tsx` (timestamp list) | shadcn `ScrollArea` + shadcn `Separator` + shadcn `Badge` | DS `SeverityPill` for event severity | `--muted → var(--surface-1)`, `--muted-foreground → var(--text-secondary)` | Keep relative-time formatting logic; just reskin. |
| `BackupSection.tsx` provider config | shadcn `Card` + shadcn `Select` (for `frequency`) + shadcn `Switch` (for `enabled`) | — | `--input → var(--surface-2)` | Native `<select>` and bare buttons are the biggest visual-quality regression in the current Launcher; shadcn `Select` lifts it. |
| `NewAppCard.tsx` / `CustomSlotsGrid.tsx` / `CustomSlotModal.tsx` | shadcn `Dialog` for modal, `Card` for slot tiles, `Input` + `Button` for form fields | — | n/a | Modal currently uses framer + manual escape handling. Dialog gives Radix primitives. |
| `UpdateBanner.tsx` | shadcn `Alert` (`variant="default"`) | — | `--accent → var(--accent-tint)`, border = `var(--accent-border)` | One-line replacement. |
| `SplashScreen.tsx` | Keep as-is (custom logo reveal animation is brand, not slop) | — | n/a | Do not replace. Framer-motion logo timing is identity. |
| `HelpTip.tsx` (custom hover bubble) | shadcn `Tooltip` (or `HoverCard` for the larger body case) | — | `--popover → var(--surface-3)` | HoverCard is the better fit because HelpTip has a `title` *and* `body`. |
| `SearchApp.tsx` separate-window search | shadcn `Command` (same component as palette — reuse) | DS `Badge` for the `AppChip` per-app tag (replaces the one-off `APP_COLORS` map with the existing `app-{launcher,recondesk,...}` Tailwind colors) | n/a | Kills the parallel `APP_COLORS` map that drifted from the canonical per-app accents in `tailwind-preset.cjs`. |

### 3b. Token mapping (shadcn → `tokens.css`)

This is the single most important fact in this document. **The Launcher's `globals.css` will be edited** to override shadcn's expected variables to point at our existing tokens. No new tokens are introduced.

Add to `Cybertools Launcher/src/renderer/styles/globals.css` (or a sibling `shadcn-bridge.css`), **after** importing `../../../../design-system/tokens.css`:

```css
/* Bridge shadcn's expected CSS variables onto tokens.css */
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

  --accent:           var(--accent-tint2);          /* shadcn's "accent" is a hover/highlight bg, not our brand accent */
  --accent-foreground:var(--text-primary);

  --destructive:           var(--danger);
  --destructive-foreground:#0a0a0a;

  --border: var(--border-default);
  --input:  var(--surface-2);
  --ring:   var(--accent-border);

  --radius: var(--radius-md);
}
```

> Note the deliberate collision: shadcn uses `--accent` to mean "muted highlight bg", while CyberOS uses `--accent` to mean "brand accent color." Resolution: keep CyberOS's `--accent` semantics canonical; shadcn's `--accent` (hover/highlight) is rebound to `--accent-tint2`. shadcn primitives that read `--accent` for hovers will pick up the tinted version, which is the right behavior anyway.

### 3c. Tailwind config rewrite

`Cybertools Launcher/tailwind.config.js` is currently 23 lines and shares **none** of the root preset. Replace with:

```js
// Cybertools Launcher/tailwind.config.js
const preset = require('../design-system/tailwind-preset.cjs')
module.exports = {
  presets: [preset],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
}
```

Drop the local `var(--bg)`, `var(--panel)` etc. mappings — they're superseded by `bg-surface-*` from the preset. Keep `data-core` + `data-personality` as **personality overlays** that **only** override `--accent`/`--accent-rgb` (no longer override the surface/border palette). This collapses 4×4 (core × personality) theme combinations onto **one** canonical surface palette + per-mood accent.

---

## 4. Style-shift rationale — what the redesign aims to feel like

The migration is not "shadcn for shadcn's sake." It is the moment we delete four specific AI-slop affordances and align with the Proton + Obsidian + Arc north star.

### Things we **delete**

1. **Gradient-clipped text** (`StatsStrip`'s `var(--stat-grad)` + `WebkitBackgroundClip: 'text'`). It is the single most recognizable "AI dashboard" tell. Replaced with **`MetricCard`'s soft `textShadow` accent glow** from the design system — still premium, no longer cliché.
2. **`bg-green-400` / `bg-gray-500` Tailwind defaults** in `SettingsPanel` for installed indicators. Replaced with `LiveDot status="online|offline"` (token-driven, pulsing).
3. **Inline `style={{}}` objects** in `CommandPalette` and `Header` that re-encode the design system from memory each time, inconsistently. Replaced with shadcn primitives + Tailwind classes that read from `tokens.css`.
4. **The parallel `APP_COLORS` map in `SearchApp.tsx`**, which uses `#7c3aed22 / #0e7490aa / #15803d22 / #9d174d22 / #b91c1c22 / #92400e22` — none of which match the canonical per-app accents in `tailwind-preset.cjs` (`app-cyberlab #b44fff`, `app-recondesk #d29922`, `app-ghostvault #7bb8ff`, `app-credvault #f78166`, `app-signalboard #ff6b6b`, etc.). Replaced with `bg-app-{name}` Tailwind classes.

### Things we **preserve**

- Hexagon CyberOS lockup SVG (identity, not template chrome).
- Splash logo reveal animation (brand moment).
- Drag-region semantics (Electron platform requirement).
- Functional behaviour: SSO countdown poll, VPN status, command-palette ⌘K binding, app launch IPC.
- per-app accent colors (now sourced from `tailwind-preset.cjs`, not redefined).
- JetBrains Mono for numeric/tabular text (`tabular-nums` + mono is already the DS language).

### Aesthetic anchors

| Reference | What we take |
|---|---|
| **Proton** (Mail / Drive / Pass) | Calm spacing, **a single brand accent** (we already have `--accent`), restrained chrome, strong type hierarchy, no decorative gradients. Inputs and buttons have *one* obvious affordance state. |
| **Obsidian** | Dense information without visual noise. Dark-first, monospaced numerics, subtle borders rather than glow walls. Sidebar/panel chrome that gets out of the way. |
| **Arc Browser** | Soft layered surfaces (`surface-0 → 1 → 2 → 3`), pill-shaped command palette as the *primary* input affordance (we already have ⌘K — promote it), generous use of `surface-glass` with `backdrop-blur`, accent-only hover states (no full button fills for navigation). |

### Anti-slop checklist (apply to every screen)

- [ ] No purple-to-pink gradient backgrounds, hero panels, or text fills.
- [ ] No emoji as primary affordance (`🧪`/`👻`/`🎯` icons in `AppCard.tsx` `APP_INFO` — replace with monochrome SVGs in the accent color).
- [ ] No `Inter` everywhere — display = Geist Sans / Inter fallback, numbers and code = JetBrains Mono. Already tokenized.
- [ ] No `border-radius: 12px` everywhere — use the radius ramp (`xs/sm/md/lg/xl`).
- [ ] No `box-shadow: 0 4px 20px rgba(0,0,0,0.2)` ad-hoc — use `--elevation-1..4`.
- [ ] No Tailwind default palette (`bg-blue-500`, `text-gray-400`, etc.) — every color resolves through a token.

---

## 5. Deliverables for `ui-builder` (C2)

1. Install shadcn into `Cybertools Launcher/` per the rollout template (§ `cyberos-shadcn-rollout-template.md`).
2. Apply the token bridge (§3b).
3. Rewrite `tailwind.config.js` to extend the root preset (§3c).
4. Execute the primitives table (§3a), one component at a time, smallest first: `UpdateBanner` → `Footer` → `StatsStrip` → `Header` → `AppCard` → `SettingsPanel` → `CommandPalette` → `SearchApp` → activity/backup/slots.
5. Verify boot + functional parity after each migration (electron-vite dev → click every button).
6. Commit per component with a clear before/after note.

> Do **not** touch any app the boot-fix workstream has not green-lit. Rollout target list comes from `cyberos/bootfix/status`.
