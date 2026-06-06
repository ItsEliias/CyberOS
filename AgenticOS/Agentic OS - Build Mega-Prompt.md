# Agentic OS — Build Mega-Prompt (Claude Code)

> **Goal:** build a standalone, local **"Agentic OS"** — a single web dashboard (Mission Control) that shows and operates all my AI agents in one place, with memory, goals, journal, a media studio, SEO, a notebook, and a live activity stream. Dark, premium, Figma/Linear-grade. Inspired by Julian Goldie's "Agentic OS / Hermes Agent OS."
>
> It runs locally in the browser at `http://127.0.0.1:3737`. New project. I can lift React components and design tokens from my existing **CyberOS Dashboard** repo where useful, but the backend is new.

---

# PART 1 — ARCHITECTURE & SETUP

## 1.1 Why a local web app (not Electron)
It runs in the browser at localhost — cleaner than Electron, no preload/sandbox issues. But it needs a **local backend** because the browser alone can't read `~/cybertools-config.json`, the Obsidian vault, local output folders, or talk to agent CLIs.

**Stack:**
- **Frontend:** Vite + React 18 + TypeScript + Tailwind 3 + **Tremor** (`@tremor/react`) for dashboard charts + **Framer Motion** for motion + Zustand for state. (Match my CyberOS design system — reuse tokens/components.)
- **Backend:** **Node + Fastify (or Express)** in TypeScript. Serves the API + a **WebSocket** for live updates, reads local files, runs agent adapters. Binds to `127.0.0.1:3737` only.
- One repo, two packages (`/web` frontend, `/server` backend), or a single Vite app with the server in `/server`. Keep it simple.

## 1.2 Tooling to enable in Claude Code first
- **Frontend Design** (official Anthropic skill) — for the aesthetic, required.
- **Browser tool** (Chrome DevTools MCP or Playwright) — render → screenshot → iterate. Required for UI quality.
- **Context7** — current docs for Fastify/Tremor/etc.

## 1.3 Run target
`npm run dev` starts backend (127.0.0.1:3737) + frontend (proxied), opens in browser. Mirror the reference: localhost:3737.

---

# PART 2 — SECURITY RULES (non-negotiable — this app holds keys, reads my vault, can run agents)

- **Bind to `127.0.0.1` only.** Never `0.0.0.0`. Never expose to the network or internet.
- **Password / token gate** on the whole app (single password, set in `.env`). No unauthenticated access.
- **Secrets in `.env` only**, never committed, never hard-coded, never sent to the frontend. Provider API keys (Studio/SEO/models) live server-side; the browser never sees them. Add `.env` to `.gitignore`.
- **No autonomous action on external systems** without an explicit, per-action confirm in the UI. Agents may be *monitored* freely, but *running* an agent task that touches anything outside this machine requires a click.
- **Read-only by default** for vault/config; writes (goals, journal) go only to clearly-scoped vault paths.
- If a feature needs a capability that isn't safe to expose, surface it to me rather than building it silently.

---

# PART 3 — THE AESTHETIC (commit; match the reference)

Premium dark "ops console." From the reference:
- **Roman-numeral section markers** (`I.`, `II.`, `IV.`, `XII.`) before section titles.
- **Large display headings** ("Mission Control", "Notebook", "Hermes") in a distinctive grotesque/serif-display — **NOT Inter/Roboto/system**. Pair with a **mono** for data/metrics/log lines.
- **Gold/amber accent** on a near-black layered background; subtle gradients; glass panels with soft elevation.
- A `LOCAL · BANGKOK` style **location + live clock** under each heading (make location configurable).
- **Command palette (⌘K)** and an **"ALL SYSTEMS"** quick toggle, top-right.
- **Agent cards**: gradient tint per agent, status pill — `● ONLINE` (green) / `● DEGRADED` (amber) / `● OFFLINE` (red), with model/provider/latency/sessions metrics.
- **Bento layouts**, not uniform grids. Live elements animate (count-ups, log lines sliding in, pulsing status dots).
- Reuse my CyberOS design tokens (CSS variables: surfaces, accent ramp, severity colours, elevation, motion) and extend them. Respect `prefers-reduced-motion`.

Build a shared design-system + Tremor chart theme FIRST (Phase 0), with a style-reference page, and **stop for my approval** before building modules.

---

# PART 4 — AGENT REGISTRY & ADAPTERS (the core idea)

Agents are first-class. A registry (`/server/agents/registry.ts`) lists each agent with: `id, name, icon, accent, provider, model, adapter`. Each adapter implements a common interface and **fails soft** (returns `unknown/offline`, never crashes) when an agent isn't installed or reachable:

```ts
interface AgentAdapter {
  status(): Promise<{ state: 'online'|'degraded'|'offline'|'unknown';
                      model?: string; provider?: string; latencyMs?: number;
                      version?: string; sessions?: number }>
  sessions?(): Promise<Session[]>
  skills?(): Promise<Skill[]>
  plugins?(): Promise<Plugin[]>
  kanban?(): Promise<KanbanBoard>
  chat?(msg: string): Promise<string>   // gated, optional
}
```

Ship adapters for the agents I use, each best-effort:
- **Claude Code** — detect install/version; status; (chat/run gated).
- **Ruflo (claude-flow)** — read swarm/agent status via its CLI/MCP if present.
- **Hermes** — read `~/.hermes` config + status if installed.
- **Gemini / Codex / generic** — manual registration via config; status = configured/unknown.
- **CyberOS apps** (optional bonus) — read my existing `<app>_status` blocks from `~/cybertools-config.json` and `ecosystem-events.json` so my own apps appear alongside the AI agents.

Be honest in code comments where an agent has no real status API — mark it `unknown` rather than faking "online."

---

# PART 5 — BACKEND API (Fastify, 127.0.0.1:3737)

```
GET  /api/agents                 → registry + live status (each adapter)
GET  /api/agents/:id             → detail: status, sessions, skills, plugins, kanban
POST /api/agents/:id/chat        → gated chat/run (confirm required)
GET  /api/health                 → heartbeat + combined p50 latency
WS   /ws/activity                → live combined log stream (tails event sources)
GET  /api/goals  · POST /api/goals      → goals (persist to vault /AgenticOS/Goals/)
GET  /api/journal · POST /api/journal   → daily entries (one file/day in vault)
GET  /api/memory/search?q=        → full-text search across the Obsidian vault
GET  /api/buckets                 → typed output folders (counts)
GET  /api/buckets/:type           → files in a bucket (Apps/Videos/Images/Audio/Workspace/Sandboxes/Pastes)
GET  /api/notebook                → notebook library + saved assets (from vault)
POST /api/studio/image|video|tts  → media gen via provider (gated, keyed, optional)
POST /api/seo/*                   → SEO tools (gated, keyed, optional)
GET  /api/config                  → safe, non-secret config (location, registered agents)
```
WebSocket pushes new activity events and status changes so the UI is live (no polling where avoidable).

---

# PART 6 — MODULES (build order = phases; one at a time, approve between)

### Phase 0 — Design system + shell
Tokens, Tremor chart theme, core primitives (Panel/glass, MetricCard with count-up, StatChip, SectionHeader with roman numeral, Badge/StatusPill, LiveDot, ChartFrame, CommandPalette). App shell: left sidebar (Workspace / Agents / Self groups, like the reference), top bar (clock, ⌘K, ALL SYSTEMS), routing. **Style-reference page → stop for approval.**

### Phase 1 — Mission Control (the hero)
`I. — MISSION CONTROL` "Status of every agent, every memory, every signal."
- Top row: compact status cards — one per agent + **HEARTBEAT** (poll ticks) + **LATENCY** (combined p50). Live, animated.
- `II. — AGENTS · CLICK TO OPEN CONTROL ROOM`: bento grid of agent cards (gradient, status pill, model/provider/latency/sessions, "Open Control Room →").
- `IV. — LIVE ACTIVITY · COMBINED LOG STREAM`: scrolling, timestamped, colour-coded combined event log over WebSocket, with an event count badge.

### Phase 2 — Agent Control Room (per agent)
Route `/agents/:id`. Tabs **Chat · Workspace · Control Room**. Control Room shows STATE (online), MODEL, PROVIDER, and an `Actions` rail: Status (env), Sessions (history), Skills (installed), Plugins (marketplace), Kanban (tasks), Analytics. Status panel renders a terminal-style readout (env, API-key presence as ✓/✗ — never the keys themselves). Match the Hermes screen in the reference.

### Phase 3 — Self: Goals · Journal · Memory
- **Goals** — set targets, tick them off, animated % bar; saved to vault.
- **Journal** — daily entries (text now; voice/transcription later), one file per day, flip between entries.
- **Memory** — every chat auto-logged; full vault search (use `/api/memory/search`); show note/word counts.

### Phase 4 — Buckets / Workspace
Typed output folders (Apps / Videos / Images / Audio / Workspace / Sandboxes / Pastes) with counts and a file viewer. **Apps** render built HTML in a sandboxed iframe; **Videos/Audio** get inline players; **Images** a gallery. (Like the Hermes "buckets" screen.)

### Phase 5 — Notebook
A NotebookLM-style library synced to the Obsidian vault — Library / Chat / Studio / Assets tabs, with saved audio overviews, videos, and infographics as playable/viewable cards.
> **Honest note:** NotebookLM has no clean public API. Build this as a *vault-backed* notebook + asset library (import/sync files into `/AgenticOS/Notebooks/`), NOT a live NotebookLM integration, unless I provide a working API. Don't fake an integration.

### Phase 6 — Studio (media gen) — optional, keyed
Generate images / video / TTS by describing what I want. Each provider is pluggable and **off unless its key is set in `.env`**. Suggested/pluggable: image + video (e.g. an xAI/Grok or FAL-style key), TTS (e.g. OpenAI/ElevenLabs). Show clear "provider not configured" states. **Never hard-code keys.** Flag generation cost in the UI.

### Phase 7 — SEO — optional, keyed
Keyword research / content drafting / multi-site publishing as a tool module, provider-pluggable and gated like Studio. Build the UI + a clean adapter seam; wire a real provider only if I supply a key. Keep it clearly optional.

---

# PART 7 — EXECUTION RULES
- New repo, branch per phase, **one commit per phase**, build + run + screenshot before moving on.
- After each phase: STOP, show screenshots, wait for my approval.
- Everything fails soft — a missing agent/key/file shows a graceful state, never a crash.
- No secrets in the repo; `.env.example` documents what keys enable what.
- Reuse CyberOS Dashboard components/tokens where it saves time; don't import its Electron/IPC code (this is a web app).
- If a module needs something risky or unavailable (live NotebookLM, autonomous agent runs, network exposure), STOP and ask.

# PART 8 — DEFINITION OF DONE
- [ ] Runs at `http://127.0.0.1:3737`, behind a password gate, bound to localhost only
- [ ] Mission Control live: agent status, heartbeat, latency, combined activity stream
- [ ] Per-agent Control Rooms with real (or honestly "unknown") status
- [ ] Goals / Journal / Memory working against the vault
- [ ] Buckets + Notebook reading real local files
- [ ] Studio + SEO present, gated, optional, no keys in code
- [ ] Matches the aesthetic: roman numerals, display type, gold accent, glass cards, status pills, motion
- [ ] No secrets committed; `.env.example` provided
- [ ] Per-phase commits + a final summary of what's wired vs stubbed

> **Reality check for the agent:** this is a large multi-module app. Get **Mission Control (Phases 0–2)** solid and beautiful first — that alone is the thing I want most. Studio/SEO/Notebook can be stubbed UIs until I wire providers. Don't fake live data or integrations; an honest "unknown/not configured" state beats a fake "online."
