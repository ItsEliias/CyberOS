# PlaybookStudio — Implementation Plan

## Overview

PlaybookStudio is the methodology playbook builder and runner for the CyberOS ecosystem. It turns security testing methodologies into structured, interactive checklists that operators run during live engagements.

**Accent:** `#4a9eff` (Blue)
**Stack:** Electron + React + TypeScript + Tailwind CSS + Zustand

---

## Architecture

```
src/
├── main/
│   ├── main.ts              IPC handlers, window, context polling, disk I/O
│   ├── preload.ts           contextBridge API exposed to renderer
│   └── ecosystem-bus.ts     CyberOS ecosystem event emitter
├── shared/
│   ├── types.ts             Playbook, PlaybookRun, PlaybookStep, SharedContext
│   └── builtinPlaybooks.ts  4 built-in playbooks (read-only, bundled)
└── renderer/
    ├── App.tsx              Root: TitleBar + view router + StatusBar
    ├── main.tsx             React entry
    ├── store/index.ts       Zustand store
    ├── globals.css          CyberOS Design Bible base styles
    ├── index.css            CSS variables (--bg, --accent, etc.)
    └── components/
        ├── layout/
        │   ├── TitleBar.tsx       Frameless titlebar with traffic lights, nav, actions
        │   └── StatusBar.tsx      Bottom bar: playbook count, active run, lab context
        ├── LibraryView.tsx        Playbook grid with category filter chips
        ├── RunView.tsx            Two-panel run interface (step list + step detail)
        ├── EditorView.tsx         Playbook metadata editor + step manager
        ├── HistoryView.tsx        Completed/abandoned run list with detail expand
        └── SettingsView.tsx       Storage path, export/import, integration toggles
```

---

## Data Flow

### Playbook Storage
- **Built-ins**: Bundled in `builtinPlaybooks.ts`. Never written to disk. Cannot be deleted or modified — only cloned.
- **Custom**: Persisted to `~/Library/Application Support/PlaybookStudio/playbooks.json`.
- **Runs**: Persisted to `~/Library/Application Support/PlaybookStudio/runs.json`. Auto-saved every 30 seconds during active run.

### Ecosystem Integration
- Reads `~/cybertools-config.json` → `shared_context` for active lab/target/IP. Polled every 10s.
- Writes `shared_context.activePlaybook` on run start; clears on complete/abandon.
- Emits events to `~/Library/Application Support/CyberTools/ecosystem-events.json`.

---

## Built-In Playbooks

| ID | Name | Category | Steps |
|----|------|----------|-------|
| `builtin-web-app` | Web Application Assessment | web-app | 10 |
| `builtin-linux-privesc` | Linux Privilege Escalation | linux | 10 |
| `builtin-ad-initial` | Active Directory Initial Access | active-directory | 9 |
| `builtin-network-recon` | Network Recon | network | 8 |

---

## IPC API

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `app:get-state` | invoke | Full initial state load |
| `playbooks:get-all` | invoke | All playbooks (built-in + custom) |
| `playbooks:save` | invoke | Create/update custom playbook |
| `playbooks:delete` | invoke | Delete custom playbook |
| `playbooks:clone` | invoke | Deep-copy any playbook as new custom |
| `runs:get-all` | invoke | All runs |
| `runs:start` | invoke | Begin run, write shared context |
| `runs:update-step` | invoke | Update step status/notes, auto-save |
| `runs:complete` | invoke | Mark run completed, clear shared context |
| `runs:abandon` | invoke | Mark run abandoned |
| `context:get` | invoke | Read current shared context |
| `context:updated` | push | Main → renderer on context change |
| `playbook:run-command` | invoke | Queue command for TerminalLink |

---

## Key Behaviors

1. **Clone only, no modify** — Built-in playbooks: Edit button becomes Clone. Clone deep-copies all steps with new IDs.
2. **Auto-save every 30s** — `setInterval` in RunView triggers a step re-save to flush any in-flight notes.
3. **Command variable injection** — `[TARGET_IP]`, `[TARGET_URL]`, `<IP>`, `<target>` replaced from run's session context IP at display time.
4. **Required step warning** — Skipping a required step shows a confirm dialog (warning only, not a hard block).
5. **Session restoration** — On app launch, if a `running` run exists in history, it's re-set as activeRun.
6. **Context polling** — Main process reads `cybertools-config.json` every 10s and pushes changes to renderer via `context:updated`.

---

## Screens

| View | Route Key | Description |
|------|-----------|-------------|
| Library | `library` | Playbook grid with category filters, Run/Clone/Edit/Delete actions |
| Run | `run` | Two-panel: step list (280px) + step detail with commands and operator notes |
| Editor | `editor` | Playbook metadata + step list with expand-in-place step editing |
| History | `history` | Run list with click-to-expand per-step results; Resume for abandoned runs |
| Settings | `settings` | Storage path, export/import JSON, integration toggles, live context display |

---

## File Limits

All source files are kept under 500 lines. Components are co-located by feature area. Built-in data is kept in `src/shared/` so it is accessible to both main and renderer without circular imports.
