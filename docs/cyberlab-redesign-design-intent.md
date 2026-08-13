# CyberLab Companion — Redesign Design Intent

**frontend-design skill four-question framework answers**

---

## Purpose

CTF and HTB practitioners running active offensive security lab sessions with AI-guided assistance. The primary workflow is: start a lab session (named target, platform, difficulty), interrogate Claude about methodology/exploits/pivoting, track flags and findings in real time, and produce a writeup. The UI exists during active work — it is not a dashboard or analytics view. The operator is focused, technical, often under self-imposed time pressure. They will have 1–3 sessions open simultaneously across platforms (HTB, THM, CTF events). Secondary surfaces (cheatsheets, snippets, command builder) are reference lookups invoked mid-task.

The central insight: **the lab session IS the product**. Every element that doesn't serve the active session is secondary. The timer, target IP, difficulty, and flag count are the primary data hierarchy — not navigation labels or settings.

---

## Tone

**Proton + Obsidian + Arc, adapted for security tooling.**

Not: cyberpunk neon-on-black, gamer green glow, hacker ASCII art.
Not: generic SaaS purple-gradient "AI product."
Not: VS Code clone with colored tabs.

Yes: confident product chrome with invisible structural steel. The interface recedes so the work comes forward. Generous breathing room in the session panel. Dense but readable findings list. Typography that signals "instrument" not "app." Motion that rewards attention without demanding it.

Reference points:
- Proton Mail: the chrome knows its place; the content is the hierarchy
- Obsidian: dense linked knowledge, calm dark surfaces, deliberate accent use
- Arc Browser: sidebar that collapses to iconography, tabs that feel like owned context
- Linear: type hierarchy so clean the app feels self-documenting

---

## Constraints

- Token system: `design-system/tokens.css` is the source of truth — `--surface-0/1/2/3`, `--text-primary/secondary/muted`, `--border-default/subtle`, `--accent` (CyberLab: `#b44fff`)
- shadcn primitives available in `src/renderer/components/ui/`
- Electron renderer — no browser chrome, owns the full window including titlebar area
- Functional parity: all panels (chat, session, sidebar nav, findings, settings, tab bar) must work identically
- Legacy variable aliases preserved: `--bg`, `--bg2`, `--bg3`, `--bg4`, `--panel`, `--border` etc. still resolve
- `prefers-reduced-motion` already wired — respect it
- Font packages installed: `@fontsource/geist-sans`, `@fontsource/jetbrains-mono`

---

## Differentiation

What makes CyberLab Companion legible as a purpose-built security tool:

1. **Session state as first-class chrome.** The timer arc, target IP, difficulty badge, and flag count are structural elements of the layout — not tucked into a panel. When a session is active, the app visually reorganizes around it.

2. **Terminal/instrument typography.** JetBrains Mono for all data values (IP addresses, flag counts, timer displays, findings). Geist Sans for prose and labels. The distinction is semantic: mono = machine data, sans = human label. Size ratios follow a major-third scale.

3. **Finding taxonomy as color system.** Ports (blue), flags (green), credentials (red), users (purple), CVEs (amber) — these semantic colors recur across the findings panel, chat message chips, and status bar. Consistent enough to read at a glance.

4. **Sidebar that earns its width.** The current sidebar uses 168px for emoji + label. The redesign keeps labels visible but reduces emoji dominance — replacing them with consistent SVG icons that read at 14px. The active state uses a left-bar indicator (existing, kept) plus a flush background that bleeds to the sidebar edge.

---

## Design Decisions Made

### Typography stack (T2 — executed)
- Base: 13px / 1.6 body (Geist Sans)
- H1: `--text-xl` (22px), `font-weight: 700`, `letter-spacing: -0.02em`
- H2: `--text-lg` (18px), `font-weight: 600`
- H3: `--text-md` (15px), `font-weight: 600`
- Labels/caps: 10–11px, `letter-spacing: 0.08em`, uppercase
- Timer display: `--text-3xl` (36px), JetBrains Mono, tabular-nums
- Data values (IPs, counts): JetBrains Mono, 11–12px

### Information density (T2 — executed)
- **Session panel (320px)**: spacious — 16px padding sections, generous vertical gap. This is the "instrument panel." No visual noise.
- **Chat messages**: medium density. 12px padding, max-width 82%. Code blocks get full-width treatment with language label.
- **Sidebar nav**: compressed but comfortable. 36px touch targets, 12px gap between icon/label.
- **Tab bar**: thinner at 32px (was 36px). Matches Arc-like economy.

### Layout moves (T2 — executed)
- No active session: the SessionPanel shows an "empty" state with a centered start-session invitation (not the buried "Start a lab" that currently lives only in ChatPanel's `isSetup` branch).
- Header wordmark: larger, more confident. "CyberLab" as the product name, "Companion" as a subdued subtitle not a badge.
- Footer: kept minimal — status strip only. VPN, target IP, flag count, UTC clock.

### Motion (T2 — executed)
Three deliberate animations, each earning their place:
1. **Focus-ring glow fade**: inputs/buttons get a `box-shadow` transition on `:focus-visible` that goes `0 → 0 0 0 3px accent-tint` over 120ms. Already partially there; made consistent.
2. **Chat message stream-in**: new messages enter with `translateY(6px) → 0, opacity 0 → 1` over 180ms. Existing framer-motion already does this; parameter tightened.
3. **Sidebar nav hover lift**: `.nav-item:hover` gets `translateX(2px)` over 150ms — a nudge that signals responsiveness without being busy.

### Identity treatment (T2 — executed)
The lockup: a hexagonal outline SVG (existing) + "CyberLab" in `--text-primary` at 14px `font-weight: 600` + `letter-spacing: 0.01em` + "Companion" in `--text-muted` at 11px. The current implementation buries "Companion" in an accent-colored badge — that reads as a product differentiator label (like "Pro" or "Beta"), not as the product name. Fixed.

Empty-state chat: replaced generic chat-bubble icon with a CTF-flag SVG glyph (simple chevron/flag outline), a tighter heading, and a contextual hint about hint-level.

### Settings panel (T2 — executed)
- Replaced hardcoded hex colors with `var(--surface-*)` and `var(--text-*)` throughout
- Section headers use consistent `section-header` class
- Input groups use consistent `input-group` structure

---

## What stays functionally identical

- All 14 panel navigation items
- Tab bar (multi-session management)
- VPN polling and status
- Claude / Ollama model selection
- Session lifecycle (start / end / history)
- Findings auto-detection and ReconDesk push
- Screenshot capture and vault save
- Autosave tick
- GhostVault integration
- Command palette (CmdK)
- Theme picker (bg + accent)
- All modal flows (LabClose, SessionComplete, FlagLogger, FlagTracker, DifficultyRating)
- Settings (API key, Obsidian vault, output dir, operator name, sound)
- HTB / THM stats / Progress panel
- Writeup editor with GhostVault export
