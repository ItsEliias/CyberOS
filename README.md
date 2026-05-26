# CYBERTOOLS LAUNCHER
### ItsEliias CyberTools Suite — Unified Hub

A production-quality system tray application for Windows, Mac, and Linux that provides one-click launching, live status, and a unified activity feed for the ItsEliias CyberTools suite: **CyberLab Companion** and **VaultCore**.

---

## Quick Start

```bash
npm install
npm start
```

To build distributable packages:

```bash
npm run build:win    # Windows .exe installer
npm run build:mac    # macOS .dmg
npm run build:linux  # AppImage + .deb
```

---

## How It Works

The launcher lives **entirely in the system tray** — no window in the taskbar or dock.

- **Left-click** the tray icon → opens/closes the launcher panel
- **Right-click** → context menu with direct app shortcuts
- **Clicking outside** the panel → closes it
- On first launch, a splash screen shows for 1.5 seconds, then the app hides to the tray

---

## Providing Your Tray Icon

Place a PNG file at `assets/tray-icon.png`. See `assets/tray-icon-placeholder.txt` for specs.

If no file is provided, a generated "CT" fallback icon is used automatically.

---

## Providing Your Logo

Place a PNG file at `assets/logo.png`. See `assets/logo_placeholder.txt` for specs.

Used in: splash screen (centred, max 180px wide) and panel header (24px height).

---

## App Icons in Cards

The launcher shows icons for CyberLab Companion and VaultCore in their respective cards.

Place logos at:
- `assets/cyberlab/logo.png` — CyberLab Companion card icon (shown at 32px)
- `assets/vaultscraper/logo.png` — VaultCore card icon (shown at 32px)

If not found, "CC" and "VC" text placeholders are used.

---

## Registering CyberLab Companion

CyberLab Companion registers itself by writing to `~/cybertools-config.json`:

```json
{
  "cyberlab": {
    "installed": true,
    "execPath": "/path/to/CyberLab Companion.exe"
  },
  "cyberlab_status": {
    "lastActive": "2025-01-15T14:30:00.000Z",
    "sessionActive": true,
    "currentLab": "Lame (HTB)",
    "sessionStart": "2025-01-15T13:00:00.000Z",
    "hintLevel": "Nudge",
    "streak": 7,
    "labsDone": 42,
    "findingsCount": 3
  }
}
```

`cyberlab_status` should be updated every 10 seconds while CyberLab is running.

**Note:** You can also locate CyberLab manually via **Settings → Apps → CyberLab Companion → Locate**.

---

## Registering VaultCore

VaultCore registers itself by writing to `~/cybertools-config.json`:

```json
{
  "vaultscraper": {
    "installed": true,
    "execPath": "/path/to/vault-scraper"
  },
  "vaultscraper_status": {
    "lastActive": "2025-01-15T14:30:00.000Z",
    "activeScrape": null,
    "lastScrape": "2025-01-15T12:00:00.000Z",
    "nextScheduled": "2025-01-16T00:00:00.000Z",
    "vaultNoteCount": 1847,
    "totalSources": 12,
    "lastScrapeNew": 5,
    "lastScrapeUpdated": 23
  }
}
```

`vaultscraper_status` should be updated every 10 seconds while VaultCore is running.

---

## VaultCore Quick Trigger

The **⟳ Update Now** button on the VaultCore card writes a trigger key to
`~/cybertools-config.json`:

```json
{
  "vaultscraper_trigger": {
    "action": "update_now",
    "timestamp": "2025-01-15T14:30:00.000Z"
  }
}
```

VaultCore should poll this key on its 5-second config check. When detected:
1. Start an incremental update on all scheduled sources
2. Remove the `vaultscraper_trigger` key from the config

---

## Custom Shortcuts

Add up to **4 custom app shortcuts** (the "PINNED" section):

1. Click **+** (the add shortcut button below the app cards), or go to **Settings → Custom Shortcuts → Add Shortcut**
2. Fill in: Name (required), Description (optional), Executable path (required), Icon PNG (optional)
3. The shortcut appears as a card — click "Open →" to launch

Right-click or hover over a card to reveal the remove (✕) button.

---

## Shared Config — `~/cybertools-config.json`

All three CyberTools apps share this single config file. The launcher reads it every 5 seconds.

| Key | Type | Purpose |
|-----|------|---------|
| `obsidianVaultPath` | string | Shared Obsidian vault location |
| `theme` | string | `cyberpunk` / `terminal` / `stealth` / `warrior` |
| `cyberlab.installed` | bool | Whether CyberLab is registered |
| `cyberlab.execPath` | string | Path to CyberLab executable |
| `cyberlab_status` | object | Live status from CyberLab (updated every 10s) |
| `vaultscraper.installed` | bool | Whether VaultCore is registered |
| `vaultscraper.execPath` | string | Path to VaultCore executable |
| `vaultscraper_status` | object | Live status from VaultCore (updated every 10s) |
| `vaultscraper_trigger` | object | Written by launcher to trigger scrape; consumed by VaultCore |
| `launcher.customSlots` | array | User-configured custom shortcuts (max 4) |
| `launcher.activityFeed` | array | Rolling activity log (last 50 entries) |

---

## Themes

Four themes are available — select from the compact dropdown in the panel header, or from **Settings → Theme**:

| Theme | Look |
|-------|------|
| **Cyberpunk** | Dark purple/cyan, grid texture, monospace font |
| **Terminal** | Matrix green on black, monospace, blinking cursor |
| **Stealth** | Dark navy/blue, flat minimal (default) |
| **Warrior** | Deep red on near-black, red accents, vignette |

Theme changes apply instantly to the launcher and are stored in the shared config — all CyberTools apps pick up the change on their next config poll.

---

## Notifications

The launcher sends system desktop notifications for:

- **Flag captured** — when `cyberlab_status.findingsCount` increases
- **Vault scrape complete** — when an active scrape finishes
- **App registered** — first time CyberLab or VaultCore appears in config
- Clicking a notification opens the relevant app

---

## Auto-Update Check

On launch, the launcher silently checks a GitHub releases API for a newer version. If found, a subtle banner appears inside the panel with a "View Release" button.

To configure a custom update URL, set `launcher.updateUrl` in the config:

```json
{
  "launcher": {
    "updateUrl": "https://api.github.com/repos/youruser/yourrepo/releases/latest"
  }
}
```

---

## Platform Notes

| Platform | Tray | Dock/Taskbar | Package |
|----------|------|--------------|---------|
| Windows | System taskbar tray | Hidden (skipTaskbar) | NSIS .exe |
| macOS | Menu bar (NSStatusItem) | Hidden (LSUIElement + dock.hide()) | .dmg |
| Linux | System tray (AppIndicator/SNI) | Hidden | AppImage + .deb |

**Linux note:** System tray support requires a compatible desktop environment (GNOME with extension, KDE, XFCE, etc.). Some GNOME shells require the "AppIndicator" extension.

---

## File Structure

```
cybertools-launcher/
├── main.js          Electron main process
├── preload.js       contextBridge API
├── config.js        Config file R/W logic
├── launcher.js      Status parsing, time helpers
├── index.html       Panel UI markup
├── style.css        All four themes + animations
├── renderer.js      Frontend logic
├── package.json     npm manifest + electron-builder config
├── assets/
│   ├── logo.png                  Your logo (place here)
│   ├── tray-icon.png             Your tray icon (place here)
│   ├── cyberlab/logo.png         CyberLab card icon (place here)
│   └── vaultscraper/logo.png     VaultCore card icon (place here)
└── README.md
```
