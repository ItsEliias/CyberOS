# MANUS PROMPT — SignalBoard
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Read `CYBEROS_DESIGN_BIBLE.md` first. All design decisions must conform to it.

---

## YOUR ROLE

Produce production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code for SignalBoard. No placeholders. No pseudo-code. Directly implementable in Electron.

---

## CONTEXT: WHAT IS SIGNALBOARD?

SignalBoard is the **security intelligence aggregation and relevance-scoring platform** in CyberOS. It pulls from multiple RSS/web security feeds, scores each item for relevance to the operator's current engagement, and surfaces the highest-priority intelligence at the top.

The key differentiator: SignalBoard reads the operator's current `shared_context` (active lab name, target, target IP) from `cybertools-config.json` and automatically scores incoming intelligence against those terms. If the operator is working on a machine running Apache 2.4.18, and a new CVE drops for Apache 2.4.18, SignalBoard will score it as highly relevant and notify immediately.

**Accent color:** `#ff6b6b` (Coral)

---

## RELEVANCE SCORING ALGORITHM

Each feed item is scored 0–100. The scoring logic:

```
Base score: 0

+5 per match of a term from the 30-term security keyword list:
  ["exploit", "vulnerability", "CVE", "RCE", "SQL injection", "XSS", 
   "privilege escalation", "buffer overflow", "authentication bypass",
   "command injection", "SSRF", "XXE", "deserialization", "LDAP",
   "Active Directory", "Kerberos", "SMB", "NTLM", "hash", "lateral movement",
   "persistence", "exfiltration", "C2", "Metasploit", "payload", "reverse shell",
   "web shell", "container escape", "kernel exploit", "zero-day"]

+10 per match of the current activeLab name in title or description
+10 per match of the current activeTarget name or activeIP in title or description
+10 per match of a user-defined custom keyword

Maximum score: 100 (cap)
Relevance tiers: High (≥60), Medium (30–59), Low (<30)
```

Score is computed on every fetch refresh. When the `shared_context` changes, all existing items in the feed are rescored automatically.

---

## DATA SOURCES

### RSS/Web Feeds (configurable)

Default sources:
- Exploit-DB RSS: `https://www.exploit-db.com/rss.xml`
- NVD Recent CVEs: `https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml`
- TryHackMe Blog: RSS
- HackTheBox Blog: RSS
- Krebs on Security: `https://krebsonsecurity.com/feed/`
- The Hacker News: `https://feeds.feedburner.com/TheHackersNews`
- Bleeping Computer Security: RSS
- SANS Internet Storm Center: RSS

### cybertools-config.json

**Reads every 10 seconds:**
- `shared_context.activeLab`
- `shared_context.activeTarget`
- `shared_context.activeIP`
- `signalboard.customKeywords` (array of strings)

**Writes:**
- `signalboard_status.active`
- `signalboard_status.unreadCount`
- `signalboard_status.lastRefresh` (ISO timestamp)
- `signalboard_status.topItem` (title of highest-scored item)

---

## SCREENS TO BUILD

### Screen 1: Signal Feed (Default / Primary)

The main screen. Full-time monitoring view.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  TitleBar: [●●●] 📡 SignalBoard         [🔔 3] [↺ Refresh]    │
├───────────────────────────┬─────────────────────────────────────┤
│  SIDEBAR (220px)          │  FEED + READING PANE                │
│                           │                                     │
│  📡 Signal Feed           │  [FILTER BAR]                       │
│  📊 Trends                │  All  |  High (3)  |  Medium (8)   │
│  🔗 Sources               │  |  Low (24)  |  Starred  |  Unread │
│  ⚙ Settings              │                                     │
│  ──────────────────────── │  ┌─────────────────────────────┐   │
│  AUTO-CONTEXT             │  │ ● CRITICAL CVE-2024-1234    │   │
│  🔴 Lab: Pickle Rick      │  │ Apache 2.4.18 RCE — URGENT  │   │
│  🎯 Target: 10.10.3.164   │  │ Exploit-DB • 2m ago • [98]  │   │
│  ──────────────────────── │  └─────────────────────────────┘   │
│  CUSTOM KEYWORDS          │                                     │
│  [apache] [wordpress]     │  ┌─────────────────────────────┐   │
│  [+ add]                  │  │ ● HIGH  New Pickle Rick HTB  │   │
│                           │  │ Machine released — Tips...   │   │
│                           │  │ HackTheBox • 5m ago • [75]  │   │
│                           │  └─────────────────────────────┘   │
│                           │                                     │
│                           │  [Reading pane — selected article] │
└───────────────────────────┴─────────────────────────────────────┘
│  SignalBoard Active • 35 items • Last refresh: 23s ago          │
└─────────────────────────────────────────────────────────────────┘
```

**Auto-Context Panel (sidebar bottom):**
- Shows current `shared_context` values
- "AUTO" badge in coral when values came from shared config (vs. manual input)
- If context is set: show coral dot + lab name + target
- If no context: show grey "No active session" message
- Clicking a context item → opens ReconDesk or CyberLab (cross-app navigation)

**Custom Keywords panel:**
- Comma-separated tag chips showing current custom keywords
- [+ add] inline input to add a new keyword
- Click chip to remove
- Saved to `signalboard.customKeywords` in config on change
- Each custom keyword adds +10 to relevance score

**Feed Items:**
```
┌──────────────────────────────────────────────────────────────────┐
│  [●] CRITICAL  CVE-2024-1234: Apache 2.4.18 Remote Code Exec    │
│                                                                  │
│  A critical vulnerability in Apache httpd 2.4.18 allows...      │
│  Exploit-DB  ·  3 minutes ago  ·  Score: [98]                  │
│                                                                  │
│  [★ Star]  [👁 Read]  [🔗 Open]  [💾 Save to Vault]             │
└──────────────────────────────────────────────────────────────────┘
```

- Relevance tier badge: CRITICAL (coral, ≥80) / HIGH (red, ≥60) / MEDIUM (amber, 30–59) / LOW (grey, <30)
- Score badge: `[98]` in monospace, color matches tier
- Source name + time ago + unread dot (if not yet opened)
- Action icons appear on hover
- Click card → opens in Reading Pane (right side) or full panel

**Filter tabs:**
- All / High / Medium / Low / Starred / Unread
- Count badges on each tab (updates live)
- Active filter: accent underline

**Notification badge in header:**
- Bell icon with count of items scoring ≥40 since last read
- Click: opens a dropdown with the top 5 high-relevance items

---

### Screen 2: Reading Pane

When a feed item is clicked, a reading pane opens on the right side (or full panel if no split).

**Reading pane layout (400px):**
```
┌──────────────────────────────────────────┐
│  [← Back]                  [★] [🔗] [💾] │
├──────────────────────────────────────────┤
│  CVE-2024-1234: Apache 2.4.18 RCE        │
│  Exploit-DB • 2026-06-03 14:23           │
│  Score: [98] — CRITICAL                  │
├──────────────────────────────────────────┤
│  [AI SUMMARY]                            │
│  • Affects Apache httpd < 2.4.19         │
│  • Allows unauthenticated RCE            │
│  • PoC available on GitHub               │
│  [Summarise with AI] (if not yet done)   │
├──────────────────────────────────────────┤
│  FULL CONTENT                            │
│  [Scrollable article content]            │
│                                          │
│  ...article text...                      │
│                                          │
└──────────────────────────────────────────┘
```

**AI Summary section:**
- If not yet summarised: show "Summarise with AI" button (calls Claude API)
- Loading state: animated dots
- Summary result: 3-bullet points, cached in memory for the session
- Streaming: bullets appear one by one as Claude generates them

**Save to Vault (GhostVault):**
- Saves article title + AI summary (if available) + link as a `.md` file
- Save path: `SignalBoard/[YYYY-MM-DD] [title].md`

---

### Screen 3: Trends

Intelligence trends over time.

**Sections:**

**Keyword Frequency Chart:**
- Bar chart: top 10 most-mentioned terms across the last 7 days of fetched items
- Bars colored in coral gradient
- Hover: shows count

**Source Activity Timeline:**
- Horizontal bar chart: items per source per day (last 7 days)
- Shows which sources are most active

**Relevance Score Distribution:**
- Pie/donut chart: High / Medium / Low breakdown
- Updates on each refresh

**Top Keywords This Week:**
- Tag cloud of most-mentioned terms in high-relevance items

---

### Screen 4: Sources Management

**Source list:**

| Source Name | URL | Status | Last Success | Items | Toggle |
|---|---|---|---|---|---|
| Exploit-DB | exploit-db.com/rss.xml | ● Active | 23s ago | 18 | [●] |
| NVD CVEs | nvd.nist.gov/... | ● Active | 23s ago | 7 | [●] |
| THM Blog | ... | ● Active | 5m ago | 3 | [●] |
| Custom... | user-added | ● Active | 1h ago | 12 | [●] |

- Status dot: green=active, red=error, grey=disabled
- Toggle per source (disable without deleting)
- "Refresh now" per source
- "Delete" per source (with confirmation)
- Last fetch success time + item count

**Add Source:**
```
┌────────────────────────────────────────────┐
│  Add Feed Source                           │
│                                            │
│  Name: [________________]                  │
│  URL:  [https://example.com/feed.rss]      │
│  Type: [RSS ▾]                             │
│                                            │
│  [Test URL]  [Add Source]                  │
└────────────────────────────────────────────┘
```
- Test URL: fetches URL, validates RSS/XML, shows "Found 12 items" preview
- Types: RSS, Atom, Web page (scrape headlines)

---

### Screen 5: Settings

**Feed:**
- Refresh interval (15min / 30min / 1hr / manual only)
- Max items per source
- Auto-clear items older than N days

**Relevance:**
- Custom keyword list (editable)
- Minimum score to show notifications (default: 40)

**Notifications:**
- Toggle: macOS notifications for high-relevance items
- Threshold (score ≥ N)

**AI:**
- Provider: Claude / Ollama
- Claude API key
- AI summary: auto-generate on read / manual only

---

## ZUSTAND STORE

```typescript
interface SignalboardState {
  // Feed data
  feedItems: FeedItem[];
  lastRefreshAt: Date | null;
  isRefreshing: boolean;
  
  // Sources
  sources: FeedSource[];
  
  // Context (from shared config)
  sharedContext: SharedContext | null;
  customKeywords: string[];
  
  // UI
  activeView: 'feed' | 'trends' | 'sources' | 'settings';
  activeFilter: 'all' | 'high' | 'medium' | 'low' | 'starred' | 'unread';
  selectedItemId: string | null;
  readItemIds: Set<string>;
  starredItemIds: Set<string>;
  
  // Notifications
  unreadHighCount: number;
  
  // Actions
  refresh: (sourceId?: string) => Promise<void>;
  scoreItems: () => void;
  loadContext: () => Promise<void>;
  addCustomKeyword: (keyword: string) => void;
  removeCustomKeyword: (keyword: string) => void;
  selectItem: (id: string) => void;
  markRead: (id: string) => void;
  toggleStar: (id: string) => void;
  summariseWithAI: (item: FeedItem) => Promise<void>;
  saveToVault: (item: FeedItem) => Promise<void>;
  addSource: (source: Omit<FeedSource, 'id'>) => Promise<void>;
  toggleSource: (id: string) => void;
  deleteSource: (id: string) => void;
  writeStatus: () => Promise<void>;
}

interface FeedItem {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  description: string;
  content: string;
  url: string;
  publishedAt: Date;
  fetchedAt: Date;
  relevanceScore: number;
  relevanceTier: 'critical' | 'high' | 'medium' | 'low';
  aiSummary?: string[];       // 3 bullet points
  isRead: boolean;
  isStarred: boolean;
}

interface FeedSource {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'atom' | 'web';
  enabled: boolean;
  lastFetchAt?: Date;
  lastSuccess?: Date;
  itemCount: number;
  error?: string;
}
```

---

## IPC HANDLERS (main process)

```typescript
ipcMain.handle('signalboard:feed:fetch', async (_, sourceUrl: string) => {
  // Fetch RSS/Atom feed, parse XML, return items[]
})

ipcMain.handle('signalboard:config:read', async () => {
  // Read shared_context + signalboard.customKeywords from cybertools-config.json
})

ipcMain.handle('signalboard:config:write', async (_, patch) => {
  // Atomic write: signalboard_status + signalboard.customKeywords
})

ipcMain.handle('signalboard:vault:save', async (_, item: FeedItem, vaultPath: string) => {
  // Write markdown file to Obsidian vault
})

ipcMain.handle('signalboard:ai:summarise', async (_, item: FeedItem, apiKey: string) => {
  // Call Claude API, return 3-bullet summary
})

ipcMain.handle('signalboard:notification:fire', async (_, item: FeedItem) => {
  // Fire macOS notification for high-relevance item
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
│   │   ├── feed/
│   │   │   ├── FeedView.tsx
│   │   │   ├── FeedItem.tsx
│   │   │   ├── FeedFilterBar.tsx
│   │   │   └── ReadingPane.tsx
│   │   ├── context/
│   │   │   ├── AutoContextPanel.tsx
│   │   │   └── CustomKeywords.tsx
│   │   ├── trends/
│   │   │   └── TrendsView.tsx
│   │   ├── sources/
│   │   │   ├── SourcesView.tsx
│   │   │   ├── SourceRow.tsx
│   │   │   └── AddSourceModal.tsx
│   │   └── notifications/
│   │       └── NotificationDropdown.tsx
│   ├── stores/
│   │   └── useSignalboardStore.ts
│   ├── utils/
│   │   ├── rssParser.ts          # XML → FeedItem[]
│   │   ├── scorer.ts             # Relevance scoring algorithm
│   │   └── feedRefresher.ts      # Scheduled refresh logic
│   └── types/
│       └── signalboard.ts
```

---

## ANIMATIONS

- **Feed items entering on refresh:** stagger in from top (new items), 40ms between
- **Score badge:** subtle color transition when score updates due to context change
- **High-relevance notification:** item card briefly pulses coral when it scores ≥ 60
- **Reading pane open:** slide in from right, 200ms
- **AI summary loading:** animated bullet points (placeholder lines pulse)
- **AI summary appearing:** bullet points fade in one at a time, 200ms between

---

## CRITICAL REQUIREMENTS

1. Relevance scoring must re-run for ALL items when `shared_context` changes — not just new items
2. Feed refresh must not block the UI — run in main process, send results back to renderer
3. The "Auto" badge in the context panel must correctly reflect whether values were auto-loaded vs. manually overridden
4. RSS parser must handle both RSS 2.0 and Atom feed formats
5. Custom keywords must persist to `cybertools-config.json` immediately on add/remove
6. Notification must not fire multiple times for the same item (track seen item IDs)
7. AI summary is cached per item ID — never re-call AI for the same article in the same session
8. Source health: if a source fails 3 consecutive fetches, mark it as `error` status

---

## DELIVERABLES

1. All component files
2. Zustand store
3. RSS/Atom parser utility
4. Relevance scoring engine
5. Feed refresh scheduler
6. IPC handlers
7. Type definitions
8. `IMPLEMENTATION_PLAN.md` for SignalBoard

---

*Read CYBEROS_DESIGN_BIBLE.md first.*
