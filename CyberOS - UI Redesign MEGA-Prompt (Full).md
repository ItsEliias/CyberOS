# CyberOS — UI Redesign MEGA-PROMPT (Claude Code + Ruflo)

> **Mission:** transform all 13 CyberOS apps from functional-but-boxy into one cohesive, **Figma/Linear/Vercel-grade dark "security operations" dashboard** — layered, alive, with real reactive data-viz — while breaking **zero** working logic.
>
> Run from inside the repo. **Commit current work → `git checkout -b ui-redesign`.** This is a UI-only overhaul. The data, store, IPC, preload, and persistence layers are untouchable.

---

# PART 1 — FOUNDATIONS

## 1.1 Tooling to enable first (quality depends on these)
- **Frontend Design** (official Anthropic plugin/skill) — forces a committed visual direction, kills generic AI output. Required.
- **Browser tool** — Chrome DevTools MCP **or** Playwright — agents must render → screenshot → inspect → iterate on what they actually see. Without this they design blind.
- **Context7** — current docs for the libraries below.
- **Figma MCP** *(optional)* — only if I supply Figma mockups.

## 1.2 Libraries
| Use | Library |
|---|---|
| Dashboard cards, sparklines, area/bar/donut | **Tremor** (`@tremor/react`) |
| General declarative charts (≤ few hundred pts) | **Recharts** |
| Large / real-time data (NetworkMap, heavy feeds) | **Apache ECharts** (`echarts-for-react`) or Chart.js |
| All motion | **Framer Motion 11** (already in stack) |
| Styling | **Keep existing Tailwind + CSS variables.** Do not switch systems. |

## 1.3 The aesthetic vision — COMMIT, do not drift
Target feeling: a **premium security operations centre**. Linear's polish, Vercel's depth, a Figma analytics board — dark, layered, intentional, alive. The current UI is too flat and grid-rigid; the redesign adds **depth, hierarchy, motion, and personality** while staying fast and legible. It is a *refined evolution* of the current identity — extend `CYBEROS_DESIGN_BIBLE.md` and the existing CSS variables, don't replace them.

**Seven principles (apply everywhere):**
1. **Depth, not flat boxes** — layered surfaces, soft elevation, frosted/glass panels over a subtly textured/gradient canvas. Cards sit *above* the surface.
2. **Bento-grid layouts, not uniform grids** — mix card sizes (hero metric / medium chart / small stat chip) in intentional bento compositions. Asymmetry + breathing room. *This is the "not so straight cut" the operator wants.*
3. **Distinctive typography** — **NEVER Inter, Roboto, Open Sans, Lato, Arial, or system fonts.** Pair a modern grotesque/display (e.g. Geist, Satoshi, Bricolage Grotesque) with a mono for data/metrics/terminal (e.g. JetBrains Mono, Geist Mono, IBM Plex Mono). Commit and apply consistently.
4. **Dark base + per-app accent identity** — preserve each app's accent (below); enrich with tints, glows, gradients. Live/online states *glow*.
5. **Semantic security palette** — severity (critical→info), online/offline, success/blocked: one consistent, accessible colour language across all apps.
6. **Purposeful motion** — Framer Motion for number count-ups, chart enter/transitions, live-data slide/pulse, hover micro-interactions, view transitions. Never decoration for its own sake. Respect `prefers-reduced-motion`.
7. **Real reactive data-viz** (Part 4) — the centrepiece.

**Per-app accents (preserve as identity):** GhostVault `#7bb8ff` blue · VaultCore `#3fb950` green · CyberLab `#b44fff` purple · ReconDesk `#d29922` amber · SignalBoard / others per their current accent.

## 1.4 Do / Don't (anti-patterns)
| ❌ Avoid (the boxy AI look) | ✅ Do instead |
|---|---|
| Equal-sized cards in a rigid N-column grid | Bento layout, varied card spans, a clear hero element |
| Flat cards, 1px borders, no depth | Elevation, soft shadows, glass/blur, layered z |
| Inter/system font everywhere | Committed display + mono pairing |
| Static SVG charts, hard redraws | Animated mount, transitions, live updates, tooltips |
| Hard-coded hex in components | Tokens + shared chart theme only |
| Accent used as one flat colour | Accent ramp: tint backgrounds, glow on live, gradient highlights |
| Cramped or evenly-spaced everything | Deliberate rhythm, generous negative space, focal hierarchy |

---

# PART 2 — RULES OF ENGAGEMENT (every agent, every task)

- **UI-only.** May change: components, styling, layout, tokens, animation, chart rendering, new *presentational* components. May **NOT** change: Zustand store logic, IPC handlers, preload scripts, persistence/file formats, `cybertools-config.json` keys, the event bus, or functional behaviour. If a design needs data that doesn't exist, surface it — don't invent backend changes.
- **Never touch the preload `format: 'cjs'` / `preload.cjs` setup.** It's what makes the ESM apps launch.
- **One app at a time. One commit per app.** Build → launch → screenshot → verify functionality before moving on.
- **Preserve every function.** Each button/tab/action that worked must still work. Verify in the browser tool.
- **Keep the dual theme system** (Background × Accent) working; test ≥2 combinations per app.
- Ambiguous or risky? **STOP and ask.**

---

# PART 3 — RUFLO SWARM PLAN

Small hierarchical swarm, human-in-the-loop, using the `SendMessage` pattern from `CLAUDE.md`. Spawn all in one message, `run_in_background: true`:

```javascript
Agent({ name: "design-system-engineer", subagent_type: "design-system-engineer", run_in_background: true,
  prompt: "Own Phase A. Build the shared design system (tokens, primitives, chart theme) extending the existing CSS vars + CYBEROS_DESIGN_BIBLE.md. Produce a one-screen style reference. SendMessage to 'frontend-developer' when approved by the user." })

Agent({ name: "frontend-developer", subagent_type: "frontend-developer", run_in_background: true,
  prompt: "Wait for 'design-system-engineer'. Rebuild each app's UI against the system, one app at a time, per the per-app briefs. UI-only — never touch stores/IPC/preload/persistence. SendMessage each finished app to 'reviewer'." })

Agent({ name: "reviewer", subagent_type: "reviewer", run_in_background: true,
  prompt: "Wait for 'frontend-developer' per app. Use the browser tool to confirm it builds, launches, every prior function works, matches the vision, and themes are intact. SendMessage pass/fail + screenshots to 'accessibility-expert'." })

Agent({ name: "accessibility-expert", subagent_type: "accessibility-expert", run_in_background: true,
  prompt: "Wait for 'reviewer'. Check contrast, focus states, prefers-reduced-motion, keyboard nav. Report final pass/fail to the lead." })
```

Autopilot **off**. After each app: STOP, present screenshots, wait for my approval before the next.

---

# PART 4 — REACTIVE DATA-VIZ SPEC

"Reactive/real" = **live-updating, animated, interactive, responsive** — not static SVG.
- **Live:** charts/metrics tracking the shared config + event bus animate transitions (no hard redraw); numbers count up; new points slide in; live states pulse.
- **Interactive:** hover tooltips, legend toggles, brush/zoom where useful (feeds, scan timelines).
- **Responsive:** every chart in a responsive wrapper; correct at any panel size.
- **Themed:** colours pull from the shared chart theme (app accent + severity palette) — never hard-coded.
- **Routing:** Tremor for dashboard/metric/spark; Recharts for radar/calendar/standard; ECharts/Chart.js for large/real-time; Framer Motion for mount + value transitions.

---

# PART 5 — STARTER DESIGN SYSTEM (Phase A scaffold — refine, don't treat as final)

Give the `design-system-engineer` this as a concrete starting point, extending current variables:

```css
:root {
  /* SURFACES — layered depth */
  --surface-0: /* app canvas (darkest) */;
  --surface-1: /* card base */;
  --surface-2: /* raised/hover */;
  --surface-glass: /* rgba + backdrop-blur for frosted panels */;
  --elevation-1: 0 1px 2px rgba(0,0,0,.4);
  --elevation-2: 0 4px 16px rgba(0,0,0,.45);
  --elevation-3: 0 12px 40px rgba(0,0,0,.5);

  /* ACCENT (per-app, with ramp) */
  --accent: /* app accent */;
  --accent-tint: /* ~12% accent over surface */;
  --accent-glow: /* accent w/ blur for live states */;

  /* SEMANTIC / SEVERITY */
  --sev-critical: #f85149; --sev-high: #ff8c42; --sev-medium: #d29922;
  --sev-low: #4a9eff; --sev-info: #8b949e;
  --state-online: #3fb950; --state-offline: #6e7681; --state-blocked: #f85149;

  /* TYPE */
  --font-display: /* grotesque, NOT Inter */;
  --font-mono: /* JetBrains/Geist/IBM Plex Mono */;
  /* type scale (rem): 0.75 / 0.875 / 1 / 1.25 / 1.5 / 2 / 3 */

  /* RADII / SPACING / MOTION */
  --radius-sm:8px; --radius-md:12px; --radius-lg:20px;
  --space: /* 4/8/12/16/24/32/48 scale */;
  --motion-fast:150ms; --motion-base:250ms; --motion-slow:400ms;
  --ease: cubic-bezier(.2,.8,.2,1);
}
```

**Shared chart theme object** (consumed by Tremor/Recharts/ECharts): background transparent, grid `--surface-2` low-opacity, axis/label `--font-mono` muted, series colours from accent ramp + severity palette, tooltip = glass card with elevation, animated transitions on.

**Core primitives to ship in Phase A:** `Panel`/`Card` (elevation + optional glass), `MetricCard` (label + count-up value + sparkline + delta), `StatChip`, `SectionHeader`, `Badge`/`SeverityPill`, `Button` (primary/ghost/danger), `Tabs`, `Tooltip`, `LiveDot` (pulsing online indicator), `ChartFrame` (responsive + title + themed). Deliver a **style-reference page** showing all of these + sample charts. **STOP for sign-off before any app.**

---

# PART 6 — PER-APP REDESIGN BRIEFS

> One at a time, in this order (priority = how much I use them). Approve between each. Each brief = key screens + bento intent + viz + motion moments. Preserve all existing functionality and components' behaviour.

### Pilot — CyberOS Dashboard (accent: neutral/multi) — the showcase
- **Bento:** hero **Ecosystem Health** band on top; 2-wide **app-status** cards (LiveDot, key metric, mini sparkline) in a varied grid; **Operator Profile** block (SkillRadar large + StreakCalendar + BadgeDisplay) as a feature panel; **Activity Feed** as a tall live column with motion-in events; AlertsPanel as accent strip.
- **Viz:** Tremor metric cards + sparklines; Recharts skill radar; calendar heatmap for streak; animated count-ups on every metric.
- **Motion:** events slide in from the feed; health bars fill on mount; online dots pulse.
- Components: AppStatusGrid/Card, MetricCard, EcosystemHealthBar, ActivityFeed/EventLog, OperatorProfile, SkillRadar(Large), StreakCalendar, BadgeDisplay, AlertsPanel, ActiveSessionBanner.

### 1 — ReconDesk (amber) — primary engagement app
- **Bento:** target detail as a layered workspace — Overview hero (status, IP, geo, enrichment) + tabbed Ports/Credentials/Attack-board/Timeline. **Attack Board** = polished kanban with glass cards, stage colour-coding, CVSS severity pills, drag affordances. CVSS widget visualised (severity gauge, not raw fields).
- **Viz:** severity distribution donut; timeline as an animated chronological track; small port/cred count chips.
- Components: TargetPanel, OverviewTab, AttackBoardTab/AttackBoard, CvssWidget, PortsTab, CredentialsTab, CvePanel, TimelineTab/CalendarView, FlagsSection, GlobalSearch.

### 2 — CyberLab Companion (purple)
- **Bento:** chat as the focal column with refined message/code-block styling + streaming; right rail of session panels (meta, timer, findings, hints) as stacked glass cards; command/encoder/cheatsheet tools in a clean tabbed tool area.
- **Viz:** stats view (labs done, difficulty distribution, streak) with Tremor charts; TimerHUD as a floating glass ring.
- Components: ChatPanel, MarkdownRenderer, SessionPanel/SessionMeta, TimerCard/TimerHUD, CommandBuilder, ReverseShell, Encoder, Cheatsheets, Snippets, FindingsPanel/Table, FlagTracker, MethodologyGuide, Progress, StatsView.

### 3 — GhostVault (blue)
- **Bento:** three-pane (tree / list / editor) with a refined editor (split/preview), floating glass **capture** window, polished graph view.
- **Viz:** tag cloud / graph view restyle; vault stats chips.
- Components: NoteEditor/Preview/List, FileTree, SearchView, TagsView, GraphView, TemplatesView, AIAssistantPanel/InlineAICommands, CaptureView, PresentationMode.

### 4 — SignalBoard (its accent)
- **Bento:** feed list + reading pane split; relevance score as a glowing badge; **Trends** view as the data-viz centrepiece.
- **Viz:** trends over time (ECharts/Chart.js for volume), relevance heat, source breakdown donut.
- Components: FeedList/Item/View, ReadingPane, SourcePanel, TrendsView, TimelineView, BookmarksView, AutoContextPanel, FeedFilterBar.

### 5 — ReportForge (its accent)
- **Bento:** document editor with a real "report" feel; findings list with severity pills; **Risk Matrix** and **Severity Chart** as featured viz; clean print view.
- **Viz:** risk matrix heatmap, severity distribution chart, CVSS gauges.
- Components: ReportEditor, SectionEditor/List, FindingEditor/Panel, SeverityBadge/Chart, RiskMatrix, CVELookup, CoverEditor, PrintView, ExportModal.

### 6 — CredVault (its accent)
- **Bento:** secure, calm vault feel; lock screen as a focal glass moment; credential rows with strength meters; audit view.
- **Viz:** password-strength meters, vault-health donut (strong/weak/reused).
- Components: LockScreen, VaultView, CredentialRow/Modal, ImportView, SettingsView (passwordAudit/Strength viz).

### 7 — VaultCore (green)
- **Bento:** scrape dashboard (active runs, metrics, composition) as a true analytics board; secret-detection + git views as distinct tabbed workspaces.
- **Viz:** vault composition chart, scrape run history timeline, source-health status grid, secret-severity breakdown.
- Components: DashboardView, MetricCards, ScrapeView/Summary, RunHistoryTable/ActiveRunsList, VaultHealthView/VaultCompositionChart, SecretDetectionView, ReposView/GitDiffViewer, SourceHealthView.

### 8 — PlaybookStudio (its accent)
- **Bento:** library of playbook cards; **run mode** as a satisfying step-checklist with progress ring and step detail.
- **Viz:** playbook completion progress ring, per-stage progress.
- Components: LibraryView, EditorView/StepEditor, RunView/StepDetail, HistoryView.

### 9 — TerminalLink (its accent)
- **Bento:** terminal panes as the hero with refined chrome; history/command-palette as glass overlays; context bar reflecting active target; replay timeline.
- **Viz:** command timeline / replay scrubber.
- Components: TerminalPane/Split, HistoryPanel/Search, CommandPalette, SshManager, ReplayView, AiPanel, ContextBar, GhostVaultModal.

### 10 — NetworkMap (its accent)
- **Bento:** graph canvas as the full-bleed hero; node detail + filters as floating glass panels; minimap.
- **Viz:** polish the topology graph — node states, subnet bubbles, animated layout, scan diff overlay (ECharts if the SVG graph struggles at scale).
- Components: GraphCanvas/Svg, SubnetBubbles, MiniMap, NodeDetail/ContextMenu, FilterPanel, GraphToolbar, DiffPanel, GraphLibrary.

### 11 — NetLab (its accent)
- **Bento:** labs list + step view; topology view; progress as a featured panel.
- **Viz:** progress rings, topology diagram polish.
- Components: LabsView/LabStepView, TopologyView, ReferenceView, SnippetsView, ProgressView.

### 12 — Cybertools Launcher (its accent)
- **Bento:** tray menu + app-card grid with LiveDots and quick stats; custom-slot cards; refined search window.
- **Viz:** mini activity strip, ecosystem online count.
- Components: AppCard/NewAppCard, CustomSlotsGrid/Modal, ActivityFeed, StatsStrip, SearchApp, SplashScreen.

---

# PART 7 — VERIFICATION

### Per app (before "done")
- [ ] Builds AND launches (no preload/sandbox error)
- [ ] Every prior function works (tabs, buttons, actions) — verified in browser tool
- [ ] Matches vision: depth, bento, distinctive type, motion, themed charts
- [ ] Dual theme works (≥2 combos tested)
- [ ] Charts responsive + animated + interactive
- [ ] A11y: contrast, focus, `prefers-reduced-motion`, keyboard nav
- [ ] Screenshots captured + shown to me
- [ ] One commit, clear message

### Definition of done (whole project)
- [ ] Phase A design system approved before any app
- [ ] All 13 apps redesigned, each verified as above
- [ ] No changes to stores, IPC, preload config, persistence, or config/event schemas
- [ ] Shared design system + chart theme = single source of truth (no hard-coded colours)
- [ ] Final summary: per-app changes, screenshots, anything skipped/uncertain

> **Sequencing:** keep `main` shippable; do all of this on `ui-redesign`. If my engagement needs a working app, I run `main`. A beautiful app that lost a feature is a regression, not a redesign — push back rather than ship that.
