# MANUS PROMPT — VaultCore
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Read `CYBEROS_DESIGN_BIBLE.md` first. All design decisions must conform to it.

---

## YOUR ROLE

Produce production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code for VaultCore. No placeholders. No pseudo-code. Directly implementable in Electron.

---

## CONTEXT: WHAT IS VAULTCORE?

VaultCore is the **knowledge vault scraper and orchestrator** in CyberOS. Its job is to automatically populate the operator's Obsidian vault with up-to-date security content from configured sources — websites, RSS feeds, GitHub repos, YouTube channels, CVE databases, and more.

The operator configures sources (e.g., "TryHackMe writeups on Medium", "Exploit-DB updates", "HackTricks GitHub"). VaultCore scrapes them on a schedule, auto-tags the content, detects changes from previous scrapes (LCS-based diff), and saves clean Markdown files to the Obsidian vault.

The goal: the operator's vault is always current. When they need to know about a technique, it's already there.

**Accent color:** `#3fb950` (Green)

---

## SOURCE TYPES

```typescript
type SourceType = 
  | 'obsidian-publish'   // Obsidian Publish site
  | 'website'            // Generic web page (headline/content scrape)
  | 'github'             // GitHub repo README or specific files
  | 'youtube'            // YouTube channel (description scraping)
  | 'pdf'                // PDF document
  | 'reddit'             // Subreddit posts
  | 'twitter'            // Twitter/X user feed
  | 'notion'             // Notion public page
  | 'medium'             // Medium publication
  | 'cve'                // CVE database queries
  | 'rss'                // RSS/Atom feed (content, not just headlines)
```

---

## DATA MODEL

```typescript
interface ScrapingSource {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  enabled: boolean;
  interval: 'hourly' | 'daily' | 'weekly' | 'manual';
  outputPath: string;           // Relative path within vault
  lastScrapeAt?: string;
  lastSuccessAt?: string;
  consecutiveFailures: number;
  health: 'healthy' | 'warning' | 'error';
  totalNotesSaved: number;
  tags: string[];               // Default tags to apply to content from this source
  config?: Record<string, unknown>; // Source-type specific config
}

interface ScrapeRun {
  id: string;
  sourceId: string;
  sourceName: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  result?: ScrapeResult;
  error?: string;
}

interface ScrapeResult {
  newNotes: number;
  updatedNotes: number;
  unchangedNotes: number;
  totalNotes: number;
  suggestedTags: string[];
  diffs: NoteDiff[];
}

interface NoteDiff {
  path: string;
  type: 'new' | 'updated' | 'unchanged';
  oldFirstLine?: string;
  newFirstLine?: string;
  changePercent?: number;
}

interface TagRule {
  category: string;
  tag: string;
  keywords: string[];
}
```

**Built-in tag rules (9 categories):**
```typescript
const TAG_RULES: TagRule[] = [
  { category: 'web-security', tag: '#web-security', keywords: ['XSS', 'CSRF', 'SQL injection', 'SSRF', 'deserialization', 'path traversal'] },
  { category: 'network', tag: '#network', keywords: ['nmap', 'port scan', 'firewall', 'routing', 'TCP', 'UDP', 'packet'] },
  { category: 'privilege-escalation', tag: '#privilege-escalation', keywords: ['privesc', 'SUID', 'sudo', 'sudoers', 'cron', 'kernel exploit'] },
  { category: 'active-directory', tag: '#active-directory', keywords: ['Active Directory', 'Kerberos', 'LDAP', 'BloodHound', 'DCSync', 'Mimikatz', 'NTLM'] },
  { category: 'cryptography', tag: '#cryptography', keywords: ['encryption', 'hash', 'RSA', 'AES', 'cipher', 'JWT', 'certificate'] },
  { category: 'tools', tag: '#tools', keywords: ['Metasploit', 'Burp Suite', 'Wireshark', 'John', 'hashcat', 'Hydra', 'gobuster'] },
  { category: 'cve', tag: '#cve', keywords: ['CVE-', 'vulnerability', 'patch', 'zero-day', 'exploit'] },
  { category: 'linux', tag: '#linux', keywords: ['Linux', 'bash', '/etc/passwd', '/etc/shadow', 'chmod', 'iptables'] },
  { category: 'windows', tag: '#windows', keywords: ['Windows', 'registry', 'PowerShell', 'cmd.exe', 'WMI', 'Task Scheduler'] },
]
```

---

## SCREENS TO BUILD

### Screen 1: Monitoring Dashboard (Default)

At-a-glance view of the entire scraping ecosystem.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  TitleBar: [●●●] 🔬 VaultCore             [▶ Scrape All] [↺]   │
├───────────────────┬──────────────────────────────────────────────┤
│  SIDEBAR          │  DASHBOARD CONTENT                           │
│                   │                                              │
│  📊 Dashboard     │  ┌───────────┬───────────┬─────────────────┐│
│  📋 Sources       │  │ Sources   │ Last Run  │ Vault Health    ││
│  📜 Run History   │  │ 8 active  │ 23s ago   │ 892 notes       ││
│  🏥 Source Health │  └───────────┴───────────┴─────────────────┘│
│  ⚙ Settings      │                                              │
│                   │  ACTIVE RUNS                                  │
│                   │  ● Scraping: HackTricks GitHub   [████░] 72%│
│                   │  ● Queued:  Exploit-DB RSS                   │
│                   │                                              │
│                   │  LAST RUN SUMMARY                            │
│                   │  ┌───────────────────────────────────────┐  │
│                   │  │ HackTricks GitHub • 2m ago            │  │
│                   │  │ 3 new  ·  1 updated  ·  12 unchanged  │  │
│                   │  │ [▼ View diff]                          │  │
│                   │  └───────────────────────────────────────┘  │
│                   │                                              │
│                   │  VAULT COMPOSITION (mini bar chart)          │
│                   │  CyberLab ████████████████ 234              │
│                   │  SignalBoard ███████████ 182                 │
│                   │  HackTricks ████████ 142                    │
│                   │  Exploit-DB ██████ 98                       │
└───────────────────┴──────────────────────────────────────────────┘
│  VaultCore Active • 8 sources • Vault: 892 notes                │
└──────────────────────────────────────────────────────────────────┘
```

**Metric cards (top row):**
- Active sources (green/total)
- Last run timestamp (time ago)
- Vault note count
- Notes added today

**Active Runs:**
- Each active scrape shows as a progress bar
- Source name, progress %, estimated time remaining
- "Cancel" button per run

**Last Run Summary (per source, last 5):**
- Source name + time ago
- "3 new · 1 updated · 12 unchanged" summary line
- Click to expand diff view inline

**Vault Composition:**
- Horizontal bar chart showing note count by top-level folder
- Bars in green gradient
- Click a folder: filter sources view to sources writing to that folder

---

### Screen 2: Sources Management

**Two-panel: source list (left, 280px) + source detail (right)**

**Source list:**
```
SOURCES (8)
─────────────────────────────
● HackTricks GitHub         ← green dot = healthy
  github • daily
  
● Exploit-DB RSS
  rss • hourly

⚠ Medium: Security+         ← amber dot = warning (1 failure)
  medium • daily

✕ Custom Blog               ← red dot = error (3+ failures)
  website • manual
  
[+ Add Source]
```

**Source detail (right panel):**
```
┌──────────────────────────────────────────────────┐
│  HackTricks GitHub                   [Edit] [▶]  │
│  github • daily • Healthy                        │
├──────────────────────────────────────────────────┤
│  URL: github.com/carlospolop/hacktricks          │
│  Output: /HackTricks/                            │
│  Tags: #tools #technique                         │
├──────────────────────────────────────────────────┤
│  LAST 5 RUNS                                     │
│  ● 23s ago  — 0 new, 1 updated, 89 unchanged    │
│  ● 1d ago   — 3 new, 2 updated, 86 unchanged    │
│  ● 2d ago   — 0 new, 0 updated, 88 unchanged    │
├──────────────────────────────────────────────────┤
│  STATS                                           │
│  Total notes: 89                                 │
│  Notes added today: 0                            │
│  Last success: 23s ago                           │
│  Consecutive failures: 0                         │
└──────────────────────────────────────────────────┘
```

**Add Source Modal:**
- Step 1: Name, Type (select), URL
- Step 2: Output path within vault, schedule interval, default tags
- Step 3: Test the source (preview: "Found 12 items") + confirm

**Edit Source:**
- Same form as Add, pre-filled
- "Test URL" button

**Source status logic:**
- Healthy: 0 consecutive failures
- Warning: 1–2 consecutive failures (show amber dot + failure count)
- Error: 3+ consecutive failures (show red dot, disabled by default)
- Error sources are highlighted in the Source Health view

---

### Screen 3: Run History

Full log of all scrape runs.

**Layout:** Table

| Source | Started | Duration | Status | New | Updated | Unchanged |
|---|---|---|---|---|---|---|
| HackTricks GitHub | 14:20:33 | 8s | ✓ | 0 | 1 | 89 |
| Exploit-DB RSS | 14:19:11 | 3s | ✓ | 2 | 0 | 18 |
| Custom Blog | 13:45:00 | 12s | ✕ Error | — | — | — |

- Color-coded status: green=success, red=error, amber=running
- Click row: expand to show full diff details (updated notes' old vs new first lines)
- Filter: by source, by date range, by status
- "Clear history" button (with confirmation)

---

### Screen 4: Source Health

Dedicated health monitoring view. Shows all sources sorted by health severity.

**Layout:**
```
SOURCE HEALTH MONITOR                    [Refresh All ↺]
──────────────────────────────────────────────────────────
ERRORS (1)
✕ Custom Blog
  3 consecutive failures • Last error: "Connection timeout"
  Last success: 2026-06-01 09:12                [Retry] [Disable]

WARNINGS (1)
⚠ Medium: Security+
  1 consecutive failure • Last error: "RSS parse error"
  Last success: 2026-06-02 22:30                [Retry] [View Error]

HEALTHY (6)
● HackTricks GitHub     Last: 23s ago  89 notes  ✓
● Exploit-DB RSS        Last: 23s ago  20 notes  ✓
● NVD CVEs              Last: 23s ago  5 notes   ✓
[...]
```

- Errors shown first, warnings second, healthy last
- Error card: shows last error message + last success time + Retry/Disable buttons
- Warning card: shows error message + Retry/View Error buttons
- Healthy rows: compact, single line

---

### Screen 5: Diff Viewer (Modal or Inline)

Opened when clicking a run that has updated notes.

```
┌─────────────────────────────────────────────────────────────┐
│  Run Diff: HackTricks GitHub • 2026-06-02 22:30             │
│  3 new · 1 updated · 86 unchanged                           │
├─────────────────────────────────────────────────────────────┤
│  NEW NOTES (3)                                              │
│  + /HackTricks/web/new-technique.md                         │
│  + /HackTricks/linux/sudoers-bypass.md                      │
│  + /HackTricks/crypto/jwt-attacks.md                        │
├─────────────────────────────────────────────────────────────┤
│  UPDATED NOTES (1)                                          │
│  ~ /HackTricks/network/port-scan.md                         │
│    OLD: "Port scanning is the process of..."                │
│    NEW: "Updated 2024: Port scanning with nmap..."          │
├─────────────────────────────────────────────────────────────┤
│  TAGS APPLIED                                               │
│  [#network] [#tools] [#linux]                               │
└─────────────────────────────────────────────────────────────┘
```

---

### Screen 6: Tag Review (Pre-save Flow)

After a scrape completes, if tags were auto-suggested, show the Tag Review step before saving.

```
┌──────────────────────────────────────────────────────┐
│  Tag Review: HackTricks GitHub (3 new notes)         │
├──────────────────────────────────────────────────────┤
│  Auto-detected tags for this content:                │
│                                                      │
│  [✓ #network] [✓ #tools] [✓ #linux] [○ #windows]   │
│  [+ Add custom tag]                                  │
│                                                      │
│  These tags will be written to each note's           │
│  YAML frontmatter.                                   │
│                                                      │
│              [Cancel]  [Save with Tags]              │
└──────────────────────────────────────────────────────┘
```

- Checkmarks = selected tags (included in save)
- Empty circles = detected but deselected
- Tags from built-in tag rules shown automatically
- Custom tags can be added inline
- "Save with Tags" writes notes with frontmatter

---

### Screen 7: Settings

**Vault:**
- Obsidian vault path (with file picker + "Reveal in Finder")
- Auto-create output directories (toggle)

**Scheduling:**
- Global enabled/disabled toggle for auto-scrape
- Default interval for new sources

**Source Health:**
- Consecutive failure threshold for "error" status (default: 3)
- Auto-disable after N failures (toggle)

**Tags:**
- Toggle: Auto-tag using keyword rules
- Edit tag rules: add/remove/edit keyword categories

---

## ZUSTAND STORE

```typescript
interface VaultCoreState {
  sources: ScrapingSource[];
  runs: ScrapeRun[];
  activeSourceId: string | null;
  activeView: 'dashboard' | 'sources' | 'history' | 'health' | 'settings';
  
  isScrapingAll: boolean;
  activeRunIds: string[];
  
  tagReviewPending: {
    sourceId: string;
    suggestedTags: string[];
    selectedTags: string[];
    notesToSave: { path: string; content: string }[];
  } | null;
  
  vaultStats: {
    totalNotes: number;
    byFolder: { folder: string; count: number }[];
    addedToday: number;
  };
  
  // Actions
  loadSources: () => Promise<void>;
  saveSources: () => Promise<void>;
  addSource: (source: Omit<ScrapingSource, 'id'>) => void;
  updateSource: (id: string, patch: Partial<ScrapingSource>) => void;
  deleteSource: (id: string) => void;
  
  scrapeSource: (id: string) => Promise<void>;
  scrapeAll: () => Promise<void>;
  cancelRun: (runId: string) => void;
  
  loadVaultStats: () => Promise<void>;
  loadRunHistory: () => Promise<void>;
  
  confirmTagReview: (selectedTags: string[]) => Promise<void>;
  cancelTagReview: () => void;
  
  writeStatus: () => Promise<void>;
  emitEvent: (event: string, data?: unknown) => Promise<void>;
}
```

---

## IPC HANDLERS (main process)

```typescript
ipcMain.handle('vaultcore:source:scrape', async (event, source: ScrapingSource) => {
  // Main process does the actual HTTP fetching
  // Returns ScrapeResult
  // Sends progress updates via event.sender.send('vaultcore:scrape:progress', ...)
})

ipcMain.handle('vaultcore:vault:read-stats', async (_, vaultPath: string) => {
  // Recursively count .md files by folder
})

ipcMain.handle('vaultcore:vault:write-note', async (_, filePath: string, content: string) => {
  // Write markdown note (atomic)
})

ipcMain.handle('vaultcore:config:write', async (_, patch) => {
  // Write vaultscraper_status to cybertools-config.json
})

ipcMain.handle('vaultcore:event:emit', async (_, event) => {
  // Append to ecosystem-events.json
})
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
│   │   ├── dashboard/
│   │   │   ├── DashboardView.tsx
│   │   │   ├── MetricCards.tsx
│   │   │   ├── ActiveRunsList.tsx
│   │   │   ├── LastRunSummary.tsx
│   │   │   └── VaultCompositionChart.tsx
│   │   ├── sources/
│   │   │   ├── SourcesView.tsx
│   │   │   ├── SourceList.tsx
│   │   │   ├── SourceListItem.tsx
│   │   │   ├── SourceDetail.tsx
│   │   │   └── AddSourceModal.tsx
│   │   ├── history/
│   │   │   └── RunHistoryTable.tsx
│   │   ├── health/
│   │   │   └── SourceHealthView.tsx
│   │   ├── diff/
│   │   │   └── DiffViewer.tsx
│   │   └── tags/
│   │       └── TagReviewModal.tsx
│   ├── stores/
│   │   └── useVaultCoreStore.ts
│   ├── utils/
│   │   ├── tagEngine.ts          # Auto-tag based on keyword rules
│   │   ├── diffEngine.ts         # LCS-based change detection
│   │   └── scrapeScheduler.ts    # Interval-based scrape triggers
│   └── types/
│       └── vaultcore.ts
```

---

## ANIMATIONS

- **Active run progress bar:** smooth width animation as progress updates
- **Run complete:** progress bar turns solid green, source item briefly highlights
- **Error state:** source item shakes briefly (Framer Motion keyframes)
- **Vault stats bar chart:** animate bar widths on load/update
- **Tag review modal:** scale + fade in
- **New run appearing:** slide down in active runs list

---

## CRITICAL REQUIREMENTS

1. HTTP fetching must happen in the main process (not renderer) — no CORS issues
2. Vault writes must be atomic — never corrupt an existing note
3. The diff engine must correctly classify notes as new/updated/unchanged using first-line comparison (LCS approach)
4. Consecutive failure count must be accurate — never reset on a run that was cancelled by the user
5. Tag auto-detection must scan the full content of scraped material, not just the title
6. The scrape scheduler must survive app restarts — check last-scrape times on startup and run any overdue sources immediately
7. If the vault path is not configured, show a prominent empty state directing the operator to Settings

---

## DELIVERABLES

1. All component files
2. Zustand store
3. Tag engine utility
4. Diff engine utility
5. Scrape scheduler
6. IPC handlers
7. Type definitions
8. `IMPLEMENTATION_PLAN.md` for VaultCore

---

*Read CYBEROS_DESIGN_BIBLE.md first.*
