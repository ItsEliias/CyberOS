# VaultCore — Internal Documentation

> CYBERTOOLS Ecosystem | Version 1.0 | Author: ItsEliias

---

## Table of Contents

1. [What VaultCore Is](#1-what-vaultcore-is)
2. [Tech Stack](#2-tech-stack)
3. [App Structure — File and Folder Map](#3-app-structure--file-and-folder-map)
4. [UI Architecture](#4-ui-architecture)
5. [Features Overview](#5-features-overview)
6. [Scraper System](#6-scraper-system)
7. [Processor System](#7-processor-system)
8. [Conflict Resolution](#8-conflict-resolution)
9. [Ecosystem Bus](#9-ecosystem-bus)
10. [IPC — Main to Renderer Communication](#10-ipc--main-to-renderer-communication)
11. [Ecosystem Communication](#11-ecosystem-communication)
12. [Data Layer](#12-data-layer)
13. [Use Cases](#13-use-cases)
14. [Entry Points and Build](#14-entry-points-and-build)

---

## 1. What VaultCore Is

VaultCore is the **centralized vault orchestration and scraping engine** of the CYBERTOOLS ecosystem. It sits at the data backbone of the platform — its job is to pull information from the internet into a local Obsidian-compatible vault, maintain the health of that vault, and broadcast operational state to the rest of the ecosystem.

From the ecosystem spec:

> "VaultCore is the operational backend intelligence layer."

It is designed to feel like a professional data pipeline dashboard — precise, trustworthy, and restrained. Not a hacker toy. Not a bulk downloader. A structured intelligence ingestion platform.

**Core responsibilities (from the ecosystem spec):**
- Source scraping
- Vault synchronization
- Note organization
- Metadata indexing
- Conflict resolution
- Source management
- Telemetry
- Vault analytics
- Health monitoring

Every note VaultCore creates is Obsidian-native: YAML frontmatter, wikilinks, tags, and proper markdown formatting. The vault output is the canonical data store for the rest of the CYBERTOOLS ecosystem — GhostVault reads it, CyberLab references it, the Launcher monitors it.

VaultCore runs as a native Electron desktop app on Windows, macOS, and Linux. It persists in the system tray and runs scheduled scrapes silently in the background without requiring the window to be visible.

---

## 2. Tech Stack

### Runtime

| Layer | Technology |
|---|---|
| Desktop shell | Electron 31 |
| Main process | Node.js (CommonJS, `'use strict'`) |
| Renderer (legacy) | Vanilla JS (`renderer.js`) |
| Renderer (new) | React 18 + TypeScript + Zustand |
| Build tool | electron-vite 2 |
| Packaging | electron-builder 24 |

### Key Runtime Dependencies

| Package | Purpose |
|---|---|
| `playwright-core` + `@playwright/browser-chromium` | Headless Chromium for all browser-based scraping |
| `node-cron` | Cron scheduler for automatic source scraping |
| `turndown` | HTML → Markdown conversion (used in every browser scraper) |
| `cheerio` | Lightweight HTML parsing (used in RSS scraper) |
| `pdf-parse` | PDF text extraction |
| `node-fetch` | HTTP requests where Playwright is not needed (RSS, CVE) |

### Dev Dependencies

| Package | Purpose |
|---|---|
| React 18 + react-dom | Renderer framework (src/ directory) |
| Zustand | Client-side state management store |
| TypeScript 5 | Types for the src/ layer |
| Tailwind CSS 3 | Utility CSS (src/ renderer) |
| Framer Motion | Animation (src/ renderer) |
| autoprefixer + postcss | CSS pipeline |

### Node Built-ins Used

`fs`, `path`, `os`, `crypto`, `https`, `http`, `child_process`

---

## 3. App Structure — File and Folder Map

```
VaultCore/
├── main.js                  # Electron main process — window, IPC, tray, scheduler
├── preload.js               # contextBridge API surface (exposes electronAPI)
├── renderer.js              # Vanilla JS frontend — all screen logic (legacy layer)
├── scraper.js               # Scraping orchestrator — dispatches to source handlers
├── processor.js             # Post-processing — tagging, wikilinks, index, canvas
├── conflict.js              # Conflict detection, diff generation, resolution
├── vaulthealth.js           # Vault stats, duplicates, dead links, cleaner, splitter
├── sourcelibrary.js         # Source CRUD and scheduling metadata (persisted to disk)
├── ecosystem-bus.js         # Shared local event bus (JSON file watched by all apps)
├── launcher.js              # Config management, CyberLab integration, status writer
│
├── sources/                 # Individual source type scrapers
│   ├── obsidian.js          # Obsidian Publish vault scraper
│   ├── universal.js         # Generic website crawler
│   ├── github.js            # GitHub README / wiki / docs / markdown
│   ├── youtube.js           # YouTube title + description + transcript
│   ├── pdf.js               # PDF bulk text extraction
│   ├── reddit.js            # Reddit thread + top comments
│   ├── twitter.js           # Twitter/X thread linear extraction
│   ├── notion.js            # Notion public page scraper
│   ├── medium.js            # Medium / Substack articles and archives
│   ├── cve.js               # NVD CVE API → structured security notes
│   └── rss.js               # RSS feed → individual notes per article
│
├── src/                     # React/TypeScript renderer (new architecture layer)
│   ├── main/
│   │   ├── main.ts          # TS entry point for main process
│   │   ├── preload.ts       # TS preload
│   │   └── lib/             # Mirrors of root-level JS modules (TS-compatible copies)
│   │       ├── conflict.js
│   │       ├── processor.js
│   │       ├── scraper.js
│   │       ├── vaulthealth.js
│   │       ├── sourcelibrary.js
│   │       ├── ecosystem-bus.js
│   │       └── launcher.js
│   ├── renderer/
│   │   ├── App.tsx          # Root React component
│   │   ├── main.tsx         # React entry point
│   │   ├── index.html       # HTML shell
│   │   ├── env.d.ts         # Vite env types
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── ScrapeView.tsx
│   │   │   ├── SourcesView.tsx
│   │   │   ├── VaultHealthView.tsx
│   │   │   ├── SettingsView.tsx
│   │   │   └── SetupWizard.tsx
│   │   └── store/
│   │       └── index.ts     # Zustand store definition
│   └── shared/
│       └── types.ts         # Shared TypeScript types
│
├── assets/                  # Logo and icons
│   └── logo.png
├── index.html               # HTML entry (legacy renderer)
├── style.css                # Global styles (legacy renderer)
├── package.json
├── electron.vite.config.ts  # electron-vite configuration
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── start.sh                 # Dev launch helper
├── README.md
└── vaultcore-docs.md        # This file
```

**Note on dual-layer architecture:** VaultCore currently has both a legacy vanilla JS renderer (`renderer.js` / `index.html`) and a React/TypeScript `src/` layer. The root-level `.js` files represent the current working implementation. The `src/` directory is a parallel build using the React stack, following electron-vite conventions. The `src/main/lib/` directory contains copies of the same modules to make them importable within the vite build.

---

## 4. UI Architecture

### Screens (Views)

All navigation is managed by `navigateToScreen(screenId)` in `renderer.js`. The `ViewId` type in `src/shared/types.ts` defines the canonical screen identifiers:

```typescript
type ViewId = 'scrape' | 'sources' | 'health' | 'settings' | 'schedules' | 'logs';
```

| Screen ID | Name | Purpose |
|---|---|---|
| `scrape` | Scrape | Main scraping interface — source type picker, URL input, options, live log |
| `sources` | Source Library | Saved sources with status cards, scheduling, knowledge gap report |
| `health` | Vault Health | Stats, duplicate detector, dead link finder, markdown cleaner, note splitter |
| `settings` | Settings | Vault path, theme, tray behavior, notifications, CyberLab status, factory reset |
| `schedules` | Schedules | View and manage all scheduled sources, run-all button |
| `logs` | Logs | Historical scrape log from `_scrape_log.json`, filterable by type, CSV export |

### Special UI States

- **Setup Wizard** — shown on first launch (no `cybertools-config.json`). Three-step: vault path selection, theme selection, finish. Skipped automatically if config exists.
- **Splash Screen** — 2.2-second branded splash shown once per launch.
- **System Tray** — app persists here when window is closed (if `minimiseToTray` is enabled). Context menu: Open / Run All Sources Now / Pause / Quit.
- **Update Banner** — non-blocking banner shown at top when a newer GitHub release is detected.

### Theme System

VaultCore implements the ecosystem's layered theme architecture. Themes are a combination of:

- **Core theme** (`stealth` | `graphite` | `frost` | `oled`) — controls backgrounds, surfaces, borders, contrast
- **Personality theme** (`neutral` | `cyberpunk` | `terminal` | `threat`) — controls accent colour, glow behaviour, atmospheric tone

Themes are set as `data-core` and `data-personality` attributes on `<html>`. The theme object `{ core, personality }` is persisted to `cybertools-config.json` and shared across the ecosystem.

Keyboard shortcuts `Ctrl+1` through `Ctrl+4` switch personality themes quickly. The footer contains a quick-access theme panel.

### State Management

The React `src/` layer uses a single Zustand store (`src/renderer/store/index.ts`) with these top-level fields:

| Field | Type | Description |
|---|---|---|
| `config` | `VaultCoreConfig` | Full config from disk |
| `vaultPath` | `string` | Active vault path |
| `activeView` | `ViewId` | Current screen |
| `sources` | `Source[]` | Source library |
| `isScraping` | `boolean` | Scrape in progress |
| `isPaused` | `boolean` | Scrape paused |
| `progress` | `ScrapeProgress` | Live scrape progress |
| `logEntries` | `LogEntry[]` | Live scrape log entries |
| `lastResult` | `ScrapeResult` | Final result of last scrape |
| `vaultStats` | `VaultStats` | Vault health statistics |
| `duplicates` | `DuplicateGroup[]` | Duplicate check results |
| `deadLinks` | `DeadLink[]` | Dead link check results |
| `updateInfo` | `UpdateInfo` | GitHub update info |
| `theme` | `ThemeConfig` | Active theme |
| `plugins` | `string[]` | Detected Obsidian plugins |

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` | Start scrape |
| `Ctrl+.` | Pause / Resume scrape |
| `Ctrl+S` | Stop scrape |
| `Ctrl+1` | Stealth + Cyberpunk theme |
| `Ctrl+2` | OLED + Terminal theme |
| `Ctrl+3` | Stealth + Neutral theme |
| `Ctrl+4` | Stealth + Threat theme |
| `Ctrl+[` | Toggle options panel |
| `Ctrl+L` | Go to Source Library |
| `Ctrl+H` | Go to Vault Health |
| `Ctrl+,` | Go to Settings |
| `Ctrl+N` | Clear scrape input |
| `Ctrl+B` | Open Bulk Import modal |
| `Esc` | Close any open modal |

---

## 5. Features Overview

### Scraping Engine
Eleven source types scraped via Playwright (headless Chromium) or direct HTTP. Supports bulk URL import, incremental update mode (hash comparison), configurable request delay, pause/resume/stop controls, and automatic retry of failed URLs.

### Source Library
Persistent registry of saved scrape configurations stored in `~/cybertools-sources.json`. Each source tracks: ID, name, type, URL, last scraped timestamp, note count, status, and schedule. CRUD operations available from the UI.

### Scheduler
Per-source cron jobs backed by `node-cron`. Frequencies: Manual / Daily / Every 3 days / Weekly / Every 2 weeks. Fires even when the window is minimised to tray. Conflict strategy is configurable per scheduled source.

### Post-Processing Pipeline
After each scrape: auto-tagging (200+ cybersecurity keywords), auto-wikilinks (scans vault for note titles and inserts `[[wikilinks]]`), index note generation (`000 Index.md`), code snippet extraction (`/Snippets/`), and optional Canvas generation.

### Vault Health Suite
Five tools accessible from the Health screen:
1. **Statistics** — note count, word count, folder breakdown, most-linked, orphaned, newest, tag donut chart, source breakdown bar chart
2. **Duplicate Detector** — exact title match + fuzzy Jaccard similarity (>85% threshold)
3. **Dead Link Finder** — HEAD requests against all external URLs with status classification
4. **Markdown Cleaner** — eight cleaning operations, preview before/after, non-destructive (backups before write)
5. **Note Splitter** — splits H2/H3 headings into individual notes, generates a MOC (Map of Content)

### Knowledge Gap Report
One-click from the Source Library. Reads tags and headings from all scraped notes, reads the same from `/Writeups/`, identifies topics with 2+ vault references that have no writeup coverage. Saves a tiered priority report to `/Reports/Knowledge Gap YYYY-MM-DD.md`.

### Obsidian Plugin Awareness
On startup, reads `.obsidian/community-plugins.json`. Adjusts frontmatter and note structure based on detected plugins: Dataview (`type`, `status` fields), Templater (compatible syntax), Tasks (checklist formatting), Kanban (folder note formatting), Excalidraw (canvas note mentions).

### CyberLab Integration
Reads and writes `~/cybertools-config.json`. Shared vault path and theme are visible to CyberLab. VaultCore's Settings screen shows CyberLab connection status and an "Open CyberLab" button if installed. Status data is written every 10 seconds for other apps to read.

---

## 6. Scraper System

### Architecture Overview

The scraper is split into two layers:

1. **`scraper.js` (orchestrator)** — owns the browser lifecycle, manages state flags, dispatches to source-specific handlers, runs the post-processing pipeline, and writes notes to disk.
2. **`sources/*.js` (handlers)** — each file exports a single `scrape()` function that knows how to extract pages from one source type.

### Browser Management

VaultCore uses Playwright's `chromium` engine in headless mode. A single browser instance is reused across all pages within a scrape run and closed on completion or error.

```
getBrowser() → playwright.chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
})
```

Each page context sets:
- `userAgent: 'Mozilla/5.0 (compatible; VaultCore/1.0; +https://github.com/itsEliias/vaultcore)'`
- `ignoreHTTPSErrors: true`
- `defaultTimeout: 30000`

### Scrape State Flags

Three module-level flags control live scrape flow:

| Flag | Type | Effect |
|---|---|---|
| `scrapeAborted` | boolean | Stops iteration after current page |
| `scrapePaused` | boolean | Blocks `respectDelay()` with a polling loop (200ms intervals) |
| `failedUrls` | string[] | Accumulates URLs that failed for retry |

### `runScrape(config, vaultPath, onProgress)` — Main Entry Point

1. Resets state flags
2. Loads `_scrape_state.json` from vault root if `updateMode === 'updates'`
3. Calls `getBrowser()`
4. Dispatches to the appropriate source handler (or loops through `bulkUrls`)
5. For each returned page object:
   - Skips empty content
   - Checks incremental hash if in update mode (skips if unchanged)
   - Calls `processor.injectFrontmatter()` then `processor.autoTag()`
   - Calls `conflict.handleConflict()` with the configured strategy
   - Writes the note and updates `scrapeState[url]` with content hash
6. Saves `_scrape_state.json` after each successful write
7. Runs post-processing: `autoWikilinks` → `generateIndexNote` → `extractCodeSnippets` → optionally `generateCanvas`
8. Emits `vaultcore.sync.completed` on the ecosystem bus
9. Closes the browser

### Page Object Format

Each source handler returns an array of page objects:

```javascript
{
  url: 'https://...',          // Source URL
  title: 'Page Title',         // Used as note filename and H1
  content: '...',              // Markdown body (no frontmatter)
  sourceType: 'website',       // Source type string
  subfolder: 'optional/path',  // Appended to outputSubfolder
  meta: {                      // Optional — used by CVE scraper
    cvss: 7.8,
    severity: 'HIGH',
    cveId: 'CVE-2024-12345',
    affected: [...]
  }
}
```

### Source Type Auto-Detection (Bulk Import)

`detectTypeFromUrl(url)` maps domain patterns to source types:

| URL Pattern | Detected Type |
|---|---|
| `publish.obsidian.md` | `obsidian-publish` |
| `github.com` | `github` |
| `youtube.com`, `youtu.be` | `youtube` |
| `reddit.com` | `reddit` |
| `twitter.com`, `x.com` | `twitter` |
| `notion.so`, `notion.site` | `notion` |
| `medium.com`, `substack.com` | `medium` |
| `.xml`, `/feed`, `/rss` | `rss` |
| (fallback) | `website` |

### Output Path Construction

`buildOutputPath(page, config, vaultPath)`:

```
{vaultPath}/{outputSubfolder}/{page.subfolder}/{sanitizedTitle}.md
```

- `outputSubfolder` defaults to sanitized `sourceName` if not set
- `sanitizeFileName()` strips `<>:"/\|?*` and control chars, truncates at 200 chars
- `sanitizePath()` strips same chars and replaces spaces with hyphens

### Source Handler: `sources/cve.js`

CVE is the only non-browser scraper. It uses Node's `https` module directly against the NVD API v2.0:

```
GET https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={CVE-ID}
```

Parsed fields per CVE: description, CVSS score (v3.1 preferred, falls back to v3.0, then v2), severity, vector string, CWE IDs, affected software (parsed from CPE), published date, last modified date, references. Notes are saved under `CVEs/{year}/CVE-YYYY-NNNNN.md`.

### Source Handler: `sources/obsidian.js`

Navigates to the Obsidian Publish root URL, discovers all note links from the sidebar (`nav-file-title`, `tree-item-inner`, `a.internal-link`), queues them up, and extracts content from `.markdown-preview-view`, falling back to `article`, `main`, or `body`. Uses Turndown for HTML → Markdown conversion with custom rules for strikethrough (`~~`) and highlight (`==`).

### Source Handler: `sources/universal.js`

Generic crawler. Configurable depth (default 3) and same-domain constraint (default enabled). Tries content selectors in order: `article`, `main`, `.content`, `.post-content`, `.article-body`, `.entry-content`, `#content`, `.page-content`, `.markdown-body`, `[role="main"]`, `.container`, then falls back to `body`. Skips pages with fewer than 50 characters of extracted markdown.

### Source Handler: `sources/rss.js`

Does not use a browser. Fetches the XML feed via `node-fetch`, parses with `cheerio`, and generates one note per `<item>`. Respects `rssMaxItems` limit.

### Incremental Update Mode

When `updateMode === 'updates'`:

1. `_scrape_state.json` is read at scrape start
2. For each page, the new content's MD5 hash is compared against the stored hash
3. If identical, the page is marked `skipped`
4. If different (or new), it proceeds to conflict handling
5. After writing, `scrapeState[url]` is updated with the new hash, file path, timestamp, and title

The scrape state file also enables the conflict system to detect user edits: if the file on disk has a hash that differs from both the stored original hash and the new scraped hash, the user has edited the file since it was last scraped.

---

## 7. Processor System

`processor.js` is a pure Node.js module with no browser dependency. It runs entirely locally with no external API calls.

### `injectFrontmatter(page, config, plugins)`

Builds and prepends YAML frontmatter to every scraped note. Keys are sorted alphabetically.

```yaml
---
author: ItsEliias
last_updated: 2024-01-15T10:30:00.000Z
scraped_at: 2024-01-15T10:30:00.000Z
source_type: website
source_url: https://example.com/page
tags:
  - web-reference
title: Page Title
vault_scraper_version: 1.0
---

# Page Title

{content}
```

Plugin-specific fields added when detected:
- **Dataview**: `type: reference`, `status: imported`
- CVE meta fields (`cvss`, `severity`, `cveId`, `affected`) are merged directly into frontmatter

Source type → base tag mapping:

| Source Type | Tag |
|---|---|
| `obsidian-publish` | `obsidian-publish` |
| `website` | `web-reference` |
| `github` | `github` |
| `youtube` | `youtube` |
| `pdf` | `pdf` |
| `reddit` | `reddit-thread` |
| `twitter` | `twitter-thread` |
| `notion` | `notion` |
| `medium` | `article` |
| `cve` | `cve` |
| `rss` | `rss` |

### `autoTag(content, page)`

Scans the note body (case-insensitive) against 200+ cybersecurity keyword → tag mappings. Merges matched tags into the existing `tags:` frontmatter block without duplicates.

Keyword categories covered: Network Recon, Web Application Security, Active Directory, Privilege Escalation, Exploitation, Password Attacks, Network Attacks, Malware and C2, Cryptography, OSINT, Forensics, CTF Platforms, Cloud Infrastructure, Notable CVEs (Log4Shell, EternalBlue, etc.), Frameworks (MITRE ATT&CK, kill chain, red/blue/purple team).

Example mappings: `'kerberoasting' → '#kerberoasting'`, `'sqlmap' → '#sqlmap'`, `'bloodhound' → '#bloodhound'`, `'log4shell' → '#log4shell'`.

### `autoWikilinks(vaultPath, outputFolder)`

1. Walks the entire vault to build a title index: `Map<lowerCaseTitle, displayTitle>`
2. For each `.md` file in the output folder:
   - Extracts and preserves frontmatter
   - Replaces code blocks and existing wikilinks with placeholders
   - Applies word-boundary regex replacement for any title with 3+ chars (excluding self-references)
   - Restores placeholders
   - Writes file only if content changed

### `generateIndexNote(outputFolder, config, stats)`

Creates `000 Index.md` at the output folder root. Content:
- Frontmatter with `index` and `auto-generated` tags
- Summary line: total notes, last updated date, source URL
- Sections per subfolder, each listing `- [[NoteTitle]]` wikilinks

### `extractCodeSnippets(outputFolder)`

For every `.md` file in the output folder:
- Finds all fenced code blocks (```` ```lang ... ``` ````)
- If any exist, creates `{outputFolder}/Snippets/{noteName} — Snippets.md`
- Snippet note has its own frontmatter (`source_note: [[original]]`, tag: `snippets`)
- Appends a cross-reference link to the source note: `> See also: [[noteName — Snippets]]`

### `generateCanvas(sourceName, outputFolder, vaultPath)`

Produces an Obsidian `.canvas` JSON file:
- Each note becomes a `{ id, type: 'file', file, x, y, width: 280, height: 150 }` node
- Notes are arranged in a grid clustered by subfolder, with 310px horizontal and 200px vertical spacing between nodes
- Edges are drawn by reading each note's wikilinks and resolving targets in the note index
- Canvas file saved as `{sourceName} Canvas.canvas` in the output folder

---

## 8. Conflict Resolution

`conflict.js` handles file collisions when a scrape target already exists on disk.

### Detection

`handleConflict(outputPath, newContent, strategy, scrapeState)`:

1. If the file does not exist: return `{ action: 'wrote' }` — no conflict
2. Read existing file and compare MD5 hashes of old vs new content
3. If hashes match: return `{ action: 'skip', reason: 'identical' }` — content unchanged
4. Check `scrapeState` for the file's previously stored hash to detect user edits (`userEdited = storedHash !== existingHash`)
5. Apply strategy

### Strategies

| Strategy | Behaviour |
|---|---|
| `skip` | Never overwrite. Returns `{ action: 'skip', reason: 'conflict-skip' }` |
| `overwrite` | Always replace. Returns `{ action: 'wrote', content: newContent }` |
| `keep-both` | Writes new version as `{basename}_updated_{YYYY-MM-DD}.md`, keeps original untouched |
| `ask` | Returns full conflict payload for UI to handle: `{ action: 'conflict', existingContent, newContent, outputPath, userEdited, diff }` |
| (default/undefined) | If user has edited: returns conflict payload. If not: overwrites silently |

### Diff Generation

`generateDiff(oldContent, newContent)` produces a line-by-line diff array:

```javascript
[
  { type: 'same',   line: '...',    lineNum: 1 },
  { type: 'change', oldLine: '...', newLine: '...', lineNum: 2 },
  { type: 'add',    line: '...',    lineNum: 3 },
  { type: 'remove', line: '...',    lineNum: 4 }
]
```

`getDiff(fileA, fileB)` accepts either file paths or raw content strings.

### Resolution (User-Triggered)

`resolveConflict(resolution, vaultPath)` handles the user's decision from the conflict modal:

| Action | Effect |
|---|---|
| `overwrite` | Writes new content to `outputPath` |
| `skip` | No-op |
| `keep-both` | Writes new content to `{basename}_updated_{date}.md` |
| `merge` | Requires `mergedContent`. Backs up original (`.backup_{timestamp}`), writes merged content |

### Conflict Log

`logConflict(vaultPath, logEntry)` appends to `_scrape_log.json`. Keeps last 1,000 entries.

---

## 9. Ecosystem Bus

`ecosystem-bus.js` is the inter-app communication backbone for the entire CYBERTOOLS ecosystem.

### Design Principles

- **100% local.** No network, no WebSocket, no IPC between processes.
- **File-based.** All events are written to a single JSON file on disk.
- **Append-first.** New events are prepended (`unshift`) to the array.
- **Capped.** Maximum 150 events retained. Older events are trimmed automatically.
- **Debounced reads.** `fs.watch` callbacks are debounced to 80ms to avoid read spikes.

### File Location

```
macOS:   ~/Library/Application Support/CyberTools/ecosystem-events.json
Windows: %APPDATA%\CyberTools\ecosystem-events.json (follows OS conventions)
Linux:   ~/.config/CyberTools/ecosystem-events.json (follows OS conventions)
```

The directory is created automatically if it does not exist.

### Event Object Structure

Every event written to the bus has this shape:

```javascript
{
  id:        "1717200000000-a3f2b",  // `${Date.now()}-${random 5-char hex}`
  timestamp: "2024-01-15T10:30:00.000Z",
  app:       "VaultCore",            // emitting application name
  event:     "vaultcore.sync.completed", // dot-namespaced event type
  data:      { ... }                 // arbitrary payload object
}
```

### API

```javascript
const { emitEvent, readEvents, watchEvents } = require('./ecosystem-bus');

// Write an event
emitEvent('VaultCore', 'vaultcore.sync.completed', { source: 'HackTheBox Notes' });

// Read current event log (synchronous)
const events = readEvents();

// Watch for new events (returns fs.FSWatcher)
const watcher = watchEvents((events) => {
  // Called with full updated array, debounced 80ms
});
watcher.close(); // stop watching
```

### Events Emitted by VaultCore

| Event Type | Trigger | Payload |
|---|---|---|
| `vaultcore.app.opened` | App startup (1.5s delay) | `{ sources: number, notes: number }` |
| `vaultcore.sync.completed` | Manual scrape completed | `{ source: string }` |
| `vaultcore.sync.completed` | Scheduled scrape completed | `{ source: string }` |

### Events from the Ecosystem Spec (Future)

The ecosystem spec defines the long-term telemetry direction. Other apps in the ecosystem emit events that VaultCore and the Launcher can consume:

| App | Expected Event Types |
|---|---|
| GhostVault | `ghostvault.note.created`, `ghostvault.session.started` |
| CyberLab | `cyberlab.session.started`, `cyberlab.session.ended` |
| Launcher | `launcher.app.opened`, `launcher.app.closed` |

### How Other Apps Consume VaultCore Events

Any CYBERTOOLS app that wants to react to VaultCore events:

1. Requires `ecosystem-bus.js` (or its own copy)
2. Calls `watchEvents(callback)` — gets a live watcher on the shared file
3. Filters `events` array by `event.app === 'VaultCore'` and the specific `event.event` type
4. Reads `event.data` for the payload

Example (in another app):

```javascript
const bus = require('./ecosystem-bus');
const watcher = bus.watchEvents((events) => {
  const syncs = events.filter(e => e.app === 'VaultCore' && e.event === 'vaultcore.sync.completed');
  if (syncs.length > 0) {
    console.log('VaultCore just synced:', syncs[0].data.source);
  }
});
```

### Status Data (Not Bus Events)

VaultCore also writes operational status directly to `~/cybertools-config.json` every 10 seconds via the status writer (`launcher.js`). This is a separate mechanism from the event bus — it provides current-state polling rather than event history.

Status written under `vaultscraper_status`:

```json
{
  "activeScrape": "HackTheBox Notes",
  "scrapeProgress": 45,
  "totalSources": 12,
  "lastScrape": "2024-01-15T10:30:00.000Z",
  "nextScheduled": "2024-01-16T09:00:00.000Z",
  "vaultNoteCount": 847
}
```

---

## 10. IPC — Main to Renderer Communication

All IPC goes through the contextBridge API defined in `preload.js`. The renderer accesses everything via `window.electronAPI`.

### Invoke Channels (Renderer → Main, awaitable)

#### Config

| Channel | Payload | Return |
|---|---|---|
| `get-config` | — | `VaultCoreConfig` object |
| `set-config` | `key: string, value: any` | `boolean` |
| `config-exists` | — | `boolean` |
| `get-vault-path` | — | `string \| null` |
| `set-vault-path` | `vaultPath: string` | `true` |
| `get-theme` | — | `ThemeConfig \| string` |
| `set-theme` | `theme: ThemeConfig \| string` | `boolean` |
| `is-cyberlab-installed` | — | `boolean` |
| `open-cyberlab` | — | `boolean` |

#### Dialogs

| Channel | Payload | Return |
|---|---|---|
| `select-folder` | — | `string \| null` |
| `select-file` | `filters: FileFilter[]` | `string \| null` |
| `select-files` | `filters: FileFilter[]` | `string[]` |

#### Shell

| Channel | Payload | Return |
|---|---|---|
| `open-vault-in-obsidian` | `vaultPath?: string` | `true` |
| `open-folder` | `folderPath: string` | `true` |
| `open-external` | `url: string` | `true` |

#### Scraping

| Channel | Payload | Return |
|---|---|---|
| `start-scrape` | `ScrapeConfig` | `{ success, result } \| { error }` |
| `pause-scrape` | — | `true` |
| `resume-scrape` | — | `true` |
| `stop-scrape` | — | `true` |
| `retry-failed` | `ScrapeConfig` | `ScrapeResult` |

#### Source Library

| Channel | Payload | Return |
|---|---|---|
| `get-sources` | — | `Source[]` |
| `add-source` | `source: Partial<Source>` | `Source` (with generated id) |
| `update-source` | `id: string, source: Partial<Source>` | `Source` |
| `delete-source` | `id: string` | `true` |
| `get-source-health` | — | `HealthSummary` |
| `scrape-source-now` | `sourceId: string` | `{ success } \| { error }` |

#### Vault Health

| Channel | Payload | Return |
|---|---|---|
| `get-vault-stats` | — | `VaultStats \| null` |
| `run-duplicate-check` | — | `{ exactTitle, similarContent }` |
| `run-dead-link-check` | — | `{ total, live, dead, redirected, unknown, results }` |
| `clean-markdown` | `{ content, filePath, scope, operations }` | `{ original, cleaned, changed }` or `{ cleaned, backed }` |
| `split-note` | `filePath: string, splitPoints: string[]` | `{ success, created, mocPath }` |
| `analyse-note-headings` | `filePath: string` | `{ headings, totalLines, filePath }` |
| `merge-notes` | `noteA, noteB, keepPath` | `{ success, merged }` |
| `delete-note` | `filePath: string` | `{ success, backup }` |
| `export-dead-links-csv` | `results` | `csvPath: string` |
| `archive-wayback` | `url: string` | `true` (opens browser) |
| `generate-knowledge-gap-report` | — | `{ success, path, gaps, reportDate }` |
| `validate-links` | `folderPath?: string` | `{ total, dead, live }` |
| `generate-canvas` | `sourceName, outputFolder` | `boolean` |

#### File System

| Channel | Payload | Return |
|---|---|---|
| `read-file` | `filePath: string` | `string \| null` |
| `write-file` | `filePath, content` | `boolean` |
| `file-exists` | `filePath: string` | `boolean` |
| `list-vault-notes` | `folderPath?: string` | `string[]` (relative paths) |
| `get-vault-note-count` | — | `number` |

#### Conflict

| Channel | Payload | Return |
|---|---|---|
| `get-conflict-diff` | `fileA, fileB` | `DiffLine[]` |
| `resolve-conflict` | `{ outputPath, action, content, mergedContent }` | `{ success, action }` |

#### Settings and App

| Channel | Payload | Return |
|---|---|---|
| `factory-reset` | — | `true` |
| `check-for-updates` | — | `{ hasUpdate, version?, url?, notes? }` |
| `get-app-version` | — | `'1.0.0'` |
| `detect-obsidian-plugins` | — | `string[]` (plugin IDs) |
| `focus-window` | — | `true` |

#### Scrape State Persistence

| Channel | Payload | Return |
|---|---|---|
| `save-scrape-resume-state` | `state: object` | `boolean` |
| `load-scrape-resume-state` | — | `object \| null` |
| `clear-scrape-resume-state` | — | `boolean` |

#### Ecosystem

| Channel | Payload | Return |
|---|---|---|
| `ecosystem-emit` | `appName, eventType, data` | `true` |

### Push Events (Main → Renderer, one-way)

| Channel | Payload | When |
|---|---|---|
| `scrape-progress` | `{ type, logType, message, url, stats, percent, elapsed }` | During active scrape |
| `scrape-complete` | `{ source?, result }` | Scrape finishes |
| `scrape-error` | `{ error: string }` | Fatal scrape error |
| `schedule-complete` | `{ source, result }` | Scheduled scrape completes |
| `update-available` | `{ hasUpdate, version, url, notes }` | GitHub release check |
| `vault-health-progress` | `{ percent, message }` | During duplicate/link checks |
| `tray-pause-scrape` | — | User clicks Pause in tray menu |

---

## 11. Ecosystem Communication

VaultCore operates as the **data backbone** of the CYBERTOOLS ecosystem. Here is its full communication surface:

### What VaultCore Provides to Other Apps

1. **Scraped vault content** — notes written to the shared Obsidian vault. All other apps (GhostVault, CyberLab) read from the same vault path stored in `cybertools-config.json`.

2. **Ecosystem events** — written to `~/Library/Application Support/CyberTools/ecosystem-events.json`:
   - `vaultcore.app.opened` on startup
   - `vaultcore.sync.completed` after every scrape

3. **Live status** — written to `cybertools-config.json` under `vaultscraper_status` every 10 seconds:
   - `activeScrape` — currently scraping source name (or null)
   - `scrapeProgress` — percent 0–100
   - `totalSources` — count of saved sources
   - `lastScrape` — ISO timestamp of last completed scrape
   - `nextScheduled` — ISO timestamp of next scheduled run
   - `vaultNoteCount` — total `.md` files in vault

4. **App presence** — written to `cybertools-config.json` under `vaultscraper.installed`, `vaultscraper.version`, `vaultscraper.execPath` on every startup.

### What VaultCore Reads from Other Apps

1. **`cybertools-config.json`** (shared config file, `~/cybertools-config.json`):
   - `obsidianVaultPath` — the vault location (shared with CyberLab)
   - `theme` — the shared theme config object
   - `minimiseToTray` — tray behaviour preference
   - `notifications` — desktop notification preference
   - `cyberlab.installed`, `cyberlab.execPath` — for CyberLab detection and launch

2. **Obsidian community plugins** — reads `.obsidian/community-plugins.json` inside the vault to adjust note formatting.

### Config File Schema (`~/cybertools-config.json`)

```json
{
  "obsidianVaultPath": "/Users/user/vault",
  "theme": { "core": "stealth", "personality": "neutral" },
  "minimiseToTray": true,
  "notifications": true,
  "vaultscraper": {
    "installed": true,
    "version": "1.0.0",
    "execPath": "/Applications/VAULTCORE.app/..."
  },
  "vaultscraper_status": {
    "activeScrape": null,
    "scrapeProgress": null,
    "totalSources": 12,
    "lastScrape": "2024-01-15T10:30:00.000Z",
    "nextScheduled": "2024-01-16T09:00:00.000Z",
    "vaultNoteCount": 847
  },
  "cyberlab": {
    "installed": true,
    "execPath": "/Applications/CyberLab.app/..."
  }
}
```

### Source Library Storage (`~/cybertools-sources.json`)

```json
[
  {
    "id": "uuid",
    "name": "HackTheBox Notes",
    "type": "obsidian-publish",
    "url": "https://publish.obsidian.md/...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastScraped": "2024-01-15T10:30:00.000Z",
    "noteCount": 42,
    "status": "up-to-date",
    "schedule": {
      "enabled": true,
      "frequency": "weekly",
      "cronExpression": "0 9 * * 1",
      "conflictStrategy": "skip",
      "nextRun": "2024-01-22T09:00:00.000Z"
    },
    "lastResult": {
      "saved": 5, "updated": 2, "skipped": 35, "failed": 0
    }
  }
]
```

Source statuses: `never-scraped` | `up-to-date` | `updates-available` | `error`

---

## 12. Data Layer

### Config Files (User Home Directory)

| File | Purpose |
|---|---|
| `~/cybertools-config.json` | Shared ecosystem config (vault path, theme, status, app presence) |
| `~/cybertools-sources.json` | Source library (all saved scrape configurations) |

### Ecosystem Event Bus

| File | Purpose |
|---|---|
| `~/Library/Application Support/CyberTools/ecosystem-events.json` | Shared event log, max 150 entries, all CYBERTOOLS apps read/write |

### Vault-Resident Files

These files are written inside the user's Obsidian vault root:

| File | Purpose |
|---|---|
| `_scrape_state.json` | Per-URL content hashes and metadata for incremental updates |
| `_scrape_log.json` | Timestamped scrape event log (max 1,000 entries) |
| `_link_validation.json` | Dead link check results (raw) |
| `_link_validation.csv` | Dead link check results (exported CSV) |
| `_scrape_log_export.csv` | Exported scrape log CSV |

### Vault Output Structure

```
{vault-root}/
  {Source Name}/
    000 Index.md                       # Auto-generated index with [[wikilinks]]
    {subfolder}/
      Note Title.md                    # Scraped note with YAML frontmatter
    Snippets/
      Note Title — Snippets.md         # Extracted code blocks
    {Source Name} Canvas.canvas        # Obsidian Canvas (optional)
  CVEs/
    {year}/
      CVE-YYYY-NNNNN.md               # Structured CVE note
  Reports/
    Knowledge Gap YYYY-MM-DD.md        # Gap report
  _scrape_state.json
  _scrape_log.json
```

### Note Frontmatter Template

Every scraped note receives:

```yaml
---
author: ItsEliias
last_updated: 2024-01-15T10:30:00.000Z
scraped_at: 2024-01-15T10:30:00.000Z
source_type: website
source_url: https://example.com/page
tags:
  - web-reference
  - sql-injection
title: Page Title
vault_scraper_version: 1.0
---

# Page Title

{markdown content}
```

Optional Dataview fields: `type: reference`, `status: imported`

CVE-specific additional fields in frontmatter: `cvss`, `severity`, `cveId`

### Scrape State Entry Format

```json
{
  "https://example.com/page": {
    "filePath": "/Users/user/vault/Web/Page Title.md",
    "contentHash": "d41d8cd98f00b204e9800998ecf8427e",
    "scrapedAt": "2024-01-15T10:30:00.000Z",
    "title": "Page Title"
  }
}
```

### Conflict Log Entry Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "filePath": "/Users/user/vault/...",
  "strategy": "skip",
  "action": "skipped",
  "userEdited": true
}
```

---

## 13. Use Cases

### Use Case 1: Building a Cybersecurity Knowledge Base from Multiple Sources

A security researcher wants to build a structured vault from HackTheBox notes, OWASP documentation, and a curated list of CVEs.

1. Open VaultCore. Setup wizard runs on first launch — select vault folder, choose theme.
2. Navigate to Scrape screen. Select `obsidian-publish`, paste the HackTheBox publish URL, name it "HackTheBox Notes", set conflict strategy to `skip`, enable "Save to library". Click Start Scrape (`Ctrl+Enter`).
3. While scraping, the live log shows each page's status. Stats update in real time: found / saved / updated / failed / skipped.
4. Post-scrape summary appears. Open in Obsidian to verify.
5. Repeat for `website` (OWASP docs) and `cve` (paste list of CVE IDs).
6. Navigate to Source Library. All three sources appear as cards with status `up-to-date`.
7. Vault now has structured folders for each source, each with an index note and auto-generated wikilinks connecting related concepts.

### Use Case 2: Keeping Sources Automatically Synced

A CTF player wants their HackTheBox notes to update weekly without manual intervention.

1. In Source Library, click Edit on the HackTheBox source.
2. Set frequency to `Weekly`, time to `09:00`, conflict strategy to `skip`.
3. Save. VaultCore registers the cron job (`0 9 * * 1`).
4. Close the window. VaultCore minimises to tray.
5. Every Monday at 9:00 AM, VaultCore wakes, runs the scrape, and shows a desktop notification: "HackTheBox Notes — 3 new, 1 updated".
6. The `vaultcore.sync.completed` event fires on the ecosystem bus, and `vaultscraper_status` updates in the config file. The Launcher shows the activity.

### Use Case 3: Resolving a Conflict After Editing a Scraped Note

A researcher edits a scraped note to add personal notes, then re-scrapes the same source.

1. The source was scraped previously. `_scrape_state.json` recorded the content hash.
2. On re-scrape, the conflict handler reads the current file, hashes it, and compares it to the stored hash. They differ — the user has edited the file.
3. Conflict strategy is `ask`. The conflict modal opens showing the diff (old vs new, line-by-line).
4. User sees their personal additions in the existing file and the new scraped content.
5. User clicks Merge. The merge editor opens with the combined content.
6. User edits the merged content, clicks Save Merge. The original file is backed up (`.backup_{timestamp}`) and the merged version is written.

### Use Case 4: Cleaning Up a Large Vault

A vault has accumulated 800 notes with inconsistent formatting, dead links, and orphaned files.

1. Navigate to Vault Health screen.
2. Click "Refresh Stats". See: 800 notes, 12 orphaned, 47 most-linked, tag distribution chart.
3. Switch to Duplicates tab. Click Run Duplicate Check. Fuzzy Jaccard comparison runs across all notes. Three near-duplicate pairs found (>85% similar). Delete the lower-quality duplicate in each pair.
4. Switch to Dead Links tab. Click Run Dead Link Check. HEAD requests test all external URLs. 23 dead links found. Export to CSV. For each dead link, click the Wayback Machine button to find an archived version.
5. Switch to Cleaner tab. Select scope: Vault. Enable: Remove extra blank lines, Standardize code blocks, Strip tracking params. Click Run. 45 files cleaned, 45 backups created. No content is lost.

### Use Case 5: Identifying Knowledge Gaps Before a CTF

A CTF player has been scraping writeups and notes for months. They want to know which topics they have theory on but haven't practised in a writeup.

1. Navigate to Source Library.
2. Click "Generate Knowledge Gap Report".
3. VaultCore reads all tags and headings from scraped notes, then reads the same from `/Writeups/` folder.
4. Topics that appear 2+ times in scraped material but nowhere in `/Writeups/` are flagged.
5. Report saved to `/Reports/Knowledge Gap 2024-01-15.md`.
6. A confirmation prompt offers to open the vault in Obsidian.
7. Report shows: 8 high-priority gaps (`kerberoasting`, `dcsync`, `ssrf` with 5+ references each), 12 medium-priority, 20 lower priority.
8. Researcher uses this to choose their next HTB machine or TryHackMe challenge.

### Use Case 6: Bulk Importing Research URLs

A researcher has bookmarked 30 security blog posts from a conference and wants them all in the vault.

1. Press `Ctrl+B` to open the Bulk Import modal.
2. Paste all 30 URLs (one per line).
3. Set source type to `auto` (VaultCore detects each URL's type), output folder to `Conference2024`, conflict strategy to `skip`.
4. Click Start Bulk Import.
5. VaultCore iterates through each URL, auto-detects type (medium articles → `medium`, github links → `github`, general sites → `website`), scrapes each with the configured delay between requests.
6. All 30 notes land in `vault/Conference2024/` with frontmatter, auto-tags, and wikilinks.

---

## 14. Entry Points and Build

### Development

```bash
# Install all dependencies (includes Chromium download via Playwright)
npm install

# Start in dev mode (electron-vite with hot reload)
npm start

# Alternative: use the shell helper
./start.sh
```

`npm start` runs `electron-vite dev`. The app loads from the `src/` directory via Vite's dev server.

### Production Build

```bash
npm run build         # All platforms
npm run build:mac     # macOS .dmg (arm64 + x64)
npm run build:win     # Windows .exe (NSIS installer, x64)
npm run build:linux   # AppImage + .deb
```

`npm run build` runs `electron-vite build` (transpiles `src/` to `out/`) then `electron-builder` (packages into distributables in `dist/`).

**Important:** Place `assets/logo.png` before building. The builder embeds it as the app icon for all platforms (also expects `assets/logo.ico` for Windows and `assets/logo.icns` for macOS).

### App Startup Sequence

1. `app.whenReady()` fires
2. `launcher.registerPresence(execPath)` — writes `vaultscraper.installed` to `cybertools-config.json`
3. `createWindow()` — BrowserWindow created (1200×780, min 900×650, dark background `#0e1117`, context isolation enabled)
4. `createTray()` — system tray icon initialised
5. `launcher.startStatusWriter()` — starts 10-second status write interval
6. `initSchedules()` — reads source library, starts cron jobs for all enabled schedules
7. Update check fires after 5 seconds (GitHub API query)
8. `refreshVaultNoteCount()` — caches vault note count
9. `ecosystemBus.emitEvent('VaultCore', 'vaultcore.app.opened', ...)` fires after 1.5 seconds

In the renderer, `DOMContentLoaded` fires and `initApp()`:
1. Checks `configExists()` via IPC
2. If config exists: reads config, applies theme, shows 2.2s splash, shows main app
3. If no config: shows splash, then shows setup wizard
4. Registers all event listeners and IPC listeners
5. Calls `refreshSourceLibrary()` to populate sources
6. Detects Obsidian plugins
7. Navigates to `scrape` screen

### Electron Security Configuration

```javascript
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,   // renderer cannot access Node APIs directly
  nodeIntegration: false,   // no Node in renderer
  sandbox: false,           // preload needs Node (for IPC bridge)
  webSecurity: true         // standard same-origin policy
}
```

All Node access from the renderer goes through the contextBridge (`window.electronAPI`). The renderer has no direct filesystem or IPC access.

### Single-Instance Lock

`app.on('second-instance', ...)` brings the existing window to focus rather than launching a second instance.

### Quit Behaviour

- Closing the window minimises to tray (if `minimiseToTray` is enabled)
- Right-click tray → Quit: stops the status writer, destroys all cron jobs, calls `app.exit(0)`
- `app.on('before-quit', ...)`: same cleanup on any quit path

### Requirements

- Node.js 18+
- npm 9+
- Chromium is downloaded automatically by Playwright on `npm install` (`postinstall: electron-builder install-app-deps`)

---

*VAULTCORE v1.0 — ItsEliias | CYBERTOOLS Ecosystem*
