# CYBERTOOLS ECOSYSTEM

## Master Ecosystem Specification

Version: 2.0
Creator: ItsEliias
Status: Active Ecosystem Design Specification

---

# OVERVIEW

CYBERTOOLS is a unified desktop-native cyber operations ecosystem designed and created by ItsEliias.

The ecosystem is not a collection of isolated apps.

It is a connected operational workspace platform focused on:

- cybersecurity workflows
- research and knowledge management
- productivity and operational awareness
- AI-assisted workflows
- vault intelligence
- tactical desktop tooling

The ecosystem should feel:

- premium
- cohesive
- restrained
- modern
- cinematic
- tactical
- operational
- believable
- desktop-native

The platform direction is:

> "Proton meets Obsidian meets Arc Browser inside a premium cyber operations workspace."

---

# ECOSYSTEM MAP

Every application in CYBERTOOLS has a defined role. No application duplicates the responsibility of another. Each feeds into the connected whole.

| Role                  | Application           | Status     |
|-----------------------|-----------------------|------------|
| OS Layer              | CyberOS               | Concept    |
| Notes / Capture       | GhostVault            | Active     |
| Vault Intelligence    | VaultCore             | Active     |
| Hacking Workspace     | CyberLab              | Active     |
| Ecosystem Launcher    | CYBERTOOLS Launcher   | Active     |
| Recon Platform        | Recon Engine          | Planned    |
| Payload Builder       | Payload Forge         | Planned    |
| Snippet System        | Arsenal               | Planned    |
| Ops Dashboard         | Ops Center            | Planned    |
| Session Replay        | Session Replay        | Planned    |

---

# ECOSYSTEM APPLICATIONS

## GhostVault
AI-powered note capture and operational knowledge management workspace.

Core responsibilities:
- rapid note capture (floating Command+N popup)
- AI-assisted formatting and markdown cleanup
- template selection and smart capture
- context-aware note generation
- TODO and IOC extraction
- structured note payload creation

GhostVault does NOT handle:
- vault organization or folder routing
- indexing or metadata enrichment
- duplicate detection or relationship mapping

These responsibilities belong to VaultCore.

GhostVault should feel like:
- Obsidian fused with a tactical cyber workspace
- fast, lightweight, always accessible
- a capture layer — not a storage engine

Context modes:
- **Cyber Mode** — HTB, pentest, recon, exploit workflows
- **Work Mode** — meetings, incidents, customer notes, tasks
- **Personal Mode** — journals, study notes, brain dumps

---

## VaultCore
Centralized vault intelligence engine and ingestion pipeline.

VaultCore receives structured note payloads from GhostVault and all other ecosystem apps and is solely responsible for:
- note ingestion and organization
- folder routing and categorization
- metadata enrichment and tagging
- deduplication and relationship mapping
- vault analytics and telemetry
- source scraping and sync
- conflict resolution
- publishing ecosystem-wide activity events

VaultCore should feel like:
- a professional data pipeline dashboard
- a cyber intelligence ingestion platform
- precise, trustworthy, and information-dense

---

## CyberLab
AI-assisted cybersecurity workflow environment and hacking companion.

Core responsibilities:
- lab tracking (HTB, THM, custom)
- session management and recon logging
- enumeration support and challenge guidance
- methodology workflows
- operational logging
- AI assistance during active engagements

CyberLab should feel like:
- a tactical operations companion
- a mission-control assistant
- structured and focused

---

## CYBERTOOLS Launcher
Compact system tray launcher and ecosystem hub.

Core responsibilities:
- application launching
- ecosystem-wide telemetry display
- activity feed aggregation
- quick actions and status monitoring
- notifications and ecosystem presence

The launcher is:
- lightweight and always available
- compact and information-dense
- the ecosystem's heartbeat

---

# INTER-APP COMMUNICATION

## Architecture

All ecosystem applications communicate through a shared event bus.

The canonical data flow is:

```
[Any App Action]
        ↓
  Ecosystem Event Bus
        ↓
   VaultCore / Launcher
        ↓
  Activity Feed + Telemetry
```

Example flow for note creation:

```
GhostVault creates note
        ↓
Emits structured note payload to Vault Event Bus
        ↓
VaultCore ingests, organizes, enriches
        ↓
VaultCore emits "note.created" ecosystem event
        ↓
Launcher activity feed refreshes
        ↓
Ops Center logs activity (future)
        ↓
Knowledge Graph links entities (future)
```

## Structured Note Payload

When GhostVault (or any app) creates a note, it emits a structured payload containing:

```json
{
  "title": "string",
  "content": "markdown string",
  "mode": "Cyber | Work | Personal",
  "template": "string",
  "tags": ["array"],
  "entities": ["extracted IOCs, names, targets"],
  "timestamps": { "created": "ISO8601" },
  "metadata": {},
  "attachments": [],
  "relatedSessions": [],
  "sourceApp": "GhostVault",
  "vaultDestinationSuggestion": "string"
}
```

## Communication Mechanism

In the current Electron architecture, inter-app communication should use:

- **Local IPC / named sockets** for same-machine app-to-app events
- **Shared local JSON state file** (watched via `fs.watch`) as a simple shared state bus during early development
- **Ecosystem Event Bus** (local WebSocket server hosted by Launcher) as the long-term target

Start with the shared JSON state approach and evolve toward the WebSocket bus as the ecosystem matures.

---

# MANDATORY APP SHELL

Every CYBERTOOLS application MUST implement the following shell structure. No exceptions.

## 1. Shared Header

```
[APP LOGO]   APP NAME
             // ItsEliias
```

Requirements:
- compact height — the header should not dominate the screen
- `// ItsEliias` appears as a muted subtitle in accent color at reduced opacity
- no oversized branding
- consistent placement across all apps

Examples:
```
◈  CYBERLAB
   // ItsEliias

◈  GHOSTVAULT
   // ItsEliias

◈  VAULTCORE
   // ItsEliias
```

## 2. Shared Navigation

Navigation must use a **structured sidebar or tab-based system**. Never dump all content onto a single screen.

Rules:
- Primary navigation lives in a left sidebar (icon + label)
- Active section is highlighted with the accent color
- Sidebar can collapse to icon-only mode for focus
- Content is shown one section at a time — not all at once
- Sub-sections within a view use horizontal tabs at the top of the content area
- Settings and configuration live in a dedicated Settings view, never inline with operational content

This creates the Proton-like structure: clean, navigable, never overwhelming.

## 3. Shared Footer / Status Bar

Every app includes a compact bottom status bar.

Format:
```
ItsEliias // [APP NAME] v[version]   [status indicators]   [telemetry]
```

Footer should include:
- subtle creator signature (left-aligned)
- sync state, connection status, operational indicators (right-aligned)
- compact height — never taller than one line
- muted styling, low visual noise

## 4. Shared Theme System

All apps use the same CSS variable-based theme system. See Design System section.

## 5. Shared Component Styling

All apps use the same visual component patterns. See Shared Component System section.

## 6. Shared Motion Feel

All apps use the same animation timing and easing. See Motion & Animation section.

---

# UX PHILOSOPHY — LESS NOISE, MORE STRUCTURE

The core UX principle is **progressive disclosure**: show what the user needs now, not everything at once.

Apps should feel like Proton Mail or Linear — structured, breathable, intentional — not like a terminal dashboard with every metric visible simultaneously.

## Structural Rules

- **One primary view at a time.** Navigation switches between focused views — the user is never looking at more than one operational context simultaneously.
- **Tabs for sub-navigation.** Within a view, horizontal tabs reveal sub-sections cleanly without adding panels.
- **Panels are focused.** Each panel serves one purpose. Never combine unrelated information in the same card.
- **Details on demand.** Summary-first, then detail on click or expand. Do not pre-expand all rows.
- **Empty states are designed.** An empty section should feel intentional — a prompt to action, not a blank void.
- **Modals for configuration.** Settings, edit forms, and confirmations appear in modals or slide-over panels — not inline.
- **No floating islands.** Elements should belong to a clear layout region. Avoid orphaned cards in open space.

## Information Hierarchy

Every screen should answer one primary question. Secondary information supports it — it does not compete with it.

Use visual weight (size, opacity, color) to enforce hierarchy. The most important element on a screen should be the most visually prominent.

---

# ECOSYSTEM PHILOSOPHY

The ecosystem should feel like:

> "a unified operational environment."

Users should feel:
- continuity between applications
- shared identity and shared intelligence
- shared workflows and operational cohesion
- persistent workspace state

The ecosystem should NOT feel like:
- disconnected Electron apps
- generic SaaS dashboards
- gamer cyberpunk interfaces
- flashy RGB software
- cluttered hacker UIs

The platform should prioritize:
- operational clarity
- workflow efficiency
- restrained atmosphere
- readability
- premium UX polish
- long-session usability

**Any new feature added to any app should be evaluated against:**

> "Does this feel like part of the CYBERTOOLS ecosystem?"

---

# DESIGN PHILOSOPHY

The CYBERTOOLS ecosystem should combine:

- Proton-level polish and structural clarity
- Arc Browser personality and navigation feel
- Obsidian flexibility and content density
- Linear-level spacing discipline
- tactical cyber atmosphere

The ecosystem must maintain:
- restraint
- clarity
- consistency
- usability
- professionalism

Avoid:
- excessive glow
- visual overload
- cluttered dashboards
- chaotic cyberpunk aesthetics
- gimmicky hacker visuals
- showing everything at once

The atmosphere should feel:
- cinematic
- tactical
- modern
- believable
- premium

---

# VISUAL LANGUAGE

All applications share:

- typography system
- spacing system (8pt grid)
- panel treatment and surface hierarchy
- animation philosophy and timing
- component styling and border systems
- layout rhythm
- telemetry styling
- interaction patterns (hover, focus, active states)

The ecosystem should visually feel like:

> "one platform with multiple operational modules."

---

# DESIGN SYSTEM

## Shared Stealth Theme (Default)

### Colors

```
Background:       #0e1117
Panels:           #161b22
Borders:          #30363d
Primary Accent:   #4a9eff
Secondary Accent: #7bb8ff
Text:             #c9d1d9
Muted Text:       #8b949e
```

### Typography

Preferred (in order):
- Inter
- Geist
- SF Pro
- System UI (fallback)

### Styling Direction

- soft shadows (never harsh drop shadows)
- thin borders at 1px
- subtle glassmorphism on floating panels and modals
- layered surfaces (background → panel → card → widget)
- restrained glow — accent glow only on interactive elements
- premium spacing — breathe, don't compress
- rounded corners (6–8px standard, 12px for cards)
- minimal gradients (directional, not radial bursts)

---

# LAYERED THEME ARCHITECTURE

The ecosystem implements a layered theme architecture.

Every theme is the combination of:
1. **One Core Theme** — controls workspace tone, surface contrast, and overall darkness level
2. **One Personality Theme** — controls accent color, glow behavior, and atmospheric energy

This creates **workspace identities**, not skins.

Examples:
- Stealth + Cyberpunk
- Graphite + Neutral
- Frost + Warrior
- OLED + Terminal

---

# CORE THEMES

Core themes define surface hierarchy and contrast. They affect backgrounds, panels, borders, shadows, and contrast. They never affect layout, spacing, navigation, or usability.

---

## STEALTH
Default operational environment.

Feel: tactical, cinematic, restrained, premium

```
Background: #0e1117
Panels:     #161b22
Borders:    #30363d
Accent:     #4a9eff
Secondary:  #7bb8ff
Text:       #c9d1d9
```

---

## GRAPHITE
Professional productivity environment. Proton-inspired.

Feel: calm, modern, workspace-focused, highly readable

```
Background: #111318
Panels:     #1a1f27
Borders:    #2a313d
Accent:     #6ea8fe
Secondary:  #9ec5fe
Text:       #d8dee9
```

---

## FROST
Light operational analyst environment.

For use in high-ambient-light environments, daytime report writing, or SOC analyst workflows where a light background reduces eye strain under fluorescent lighting.

Feel: intelligence workstation, clean SOC dashboard, surgical clarity

```
Background: #f3f6fb
Panels:     #ffffff
Borders:    #d7dde7
Accent:     #3b82f6
Secondary:  #64748b
Text:       #111827
```

---

## OLED
Ultra-minimal cinematic workspace. True black for OLED displays.

Feel: luxury tactical workspace, distraction-free, premium minimalism

```
Background: #000000
Panels:     #0b0b0b
Borders:    #1a1a1a
Accent:     #4a9eff
Secondary:  #7bb8ff
Text:       #f5f5f5
```

---

# PERSONALITY THEMES

Personality themes define atmospheric tone, accent identity, glow behavior, and cinematic flavor. They never damage readability, alter layouts, or overpower usability.

---

## NEUTRAL
Restrained, calm, productivity-focused.

Behavior: minimal glow, subtle accents, reduced atmosphere. Use when operational clarity is the priority.

---

## TERMINAL
Tactical console. Military terminal feel.

```
Accent:    #00ff41
Secondary: #7dff9b
```

Behavior: restrained green telemetry, subtle terminal glow, monospace styling on telemetry widgets.

---

## CYBERPUNK
Cinematic synthwave. Blade Runner-inspired.

```
Accent:    #b44fff
Secondary: #00ffe0
```

Behavior: restrained magenta/cyan glow, atmospheric neon styling. Premium, not gaudy.

---

## THREAT
Offensive operations mode. Tactical alert state.

```
Accent:    #cc0000
Secondary: #ff4d4d
```

Behavior: restrained red accents, alert-state atmosphere, tactical intensity. Use sparingly — reserved for active engagement contexts.

---

# SHARED COMPONENT SYSTEM

All CYBERTOOLS applications should move toward a shared reusable component library.

Core components:

| Component        | Purpose                                      |
|------------------|----------------------------------------------|
| `AppHeader`      | Consistent header with logo, name, signature |
| `AppFooter`      | Status bar with telemetry and version        |
| `Sidebar`        | Primary navigation — icons + labels          |
| `TabBar`         | Horizontal tab navigation within views       |
| `ThemeProvider`  | CSS variable injection for active theme      |
| `CyberCard`      | Standard content card                        |
| `GlowButton`     | Primary action button with accent glow       |
| `StatusPill`     | Inline status indicator (active, idle, etc.) |
| `ActivityFeed`   | Scrollable ecosystem event stream            |
| `TelemetryWidget`| Stats panel — counts, rates, last sync       |
| `Modal`          | Overlay for settings, forms, confirmations   |
| `CommandPalette` | Keyboard-driven global action search         |
| `SearchBar`      | Consistent in-view search input              |
| `WorkspaceLayout`| Root layout wrapper — header, sidebar, main  |

Shared requirements across all components:
- identical border radius (6px standard, 12px cards)
- identical hover state transitions (150ms ease)
- identical focus ring styling (accent color, 2px)
- identical glow styling (box-shadow accent at 20–30% opacity)
- identical animation timing (see Motion section)

---

# MOTION & ANIMATION

Motion philosophy: subtle, restrained, premium, responsive, calm.

Preferred motion:
- smooth fades (opacity: 150ms ease)
- subtle scale on hover (scale 1.01–1.02, never more)
- soft panel entry (translateY 8px → 0, 200ms ease-out)
- restrained transitions between views (fade, not slide chaos)
- layered movement — stagger list items by 30ms

Standard timing tokens:
```
Fast:     100ms  — hover states, focus rings
Standard: 200ms  — panel entry, modal open
Slow:     350ms  — view transitions, full-screen changes
Easing:   ease-out for entry, ease-in for exit
```

Avoid:
- flashy animations or exaggerated cyber effects
- excessive or distracting transitions
- motion that delays the user
- animation on every interaction

Inspiration: Arc Browser, Proton Mail, Linear.

---

# BRANDING STRUCTURE

## Creator Identity
ItsEliias

## Ecosystem Identity
CYBERTOOLS

## Application Identity
Examples: GhostVault, VaultCore, CyberLab, Recon Engine, Payload Forge

## Signature Style

```
// ItsEliias
```

This signature appears:
- as a muted subtitle in the app header
- in the footer status bar
- in code file headers (as a comment)

Branding should feel:
- understated and premium
- restrained and tactical
- creator-signed, not corporate

Branding should NEVER be:
- oversized or loud
- intrusive or repeated excessively
- a distraction from the operational content

---

# TECHNICAL DIRECTION

## Target Stack

```
Runtime:    Electron (desktop-native)
UI:         React
Styling:    Tailwind CSS
Animation:  Framer Motion
```

Note: Existing apps (CyberLab, GhostVault) are currently built with vanilla Electron (plain HTML/CSS/JS). The React + Tailwind stack is the target for future apps and eventual refactors. When Claude is working on an existing vanilla app, maintain its current stack unless a migration is explicitly requested. When building a new app from scratch, use the target stack.

## Architecture Goals

- modular and reusable
- scalable across the ecosystem
- ecosystem-ready (event bus compatible)

## Preferred Architecture Patterns

- shared UI component packages (or shared CSS design tokens in vanilla apps)
- centralized theme system (CSS variables)
- reusable hooks / utilities
- event-driven architecture for cross-app communication
- clear separation: capture layer → intelligence layer → display layer

---

# DATA & PRIVACY

The CYBERTOOLS ecosystem is **local-first**.

All data — notes, vault contents, lab tracking, recon logs, configuration — is stored on the user's machine. No data is sent to external servers. No telemetry is phoned home. No cloud sync unless explicitly built and opted into by the user.

This is non-negotiable. It is core to the "Proton-level trust" positioning.

When designing features:
- default to local storage
- never silently send data anywhere
- if cloud sync is ever added, it must be explicit, opt-in, and clearly communicated

---

# ECOSYSTEM TELEMETRY

Telemetry in CYBERTOOLS refers to **local operational metrics** — activity data shared between apps on the same machine. Not external analytics.

Long-term ecosystem telemetry goals:
- shared activity feed (visible in Launcher and Ops Center)
- shared events emitted by each app
- operational history and vault analytics
- launcher synchronization and cross-app awareness

Example events each app should emit:
```
ghostvault.note.created
ghostvault.note.formatted
vaultcore.sync.completed
vaultcore.source.added
cyberlab.session.started
cyberlab.flag.captured
cyberlab.lab.completed
launcher.app.opened
```

These events feed the shared Activity Feed and Launcher telemetry display.

---

# UX PRINCIPLES

The ecosystem should prioritize:
- clarity and workflow speed
- operational awareness with low cognitive load
- premium usability and long-session comfort

Interfaces should:
- breathe — adequate spacing is not wasted space
- feel intentional — every element has a reason to be there
- avoid clutter — if in doubt, leave it out
- guide the eye naturally using hierarchy and whitespace

Accent colors should be used:
- sparingly — only on interactive elements, active states, and key metrics
- intentionally — never as decoration
- functionally — to draw attention to what matters

---

# LONG-TERM DIRECTION — CYBEROS

CyberOS is not a literal operating system.

CyberOS represents:

> "a unified operational workspace layer built on top of the CYBERTOOLS ecosystem."

The long-term goal is an environment where all apps feel like modules of a single platform:

- shared workspace state persisted across sessions
- synchronized telemetry across all apps
- ecosystem-wide activity feeds in Launcher and Ops Center
- shared command palette accessible from any app
- shared notifications system
- unified theme system applied ecosystem-wide
- AI orchestration layer coordinating across apps
- ecosystem plugin system for user extensibility
- workspace presets (e.g., "HTB Mode" loads CyberLab + GhostVault in Cyber mode)
- mobile companion app for remote operational awareness
- dynamic operational themes triggered by context (e.g., active engagement = Threat personality auto-applied)

Users should feel like they are:

> "inside one operational environment — not a collection of tools."

---

# FINAL ECOSYSTEM GOAL

The CYBERTOOLS ecosystem should ultimately feel like:

> "a premium operational workspace platform for cybersecurity, research, productivity, and tactical knowledge management — built by ItsEliias."

Every design and engineering decision should reinforce:
- ecosystem cohesion and operational immersion
- premium UX quality and restrained atmosphere
- professional usability and interconnected workflows
- creator identity and desktop-native polish

The ecosystem should always feel:
- intentional
- cinematic
- tactical
- believable
- cohesive
- modern
- operational
- premium

---

*// ItsEliias*
