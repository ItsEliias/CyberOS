Build me a complete, production-quality desktop application (Windows, Mac, and Linux) called VAULT SCRAPER. It scrapes websites, documents, and online content and saves everything as clean, structured Obsidian-compatible markdown files into the user's local Obsidian vault. This is a companion app to CYBERLAB COMPANION and must look and feel identical to it — same UI structure, same four themes, same branding, same component style. This must be a fully working app — not a prototype or skeleton. Every feature described below must be implemented and functional.

---

## PERSONAL BRANDING

The app is personalised for ItsEliias.
- Each app has its own assets/logo.png — the user places whichever PNG they choose into each app's assets folder independently. No shared logo — fully customisable per app.
- Splash screen on launch: assets/logo.png centered (max 180px wide, auto height, maintain aspect ratio), "VAULT SCRAPER" beneath in app title font, "// ItsEliias" as subtle subtitle below that. White background splash fades to app background in 2 seconds. If logo.png not found, show styled "VS" text mark instead.
- assets/logo.png displayed at 24px height in top bar beside app title. Aspect ratio preserved. If not found, show styled "VS" placeholder in accent colour.
- Status bar always ends with "ItsEliias // VAULT SCRAPER v1.0"
- Window title bar: "VAULT SCRAPER — ItsEliias"

---

## SHARED CONFIG & FIRST LAUNCH

On launch, check for ~/cybertools-config.json:

If it EXISTS:
- Read the obsidianVaultPath value
- Read theme preference if set
- Skip setup wizard entirely — go straight to splash screen then main app
- Show a subtle "Vault loaded from CyberLab config" notice on first run

If it does NOT exist (standalone install, CyberLab not installed):
- Show a clean 3-step setup wizard:
  Step 1 — Welcome: logo, title, "Let's get you set up", Next
  Step 2 — Obsidian Vault: folder picker for vault path, saved to ~/cybertools-config.json
  Step 3 — Theme: three theme previews side by side, click to select
- After setup, proceed to main app

Always write back to ~/cybertools-config.json when vault path or theme changes so CyberLab stays in sync.

---

## LAUNCHER INTEGRATION

On launch, register presence in ~/cybertools-config.json:
- Add/update "vaultscraper" key:
  - installed: true
  - version: "1.0"
  - execPath: path to executable

Every 10 seconds while running, write status to ~/cybertools-config.json under "vaultscraper_status":
  - activeScrape: source name or null
  - scrapeProgress: percentage 0-100 or null
  - totalSources: number of configured sources
  - lastScrape: ISO timestamp of last completed scrape
  - nextScheduled: ISO timestamp of next scheduled scrape or null
  - vaultNoteCount: total .md files in vault (cached, updated after each scrape)

Accept --launcher-open command line argument to bring window to focus when triggered by launcher.

---

## DESIGN PHILOSOPHY

Identical to CyberLab Companion. Clean, professional, never cluttered. Features hidden until needed. Collapsible panels, tabs, contextual visibility. When a scrape is running the progress screen is front and centre. When idle the source library is the home screen. Every screen has one job.

---

## NAVIGATION — TOP BAR

Slim, always-visible. Left to right:
- Logo icon (assets/logo.png 24px or "VS" placeholder)
- App title "VAULT SCRAPER"
- "// ItsEliias" in accent colour, reduced opacity
- Active scrape indicator — pulsing accent dot + source name when scraping, grey "Idle" when not (centre)
- Icon buttons (right): Source Library | Vault Health | Settings | Theme Toggle | Minimise to Tray
- Scrape status dot: green (idle/complete) / amber spinning (scraping) / red (error)

No text labels on top bar buttons — icons with tooltips only.

---

## SCREENS

Four distinct screens:

1. Scrape Screen — main working screen, URL input and live progress
2. Source Library Screen — all saved sources, health dashboard, scheduler
3. Vault Health Screen — statistics, duplicate detector, dead link finder, markdown cleaner, note splitter
4. Settings Screen — vault path, themes, plugin awareness, preferences

---

## SCREEN 1 — SCRAPE SCREEN

### Top Section — Source Input

Source type selector (auto-detected on URL paste, manually overridable):
A row of pill toggles: Obsidian Publish | Website | GitHub | YouTube | PDF | Reddit | Twitter/X | Notion | Medium/Substack | CVE | RSS

Each type has its own input UI:

**Obsidian Publish:**
- URL field (pre-filled with https://publish.obsidian.md/addielamarr as default)
- Output subfolder field (default: mirrors source structure)
- Conflict strategy selector (see Conflict Resolution section)
- Update Mode toggle: "Full scrape" / "Updates only"

**Website (Universal):**
- URL field
- Output format: Markdown / HTML
- Crawl depth limit (number input, default 3)
- Save assets toggle (images, CSS)
- Same domain only toggle (default on)

**GitHub:**
- Repository URL field (e.g. https://github.com/carlospolop/PEASS-ng)
- What to scrape: README only / Wiki / Full docs folder / All markdown files
- Branch selector (default: main)
- Output subfolder auto-named from repo name

**YouTube:**
- Video or playlist URL
- What to extract: Title + Description + Transcript / Description only
- Auto-generate timestamp links in transcript toggle
- Output note includes: thumbnail URL as image link, channel name, upload date, video URL, full transcript with timestamps as headings

**PDF:**
- Drag-and-drop zone or file picker
- Bulk PDF support: drop multiple PDFs at once
- Extracts text, preserves headings where detectable
- Output: one .md file per PDF named after the PDF filename
- Frontmatter includes: source_file, page_count, imported_date

**Reddit:**
- Thread URL
- Extracts: post title, body text, top-level comments only (no nested comment chains)
- Filter: minimum upvote threshold (default 10) to skip noise
- Label as: [Reddit Thread] in frontmatter tags

**Twitter/X:**
- Thread URL
- Extracts thread as linear readable note
- Strips retweets and replies — original thread only
- Label as: [Twitter Thread] in frontmatter tags

**Notion:**
- Public Notion page URL
- Extracts content, preserves heading structure
- Handles Notion's toggle blocks, callouts, and tables

**Medium/Substack:**
- Article URL or publication homepage URL
- Single article: extract and save as one note
- Publication homepage: discover and queue all articles
- Clean extraction strips paywalled content gracefully

**CVE:**
- CVE ID input field (e.g. CVE-2021-44228) OR bulk list (one per line)
- Scrapes NVD (nvd.nist.gov) for each CVE
- Output note structure:
  ---
  title: CVE-XXXX-XXXXX
  cvss: [score]
  severity: [Critical/High/Medium/Low]
  affected: [software]
  published: [date]
  tags: [cve, severity-level, affected-software]
  source_url: [nvd URL]
  scraped_at: [timestamp]
  ---
  ## Description
  ## Affected Versions
  ## Impact
  ## Exploitation Notes
  ## Patches & Mitigations
  ## References
- Also links to ExploitDB if exploits exist for the CVE
- Saved to /CVEs/[Year]/CVE-XXXX-XXXXX.md in vault

**RSS:**
- RSS feed URL input
- Fetch latest N articles (default 10, configurable)
- Schedule: manual / daily / weekly
- Each article saved as individual note with source feed tagged in frontmatter
- No cost — pure XML parsing, no API

### Middle Section — Options Row

Shown below source input, adapts to source type:
- Output subfolder: text field showing where in vault files will be saved
- Delay between requests: slider 0.5s–5s (default 1.5s)
- Conflict strategy: dropdown (see Conflict Resolution)
- Update Mode toggle (where applicable)
- "Save to Source Library" toggle: save this source config for future use

### Action Row

- START button (full width, accent colour, large)
- Keyboard: Ctrl+Enter to start

### Progress Section (appears when scrape starts)

- Source name and type badge
- Progress bar (animated, full width, accent colour)
- Stats row: Pages Found | Scraped | Failed | Skipped (unchanged) | Time Elapsed | ETA
- Live log panel (scrollable, monospace, colour-coded):
  - Green: ✓ success — page title + URL + time taken
  - Red: ✗ failed — URL + error reason
  - Yellow: ⚠ conflict detected — filename + conflict type
  - Cyan: → skipped — unchanged since last scrape
  - White: ℹ info messages
- Controls row: Pause | Resume | Stop | Retry Failed
- Pause/Resume persists state to _scrape_state.json — safe to close and resume later

### Post-Scrape Actions (shown on completion)

- Summary card: X notes saved, X updated, X skipped, X failed, time taken
- "Open Vault in Obsidian" button (obsidian://open?path= URI)
- "Open Output Folder" button
- "Validate Links" button
- "View in Source Library" button
- "Run Again" button

---

## CONFLICT RESOLUTION SYSTEM

Four strategies, selected before scraping:

1. Skip All — never overwrite existing files, only write new ones (default, safest)
2. Overwrite All — always replace with scraped version (warns: "this will destroy personal edits")
3. Keep Both — rename new version as filename_updated_YYYY-MM-DD.md alongside original
4. Ask Me — pause on each conflict, show a side-by-side diff of existing vs new content, user decides per file: Overwrite / Skip / Keep Both / Merge (manual edit in modal)

Two-way sync awareness:
- After initial scrape, the app hashes every file it created and stores hashes in _scrape_state.json
- On re-scrape, before overwriting any file, check if the local file's current hash differs from the originally scraped hash
- If it differs: the user has edited the file. Show prompt: "You've edited [filename] — rescrape this note? Yes / No / Show diff"
- This protects personal notes added to scraped content from being silently destroyed
- All conflict decisions logged to _scrape_log.json

---

## INCREMENTAL UPDATE SYSTEM

Update Mode (toggle in source options):
- Reads _scrape_state.json to know what was previously scraped and content hashes
- Only fetches pages that are new or changed since last scrape
- Unchanged pages skipped entirely (logged as skipped)
- Stats show: New | Updated | Unchanged | Failed
- Conflict resolution still applies to updated pages

---

## AUTO-TAGGING & WIKILINKS (local, no API, no cost)

After every scrape, automatically:

Auto-tagging:
- Scan scraped content for cybersecurity keywords from a built-in keyword taxonomy
- Keywords mapped to tags: e.g. "privilege escalation" → #privilege-escalation, "SQL injection" → #sql-injection, "nmap" → #nmap, "Active Directory" → #active-directory
- Tags written into YAML frontmatter of each note
- Keyword taxonomy is a local JS object (no API) — comprehensive list covering all major cybersecurity topics, tools, techniques, platforms

Auto-wikilinks:
- After scraping, scan all note filenames in the vault
- For any technique, tool, CVE, or concept mentioned in a scraped note that matches another note's filename in the vault: convert to [[wikilink]] automatically
- Applied to both newly scraped notes and existing vault notes that reference new content
- Wikilink generation is local, instant, no API

Auto-index note:
- After every scrape, regenerate/update a master index note at the root of the scraped source folder
- Named 000 Index.md
- Lists and links every note in the folder organised by subfolder
- Includes: total note count, last updated timestamp, source URL
- Clean entry point into any scraped vault section

---

## CODE BLOCK EXTRACTION

When a scraped page contains code blocks:
- Extract each code block as a separate entry in a /Snippets/ subfolder note named after the source page
- The source note links to the snippets note: "See also: [[Page Name — Snippets]]"
- Snippets note contains all code blocks with their language tags and a heading per block
- Useful for command references — all commands from a HackTricks page in one clean snippets note

---

## OBSIDIAN CANVAS GENERATION

After scraping a source, optionally generate an Obsidian Canvas file (.canvas is JSON):
- Shows all scraped notes as cards on an infinite canvas
- Connected by lines where wikilinks exist between notes
- Organised by subfolder into visual clusters
- Named [Source Name] Canvas.canvas saved in the source root folder
- Opens natively in Obsidian's Canvas view — visual knowledge map of the entire scraped vault
- Toggle: "Generate Canvas" on/off in source options (off by default, opt-in)

---

## NOTE SPLITTER

Available in Vault Health screen and as a post-scrape option:
- Select any note in the vault (file picker or paste path)
- App analyses headings (h2 and h3)
- Preview panel shows proposed split: each heading becomes its own note
- User can adjust split points before confirming
- On confirm: creates individual notes for each section, each named after its heading
- Original note replaced with a MOC (Map of Content) note containing [[wikilinks]] to all the split notes
- All split notes include backlink to source in frontmatter
- Useful for large HackTricks pages covering 10+ techniques

---

## MARKDOWN CLEANER

Available in Vault Health screen and as a paste tool:
- Input: paste messy markdown or select a vault note
- Operations (toggleable checkboxes):
  - Standardise heading levels (fix h1 used mid-document)
  - Remove excessive blank lines (max 2 consecutive)
  - Fix broken wikilinks (remove illegal characters)
  - Standardise code block language tags
  - Remove HTML tags left from scraping
  - Fix list indentation
  - Normalise frontmatter (sort keys alphabetically, fix formatting)
  - Strip tracking parameters from URLs
- Preview panel: before/after side by side
- Apply to: this note only / all notes in a folder / entire vault
- Non-destructive: creates backup before cleaning

---

## BULK URL IMPORT

In the source input area, a "Bulk Import" button opens a modal:
- Large textarea: paste up to 500 URLs, one per line
- Source type selector (applies to all, or "auto-detect each")
- Output folder per type or single output folder
- Conflict strategy
- The app processes each URL exactly as if submitted individually
- Progress shown per-URL in the log panel
- Failed URLs listed at end for retry
- Useful for importing entire lists of labs, references, and resources at once

---

## OBSIDIAN PLUGIN AWARENESS

On startup, scan the vault's .obsidian/community-plugins.json to detect installed plugins.
Adapt scraped note formatting based on what's installed:

- Dataview detected: add dataview-compatible frontmatter fields (type, status, rating)
- Templater detected: note structure uses Templater-compatible syntax where appropriate
- Kanban detected: folder-based notes formatted to work as Kanban cards where relevant
- Tasks detected: any checklist items formatted as Tasks plugin compatible syntax
- Excalidraw detected: note about Canvas files also mentions Excalidraw as alternative

Show detected plugins as badges in the Settings screen under "Vault Compatibility".
If no plugins detected or vault path has no .obsidian folder: use standard Obsidian markdown only.

---

## SCREEN 2 — SOURCE LIBRARY

Home screen when idle. Clean list/card layout.

Each source card shows:
- Source name (user-defined) + type badge + URL
- Last scraped: timestamp
- Next scheduled: timestamp or "Manual only"
- Notes in vault: count
- Status: ✓ Up to date / ⚠ Updates available / ✗ Error / ○ Never scraped
- Actions: Scrape Now | Edit | Delete | View Notes | Pause Schedule

Top of screen:
- "Add New Source" button
- Search/filter bar
- Sort by: Last scraped / Name / Type / Note count

Scheduler per source:
- Frequency: Manual / Daily / Every 3 days / Weekly / Every 2 weeks
- Time of day picker
- Conflict strategy override for scheduled runs (default: Skip All to protect edits)
- Scheduled runs trigger even when window is closed (Electron background process)
- System tray icon: right-click → Open / Run All Now / Pause All Schedules / Quit
- Desktop notification on scheduled scrape completion: "Vault Scraper: [source] — X new, Y updated"

Health summary row at top of source list:
- Total sources | Total vault notes | Last activity | Storage used

---

## SCREEN 3 — VAULT HEALTH

Four tools, each in its own tab:

**Tab 1 — Statistics:**
- Total notes in vault
- Total word count
- Notes by folder (bar chart)
- Most linked notes (top 10)
- Orphaned notes (no inbound or outbound links) — list with "Add to note" option
- Newest notes (last 20 added)
- Most recently updated
- Notes by tag (donut chart)
- Source breakdown: how many notes came from each scrape source
All charts via Chart.js from CDN. Updates on demand via "Refresh Stats" button. Not automatic.

**Tab 2 — Duplicate Detector:**
- "Run Duplicate Check" button (manual, not automatic)
- Compares notes by: exact title match / content similarity (fuzzy match, >85% similar)
- Results shown as paired cards: Note A vs Note B, similarity score, file paths
- Actions per pair: Keep A (delete B) / Keep B (delete A) / Merge / Ignore
- Merge: combines both notes with a divider, user edits in preview modal before saving
- Progress indicator during check (can take time on large vaults)

**Tab 3 — Dead Link Finder:**
- "Check Dead Links" button (manual)
- Scans all .md files for external URLs
- Tests each URL with a HEAD request
- Results: ✓ Live / ✗ Dead / ⚠ Redirected / ○ Unknown (timeout)
- Dead links listed with: file containing the link, the dead URL, suggested action
- Actions: Remove link / Re-scrape URL / Archive via Wayback Machine link / Ignore
- Export results as CSV

**Tab 4 — Markdown Cleaner:**
(Same tool as described above, accessible here as dedicated tab)

---

## SCREEN 4 — SETTINGS

Sections:
- Vault Configuration: vault path picker, open folder button, detected plugins list
- Scraping Defaults: default delay, default conflict strategy, default output format
- Scheduler: global enable/disable, notification preferences
- Themes: three swatches, click to apply, previews update instantly
- Startup: launch at system startup toggle, minimise to tray on close toggle
- CyberLab Integration: status indicator showing if CyberLab is installed (reads cybertools-config.json), "Open CyberLab" button
- Reset: factory reset, clears all source configs and state files (not vault content)
- About: version, ItsEliias branding, link to GitHub
- Keyboard Shortcuts: full reference table

---

## CYBERLAB INTEGRATION

Settings screen shows CyberLab connection status (reads ~/cybertools-config.json).
"Open CyberLab" button: launches CyberLab with --launcher-open argument.
Shared vault path: both apps always read/write the same obsidianVaultPath value.
Shared theme: both apps respect the same theme preference key in config.
When Vault Scraper saves notes to the vault, CyberLab's auto-wikilink system in writeup generation picks them up automatically — no extra setup needed.

---

## KNOWLEDGE GAP REPORT

Available as a button in Source Library screen: "Generate Knowledge Gap Report"
- Reads all scraped notes (topics covered)
- Reads all CyberLab writeup notes from /Writeups/ in the vault
- Compares: topics covered in scraped material vs topics that appear in your writeups
- Produces a report note saved to vault: /Reports/Knowledge Gap YYYY-MM-DD.md
- Report contains:
  - Topics in your scraped vault you haven't encountered in any lab yet
  - Suggested areas to prioritise based on what's covered most thoroughly in your sources
  - Links to relevant sections of your scraped vault for each gap
- Runs locally, no API, pure file analysis

---

## FRONTMATTER TEMPLATE

Every scraped note regardless of source type gets consistent YAML frontmatter:
---
title: [Page/note title]
source_url: [original URL or file path]
source_type: [obsidian-publish/website/github/youtube/pdf/reddit/twitter/notion/medium/cve/rss]
scraped_at: [ISO timestamp]
last_updated: [ISO timestamp]
tags: [auto-generated from content + source type]
author: ItsEliias
vault_scraper_version: 1.0
---

Template injection:
If the user has a custom Obsidian template file, they can specify it in Settings. The scraper will merge their template frontmatter with the above standard fields. Custom fields take priority. Standard fields fill any gaps.

---

## OUTPUT FILE STRUCTURE

/vault-root/
  /[Source Name]/
    000 Index.md
    /[subfolder from URL structure]/
      note-name.md
    /Snippets/
      page-name — Snippets.md
    [Source Name] Canvas.canvas (if enabled)
  /CVEs/
    /[Year]/
      CVE-XXXX-XXXXX.md
  /Writeups/ (managed by CyberLab, not Vault Scraper)
  /Reports/
    Knowledge Gap YYYY-MM-DD.md
  _scrape_state.json
  _scrape_log.json
  _link_validation.json
  _link_validation.csv

---

## UI DESIGN — FOUR THEMES (identical to CyberLab Companion)

Theme selector: a compact dropdown in the top bar (not a toggle button). Shows theme name and a coloured dot indicator. Selecting from dropdown applies instantly. Persists to ~/cybertools-config.json (shared with CyberLab and Launcher). 300ms smooth CSS transition on all theme switches.

### Theme 1 — Cyberpunk
- Background: #0d0d1a
- Primary accent: #b44fff
- Secondary accent: #00ffe0
- Text: #e8e8ff
- Panels: #13132b
- Borders: #2a2a4a
- Inputs: #1a1a35
- Progress bar: gradient #b44fff → #00ffe0
- Buttons: #b44fff border + text, purple glow on hover
- Font: monospace
- Background: subtle CSS grid texture ~0.03 opacity
- Scrollbars: thin, #b44fff thumb

### Theme 2 — Terminal
- Background: #0a0a0a
- Primary accent: #00ff41
- Secondary accent: #00cc33
- Text: #00ff41
- Panels: #0f0f0f
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
- Panels: #161b22
- Borders: #30363d
- Inputs: #0d1117, #21262d border
- Buttons: #4a9eff text + border, blue glow on hover
- Font: system-ui, -apple-system, sans-serif
- No background texture — flat, minimal
- Scrollbars: thin, #4a9eff thumb
- Code blocks: #1c2128 background

### Theme 4 — Warrior (ItsEliias signature theme)
Inspired by the ItsEliias logo — armoured knight, black and charcoal with blood red accents and glowing red highlights.
- Background: #0a0000 (near-black with deep red undertone)
- Primary accent: #cc0000 (deep blood red)
- Secondary accent: #ff2a2a (brighter red for highlights and hover)
- Text: #e8e0e0 (warm off-white, slight red tint)
- Panels: #110000 (very dark red-black)
- Borders: #2a0a0a (dark red border)
- Inputs: #150000, #cc0000 1px border
- Buttons: #cc0000 border + text, red glow box-shadow on hover
- Font: system-ui, -apple-system, sans-serif
- Background texture: subtle CSS radial vignette darkening edges, very low opacity
- Scrollbars: thin, #cc0000 thumb
- Code blocks: #0f0000 background
- Progress bar: gradient #cc0000 → #ff2a2a
- Active/highlighted elements: #cc0000 with a soft red outer glow (box-shadow: 0 0 8px rgba(204,0,0,0.4))
- Skill tree nodes (in CyberLab): red glow on completion
- Charts: #cc0000 primary, #ff2a2a secondary
- Achievement cards: dark red border, red glow on unlock

All themes:
- Log panel colour coding: green=success, red=failed, yellow=conflict, cyan=skipped, white=info
- 300ms transition on all CSS properties
- Charts adapt to theme colours
- Status dots consistent across all themes
- Theme dropdown in top bar shows: ◉ Cyberpunk | ◉ Terminal | ◉ Stealth | ◉ Warrior

---

## WINDOW & PLATFORM

- Minimum window size: 900x650px, resizable
- Platforms: Windows, Mac, Linux (all three in package.json electron-builder targets)
- Linux: AppImage + .deb
- Mac: .dmg
- Windows: .exe installer

---

## SOUND EFFECTS (off by default, toggleable in settings)

Professional, subtle terminal-style sounds only:
- Scrape complete: clean success chime (400ms)
- Page failed: subtle error tone (200ms)
- Conflict detected: soft warning ping (150ms)
- Scheduled scrape complete: distinct notification tone (500ms)
- Update available: subtle alert (200ms)
- All sounds built into app as short base64-encoded audio data — no external files needed
- Master toggle on/off + volume slider (0-100) in Settings

---

## KEYBOARD SHORTCUTS

Ctrl+Enter — Start scrape
Ctrl+. — Pause / Resume scrape
Ctrl+S — Stop scrape
Ctrl+1/2/3 — Switch themes
Ctrl+[ — Toggle left options panel (where applicable)
Ctrl+L — Go to Source Library screen
Ctrl+H — Go to Vault Health screen
Ctrl+, — Go to Settings
Ctrl+N — New source / clear input
Ctrl+B — Bulk URL import modal
Esc — Close any open modal

---

## AUTO-UPDATE CHECKER

On launch, silently checks a configurable GitHub releases URL for a newer version.
If found: subtle banner below top bar with version number and "View Release" button.
Never interrupts a running scrape.

---

## TECH STACK

- Electron (native desktop, Windows + Mac)
- Playwright (headless Chromium for JS-rendered scraping)
- Vanilla HTML + CSS + JavaScript (renderer — no React or heavy frameworks)
- Electron IPC with contextBridge and preload.js
- Chart.js from CDN for vault statistics charts
- highlight.js from CDN for code syntax highlighting in log panel
- Node.js: fs, path, os, crypto, http/https (all built-in)
- node-fetch or built-in fetch for RSS, CVE, HTB/THM API calls
- Shared config: ~/cybertools-config.json
- package.json — runs with: npm install && npm start

---

## FILES TO DELIVER (every file complete — zero placeholders, zero TODOs)

- package.json
- main.js (Electron main, IPC, Playwright orchestration, scheduler, tray, file I/O, config management)
- preload.js (contextBridge API surface)
- scraper.js (Playwright crawl engine, all source type handlers, HTML→Markdown conversion)
- sources/obsidian.js (Obsidian Publish specific scraping logic)
- sources/github.js (GitHub scraping logic)
- sources/youtube.js (YouTube transcript + description extraction)
- sources/pdf.js (PDF text extraction and conversion)
- sources/reddit.js (Reddit thread extraction)
- sources/twitter.js (Twitter/X thread extraction)
- sources/notion.js (Notion public page extraction)
- sources/medium.js (Medium/Substack extraction)
- sources/cve.js (NVD CVE scraping and note generation)
- sources/rss.js (RSS feed parsing)
- sources/universal.js (generic website scraping)
- processor.js (auto-tagging, auto-wikilinks, index generation, canvas generation, code extraction, frontmatter injection)
- conflict.js (conflict detection, hash comparison, diff display, resolution logic)
- vaulthealth.js (statistics, duplicate detection, dead link finder, markdown cleaner, note splitter)
- sourcelibrary.js (source CRUD, scheduler, health summaries)
- launcher.js (cybertools-config.json integration, status writing, update checker)
- index.html (full app markup: all four screens, all panels, all modals)
- style.css (all four themes, transitions, progress bars, log panel, all components)
- renderer.js (all frontend logic, screen navigation, IPC calls, all UI state)
- README.md (install guide, vault setup, feature overview, keyboard shortcuts)
- assets/logo_placeholder.txt (instructions for logo.png placement)

---

## QUALITY REQUIREMENTS

- Every feature works end to end — zero stubs, zero exceptions
- Playwright scraping correctly handles all source types with proper wait logic
- Conflict resolution reliably detects user edits via content hashing — never silently destroys personal notes
- Auto-tagging keyword taxonomy is comprehensive — minimum 150 cybersecurity keywords mapped to tags
- Auto-wikilinks correctly scans vault and converts matches without breaking existing links
- All scraping is polite — delay between requests always respected
- Scheduler fires correctly in background even when window is minimised to tray
- Vault health tools are non-destructive — always backup or confirm before modifying vault files
- App never freezes — all scraping, file I/O, and vault scanning async and non-blocking
- Safe to force-quit — state written to disk after every page
- Works identically on Windows and Mac
- Shared config ~/cybertools-config.json correctly read and written, never corrupted
- Complete mental model test: ItsEliias opens the app, adds addielamarr's Obsidian Publish vault as a source, runs a full scrape, gets clean markdown notes with frontmatter and wikilinks in the correct vault folder, sets up a weekly update schedule, runs the duplicate detector, validates links, generates a knowledge gap report — all without leaving the app or hitting a single broken feature
