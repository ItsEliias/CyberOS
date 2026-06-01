# VAULTCORE — ItsEliias

> Scrape websites, documents, and online content into clean, structured Obsidian-compatible markdown — right into your local vault.

**Version:** 1.0 | **Platform:** Windows, macOS, Linux | **Author:** ItsEliias

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the app
npm start

# Build distributables
npm run build        # all platforms
npm run build:win    # Windows .exe
npm run build:mac    # macOS .dmg
npm run build:linux  # AppImage + .deb
```

**Requires:** Node.js 18+ and npm.

---

## Installation

1. Clone or download this repository
2. Run `npm install` — installs Electron, Playwright, and all dependencies
3. Run `npm start`
4. On first launch: select your Obsidian vault folder and choose a theme
5. Start scraping

If you have **CyberLab Companion** installed, Vault Scraper automatically reads `~/cybertools-config.json` and skips the setup wizard entirely — your vault path and theme are already shared.

---

## Logo Setup

Drop your own PNG into `assets/logo.png`. No other setup needed — the app scales it automatically for the splash screen, top bar, and taskbar icon. If no logo is found, a styled "VS" placeholder appears.

---

## Features

### Source Types

| Type | Description |
|------|-------------|
| **Obsidian Publish** | Scrape entire publish vaults (e.g. addielamarr's notes) |
| **Website** | Crawl any website to a configurable depth |
| **GitHub** | README, wiki, docs folder, or all markdown files |
| **YouTube** | Title + description + timestamped transcript |
| **PDF** | Bulk extract text from PDFs, one note per file |
| **Reddit** | Thread + filtered top-level comments |
| **Twitter/X** | Thread extracted as clean linear note |
| **Notion** | Public pages with toggle/callout/table support |
| **Medium/Substack** | Single articles or full publication archives |
| **CVE** | NVD lookups → structured security notes with CVSS data |
| **RSS** | Feed → individual notes per article |

### Conflict Resolution

Four strategies selectable before any scrape:

- **Skip All** — never overwrite existing files (default, safe)
- **Overwrite All** — always replace (warns about personal edits)
- **Keep Both** — saves new version as `filename_updated_YYYY-MM-DD.md`
- **Ask Me** — pauses on each conflict, shows side-by-side diff

The app hashes every file it creates. On re-scrape, if your local file's hash differs from the originally-scraped hash, you're warned that you've edited it.

### Auto-Processing (post-scrape, local, no API)

- **Auto-tagging** — 200+ cybersecurity keywords mapped to tags written into YAML frontmatter
- **Auto-wikilinks** — Scans vault for matching note titles and converts mentions to `[[wikilinks]]`
- **Index note** — `000 Index.md` at the root of each scraped source folder
- **Code snippet extraction** — Code blocks pulled into companion `/Snippets/` notes
- **Canvas generation** — Optional Obsidian Canvas (`.canvas`) file mapping all scraped notes and their wikilink connections

### Vault Health Tools

**Statistics** — Note count, word count, folder breakdown, tag donut chart, most-linked notes, orphaned notes, recently added.

**Duplicate Detector** — Exact title match + fuzzy content similarity (>85% Jaccard). Choose per pair: Keep A / Keep B / Merge / Ignore.

**Dead Link Finder** — Scans all `.md` files for external URLs, tests each via HEAD request. Results: Live / Dead / Redirected / Unknown. Export to CSV.

**Markdown Cleaner** — Apply any combination of: fix heading levels, remove extra blank lines, fix broken wikilinks, standardise code block tags, remove HTML, fix list indentation, normalise frontmatter, strip tracking parameters from URLs. Preview before/after, apply to a note, folder, or entire vault. Non-destructive — backs up before modifying.

**Note Splitter** — Select any note, pick split points from its H2/H3 headings, and the app creates individual notes + a MOC (Map of Content) linking them all.

### Source Library

- Save any scrape configuration as a reusable source
- Schedule: Manual / Daily / Every 3 days / Weekly / Every 2 weeks
- Background scheduler fires even when window is minimised to tray
- System tray icon: right-click → Open / Run All Now / Pause / Quit
- Desktop notifications on scheduled scrape completion
- Health summary row: total sources, total notes, last activity, storage used

### Knowledge Gap Report

One click from the Source Library screen:

- Reads all tags and headings from scraped notes
- Reads all tags and headings from `/Writeups/` folder
- Identifies topics well-documented in your vault that haven't appeared in any lab writeup yet
- Saves a formatted report to `/Reports/Knowledge Gap YYYY-MM-DD.md`

### Obsidian Plugin Awareness

On startup, scans `.obsidian/community-plugins.json`. If detected:

- **Dataview** — adds `type`, `status` fields to frontmatter
- **Templater** — note structure uses compatible syntax
- **Tasks** — checklists formatted as Tasks-plugin syntax
- **Kanban** — folder notes formatted as Kanban-compatible
- **Excalidraw** — Canvas generation notes mention Excalidraw as alternative

### CyberLab Integration

Both apps read/write `~/cybertools-config.json`:

- Shared vault path — notes scraped by Vault Scraper are immediately available in CyberLab
- Shared theme — one theme change syncs both apps
- CyberLab status shown in Vault Scraper Settings screen
- "Open CyberLab" button available when CyberLab is installed

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Start scrape |
| `Ctrl+.` | Pause / Resume scrape |
| `Ctrl+S` | Stop scrape |
| `Ctrl+1` | Switch to Cyberpunk theme |
| `Ctrl+2` | Switch to Terminal theme |
| `Ctrl+3` | Switch to Stealth theme |
| `Ctrl+4` | Switch to Warrior theme |
| `Ctrl+[` | Toggle options panel |
| `Ctrl+L` | Go to Source Library |
| `Ctrl+H` | Go to Vault Health |
| `Ctrl+,` | Go to Settings |
| `Ctrl+N` | Clear scrape input |
| `Ctrl+B` | Bulk URL import |
| `Esc` | Close any open modal |

---

## Themes

| Theme | Description |
|-------|-------------|
| **Cyberpunk** | Purple + cyan on near-black with grid texture |
| **Terminal** | Pure green monochrome hacker terminal |
| **Stealth** | Blue-grey, minimal, flat — default |
| **Warrior** | Black + blood red — ItsEliias signature |

Theme preference is written to `~/cybertools-config.json` and synced with CyberLab.

---

## Vault Output Structure

```
/vault-root/
  /[Source Name]/
    000 Index.md
    /[subfolder]/
      note-name.md
    /Snippets/
      page-name — Snippets.md
    [Source Name] Canvas.canvas
  /CVEs/
    /2024/
      CVE-2024-XXXXX.md
  /Reports/
    Knowledge Gap YYYY-MM-DD.md
  _scrape_state.json
  _scrape_log.json
  _link_validation.json
  _link_validation.csv
```

---

## Frontmatter Template

Every scraped note gets:

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
  - privilege-escalation
title: Page Title
vault_scraper_version: 1.0
---
```

---

## Troubleshooting

**Playwright errors** — Run `npm install` again. Playwright downloads Chromium on first install.

**Vault not found** — Go to Settings and re-select your vault folder.

**Empty scrape results** — Some sites require JavaScript. Playwright handles this, but very aggressive anti-bot sites may still block. Try increasing the request delay.

**CyberLab not detected** — Ensure CyberLab was launched at least once to create `~/cybertools-config.json`.

**Scheduled scrapes not firing** — The app must be running (or minimised to tray). Fully quitting stops the scheduler.

---

## Building for Distribution

```bash
# Build for all platforms
npm run build

# Output in /dist/
# Windows: VAULTCORE Setup.exe
# macOS:   VAULTCORE.dmg
# Linux:   vaultcore.AppImage + vaultcore.deb
```

Ensure `assets/logo.png` is present before building for correct icon embedding.

---

*VAULTCORE v1.0 — ItsEliias*
