# MANUS PROMPT — Cybertools Launcher
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Read `CYBEROS_DESIGN_BIBLE.md` before doing anything. It defines all colors, typography, spacing, component patterns, and animation standards. All design decisions must be consistent with it.

---

## YOUR ROLE

Produce **production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code** for the Cybertools Launcher. This is an Electron tray application — it has no Dock presence. The UI is a **frameless popup panel** that appears when the tray icon is clicked, anchored to the macOS menu bar. Output must be directly implementable. No placeholders. No pseudo-code.

---

## CONTEXT: WHAT IS CYBERTOOLS LAUNCHER?

Cybertools Launcher is the **single entry point** for the entire CyberOS ecosystem. It lives in the macOS system tray (menu bar), has no Dock icon, and provides:

1. **App launching** — one-click launch for all 12 registered CyberOS apps
2. **Ecosystem monitoring** — polls `cybertools-config.json` every 5 seconds to show each app's live status
3. **Activity feed** — shows recent events from `ecosystem-events.json`
4. **System notifications** — fires macOS notifications when notable ecosystem events occur (flag captured, session ended, scrape completed)
5. **VPN monitoring** — detects active VPN interfaces, shows status in panel
6. **App auto-detection** — on first launch, scans for app folders and auto-registers their `execPath`
7. **Custom slots** — up to 4 user-defined shortcuts for non-CyberOS tools
8. **Update checker** — polls GitHub releases API for new versions

**Accent color:** `#b44fff` (Purple)

**Window size:** `480 × 620px` popup panel (fixed, not resizable)

---

## WINDOW BEHAVIOR

This is NOT a standard Electron window. It behaves like a tray popup:

- No title bar chrome — frameless
- Appears anchored to the tray icon position in the menu bar
- Disappears when clicking outside the window (blur event closes it)
- Does not appear in the Dock or Cmd+Tab switcher
- `alwaysOnTop: true` while visible
- Smooth fade-in on show (150ms), fade-out on hide (100ms)
- Persists in memory (not destroyed on close — just hidden for performance)

---

## DATA SOURCES

### cybertools-config.json (`~/cybertools-config.json`)

Primary data source. Poll every 5 seconds. Read:

- All `[app]_status` objects (active, lastActive, and app-specific metrics)
- `shared_context` (activeLab, activeTarget, activeIP)
- `operator_profile` (operatorName, currentStreak, totalFlags)
- `[app].execPath` for each app (used to launch)
- `launcher.customSlots` (array of up to 4 `{name, execPath, icon}` objects)
- `launcher.activityFeed` (recent activity logged by launcher itself)

### ecosystem-events.json

Read on each poll cycle. Show last 20 events in the activity feed section.

### GitHub releases API

`https://api.github.com/repos/ItsEliias/CyberOS/releases/latest`

Check on startup only. If the latest tag is newer than current version, show an update badge.

---

## PANEL LAYOUT

The popup is `480 × 620px`. Design for exactly this size — no scroll on the main panel, except within the activity feed section.

```
┌──────────────────────────────────────────┐  ← 480px wide
│  ⚡ CyberOS                    [⚙] [✕]  │  ← header: 48px
├──────────────────────────────────────────┤
│  ItsEliias  🔥 4 streak  ⚑ 38 flags     │  ← operator strip: 36px
│  [●] Active Lab: Pickle Rick             │
├──────────────────────────────────────────┤
│  CORE APPS                    [6 active] │  ← section header
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ CyberLab│ │ Dash  │ │ReconDsk│       │  ← 3-col app grid
│  └────────┘ └────────┘ └────────┘       │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │GhostVlt│ │VaultCor│ │SignalBd│       │
│  └────────┘ └────────┘ └────────┘       │
├──────────────────────────────────────────┤
│  TOOLS                        [3 active] │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │CredVlt │ │Playbook│ │ReportFg│       │
│  └────────┘ └────────┘ └────────┘       │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │Terminal│ │NetwMap │ │[custom]│       │
│  └────────┘ └────────┘ └────────┘       │
├──────────────────────────────────────────┤
│  RECENT ACTIVITY                         │  ← scrollable, ~140px
│  23s  CyberLab session started          │
│  2m   ReconDesk target added            │
│  15m  GhostVault note saved             │
├──────────────────────────────────────────┤
│  [●] VPN: Connected      Updated: 3s ago │  ← footer: 32px
└──────────────────────────────────────────┘
```

---

## HEADER (48px)

- Left: Purple ⚡ lightning bolt icon + "CyberOS" in `text-md font-semibold`
- Right: Settings gear icon button (opens settings overlay within the panel), Close (✕) button
- Background: `bg-base`
- Separator: `border-b border-subtle`

---

## OPERATOR STRIP (36px)

- Operator name (from `operator_profile.operatorName`)
- Streak: fire emoji + `currentStreak` + "day streak" — hidden if streak is 0
- Flags: ⚑ + `totalFlags` + " flags"
- Active lab indicator: if `shared_context.activeLab` is set, show a pulsing red dot + "Active Lab: [name]"
- Background: `bg-elevated`
- Font: `text-sm`

---

## APP GRID

Apps are organized into two groups:

**CORE** (top group, 6 apps):
- CyberLab Companion
- CyberOS Dashboard
- ReconDesk
- GhostVault
- VaultCore
- SignalBoard

**TOOLS** (bottom group, 6 apps + custom slot):
- CredVault
- PlaybookStudio
- ReportForge
- TerminalLink
- NetworkMap
- [Custom slot — user-defined]

**Each app card (3 per row):**
```
┌────────────────┐
│  [App Icon]    │  ← 32px icon, centered
│  [● ●]         │  ← status dot (green/grey)
│  App Name      │  ← text-xs, truncated
│  Key Metric    │  ← text-xs text-muted
└────────────────┘
Width: ~140px  Height: 76px
```

- **Active state:** accent-colored status dot, name in `text-primary`
- **Inactive state:** grey dot, name in `text-secondary`
- **Hover:** `bg-interactive` + scale(1.02), 150ms
- **Click:** launch the app via IPC. If already running, bring to front.
- **Status dot:** animated pulse when app is `active: true`
- **Key metric per app:**
  - CyberLab: session name or "No session"
  - Dashboard: "Monitoring"
  - ReconDesk: "[N] targets"
  - GhostVault: "[N] notes"
  - VaultCore: "[N] sources"
  - SignalBoard: "[N] unread"
  - CredVault: "Locked" or "[N] creds"
  - PlaybookStudio: "Active" or "Idle"
  - ReportForge: "[N] reports"
  - TerminalLink: "[N] cmds"
  - NetworkMap: "No graph" or graph name
  - Custom: user-defined label

**Section headers:**
- "CORE APPS" / "TOOLS" in `text-xs text-muted uppercase tracking-wider`
- Right side: "[N] active" count badge in `text-xs`

---

## RECENT ACTIVITY FEED

- Fixed height ~140px, scrollable
- Shows last 15 events from `ecosystem-events.json`
- Each row (32px height):
  - Left: `[app accent color]` thin bar (2px)
  - Time: `text-xs text-muted monospace` (e.g., "23s", "2m", "1h")
  - App name: `text-xs` in app accent color, abbreviated if needed
  - Event: human-readable string (`session:started` → `session started`)
- Newest at top
- Auto-scrolls to top when new event arrives
- "View all" link at bottom → opens Ecosystem Status screen (or opens Dashboard)

---

## FOOTER (32px)

- Left: VPN status — green dot + "VPN: Connected" or grey dot + "VPN: Off"
  - VPN detected by checking network interfaces for known VPN patterns (tun0, utun, etc.)
  - Refreshed every 30 seconds
- Right: "Updated: [N]s ago" — time since last config poll
- Background: `bg-base`, `border-t border-subtle`
- Font: `text-xs text-muted`

---

## CONTEXT MENU (Right-click tray icon)

```
Open CyberOS Launcher
─────────────────────
CyberLab Companion        Cmd+1
CyberOS Dashboard         Cmd+2
ReconDesk                 Cmd+3
GhostVault                Cmd+4
VaultCore                 Cmd+5
SignalBoard               Cmd+6
─────────────────────
CredVault
PlaybookStudio
ReportForge
TerminalLink
NetworkMap
─────────────────────
Preferences
─────────────────────
Quit CyberOS
```

---

## SETTINGS OVERLAY (within panel)

Slides in from right when ⚙ is clicked. Covers the main panel content. 

**Settings sections:**

**App Paths:**
- Table showing each app name + configured `execPath`
- Edit button per row (file picker dialog)
- "Auto-detect" button: scans known project directory, finds electron apps, auto-fills paths

**Notifications:**
- Toggle: macOS notifications for ecosystem events
- Toggles per event type: flag captured, session started, session ended, scrape completed

**Custom Slots:**
- Up to 4 custom app shortcuts
- Each: name input, execPath picker, save/remove

**Startup:**
- Toggle: Launch on login
- Toggle: Show panel on launch

**About:**
- Current version
- Update status (check now button)
- GitHub link

---

## NOTIFICATIONS (macOS native)

Fire `Notification` via Electron's `Notification` API for:

| Ecosystem event | Notification title | Body |
|---|---|---|
| `session:started` | "Lab Session Started" | "CyberLab: [lab name]" |
| Flag captured (when `totalFlags` increases) | "Flag Captured" | "[N] total flags" |
| `scrape:completed` | "Vault Scrape Complete" | "[N] notes added" |
| `session:ended` or app closes session | "Session Ended" | "[lab name] — [duration]" |
| Any app goes offline after being active | "[App] went offline" | "Last active [timeAgo]" |

Rules:
- Do not fire duplicate notifications for the same event
- Track seen event IDs to prevent repeats across polls
- Notification click: show the launcher panel

---

## ZUSTAND STORE

```typescript
interface LauncherState {
  // Config
  config: CybertoolsConfig | null;
  lastPollTime: Date | null;
  
  // Derived
  appStatuses: AppStatusMap;
  sharedContext: SharedContext | null;
  operatorProfile: OperatorProfile | null;
  
  // Events
  recentEvents: EcosystemEvent[];
  seenEventIds: Set<string>;
  
  // VPN
  vpnConnected: boolean;
  vpnInterface: string | null;
  
  // UI
  panelVisible: boolean;
  settingsOpen: boolean;
  updateAvailable: boolean;
  updateVersion: string | null;
  
  // Actions
  startPolling: () => void;
  stopPolling: () => void;
  launchApp: (appKey: string) => Promise<void>;
  showPanel: () => void;
  hidePanel: () => void;
  checkForUpdates: () => Promise<void>;
  checkVPN: () => Promise<void>;
  fireNotificationsForNewEvents: (newEvents: EcosystemEvent[]) => void;
}
```

---

## IPC HANDLERS (main process)

```typescript
ipcMain.handle('launcher:config:read', async () => { /* read ~/cybertools-config.json */ })
ipcMain.handle('launcher:events:read', async () => { /* read ecosystem-events.json, last 20 */ })
ipcMain.handle('launcher:app:launch', async (_, appKey: string) => { /* spawn process by execPath */ })
ipcMain.handle('launcher:app:detect', async () => { /* scan project dir, find electron apps */ })
ipcMain.handle('launcher:vpn:check', async () => { /* check network interfaces */ })
ipcMain.handle('launcher:update:check', async () => { /* call GitHub releases API */ })
ipcMain.handle('launcher:config:write', async (_, patch: Partial<CybertoolsConfig>) => { /* atomic write */ })
```

---

## TRAY ICON

- SVG icon: `⚡` lightning bolt in purple `#b44fff`
- Template image: works with macOS dark/light menu bar
- Badge: red dot when there are unread notifications or alerts
- Size: 16×16px (standard macOS tray)

---

## COMPONENT ARCHITECTURE

```
src/
├── main/
│   ├── tray.ts               # Tray setup, context menu, show/hide logic
│   ├── ipc/
│   │   └── launcher.ts       # All IPC handlers
│   └── notification.ts       # Notification firing logic
├── renderer/
│   ├── App.tsx               # Root
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── OperatorStrip.tsx
│   │   ├── AppGrid.tsx
│   │   ├── AppCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── Footer.tsx
│   │   └── settings/
│   │       ├── SettingsOverlay.tsx
│   │       ├── AppPathsSection.tsx
│   │       ├── NotificationSection.tsx
│   │       ├── CustomSlotsSection.tsx
│   │       └── AboutSection.tsx
│   ├── stores/
│   │   └── useLauncherStore.ts
│   ├── hooks/
│   │   └── useConfigPoller.ts
│   └── types/
│       └── launcher.ts
```

---

## ANIMATIONS

- **Panel open:** fade in + slide down 8px, 150ms ease-out
- **Panel close:** fade out, 100ms ease-in
- **App cards on load:** stagger entrance, 40ms between cards
- **Activity feed new events:** slide in from right
- **Settings overlay:** slide in from right (full panel width), 200ms
- **Status dots:** CSS pulse animation when active
- **Update badge:** pulse animation in red

---

## CRITICAL REQUIREMENTS

1. The panel must close when clicking outside (use `blur` event on the Electron window)
2. App launching must handle the case where `execPath` is null or the binary doesn't exist — show a toast "App not configured. Set the path in Settings."
3. All 12 apps must launch correctly, including bringing existing instances to front rather than spawning duplicates
4. VPN check must not block the UI — run async in background
5. The update check must not show if network is unavailable — fail silently, don't show error state
6. Custom tray icon must work correctly on macOS Sonoma+ (template image format)
7. Poll interval must use `setInterval` managed in the store, cleaned up properly on app quit

---

## DELIVERABLES

1. All component files
2. Main process: `tray.ts`, `notification.ts`, `ipc/launcher.ts`
3. Zustand store: `useLauncherStore.ts`
4. Hook: `useConfigPoller.ts`
5. Type definitions
6. Tray icon SVG asset
7. `IMPLEMENTATION_PLAN.md` for Cybertools Launcher

---

*Read CYBEROS_DESIGN_BIBLE.md first. Every decision traces back to real functionality.*
