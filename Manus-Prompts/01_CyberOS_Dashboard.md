# MANUS PROMPT — CyberOS Dashboard
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Before doing anything else, read `CYBEROS_DESIGN_BIBLE.md` in the root of this repository. Every design decision in this prompt must be consistent with that document. The Design Bible defines colors, typography, spacing, components, animations, and philosophy. Do not deviate from it.

---

## YOUR ROLE

You are producing **production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code** for the CyberOS Dashboard application. This is not a mockup exercise. The output must be directly implementable into an Electron app running electron-vite. No placeholders. No pseudo-code. No "TODO: implement this". Every component must be complete and functional.

---

## CONTEXT: WHAT IS CYBEROS DASHBOARD?

CyberOS Dashboard is the **unified status monitor** for the entire CyberOS ecosystem. It sits on a second monitor (or primary monitor when not in an active lab) and gives the operator a complete view of everything happening across all 12 applications in real time.

It does NOT manage any domain directly. It reads data — it does not write domain data. Its job is to surface:

1. The operator's profile and progress (labs, flags, streaks, skills)
2. The live status of all 12 apps (active/inactive, key metrics per app)
3. The ecosystem activity feed (events from `ecosystem-events.json`)
4. Alert conditions (apps offline, no activity, threshold breaches)
5. Quick navigation to any app

**Accent color:** `#4a9eff` (Blue)

---

## DATA SOURCES

### cybertools-config.json (`~/cybertools-config.json`)

This is the primary data source. Read it by polling every 5 seconds OR using `fs.watch` for immediate updates.

**Key sections to read:**

```json
{
  "shared_context": {
    "activeLab": "string | null",
    "activeTarget": "string | null",
    "activeIP": "string | null",
    "activePlaybook": "string | null",
    "lastUpdated": "ISO timestamp",
    "updatedBy": "string"
  },
  "operator_profile": {
    "operatorName": "string",
    "totalLabsCompleted": "number",
    "totalFlags": "number",
    "totalCredentials": "number",
    "currentStreak": "number",
    "lastActiveDate": "YYYY-MM-DD",
    "skillProgress": {
      "web": "number",
      "network": "number",
      "activeDirectory": "number",
      "linux": "number",
      "windows": "number",
      "crypto": "number",
      "forensics": "number"
    }
  },
  "[app]_status": {
    "active": "boolean",
    "lastActive": "ISO timestamp",
    "[app-specific metrics]": "..."
  }
}
```

**All 12 app statuses to read:**
- `cyberlab_status` — active, currentLab, sessionActive, findingsCount
- `recondesk_status` — active, activeTarget, targetCount, cardCount
- `ghostvault_status` — active, noteCount
- `vaultscraper_status` — active, vaultNoteCount, totalSources
- `signalboard_status` — active, unreadCount, lastRefresh, topItem
- `credvault_status` — active, credentialCount, locked
- `playbookstudio_status` — active, activePlaybook
- `reportforge_status` — active, reportCount
- `terminallink_status` — active, commandCount, linkedSession
- `networkmap_status` — active, currentGraph, nodeCount
- `cyberos_status` (launcher) — active

### ecosystem-events.json

**Location:** `~/Library/Application Support/CyberTools/ecosystem-events.json`

Read and watch this file. Parse as an array of event objects:

```json
[
  {
    "id": "uuid",
    "timestamp": "ISO timestamp",
    "app": "CyberLab",
    "event": "session:started",
    "data": { "lab": "Pickle Rick", "platform": "THM" }
  }
]
```

Handle both schemas (some older apps use `appName`/`eventType` instead of `app`/`event`).

---

## OPERATOR PERSONA

The operator (ItsEliias) is a solo cybersecurity professional. When they open CyberOS Dashboard, they want to see:

- "What did I accomplish today / this week?"
- "What's currently running?"
- "What happened recently across all my tools?"
- "Am I on my streak?"
- "What skills am I building?"
- "Is anything wrong with the ecosystem?"

They may glance at this screen between tasks. It must be readable in 2 seconds. It is NOT a place to perform actions — it is a status instrument.

---

## SCREENS TO BUILD

### Screen 1: Main Dashboard (Primary Screen)

This is the default view. It is designed for a second monitor and should show maximum information at a glance.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Title bar: [●●●] ⚡ CyberOS Dashboard           [⚙] [⤢]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ACTIVE SESSION BANNER (shows if activeLab is set)  │   │
│  │  🔴 Lab: Pickle Rick  •  Target: 10.10.3.164        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │  OPERATOR PROFILE    │  │  ECOSYSTEM HEALTH BAR    │    │
│  │                      │  │  [12 app status dots]    │    │
│  │  ItsEliias           │  └──────────────────────────┘    │
│  │  🔥 4 day streak     │                                  │
│  │  ⚑  38 flags         │  ┌──────────────────────────┐    │
│  │  🔬 12 labs          │  │  ACTIVITY FEED           │    │
│  │  🔑 21 creds         │  │  (live ecosystem events) │    │
│  │                      │  │                          │    │
│  │  [Skill Radar]       │  │  23s ago CyberLab        │    │
│  │                      │  │  session:started         │    │
│  │                      │  │                          │    │
│  └──────────────────────┘  │  1m ago ReconDesk        │    │
│                             │  target:added            │    │
│  APP STATUS GRID            │                          │    │
│  [3 × 4 app cards]         │  ...                     │    │
│                             └──────────────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Status bar: Ecosystem OK • VPN: Connected • 14:23 UTC]   │
└─────────────────────────────────────────────────────────────┘
```

**Active Session Banner:**
- Only shown when `shared_context.activeLab` is not null
- Background: `bg-accent/10`, left border: 3px `accent`
- Content: animated red pulse dot, "Lab: [name]", "Target: [ip]", "Playbook: [name]" if set
- `lastUpdated` shown as "Updated Xs ago"
- Clicking any field opens the relevant app

**Operator Profile Card:**
- Operator name in `text-xl font-bold`
- Streak count with fire emoji — if streak > 0, show in `warning` color
- Streak expiry warning: if `lastActiveDate` is yesterday, show "⚠ Streak at risk — log a session today"
- Total flags, labs, credentials as metric rows with icons
- Below metrics: **Skill Radar** (see below)
- Skill Radar: SVG/Canvas spider chart with 7 axes (web, network, AD, linux, windows, crypto, forensics)
  - Animate draw from center on mount (800ms ease-out)
  - Fill: `accent/20`, stroke: `accent`
  - Axis labels at tips
  - Values from `skillProgress` object

**Ecosystem Health Bar:**
- Horizontal strip showing one colored dot per app (12 total)
- Dot color: green if `[app]_status.active === true`, grey if inactive
- Dot tooltip on hover: app name + last active time
- If any app shows `active: false` for > 5 minutes, show a warning badge
- Apps ordered: Launcher, Dashboard, CyberLab, ReconDesk, GhostVault, VaultCore, SignalBoard, CredVault, PlaybookStudio, ReportForge, TerminalLink, NetworkMap

**App Status Grid:**
- 3-column grid, 4 rows (12 app cards)
- Each card shows:
  - App icon (custom SVG or Lucide proxy)
  - App name + accent color dot
  - Active/Inactive status badge
  - One or two key metrics relevant to that app:
    - CyberLab: "Session: [lab name]" or "No active session"
    - ReconDesk: "[N] targets, [N] cards"
    - GhostVault: "[N] notes"
    - VaultCore: "[N] vault notes, [N] sources"
    - SignalBoard: "[N] unread signals"
    - CredVault: "[N] credentials" + lock status
    - PlaybookStudio: "Active: [name]" or "Idle"
    - ReportForge: "[N] reports"
    - TerminalLink: "[N] commands logged"
    - NetworkMap: "[graph name]" or "No active graph"
    - Launcher: "Running" / "Inactive"
    - Dashboard: "Running" (self)
  - Last active timestamp
  - Mini sparkline: 6-hour activity bar (if event data allows, else omit)
  - Hover: subtle bg elevation + "Open" button appears
  - Click: launch that app (IPC call to main process)

**Activity Feed:**
- Right panel, scrollable
- Shows events from `ecosystem-events.json`, newest first
- Each event row:
  - App accent color left border (2px)
  - App name (colored in app accent)
  - Event type (human-readable: "session:started" → "Started session")
  - Event data preview (lab name, target, etc.)
  - `timeAgo` timestamp (updates every 30s)
- Auto-scrolls to new events when they arrive
- "Mark all read" button at top
- Filter by app (dropdown)
- If no events in 30 minutes: show warning indicator

---

### Screen 2: Operator Profile (Full View)

Accessed from the sidebar nav. Full-screen dedicated view for the operator's progress.

**Sections:**

**Profile Header:**
- Large operator name
- Avatar placeholder (initials in accent circle)
- Member since date
- "Active" status with pulse dot

**Stats Row:**
- 4 metric cards: Total Labs, Total Flags, Total Credentials, Current Streak
- Each with an icon, large number, and delta (if computable from history)

**Streak Calendar:**
- GitHub contribution graph style
- 52 columns (weeks) × 7 rows (days)
- Each cell: colored if active that day (color intensity = number of ecosystem events)
- Accent color scale: `accent/20` (1 event), `accent/50` (3–5 events), `accent/100` (6+ events)
- Today's cell: bordered
- Tooltip on hover: date + event count

**Skill Radar (Large):**
- Full-size version of the radar chart from the main dashboard
- 7 axes with point values shown at each vertex
- Historical comparison: faint second polygon showing skill levels from 30 days ago (if data exists)
- Legend below chart

**Lab History Table:**
- Columns: Lab Name, Platform, Date, Duration, Flags, Skills Gained
- Sortable by any column
- Platform badges: HTB (red), THM (green), CTF (purple), Client (blue)
- Click row to expand: session notes summary if available

**Skill Breakdown:**
- Bar chart or row bars for each skill category
- Shows points and a label (e.g., "Web: 24 pts — Advanced Beginner")

---

### Screen 3: Ecosystem Status (Deep View)

Accessed from sidebar nav. For debugging and monitoring the ecosystem fabric.

**Sections:**

**Config File Health:**
- Path to `cybertools-config.json` with copy button
- Last modified time
- File size
- Valid JSON indicator (green/red)
- Button: "Open in editor"

**App Status Table:**
- All 12 apps in a table
- Columns: App, Status, Last Active, Version, Exec Path, Key Metric
- Status dot + "Active/Inactive" text
- Exec path truncated with hover tooltip
- Click row: expand all config keys for that app

**Event Log:**
- Full scrollable event log from `ecosystem-events.json`
- Search/filter bar
- Filter by: app, event type, date range
- Each row: timestamp (monospace), app, event type, data JSON (expandable)
- "Clear old events" button (keeps last 100)
- Event count badge

**Shared Context Inspector:**
- Live view of `shared_context` object
- Each field on its own row with label + value
- Value shows "Not set" in `text-muted` when null
- Last updated time
- Updated by (which app last wrote it)

**Alert Rules:**
- List of active alert conditions
- Toggle each on/off
- Default alerts:
  - App offline > 5 minutes
  - No ecosystem events > 30 minutes
  - CredVault locked > 15 minutes during active session
  - SignalBoard unread > 20

---

### Screen 4: Settings

**Sections:**

**General:**
- Operator name (editable, saves to config)
- Dashboard refresh interval (5s / 10s / 30s)
- Default view on open (Main / Profile / Ecosystem)

**Notifications:**
- Toggle: macOS notifications for ecosystem events
- Toggle: Alert sound on threshold breach
- Alert threshold configuration

**Display:**
- Full-screen mode toggle
- Second-monitor preference
- Activity feed max items shown (25 / 50 / 100)

**Config Paths:**
- Show path to `cybertools-config.json`
- Show path to `ecosystem-events.json`
- "Reveal in Finder" buttons

---

## SIDEBAR NAVIGATION

```
⚡ CyberOS Dashboard
─────────────────────
🏠 Dashboard          ← default
👤 Operator Profile
🌐 Ecosystem Status
🔔 Alerts
⚙  Settings
─────────────────────
[Ecosystem Health: 10/12 apps active]
```

---

## ZUSTAND STORES

### `useDashboardStore`

```typescript
interface DashboardState {
  // Config data
  config: CybertoolsConfig | null;
  configLastModified: Date | null;
  
  // Ecosystem events
  events: EcosystemEvent[];
  unreadEventCount: number;
  
  // Operator profile (derived from config)
  operatorProfile: OperatorProfile | null;
  
  // App statuses (derived from config)
  appStatuses: AppStatusMap;
  
  // Active session context
  sharedContext: SharedContext | null;
  
  // UI state
  activeView: 'dashboard' | 'profile' | 'ecosystem' | 'alerts' | 'settings';
  isFullScreen: boolean;
  alertPanelOpen: boolean;
  
  // Alerts
  activeAlerts: Alert[];
  
  // Actions
  loadConfig: () => Promise<void>;
  loadEvents: () => Promise<void>;
  startWatching: () => void;
  stopWatching: () => void;
  markEventsRead: () => void;
  setActiveView: (view: DashboardState['activeView']) => void;
  launchApp: (appKey: string) => Promise<void>;
}
```

---

## TYPE DEFINITIONS

```typescript
interface CybertoolsConfig {
  shared_context: SharedContext;
  operator_profile: OperatorProfile;
  cyberlab_status: CyberlabStatus;
  recondesk_status: RecondeskStatus;
  ghostvault_status: GhostvaultStatus;
  vaultscraper_status: VaultscraperStatus;
  signalboard_status: SignalboardStatus;
  credvault_status: CredvaultStatus;
  playbookstudio_status: PlaybookstudioStatus;
  reportforge_status: ReportforgeStatus;
  terminallink_status: TerminallinkStatus;
  networkmap_status: NetworkmapStatus;
  [key: string]: unknown;
}

interface SharedContext {
  activeLab: string | null;
  activeTarget: string | null;
  activeIP: string | null;
  activePlaybook: string | null;
  lastUpdated: string;
  updatedBy: string;
}

interface OperatorProfile {
  operatorName: string;
  totalLabsCompleted: number;
  totalFlags: number;
  totalCredentials: number;
  currentStreak: number;
  lastActiveDate: string;
  skillProgress: {
    web: number;
    network: number;
    activeDirectory: number;
    linux: number;
    windows: number;
    crypto: number;
    forensics: number;
  };
}

interface EcosystemEvent {
  id: string;
  timestamp: string;
  app?: string;
  appName?: string;   // legacy schema
  event?: string;
  eventType?: string; // legacy schema
  data?: Record<string, unknown>;
}

interface Alert {
  id: string;
  type: 'app_offline' | 'no_events' | 'credvault_locked' | 'high_unread';
  severity: 'warning' | 'critical';
  message: string;
  triggeredAt: Date;
  appKey?: string;
}
```

---

## IPC HANDLERS REQUIRED

```typescript
// In main process:
ipcMain.handle('dashboard:config:read', async () => {
  // Read ~/cybertools-config.json
  // Return parsed JSON or error
})

ipcMain.handle('dashboard:events:read', async () => {
  // Read ecosystem-events.json
  // Return array of events
})

ipcMain.handle('dashboard:app:launch', async (event, appKey: string) => {
  // Read execPath from config for appKey
  // spawn the app process
  // Return { success: boolean }
})

ipcMain.on('dashboard:watch:start', (event) => {
  // Start fs.watch on both config files
  // Send 'dashboard:config:changed' to renderer on change
})
```

---

## COMPONENT ARCHITECTURE

```
src/
├── renderer/
│   ├── App.tsx                          # Root, layout wrapper
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── dashboard/
│   │   │   ├── ActiveSessionBanner.tsx
│   │   │   ├── OperatorProfileCard.tsx
│   │   │   ├── SkillRadar.tsx           # SVG spider chart
│   │   │   ├── EcosystemHealthBar.tsx
│   │   │   ├── AppStatusGrid.tsx
│   │   │   ├── AppStatusCard.tsx
│   │   │   └── ActivityFeed.tsx
│   │   ├── profile/
│   │   │   ├── StreakCalendar.tsx       # GitHub-style heatmap
│   │   │   ├── SkillRadarLarge.tsx
│   │   │   ├── LabHistoryTable.tsx
│   │   │   └── StatsRow.tsx
│   │   ├── ecosystem/
│   │   │   ├── ConfigInspector.tsx
│   │   │   ├── AppStatusTable.tsx
│   │   │   ├── EventLog.tsx
│   │   │   └── SharedContextInspector.tsx
│   │   └── shared/
│   │       ├── MetricCard.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── TimeAgo.tsx
│   │       └── Toast.tsx
│   ├── stores/
│   │   └── useDashboardStore.ts
│   ├── hooks/
│   │   ├── useConfigWatcher.ts
│   │   └── useEventFeed.ts
│   ├── types/
│   │   └── ecosystem.ts
│   └── utils/
│       ├── configParser.ts
│       ├── eventParser.ts              # handles both event schemas
│       ├── timeAgo.ts
│       └── alertEngine.ts
```

---

## ANIMATIONS

- **App status cards:** stagger-entrance on initial load (40ms between cards, 200ms each)
- **Activity feed:** new events slide in from right, existing events shift down
- **Skill radar:** draw axes and polygon on mount (800ms, ease-out)
- **Streak calendar:** fade in cells row by row (stagger 10ms per row)
- **Active session banner:** slide down from top when context appears, slide up when cleared
- **Metric numbers:** count up from 0 to actual value on first render (600ms)
- **Alert panel:** slide in from right (250ms)
- **Health bar dots:** pulse animation on active dots

---

## CRITICAL REQUIREMENTS

1. The app must handle a missing or corrupted `cybertools-config.json` gracefully — show an error state with a path and instructions, not a crash
2. Both event schemas (`app`/`event` and `appName`/`eventType`) must parse correctly
3. Config polling must not cause UI jank — use debounced state updates
4. The streak calendar must correctly compute from `lastActiveDate` — if it was not today, show the "streak at risk" warning
5. Launching apps via IPC must handle the case where `execPath` is not set — show an "App not configured" tooltip
6. The dashboard must be usable at 1200×800 minimum and scale to ultrawide
7. All times shown in local timezone, with UTC available on hover

---

## DELIVERABLES

Produce all of the following:

1. Complete component files (every component listed in the architecture above)
2. Zustand store (`useDashboardStore.ts`)
3. All hooks (`useConfigWatcher.ts`, `useEventFeed.ts`)
4. All type definitions (`ecosystem.ts`)
5. All utility functions
6. Main process IPC handlers (`main/ipc/dashboard.ts`)
7. Preload bridge additions
8. Tailwind config additions (if any new tokens needed beyond Design Bible)
9. `IMPLEMENTATION_PLAN.md` for CyberOS Dashboard listing files to create, files to modify, migration strategy, and validation steps

---

*Read CYBEROS_DESIGN_BIBLE.md before starting. Every decision traces back to real functionality.*
