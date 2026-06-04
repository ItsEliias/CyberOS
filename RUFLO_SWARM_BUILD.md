# CyberOS — RuFlo Swarm Build Guide

Use this document to build all 10 remaining CyberOS apps in parallel using RuFlo's multi-agent swarm orchestration inside Claude Code. One paste. All apps built simultaneously.

---

## Setup — Run These Steps Once in Order

### Step 1 — Add the RuFlo marketplace and install plugins

Run each command one at a time in Claude Code, waiting for confirmation before the next:

```
/plugin marketplace add https://github.com/ruvnet/ruflo
```
```
/plugin install ruflo-core@ruflo
```
```
/reload-plugins
```
```
/plugin install ruflo-swarm@ruflo
```
```
/plugin install ruflo-workflows@ruflo
```
```
/plugin install ruflo-autopilot@ruflo
```
```
/reload-plugins
```

> When asked about install scope, choose **"Install for you (user scope)"** — this makes RuFlo available across all your projects without tying it to a specific repo.

### Step 2 — Initialise RuFlo in the CyberOS project

Run this in your terminal:

```bash
cd "/Users/codyliddell/Documents/Claude/Projects/CyberOS"
npx ruflo@latest init
```

Accept the defaults when prompted. This creates `.claude/` hooks and wires up the memory system.

### Step 3 — Register RuFlo as an MCP server in Claude Code

```bash
claude mcp add ruflo -- npx ruflo@latest mcp start
```

Verify it registered:

```bash
claude mcp list
```

You should see `ruflo` in the list.

### Step 4 — Confirm the Dashboard source files exist

The swarm agents read directly from the Dashboard. Confirm these files are present:

```
CyberOS Dashboard/tailwind.config.js
CyberOS Dashboard/src/renderer/globals.css
CyberOS Dashboard/src/renderer/components/layout/TitleBar.tsx
CyberOS Dashboard/src/renderer/components/layout/StatusBar.tsx
CyberOS Dashboard/src/renderer/components/layout/Sidebar.tsx
CyberOS Dashboard/src/renderer/components/shared/MetricCard.tsx
```

If any are missing, pull the latest from GitHub before proceeding.

---

## The Swarm Prompt

Copy everything between the `---BEGIN---` and `---END---` markers and paste it directly into Claude Code. Do not modify it.

---BEGIN---

Use `ruflo-swarm` to spawn 10 parallel builder agents across the CyberOS project. Each agent builds one app independently and simultaneously. All agents share the same design rules below.

---

### SHARED DESIGN RULES — all agents must follow these

**Design source of truth:** The CyberOS Dashboard (located at `../CyberOS Dashboard/` relative to each app folder) is the master visual reference. Before writing any UI code, each agent must read and match these files exactly:

| File | What to extract |
|---|---|
| `../CyberOS Dashboard/tailwind.config.js` | All color tokens, animation keyframes — copy verbatim |
| `../CyberOS Dashboard/src/renderer/globals.css` | `.glass-card`, `.status-dot-pulse`, `.metric-glow`, `.radar-glow`, `.drag-region`, `.no-drag`, `.accent-border-left`, scrollbar styles, root background — copy verbatim |
| `../CyberOS Dashboard/src/renderer/components/layout/TitleBar.tsx` | Frameless title bar: traffic light spacer, app icon + name, action buttons (alerts, settings, fullscreen), `drag-region` class |
| `../CyberOS Dashboard/src/renderer/components/layout/StatusBar.tsx` | Bottom bar: ecosystem status dot, VPN status, UTC clock, `font-mono text-xs` styling |
| `../CyberOS Dashboard/src/renderer/components/layout/Sidebar.tsx` | Nav items, `layoutId="sidebar-active"` Framer Motion indicator, 3px accent left border, active session context strip, mini ecosystem dot row at bottom |
| `../CyberOS Dashboard/src/renderer/components/shared/MetricCard.tsx` | Glassmorphism card structure, animated count-up, `metric-glow` class, `--glow-color` CSS variable pattern |

**Card styling — mandatory for every card in every app:**
```css
background: rgba(22, 27, 39, 0.75);
backdrop-filter: blur(8px);
-webkit-backdrop-filter: blur(8px);
border: 1px solid rgba(42, 51, 71, 0.6);
border-radius: 8px;
```
This is already defined as `.glass-card` in globals.css. Use that class.

**Root window background — mandatory:**
```css
background-color: #0a0a0f;
background: radial-gradient(ellipse at 20% 0%, rgba(74, 158, 255, 0.04) 0%, #0a0a0f 50%);
```

**Typography:**
- UI text: `Inter`, `SF Pro Display`, `system-ui`, `sans-serif`
- Code, terminals, monospace data: `JetBrains Mono`, `SF Mono`, `Menlo`, `monospace`

**Active sidebar item:** Framer Motion `motion.div` with `layoutId="sidebar-active"`, 3px left border using the app's accent color, `rounded-r-full`.

**Status dots:** Use `.status-dot-pulse` class with `--pulse-color` and `--pulse-color-fade` CSS variables set to the app's accent color at 40% and 0% opacity.

**Metric numbers:** Apply `textShadow: 0 0 12px {accentColor}66, 0 0 24px {accentColor}1a` inline. Use the `metric-glow` CSS class.

**Chart/SVG glow:** Apply `filter: drop-shadow(0 0 4px {accentColor}99) drop-shadow(0 0 8px {accentColor}33)` on chart line elements.

**Scrollbars:** 6px width, transparent track, `rgba(42, 51, 71, 0.5)` thumb — already in globals.css.

**Focus ring:** `outline: 1px solid rgba(74, 158, 255, 0.5)` — already in globals.css.

**Transitions:** `transition: all 0.15s ease-out` on buttons, inputs, links — already in globals.css.

**Animations:**
- Panel slide-in: 200–300ms ease-out
- Modal: scale(0.95)→scale(1) + opacity 0→1, 150ms
- List items: stagger 40ms per item on mount
- Node/card hover: scale 1.02, 100ms

**No placeholders. No pseudo-code. No TODO comments. Production-ready, directly runnable in Electron.**

---

### AGENT ASSIGNMENTS

Spawn all 10 agents simultaneously with the following parameters:

---

#### Agent 1 — `ghostvault-builder`
- **Working directory:** `./GhostVault`
- **Accent color:** `#7bb8ff` (Soft Blue)
- **Spec file:** `../Manus-Prompts/04_GhostVault.md`
- **Summary:** Two-window app. Window A is a 480×400px frameless always-on-top quick-capture popup (global hotkey `Cmd+Shift+G`), frameless, no dock icon. Window B is the full vault browser (960×680px min). Writes directly to Obsidian Markdown vault on disk via Node.js `fs`. No internal database. Features: note capture with auto-grow textarea, tag chips, path selector, session banner when lab active; vault browser with note list + editor panes, file tree, tag cloud, templates with `{{LAB}}` `{{TARGET}}` `{{IP}}` placeholders, Ollama AI assistant. Stores: `useVaultStore`, `useCaptureStore`. IPC handlers: `ghostvault:vault:list`, `ghostvault:note:read/write/delete/search`, `ghostvault:clipboard:read`, `ghostvault:ollama:models/chat`, `ghostvault:config:read`, `ghostvault:event:emit`. Read the full spec for all screens, data models, and component architecture.

---

#### Agent 2 — `cyberlab-builder`
- **Working directory:** `./CyberLab Companion`
- **Accent color:** `#b44fff` (Purple)
- **Spec file:** `../Manus-Prompts/05_CyberLab_Companion.md`
- **Summary:** The primary working app during active lab sessions. Tab-based sessions (one tab per lab), engagement timer with lap functionality, structured writeup editor (Markdown), AI chat panel (Ollama), flag tracker, and note-taking. Writes session data to `cybertools-config.json` as `cyberlab_status`. Links to GhostVault for note capture and ReconDesk for target context. Read the full spec.

---

#### Agent 3 — `recondesk-builder`
- **Working directory:** `./ReconDesk`
- **Accent color:** `#d29922` (Amber)
- **Spec file:** `../Manus-Prompts/03_ReconDesk.md`
- **Summary:** Target tracking and attack surface management. Manages a list of targets (IP, hostname, platform, status). For each target: open ports table, attack card board (Kanban: Todo/In Progress/Done), credentials panel, notes. Parses nmap XML output (DOMParser, no external lib). Writes `shared_context.activeTarget`, `shared_context.activeIP` to `cybertools-config.json` when a target is set active. Emits events to `ecosystem-events.json`. Read the full spec.

---

#### Agent 4 — `signalboard-builder`
- **Working directory:** `./SignalBoard`
- **Accent color:** `#ff6b6b` (Red-Orange)
- **Spec file:** `../Manus-Prompts/06_SignalBoard.md`
- **Summary:** RSS/Atom feed aggregator with relevance scoring. Fetches feeds on a configurable interval, scores articles by keyword match against a user-defined interest profile (CVE keywords, tool names, platforms), displays a ranked feed. Features: feed manager, article reader pane, keyword config, bookmarks, export. Read the full spec.

---

#### Agent 5 — `vaultcore-builder`
- **Working directory:** `./VaultCore`
- **Accent color:** `#3fb950` (Green)
- **Spec file:** `../Manus-Prompts/07_VaultCore.md`
- **Summary:** Web scraper and content monitor. User adds URLs to watch; VaultCore fetches them on a schedule, diffs the content using LCS, and alerts when significant changes are detected. Stores snapshots locally. Features: source list, diff viewer (side-by-side), change history timeline, alert config. Read the full spec.

---

#### Agent 6 — `playbookstudio-builder`
- **Working directory:** `./PlaybookStudio`
- **Accent color:** `#4a9eff` (Blue)
- **Spec file:** `../Manus-Prompts/08_PlaybookStudio.md`
- **Summary:** Attack playbook builder and runner. Operators create step-by-step playbooks (name, description, ordered steps with command/notes/expected output). Built-in playbooks: Web App Recon, SMB Enumeration, AD Enumeration, Linux PrivEsc. Run mode: step through playbook one at a time, check off completed steps, add notes per step. Injects `$TARGET` and `$TARGET_IP` from shared context into command templates. Read the full spec.

---

#### Agent 7 — `reportforge-builder`
- **Working directory:** `./ReportForge`
- **Accent color:** `#3fb950` (Green)
- **Spec file:** `../Manus-Prompts/09_ReportForge.md`
- **Summary:** Assessment report generator. 3-step wizard to create reports (metadata → import from ReconDesk → import CyberLab writeup). Report editor with drag-to-reorder sections, Markdown editor per section, findings panel grouped by severity (Critical/High/Medium/Low/Info). Export to Markdown or PDF (Electron `printToPDF`, print-optimised CSS, white background). Auto-save every 30 seconds. Credentials redacted by default in exports. Read the full spec.

---

#### Agent 8 — `terminallink-builder`
- **Working directory:** `./TerminalLink`
- **Accent color:** `#00ff41` (Matrix Green)
- **Spec file:** `../Manus-Prompts/10_TerminalLink.md`
- **Summary:** Session-linked terminal emulator. Uses `node-pty` (main process only, never renderer) + `xterm.js` with `xterm-addon-fit` and `xterm-addon-web-links`. Injects `$TARGET` and `$TARGET_IP` from shared context into PTY environment on spawn. Logs every command (input buffer tracking, flush on `\r`). Features: single pane, split dual-pane mode (two independent PTYs), command history panel (slide-in 300px, searchable, virtualized >500 entries), session management, export history as `.txt`. xterm theme: background `#0f1117`, cursor `#00ff41`, selection `#00ff41` at 30% opacity. Read the full spec.

---

#### Agent 9 — `credvault-builder`
- **Working directory:** `./CredVault`
- **Accent color:** `#f78166` (Coral)
- **Spec file:** `../Manus-Prompts/11_CredVault.md`
- **Summary:** Encrypted credential store. AES-256-GCM encryption, PBKDF2 key derivation (310,000 iterations, SHA-256), all crypto in main process via Node.js `crypto` — never in renderer. Master password gates access; vault locks after configurable timeout. Features: credential list with search/filter, credential detail/edit form, password generator, import from text/CSV, export (encrypted only). Vault file is a single encrypted JSON blob. Read the full spec.

---

#### Agent 10 — `networkmap-builder`
- **Working directory:** `./NetworkMap`
- **Accent color:** `#d29922` (Amber)
- **Spec file:** `../Manus-Prompts/12_NetworkMap.md`
- **Summary:** Visual network topology mapper. Parses nmap XML (DOMParser, no external lib) and renders an interactive force-directed SVG graph using D3 (`forceManyBody` strength -300, `forceLink`, `forceCenter`, `forceCollide`). Run 200 tick iterations before render — graph must appear already settled. Node coloring: 0 ports = `#484f58`, 1–2 = `#3fb950`, 3–5 = `#d29922`, 6+ = `#f85149`. Node radius proportional to open port count (12px–28px). Pan (drag background) + zoom (scroll wheel, 0.3×–3.0×) via SVG transform attribute. Node drag pins `fx`/`fy`. Node detail slide-in panel (320px). Import modal with 3 tabs: file picker, paste XML, import from ReconDesk. Export clean standalone SVG. Read the full spec.

---

### EXECUTION INSTRUCTIONS FOR ALL AGENTS

Each agent must follow this sequence:

1. **Read the shared design files** from `../CyberOS Dashboard/` as listed above
2. **Read the app spec file** from `../Manus-Prompts/[SPEC FILE]`
3. **Copy** `tailwind.config.js` verbatim into the app's root — only update the `accent.DEFAULT` value to the app's accent color and ensure `app.[appname]` is set correctly
4. **Copy** `globals.css` verbatim into `src/renderer/` (or equivalent styles directory)
5. **Implement** all screens, components, stores, IPC handlers, and type definitions described in the spec
6. **Output all files** into the existing app folder structure — do not create a new project, work within what exists
7. **Do not** install new npm packages unless they are already listed in the spec (e.g., `d3`, `xterm`, `node-pty`, `framer-motion`, `zustand`)
8. **Do not** leave any placeholder comments, TODO markers, or unimplemented stubs

When complete, write a brief status summary to RuFlo shared memory under the key `cyberos:[appname]:build-status` with value `complete` or `failed:[reason]`.

---END---

---

## Monitoring Progress

Once the swarm is running, check agent status with:

```bash
/swarm status
```

Or query shared memory for build results:

```bash
npx ruflo@latest memory search --query "cyberos build-status"
```

Each agent writes its completion status there. You can check individual apps as they finish without waiting for all 10.

---

## After the Swarm Completes

For each app folder, verify the build:

```bash
cd "/Users/codyliddell/Documents/Claude/Projects/CyberOS/[App Folder]"
npm run build
```

If a build fails, run the single-app fix prompt (see below) rather than re-running the full swarm.

### Single-app fix prompt (if one agent fails)

Paste this into Claude Code with the specific app folder open:

```
Read ../CyberOS Dashboard/tailwind.config.js, globals.css, TitleBar.tsx, StatusBar.tsx, Sidebar.tsx, and MetricCard.tsx.
Read ../Manus-Prompts/[PROMPT FILE].md.
The build failed in this app folder. Fix all errors. Match the Dashboard styling exactly.
Accent color: [ACCENT COLOR]. No placeholders. Production-ready only.
```

---

## App Reference Table

| App | Folder | Accent | Prompt file |
|---|---|---|---|
| GhostVault | `GhostVault/` | `#7bb8ff` | `04_GhostVault.md` |
| CyberLab Companion | `CyberLab Companion/` | `#b44fff` | `05_CyberLab_Companion.md` |
| ReconDesk | `ReconDesk/` | `#d29922` | `03_ReconDesk.md` |
| SignalBoard | `SignalBoard/` | `#ff6b6b` | `06_SignalBoard.md` |
| VaultCore | `VaultCore/` | `#3fb950` | `07_VaultCore.md` |
| PlaybookStudio | `PlaybookStudio/` | `#4a9eff` | `08_PlaybookStudio.md` |
| ReportForge | `ReportForge/` | `#3fb950` | `09_ReportForge.md` |
| TerminalLink | `TerminalLink/` | `#00ff41` | `10_TerminalLink.md` |
| CredVault | `CredVault/` | `#f78166` | `11_CredVault.md` |
| NetworkMap | `NetworkMap/` | `#d29922` | `12_NetworkMap.md` |

---

## Notes

- **TerminalLink** requires `node-pty` which must be rebuilt for Electron. If the build fails with a native module error, run `npx electron-rebuild -f -w node-pty` inside the TerminalLink folder.
- **CredVault** crypto runs in the main process only. If the agent puts any `crypto` calls in the renderer, that is a bug — flag it and fix with the single-app prompt.
- **NetworkMap** requires `d3` — confirm it is in `package.json` before the build. If missing: `npm install d3 @types/d3`.
- **GhostVault** has two separate renderer entry points (capture window + vault browser). The agent must configure `electron.vite.config.ts` to build both.
- All apps read from and write to `cybertools-config.json` and `ecosystem-events.json` at the path configured in each app's settings — the ecosystem bus is already implemented in most app folders. Do not duplicate it; use what exists.
