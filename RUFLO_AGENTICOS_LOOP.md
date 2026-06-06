# AgenticOS — RuFlo Autonomous Research → Build → Commit Loop

Paste everything between ---BEGIN--- and ---END--- into Claude Code after the fix swarm finishes.
This runs indefinitely — researching, implementing, committing, and looping back.
Stop it manually when you're happy with the state of AgenticOS.

---BEGIN---

Use `ruflo-autopilot` to run an autonomous improvement loop on the AgenticOS project located at `./AgenticOS/`. The loop runs continuously: research → implement → commit → research → implement → commit. Do not stop unless you hit a hard error that cannot be resolved.

Working directory: `./AgenticOS/`
Git branch: use whatever branch is currently checked out — do not switch branches.

---

## ITERATION ZERO — RUN THIS FIRST, BEFORE THE LOOP STARTS

**The current AgenticOS is running with entirely fake/placeholder data. Nothing is actually connected. All agent statuses, tasks, projects, and metrics are hardcoded. Fix this completely before starting the research loop.**

### ZERO.1 — Audit all fake data

Read every file in `./AgenticOS/` — server, frontend, config. Find and list every instance of:
- Hardcoded agent status (`"online"`, `"connected"`, fake latency numbers)
- Hardcoded task/project arrays (placeholder tasks, fake project names)
- Mock data functions (`getMockAgents()`, `fakeTasks`, `demoProjects`, any array of fake objects)
- `setTimeout` or `setInterval` that generates fake activity/events
- Any `Math.random()` used to fake uptime or latency
- Hardcoded counts for sessions, tokens, memory vectors, vault notes

Document every file and line number. Then delete or replace every single one.

### ZERO.2 — Wire real Claude Code connection

Run `claude --version` to confirm Claude Code is installed and get the version.

Read `~/.claude/projects/` — this directory contains real project data. Parse it:
- Count actual projects
- Read recent session files for last active timestamps
- Extract real conversation counts where available

Read `~/.claude/settings.json` for configuration.

Build a real `/api/agents/claude-code` endpoint that returns this live data. The status field must be `"online"` only if `claude --version` actually succeeds — not hardcoded.

### ZERO.3 — Wire real RuFlo connection

Run `npx ruflo@latest status` (or check `npx ruflo mcp status`) to get real swarm state.

Read `.claude-flow/` in the CyberOS project directory:
- `config.yaml` for swarm config
- Any state files for agent counts, memory stats

Read `./AgenticOS/RESEARCH_LOG.md` if it exists — this is real loop history.

Build a real `/api/agents/ruflo` endpoint. Status = `"online"` only if the CLI responds.

### ZERO.4 — Wire real Ollama connection

Fetch `http://localhost:11434/api/tags` with a 2-second timeout.
- If it responds: status `"online"`, list real models returned
- If timeout/error: status `"offline"` — do not fake it

Build real `/api/agents/ollama` endpoint and a real `/api/agents/ollama/chat` endpoint that proxies to `http://localhost:11434/api/chat` with streaming.

### ZERO.5 — Wire real CyberOS ecosystem data

Read `~/cybertools-config.json` (the user's actual ecosystem config file). This file exists and has real data from running CyberOS apps. Parse:
- `shared_context` block — real active lab, target, IP
- All `*_status` blocks — real status for each of the 12 CyberOS apps
- `ecosystem-events.json` if it exists — real event history

Build a real `/api/cyberOS` endpoint that returns this parsed data live on every request.

### ZERO.6 — Wire real vault/memory data

The user has an Obsidian vault. Its path is in `~/cybertools-config.json` under `ghostvault_status.vaultPath` or similar. If not there, check `~/.config/` or common paths like `~/Documents/ObsidianVault/`.

Once found:
- Count real `.md` files recursively
- Count real word count across all notes
- List the 5 most recently modified notes

Build real `/api/memory` endpoint returning these live counts. No hardcoded numbers.

### ZERO.7 — Replace WebSocket fake event stream with real events

The current WebSocket likely generates fake activity events. Replace it entirely:

Real event sources to tail:
- `~/cybertools-config.json` — watch for file changes (use `fs.watch`), emit events when it updates
- `ecosystem-events.json` — tail this file for new lines, emit each new event to the WebSocket
- Claude Code session activity — watch `~/.claude/projects/` for new files/modifications
- Ollama activity — poll `http://localhost:11434/api/ps` every 5 seconds for running models

Every WebSocket event must have: `{ timestamp, source, type, message }` with real values. No `Math.random()`. No fake agent names generating fake messages.

### ZERO.8 — Fix all UI that displays fake data

After the backend is real, fix every frontend component that renders placeholder values:
- Any hardcoded `"Claude Code · 47 tasks"` type strings → fetch from real API
- Any fake percentage bars → wire to real data or hide until data exists
- Any fake task lists → replace with real data from Claude Code projects or hide with empty state
- Any `"Connected"` status badges that don't reflect actual connectivity → wire to real API response
- Empty states are fine and honest — fake data is not acceptable

Show loading spinners while data is fetching. Show clear "not connected" or "not configured" states when services aren't available. Never show fake numbers.

### ZERO.9 — Commit the real connections

```bash
cd ./AgenticOS
git add -A
git commit -m "AgenticOS: replace all placeholder/mock data with real connections — Claude Code, RuFlo, Ollama, CyberOS ecosystem, vault, real WebSocket event stream"
```

Only after this commit is done, begin the research loop below.

---

## LOOP STRUCTURE

Each iteration of the loop follows this exact sequence:

### STEP 1 — RESEARCH

Search the following sources for UI patterns, features, graphs, integrations, and design ideas from similar projects. Collect findings into a temporary research note at `./AgenticOS/RESEARCH_LOG.md` (append each iteration, do not overwrite):

**Search queries to run across Google, GitHub, Reddit, YouTube:**
- `"AgentOS" dashboard UI 2024 2025`
- `"Agentic OS" Julian Goldie Hermes agent dashboard`
- `"HermesOS" agent operating system dashboard`
- `"ClaudeOS" Claude agent dashboard UI`
- `"AIoS" AI operating system dashboard local`
- `AgenticOS dashboard graphs uptime latency metrics`
- `"Hermes agent" local AI dashboard features`
- `Claude Code dashboard web UI localhost`
- `AI agent control panel dashboard design 2025`
- `multi-agent dashboard real-time graphs React`

**What to extract from search results:**
- Graph and chart types used (uptime graphs, latency charts, usage sparklines, activity heatmaps, token consumption, cost tracking)
- UI layout patterns (bento grids, sidebars, agent cards, status pills, command palettes)
- Features present in other implementations (memory graphs, goal tracking, journal, kanban, agent control rooms, skill maps)
- Agent integrations (Hermes, Ollama, OpenAI, Gemini, Claude, RuFlo/claude-flow)
- Colour schemes, typography choices, animation patterns
- Anything that looks significantly better than the current AgenticOS implementation

After research, pick the **top 5 highest-impact improvements** to implement in this iteration. Prioritise:
1. Things that are missing entirely (graphs where there are none, empty screens)
2. Things that are clearly better in other implementations
3. Integrations that add real functionality (Hermes, Ollama, ChatGPT, Gemini)
4. UI density and readability improvements
5. Live/real-time data that currently shows static or placeholder values

---

### STEP 2 — IMPLEMENT

Read the existing source files in `./AgenticOS/` before making any changes. Understand what currently exists. Then implement the chosen improvements.

**Standing requirements — apply to every iteration, every screen:**

#### Design system (match CyberOS Dashboard)
- Read `../CyberOS Dashboard/tailwind.config.js` and `../CyberOS Dashboard/src/renderer/globals.css` — use the same color tokens, glass card style, and animations
- Background: `radial-gradient(ellipse at 20% 0%, rgba(74,158,255,0.04) 0%, #0a0a0f 50%)`
- All cards: `background: rgba(22,27,39,0.75); backdrop-filter: blur(8px); border: 1px solid rgba(42,51,71,0.6); border-radius: 8px;`
- Primary text: `#e2e8f0` — never invisible, never low-contrast
- Secondary text: `#8b949e`
- Muted text: `#4a5568`
- Font UI: Inter. Font mono/data: JetBrains Mono
- Accent: gold/amber `#d29922` (the AgenticOS accent per the mega-prompt)
- Roman numeral section headers: `I.` `II.` `III.` etc. in the display font, gold accent

#### Graphs and charts — mandatory, add if missing
Use **Tremor** (`@tremor/react`) for all charts. If Tremor is not installed, install it. Charts that must exist:

- **Agent uptime graph** — line chart, last 24h, one line per agent, shown on Mission Control. Y-axis: 0–100% uptime. Updates via WebSocket.
- **Latency sparklines** — small inline spark per agent card showing last 60 response times in ms.
- **Activity heatmap** — GitHub-style contribution calendar showing agent activity by day, last 90 days. On Mission Control.
- **Token/cost tracker** — bar chart showing token consumption per agent per day (last 7 days). If no real data yet, wire it to update when agents respond.
- **Memory usage gauge** — donut/radial chart showing vault note count, memory vector count, total size. On the Memory screen.
- **Goals progress bars** — animated horizontal bars per goal showing % complete.

All charts must:
- Use the gold/amber accent for primary series: `#d29922`
- Have dark backgrounds matching the card style: `rgba(22,27,39,0.75)`
- Have axis labels in `#4a5568`, value labels in `#8b949e`
- Animate on mount (Framer Motion or Tremor built-in)
- Show a graceful empty state when no data is available yet

#### Agent integrations — wire these up, all fail-soft

**Hermes Agent:**
- Detect if Hermes is installed: check `~/.hermes/config.json` or `~/.hermes/status.json` or run `hermes --version`
- If installed: read status, current model, active sessions, last activity
- If not installed: show "Not installed" with a link to `https://github.com/julianGoldie/hermes` (or wherever the real repo is — research this)
- Agent card: gradient purple, status pill, "Install Hermes" button if not present

**Ollama (local AI):**
- Poll `http://localhost:11434/api/tags` every 30 seconds
- If reachable: list all installed models, show total size, show which model is currently loaded
- Agent card shows: OLLAMA · LOCAL, green status if reachable, model list as chips, "Chat" button that opens a chat pane
- Chat pane: send messages to `http://localhost:11434/api/chat`, stream the response, display with typing animation

**ChatGPT (OpenAI):**
- API key read from `.env` as `OPENAI_API_KEY` — never exposed to frontend
- If key present: fetch available models, show usage stats from `/v1/usage` if accessible
- Agent card: green status, GPT-4o/GPT-4-turbo model chips, latency from last ping
- If key missing: card shows "API key not configured" with instruction to add to `.env`

**Gemini (Google):**
- API key from `.env` as `GEMINI_API_KEY`
- If key present: ping `https://generativelanguage.googleapis.com/v1/models` to verify
- Agent card: blue status, model list, latency
- If key missing: "API key not configured" state

**Claude Code:**
- Run `claude --version` to detect install
- Read `~/.claude/` for project count, session history, recent activity
- Show version, number of projects, last active timestamp

**RuFlo:**
- Run `npx ruflo@latest status` or read `.claude-flow/` config
- Show swarm status, agent count, memory vector count, last task

**CyberOS Apps:**
- Read `~/cybertools-config.json` — extract all `*_status` blocks
- Show each CyberOS app as a mini-card on Mission Control with its status, last active, key metric
- Link to open the app (if it has an exec path in the config)

#### Mission Control screen — flesh it out completely

The hero screen must have ALL of these sections, clearly separated by roman numeral headers:

```
I.  MISSION CONTROL
    "Status of every agent, every memory, every signal."
    [location] · [live UTC clock]

    Top row: HEARTBEAT · LATENCY (p50) · AGENTS ONLINE · MEMORY VECTORS · VAULT NOTES
    (5 metric cards with count-up animation and sparklines)

II. AGENTS — CLICK TO OPEN CONTROL ROOM
    Bento grid of agent cards (Hermes, Ollama, ChatGPT, Gemini, Claude Code, RuFlo, + CyberOS apps)
    Each card: gradient tint, agent name, provider, model, status pill, latency, sessions count, uptime sparkline

III. UPTIME — LAST 24 HOURS
    Line chart, one line per agent, gold accent for primary

IV. LIVE ACTIVITY — COMBINED LOG STREAM
    Scrolling WebSocket feed, timestamped, colour-coded by agent
    Event count badge, pause/resume button, filter by agent

V.  TOKEN USAGE — LAST 7 DAYS
    Stacked bar chart by agent and day

VI. GOALS OVERVIEW
    Progress bars for each active goal, % complete, due date
```

#### Agent Control Room (per agent)
Route `/agents/:id`. Must have these tabs:
- **Chat** — chat interface, only shown if agent supports chat. Input + streaming response.
- **Status** — terminal-style readout: STATE, MODEL, PROVIDER, VERSION, API KEY (✓/✗ only, never the key itself), LATENCY HISTORY (line chart last 60 pings)
- **Sessions** — table of recent sessions: timestamp, duration, messages, tokens used
- **Analytics** — token usage over time (bar chart), latency distribution (histogram), uptime history (line chart)

#### Self screens (Goals / Journal / Memory)
- **Goals**: card per goal with animated progress bar, + New Goal form, mark complete button, persistence to `./AgenticOS/data/goals.json` or vault path
- **Journal**: textarea for today's entry (autosave 500ms debounce), list of past entries on left, word count in status bar
- **Memory**: vault search (full-text), results as cards with file path + snippet, total note count as metric card, memory vector count graph

#### Launch / onboarding popup
- Padding: `24px` all sides
- Line height: `1.6`
- Word spacing: `normal`
- All text: `#e2e8f0` or `#8b949e` — never invisible
- Max width: `480px`, centered
- Spacing between elements: `16px` gap minimum

---

### STEP 3 — COMMIT

After implementing, verify the app still starts (`npm run dev` — check for build errors, fix them before committing). Then commit all changes:

```bash
cd ./AgenticOS
git add -A
git commit -m "AgenticOS: [brief description of what was added/changed in this iteration]"
```

The commit message should be specific: e.g. `"AgenticOS: add Ollama integration, uptime line chart, activity heatmap, Hermes adapter"`

Write a brief summary of what was done to `./AgenticOS/RESEARCH_LOG.md` under the current iteration heading.

---

### STEP 4 — LOOP BACK

Wait 5 seconds, then begin the next iteration from STEP 1 — RESEARCH again. Each iteration must find something new to improve. If the same search returns the same results, vary the search queries:
- Search for specific graph library implementations (Tremor examples, Recharts, Victory)
- Search for specific agent UI patterns (`"agent dashboard" dark UI bento grid`)
- Search GitHub for recent commits to HermesOS, AgentOS, similar projects
- Search Reddit `r/ClaudeAI`, `r/LocalLLaMA`, `r/MachineLearning` for dashboard setups people are sharing
- Search YouTube for "agentic OS demo 2025" and extract feature ideas from video titles/descriptions

Continue looping until stopped manually.

---

## WHAT NOT TO DO

- Do not touch `../CyberOS Dashboard/` or any other app folder — only work in `./AgenticOS/`
- Do not expose API keys to the frontend renderer — all keys stay in `.env` and are read server-side only
- Do not fake agent status — if an agent isn't reachable, show "offline" or "unknown", never fake "online"
- Do not install dependencies that conflict with the existing stack (Vite + React + Tremor + Fastify)
- Do not switch git branches
- If a build error cannot be fixed, skip that feature and continue the loop with the next improvement

---END---
