# CYBEROS DESIGN BIBLE
### ItsEliias // CyberOS Platform — Version 1.1

> **Every Manus prompt for CyberOS must begin by reading this document.**
> This document overrides all other design decisions.
> Do not introduce patterns that conflict with this bible.
> Every decision must serve the operator, not aesthetic trends.

---

## TABLE OF CONTENTS

1. [Ecosystem Vision](#1-ecosystem-vision)
2. [Product Philosophy](#2-product-philosophy)
3. [User Persona](#3-user-persona)
4. [Design Philosophy](#4-design-philosophy)
5. [UX Philosophy](#5-ux-philosophy)
6. [AI Philosophy](#6-ai-philosophy)
7. [Color System](#7-color-system)
8. [Typography](#8-typography)
9. [Spacing & Layout](#9-spacing--layout)
10. [Iconography](#10-iconography)
11. [Navigation Standards](#11-navigation-standards)
12. [Component Standards](#12-component-standards)
13. [Animation Standards](#13-animation-standards)
14. [Information Architecture](#14-information-architecture)
15. [Ecosystem Awareness Standards](#15-ecosystem-awareness-standards)
16. [App Communication Standards](#16-app-communication-standards)
17. [State Management Standards](#17-state-management-standards)
18. [IPC Standards](#18-ipc-standards)
19. [Empty, Loading & Error States](#19-empty-loading--error-states)
20. [App Accent Colors](#20-app-accent-colors)
21. [Window Standards](#21-window-standards)
22. [Accessibility](#22-accessibility)
23. [**Visual Effects System**](#23-visual-effects-system)
9. [Spacing & Layout](#9-spacing--layout)
10. [Iconography](#10-iconography)
11. [Navigation Standards](#11-navigation-standards)
12. [Component Standards](#12-component-standards)
13. [Animation Standards](#13-animation-standards)
14. [Information Architecture](#14-information-architecture)
15. [Ecosystem Awareness Standards](#15-ecosystem-awareness-standards)
16. [App Communication Standards](#16-app-communication-standards)
17. [State Management Standards](#17-state-management-standards)
18. [IPC Standards](#18-ipc-standards)
19. [Empty, Loading & Error States](#19-empty-loading--error-states)
20. [App Accent Colors](#20-app-accent-colors)
21. [Window Standards](#21-window-standards)
22. [Accessibility](#22-accessibility)

---

## 1. ECOSYSTEM VISION

CyberOS is a **personal cybersecurity operating system** for a single elite operator.

It is not a SaaS product. It is not designed for teams. It is not a demo. It is a precision instrument built for one person who conducts authorised penetration tests, participates in HTB/THM labs, manages a deep knowledge vault, and monitors security intelligence — all from a single desktop environment.

The ecosystem consists of **12 purpose-built Electron applications** that share a file-based communication fabric (`cybertools-config.json` + `ecosystem-events.json`). Each app owns exactly one domain. No two apps duplicate responsibilities.

**The vision:** When the operator sits down to work, CyberOS is already aware of what they're doing. The active lab is known. The target is known. The notes are auto-linked. The intelligence feed is pre-scored. The terminal is pre-loaded with `$TARGET`. The operator focuses on the mission. CyberOS handles the context.

**The end state:** CyberOS should feel like a **professional cybersecurity operating system**, not a collection of separate Electron apps. Every design decision must serve that feeling.

---

## 2. PRODUCT PHILOSOPHY

### One domain, one app
Every app owns its domain completely. ReconDesk owns targets. GhostVault owns notes. CredVault owns credentials. There is no overlap. When designing a screen, you must not add features that belong to another app.

### Context propagates automatically
The operator should never have to manually copy data between apps. When a lab session starts in CyberLab, every app in the ecosystem knows. When a target is set in ReconDesk, TerminalLink injects `$TARGET` automatically. Design every app with this in mind — the current session context should be visible everywhere it's relevant.

### File-based, local, private
There is no server. No cloud sync. No external accounts required. Everything lives on the operator's machine. Designs must not imply cloud dependencies. Every data visualization represents real local data.

### Everything is intentional
This is not a consumer product. The operator is an expert. Don't dumb things down. Don't hide information behind extra clicks "to avoid overwhelming users." Show the data. Trust the operator.

### Speed is a feature
Every interaction must feel instant. No unnecessary loading states. No skeleton screens where real data can load in <100ms. Transitions must be purposeful, not decorative. The operator is mid-engagement. Every second of friction costs focus.

---

## 3. USER PERSONA

**Name:** ItsEliias (the operator)

**Context:**
- Solo cybersecurity operator
- Conducts authorised penetration tests
- Participates in TryHackMe and HackTheBox labs
- Manages an Obsidian knowledge vault with hundreds of notes
- Monitors security intelligence feeds
- Builds and runs methodology playbooks
- Generates professional reports for engagements
- Uses all 12 apps in sequence during a live session

**Technical level:** Expert. Comfortable with terminals, nmap, Metasploit, privilege escalation, Active Directory, web app security. Knows what every piece of data means.

**Work context:**
- Often working in a flow state, mid-engagement
- May have a second monitor running CyberOS Dashboard
- Switches rapidly between apps during live sessions
- Values information density over whitespace
- Hates unnecessary confirmations and click-through flows
- Expects the system to know what they're doing

**Primary workflows:**
1. Lab session (CyberLab + ReconDesk + TerminalLink + PlaybookStudio + GhostVault)
2. Intelligence review (SignalBoard + GhostVault + VaultCore)
3. Report generation (ReportForge + ReconDesk + GhostVault)
4. Knowledge maintenance (GhostVault + VaultCore)

---

## 4. DESIGN PHILOSOPHY

### Reference aesthetics — what CyberOS should feel like

| Reference | What to take from it |
|---|---|
| **Raycast** | Keyboard-first, instant, clean command surfaces |
| **Linear** | Information density, purposeful animations, professional dark UI |
| **Grafana** | Data panels, metric cards, time-series visualization, dashboard grid |
| **Obsidian** | Knowledge graph, note relationships, dark workspace |
| **Arc Browser** | Sidebar navigation, spaces concept, elegant compactness |
| **Security Operations Centre** | Alert tiers, status indicators, real-time feeds, operator awareness |
| **Mission Control** | Everything visible at once, spatial awareness of the ecosystem |

### What CyberOS is NOT

- Not Material Design
- Not Fluent Design
- Not a generic SaaS dashboard
- Not Bootstrap or default Tailwind templates
- Not rounded-corner card soup
- Not a mobile-first design scaled up

### Visual character

CyberOS should feel like **purpose-built military-grade software**. The aesthetic is dark, dense, precise, and alive with real data. Every pixel earns its place. No decorative elements. No stock illustrations. No gradient hero sections. No marketing copy.

If a screen could belong to a generic SaaS app, it doesn't belong in CyberOS.

---

## 5. UX PHILOSOPHY

### Information hierarchy

Every screen must have a primary action and a clear visual hierarchy. The operator's eye should travel in a predictable path: status → context → primary data → actions.

### Density over whitespace

The operator is an expert who needs data. Default to higher information density. Padding and spacing should be tight but not cramped. Use spacing to create structure, not decoration.

### Keyboard-first

Every primary action must be keyboard accessible. Common actions get keyboard shortcuts. Search is always available. Tab order must be logical.

### Contextual awareness always visible

Every app that benefits from knowing the active lab/target/session must show that context in its header or a persistent context bar. The operator should never have to remember what they were working on — the app tells them.

### Confirmations only for destructive actions

Do not ask for confirmation to save, navigate, or view. Only confirm irreversible destructive actions (delete target, wipe vault, clear session). Every unnecessary confirmation dialog is a failure.

### Empty states must guide

An empty state is an opportunity to teach the operator what this section does and give them the one action to populate it. Never show a blank panel with nothing.

### Errors must explain and offer a path forward

Error states must say what went wrong and what to do about it. "Something went wrong" is not an error message. "Could not parse nmap XML — check that output includes open port data" is.

---

## 6. AI PHILOSOPHY

CyberOS integrates AI (Claude API + local Ollama) as an **assistant**, not as the product.

### AI design rules

- AI is always **opt-in**. Never auto-invoke AI without operator action.
- AI responses appear in **dedicated panels**, never overwriting real data.
- AI actions are always **reversible or ignorable** — the operator decides whether to apply a suggestion.
- AI latency must be visible — show a streaming indicator during generation.
- **Local Ollama is always an option** — the UI must support routing to local models without requiring an API key.
- AI errors must be graceful — if Claude is unavailable, show a clear state with a fallback option.
- AI suggestions are labelled as AI — never present generated content as ground truth.

### AI surface patterns

- **Chat panel** — conversational AI assistant (CyberLab, GhostVault)
- **Summarise button** — single-action AI summary (SignalBoard articles)
- **Generate button** — create content from context (ReportForge, CyberLab writeup)
- **Tag suggestions** — AI-assisted tagging (VaultCore)
- **Smart import** — AI-parsed data extraction (ReconDesk nmap, ReportForge wizard)

---

## 7. COLOR SYSTEM

### Base palette

CyberOS uses a strict dark-first palette. There is no light mode.

```css
/* Backgrounds — layered depth system */
--bg-base:        #0a0a0f;   /* Deepest background, window chrome */
--bg-surface:     #0f1117;   /* Primary content surfaces */
--bg-elevated:    #161b27;   /* Cards, panels, sidebars */
--bg-overlay:     #1c2333;   /* Modals, dropdowns, tooltips */
--bg-interactive: #1e2a3a;   /* Hover states on interactive elements */

/* Borders */
--border-subtle:  #1e2433;   /* Dividers, subtle separators */
--border-default: #2a3347;   /* Card borders, input borders */
--border-strong:  #3d4f6b;   /* Active/focused borders */

/* Text */
--text-primary:   #e6edf3;   /* Primary content */
--text-secondary: #8b949e;   /* Labels, metadata, secondary info */
--text-muted:     #484f58;   /* Placeholders, disabled states */
--text-inverse:   #0a0a0f;   /* Text on accent backgrounds */

/* Semantic colors */
--success:        #3fb950;   /* Confirmed, active, healthy */
--warning:        #d29922;   /* Caution, expiring, medium risk */
--danger:         #f85149;   /* Critical, error, high risk */
--info:           #58a6ff;   /* Informational, in-progress */

/* Risk tier colors */
--risk-critical:  #ff4444;   /* Critical findings */
--risk-high:      #ff8800;   /* High severity */
--risk-medium:    #ffcc00;   /* Medium severity */
--risk-low:       #44cc44;   /* Low severity */
--risk-info:      #8b949e;   /* Informational */
```

### App accent colors

Each app has one accent color used for: active states, progress indicators, key metrics, and branding in the Launcher/Dashboard.

```css
--accent-launcher:    #b44fff;   /* Cybertools Launcher — Purple */
--accent-dashboard:   #4a9eff;   /* CyberOS Dashboard — Blue */
--accent-cyberlab:    #b44fff;   /* CyberLab Companion — Purple */
--accent-recondesk:   #d29922;   /* ReconDesk — Amber */
--accent-ghostvault:  #7bb8ff;   /* GhostVault — Soft Blue */
--accent-vaultcore:   #3fb950;   /* VaultCore — Green */
--accent-signalboard: #ff6b6b;   /* SignalBoard — Coral */
--accent-credvault:   #f78166;   /* CredVault — Soft Red */
--accent-playbook:    #4a9eff;   /* PlaybookStudio — Blue */
--accent-reportforge: #3fb950;   /* ReportForge — Green */
--accent-terminallink:#00ff41;   /* TerminalLink — Matrix Green */
--accent-networkmap:  #d29922;   /* NetworkMap — Amber */
--accent-agenticos:   #ff9500;   /* AgenticOS — Orange */
```

### Color usage rules

- **Never use accent colors for body text** — accents are for UI chrome, indicators, and data highlights only
- **Never use more than 2 accent colors on a single screen** — the app's own accent + one semantic color
- **Opacity modifiers** — use `accent/10` for tinted backgrounds, `accent/20` for hover tints, `accent/100` for active elements
- **Gradients** — only on specific hero elements (session timer, skill radar fill). Never on cards or backgrounds.

---

## 8. TYPOGRAPHY

### Font stack

```css
/* Primary — UI and content */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Monospace — terminal, code, commands, IPs, hashes */
font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

### Type scale

```
--text-xs:   11px / 1.4   — badges, metadata, timestamps, status labels
--text-sm:   13px / 1.5   — table cells, secondary labels, descriptions
--text-base: 14px / 1.6   — body text, primary content, list items
--text-md:   15px / 1.5   — card titles, section headers
--text-lg:   18px / 1.4   — panel headings, primary metric values
--text-xl:   22px / 1.3   — page titles, dashboard headers
--text-2xl:  28px / 1.2   — hero metrics (streak count, flag count)
--text-3xl:  36px / 1.1   — large display numbers
```

### Weight usage

```
400 — body text, descriptions
500 — labels, navigation items, secondary headings
600 — card titles, section headings, metric labels
700 — primary headings, key metrics, emphasis
```

### Monospace contexts (always use JetBrains Mono)

- IP addresses
- Port numbers
- Hashes (NTLM, MD5, SHA)
- Usernames / passwords
- Terminal output
- nmap output
- Commands
- File paths
- Version strings
- Timestamps in data tables

### Typography rules

- Never center-align body text — left-aligned only
- Use `tabular-nums` for all numeric data that changes dynamically (timers, counts, metrics)
- Truncate long strings with `text-ellipsis` — never wrap inside table cells
- Code/commands always in monospace with a subtle `bg-elevated` background

---

## 9. SPACING & LAYOUT

### Spacing scale (Tailwind-compatible)

```
2px  — micro gaps (badge internals, icon padding)
4px  — tight gaps (related label + value)
6px  — compact row padding
8px  — default inner padding for small components
12px — default gap between related elements
16px — standard panel padding, card padding
20px — section spacing within a panel
24px — major section separation
32px — panel-to-panel gaps
48px — large layout gaps
```

### Layout grid

Every app uses a **sidebar + main content** layout as the primary structure.

```
┌──────────────────────────────────────────────────┐
│  Window Title Bar (custom, draggable)             │
├───────────┬──────────────────────────────────────┤
│           │  Content Header (breadcrumb + actions)│
│  Sidebar  ├──────────────────────────────────────┤
│  (220px)  │                                      │
│           │  Primary Content Area                │
│  Nav +    │                                      │
│  Context  │                                      │
│           │                                      │
├───────────┴──────────────────────────────────────┤
│  Status Bar (ecosystem context, VPN, status)      │
└──────────────────────────────────────────────────┘
```

### Panel layouts

For data-heavy screens, use a multi-panel layout:

```
┌────────────────────────────────────────┐
│  Left panel (320px)  │  Right panel    │
│  List / Navigation   │  Detail view    │
│                      │                 │
└────────────────────────────────────────┘
```

Or three-column for maximum density (Dashboard, ReconDesk):

```
┌──────────┬────────────────────┬──────────┐
│  Left    │  Center (primary)  │  Right   │
│  280px   │  flex-1            │  320px   │
└──────────┴────────────────────┴──────────┘
```

### Minimum window sizes

```
Launcher tray popup:  480 × 620px
CyberOS Dashboard:    1200 × 800px
CyberLab Companion:   1100 × 760px
ReconDesk:            1200 × 800px
GhostVault:           960 × 680px (capture: 480 × 400px)
VaultCore:            1100 × 720px
SignalBoard:          1100 × 760px
CredVault:            900 × 640px
PlaybookStudio:       1100 × 760px
ReportForge:          1200 × 800px
TerminalLink:         1000 × 700px
NetworkMap:           1200 × 800px
```

---

## 10. ICONOGRAPHY

### Icon library

Use **Lucide React** as the primary icon library. It matches the precise, clean aesthetic of CyberOS. Do not mix icon libraries on the same screen.

### Icon sizes

```
12px — micro (inline in badges, status dots)
14px — small (table action buttons)
16px — default (navigation items, inline icons)
18px — medium (card headers, primary actions)
20px — large (section icons, empty states)
24px — xl (feature icons, modal headers)
32px — hero (app icons in Launcher)
```

### Icon color rules

- Navigation icons: `text-secondary` default, `app-accent` when active
- Action icons: match button context (danger actions = `text-danger`)
- Status icons: always semantic (green shield = healthy, red warning = error)
- Never use icons as pure decoration — every icon communicates something

### Custom icon contexts

For app-specific icons not in Lucide, use simple SVG inline components following the same size/color conventions.

---

## 11. NAVIGATION STANDARDS

### Sidebar navigation

Every app (except Launcher tray popup and GhostVault capture window) uses a left sidebar for primary navigation.

```
Sidebar structure:
├── App logo / name (top, 16px padding)
├── Context strip (active lab/target — if relevant)
├── ─── divider ───
├── Primary nav items (icon + label, 40px height)
│   ├── Active: accent-colored left border + tinted bg
│   └── Hover: subtle bg elevation
├── ─── divider ───
├── Secondary nav (settings, help)
└── Ecosystem status mini (bottom)
```

### Navigation item anatomy

```
┌─────────────────────────────────┐
│ [accent bar] [icon] [Label]     │  ← active state
│             [icon] [Label]      │  ← default state
│             [icon] [Label] [3]  │  ← with badge count
└─────────────────────────────────┘
```

### Breadcrumb pattern

Content headers use breadcrumb navigation for deep views:

```
App Name  /  Section  /  Item Name           [Action buttons]
```

### Tab navigation

Within a screen, use horizontal tabs for sub-sections. Tabs use a bottom-border active indicator in the app's accent color, not background fill.

```
Overview    Findings    Timeline    Settings
─────────   ────────    ────────    ────────
            ████████                          ← accent underline on active
```

---

## 12. COMPONENT STANDARDS

### Cards

```
┌─────────────────────────────────────────┐
│  [icon] Card Title            [action]  │  ← header: bg-elevated, border-b
├─────────────────────────────────────────┤
│  Card body content                      │  ← bg-surface or bg-elevated
│  Metric / data / text                   │
└─────────────────────────────────────────┘

Border: 1px border-default
Border-radius: 8px
Header padding: 12px 16px
Body padding: 16px
```

### Metric cards

For numeric KPIs on dashboards:

```
┌─────────────────────────────┐
│  Label text          [icon] │
│  123                        │  ← large display number
│  ↑ 12% from yesterday      │  ← delta indicator
└─────────────────────────────┘
```

### Status badges

```
● Active      — green dot + "Active" in success color
● Inactive    — grey dot + "Inactive" in muted color
● Warning     — amber dot + label in warning color
● Error       — red dot + label in danger color
● Locked      — lock icon + "Locked" in warning color
● Running     — animated pulse dot + "Running"
```

Anatomy: `px-2 py-0.5 rounded text-xs font-medium` with semantic background at 15% opacity.

### Tables

```
Header row: bg-elevated, text-secondary, text-xs uppercase, sticky
Data rows: bg-surface, border-b border-subtle, 40px height
Hover: bg-interactive
Selected: accent/10 background + accent left border
Monospace: IPs, ports, hashes, timestamps
Actions: appear on row hover (right-aligned icon buttons)
```

### Input fields

```
Height: 36px (standard), 32px (compact), 40px (prominent)
Border: border-default, focus: border-strong + accent ring (2px, accent/30)
Background: bg-elevated
Border-radius: 6px
Placeholder: text-muted
Label: text-sm text-secondary above the field
```

### Buttons

```
Primary:   bg-accent text-inverse, hover: brightness-110
Secondary: bg-elevated border-default text-primary, hover: bg-interactive
Ghost:     transparent, hover: bg-interactive
Danger:    bg-danger/10 border-danger/30 text-danger, hover: bg-danger/20
Icon:      square, same height as adjacent button
Size-sm:   h-7 px-3 text-xs
Size-md:   h-8 px-4 text-sm (default)
Size-lg:   h-10 px-6 text-base
```

### Dropdowns & Menus

```
Background: bg-overlay
Border: border-default
Border-radius: 8px
Shadow: 0 8px 32px rgba(0,0,0,0.4)
Item height: 36px
Item padding: 8px 12px
Item hover: bg-interactive
Divider: border-subtle 1px
Keyboard shortcut: right-aligned, text-muted monospace
```

### Modals

```
Overlay: rgba(0,0,0,0.6) backdrop
Container: bg-surface, border-default, border-radius 12px
Max-width: 480px (small), 640px (medium), 800px (large), 1000px (xl)
Header: 16px padding, title + close button
Body: 20px padding
Footer: 16px padding, right-aligned action buttons
Animation: scale from 0.96 + fade in, 200ms ease-out
```

### Context strip (ecosystem awareness bar)

Every app that reads from `shared_context` shows a context strip below the sidebar header:

```
┌─────────────────────────────────┐
│  🔴 Active Lab: Pickle Rick     │
│  🎯 Target: 10.10.3.164        │
└─────────────────────────────────┘
```

- Only visible when there IS active context
- Shows in `bg-accent/10` tint with accent border-left
- Clicking it navigates to the relevant app or detail
- Disappears (slides up) when context is cleared

### Status bar (bottom)

Every app has a slim status bar at the bottom of the window:

```
┌─────────────────────────────────────────────────────┐
│ [App Status]  [VPN: Connected / Disconnected]  [UTC] │
└─────────────────────────────────────────────────────┘
Height: 24px, text-xs, bg-base, border-t border-subtle
```

---

## 13. ANIMATION STANDARDS

### Library

Use **Framer Motion** exclusively. Do not use CSS keyframes for interactive animations. CSS transitions are acceptable for simple color/opacity changes on hover.

### Animation principles

1. **Purposeful** — every animation communicates something (state change, relationship, progress)
2. **Fast** — UI animations: 150–200ms. Page transitions: 250–300ms. Never exceed 400ms for UI chrome.
3. **Easing** — use `easeOut` for entrances, `easeIn` for exits, `easeInOut` for transforms
4. **No bounce** — do not use spring physics with visible bounce for professional UI elements. Reserve spring for playful micro-interactions (achievement unlock, flag capture).

### Standard animation variants

```typescript
// Page/panel entrance
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.15, ease: 'easeIn' } }
}

// Card entrance (staggered)
export const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } }
}

// Slide-in panel (right)
export const slideInRight = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { x: 20, opacity: 0, transition: { duration: 0.15 } }
}

// Modal
export const modalVariants = {
  initial: { scale: 0.96, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { scale: 0.96, opacity: 0, transition: { duration: 0.15 } }
}

// Status pulse (active sessions, live feeds)
// CSS: animate-pulse on status dot
```

### Specific animation rules

- **List items entering** — stagger at 40ms intervals, 200ms duration each
- **Number counters** — animate from previous value to new value over 600ms on first render
- **Progress bars** — animate width from 0 to target on mount, 500ms ease-out
- **Radar charts** — draw from center outward on mount, 800ms ease-out
- **Activity feed items** — slide in from right when new items arrive
- **Timer** — no animation on tick, just number update with `tabular-nums`
- **Status dots** — pulse animation only when `active: true`

---

## 14. INFORMATION ARCHITECTURE

### Global information hierarchy

```
Level 1 — Ecosystem (CyberOS Dashboard, Launcher)
  Shows: all app statuses, operator profile, ecosystem events

Level 2 — Domain (each app's main dashboard)
  Shows: app's primary data, current context, key metrics

Level 3 — Item (target detail, note editor, playbook run)
  Shows: full detail of a single item, all related data

Level 4 — Action (modal, drawer, form)
  Shows: focused interaction for a single task
```

### Priority hierarchy within a screen

1. **Active context** (what session/target/lab is active RIGHT NOW)
2. **Primary metric** (the most important number for this app's domain)
3. **Primary data list** (the main list of items this app manages)
4. **Actions** (what the operator can do)
5. **Secondary data** (related information, history, metadata)

### Data recency signaling

Always show when data was last updated for any live-polled data:

```
Last updated: 23s ago   [Refresh ↺]
```

If data is stale (>5 minutes), show a warning indicator.

---

## 15. ECOSYSTEM AWARENESS STANDARDS

### Every app must show

1. **Its own active status** — clear indication of what the app is currently doing
2. **Active session context** — if `shared_context.activeLab` or `activeTarget` is set, show it
3. **Ecosystem event feed** — at minimum, the last 5 ecosystem events accessible via a panel or status bar area
4. **VPN status** — shown in the status bar

### Ecosystem context rules

- Read `shared_context` from `cybertools-config.json` every 10 seconds (or on file-change watch)
- If `activeLab` is set: show a lab indicator in the sidebar context strip
- If `activeTarget` is set: show target IP and name in relevant positions
- Context strips are **accent-tinted panels**, not plain text
- Context data must be **live** — update when the file changes, don't require app restart

### Cross-app navigation

Where relevant, apps should allow the operator to jump to related apps:

```
"Open in ReconDesk"   — from CyberLab findings
"Open in GhostVault"  — from CyberLab writeup
"View in NetworkMap"  — from ReconDesk ports
"Import to CredVault" — from ReconDesk credentials
```

These are icon buttons or context menu items — not prominent UI elements.

---

## 16. APP COMMUNICATION STANDARDS

### cybertools-config.json

**Location:** `~/cybertools-config.json`

Every app reads and writes this file. Key rules:

- **Read:** poll every 5–10 seconds OR use `fs.watch` for immediate updates
- **Write:** use atomic writes (write to `.tmp` then rename) to prevent corruption
- **Schema:** always validate before writing — never corrupt the shared config
- Each app writes only its own `[app]_status` key and `shared_context` fields it owns
- Never read the entire file into state — extract only what the app needs

### ecosystem-events.json

**Location:** `~/Library/Application Support/CyberTools/ecosystem-events.json`

Append-only event log. Rules:

- **Append only** — never overwrite, never delete entries
- **Max entries:** trim to last 500 entries on write to prevent unbounded growth
- **Schema:** `{ id, timestamp, app, event, data }`
- Read by Dashboard and Launcher for activity feeds
- Every app must emit events for its significant actions

### IPC channel naming convention

```
[appname]:[action]:[subject]

Examples:
cyberlab:session:start
cyberlab:session:save
recondesk:target:add
recondesk:port:add
ghostvault:note:save
credvault:vault:unlock
credvault:credential:search
networkmap:graph:import
```

---

## 17. STATE MANAGEMENT STANDARDS

### Zustand store structure

Every app uses Zustand for UI state. Follow this pattern:

```typescript
// stores/useAppStore.ts
interface AppState {
  // Data
  items: Item[];
  activeItem: Item | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  activeView: 'list' | 'detail' | 'settings';
  
  // Ecosystem context (read from config)
  ecosystemContext: {
    activeLab: string | null;
    activeTarget: string | null;
    activeIP: string | null;
  };
  
  // Actions
  loadItems: () => Promise<void>;
  setActiveItem: (item: Item | null) => void;
  setActiveView: (view: AppState['activeView']) => void;
  updateEcosystemContext: (ctx: Partial<AppState['ecosystemContext']>) => void;
}
```

### Store rules

- One primary store per app
- Derived/slice stores for complex sub-domains (e.g., `useSessionStore`, `useTargetStore` within CyberLab)
- Never put Electron IPC calls directly in components — wrap in store actions
- Persist relevant state to `localStorage` or app config (active view, filter preferences, column widths)
- Clear sensitive state on app hide/lock (CredVault)

---

## 18. IPC STANDARDS

### Main process handlers

```typescript
// main/ipc/[domain].ts
ipcMain.handle('recondesk:target:add', async (event, target: Target) => {
  // validate
  // write to config
  // emit ecosystem event
  // return { success: true, target }
})
```

### Renderer usage

```typescript
// Always via a typed wrapper
const api = window.electron.ipcRenderer

// Invoke (request/response)
const result = await api.invoke('recondesk:target:add', targetData)

// Listen (fire and forget from main)
api.on('recondesk:config:updated', (data) => store.updateFromConfig(data))
```

### Preload bridge (contextBridge)

```typescript
// preload/index.ts
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, callback) => ipcRenderer.on(channel, (_, ...args) => callback(...args)),
    off: (channel, callback) => ipcRenderer.off(channel, callback)
  }
})
```

### Error handling

All IPC handlers must return structured responses:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string, code?: string }
```

---

## 19. EMPTY, LOADING & ERROR STATES

### Loading states

```
Skeleton screens: ONLY for initial app load or heavy data fetch (>500ms expected)
Spinner: for actions (button spinner inline, never full-screen spinner for <1s operations)
Progress bar: for multi-step operations (scraping, importing, exporting)
Streaming indicator: for AI generation (animated dots or streaming text)
```

### Empty states

Every empty state must have:
1. A relevant icon (large, `text-muted`)
2. A primary message ("No targets yet")
3. A secondary message explaining what this section is for
4. A primary action CTA button

```
         [Icon — 48px, text-muted]

         No targets yet

    Add your first target to start tracking
    reconnaissance data and attack surface.

         [+ Add Target]  ← primary CTA
```

### Error states

```
Inline error (form validation): red text below field, text-xs
Action error (IPC failure): toast notification, 4s duration, dismissible
Data error (load failure): inline error card with retry button
Critical error (config corrupt): full-screen error with recovery instructions
```

### Toast notifications

```
Position: bottom-right
Width: 320px
Duration: 4s (info/success), 6s (warning), manual dismiss (error)
Stack: up to 3 visible, oldest dismissed first
Variants: success (green), warning (amber), error (red), info (blue)
```

---

## 20. APP ACCENT COLORS (QUICK REFERENCE)

| App | Accent | Hex |
|---|---|---|
| Cybertools Launcher | Purple | `#b44fff` |
| CyberOS Dashboard | Blue | `#4a9eff` |
| CyberLab Companion | Purple | `#b44fff` |
| ReconDesk | Amber | `#d29922` |
| GhostVault | Soft Blue | `#7bb8ff` |
| VaultCore | Green | `#3fb950` |
| SignalBoard | Coral | `#ff6b6b` |
| CredVault | Soft Red | `#f78166` |
| PlaybookStudio | Blue | `#4a9eff` |
| ReportForge | Green | `#3fb950` |
| TerminalLink | Matrix Green | `#00ff41` |
| NetworkMap | Amber | `#d29922` |
| AgenticOS | Orange | `#ff9500` |

---

## 21. WINDOW STANDARDS

### Title bar

CyberOS apps use a **custom frameless title bar** (no native macOS chrome).

```
┌─────────────────────────────────────────────────────┐
│ ● ● ●  [App Icon 16px] App Name          [actions]  │
│ (traffic lights)                                    │
└─────────────────────────────────────────────────────┘
Height: 40px
Background: bg-base
Draggable: entire bar except buttons
Text: text-sm text-secondary, app name centered or left
```

### Window behavior

- Apps retain their last position and size (save to localStorage or electron-store)
- Launcher tray popup is NOT a standard window — it's a frameless popup anchored to the menu bar icon
- Dashboard is designed for second-monitor use — remember last-used display
- GhostVault capture window opens centered regardless of last position (capture should be fast)
- Modals always open centered within their parent window

---

## 22. ACCESSIBILITY

CyberOS is a single-operator tool for an expert user. Accessibility requirements are realistic:

- **Keyboard navigation** — all primary flows must be completable without a mouse
- **Focus indicators** — visible focus ring on all interactive elements (accent color ring, 2px offset)
- **Color + symbol** — never use color alone to communicate state; always pair with an icon or label
- **Text contrast** — all text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- **Reduced motion** — respect `prefers-reduced-motion` by disabling Framer Motion animations when set
- **Screen reader** — aria-labels on icon-only buttons, aria-live on dynamic content (feeds, timers)

---

## APPENDIX: TAILWIND CONFIG REFERENCE

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'bg-base':        '#0a0a0f',
        'bg-surface':     '#0f1117',
        'bg-elevated':    '#161b27',
        'bg-overlay':     '#1c2333',
        'bg-interactive': '#1e2a3a',
        'border-subtle':  '#1e2433',
        'border-default': '#2a3347',
        'border-strong':  '#3d4f6b',
        'text-primary':   '#e6edf3',
        'text-secondary': '#8b949e',
        'text-muted':     '#484f58',
        'success':        '#3fb950',
        'warning':        '#d29922',
        'danger':         '#f85149',
        'info':           '#58a6ff',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs':   ['11px', { lineHeight: '1.4' }],
        'sm':   ['13px', { lineHeight: '1.5' }],
        'base': ['14px', { lineHeight: '1.6' }],
        'md':   ['15px', { lineHeight: '1.5' }],
        'lg':   ['18px', { lineHeight: '1.4' }],
        'xl':   ['22px', { lineHeight: '1.3' }],
        '2xl':  ['28px', { lineHeight: '1.2' }],
        '3xl':  ['36px', { lineHeight: '1.1' }],
      }
    }
  }
}
```

---

---

## 23. VISUAL EFFECTS SYSTEM

CyberOS uses a **restrained glow system**. The goal is a professional security operations aesthetic — not a video game HUD. Effects should make data feel alive and purposeful, not decorative. Every glow must be tied to a real data state or element type.

### The rule: glow communicates, it does not decorate

- **Charts glow** because they represent live data
- **Active status dots glow** because they represent running processes
- **Accent borders glow** when they indicate the current active item
- **Random dividers, backgrounds, and text do NOT glow**

If a glow effect could be removed without losing any information, remove it.

---

### Card Surfaces (Glassmorphism — Subtle)

Cards use a very subtle semi-transparent frosted treatment, not flat solid fills. This creates the layered depth visible in the mockups.

```css
/* Standard card */
.card {
  background: rgba(22, 27, 39, 0.75);       /* bg-elevated at 75% opacity */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(42, 51, 71, 0.6);  /* border-default at 60% */
  border-radius: 8px;
}

/* Elevated card (modals, detail panels) */
.card-elevated {
  background: rgba(28, 35, 51, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(61, 79, 107, 0.4);
}

/* Active/highlighted card (selected item, active session) */
.card-active {
  background: rgba(22, 27, 39, 0.85);
  border: 1px solid rgba(var(--accent-rgb), 0.35);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.1),
              inset 0 1px 0 rgba(var(--accent-rgb), 0.05);
}
```

**Tailwind utility approach:**
```tsx
// Standard card
<div className="bg-bg-elevated/75 backdrop-blur-sm border border-border-default/60 rounded-lg" />

// Active card (e.g. selected target, running session)
<div className="bg-bg-elevated/85 border border-accent/35 shadow-[0_0_0_1px_rgba(var(--accent),0.1)]" />
```

---

### Accent Glow (Active States Only)

Used on: active nav items, running session indicators, selected cards, progress bars at 100%.

```css
/* Accent glow — used sparingly on active elements */
.glow-accent {
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.25),
              0 0 24px rgba(var(--accent-rgb), 0.08);
}

/* Subtle accent border glow (nav active state, selected item) */
.glow-border-accent {
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.2);
}
```

**When to use:**
- Active sidebar nav item: `shadow-[0_0_8px_rgba(var(--accent),0.2)]`
- Running session timer card: `shadow-[0_0_16px_rgba(var(--accent),0.15)]`
- Active playbook run card: accent glow border
- **NOT on:** every card, hover states, table rows, text

---

### Data Visualization Glow (Charts Only)

The most visible glow effect in the mockups. Chart lines, area fills, and SVG elements get a subtle drop-shadow glow using their app accent color. This makes live data feel alive.

```css
/* Chart line glow — apply as SVG filter or CSS filter on path/polyline */
.chart-line-glow {
  filter: drop-shadow(0 0 4px rgba(var(--accent-rgb), 0.6))
          drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.25));
}

/* Area chart fill — gradient from accent to transparent */
.chart-area-fill {
  fill: url(#areaGradient);
  /* SVG linearGradient: accent at 30% opacity top → 0% opacity bottom */
}

/* Donut/ring charts */
.chart-ring-glow {
  filter: drop-shadow(0 0 6px rgba(var(--accent-rgb), 0.5));
}
```

**In React (recharts or D3):**
```tsx
// Recharts line with glow
<Line
  stroke="#4a9eff"
  strokeWidth={2}
  dot={false}
  style={{ filter: 'drop-shadow(0 0 4px rgba(74, 158, 255, 0.6))' }}
/>

// SVG area gradient definition
<defs>
  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#4a9eff" stopOpacity={0.3} />
    <stop offset="100%" stopColor="#4a9eff" stopOpacity={0} />
  </linearGradient>
</defs>
```

**Chart glow intensity by app accent:**

Each app uses its own accent color for chart glow. The RGB values for `drop-shadow`:
```
Dashboard blue:    74, 158, 255
ReconDesk amber:   210, 153, 34
SignalBoard coral: 255, 107, 107
VaultCore green:   63, 185, 80
CredVault red:     247, 129, 102
TerminalLink:      0, 255, 65
NetworkMap amber:  210, 153, 34
CyberLab purple:   180, 79, 255
```

---

### Status Dot Glow (Active Processes)

Pulsing status dots get a glow to visually reinforce that something is live.

```css
/* Active/running status dot */
.status-dot-active {
  background: var(--success);
  box-shadow: 0 0 0 0 rgba(63, 185, 80, 0.4);
  animation: statusPulse 2s ease-out infinite;
}

@keyframes statusPulse {
  0%   { box-shadow: 0 0 0 0 rgba(63, 185, 80, 0.4); }
  70%  { box-shadow: 0 0 0 6px rgba(63, 185, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(63, 185, 80, 0); }
}

/* Danger/alert dot */
.status-dot-danger {
  background: var(--danger);
  box-shadow: 0 0 0 0 rgba(248, 81, 73, 0.4);
  animation: statusPulseDanger 2s ease-out infinite;
}
```

**Apply to:** session active indicator, app running dot in Launcher, live feed indicator in SignalBoard, VPN connected dot.

**Do NOT apply to:** static status dots, inactive states, table status badges.

---

### Background Dot Grid (Optional Hero Panels)

The mockups show a subtle dot-grid pattern on some hero backgrounds (Dashboard, NetworkMap canvas). Use sparingly — only on large empty hero areas, not on cards.

```css
.dot-grid-bg {
  background-image: radial-gradient(
    circle,
    rgba(42, 51, 71, 0.6) 1px,
    transparent 1px
  );
  background-size: 24px 24px;
}
```

Use on: NetworkMap SVG canvas background, CyberOS Dashboard hero area, CredVault lock screen background.

---

### Metric Number Glow (Large KPI Values)

Large display numbers (streak count, flag count, total credentials) get a very subtle text glow to make them feel like instrument readouts.

```css
.metric-glow {
  text-shadow: 0 0 20px rgba(var(--accent-rgb), 0.4),
               0 0 40px rgba(var(--accent-rgb), 0.1);
  color: var(--text-primary);
}
```

Apply only to: the largest metric number on a card (e.g. the streak count "4", the timer "01:23:47", the flag count "38"). Not to labels, not to secondary numbers.

---

### Scrollbar Styling

CyberOS apps should have styled scrollbars that match the dark aesthetic.

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(42, 51, 71, 0.8);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(61, 79, 107, 0.9);
}
```

---

### Window Background

The outermost app background is not pure black. Use a very subtle dark gradient that creates depth without being visible at first glance:

```css
.app-background {
  background: radial-gradient(
    ellipse at 20% 0%,
    rgba(var(--accent-rgb), 0.04) 0%,
    #0a0a0f 50%
  );
  min-height: 100vh;
}
```

This means each app has a barely-perceptible tint of its own accent color in the top-left corner of the window background. It's the kind of thing you notice when comparing apps side by side, not when looking at one app in isolation.

---

### What NOT to Do

These effects appear in cheap "dark mode" templates and must be avoided:

- **No rainbow gradients** on any UI element
- **No glowing text** on body copy, labels, or navigation items (only large KPI numbers)
- **No bright accent fills** on card backgrounds (accent is for borders and indicators, not fills)
- **No animated background particles** or floating orbs
- **No neon borders** on every card — border glow is only for the actively selected/focused card
- **No glassmorphism on small components** — don't blur badges, table rows, or input fields
- **No glow on chart axes, grid lines, or tick labels** — only on the data line/area itself
- **No multiple overlapping glows** on the same element — pick one and keep it subtle

---

### Tailwind Config Additions for Visual Effects

```javascript
// tailwind.config.js additions
module.exports = {
  theme: {
    extend: {
      // ... existing config ...
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        md: '12px',
      },
      boxShadow: {
        'glow-accent':  '0 0 12px rgba(var(--tw-shadow-color), 0.25), 0 0 24px rgba(var(--tw-shadow-color), 0.08)',
        'glow-sm':      '0 0 8px rgba(var(--tw-shadow-color), 0.2)',
        'glow-status':  '0 0 6px rgba(var(--tw-shadow-color), 0.5)',
        'card-active':  '0 0 0 1px rgba(var(--tw-shadow-color), 0.1)',
      },
      animation: {
        'status-pulse': 'statusPulse 2s ease-out infinite',
        'count-up':     'countUp 0.6s ease-out forwards',
      },
    }
  }
}
```

---

### Summary: When to use each effect

| Effect | Use on | Intensity |
|---|---|---|
| Glassmorphism (blur + semi-transparent) | All cards and panels | Subtle — blur 8px, opacity 75% |
| Accent glow (box-shadow) | Active nav item, selected card, running session | Subtle — spread 12px, opacity 25% |
| Chart line glow (drop-shadow filter) | All chart lines, rings, radar strokes | Moderate — 4–6px blur |
| Status dot pulse + glow | Live/running indicators only | Moderate — 6px spread |
| Metric number glow (text-shadow) | Largest KPI number per card only | Subtle — 20px spread, opacity 40% |
| Dot grid background | Hero areas, empty canvas | Very subtle — 1px dots, low opacity |
| Window bg tint | App window root background | Barely visible — opacity 4% |

---

*ItsEliias // CyberOS Design Bible v1.1*
*This document governs all UI/UX decisions across the CyberOS ecosystem.*
*Every Manus prompt must read this document before producing any design or code.*
