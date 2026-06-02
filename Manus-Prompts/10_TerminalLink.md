# MANUS PROMPT — TerminalLink
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Read `CYBEROS_DESIGN_BIBLE.md` first. All design decisions must conform to it.

---

## YOUR ROLE

Produce production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code for TerminalLink. No placeholders. No pseudo-code. Directly implementable in Electron.

---

## CONTEXT: WHAT IS TERMINALLINK?

TerminalLink is a **session-linked terminal with command intelligence**. It is a real, fully functional terminal (backed by `node-pty`) that automatically:

1. Injects `$TARGET` and `$TARGET_IP` environment variables from the active ReconDesk target
2. Logs every command executed with timestamp and session context
3. Links terminal sessions to CyberLab lab sessions
4. Provides a searchable command history panel

The terminal must feel like a professional terminal emulator — not a toy. The operator uses this instead of their native terminal during active engagements because TerminalLink connects their work to the CyberOS ecosystem.

**Accent color:** `#00ff41` (Matrix Green)

---

## CRITICAL TECHNICAL NOTES

### xterm.js
- Use `xterm` npm package for the terminal renderer
- Addons required: `xterm-addon-fit` (responsive resize), `xterm-addon-web-links` (clickable URLs)
- Theme: dark background matching CyberOS `bg-surface`, `#00ff41` for cursor, white for text

### node-pty
- Use `node-pty` for the actual pseudo-terminal process
- Shell: `/bin/zsh` (with fallback to `/bin/bash`)
- Must be loaded in main process via IPC — node-pty cannot run in renderer
- Use `createRequire` pattern for ESM/native module compatibility

### Environment injection
On PTY spawn, inject:
```
$TARGET     = shared_context.activeTarget (target name)
$TARGET_IP  = shared_context.activeIP (IP address)
```

### Dual-pane mode
Two independent PTY processes (one per pane) when split mode is enabled.

---

## DATA MODEL

```typescript
interface TerminalSession {
  id: string;
  name: string;
  linkedLabSession?: string;  // CyberLab session name
  targetName?: string;        // From shared_context at time of creation
  targetIP?: string;
  startedAt: string;
  commandCount: number;
}

interface CommandEntry {
  id: string;
  sessionId: string;
  pane: 'left' | 'right';
  command: string;
  timestamp: string;
  outputSnippet?: string;   // First line of output, if captured
}
```

---

## SCREENS TO BUILD

### Screen 1: Main Terminal View (Primary)

**Layout (single pane):**
```
┌──────────────────────────────────────────────────────────────────┐
│  [●●●] 💻 TerminalLink                    [⊞ Split] [📋 History] │
├──────────────────────────────────────────────────────────────────┤
│  CONTEXT BAR                                                     │
│  $TARGET: Pickle Rick  ·  $TARGET_IP: 10.10.3.164  ·  Session: 1│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  zsh: ~/                                                   │  │
│  │  ▶ nmap -sV -sC 10.10.3.164                              │  │
│  │  Starting Nmap 7.94...                                    │  │
│  │  PORT   STATE  SERVICE  VERSION                           │  │
│  │   22/tcp open  ssh      OpenSSH 7.2p2                    │  │
│  │   80/tcp open  http     Apache httpd 2.4.18               │  │
│  │  Nmap done: 1 IP address (1 host up) scanned              │  │
│  │  ▶ _                                                       │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Session: Pickle Rick • 47 commands • VPN: Connected            │
└──────────────────────────────────────────────────────────────────┘
```

**Context bar:**
- Always visible at top (below title bar)
- Shows `$TARGET`, `$TARGET_IP`, and linked session name
- If no context: show "No active session — $TARGET not set" in `text-muted`
- Green/grey dots for each value (green = set, grey = not set)

**Terminal pane:**
- xterm.js fills the entire remaining space
- Responsive — resizes via `xterm-addon-fit` on window resize
- Custom theme matching CyberOS design language:
  - Background: `#0f1117` (bg-surface)
  - Foreground: `#e6edf3` (text-primary)
  - Cursor: `#00ff41` (accent)
  - Selection: `#00ff41` at 30% opacity
  - Standard ANSI colors for syntax coloring

**Split mode (when enabled):**
```
┌──────────────────────────────────────────────────────────────────┐
│  Context bar (shared)                                            │
├───────────────────────────┬──────────────────────────────────────┤
│  PANE 1                   │  PANE 2                              │
│                           │                                      │
│  [xterm.js terminal]      │  [xterm.js terminal]                 │
│                           │                                      │
│                           │                                      │
└───────────────────────────┴──────────────────────────────────────┘
```

- 50/50 split, fixed
- Each pane has its own independent PTY
- PTY 1 and PTY 2 both receive the same `$TARGET` and `$TARGET_IP` environment
- [⊞ Split] button toggles dual-pane (creates or destroys the second PTY)

---

### Screen 2: Command History Panel (Slide-out)

Opens from the right when [📋 History] is clicked. Slides in at 300px width. Terminal remains visible on the left.

**Layout:**
```
┌─────────────────────────────────┐
│  Command History      [✕ Close] │
│  [🔍 Search commands...]        │
├─────────────────────────────────┤
│  Session: Pickle Rick           │
│  47 commands                    │
├─────────────────────────────────┤
│                                 │
│  14:47:32  [📋]                 │
│  nmap -sV -sC 10.10.3.164      │
│                                 │
│  14:45:11  [📋]                 │
│  gobuster dir -u http://...     │
│                                 │
│  14:43:02  [📋]                 │
│  curl -s http://10.10.3.164    │
│  ────────────────────────────   │
│  [session boundary: 14:30]      │
│  ────────────────────────────   │
│  14:30:15  [📋]                 │
│  ssh -p 22 rick@10.10.3.164    │
│                                 │
├─────────────────────────────────┤
│  [Export commands as .txt]      │
└─────────────────────────────────┘
```

**Search:**
- Real-time filter as operator types
- Highlights matched text in results
- "N results" count shown

**Command entries:**
- Timestamp in monospace `text-xs text-muted`
- Command in monospace `text-sm text-primary`
- Copy button per command
- Clicking a command: copies to clipboard + shows "Copied ✓"

**Session boundaries:**
- Visual divider between different session windows
- "Started: [time]" label

**Export:**
- Writes all commands (newest first) to a `.txt` file via save dialog

---

### Screen 3: Session Management

Sidebar or secondary view listing all terminal sessions (not primary — accessed via sidebar nav if needed).

**Sessions list:**
- Each session: name, start time, command count, linked lab
- Click: loads session history into history panel
- "New session" doesn't create a new PTY (PTY is always running) — it creates a new session record for logging purposes

---

### Screen 4: Settings

**Terminal:**
- Shell path (default: `/bin/zsh`, input field)
- Font size (slider, 12–18px)
- Font family (display only, JetBrains Mono — not changeable per Design Bible)
- Cursor style: block / underline / bar
- Scrollback lines (500 / 1000 / 5000 / unlimited)

**Session:**
- Auto-link new sessions to active CyberLab session (toggle)
- Session name format: date-based or lab-name-based

**Context:**
- Auto-inject $TARGET from shared_context (toggle, default on)
- Show context bar (toggle, default on)

**History:**
- Max commands to store (1000 / 5000 / unlimited)
- Auto-clear on new session (toggle)

---

## ZUSTAND STORE

```typescript
interface TerminalLinkState {
  // Sessions
  sessions: TerminalSession[];
  activeSessionId: string | null;
  
  // Commands
  commandHistory: CommandEntry[];
  
  // Ecosystem context
  sharedContext: SharedContext | null;
  
  // UI
  activeView: 'terminal' | 'sessions' | 'settings';
  historyPanelOpen: boolean;
  splitModeEnabled: boolean;
  searchQuery: string;
  filteredCommands: CommandEntry[];
  
  // Settings
  settings: TerminalSettings;
  
  // Actions
  loadSessions: () => Promise<void>;
  loadCommandHistory: () => Promise<void>;
  
  createSession: () => void;
  addCommand: (command: string, pane: 'left' | 'right') => void;
  
  loadSharedContext: () => Promise<void>;
  
  toggleHistoryPanel: () => void;
  toggleSplitMode: () => void;
  setSearchQuery: (query: string) => void;
  
  exportHistory: () => Promise<void>;
  writeStatus: () => Promise<void>;
  emitEvent: (event: string, data?: unknown) => Promise<void>;
}

interface TerminalSettings {
  shellPath: string;
  fontSize: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  scrollbackLines: number;
  autoInjectTarget: boolean;
  showContextBar: boolean;
  autoLinkSession: boolean;
  maxHistoryEntries: number;
}
```

---

## IPC HANDLERS (main process)

```typescript
// PTY management
ipcMain.handle('terminallink:pty:create', async (event, id: string, env: Record<string, string>) => {
  // Spawn node-pty with /bin/zsh
  // Inject TARGET and TARGET_IP into env
  // Set up data listener → send 'terminallink:pty:data' to renderer
  // Set up exit listener
})

ipcMain.handle('terminallink:pty:input', async (_, id: string, data: string) => {
  // Write data to PTY stdin
})

ipcMain.handle('terminallink:pty:resize', async (_, id: string, cols: number, rows: number) => {
  // Resize PTY
})

ipcMain.handle('terminallink:pty:destroy', async (_, id: string) => {
  // Kill PTY process
})

// Data / config
ipcMain.handle('terminallink:sessions:read', async () => { /* read sessions from app data */ })
ipcMain.handle('terminallink:sessions:write', async (_, sessions) => { /* write sessions */ })
ipcMain.handle('terminallink:history:read', async () => { /* read command history */ })
ipcMain.handle('terminallink:history:write', async (_, history) => { /* write command history */ })
ipcMain.handle('terminallink:config:read', async () => { /* read shared_context from cybertools-config.json */ })
ipcMain.handle('terminallink:config:write', async (_, patch) => { /* write terminallink_status */ })
ipcMain.handle('terminallink:export:dialog', async (_, content: string) => { /* save dialog + write txt */ })
ipcMain.handle('terminallink:event:emit', async (_, event) => { /* append to ecosystem-events.json */ })
```

---

## COMPONENT ARCHITECTURE

```
src/
├── main/
│   ├── ipc/
│   │   └── terminallink.ts     # PTY management + all IPC handlers
│   └── ptyManager.ts           # Map of PTY instances by ID
├── renderer/
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── terminal/
│   │   │   ├── TerminalPane.tsx       # xterm.js wrapper
│   │   │   ├── TerminalSplit.tsx      # Dual-pane container
│   │   │   └── ContextBar.tsx
│   │   ├── history/
│   │   │   ├── HistoryPanel.tsx
│   │   │   ├── CommandEntry.tsx
│   │   │   └── HistorySearch.tsx
│   │   └── settings/
│   │       └── SettingsView.tsx
│   ├── stores/
│   │   └── useTerminalLinkStore.ts
│   ├── hooks/
│   │   ├── useTerminal.ts          # xterm.js setup + IPC bridge
│   │   └── useCommandLogger.ts     # Tracks input buffer, logs on Enter
│   └── types/
│       └── terminallink.ts
```

---

## ANIMATIONS

- **History panel:** slide in from right (300px, 200ms ease-out)
- **History panel close:** slide out to right (150ms ease-in)
- **Context bar:** slide down from title bar on initial mount (if context is set)
- **Command appear in history:** slide up from bottom
- **Split mode toggle:** smooth resize of panes (CSS transition on width)

---

## COMMAND LOGGING IMPLEMENTATION

Command logging must not interfere with the terminal experience. Implementation:

```typescript
// In useCommandLogger hook:
// Maintain an input buffer per PTY
// On every input character: append to buffer
// On '\r' (Enter): 
//   - Store buffered input as CommandEntry (trim whitespace)
//   - If buffer is non-empty and not a repeat of last command
//   - Clear buffer
//   - Write to command history (debounced save to disk)
```

Edge cases to handle:
- Backspace/delete: update buffer correctly
- Arrow keys (history navigation): filter out escape sequences from the logged command
- Multi-line commands: log the full entry including newlines
- Empty Enter: do not log

---

## CRITICAL REQUIREMENTS

1. node-pty MUST run in the main process — never try to use it in the renderer (Node.js native module, no browser support)
2. xterm.js MUST be initialized after the DOM element is mounted — use a `useEffect` with a ref
3. PTY resize must be called every time the window resizes — use ResizeObserver on the terminal container
4. When split mode is enabled, both PTYs must receive the SAME environment variables
5. The `$TARGET` and `$TARGET_IP` values must be refreshed when `shared_context` changes — this may require spawning a new PTY or exporting vars in the running shell
6. Command history must persist across app restarts (write to disk on every new command)
7. The history panel must virtualize the list if there are > 500 commands (use windowing)
8. PTY processes must be properly killed on app quit to avoid zombie processes

---

## DELIVERABLES

1. All component files
2. Main process: `ptyManager.ts`, `ipc/terminallink.ts`
3. Zustand store
4. Hooks: `useTerminal.ts`, `useCommandLogger.ts`
5. Type definitions
6. `IMPLEMENTATION_PLAN.md` for TerminalLink

---

*Read CYBEROS_DESIGN_BIBLE.md first.*
