# MANUS PROMPT — PlaybookStudio
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Read `CYBEROS_DESIGN_BIBLE.md` first. All design decisions must conform to it.

---

## YOUR ROLE

Produce production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code for PlaybookStudio. No placeholders. No pseudo-code. Directly implementable in Electron.

---

## CONTEXT: WHAT IS PLAYBOOKSTUDIO?

PlaybookStudio is the **methodology playbook builder and runner**. It turns the operator's security testing methodologies into structured, interactive checklists that can be run during a live engagement.

A playbook is a set of steps. Each step has: title, description, commands, category, and a "required" flag. During a **Run**, the operator works through each step, marking them todo/inprogress/done/skipped, adding notes per step. Progress is tracked. When the run completes, it's recorded in history.

The 4 built-in playbooks cannot be deleted (only cloned and modified). Users can create unlimited custom playbooks.

**Accent color:** `#4a9eff` (Blue)

---

## DATA MODEL

```typescript
interface Playbook {
  id: string;
  name: string;
  description: string;
  category: 'web-app' | 'linux-privesc' | 'active-directory' | 'network' | 'custom';
  tags: string[];
  steps: PlaybookStep[];
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlaybookStep {
  id: string;
  title: string;
  description: string;
  category: string;
  commands: string[];          // One command per array entry
  notes: string;               // Default notes/guidance for this step
  isRequired: boolean;
  order: number;
}

interface PlaybookRun {
  id: string;
  playbookId: string;
  playbookName: string;
  targetName: string;
  targetIP: string;
  labName: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'abandoned';
  stepResults: StepResult[];
}

interface StepResult {
  stepId: string;
  status: 'todo' | 'inprogress' | 'done' | 'skipped';
  notes: string;           // Operator notes for this step during the run
  startedAt?: string;
  completedAt?: string;
}
```

---

## BUILT-IN PLAYBOOKS

### 1. Web Application Assessment (10 steps)
1. Passive Recon — OSINT, Google dorking, Shodan
2. Active Recon — nmap web ports, tech fingerprinting
3. Directory Enumeration — gobuster, feroxbuster
4. Tech Fingerprinting — Wappalyzer, headers, cookies
5. Authentication Testing — brute force, bypass, MFA
6. Input Validation — XSS, SQLi, SSTI, command injection
7. Business Logic — workflow bypasses, privilege testing
8. File Upload Testing — bypass restrictions, webshells
9. API Discovery — /api/, Swagger, GraphQL introspection
10. Report — document findings, CVSS scoring

### 2. Linux Privilege Escalation (10 steps)
1. Initial Enumeration — whoami, id, sudo -l, hostname
2. SUID/GUID Binaries — find with SUID bit, GTFOBins check
3. Sudo Permissions — sudo -l, misconfigurations
4. Cron Jobs — /etc/cron*, crontab -l, writable scripts
5. Writable PATH — check PATH, writable directories
6. Kernel Exploit Check — uname -r, searchsploit
7. Running Services — ps aux, check for vulnerable versions
8. Network Connections — netstat -tulnp, internal services
9. Sensitive Files — /etc/passwd, /etc/shadow, SSH keys, .bash_history
10. Password Reuse — test found creds across services

### 3. Active Directory Initial Access (10 steps)
1. Network Enumeration — discover DC, domain name, subnets
2. SMB Null Sessions — smbclient, enum4linux
3. Kerberoasting — GetUserSPNs.py, hash cracking
4. Password Spray — CrackMapExec, lockout policy first
5. AS-REP Roasting — GetNPUsers.py for pre-auth disabled
6. LLMNR Poisoning — Responder setup and capture
7. BloodHound — SharpHound collection, graph analysis
8. DCSync — secretsdump, replication rights check
9. Pass the Hash/Ticket — PTH, PTT techniques
10. Report — domain compromise path documentation

### 4. Network Recon (8 steps)
1. Host Discovery — ping sweep, ARP scan
2. Top 1000 Ports — nmap default scan
3. Full Port Scan — nmap -p- all ports
4. Service Versions — nmap -sV
5. OS Fingerprinting — nmap -O
6. Vulnerability Scan — nmap --script vuln
7. Web Screenshots — gowitness or eyewitness
8. Report — findings documentation

---

## SCREENS TO BUILD

### Screen 1: Playbook Library (Default)

Grid of all playbooks with category filter.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  TitleBar: [●●●] 📋 PlaybookStudio             [+ New Playbook] │
├─────────────────────────────────────────────────────────────────┤
│  SIDEBAR          │  LIBRARY                                    │
│                   │                                             │
│  📚 Library       │  [All] [Web App] [Linux] [AD] [Network]    │
│  ▶ Active Run     │  [Custom]                                   │
│  📜 History       │                                             │
│  ⚙ Settings      │  ┌──────────────┐ ┌──────────────┐         │
│                   │  │ 🌐 Web App   │ │ 🐧 Linux     │         │
│  ─────────────    │  │ Assessment   │ │ PrivEsc      │         │
│  ACTIVE SESSION   │  │ 10 steps     │ │ 10 steps     │         │
│  🔴 Pickle Rick   │  │ Built-in     │ │ Built-in     │         │
│  10.10.3.164      │  │[▶ Run][Clone]│ │[▶ Run][Clone]│         │
│                   │  └──────────────┘ └──────────────┘         │
│                   │                                             │
│                   │  ┌──────────────┐ ┌──────────────┐         │
│                   │  │ 🏢 Active    │ │ 🌐 Network   │         │
│                   │  │ Directory    │ │ Recon        │         │
│                   │  │ 10 steps     │ │ 8 steps      │         │
│                   │  │ Built-in     │ │ Built-in     │         │
│                   │  │[▶ Run][Clone]│ │[▶ Run][Clone]│         │
│                   │  └──────────────┘ └──────────────┘         │
└───────────────────┴─────────────────────────────────────────────┘
│  PlaybookStudio • 4 built-in • 0 custom • No active run         │
└──────────────────────────────────────────────────────────────────┘
```

**Playbook card:**
```
┌──────────────────────────┐
│  [Category icon]         │
│                          │
│  Playbook Name           │
│  [N] steps               │
│  Built-in / Custom       │
│  Tags: [web] [app]       │
│                          │
│  [▶ Run]  [Edit/Clone]  │
└──────────────────────────┘
Width: ~240px
```

- Built-in cards: edit button is "Clone" (creates a copy)
- Custom cards: edit button is "Edit" (opens editor)
- Custom cards also have a delete button (with confirmation)
- Category filter chips at top: filter by category

---

### Screen 2: Run Mode (When a playbook is running)

The "Active Run" screen. This is where the operator works during a live engagement.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  [●●●] ▶ PlaybookStudio — Web Application Assessment    [⏹ End] │
├─────────────────────────────────────────────────────────────────┤
│  SESSION CONTEXT BAR                                             │
│  🔴 Lab: Pickle Rick  ·  Target: 10.10.3.164                   │
│  Started: 14:23 UTC  ·  Elapsed: 00:42:15                      │
├──────────────────────────────────────────────────────────────────┤
│  PROGRESS                                                        │
│  [███████░░░░░░░░░░░░] 3 of 10 steps complete (30%)             │
├─────────────────────┬────────────────────────────────────────────┤
│  STEP LIST (280px)  │  STEP DETAIL                               │
│                     │                                            │
│  ✓ 1. Passive Recon │  3. Directory Enumeration                  │
│  ✓ 2. Active Recon  │  ────────────────────────────────          │
│  ▶ 3. Dir Enum      │  Enumerate hidden directories and files.   │
│  ○ 4. Tech Print    │  Check for backup files, admin panels,     │
│  ○ 5. Auth Test     │  and exposed sensitive paths.              │
│  ○ 6. Input Valid   │                                            │
│  ○ 7. Biz Logic     │  COMMANDS                                  │
│  ○ 8. File Upload   │  ┌────────────────────────────────────┐   │
│  ○ 9. API Disco     │  │ gobuster dir -u http://10.10.3.164  │   │
│  ○ 10. Report       │  │  -w /usr/share/wordlists/dirbuster/ │   │
│                     │  │  -x php,html,txt               [📋] │   │
│                     │  └────────────────────────────────────┘   │
│                     │  ┌────────────────────────────────────┐   │
│                     │  │ feroxbuster -u http://10.10.3.164  │   │
│                     │  │  --wordlist /opt/wordlists/big.txt [📋]│
│                     │  └────────────────────────────────────┘   │
│                     │                                            │
│                     │  NOTES FOR THIS STEP                       │
│                     │  [Textarea — operator adds findings here]  │
│                     │                                            │
│                     │  [○ Todo] [▶ In Progress] [✓ Done] [↷ Skip]│
└─────────────────────┴────────────────────────────────────────────┘
```

**Session context bar:**
- Only shown when `shared_context.activeLab` is set
- Shows lab name, target IP, elapsed time
- Accent-tinted background

**Progress bar:**
- Width: done steps / total steps
- Shows "N of N steps complete (X%)"
- Required steps shown in different weight — skipping a required step shows a warning

**Step list (left, 280px):**
- Each step: status icon + step number + title
- Icons: ✓ done (green), ▶ inprogress (blue pulse), ○ todo (grey), ↷ skipped (muted strikethrough), ! blocked (red)
- Click step: loads it in the detail panel
- Active step highlighted with accent left border

**Step detail (right):**
- Step title and description
- Commands: each in a code block with a [Copy] button
  - Commands auto-filled: `[TARGET_IP]` → session target IP, `[TARGET_URL]` → http://[ip]
- Notes textarea: operator adds their findings for this specific step
- Status buttons at bottom: cycle through todo → inprogress → done → skip

**End Run button:**
- Opens a "Complete Run" confirmation modal
- Shows summary: steps done/skipped/todo, duration
- "Mark as Complete" → saves run to history, updates shared context

---

### Screen 3: Playbook Editor

For creating/editing custom playbooks (or editing a clone of a built-in).

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  ← Library    Edit: Web Application Assessment (Clone)   │
├──────────────────────────────────────────────────────────┤
│  Name: [Web Application Assessment (Custom)]              │
│  Description: [...]                                      │
│  Category: [Web App ▾]    Tags: [web] [app] [+ add]     │
├──────────────────────────────────────────────────────────┤
│  STEPS                                 [+ Add Step]      │
│  ─────────────────────────────────────────────────────  │
│  ≡ 1. Passive Recon         [Edit] [↕] [Duplicate] [✗]  │
│  ≡ 2. Active Recon          [Edit] [↕] [Duplicate] [✗]  │
│  ≡ 3. Directory Enum        [Edit] [↕] [Duplicate] [✗]  │
│  [...]                                                   │
├──────────────────────────────────────────────────────────┤
│  STEP EDITOR (expands inline when Edit clicked)          │
│  Title: [Directory Enumeration]                          │
│  Description: [textarea]                                 │
│  Category: [enum ▾]                                     │
│  Commands: (one per line)                               │
│  [gobuster dir -u http://[TARGET_IP] -w ...]            │
│  [feroxbuster -u http://[TARGET_IP] --wordlist ...]     │
│  [+ Add command]                                         │
│  Default Notes: [textarea]                               │
│  Required: [●] Yes                                       │
│                              [Cancel] [Save Step]        │
└──────────────────────────────────────────────────────────┘
```

**Step reordering:**
- Drag handle (≡) on the left of each step row
- Framer Motion `Reorder` component for drag-to-reorder
- Step numbers update automatically on reorder

**Add Step:**
- Appends a new empty step at the bottom
- Immediately expands the step editor for the new step

---

### Screen 4: Run History

All completed and abandoned runs.

**Table:**
| Playbook | Target | Started | Duration | Done | Skipped | Status |
|---|---|---|---|---|---|---|
| Web App Assessment | Pickle Rick | 2026-06-03 | 1h 23m | 8/10 | 2 | Completed |
| Linux PrivEsc | Blue Machine | 2026-06-02 | 45m | 10/10 | 0 | Completed |

- Click row: expand to show per-step results (status + notes)
- "Resume" button for abandoned runs (restores run state)
- Sort by date, playbook, target

---

### Screen 5: Settings

**Playbooks:**
- Storage path display (where `playbooks.json` and `runs.json` live)
- "Export all playbooks" (JSON backup)
- "Import playbooks" (restore from JSON)

**Integration:**
- Auto-read session context from shared_context (toggle, default on)
- Write `shared_context.activePlaybook` on run start (toggle, default on)
- Write playbook events to ecosystem-events.json (toggle, default on)

---

## ZUSTAND STORE

```typescript
interface PlaybookState {
  playbooks: Playbook[];
  runs: PlaybookRun[];
  activeRunId: string | null;
  activeView: 'library' | 'run' | 'editor' | 'history' | 'settings';
  
  editingPlaybookId: string | null;
  categoryFilter: string;
  
  ecosystemContext: SharedContext | null;
  
  // Actions
  loadPlaybooks: () => Promise<void>;
  loadRuns: () => Promise<void>;
  
  createPlaybook: (data: Omit<Playbook, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>) => void;
  updatePlaybook: (id: string, patch: Partial<Playbook>) => void;
  clonePlaybook: (id: string) => string;   // returns new playbook ID
  deletePlaybook: (id: string) => void;
  
  startRun: (playbookId: string) => Promise<void>;
  updateStepResult: (runId: string, stepId: string, patch: Partial<StepResult>) => void;
  completeRun: (runId: string) => Promise<void>;
  abandonRun: (runId: string) => void;
  resumeRun: (runId: string) => void;
  
  setActiveView: (view: PlaybookState['activeView']) => void;
  setEditingPlaybook: (id: string | null) => void;
  setCategoryFilter: (category: string) => void;
  
  loadEcosystemContext: () => Promise<void>;
  writeSharedContext: (playbookName: string | null) => Promise<void>;
  emitEvent: (event: string, data?: unknown) => Promise<void>;
}
```

---

## IPC HANDLERS

```typescript
ipcMain.handle('playbookstudio:playbooks:read', async () => { /* read playbooks.json */ })
ipcMain.handle('playbookstudio:playbooks:write', async (_, playbooks) => { /* write playbooks.json */ })
ipcMain.handle('playbookstudio:runs:read', async () => { /* read runs.json */ })
ipcMain.handle('playbookstudio:runs:write', async (_, runs) => { /* write runs.json */ })
ipcMain.handle('playbookstudio:config:read', async () => { /* read shared_context from cybertools-config.json */ })
ipcMain.handle('playbookstudio:config:write', async (_, patch) => { /* write shared_context.activePlaybook + status */ })
ipcMain.handle('playbookstudio:event:emit', async (_, event) => { /* append to ecosystem-events.json */ })
```

---

## COMPONENT ARCHITECTURE

```
src/
├── renderer/
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── library/
│   │   │   ├── PlaybookLibrary.tsx
│   │   │   ├── PlaybookCard.tsx
│   │   │   └── CategoryFilter.tsx
│   │   ├── run/
│   │   │   ├── RunView.tsx
│   │   │   ├── SessionContextBar.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── StepList.tsx
│   │   │   ├── StepListItem.tsx
│   │   │   ├── StepDetail.tsx
│   │   │   ├── CommandBlock.tsx
│   │   │   └── CompleteRunModal.tsx
│   │   ├── editor/
│   │   │   ├── PlaybookEditor.tsx
│   │   │   ├── StepRow.tsx
│   │   │   └── StepEditor.tsx
│   │   └── history/
│   │       └── RunHistory.tsx
│   ├── stores/
│   │   └── usePlaybookStore.ts
│   ├── data/
│   │   └── builtInPlaybooks.ts    # The 4 built-in playbook definitions
│   └── types/
│       └── playbook.ts
```

---

## ANIMATIONS

- **Library cards:** stagger on page load
- **Category filter switch:** fade list out, fade in filtered list
- **Run view — step selection:** step detail slides in/fades in
- **Step status cycle:** brief color flash on status change
- **Progress bar:** smooth width animation on step completion
- **Step list — completion:** done steps get a checkmark that scales in
- **Run complete modal:** scale + fade in

---

## CRITICAL REQUIREMENTS

1. Built-in playbooks must be loaded from a bundled `builtInPlaybooks.ts` file — never from a writable JSON file (they cannot be deleted or modified, only cloned)
2. The "Clone" action must deep-copy all steps with new IDs
3. Run state must auto-save every 30 seconds — never lose mid-engagement progress
4. Command auto-fill (`[TARGET_IP]`) must work from the run's session context, not just the global shared_context
5. Required steps that are skipped must show a warning, not a hard block — operator must be able to skip any step
6. When `startRun` is called, write `shared_context.activePlaybook` immediately and emit `playbook:started` event
7. Drag-to-reorder in the editor must update `order` field on all steps

---

## DELIVERABLES

1. All component files
2. Zustand store
3. Built-in playbooks data file
4. IPC handlers
5. Type definitions
6. `IMPLEMENTATION_PLAN.md` for PlaybookStudio

---

*Read CYBEROS_DESIGN_BIBLE.md first.*
