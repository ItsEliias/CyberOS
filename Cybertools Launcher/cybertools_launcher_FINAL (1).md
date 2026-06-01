Build me a complete, production-quality desktop application (Windows, Mac, and Linux) called CYBERTOOLS LAUNCHER. It is a lightweight system tray application that acts as a unified hub for the ItsEliias CyberTools suite — currently CYBERLAB COMPANION and VAULT SCRAPER, with slots for future tools. It displays live status from each app, provides one-click launching, shows a unified activity feed, and surfaces key stats at a glance. This must be a fully working app — not a prototype or skeleton. Every feature described below must be implemented and functional.

---

## PERSONAL BRANDING

The app is personalised for ItsEliias.
- Each app in the CyberTools suite has its own assets/logo.png — the user places whichever PNG they choose into each app's assets folder independently.
- Splash screen on launch: assets/logo.png centered (max 180px wide, auto height, maintain aspect ratio), "CYBERTOOLS" beneath in app title font, "// ItsEliias" as subtle subtitle. Fades into app after 1.5 seconds. If logo.png not found, show styled "CT" text mark.
- assets/logo.png displayed at 24px height in the panel header beside "CYBERTOOLS". If not found, "CT" placeholder in accent colour.
- Status bar always ends with "ItsEliias // CYBERTOOLS v1.0"
- Panel title bar: "CYBERTOOLS — ItsEliias"
- Tray icon: assets/tray-icon.png (16x16 or 32x32 PNG the user provides). If not found, use a generated "CT" text icon in accent colour on dark background.

---

## CORE BEHAVIOUR — TRAY-FIRST

The launcher lives primarily in the system tray:
- On launch: show splash screen briefly, then minimise to system tray. No persistent window.
- Tray icon always visible in system tray (Windows taskbar tray, Mac menu bar, Linux system tray)
- Single left-click on tray icon: toggle the launcher panel open/closed
- Right-click on tray icon: context menu with:
  - Open Launcher
  - Open CyberLab Companion
  - Open Vault Scraper
  - ─────────────────
  - Run Vault Scraper Update Now
  - ─────────────────
  - Settings
  - Quit CyberTools

The launcher panel:
- Opens as a floating panel anchored near the tray icon (bottom-right on Windows, top-right on Mac, near tray on Linux)
- Fixed size: 480x620px — not resizable
- No standard window chrome (no title bar, no min/max/close buttons) — the panel IS the UI
- Clicking anywhere outside the panel closes it
- Panel has a subtle drop shadow and rounded corners (12px)
- Smooth open/close animation: 180ms ease-out scale + fade

The launcher never appears in the taskbar/dock as a standard window. It is a tray utility only.

---

## SHARED CONFIG

Reads and writes ~/cybertools-config.json for:
- obsidianVaultPath — shared with CyberLab and Vault Scraper
- theme — shared theme preference, applied to launcher panel UI
- cyberlab.installed, cyberlab.execPath — registered by CyberLab on its launch
- cyberlab_status — live status written by CyberLab every 10 seconds
- vaultscraper.installed, vaultscraper.execPath — registered by Vault Scraper on its launch
- vaultscraper_status — live status written by Vault Scraper every 10 seconds
- launcher.customSlots — array of user-defined custom app shortcuts
- launcher.activityFeed — array of activity log entries (last 50, rolling)

Reads config every 5 seconds to refresh live status displays. Non-blocking, async file read.
Never corrupts the config file — always read-modify-write with error handling.

---

## LAUNCHER INTEGRATION — WRITING ACTIVITY

The launcher itself also writes to the activity feed in cybertools-config.json:
- When an app is launched via the launcher: log "[App name] opened"
- When a scheduled vault scrape completes (detected via vaultscraper_status change): log result
- When CyberLab session ends (detected via cyberlab_status change): log "Session complete: [lab name]"
- Activity feed capped at 50 entries, oldest removed when full

---

## PANEL LAYOUT (top to bottom)

### 1. Header Bar (slim, 44px)
- Logo icon (24px) + "CYBERTOOLS" title + "// ItsEliias" tag (left)
- Theme dropdown (compact, same four themes as other apps) (right)
- Settings gear icon (right)
- No close button — clicking outside closes the panel

### 2. Stats Strip (56px)
Four metric cards in a row:
- 🔥 [N] Day Streak (from cyberlab_status.streak)
- 🛡 [N] Labs Done (from cyberlab progress data in config)
- 📝 [N] Vault Notes (from vaultscraper_status.vaultNoteCount)
- ⬇ [N] Sources (from vaultscraper_status.totalSources)
Each card: value (large, bold, accent colour) + label (small, muted). If data unavailable: show "—"

### 3. Mode Toggle (32px)
Two pill tabs: [ My Tools ] [ Activity ]
Switches the content area below between the app grid and the activity feed.
Default: My Tools

### 4. Content Area (flexible height)

**My Tools view:**

Official Apps section label: "MY TOOLS"
App cards grid (2 columns):

**CyberLab Companion card:**
- Header: app icon (32px, CC placeholder if no logo) + status dot (green pulsing if session active, grey if idle)
- App name: "CyberLab Companion"
- Description: "AI-powered lab assistant"
- Live status rows (from cyberlab_status, refreshed every 5s):
  - Active lab: [lab name] or "No active session"
  - Session time: [elapsed] or "—"
  - Hint level: [level name] or "—"
- "Open →" button: launches CyberLab via execPath with --launcher-open argument. If not installed (cyberlab.installed not found in config): shows "Not installed" with muted styling and no button.

**Vault Scraper card:**
- Header: app icon (32px, VS placeholder if no logo) + status dot (amber spinning if scraping, green if idle, red if error)
- App name: "Vault Scraper"
- Description: "Scrape and archive websites"
- Live status rows (from vaultscraper_status, refreshed every 5s):
  - Status: [activeScrape name + progress %] or "Idle"
  - Last scrape: [relative time e.g. "2h ago"] or "Never"
  - Next scheduled: [relative time] or "Not scheduled"
- "Open →" button: launches Vault Scraper via execPath with --launcher-open. If not installed: "Not installed"
- Quick action button: "⟳ Update Now" — triggers Vault Scraper to run a scrape update immediately (writes a trigger key to cybertools-config.json that Vault Scraper watches for)

Custom Slots section label: "PINNED" (only shown if any custom slots configured)
Custom slot cards (2 columns):
- Each slot shows: custom icon (if provided, else generic app icon) + name + description (user-defined)
- "Open →" button: launches the configured executable
- On empty slots: show "+" card with dashed border and "Add shortcut" label
- Maximum 4 custom slots (2 rows of 2)
- Adding a slot: click "+" → modal with fields: Name, Description (optional), Executable path (file picker), Icon (optional PNG file picker)
- Removing a slot: long-press or right-click on card → "Remove shortcut"

**Activity view:**

Scrollable feed of the last 50 activity entries from cybertools-config.json:
Each entry:
- Coloured dot (green=CyberLab success, purple=Vault Scraper, blue=launcher action, red=error)
- Activity text with bold key info (e.g. "CyberLab — Flag captured on Lame")
- Relative timestamp (e.g. "14 minutes ago", "Yesterday", "3 days ago")
Newest at top.
"Clear Activity" button at bottom of feed (confirms before clearing).
If feed is empty: "No activity yet — open your tools to get started"

### 5. Status Bar (24px, pinned to bottom)
- VPN status: shield icon + "VPN Active — tun0" or "VPN Off" (same detection logic as CyberLab — checks os.networkInterfaces() every 30 seconds)
- Right side: "ItsEliias // CYBERTOOLS v1.0"

---

## SETTINGS PANEL

Accessible from gear icon in header. Opens as a slide-in panel over the main content (not a separate window):

Sections:
- Apps: shows registered app paths (CyberLab execPath, Vault Scraper execPath) with "Locate" buttons if not found
- Obsidian Vault: vault path display + change button (opens folder picker, writes to cybertools-config.json)
- Custom Shortcuts: list of configured custom slots with edit/remove per slot
- Theme: four theme swatches, click to apply (writes to cybertools-config.json, all apps pick up change)
- Activity: "Clear all activity" button
- About: version number, ItsEliias branding

Back button slides the settings panel away, returning to main content.

---

## APP DETECTION & HEALTH

On every config read, check:
- If cyberlab.installed exists and cyberlab.execPath points to a real file: CyberLab = connected
- If cyberlab_status.lastActive is more than 60 seconds old: CyberLab = installed but not running (status shown as stale, greyed slightly)
- Same logic for Vault Scraper
- If an app's execPath no longer exists (was moved/uninstalled): show warning banner inside that app's card: "App not found — click to locate"

---

## NOTIFICATIONS

Desktop notifications (system native, via Electron's Notification API):
- When vaultscraper_status changes from active scrape to idle: "Vault Scraper: [source] complete — X new, Y updated"
- When cyberlab_status shows a flag captured (detected via findings count increase): "CyberLab: Flag captured on [lab name] 🚩"
- When an app registers as newly installed (first time cyberlab.installed or vaultscraper.installed appears in config): "CyberLab Companion connected to launcher ✓"
- All notifications clickable: clicking opens the relevant app

---

## VAULT SCRAPER QUICK TRIGGER

The "⟳ Update Now" button on the Vault Scraper card:
- Writes { "vaultscraper_trigger": { "action": "update_now", "timestamp": [ISO] } } to cybertools-config.json
- Vault Scraper watches for this key on its 5-second config poll
- When Vault Scraper sees the trigger, it starts an incremental update run on all scheduled sources and removes the trigger key
- The launcher card immediately shows amber spinning status dot
- This allows triggering a scrape update without opening Vault Scraper at all

---

## UI DESIGN — FOUR THEMES (identical to CyberLab and Vault Scraper)

Theme selector: compact dropdown in panel header. Selecting applies instantly to all three apps via cybertools-config.json shared theme key. 300ms smooth CSS transition.

### Theme 1 — Cyberpunk
- Background: #0d0d1a
- Primary accent: #b44fff
- Secondary accent: #00ffe0
- Text: #e8e8ff
- Panels/cards: #13132b
- Borders: #2a2a4a
- Inputs: #1a1a35
- Buttons: #b44fff border + text, purple glow on hover
- Font: monospace
- Background texture: subtle CSS grid lines ~0.03 opacity
- Scrollbars: thin, #b44fff thumb
- Stats strip accent: gradient #b44fff → #00ffe0

### Theme 2 — Terminal
- Background: #0a0a0a
- Primary accent: #00ff41
- Secondary accent: #00cc33
- Text: #00ff41
- Panels/cards: #0f0f0f
- Borders: #1a3a1a
- Inputs: #0a0a0a, #00ff41 border
- Buttons: #00ff41 text + border
- Font: monospace
- Blinking cursor on status bar (CSS keyframe 1s)
- Scrollbars: thin, #00ff41 thumb

### Theme 3 — Stealth (default)
- Background: #0e1117
- Primary accent: #4a9eff
- Secondary accent: #7bb8ff
- Text: #c9d1d9
- Panels/cards: #161b22
- Borders: #30363d
- Inputs: #0d1117, #21262d border
- Buttons: #4a9eff text + border, blue glow on hover
- Font: system-ui, -apple-system, sans-serif
- No texture — flat, minimal
- Scrollbars: thin, #4a9eff thumb

### Theme 4 — Warrior (ItsEliias signature theme)
- Background: #0a0000
- Primary accent: #cc0000
- Secondary accent: #ff2a2a
- Text: #e8e0e0
- Panels/cards: #110000
- Borders: #2a0a0a
- Inputs: #150000, #cc0000 1px border
- Buttons: #cc0000 border + text, red glow on hover (box-shadow: 0 0 8px rgba(204,0,0,0.4))
- Font: system-ui, -apple-system, sans-serif
- Background: subtle radial vignette darkening edges
- Scrollbars: thin, #cc0000 thumb

All themes:
- App cards adapt fully including status dots, borders, and hover states
- Activity feed dots keep semantic colours (green/purple/blue/red) but tinted to theme
- Stats strip values in theme accent colour
- 300ms transition on all CSS properties
- Panel drop shadow adapts: Cyberpunk=purple tint, Terminal=green tint, Stealth=neutral, Warrior=red tint

---

## WINDOW & PLATFORM

- Panel size: 480x620px fixed, not resizable
- Floating panel — no taskbar presence, no dock icon (Windows: skip taskbar, Mac: LSUIElement in plist, Linux: skip taskbar)
- Platforms: Windows, Mac, Linux
- Linux: AppImage + .deb
- Mac: .dmg (note: Mac menu bar tray icon requires NSStatusItem — handle correctly in main.js)
- Windows: .exe installer
- Panel always appears on top of other windows when open (alwaysOnTop: true while visible)
- Panel position: anchored to tray icon position — calculate screen position dynamically so panel never opens off-screen

---

## AUTO-UPDATE CHECKER

On launch, silently checks a configurable GitHub releases URL for a newer version of the launcher.
If found: subtle banner inside the panel below the header with version number and "View Release" button.

---

## TECH STACK

- Electron (native desktop, Windows + Mac + Linux)
- Vanilla HTML + CSS + JavaScript (renderer — no React or heavy frameworks)
- Electron Tray API for system tray icon and context menu
- Electron IPC with contextBridge and preload.js
- Node.js fs, os, path, child_process (all built-in) — child_process.spawn to launch other apps
- No Claude API — launcher has zero AI features, zero API calls
- No Chart.js needed — stats strip is simple metric cards only
- Shared config: ~/cybertools-config.json
- package.json — runs with: npm install && npm start
- electron-builder for packaging all three platforms

---

## FILES TO DELIVER (every file complete — zero placeholders, zero TODOs)

- package.json
- main.js (Electron main, tray creation, panel window management, config polling, app launching, VPN detection, notifications, update checker, quick trigger watcher)
- preload.js (contextBridge API surface)
- config.js (cybertools-config.json read/write/watch logic, activity feed management)
- launcher.js (app card state management, custom slot CRUD, status parsing)
- index.html (full panel UI markup: splash, main panel with all sections, settings slide-in)
- style.css (all four themes, panel animations, card styles, stats strip, activity feed, tray panel shape)
- renderer.js (all frontend logic, IPC calls, theme switching, content area tabs, settings panel, live status refresh)
- README.md (install guide, setup instructions, how to register apps, custom shortcuts guide, tray icon specs)
- assets/tray-icon-placeholder.txt (instructions for providing tray-icon.png at correct sizes for each platform)
- assets/logo_placeholder.txt (instructions for logo.png)

---

## QUALITY REQUIREMENTS

- Tray icon always visible and functional — never disappears or crashes
- Panel opens/closes smoothly at correct position relative to tray icon on all three platforms
- Config polling never corrupts cybertools-config.json — robust read-modify-write with file locking awareness
- Live status refreshes every 5 seconds without any visible flicker or layout shift
- App launch via execPath works correctly on Windows (.exe), Mac (.app), and Linux (AppImage/.deb)
- Custom shortcuts correctly launch any executable on the system
- Quick trigger (Update Now) correctly communicates to Vault Scraper via config file
- VPN detection works on all three platforms
- Panel correctly positions itself near tray icon and never opens partially off-screen
- Clicking outside the panel closes it cleanly every time
- All four themes look polished and consistent with CyberLab and Vault Scraper
- Zero AI, zero API calls, zero external dependencies beyond Electron
- Safe to quit — no orphaned processes
- Complete mental model test: ItsEliias clicks the tray icon, sees CyberLab showing an active HTB session and Vault Scraper showing last scrape time, clicks "Update Now" to trigger a vault scrape without opening Vault Scraper, sees the activity feed update when the scrape completes, opens CyberLab with one click — all in under 10 seconds, never leaving the launcher panel
