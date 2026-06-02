# MANUS PROMPT — ReconDesk
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Read `CYBEROS_DESIGN_BIBLE.md` first. Every color, spacing, component pattern, and animation standard is defined there. Do not deviate.

---

## YOUR ROLE

Produce production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code for ReconDesk. Output must be directly implementable into the existing Electron app. No placeholders. No pseudo-code.

---

## CONTEXT: WHAT IS RECONDESK?

ReconDesk is the **intelligence gathering and target tracking layer** of CyberOS. It is the structured record of everything the operator discovers during a penetration test or lab session. It owns:

- **Targets** — machines, domains, or scopes being investigated
- **Ports & services** — discovered open ports with service/version data
- **Credentials** — usernames, passwords, hashes found during enumeration
- **Attack cards** — Kanban-style cards tracking progress through the attack lifecycle
- **Timeline** — chronological history of all activity on a target
- **Data export** — JSON and Markdown export of complete target data

ReconDesk is used constantly during an active engagement. Every finding — every open port, every credential, every exploited service — gets logged here. It is the source of truth for the current engagement.

**Accent color:** `#d29922` (Amber)

---

## OPERATOR WORKFLOWS

### Workflow 1: Starting a new lab (HTB/THM)
1. Open ReconDesk
2. Click "New Target"
3. Enter target name (e.g., "Pickle Rick"), IP (e.g., `10.10.3.164`), platform (THM), OS (Linux/Unknown)
4. Target created → appears in sidebar
5. ReconDesk writes `shared_context.activeTarget` and `shared_context.activeIP` to config
6. Other apps (CyberLab, TerminalLink, SignalBoard) pick up the new context

### Workflow 2: Logging nmap results
1. Run nmap in TerminalLink
2. Copy nmap XML output
3. In ReconDesk → target → Ports tab → "Import nmap XML"
4. Paste XML → ports auto-populate
5. Each port appears as a row in the ports table

### Workflow 3: Tracking attack progress
1. In the Attack Board tab, create cards for each attack vector
2. Drag cards through stages: Recon → Enum → Exploit → Post → PrivEsc → Loot
3. For each card: add description, link to specific ports/creds that made it possible
4. When a card reaches "Done", it's a documented win

### Workflow 4: Logging credentials
1. Find a credential during enumeration
2. ReconDesk → target → Credentials tab → "Add Credential"
3. Enter: username, password/hash, service, port, source notes
4. Credential saved → CredVault can import it

### Workflow 5: Exporting a target
1. Finished engagement
2. ReconDesk → target → "Export" button
3. Choose JSON (full structured data) or Markdown (tables of ports, creds, attack cards)
4. Save via system dialog
5. ReportForge can use the Markdown export

---

## DATA MODEL

```typescript
interface Target {
  id: string;                      // UUID
  name: string;                    // "Pickle Rick", "10.10.3.164", "client-webapp"
  ip: string;                      // Primary IP
  additionalIPs?: string[];        // Multiple IPs for multi-host targets
  platform: 'HTB' | 'THM' | 'CTF' | 'Client' | 'Internal';
  os: string;                      // "Linux", "Windows", "Unknown"
  tags: string[];                  // ["web", "linux", "easy"]
  status: 'active' | 'completed' | 'abandoned' | 'paused';
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  notes: string;                   // Free-text markdown notes
  createdAt: string;               // ISO timestamp
  completedAt?: string;
  ports: Port[];
  credentials: Credential[];
  attackCards: AttackCard[];
  timeline: TimelineEntry[];
}

interface Port {
  id: string;
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'filtered' | 'closed';
  service: string;                 // "http", "ssh", "smb"
  version: string;                 // "Apache httpd 2.4.18"
  notes: string;
  addedAt: string;
  source: 'manual' | 'nmap-import';
}

interface Credential {
  id: string;
  username: string;
  password?: string;
  hash?: string;
  hashType?: 'NTLM' | 'MD5' | 'SHA1' | 'bcrypt' | 'other';
  service: string;
  port?: number;
  notes: string;
  source: string;                  // "Metasploit hashdump", "gobuster", "manual"
  verified: boolean;
  addedAt: string;
}

interface AttackCard {
  id: string;
  title: string;
  description: string;
  stage: 'recon' | 'enum' | 'exploit' | 'post' | 'privesc' | 'loot';
  status: 'todo' | 'inprogress' | 'done' | 'blocked';
  linkedPortIds: string[];          // Ports that contributed to this card
  linkedCredentialIds: string[];    // Creds discovered via this card
  notes: string;
  createdAt: string;
  completedAt?: string;
}

interface TimelineEntry {
  id: string;
  timestamp: string;
  type: 'card_created' | 'card_moved' | 'card_completed' | 'port_added' | 'credential_added' | 'status_changed' | 'note_added';
  description: string;
  data?: Record<string, unknown>;
}
```

---

## SCREENS TO BUILD

### Screen 1: Target List (Home / Sidebar)

The sidebar shows the list of all targets. This is always visible on the left.

**Sidebar structure:**
```
⬡ ReconDesk
──────────────────
🎯 Active Lab Context
   Pickle Rick — 10.10.3.164
──────────────────
[+ New Target]

TARGETS (3)
● Pickle Rick           THM
  10.10.3.164          Active
  
○ Blue Machine          THM
  10.10.10.40         Completed
  
○ Client WebApp         Client
  192.168.1.100       Abandoned

──────────────────
⚙ Settings
```

**Target list item:**
- Status dot (colored by status: green=active, blue=completed, grey=abandoned, amber=paused)
- Target name (bold if active)
- IP in monospace
- Platform badge (HTB=red, THM=green, CTF=purple, Client=blue)
- Hover: amber left border
- Click: loads target detail

**"New Target" button:**
- Opens a modal (not a new page)
- Fields: Name, IP, Platform (select), OS (select), Difficulty (select), Tags (comma-separated), Initial notes

---

### Screen 2: Target Detail — Overview Tab

The main content area when a target is selected. Use tabs for sub-sections.

**Tab bar:**
```
Overview    Ports    Credentials    Attack Board    Timeline    Export
────────    ─────    ───────────    ────────────    ────────    ──────
████████
```

**Overview tab layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [●] Pickle Rick                        [Edit] [Export] │
│  10.10.3.164 • THM • Linux • Easy • Active              │
│  Tags: [web] [linux] [easy]                             │
├─────────────┬───────────────────┬───────────────────────┤
│  QUICK STATS│  ATTACK PROGRESS  │  LINKED CONTEXT       │
│             │                   │                       │
│  Ports: 5   │  [Progress bar]   │  Lab: Pickle Rick     │
│  Creds: 2   │  2/8 cards done   │  Playbook: Web App    │
│  Cards: 8   │                   │  Notes: 3 saved       │
│  Notes: —   │  [Stage counts]   │                       │
├─────────────┴───────────────────┴───────────────────────┤
│  NOTES (Markdown editor)                                │
│  [Markdown textarea — full width, auto-grow]            │
│  Live preview toggle →                                  │
└─────────────────────────────────────────────────────────┘
```

**Quick stats:** metric cards for port count, credential count, attack card count, session count

**Attack progress bar:**
- 8-segment horizontal bar (one per stage: recon/enum/exploit/post/privesc/loot + blocked + total)
- Colored: done=green, inprogress=amber, blocked=red, todo=grey
- Shows "2 of 8 cards completed"

**Linked context panel:**
- Shows the CyberLab session linked to this target
- Shows the active PlaybookStudio playbook if `activePlaybook` is set for this target's context
- "Open in CyberLab" shortcut button

**Notes section:**
- Full-width Markdown editor
- Auto-save every 30 seconds
- Toggle between edit mode and preview mode
- Saved to the target's `notes` field

---

### Screen 3: Ports Tab

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  PORTS (5 open)               [Import nmap XML] [+ Add]  │
├──────────────────────────────────────────────────────────┤
│  Port   Protocol  Service         Version          State │
│  ──────────────────────────────────────────────────────  │
│   22    tcp       ssh             OpenSSH 7.2      open  │
│   80    tcp       http            Apache 2.4.18    open  │
│  443    tcp       https           Apache 2.4.18    open  │
│ 8080    tcp       http-alt        —                open  │
│  445    tcp       microsoft-ds    —                open  │
└──────────────────────────────────────────────────────────┘
```

**Port table:**
- Port and protocol in monospace, bold
- Service name in `text-primary`
- Version in `text-secondary`
- State badge: open=green, filtered=amber, closed=grey
- Row hover: show edit (pencil) and delete (trash) icon buttons on right
- Click row: expand inline to show notes textarea
- Sort by port number (default), service, state

**Import nmap XML:**
- Click opens a modal with a `<textarea>` for pasting XML
- On paste/confirm: parse XML, show preview count ("Found 5 open ports")
- "Import [N] Ports" button — adds all to the ports table, skips duplicates
- Handle malformed XML gracefully (show error "Could not parse XML — ensure you're pasting nmap XML output with `-oX` flag")

**Add port manually:**
- Inline form below the table header or in a modal
- Fields: Port, Protocol (select), Service, Version, State (select), Notes

---

### Screen 4: Credentials Tab

```
┌────────────────────────────────────────────────────────────┐
│  CREDENTIALS (2)                           [Export] [+ Add] │
├────────────────────────────────────────────────────────────┤
│  Username     Password/Hash    Service   Port  Verified    │
│  ──────────────────────────────────────────────────────    │
│  R1ckRul3s    ********         http      80    ✓           │
│  rabbit       [NTLM hash]      smb       445   ○           │
└────────────────────────────────────────────────────────────┘
```

**Credential table:**
- Username in monospace
- Password: masked by default — hover/click to reveal
- Hash: truncated to 32 chars, hover to show full hash in tooltip
- Hash type badge: NTLM=red, MD5=amber, SHA1=blue
- Service + port in monospace
- Verified: checkmark if verified, empty circle if not
- Row hover: reveal/copy password, edit, delete buttons
- "Copy" button on username and password

**Add credential modal:**
- Fields: Username, Password (optional), Hash (optional), Hash Type (if hash), Service, Port, Source/Notes, Verified toggle

**Export credentials:**
- Export as CSV or JSON (no passwords in markdown export for security)

---

### Screen 5: Attack Board Tab

Kanban board with 6 stages.

**Stages (left to right):**
```
Recon → Enum → Exploit → Post → PrivEsc → Loot
```

**Layout:**
```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ RECON   │ ENUM    │ EXPLOIT │ POST    │ PRIVESC │ LOOT    │
│ (2)     │ (3)     │ (1)     │ (1)     │ (0)     │ (0)     │
│         │         │         │         │         │         │
│ ┌─────┐ │ ┌─────┐ │ ┌─────┐ │         │         │         │
│ │Card │ │ │Card │ │ │Card │ │         │         │         │
│ └─────┘ │ └─────┘ │ └─────┘ │         │         │         │
│         │         │         │         │         │         │
│ ┌─────┐ │ ┌─────┐ │         │         │         │         │
│ │Card │ │ │Card │ │         │         │         │         │
│ └─────┘ │ └─────┘ │         │         │         │         │
│         │         │         │         │         │         │
│ [+ Add] │ [+ Add] │ [+ Add] │ [+ Add] │ [+ Add] │ [+ Add] │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

**Attack card:**
```
┌─────────────────────────┐
│ [●] Title               │  ← status dot
│                         │
│ Short description...    │
│                         │
│ [port:80] [port:445]    │  ← linked port chips
│ [cred:R1ck]             │  ← linked cred chips
│                         │
│ [todo] → move stage ▾   │  ← status selector + stage mover
└─────────────────────────┘
Width: 200px, variable height
```

**Card status colors:**
- todo: `text-secondary` dot
- inprogress: `warning` dot
- done: `success` dot + subtle green tint
- blocked: `danger` dot + subtle red tint

**Card click → expand modal:**
- Full title (editable)
- Full description (markdown textarea)
- Status selector (todo/inprogress/done/blocked)
- Stage selector
- Link ports: multi-select dropdown of this target's ports
- Link credentials: multi-select dropdown
- Notes (additional textarea)
- Created at, completed at timestamps

**Drag to reorder** within a column. Moving between columns via the stage selector in the card (not drag-and-drop between columns — that's complex and error-prone).

---

### Screen 6: Timeline Tab

Chronological history of all activity on this target.

```
┌──────────────────────────────────────────────────────────┐
│  TIMELINE — Pickle Rick                    [Filter ▾]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ● 2026-06-03 14:23  Port 80 added (Apache 2.4.18)      │
│  ● 2026-06-03 14:25  Port 22 added (OpenSSH 7.2)        │
│  ● 2026-06-03 14:30  Attack card created: "Dir enum"     │
│  ● 2026-06-03 14:45  Credential added: R1ckRul3s/http    │
│  ● 2026-06-03 15:01  Card "Dir enum" moved to Done       │
│  ● 2026-06-03 15:10  Target marked Active                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Timeline entries:**
- Dot color: port=blue, credential=red, card_created=amber, card_moved=green, status=purple
- Timestamp: `text-xs text-muted monospace`
- Description: `text-sm text-primary`
- Filter by type (checkboxes): ports / credentials / cards / notes / status changes

---

### Screen 7: Export Modal

Opens from the "Export" button in the target header.

**Options:**

**JSON Export:**
- Exports full `Target` object as JSON
- Includes all ports, credentials, attack cards, timeline
- File name: `[target-name]-[date].json`

**Markdown Export:**
- Generates a structured report:
  ```markdown
  # Target: Pickle Rick
  **IP:** 10.10.3.164 | **Platform:** THM | **OS:** Linux
  
  ## Open Ports
  | Port | Protocol | Service | Version |
  |------|----------|---------|---------|
  | 22   | tcp      | ssh     | OpenSSH 7.2 |
  
  ## Credentials
  | Username | Service | Port | Verified |
  
  ## Attack Cards
  ### Done
  - Dir enum — Port 80, Credential: R1ckRul3s
  
  ## Notes
  [target notes]
  ```
- Note: passwords/hashes NOT included in Markdown export

**Send to ReportForge:**
- Button: "Open in ReportForge" — writes target data to a temp file and signals ReportForge via IPC to import it

---

### Screen 8: Settings

**General:**
- Default platform for new targets (select)
- Auto-write shared_context on target select (toggle, default: on)
- Auto-create timeline entries (toggle, default: on)

**Ecosystem:**
- Show active lab context in header (toggle)
- Port config path display

---

## ZUSTAND STORE

```typescript
interface RecondeskState {
  targets: Target[];
  activeTargetId: string | null;
  activeTab: 'overview' | 'ports' | 'credentials' | 'board' | 'timeline' | 'export';
  
  ecosystemContext: {
    activeLab: string | null;
    activePlaybook: string | null;
  };
  
  // Modal states
  isNewTargetModalOpen: boolean;
  isImportXmlModalOpen: boolean;
  isAddPortModalOpen: boolean;
  isAddCredentialModalOpen: boolean;
  isAddCardModalOpen: boolean;
  expandedCardId: string | null;
  
  // Actions
  loadTargets: () => Promise<void>;
  saveTargets: () => Promise<void>;
  addTarget: (target: Omit<Target, 'id' | 'createdAt' | 'ports' | 'credentials' | 'attackCards' | 'timeline'>) => void;
  setActiveTarget: (id: string) => void;
  updateTarget: (id: string, patch: Partial<Target>) => void;
  deleteTarget: (id: string) => void;
  
  addPort: (targetId: string, port: Omit<Port, 'id' | 'addedAt'>) => void;
  importPortsFromNmap: (targetId: string, xml: string) => { imported: number; errors: string[] };
  updatePort: (targetId: string, portId: string, patch: Partial<Port>) => void;
  deletePort: (targetId: string, portId: string) => void;
  
  addCredential: (targetId: string, cred: Omit<Credential, 'id' | 'addedAt'>) => void;
  updateCredential: (targetId: string, credId: string, patch: Partial<Credential>) => void;
  deleteCredential: (targetId: string, credId: string) => void;
  
  addAttackCard: (targetId: string, card: Omit<AttackCard, 'id' | 'createdAt'>) => void;
  updateAttackCard: (targetId: string, cardId: string, patch: Partial<AttackCard>) => void;
  deleteAttackCard: (targetId: string, cardId: string) => void;
  
  exportTargetJSON: (targetId: string) => Promise<void>;
  exportTargetMarkdown: (targetId: string) => Promise<void>;
  
  writeSharedContext: () => Promise<void>;  // writes activeTarget + activeIP to config
  emitEvent: (event: string, data?: Record<string, unknown>) => Promise<void>;
}
```

---

## IPC HANDLERS (main process)

```typescript
ipcMain.handle('recondesk:targets:read', async () => { /* read from app data JSON */ })
ipcMain.handle('recondesk:targets:write', async (_, targets: Target[]) => { /* atomic write */ })
ipcMain.handle('recondesk:config:write-context', async (_, context) => { /* write shared_context to ~/cybertools-config.json */ })
ipcMain.handle('recondesk:event:emit', async (_, event) => { /* append to ecosystem-events.json */ })
ipcMain.handle('recondesk:export:dialog', async (_, opts) => { /* show save dialog, write file */ })
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
│   │   │   ├── Sidebar.tsx            # Target list
│   │   │   └── StatusBar.tsx
│   │   ├── target/
│   │   │   ├── TargetListItem.tsx
│   │   │   ├── NewTargetModal.tsx
│   │   │   ├── TargetHeader.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── OverviewTab.tsx
│   │   │   ├── PortsTab.tsx
│   │   │   ├── ImportNmapModal.tsx
│   │   │   ├── CredentialsTab.tsx
│   │   │   ├── AttackBoardTab.tsx
│   │   │   ├── AttackCard.tsx
│   │   │   ├── CardDetailModal.tsx
│   │   │   ├── TimelineTab.tsx
│   │   │   └── ExportModal.tsx
│   │   └── shared/
│   │       ├── PlatformBadge.tsx
│   │       ├── StatusDot.tsx
│   │       ├── RiskBadge.tsx
│   │       └── MonoText.tsx
│   ├── stores/
│   │   └── useRecondeskStore.ts
│   ├── utils/
│   │   ├── nmapParser.ts              # nmap XML → Port[] converter
│   │   ├── markdownExport.ts          # Target → Markdown string
│   │   └── ecosystemWriter.ts         # Config/event writers
│   └── types/
│       └── recondesk.ts
```

---

## ANIMATIONS

- **Sidebar target list:** stagger entrance on load
- **Tab switch:** fade content out/in (150ms)
- **Attack cards:** stagger within each column on board load
- **New card appearing:** slide down from top of column
- **Card moving stage:** visual feedback on stage change (brief highlight in new column color)
- **Import success:** ports table rows stagger in
- **Timeline entries:** stagger on tab open

---

## ECOSYSTEM WRITES

ReconDesk is the **primary writer of `shared_context.activeTarget` and `shared_context.activeIP`**. Every time the active target changes:

1. Write `recondesk_status.activeTarget` = target name
2. Write `shared_context.activeTarget` = target name
3. Write `shared_context.activeIP` = target IP
4. Emit `target:selected` event to ecosystem-events.json

This propagation must be immediate — do not batch with the regular save cycle.

---

## CRITICAL REQUIREMENTS

1. nmap XML parser must handle both `-oX` format and common malformed variants gracefully
2. Passwords in credentials must never appear in plaintext in Markdown exports
3. Timeline entries must be auto-generated for every data mutation (port added, card moved, etc.)
4. The Attack Board must correctly persist card order within each column
5. Setting a target as "active" must immediately write to `shared_context` in `cybertools-config.json`
6. The app must handle targets data file missing on first launch (create with empty array)
7. Duplicate port detection on nmap import (same port + protocol = skip, don't error)

---

## DELIVERABLES

1. All component files
2. Zustand store
3. nmap XML parser utility
4. Markdown export utility
5. Main process IPC handlers
6. Type definitions
7. `IMPLEMENTATION_PLAN.md` for ReconDesk

---

*Read CYBEROS_DESIGN_BIBLE.md first.*
