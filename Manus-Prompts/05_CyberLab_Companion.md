# MANUS PROMPT — CyberLab Companion
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Read `CYBEROS_DESIGN_BIBLE.md` first. All decisions must conform to it.

---

## YOUR ROLE

Produce production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code for CyberLab Companion. No placeholders. No pseudo-code. Directly implementable in Electron.

---

## CONTEXT: WHAT IS CYBERLAB COMPANION?

CyberLab Companion is the **operator's primary working environment during an active lab or CTF**. When a machine boots, the operator opens CyberLab Companion and it stays open for the duration of the session. It is where they:

- Track the lab session (time, objectives, platform)
- Chat with AI to get help, research services, generate commands
- Use command templates pre-filled with target IP
- Log findings and evidence
- Sync bidirectionally with ReconDesk
- Generate writeups when done

It is the busiest, most-used app in the ecosystem during an engagement. Every millisecond of friction costs operator focus.

**Accent color:** `#b44fff` (Purple)

---

## TAB-BASED SESSION ARCHITECTURE

CyberLab uses a **tab model** — each tab is an independent lab session. The operator can have multiple sessions open (e.g., one active lab + one previous lab for reference).

Each tab has completely independent state: its own timer, chat history, findings, AI context, command history.

---

## DATA SOURCES

### cybertools-config.json
**Reads:**
- `shared_context.activeTarget` — auto-fills target IP in new sessions
- `shared_context.activeIP`
- `recondesk_status` — linked target data

**Writes:**
- `cyberlab_status.active` — true when a session is active
- `cyberlab_status.currentLab` — active session name
- `cyberlab_status.sessionActive` — true
- `cyberlab_status.findingsCount`
- `shared_context.activeLab` — written when active session changes
- `operator_profile.totalLabsCompleted` — incremented on session complete
- `operator_profile.totalFlags` — incremented when flags logged
- `operator_profile.currentStreak` — updated on session complete

### ReconDesk (via config)
- Reads target data from `recondesk_status.activeTarget` and target's ports/credentials
- Can push ports and credentials back to ReconDesk via IPC

### GhostVault (via filesystem)
- Writes session writeup as Markdown to Obsidian vault path

---

## SESSION DATA MODEL

```typescript
interface LabSession {
  id: string;
  name: string;               // "Pickle Rick", "Blue Machine"
  platform: 'HTB' | 'THM' | 'CTF' | 'Client';
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane' | 'Unknown';
  targetIP: string;
  startTime: string;          // ISO timestamp
  endTime?: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  
  // Timer state
  timerMode: 'stopwatch' | 'countdown';
  countdownDuration?: number; // seconds
  elapsedSeconds: number;
  timerRunning: boolean;
  
  // Content
  chatHistory: ChatMessage[];
  findings: Finding[];
  hints: HintEntry[];
  screenshots: ScreenshotEntry[];
  commandHistory: CommandEntry[];
  notes: string;              // markdown
  flags: FlagEntry[];
  
  // Linked
  linkedTarget?: string;      // ReconDesk target name
  writeupPath?: string;       // Path to generated writeup in vault
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider: 'claude' | 'ollama';
  model: string;
  parsedPorts?: ParsedPort[];     // if AI response contained port info
  parsedCreds?: ParsedCred[];     // if AI response contained credential info
}

interface Finding {
  id: string;
  type: 'port' | 'credential' | 'vulnerability' | 'flag' | 'note';
  content: string;
  source: 'manual' | 'ai-parsed' | 'screenshot';
  timestamp: string;
  sentToReconDesk: boolean;
}

interface FlagEntry {
  id: string;
  value: string;
  type: 'user' | 'root' | 'flag' | 'other';
  foundAt: string;
}

interface HintEntry {
  id: string;
  content: string;
  timestamp: string;
}

interface CommandEntry {
  id: string;
  command: string;
  template: string;
  timestamp: string;
}
```

---

## SCREENS TO BUILD

### Screen 1: Main Session View (Primary)

This is the default screen and the one the operator spends 95% of their time on.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  [●●●] ⚗ CyberLab Companion                    [AI: Claude ▾]  │
├──────────────────────────────────────────────────────────────────┤
│  [Tab: Pickle Rick ●] [Tab: Blue Machine] [+]                    │
├────────────────────────────┬─────────────────────────────────────┤
│  SESSION INFO PANEL        │  AI CHAT PANEL                      │
│  (320px fixed)             │  (flex-1)                           │
│                            │                                     │
│  ┌──────────────────────┐  │  [Chat history — scrollable]        │
│  │ TIMER                │  │                                     │
│  │  01:23:47            │  │  [User] How do I enumerate SMB...   │
│  │  [⏸] [⏹]            │  │                                     │
│  └──────────────────────┘  │  [AI] To enumerate SMB, run:        │
│                            │  nmap -sV -p 445 --script smb...    │
│  Target: 10.10.3.164       │  [💾 Save to ReconDesk]             │
│  Platform: THM             │                                     │
│  Difficulty: Easy          │  [User] Found credentials: ...      │
│                            │                                     │
│  ┌──────────────────────┐  │  [AI] Those look like NTLM hashes   │
│  │ FINDINGS (3)         │  │  Username: R1ckRul3s                │
│  │                      │  │  [💾 Save cred to ReconDesk]        │
│  │ ● Port 80 (http)     │  │                                     │
│  │ ● Port 22 (ssh)      │  │  ─────────────────────────────      │
│  │ ● Cred: R1ckRul3s    │  │                                     │
│  └──────────────────────┘  │  [? Hint] [📸 Screenshot]           │
│                            │  [Message input............] [Send] │
│  [📋 Commands] [📝 Notes]   │                                     │
│  [⚑ Flags] [📄 Writeup]    │                                     │
└────────────────────────────┴─────────────────────────────────────┘
│  VPN: Connected • Target: 10.10.3.164 • Flags: 1 • Hints: 2     │
└──────────────────────────────────────────────────────────────────┘
```

---

### Left Panel: Session Info (320px fixed)

**Timer Card:**
```
┌───────────────────────────────┐
│  01:23:47                     │  ← huge, tabular-nums, monospace
│  Elapsed                      │  ← label, text-sm text-muted
│                               │
│  [⏸ Pause]  [⏹ Stop]         │
└───────────────────────────────┘
```
- Timer counts up from session start
- If countdown mode: counts down, turns amber at 10 min, red at 5 min, pulses at 2 min
- Pause: freezes elapsed time
- Stop: confirms end of session → triggers session complete flow

**Session metadata below timer:**
- Target IP (monospace, copyable — click to copy)
- Platform badge (colored)
- Difficulty badge
- Started: relative timestamp
- Linked ReconDesk target (if any): name + amber link icon

**Findings Panel:**
- Compact list of logged findings
- Color-coded by type: blue=port, red=credential, green=flag, amber=vulnerability
- Each item: type icon + content (truncated) + "→ ReconDesk" send button
- "View all" link opens Findings tab
- "+ Add" button: quick add finding inline

**Quick Action Buttons:**
- `[📋 Commands]` — opens command builder panel (slides in from bottom or right)
- `[📝 Notes]` — opens notes textarea within left panel (expands)
- `[⚑ Flags]` — opens flag logger
- `[📄 Writeup]` — opens writeup generator

---

### Right Panel: AI Chat

**Chat history (scrollable, flex-1):**
- User messages: right-aligned, `bg-elevated`, rounded bubble
- AI messages: left-aligned, full-width, formatted Markdown
- AI messages may contain:
  - Code blocks (styled with monospace, copy button)
  - Command suggestions (highlighted, copy button)
  - Parsed port data: appear as blue chips → clicking shows "Save to ReconDesk ports"
  - Parsed credential data: appear as red chips → clicking shows "Save to ReconDesk credentials"
- System messages: centered, `text-muted`, `text-xs`
- Loading: animated "..." dots while AI is generating
- Auto-scroll to bottom on new message

**AI parse behavior:**
When the AI response contains patterns matching `\d{1,5}/tcp`, `\d{1,5}/udp`, usernames, or common hash patterns, extract them and show as interactive chips at the bottom of the message:
```
[Detected] Port 80/tcp (http) [+ ReconDesk]  Port 443/tcp (https) [+ ReconDesk]
[Detected] Username: R1ckRul3s [+ ReconDesk]
```

**Chat input area:**
- Full-width textarea, auto-grows
- Cmd+Enter: send
- [? Hint] button: logs a hint, adds a message to chat asking for a hint
- [📸 Screenshot] button: captures screen, attaches to chat and session

**AI provider bar (header):**
- Dropdown: "Claude 3 Haiku" / "Claude 3 Sonnet" / "Claude 3 Opus" / "Ollama: [model]"
- Shows current provider and model
- Indicator: green dot if connected, red if error

---

### Screen 2: New Session Modal

Opened when the [+] tab button is clicked.

**Fields:**
- Session Name (text, e.g., "Pickle Rick")
- Platform (select: HTB / THM / CTF / Client)
- Difficulty (select: Easy / Medium / Hard / Insane / Unknown)
- Target IP (text, auto-filled from `shared_context.activeIP` if set)
- Timer mode (radio: Stopwatch / Countdown)
  - If countdown: duration input (MM:SS)
- Link to ReconDesk target (dropdown of existing targets in config)
- Initial context for AI (optional textarea — pre-primes the AI with context)

**Create Session** → starts timer, adds tab, writes `shared_context.activeLab`.

---

### Screen 3: Command Builder (Panel)

Slides in from the right or bottom when "Commands" is clicked. Can be used while the chat is still visible.

**Layout:**
- Search bar at top: filter commands
- Category tabs: nmap / gobuster / enum / exploit / post / custom
- Command cards:

```
nmap Full Scan
────────────────────────────────────────────────────────
nmap -sV -sC -p- -T4 [TARGET_IP]
────────────────────────────────────────────────────────
nmap -sV -sC -p- -T4 10.10.3.164                  [Copy]
(auto-filled with session target IP)
```

**Built-in commands:**
- nmap: quick scan, full port scan, UDP scan, service version, vuln scan, SMB enum, OS detection
- gobuster: dir, vhost, DNS
- enum4linux: basic, full
- hydra: ssh, ftp, http-post
- searchsploit: by service name
- linpeas / winpeas: curl + execute one-liners
- Metasploit: common module commands
- Impacket: psexec, secretsdump, GetNPUsers
- Mimikatz: common commands

**Command auto-fill:**
- `[TARGET_IP]` → replaced with session's target IP
- `[TARGET_NAME]` → replaced with session name
- Shows filled version below the template version

**Custom commands:**
- "Save current command" input bar at bottom
- Saved commands persist in session data

---

### Screen 4: Findings View (Tab)

Full list of all logged findings for the session.

**Layout:** Table view

| Type | Content | Source | Sent to ReconDesk | Time |
|---|---|---|---|---|
| Port | 80/tcp http Apache 2.4 | AI-parsed | ✓ | 14:23 |
| Credential | R1ckRul3s / http:80 | Manual | ○ | 14:45 |
| Vulnerability | CVE-2021-4034 | Manual | ○ | 15:02 |

- Filter by type
- "Send all to ReconDesk" batch button
- Delete per finding
- Click to expand with full notes

---

### Screen 5: Flags Logger (Modal or Panel)

Simple, fast interface for logging flags.

```
FLAG TRACKER
─────────────────────────
[Placeholder: THM{...}]           [Log Flag]

LOGGED FLAGS (1)
─────────────────────────
THM{Mr.Meeseeks_1c3y}    user.txt    14:30    [Copy]
```

- Flag input: text field, auto-detects format (THM{...}, HTB{...}, flag{...})
- Type: user / root / flag / other
- On log: increments `operator_profile.totalFlags` in config, emits event
- Copy button per flag
- Shows count in the status bar

---

### Screen 6: Notes (Panel within left panel)

Expands within the left panel when "Notes" clicked. 

- Textarea with Markdown
- Auto-saves every 30 seconds
- "Save to GhostVault" button: exports note to vault with session context

---

### Screen 7: Session Complete & Writeup Generator

Triggered when the operator clicks Stop on the timer (or closes a tab).

**Session Complete Modal:**
```
┌─────────────────────────────────────────────────────┐
│  🏁 Session Complete: Pickle Rick                   │
│                                                     │
│  Duration: 1h 23m 47s                               │
│  Findings: 3 ports, 2 credentials, 1 flag           │
│  Hints used: 2                                      │
│                                                     │
│  [✓] Add to Lab History                             │
│  [✓] Update Streak                                  │
│  [✓] Generate Writeup                               │
│                                                     │
│              [Cancel]  [Complete Session]           │
└─────────────────────────────────────────────────────┘
```

**Writeup Generator:**
Opens after session complete. Pre-fills a Markdown document:

```markdown
# Pickle Rick — TryHackMe Writeup
**Date:** 2026-06-03
**Platform:** THM
**Difficulty:** Easy
**Duration:** 1h 23m 47s
**Flags:** 1
**Hints Used:** 2

## Target
- IP: 10.10.3.164
- OS: Linux

## Enumeration
[User fills in]

## Exploitation
[User fills in]

## Flags
- User flag: THM{Mr.Meeseeks_1c3y}

## Notes
[Session notes content]
```

- Full Markdown editor
- "Save to Vault" button: saves to `CyberLab/Completed/[session-name].md` in Obsidian vault
- "Open in GhostVault" button: launches GhostVault with the new note open

---

### Screen 8: Lab History

Listed in sidebar secondary nav. Shows all past sessions.

**Table columns:** Name, Platform, Date, Duration, Flags, Hints, Status (Completed/Abandoned)
- Sortable
- Click row: expand to show session summary (findings count, notes excerpt)
- "View writeup" button if writeup was generated
- Stats at top: total sessions, total duration, average session length

---

### Screen 9: Settings

**AI Provider:**
- Provider: Claude / Ollama
- If Claude: API key input (masked), model selector (Haiku/Sonnet/Opus)
- If Ollama: base URL, model selector (fetched from Ollama API)
- "Test connection" button

**Session:**
- Default platform for new sessions
- Default timer mode
- Auto-save interval (30s / 60s / 5m)
- Auto-link ReconDesk target on new session

**Integrations:**
- Obsidian vault path for writeup saves
- ReconDesk auto-sync (toggle)

---

## ZUSTAND STORES

### `useSessionStore`
```typescript
interface SessionState {
  sessions: LabSession[];
  activeSessionId: string | null;
  activeTab: 'chat' | 'findings' | 'history' | 'settings';
  
  // AI
  aiProvider: 'claude' | 'ollama';
  aiModel: string;
  isAiLoading: boolean;
  
  // Ecosystem
  ecosystemContext: SharedContext | null;
  
  // UI panels
  commandBuilderOpen: boolean;
  flagLoggerOpen: boolean;
  notesExpanded: boolean;
  
  // Actions
  createSession: (data: NewSessionData) => void;
  setActiveSession: (id: string) => void;
  closeSession: (id: string) => void;
  completeSession: (id: string) => Promise<void>;
  
  updateTimer: (sessionId: string, elapsed: number) => void;
  toggleTimer: (sessionId: string) => void;
  
  sendMessage: (sessionId: string, content: string) => Promise<void>;
  
  addFinding: (sessionId: string, finding: Omit<Finding, 'id' | 'timestamp'>) => void;
  sendFindingToReconDesk: (finding: Finding) => Promise<void>;
  
  logFlag: (sessionId: string, flag: Omit<FlagEntry, 'id' | 'foundAt'>) => void;
  logHint: (sessionId: string, content: string) => void;
  
  generateWriteup: (sessionId: string) => string;
  saveWriteupToVault: (sessionId: string, content: string) => Promise<void>;
  
  writeSharedContext: (sessionId: string) => Promise<void>;
  emitEvent: (event: string, data?: Record<string, unknown>) => Promise<void>;
}
```

---

## IPC HANDLERS (main process)

```typescript
ipcMain.handle('cyberlab:config:read', async () => { /* read cybertools-config.json */ })
ipcMain.handle('cyberlab:config:write', async (_, patch) => { /* atomic write to config */ })
ipcMain.handle('cyberlab:event:emit', async (_, event) => { /* append to ecosystem-events.json */ })
ipcMain.handle('cyberlab:sessions:read', async () => { /* read session data from app data */ })
ipcMain.handle('cyberlab:sessions:write', async (_, sessions) => { /* write session data */ })
ipcMain.handle('cyberlab:screenshot:capture', async () => { /* capture screen via desktopCapturer */ })
ipcMain.handle('cyberlab:vault:write', async (_, path, content) => { /* write to Obsidian vault */ })
ipcMain.handle('cyberlab:ai:claude', async (_, messages, model) => { /* call Anthropic API */ })
ipcMain.handle('cyberlab:ai:ollama', async (_, messages, model, baseUrl) => { /* call Ollama API */ })
ipcMain.handle('cyberlab:recondesk:push-port', async (_, targetName, port) => { /* write to config */ })
ipcMain.handle('cyberlab:recondesk:push-cred', async (_, targetName, cred) => { /* write to config */ })
```

---

## COMPONENT ARCHITECTURE

```
src/
├── renderer/
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx           # AI provider selector here
│   │   │   ├── TabBar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── session/
│   │   │   ├── SessionPanel.tsx       # Left panel
│   │   │   ├── TimerCard.tsx
│   │   │   ├── FindingsPanel.tsx
│   │   │   ├── SessionMeta.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx          # Right panel
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ParsedPortChips.tsx
│   │   │   └── ParsedCredChips.tsx
│   │   ├── commands/
│   │   │   ├── CommandBuilder.tsx
│   │   │   ├── CommandCard.tsx
│   │   │   └── commandTemplates.ts
│   │   ├── findings/
│   │   │   └── FindingsTable.tsx
│   │   ├── flags/
│   │   │   └── FlagLogger.tsx
│   │   ├── history/
│   │   │   └── LabHistory.tsx
│   │   ├── writeup/
│   │   │   ├── SessionCompleteModal.tsx
│   │   │   └── WriteupEditor.tsx
│   │   └── modals/
│   │       └── NewSessionModal.tsx
│   ├── stores/
│   │   └── useSessionStore.ts
│   ├── hooks/
│   │   ├── useTimer.ts
│   │   └── useAiParser.ts             # parses AI responses for ports/creds
│   └── types/
│       └── session.ts
```

---

## ANIMATIONS

- **Tab switch:** fade content 150ms
- **New tab open:** tab slides in from right
- **Timer:** no animation on tick — pure `tabular-nums` update
- **Countdown red alert (< 5 min):** red pulse on timer card border
- **New chat message:** slide up from bottom (user message), fade in (AI message)
- **AI loading:** animated "..." dots
- **Findings added:** item slides into the findings list
- **Session complete modal:** scale + fade in (modalVariants from Design Bible)
- **Command builder panel:** slide in from right (300px, 250ms)

---

## CRITICAL REQUIREMENTS

1. Timer must persist across app restarts — save `elapsedSeconds` and `timerRunning` state every 5 seconds
2. Auto-save sessions every 60 seconds — never lose session data
3. AI parsing of ports and credentials must use regex, not assume AI formats responses consistently
4. Writing `shared_context.activeLab` must be atomic and immediate — not batched
5. Claude API key must never appear in renderer process — all API calls go through main process IPC
6. Multiple tabs must maintain completely independent chat histories and timer states
7. Screenshot capture must work without requiring additional permissions if already granted via `desktopCapturer`
8. The command builder must remain usable while a chat is in progress

---

## DELIVERABLES

1. All component files
2. Zustand store: `useSessionStore.ts`
3. Hooks: `useTimer.ts`, `useAiParser.ts`
4. IPC handlers: `main/ipc/cyberlab.ts`
5. Command templates data file
6. Type definitions
7. `IMPLEMENTATION_PLAN.md` for CyberLab Companion

---

*Read CYBEROS_DESIGN_BIBLE.md first.*
