# CyberOS Ecosystem — Guide

> ItsEliias // CyberOS Platform Documentation  
> Version 2.1

---

## Table of Contents

1. [Ecosystem Overview](#1-ecosystem-overview)
2. [Application Profiles](#2-application-profiles)
   - [Cybertools Launcher](#21-cybertools-launcher)
   - [CyberOS Dashboard](#22-cyberos-dashboard)
   - [CyberLab Companion](#23-cyberlab-companion)
   - [ReconDesk](#24-recondesk)
   - [GhostVault](#25-ghostvault)
   - [VaultCore](#26-vaultcore)
   - [SignalBoard](#27-signalboard)
   - [CredVault](#28-credvault)
   - [PlaybookStudio](#29-playbookstudio)
   - [ReportForge](#210-reportforge)
   - [TerminalLink](#211-terminallink)
   - [NetworkMap](#212-networkmap)
3. [System Map](#3-system-map)
4. [Shared Infrastructure](#4-shared-infrastructure)
5. [Pickle Rick — Ecosystem Walkthrough](#5-pickle-rick--ecosystem-walkthrough)
6. [Future Roadmap](#6-future-roadmap)
7. [AgenticOS — Standalone App](#7-agenticos--standalone-app)

---

# 1. Ecosystem Overview

CyberOS is a **personal desktop ecosystem** for cybersecurity operators. It is a suite of thirteen purpose-built Electron applications that share a common communication layer and design language. Each application owns a specific domain — no two applications duplicate each other's responsibilities.

The ecosystem is designed for a single operator (ItsEliias) who conducts authorised penetration testing, participates in HTB/THM labs, manages an Obsidian knowledge vault, monitors security intelligence, and wants every piece of that workflow supported by native desktop tooling rather than scattered browser tabs.

### Core Design Principles

| Principle | Implementation |
|---|---|
| Every app owns one domain | No feature duplication across apps |
| Shared context propagates automatically | `shared_context` in `cybertools-config.json` carries activeLab/activeTarget/activeIP — apps read it without manual input |
| File-based integration fabric | `cybertools-config.json` (state) + `ecosystem-events.json` (event log) connect all apps |
| Launch from one place | Cybertools Launcher is the single entry point |
| See everything from one place | CyberOS Dashboard is the single status pane |
| Notes always go to Obsidian | Every app writes structured Markdown into the shared vault |
| AI is an assistant, not a crutch | Claude API + local Ollama LLM power contextual help — always optional |
| Operator progress is tracked | The `operator_profile` object accumulates lab completions, flags, credentials, and skill progression across all sessions |

### Application Registry

| App | Domain | Status |
|---|---|---|
| Cybertools Launcher | System tray hub — launches and monitors all apps | Active |
| CyberOS Dashboard | Unified ecosystem status + operator profile | Active |
| CyberLab Companion | AI-assisted lab companion (HTB/THM/CTF) | Active |
| ReconDesk | Target and attack surface tracking | Active |
| GhostVault | Note capture and Obsidian workspace | Active |
| VaultCore | Knowledge vault scraper and orchestrator | Active |
| SignalBoard | Security intelligence feed aggregator | Active |
| CredVault | Encrypted credential manager (AES-256-GCM) | Active |
| PlaybookStudio | Methodology playbook builder and runner | Active |
| ReportForge | Professional assessment report generator | Active |
| TerminalLink | Session-linked terminal with command logging | Active |
| NetworkMap | Visual network topology mapper | Active |

---

# 2. Application Profiles

---

## 2.1 Cybertools Launcher

**Domain:** System entry point and ecosystem orchestrator  
**Accent:** Purple `#b44fff`

### What it does
Lives in the macOS system tray with no Dock presence. Provides one-click launch for all 12 registered apps, monitors ecosystem health via `cybertools-config.json` polling, fires macOS notifications when apps register or notable events occur (flag captured, scrape complete), and surfaces an activity feed of recent ecosystem events.

### Features
- **Tray popup panel** — 480×620px panel showing all app cards with active/inactive state and key metrics. Grouped into Core (Launcher, Dashboard, CyberLab, ReconDesk, GhostVault, VaultCore, SignalBoard) and Tools (CredVault, PlaybookStudio, ReportForge, TerminalLink, NetworkMap).
- **Context menu** — one entry per app with keyboard shortcuts (⌘1–⌘6 for core apps, plus entries for all Tools apps)
- **App auto-detection** — on startup, scans the known project directory for all 12 app folders and auto-registers their `execPath` in config
- **Notification diffing** — polls config every 5 seconds, fires notifications on state changes (new app registered, flag captured, scrape completed, session ended)
- **VPN monitoring** — detects active VPN interfaces every 30 seconds, updates the panel
- **Activity feed** — live stream of ecosystem events from `ecosystem-events.json`
- **Custom slots** — up to 4 user-defined app shortcuts for non-CyberOS tools
- **Update checker** — polls GitHub releases API for launcher updates

### Internal connections
Reads `cybertools-config.json` (all apps' status). Writes `activityFeed` entries and `launcher` config. Reads `ecosystem-events.json` via ecosystem-bus.

### External connections
GitHub releases API (update check). None beyond that.

---

## 2.2 CyberOS Dashboard

**Domain:** Unified status monitor and operator profile display  
**Accent:** Blue `#4a9eff`

### What it does
A persistent monitoring window (typically on a second monitor) that shows live status cards for all 13 apps, an activity feed of ecosystem events, an operator profile section with gamification stats, sparkline activity graphs, and a configurable alert system.

### Features
- **App cards** — one card per app showing active/inactive status, key metrics, and a mini sparkline of activity over the last 6 hours. Cards for: GhostVault, VaultCore, CyberLab, ReconDesk, SignalBoard, CredVault, PlaybookStudio, ReportForge, TerminalLink, NetworkMap.
- **Ecosystem Health bar** — horizontal indicator showing each app's online/offline state with accent-colored fill
- **Activity feed** — live right panel showing all ecosystem events with app color coding and timeAgo timestamps. Handles both event schemas (`{app, event}` and `{appName, eventType}`)
- **Operator Profile section** — shows operator name, total labs completed, current streak, total flags, total credentials — sourced from `operator_profile` in the shared config
- **Alert system** — bell icon badge + slide-out panel for configurable threshold alerts (app offline > 5 min, no ecosystem events > 30 min)
- **Full-screen toggle** — expands to fill display for SOC-style ops view
- **Live push updates** — subscribes to config and event file changes; updates without polling

### Internal connections
Reads entire `cybertools-config.json` (all app status fields). Reads `ecosystem-events.json`. Does not write to config.

---

## 2.3 CyberLab Companion

**Domain:** AI-assisted lab session manager  
**Accent:** Purple `#b44fff`

### What it does
The primary working app during an active lab or CTF. Manages lab sessions (tab-based), provides AI-powered chat assistance, offers a command builder with templates, tracks progress and findings, captures screenshots, times sessions, syncs bidirectionally with ReconDesk, and generates structured writeups. Supports both Claude API and local Ollama LLM.

### Features
- **Multi-tab sessions** — each tab is an independent lab session with metadata (name, platform, difficulty, target IP, start time)
- **AI Chat** — routes to Claude API or local Ollama based on configured provider. Model selector for Claude (Haiku/Sonnet/Opus) or Ollama (any installed model). Parses AI responses for port/credential patterns and offers quick-save to ReconDesk.
- **Timer HUD** — floating pill overlay showing elapsed time (count-up) or countdown with red pulse warning under 5 minutes. Auto-starts with session, state persists across restarts.
- **Command Builder** — nmap, gobuster, and other tool templates with target IP auto-filled from session
- **ReconDesk sync** — bidirectional: ReconDesk active target shown in session header; findings from AI chat → ReconDesk quick-save; can push ports/credentials directly to ReconDesk target
- **Screenshot capture** — captures screen, attaches to session as thumbnail, saves to Obsidian vault
- **Hint tracking** — "? Hint" button logs each hint with timestamp; count shown in session header and included in writeup
- **Writeup generator** — structured Markdown writeup pre-filled with session metadata, duration, hints used, flags count
- **Progress tracking** — lab history, streak, stats across all sessions
- **Local LLM support** — Ollama integration: list models, test connectivity, route all AI calls locally (no API key needed)
- **Autosave** — sessions save every 60 seconds automatically
- **VPN indicator** — footer shows VPN status, refreshed every 30 seconds

### Shared context writes
- `cyberlab_status` — active session name, lab name, platform, findings count, session active flag
- `shared_context.activeLab` — written every time the active session changes; consumed by SignalBoard, GhostVault, PlaybookStudio
- `operator_profile` — increments `totalLabsCompleted`, `totalFlags`, skill points on session completion

### Internal connections
Reads ReconDesk target data from config. Writes to GhostVault-managed vault (writeups). Emits events to ecosystem-events.json.

### External connections
Anthropic Claude API (AI chat, writeup generation). Ollama local API `http://localhost:11434` (alternative provider). TryHackMe API (room sync). GitHub releases (update check).

---

## 2.4 ReconDesk

**Domain:** Target and attack surface tracker  
**Accent:** Amber `#d29922`

### What it does
The structured tracking layer for all targets. Manages a list of targets (HTB machines, THM rooms, client engagements) with their associated ports, credentials, attack cards, timeline, and linked assets. Every discovery made in a session gets recorded here.

### Features
- **Target management** — name, IP, platform (HTB/THM/CTF/Client), OS, tags, status (active/completed/abandoned)
- **Attack Board** — Kanban-style cards with stages: recon → enum → exploit → post → privesc → loot. Cards track status (todo/inprogress/done/blocked). Each card can link to specific assets (ports, credentials) that led to its discovery.
- **Asset tracking** — Ports (port, protocol, service, version, state), Credentials (username, password, hash, service, notes), both with full metadata
- **nmap XML import** — paste nmap XML output → auto-populate ports table with all open ports. Uses browser DOMParser, handles malformed XML gracefully.
- **Finding correlation** — chain icon on each attack card opens a multi-select dropdown to link the card to specific discovered assets
- **Timeline view** — chronological history of all target activity: cards created/moved, assets added, status changes — with timestamps and color coding
- **Data export** — exports target as JSON (full structured data) + Markdown summary (tables of ports, credentials, grouped attack cards) via save dialog
- **Shared context writes** — `recondesk_status.activeTarget`, `shared_context.activeTarget`, `shared_context.activeIP` — updated on every data change; consumed by SignalBoard, GhostVault, CyberLab, TerminalLink

### Internal connections
Writes status + shared_context to cybertools-config.json. Emits events to ecosystem-events.json. Read by CyberLab (bidirectional sync), SignalBoard (relevance scoring), GhostVault (session templates), TerminalLink ($TARGET env var).

---

## 2.5 GhostVault

**Domain:** Note capture and Obsidian vault management  
**Accent:** Blue `#7bb8ff`

### What it does
The note-taking layer. A floating capture window accessible from anywhere on macOS via global hotkey — type a note, tag it, save it directly to the Obsidian vault. Also provides a full vault browser, templates, editor, and Ollama-powered AI assistance.

### Features
- **Global hotkey** — `Cmd+Shift+G` (configurable) opens the capture window from any app. Registered as a macOS globalShortcut; configurable in Settings.
- **Clipboard watch mode** — toggle in the capture window; polls clipboard every 1 second, auto-populates the note field on clipboard change. Content visible before saving — user reviews and tags before committing.
- **Session-linked templates** — reads `shared_context` from config on open; if an active lab/target is detected, shows a banner "Active session: [lab] — Use template?" that pre-fills `**Lab:** / **Target:** / **Finding:**` and sets the save path to `/CyberLab/[lab]/`. Template body customisable per user.
- **Vault browser** — navigate Obsidian vault folder tree, open and edit notes
- **Full editor** — Markdown editor with live preview
- **Templates library** — reusable note templates including Lab Session template that fills `{{LAB}}`, `{{TARGET}}`, `{{IP}}` placeholders from active session context
- **Ollama integration** — local AI for note formatting and summarisation
- **Settings** — configure vault path, capture hotkey, output directory, API key, preferences (autosave, VPN check, sound)

### Internal connections
Reads `shared_context` from cybertools-config.json for session templates. Writes notes to Obsidian vault on disk. Emits events to ecosystem-events.json.

---

## 2.6 VaultCore

**Domain:** Knowledge vault scraper and orchestrator  
**Accent:** Green `#3fb950`

### What it does
Keeps the Obsidian vault populated with up-to-date security content by scraping configured sources on a schedule. Tracks source health, auto-assigns tags, and provides a diff-style summary of every scrape run.

### Features
- **Source management** — configure scraping sources by type: obsidian-publish, website, github, youtube, pdf, reddit, twitter, notion, medium, cve, rss
- **Scheduled scraping** — auto-scrape on configurable intervals. Each source runs independently.
- **Source health monitoring** — per-source health dots (green/yellow/red) in the source list. `VaultHealthView` has a dedicated Source Health tab showing all sources sorted by severity, with last success time, consecutive failure count, and last error message. Sources with 3+ consecutive failures flagged as error.
- **Tag auto-assignment** — after scraping, content is scanned against 9 tag rule categories (`#web-security`, `#network`, `#privilege-escalation`, `#active-directory`, `#cryptography`, `#tools`, `#cve`, `#linux`, `#windows`). Tags displayed as clickable chips before saving — user can deselect or add custom tags. Accepted tags written to note frontmatter as YAML.
- **Scrape summary** — diff-style headline ("3 new, 1 updated, 2 unchanged"), collapsible updated-note diffs (old first line → new first line), mini bar chart of vault notes by folder category.
- **Conflict resolution** — updated notes show old vs new first line before overwriting

### Internal connections
Writes `.md` files to Obsidian vault. Writes `vaultscraper_status` to cybertools-config.json. Emits scrape events to ecosystem-events.json. Reads trigger file from Launcher ("update now").

### External connections
All configured source URLs (websites, GitHub, Reddit, etc.). No auth required for public sources.

---

## 2.7 SignalBoard

**Domain:** Security intelligence feed aggregator  
**Accent:** Coral `#ff6b6b`

### What it does
Aggregates security intelligence from multiple RSS/web sources, scores each item for relevance to the current active session, and surfaces the highest-relevance content at the top. Reads active lab/target context automatically from the shared config.

### Features
- **Multi-source feed** — configurable list of security RSS feeds and web sources
- **Relevance scoring** — each item scored based on: keyword matches against a 30-term security keyword list, matches against lab/target name context, custom operator-defined keywords
- **Auto-context** — reads `shared_context.activeLab`, `shared_context.activeTarget`, `shared_context.activeIP` from config every 10 seconds. When these change, automatically updates the relevance context inputs and rescores the feed. Shows "Auto" badge when values came from shared config.
- **High-relevance notifications** — macOS notification fired when a feed refresh produces an item scoring ≥ 40. In-app unread badge in the header. Configurable on/off toggle.
- **Reading pane** — click any item to read it in a full reading panel. Star to save to Obsidian vault.
- **AI article summary** — "Summarise" button in the reading pane sends article title + description to Claude and displays a 3-bullet summary. Summary is cached per item.
- **Custom keyword scoring** — comma-separated custom keywords in Settings/SourcePanel, each adds +10 to relevance score. Persisted to config as `signalboard.customKeywords`.
- **Source management** — SourcePanel to enable/disable individual sources

### Internal connections
Reads `shared_context` from cybertools-config.json for auto-context. Writes starred articles to Obsidian vault. Writes `signalboard_status` (unreadCount, lastRefresh, topItem) to config. Emits events to ecosystem-events.json.

### External connections
All configured RSS/web feed URLs. Claude API (article summarisation).

---

## 2.8 CredVault

**Domain:** Encrypted credential manager  
**Accent:** Soft red `#f78166`

### What it does
Stores credentials found during labs and engagements in an AES-256-GCM encrypted vault, protected by a master password. The master password is never stored — a key is derived from it via PBKDF2 on each unlock. Credentials auto-import from ReconDesk.

### Features
- **Master password vault** — setup mode (first launch) sets the master password. Subsequent launches require unlock. 5 failed attempts triggers a 60-second lockout. Auto-lock after configurable idle timeout (never/5/15/30 min).
- **AES-256-GCM encryption** — PBKDF2 key derivation (100,000 iterations, SHA-256, 32-byte key). Random 32-byte salt stored at `~/Library/Application Support/CredVault/salt.bin`. Encrypted vault at `vault.enc`. Wire format: `[IV(12)] [AuthTag(16)] [Ciphertext]`.
- **Credential entries** — username, password, hash (with hashType), service, IP, port, protocol, source, lab name, target name, tags, notes, verified flag, status (active/rotated/invalid)
- **Vault View** — searchable, filterable table. Click row to expand: all fields, copy buttons. Password copy triggers 30-second countdown then clears clipboard automatically.
- **Import from ReconDesk** — reads all targets from cybertools-config.json, extracts their credentials arrays, shows a selectable preview table, imports selected entries.
- **Encrypted backup** — export vault with a separate export password (random salt per export). Import from backup.
- **Cross-app credential search** — IPC handler `credvault-search` for other apps to query by IP or target name, returns non-sensitive fields only (id, service, username, ip, targetName — no passwords).
- **Ecosystem events** — emits `vault:unlocked`, `vault:locked`, `credential:added` to ecosystem-events.json. Writes `credvault_status` (active, credentialCount, locked) to config.

### Internal connections
Imports credentials from ReconDesk (via config). Other apps can query via IPC (non-sensitive fields only). Writes status to config. Emits events.

---

## 2.9 PlaybookStudio

**Domain:** Methodology playbook builder and runner  
**Accent:** Blue `#4a9eff`

### What it does
Lets the operator build, store, and run reusable methodology playbooks as structured checklists. A playbook is a sequence of steps, each with a title, description, commands, notes, and category. Run mode turns a playbook into an interactive checklist during a live session, with per-step notes and progress tracking.

### Built-in playbooks
1. **Web Application Assessment** — passive recon → active recon → directory enum → tech fingerprinting → auth testing → input validation (XSS/SQLi/SSTI) → business logic → file upload → API discovery → report
2. **Linux Privilege Escalation** — initial enum → SUID/GUID → sudo permissions → cron jobs → writable PATH → kernel check → running services → network connections → sensitive files → password reuse
3. **Active Directory Initial Access** — network enum → SMB null sessions → Kerberoasting → password spray → AS-REP Roasting → LLMNR poisoning → BloodHound → DCSync → report
4. **Network Recon** — host discovery → top 1000 ports → full port scan → service versions → OS fingerprinting → vuln scan → web screenshots → report

### Features
- **Library** — grid of all playbooks (built-in + custom) with category filter chips. Run/Clone/Edit/Delete per card. "New Playbook" creates a blank custom playbook.
- **Editor** — edit name, description, category, tags. Step list with drag-to-reorder, add/delete/duplicate per step. Per-step: title, description, category, commands (one per line, copy buttons), notes, required toggle. Built-in playbooks are cloneable but not deleteable.
- **Run mode** — loads active session context from `shared_context` (lab, target, IP). Per-step: cycle todo → inprogress → done, skip option, operator notes textarea. Progress bar. "Complete Playbook" marks run done.
- **History** — list of past runs with date, target, playbook name, status. Click to view summary. Resume a running run.
- **Shared context writes** — `playbookstudio_status.activePlaybook`, `shared_context.activePlaybook` written on run start/end. Emits `playbook:started`, `playbook:completed`, `step:completed` events.
- **Storage** — playbooks at `~/Library/Application Support/PlaybookStudio/playbooks.json`, runs at `runs.json`

### Internal connections
Reads `shared_context` (activeLab, activeTarget, activeIP) on run start. Writes `shared_context.activePlaybook`. Emits events. Writes status to config.

---

## 2.10 ReportForge

**Domain:** Professional assessment report generator  
**Accent:** Green `#3fb950`

### What it does
Assembles polished assessment reports from CyberOS ecosystem data. Pulls in ReconDesk target data and credentials, imports CyberLab writeups, structures everything into a report with severity-rated findings, and exports to Markdown or PDF.

### Features
- **3-step New Report Wizard** — Step 1: metadata (title, target, IP, platform, date, operator). Step 2: import from ReconDesk (select target, auto-populates target name, IP, credentials section). Step 3: import CyberLab writeup markdown (fills Executive Summary).
- **Report editor** — two-panel layout: section list (left, reorderable, visibility toggle) + Markdown editor (right). Inline section title editing.
- **Default sections** — Cover, Executive Summary, Scope, Methodology, Findings, Credentials Discovered, Recommendations, Appendix.
- **Findings panel** — sortable table by severity with color-coded dots. Per-finding form: title, severity (critical/high/medium/low/info), description, evidence, impact, recommendation, CVSS score, linked attack card reference, references list.
- **Severity summary widget** — header/sidebar count of findings by severity (Critical=red, High=orange, Medium=amber, Low=green, Info=grey)
- **Markdown export** — assembles all sections + findings into one `.md` file. Save via dialog.
- **PDF export** — uses Electron's `webContents.printToPDF()` with print-optimised CSS overlay. No external libraries.
- **Report library** — home screen showing all saved reports as cards with open/duplicate/delete.
- **Storage** — `~/Library/Application Support/ReportForge/reports.json`. Auto-save when navigating away from dirty report.

### Internal connections
Reads ReconDesk target data from cybertools-config.json. Reads CyberLab writeup markdown from Obsidian vault path. Writes `reportforge_status` to config. Emits events.

---

## 2.11 TerminalLink

**Domain:** Session-linked terminal with command logging  
**Accent:** Matrix green `#00ff41`

### What it does
A dual-pane xterm.js terminal that automatically logs commands into the active CyberOS session. Injects `$TARGET` and `$TARGET_IP` environment variables from the active ReconDesk target, making every terminal session contextually aware of the current engagement.

### Features
- **xterm.js terminal** — full-colour 256-color terminal with JetBrains Mono font, matching CyberOS dark theme. xterm-addon-fit for responsive resize, xterm-addon-web-links for clickable URLs.
- **node-pty PTY** — real pseudo-terminal backed by `/bin/zsh`. Full interactive shell. Loaded via `createRequire` for ESM/native module compatibility.
- **$TARGET injection** — on PTY spawn, reads `shared_context.activeTarget` and `shared_context.activeIP` from config. Sets `$TARGET` and `$TARGET_IP` environment variables automatically in every session.
- **Dual-pane mode** — toggle split button in the header; two terminals side-by-side (50/50). Each pane is an independent PTY with its own ID.
- **Command logging** — detects commands via input buffer tracking on Enter keypress. Each command stored as `CommandEntry` with timestamp, pane, and output snippet.
- **History panel** — slide-out from right (280px). All commands newest-first, searchable, per-command copy button. Export all commands as text file.
- **Session linking** — dropdown to link the terminal session to an active CyberLab session. Commands written to that session's log.
- **Graceful exit handling** — when PTY exits, terminal shows "Process exited (code N). Press Enter to restart."
- **Storage** — command logs at `~/Library/Application Support/TerminalLink/sessions/current.json`.

### Internal connections
Reads `shared_context` (activeTarget, activeIP) for $TARGET injection. Writes `terminallink_status` (commandCount, linkedSession) to config. Emits events.

---

## 2.12 NetworkMap

**Domain:** Visual network topology mapper  
**Accent:** Amber `#d29922`

### What it does
Visualises network topology from nmap XML scan output. Parses host/port/service data, runs a force-directed layout, and renders an interactive SVG graph where nodes are hosts and edges are inferred connections. Supports pan, zoom, and node drag.

### Features
- **nmap XML parser** — regex-based parser (no external XML library). Extracts host IPs, hostnames, OS guesses, and all ports with state/service/version. Only surfaces open ports. Handles malformed XML gracefully.
- **Force simulation** — 200-iteration force-directed layout (repulsion + spring tension + center pull + damping). Runs on first graph load; preserves user-dragged positions.
- **SVG graph** — pan (background drag), zoom (scroll wheel, 0.3–3.0×), node drag. Nodes colored by open port count: 0=grey, 1–2=green, 3–5=amber, 6+=red/danger. Labels: IP below node, hostname in smaller text.
- **Node detail panel** — click any node: IP, hostname, OS, ports table (port | service | state, color-coded), Copy IP button.
- **Import options** — Import nmap XML file (file dialog), Paste XML (textarea modal with preview count before import), Import from ReconDesk (reads active target's ports from config).
- **Graph library** — left sidebar list of all saved graphs with name, date, node count, delete. Click to load.
- **Export** — save graph as SVG.
- **Storage** — graphs at `~/Library/Application Support/NetworkMap/graphs/[id].json`.

### Internal connections
Reads ReconDesk active target's ports from cybertools-config.json. Writes `networkmap_status` (currentGraph, nodeCount) to config. Emits events.

---

# 3. System Map

```
                        ┌─────────────────────────────────────────────────────┐
                        │              CYBERTOOLS LAUNCHER (Tray)             │
                        │  Launches all apps · monitors status · notifications │
                        └──────────────────────┬──────────────────────────────┘
                                               │ spawns
          ┌────────────────────────────────────┼────────────────────────────────┐
          │                                    │                                │
          ▼                                    ▼                                ▼
┌─────────────────┐              ┌─────────────────────┐            ┌──────────────────┐
│  CyberOS        │              │   CyberLab          │            │   ReconDesk      │
│  Dashboard      │◄─────────────│   Companion         │◄──────────►│                  │
│                 │  reads all   │   (primary working  │  bidir sync│  Target tracking │
│  Status monitor │  app status  │    app during labs) │            │  Attack cards    │
│  Operator stats │              │                     │            │  Ports, creds    │
│  Alerts + feed  │              │  AI chat (Claude/   │            │  nmap XML import │
└─────────────────┘              │  Ollama), timer,    │            │  Timeline view   │
                                 │  commands, writeup, │            │  Finding corr.   │
                                 │  hints, screenshot  │            │  Data export     │
                                 └──────────┬──────────┘            └────────┬─────────┘
                                            │                                │
                                            │ writes activeLab               │ writes activeTarget
                                            │ to shared_context              │ + activeIP
                                            │                                │
                        ┌───────────────────▼────────────────────────────────▼──────┐
                        │                  cybertools-config.json                   │
                        │                                                           │
                        │  shared_context: { activeLab, activeTarget, activeIP,     │
                        │                   activePlaybook }                        │
                        │  operator_profile: { totalLabs, totalFlags, streak, ... } │
                        │  [app]_status: { active, lastActive, [metrics] }          │
                        │  [app].execPath: "..."                                    │
                        └───┬───────────┬──────────┬──────────┬─────────────┬───────┘
                            │           │          │          │             │
                reads ctx   │     reads │    reads │    reads │       reads │
                            ▼           ▼          ▼          ▼             ▼
              ┌──────────┐  ┌──────────┐ ┌───────┐ ┌────────┐ ┌──────────────────┐
              │SignalBoard│  │GhostVault│ │ Cred  │ │Playbook│ │  TerminalLink    │
              │           │  │          │ │ Vault │ │ Studio │ │  NetworkMap      │
              │Auto-scored│  │Session   │ │       │ │        │ │  ReportForge     │
              │intel feed │  │templates │ │AES-256│ │Method- │ │                  │
              │AI summaries│ │Global    │ │vault  │ │ology   │ │$TARGET injection │
              │Custom keys │ │hotkey    │ │Import │ │checker │ │nmap → SVG graph  │
              │Notifs      │ │Clipboard │ │from RD│ │Run mode│ │PDF reports       │
              └──────────┘  └──────────┘ └───────┘ └────────┘ └──────────────────┘

                                            │
                        ┌───────────────────▼───────────────────────────────────────┐
                        │             ecosystem-events.json                         │
                        │  Append-only event log. All apps write here.              │
                        │  Dashboard + Launcher read and display in activity feeds. │
                        └───────────────────────────────────────────────────────────┘

                                            │
                        ┌───────────────────▼───────────────────────────────────────┐
                        │              Obsidian Vault (~/[vault path]/)             │
                        │  GhostVault captures · VaultCore scrapes                 │
                        │  CyberLab writeups · SignalBoard saved articles           │
                        │  ReportForge can import writeups from here                │
                        └───────────────────────────────────────────────────────────┘
```

---

# 4. Shared Infrastructure

## 4.1 cybertools-config.json

Location: `~/cybertools-config.json`

The central state file. Every app reads from and writes to this file. No message broker, no database — plain JSON on disk, read/written atomically. Polling interval varies by app (typically 5–10 seconds).

### Top-level schema

```json
{
  "shared_context": {
    "activeLab": "Pickle Rick",
    "activeTarget": "10.10.3.164",
    "activeIP": "10.10.3.164",
    "activePlaybook": "Web Application Assessment",
    "lastUpdated": "2026-06-02T00:00:00.000Z",
    "updatedBy": "ReconDesk"
  },
  "operator_profile": {
    "operatorName": "ItsEliias",
    "totalLabsCompleted": 12,
    "totalFlags": 38,
    "totalCredentials": 21,
    "currentStreak": 4,
    "lastActiveDate": "2026-06-02",
    "skillProgress": {
      "web": 24,
      "network": 12,
      "activeDirectory": 8,
      "linux": 18,
      "windows": 6,
      "crypto": 4,
      "forensics": 2
    }
  },
  "cyberlab": { "installed": true, "execPath": "...", "version": "1.0" },
  "cyberlab_status": { "active": true, "lastActive": "...", "currentLab": "...", "sessionActive": true, "findingsCount": 3 },
  "recondesk": { "execPath": "..." },
  "recondesk_status": { "active": true, "activeTarget": "Pickle Rick", "targetCount": 1, "cardCount": 8 },
  "ghostvault": { "execPath": "..." },
  "ghostvault_status": { "active": true, "noteCount": 142 },
  "vaultscraper": { "execPath": "..." },
  "vaultscraper_status": { "active": false, "vaultNoteCount": 892, "totalSources": 6 },
  "signalboard": { "execPath": "..." },
  "signalboard_status": { "active": true, "unreadCount": 3, "lastRefresh": "...", "topItem": "..." },
  "credvault": { "execPath": "..." },
  "credvault_status": { "active": true, "credentialCount": 21, "locked": false },
  "playbookstudio": { "execPath": "..." },
  "playbookstudio_status": { "active": false, "activePlaybook": null },
  "reportforge": { "execPath": "..." },
  "reportforge_status": { "active": false, "reportCount": 3 },
  "terminallink": { "execPath": "..." },
  "terminallink_status": { "active": true, "commandCount": 47, "linkedSession": "Pickle Rick" },
  "networkmap": { "execPath": "..." },
  "networkmap_status": { "active": false, "currentGraph": null, "nodeCount": 0 },
  "cyberos": { "execPath": "..." },
  "launcher": { "customSlots": [], "activityFeed": [] }
}
```

### Who writes shared_context

| Field | Written by | When |
|---|---|---|
| `activeLab` | CyberLab Companion | Session tab becomes active |
| `activeTarget` | ReconDesk | Active target changes |
| `activeIP` | ReconDesk | Active target changes |
| `activePlaybook` | PlaybookStudio | Playbook run starts/ends |

### Who reads shared_context

| App | Uses |
|---|---|
| SignalBoard | Auto-fills relevance context inputs, rescores feed |
| GhostVault | Session-linked template banner + auto-path on capture |
| TerminalLink | Injects $TARGET and $TARGET_IP into every PTY spawn |
| PlaybookStudio | Shows session context banner in Run mode |
| CyberOS Dashboard | Operator profile display |

## 4.2 ecosystem-events.json

Location: `~/Library/Application Support/CyberTools/ecosystem-events.json`

Append-only event log. All apps append events here; Dashboard and Launcher read and display them in activity feeds.

### Event schema
```json
{
  "id": "uuid-v4",
  "timestamp": "ISO-8601",
  "app": "CyberLab",
  "event": "session:started",
  "data": { "lab": "Pickle Rick", "platform": "THM" }
}
```

Note: Older apps (GhostVault) use `{appName, eventType}` keys — Dashboard's ActivityFeed handles both schemas via nullish coalescing.

### Known event types by app

| App | Events |
|---|---|
| Launcher | `launcher.opened` |
| CyberLab | `session:started`, `session:saved`, `cyberlab.thm.synced` |
| ReconDesk | `target:added`, `target:removed`, `target:completed` |
| GhostVault | `note:created`, `note:saved` |
| VaultCore | `scrape:started`, `scrape:completed` |
| SignalBoard | `feed:refreshed`, `article:saved` |
| CredVault | `vault:unlocked`, `vault:locked`, `credential:added` |
| PlaybookStudio | `playbook:started`, `playbook:completed`, `step:completed` |
| ReportForge | `report:created`, `report:exported` |
| TerminalLink | `session:started`, `command:executed` |
| NetworkMap | `graph:imported`, `graph:saved` |

## 4.3 Obsidian Vault

The shared knowledge base. Every app that generates content writes Markdown files into the configured Obsidian vault path.

| App | Writes to |
|---|---|
| GhostVault | `/[vault]/[user-chosen-path]/` (configurable per capture) |
| CyberLab | `/[vault]/CyberLab/Completed/[lab name].md` |
| VaultCore | `/[vault]/[source-configured-path]/` |
| SignalBoard | `/[vault]/SignalBoard/[date] [title].md` |
| GhostVault screenshots | `/[vault]/CyberLab/[session]/screenshots/[timestamp].png` |

## 4.4 Operator Profile

Written by CyberLab Companion (on session complete) and ReconDesk (on credential added). Read by CyberOS Dashboard (display). Persists across all sessions.

Skill point allocation on lab completion:
- Platform THM/HTB + type Linux → `linux` +2, `network` +1
- Platform THM/HTB + type Web → `web` +3
- Platform THM/HTB + type AD/Windows → `activeDirectory` +2, `windows` +2
- Platform CTF → `crypto` +1, `web` +1

---

# 5. Ecosystem Walkthroughs

Two dedicated walkthrough files show the ecosystem in action across real TryHackMe rooms. Both are based on actual published writeup data — no assumptions.

---

## 5.1 Pickle Rick — THM Ecosystem Walkthrough

**`Pickle Rick — THM Ecosystem Walkthrough.md`**

A beginner-friendly Linux web room. Covers the core loop: target setup in ReconDesk, CyberLab session creation, SignalBoard intelligence check, GhostVault note capture, three flags found and logged, writeup generation. Uses 4 of the 12 apps — appropriate for the room's simplicity.

| Room | Platform | Difficulty | Flags | Apps used |
|---|---|---|---|---|
| Pickle Rick | THM | Easy | 3 | ReconDesk, CyberLab, GhostVault, SignalBoard |

---

## 5.2 Blue — THM Ecosystem Walkthrough

**`Blue — THM Ecosystem Walkthrough.md`**

The ecosystem's full showcase. A Windows 7 machine vulnerable to MS17-010 (EternalBlue). Multi-stage Metasploit chain, real credential dumping with hashdump, NTLM hash cracking, three flags across different system locations, and a professional report at the end. Every one of the 12 apps has a natural role — nothing is forced.

| Room | Platform | Difficulty | Flags | Apps used |
|---|---|---|---|---|
| Blue | THM | Easy | 3 | All 12 |

**App sequence:**
```
Launcher → SignalBoard → CyberLab → PlaybookStudio → ReconDesk
    → NetworkMap → TerminalLink → CredVault → GhostVault
    → ReportForge → Dashboard → VaultCore
```

---

# 6. Future Roadmap

Most items from the v1.0 roadmap are now built. What remains:

## 6.1 Unified Search

A global search hotkey (`Cmd+Shift+F` or similar, registered via GhostVault's globalShortcut pattern) that queries simultaneously across:
- ReconDesk targets, ports, credentials
- GhostVault vault notes
- CyberLab session history
- SignalBoard feed items
- VaultCore vault content

Returns ranked results with app attribution. A single floating panel, not a new window.

## 6.2 TerminalLink — Screenshot Annotation

When a terminal command produces output of interest, a screenshot capture button in TerminalLink captures the current terminal content as an image. Annotate with a text overlay and save directly to the linked GhostVault session path. This closes the gap between "interesting output" and "documented finding".

## 6.3 CredVault — Live ReconDesk Push

Currently CredVault imports from ReconDesk at a point in time. Add a live push: when a new credential is added to ReconDesk, it automatically appears in CredVault's import queue (shown as a badge/notification in CredVault), pending the user's one-click approval to import and encrypt it.

## 6.4 NetworkMap — ReconDesk Bidirectional Sync

When a node is selected in NetworkMap and "Add to ReconDesk" is clicked, it not only adds the port to ReconDesk but creates a full port entry with all service version data. Reverse: when ReconDesk has ports for the active target, NetworkMap can generate the graph automatically from that data without needing an nmap XML file.

## 6.5 Skill Progression Visualisation

The `operator_profile.skillProgress` object accumulates points per skill category, but there's no dedicated display beyond the Dashboard numbers. A dedicated "Operator Card" view (accessible from Dashboard or Launcher) showing:
- Radar/spider chart of skill levels across 7 categories
- Lab completion history timeline
- Streak calendar (GitHub contribution graph style)
- Badges earned (first flag, 10 labs, 7-day streak, etc.)

## 6.6 Three-Year Vision

**Year 1 (current state + above):** The core loop is frictionless. Every step of a lab session (start → enumerate → exploit → document → archive) has a dedicated tool. No data falls through the cracks.

**Year 2 — The Intelligent Layer:** Agents are active participants. AgenticOS fully wired to CyberLab. VaultCore uses agents to summarise and tag every note on arrival. ReconDesk attack cards suggest next steps from past session patterns. SignalBoard agents monitor for emerging vulnerabilities matching the current engagement's tech stack.

**Year 3 — Autonomous Research Assistant:** For authorised lab environments, the ecosystem becomes partially autonomous. Operator enters an IP. CyberOS begins initial recon via AgenticOS. Agents report findings to ReconDesk and CyberLab in real time. Operator reviews results and makes decisions. Full session report auto-generated at completion. Lessons extracted and stored back into the vault and agent memory. The operator role shifts from doing tasks to reviewing results.

---

# 7. AgenticOS — Standalone App

AgenticOS is a separate application — an AI agent registry and task runner that sits outside the core ecosystem rather than inside it. It doesn't own a pentest domain (like ReconDesk owns targets, or GhostVault owns notes); it owns *orchestration*, which puts it in a different category.

**Accent:** Orange `#ff9500`

### What it does

Allows registering named AI agents with defined capabilities, cost limits, and permissions. Tasks are broken into steps, each assigned to the most capable available agent. Execution is tracked in real time with per-step status, cost accounting, and a dead-letter queue for failed tasks.

### Current state

Core scaffold is complete:
- `AgentCapability` enum (22 capabilities covering reasoning, code, research, writing, tools)
- Full agent lifecycle: `unregistered → registered → healthy → busy → unhealthy → failing → suspended`
- `AgentRegistry` — persists to `~/.agentikos/registry.json`, supports capability-based filtering
- `TaskRunner` — creates and runs tasks, emits `step:update` and `task:update` events to renderer
- UI: Agents grid (status badge, capabilities, mark-healthy/unregister), Tasks list (expandable steps, run/cancel), Register form (full capability multi-select, provider dropdown)

### Why it's standalone

The 12 ecosystem apps share `cybertools-config.json` and `ecosystem-events.json` as a common fabric. AgenticOS has its own separate registry and task store. It doesn't write to the shared config and doesn't need to be running for the rest of the ecosystem to work — it's an optional layer that, when present, can be wired to individual apps to offload specific work.

### Planned integrations (optional, not roadmap)

These connections are possible but not required — they enhance the ecosystem when AgenticOS is running:

| Source app | What gets delegated | How |
|---|---|---|
| CyberLab | "Research this service" → `web_research` agent | Delegate button in ChatPanel sends current context |
| PlaybookStudio | Playbook step auto-execution | Per-step "Auto" toggle routes to capable agent |
| VaultCore | Post-scrape note summarisation and tagging | `document_analysis` agent replaces keyword tag rules |

---

*ItsEliias // CyberOS Ecosystem Guide v2.1*
