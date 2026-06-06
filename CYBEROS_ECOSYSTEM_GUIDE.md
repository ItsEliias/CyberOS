# CyberOS — Ecosystem Guide

> ItsEliias // CyberOS Platform Documentation
> Version 2.0 — rebuilt from the live codebase
> Covers all 13 applications, their features, and exactly how they communicate.

---

## Table of Contents

1. [What CyberOS Is](#1-what-cyberos-is)
2. [Purpose & Design Principles](#2-purpose--design-principles)
3. [The Integration Fabric (how apps talk)](#3-the-integration-fabric)
4. [Application Registry](#4-application-registry)
5. [Application Profiles](#5-application-profiles)
6. [What Each App Shares — Reference Tables](#6-what-each-app-shares)
7. [System Map & Data Flows](#7-system-map--data-flows)
8. [Shared Technical Foundation](#8-shared-technical-foundation)

---

# 1. What CyberOS Is

CyberOS is a **personal desktop ecosystem for cybersecurity work** — a suite of purpose-built Electron applications that share a common communication layer, a common design language, and a single Obsidian knowledge vault. Each app owns one domain; together they cover the full loop of an authorised security engagement: intelligence gathering, target tracking, methodology, live testing, evidence capture, knowledge management, and reporting.

It is built for a single operator who runs authorised penetration tests and HTB/THM/CTF labs, studies networking, and wants every part of that workflow supported by native tooling instead of a dozen browser tabs.

There are **13 applications**. They run independently — any one can be closed without breaking the others — and coordinate entirely through shared files on disk.

---

# 2. Purpose & Design Principles

| Principle | How it shows up in the code |
|---|---|
| Every app owns one domain | No two apps duplicate a responsibility; they hand off instead |
| File-based integration | `cybertools-config.json` + an event-bus file are the only glue — no servers, no sockets |
| One launch point | Cybertools Launcher spawns everything from the system tray |
| One status pane | CyberOS Dashboard reads every app's state and shows it live |
| Notes always land in Obsidian | GhostVault, VaultCore, SignalBoard, CyberLab and ReportForge all write Markdown into the shared vault |
| Shared context, not repeated work | A single `shared_context` (active lab / target / IP) flows to the apps that need it |
| AI assists, never gates | Claude/Ollama power help and generation, but every app works without them |

---

# 3. The Integration Fabric

Everything below is the actual mechanism the apps use to coordinate. There is no network layer — coordination is files.

### 3.1 `~/cybertools-config.json` — shared operational state

A single JSON file each app reads and writes. Each app writes **only its own keys**. The important keys:

| Key | Written by | Purpose |
|---|---|---|
| `<app>_status` | each app | Live status block (active flag, last-active time, app-specific metrics). One per app, e.g. `recondesk_status`, `cyberlab_status`, `ghostvault_status`, `vaultscraper_status`, `signalboard_status`, `terminallink_status`, `networkmap_status`, `playbookstudio_status`, `reportforge_status`, `credvault_status`, `cyberos_status` |
| `<app>.execPath` | each app on startup | Self-registration — where the app's binary lives, so the Launcher and Dashboard can spawn it |
| `shared_context` | CyberLab Companion & ReconDesk | The active relevance context: `{ activeLab, activeTarget, activeIP }`. Consumed by SignalBoard (and other context-aware apps) automatically |
| `operator_profile` | several apps | Cross-app gamification/stats: `streak`, `totalFlags`, `totalCredentials`, `skills` / `skillNodes` / `skillProgress` / `skillPoints`. Surfaced on the Dashboard |
| `credvault_pending` | ReconDesk | Queue of newly discovered credentials handed off to CredVault for secure storage; consumed by CredVault |

### 3.2 The ecosystem event bus — `ecosystem-events.json`

An append-only event log (newest first, capped) living under the CyberTools application-support folder. Every app emits lifecycle and activity events here (`app:launched`, `app:closed`, and domain events). The Dashboard watches the file and renders a live activity feed. Two event schemas coexist — `{app, event, data}` (newer apps) and `{appName, eventType, data}` (older apps) — and readers handle both.

### 3.3 The Obsidian vault — shared long-term memory

A single Obsidian vault folder on disk that multiple apps write Markdown into:

| App | Writes to | Content |
|---|---|---|
| GhostVault | anywhere in the vault | Capture notes, findings |
| CyberLab Companion | `/CyberLab/`, `/Completed/` | Session writeups |
| VaultCore | `/[SourceName]/` | Scraped knowledge (with frontmatter) |
| SignalBoard | `/SignalBoard/` | Saved intelligence articles (with frontmatter) |
| ReportForge | export targets | Assembled reports |

---

# 4. Application Registry

| # | App | Domain | Status |
|---|---|---|---|
| 1 | Cybertools Launcher | System-tray hub — launches & monitors every app | Active |
| 2 | CyberOS Dashboard | Unified live status, activity feed, operator profile | Active |
| 3 | CyberLab Companion | AI-assisted lab companion (HTB/THM/CTF) | Active |
| 4 | ReconDesk | Target & attack-surface tracker | Active |
| 5 | GhostVault | Obsidian-connected note capture & editor | Active |
| 6 | VaultCore | Knowledge scraper + vault health + git/secret tools | Active |
| 7 | SignalBoard | Security intelligence feed aggregator | Active |
| 8 | PlaybookStudio | Methodology playbooks (build, run, track) | Active |
| 9 | CredVault | Encrypted credential & secret manager | Active |
| 10 | ReportForge | Professional assessment report generator | Active |
| 11 | TerminalLink | Embedded terminal with command logging | Active |
| 12 | NetworkMap | Visual network topology mapper | Active |
| 13 | NetLab | Networking lab & study workspace (CCNA-style) | Active |

> Note: an `agenticos_status` key still appears in one place, but there is no AgenticOS app in the codebase — it's a vestigial reference and can be ignored or cleaned up.

---

# 5. Application Profiles

---

## 5.1 Cybertools Launcher

**Purpose:** The single entry point. A macOS system-tray hub that launches every app, monitors which are running, and surfaces ecosystem notifications without any other window open.

**Features (from the code):**
- System-tray presence with launch entries for every registered app (`AppCard`, `NewAppCard`)
- **Custom app slots** — register your own tools into the launcher (`CustomSlotsGrid`, `CustomSlotModal`)
- **Global search** — a separate search window (`search.html` / `SearchApp`) for finding across the ecosystem
- Live **activity feed** and a **stats strip** (`ActivityFeed`, `StatsStrip`)
- App spawning that resolves the real Electron binary and detaches the child (`launcher-utils`)
- Update banner and splash screen
- Config polling to detect new app registrations and status changes

**Communicates:** reads every `<app>.execPath` and `<app>_status` from `cybertools-config.json` to launch and monitor; emits launch/close events to the event bus.

---

## 5.2 CyberOS Dashboard

**Purpose:** The ecosystem control plane — one window showing what every app is doing, ecosystem health, a live event feed, and your operator profile.

**Features:**
- **App status grid & cards** with online/offline state and per-app live metrics (`AppStatusGrid`, `AppStatusCard`, `AppStatusTable`, `MetricCard`)
- **Ecosystem health bar** — per-app fill (`EcosystemHealthBar`)
- **Activity feed / event log** driven by the event-bus file (`ActivityFeed`, `EventLog`)
- **Operator Profile** — gamification: skill radar, streak calendar, badges, lab-history table (`OperatorProfile`, `SkillRadar`, `SkillRadarLarge`, `StreakCalendar`, `BadgeDisplay`, `LabHistoryTable`)
- **Alerts panel** for threshold/health alerts (`AlertsPanel`)
- **Shared-context inspector** and **config inspector** — see the live `shared_context` and raw config (`SharedContextInspector`, `ConfigInspector`)
- **Active-session banner** (`ActiveSessionBanner`)
- Per-app tab pages (`AppTabsView`, `AppTabPage`)

**Communicates:** read-only consumer of `cybertools-config.json` (all status blocks, `operator_profile`, `shared_context`) and the event bus; can issue launch requests.

---

## 5.3 CyberLab Companion

**Purpose:** The AI-assisted lab companion for HTB/THM/CTF — chat, command building, encoders, cheatsheets, session tracking, and writeup generation in one window.

**Features:**
- **Multi-session** workspace with per-session metadata, findings, methodology, timer (`SessionPanel`, `SessionMeta`, `TimerCard`, `TimerHUD`)
- **Claude chat** with Markdown rendering, context-aware of the active lab; Teach-Me and Exam modes (`ChatPanel`, `MarkdownRenderer`, `HintsPanel`)
- **Command Builder** with target auto-fill (`CommandBuilder`) and a **Reverse Shell** generator (`ReverseShell`)
- **Encoder/Decoder** (`Encoder`) and **Cheatsheets** (`Cheatsheets`, `lib/cheatsheets`)
- **Snippets** manager (`Snippets`)
- **Findings & flags** tracking, with chat parsing of ports/creds (`FindingsPanel`, `FindingsTable`, `FlagTracker`, `FlagLogger`, `ParsedCredChips`, `ParsedPortChips`)
- **Methodology guide** and **Quick Actions** (`MethodologyGuide`, `QuickActions`)
- **Lab Tracker** kanban and **Progress / Stats** views (`LabTracker`, `Progress`, `StatsView`)
- **Screenshot annotator** (`ScreenshotAnnotator`), **Knowledge Base** (`KnowledgeBase`), **Tool Launcher** (`ToolLauncher`)
- **Writeup generation** to the Obsidian vault

**Communicates:** writes `cyberlab_status` and sets `shared_context` (active lab/target/IP) so SignalBoard etc. follow along; contributes to `operator_profile`; exports writeups to the vault. External: Anthropic API (chat/writeups), HTB/THM (progress).

---

## 5.4 ReconDesk

**Purpose:** Target and attack-surface tracker — the structured operational journal for an engagement: targets, ports, credentials, attack cards, CVSS, timeline.

**Features:**
- **Targets** with platform (now incl. `Client` / `Internal`), status, tags, notes, additional IPs, enrichment & geo data (`TargetPanel`, `OverviewTab`)
- **Attack Board** kanban with stages, subtasks, and **CVSS scoring** per card (`AttackBoardTab`, `AttackBoard`, `CvssWidget`)
- **Ports** tab with **nmap XML import** (`PortsTab`, `ImportNmapModal`) and **CSV import** (`CsvImportModal`)
- **Credentials** tab (`CredentialsTab`) — with auto-handoff to CredVault
- **CVE panel** and network enrichment (`CvePanel`, `ipc-network-handlers`)
- **Timeline / calendar** views (`TimelineTab`, `TimelineView`, `CalendarView`)
- **Engagements** — group targets under a named engagement (`Engagement` type)
- **Flags**, **global search**, **export**, **notifications**, **onboarding** (`FlagsSection`, `GlobalSearch`, `ExportTab`/`ExportButton`, `NotificationCenter`, `OnboardingModal`)
- Tool launcher to open sibling apps (`ToolLauncher`)

**Communicates:** writes `recondesk_status` (active target, counts); sets `shared_context`; queues new creds to `credvault_pending`; contributes to `operator_profile`. Persists to `~/.recondesk/data.json`.

> Known issue (see review): ReconDesk currently carries **two parallel type models** (a stale `src/shared/types.ts` and the active `src/renderer/types/recondesk.ts`). Consolidating these is the main outstanding cleanup.

---

## 5.5 GhostVault

**Purpose:** Native Obsidian-connected capture and editor — fast quick-capture plus a full Markdown workspace, writing straight into the vault.

**Features:**
- **Quick-capture** floating window (`capture.tsx`, `CaptureView`, `useCaptureStore`)
- **Full editor** with edit/split/preview, wikilink autocomplete, version history (`NoteEditor`, `NotePreview`, `WikilinkAutocomplete`, `VersionHistoryPanel`)
- **Vault browser** file tree, **search**, **tags**, **graph view** (`FileTree`, `SearchView`/`FullSearchView`, `TagsView`, `GraphView`)
- **Templates** incl. Lab Session, Recon Finding, Quick Note, Credential Record (`TemplatesView`, `TemplateEditor`)
- **Local AI (Ollama)** assistant + inline commands (`AIAssistantPanel`, `InlineAICommands`) — format, summarise, extract TODOs, generate tags
- **Note password protection** (`NotePasswordModal`), **bulk actions**, **presentation mode** (`BulkActionBar`, `PresentationMode`)

**Communicates:** writes `ghostvault_status` (note count, last capture); writes `.md` files into the shared Obsidian vault that VaultCore/others read. External: Ollama (optional, local).

---

## 5.6 VaultCore

**Purpose:** The knowledge-acquisition and vault-maintenance engine — scrapes external sources into the vault, monitors vault health, and (now) includes git and secret-scanning tooling.

**Features:**
- **Source management & scraping** across many source types — websites, GitHub, YouTube, PDF, Reddit, RSS, CVE, Obsidian Publish, etc. (`SourcesView`, `SourceDetail`, `AddSourceModal`, `ScrapeView`, `ScrapeSummary`, `RunHistoryTable`, `ActiveRunsList`)
- **Vault Health** — totals, top folders, duplicates, dead links, composition chart (`VaultHealthView`, `VaultCompositionChart`)
- **Conflict resolution** for scraped-vs-existing notes (`ConflictsView`, `ConflictResolution`, `DiffViewer`)
- **AI tag review** (`TagReviewModal`)
- **Secret detection** — scan repos/vault for secrets, rotation, audit log (`SecretDetectionView`, `SecretRow`, `RotationModal`, `AuditLogView`, `secretIpc`)
- **Git tooling** — repos, branches, diff viewer (`ReposView`, `BranchesView`, `GitDiffViewer`, `RepoTabBar`)
- **CredVault sync** (`CredVaultSync`, `CredVaultView`)
- **Source health monitoring** and **backups** (`SourceHealthView`, `BackupModal`)

**Communicates:** writes `vaultscraper_status` (active scrape, vault note count, schedule); writes scraped `.md` into the vault; integrates with CredVault. External: configured source URLs, GitHub API, CVE APIs.

---

## 5.7 SignalBoard

**Purpose:** Security intelligence aggregator — pulls feeds/CVEs, scores them for relevance to your current work, and saves the useful ones to the vault.

**Features:**
- **Feed list & reading pane** with read/unread and save-to-vault (`FeedList`, `FeedItem`, `FeedView`, `ReadingPane`)
- **Relevance scoring** driven automatically by `shared_context` — your active lab/target boosts matching items (`AutoContextPanel`)
- **Custom keywords** for scoring (`CustomKeywords`)
- **Sources** management with custom RSS/CVE feeds (`SourcesView`, `SourcePanel`)
- **Trends**, **timeline**, **bookmarks** views (`TrendsView`, `TimelineView`, `BookmarksView`)
- **Search overlay** and **notifications** (`SearchOverlay`, `NotificationDropdown`)

**Communicates:** **reads** `shared_context` to auto-set relevance (no manual context needed); writes `signalboard_status`; saves articles as `.md` (with frontmatter) to `/SignalBoard/` in the vault. External: RSS/CVE feeds.

---

## 5.8 PlaybookStudio

**Purpose:** Build, run, and track step-by-step methodology playbooks — turning methodology from static notes into executable checklists.

**Features:**
- **Built-in playbooks** including **Web Application Assessment**, **OWASP Top 10 Assessment**, **Web App Pentest Phases**, **API Security Assessment**, **Mobile App Security**, **Linux Privilege Escalation**, **Active Directory Initial Access**, **Network Recon**, **Privilege Escalation Checklist**, plus **CCNA** sets (`builtinPlaybooks`, `builtinCcnaPlaybooks`)
- **Library** of playbooks and a **playbook editor** with per-step editing (`LibraryView`, `EditorView`, `StepEditor`)
- **Run mode** — execute a playbook as a tracked checklist with step detail and status (`RunView`, `StepDetail`; step status `todo/inprogress/done/skipped`)
- **History** of runs (`HistoryView`)
- **AI assistance** for steps (`aiHandler`)

**Communicates:** writes `playbookstudio_status`; emits events to the bus.

---

## 5.9 CredVault

**Purpose:** Encrypted credential and secret manager — the secure home for everything sensitive discovered during work.

**Features:**
- **Encrypted vault** with a lock screen and master unlock (`LockScreen`, `cryptoManager`, `vault-crypto`)
- **Credential entries** with metadata, add/edit (`CredentialModal`, `CredentialRow`, `VaultView`)
- **Password auditing & strength** analysis (`passwordAudit`, `passwordStrength`)
- **Import** incl. CSV, with fuzzy search (`ImportView`, `csvImport`, `fuzzySearch`)
- **Settings**, **onboarding**, audio notifications (`SettingsView`, `OnboardingModal`, `audioNotify`)
- **Consumes `credvault_pending`** — credentials discovered in ReconDesk land here automatically for secure storage (`ipc/credvault`)

**Communicates:** writes `credvault_status`; **consumes** the `credvault_pending` queue from ReconDesk; syncs with VaultCore.

---

## 5.10 ReportForge

**Purpose:** Professional assessment report generator — turns findings and engagement data into a polished, client-ready report.

**Features:**
- **Report editor** with sections, cover page, variables, comments (`ReportEditor`, `SectionEditor`, `SectionList`, `CoverEditor`, `VariablesPanel`, `CommentsPanel`)
- **Findings** with severity, CVSS, and **CVE lookup** (`FindingEditor`, `FindingsPanel`, `SeverityBadge`, `SeverityChart`, `CVELookup`)
- **Risk matrix** (`RiskMatrix`)
- **Import findings** (e.g. from ReconDesk) (`ImportFindingsModal`)
- **New-report wizard** and **templates** (`NewReportWizard`, `TemplateCard`)
- **Signature**, **print view**, and **export** (`SignatureEditor`, `PrintView`, `printStyles`, `ExportModal`, `markdownAssembler`)

**Communicates:** writes `reportforge_status`; reads findings to assemble reports; exports to the vault / disk.

---

## 5.11 TerminalLink

**Purpose:** Embedded terminal that captures command history into the active session — closing the gap between "ran a command" and "recorded it."

**Features:**
- **Real terminal** with split panes via a pty manager (`TerminalPane`, `TerminalSplit`, `ptyManager`)
- **Command logging & history** with search and per-command rows (`HistoryPanel`, `HistorySearch`, `CommandEntryRow`, `CommandPalette`)
- **SSH manager** for saved connections (`SshManager`)
- **Session replay** (`ReplayView`, `SessionsView`)
- **AI panel** for command help (`AiPanel`)
- **Push to GhostVault** (`GhostVaultModal`) and **capture overlay** (`CaptureOverlay`)
- **Context bar** reflecting the active target (`ContextBar`), **snippets** (`SnippetPanel`), **tool launcher**

**Communicates:** writes `terminallink_status`; reads `shared_context`; can push captured commands/output into GhostVault (vault).

---

## 5.12 NetworkMap

**Purpose:** Visual network topology mapper — turns scan output into an interactive graph of hosts, ports, and services.

**Features:**
- **Interactive graph canvas** with SVG rendering, minimap, subnet grouping (`GraphCanvas`, `GraphSvg`, `MiniMap`, `SubnetBubbles`)
- **nmap XML import / paste** (`ImportModal`, `PasteXmlModal`)
- **Node detail** and **context menu** (`NodeDetail`, `NodeContextMenu`)
- **Filters** and **graph toolbar** (`FilterPanel`, `GraphToolbar`)
- **Diff panel** to compare scans over time (`DiffPanel`)
- **Graph library** of saved maps (`GraphLibrary`)

**Communicates:** writes `networkmap_status`; emits events to the bus.

---

## 5.13 NetLab

**Purpose:** A networking lab and study workspace (CCNA-oriented) — labs, topologies, reference, and progress tracking.

**Features:**
- **Labs** with step-by-step lab views (`LabsView`, `LabStepView`)
- **Topology** view (`TopologyView`)
- **Reference** material and **snippets** (`ReferenceView`, `SnippetsView`)
- **Progress tracking** (`ProgressView`) and search (`SearchModal`)

**Communicates:** emits events to the bus; pairs conceptually with PlaybookStudio's CCNA playbooks.

---

# 6. What Each App Shares

### 6.1 Status blocks written to `cybertools-config.json`

| App | Status key | Representative metrics |
|---|---|---|
| ReconDesk | `recondesk_status` | active target, target count, card count |
| CyberLab Companion | `cyberlab_status` | current lab, findings, streak |
| GhostVault | `ghostvault_status` | note count, last capture |
| VaultCore | `vaultscraper_status` | active scrape, vault note count, schedule |
| SignalBoard | `signalboard_status` | feed/refresh state |
| TerminalLink | `terminallink_status` | session/command state |
| NetworkMap | `networkmap_status` | graph/scan state |
| PlaybookStudio | `playbookstudio_status` | active playbook/run |
| ReportForge | `reportforge_status` | active report |
| CredVault | `credvault_status` | vault lock/entry state |
| CyberOS Dashboard | `cyberos_status` | dashboard presence |

### 6.2 Cross-app shared objects

| Object | Producer(s) | Consumer(s) | Contents |
|---|---|---|---|
| `shared_context` | CyberLab, ReconDesk | SignalBoard, TerminalLink, Dashboard | `activeLab`, `activeTarget`, `activeIP` |
| `operator_profile` | ReconDesk, CyberLab (+others) | Dashboard | `streak`, `totalFlags`, `totalCredentials`, `skills`/`skillNodes`/`skillProgress`/`skillPoints` |
| `credvault_pending` | ReconDesk | CredVault | queued newly-found credentials for secure storage |
| `<app>.execPath` | every app | Launcher, Dashboard | binary location for spawning |

### 6.3 Obsidian vault writers/readers

| App | Direction | Path |
|---|---|---|
| GhostVault | write | anywhere |
| CyberLab Companion | write | `/CyberLab/`, `/Completed/` |
| VaultCore | write/read | `/[SourceName]/` (+ reads whole vault for health) |
| SignalBoard | write | `/SignalBoard/` |
| ReportForge | write | report exports |
| TerminalLink | write (via GhostVault) | capture notes |

---

# 7. System Map & Data Flows

```
                         OPERATOR
                            │
                 ┌──────────▼──────────┐
                 │  Cybertools Launcher │  tray hub — spawns & monitors all
                 └──────────┬──────────┘
        launches            │
   ┌───────────┬────────────┼───────────┬───────────┬───────────┐
   ▼           ▼            ▼           ▼           ▼           ▼
Dashboard  CyberLab     ReconDesk   GhostVault   VaultCore   SignalBoard
   │           │            │           │           │           │
   │           │ shared_context (lab/target/IP)     │           │
   │           ├──────────────┬─────────────────────────────────┘
   │           │              ▼ (SignalBoard auto-relevance)
   │           │         credvault_pending ──► CredVault
   │           │
   │           └─ writeups ─┐
   │     ReconDesk findings ─┼──► ReportForge ──► report export
   │                         ▼
   │                   Obsidian Vault  ◄── GhostVault, VaultCore, SignalBoard, CyberLab
   │
   ▼ reads everything
~/cybertools-config.json   +   ecosystem-events.json (event bus, Dashboard watches)

Also: TerminalLink (terminal + command logging → GhostVault),
      NetworkMap (scan → topology graph), NetLab (networking study),
      PlaybookStudio (methodology playbooks).
```

### Data-flow summary

| Flow | Path | Trigger |
|---|---|---|
| App status → Dashboard | app writes `<app>_status` → Dashboard reads | periodic |
| App events → Dashboard feed | app appends to event bus → Dashboard watches | on event |
| Active context → context-aware apps | CyberLab/ReconDesk write `shared_context` → SignalBoard etc. read | on session/target change |
| New credential → secure store | ReconDesk queues `credvault_pending` → CredVault consumes | on credential add |
| Findings → report | ReconDesk findings → ReportForge import → export | on report build |
| Notes/scrapes/articles → vault | GhostVault/VaultCore/SignalBoard/CyberLab write `.md` | on save/scrape/capture |
| Stats → operator profile | apps update `operator_profile` → Dashboard renders | on flag/cred/skill change |
| Launch → app | Launcher/Dashboard read `execPath` → spawn binary | on click |

---

# 8. Shared Technical Foundation

### 8.1 Stack (every app)
Electron 33 · electron-vite 2.x · React 18 · TypeScript 5 · Tailwind CSS 3 · Framer Motion 11 · Zustand 4.

### 8.2 Preload format — the critical build rule
Apps with `"type": "module"` in `package.json` (the ESM apps — Dashboard, CyberLab, Launcher, GhostVault, PlaybookStudio, ReportForge, NetLab, NetworkMap) **must** set `output: { format: 'cjs' }` in the preload build config and reference `preload.cjs`. Without it, electron-vite emits `.mjs`, which the Electron sandbox cannot load and the app fails to start. The non-ESM apps reference `preload.js`/`preload.mjs` directly — if an app won't launch, this is the first thing to check.

### 8.3 Persistence
Per-app JSON via atomic write (temp file + rename), e.g. `~/.recondesk/data.json`, `~/.signalboard/`, `~/.cyberlab-companion/sessions/`. App data survives independently of the shared config.

### 8.4 Design system
Shared dark theme with CSS-variable theming (`--bg`, `--accent`, `--text`), a dual Background × Accent theme system, `titleBarStyle: 'hiddenInset'` on macOS with traffic lights at `{x:16, y:16}`, draggable header regions, and Framer Motion animations. See `CYBEROS_DESIGN_BIBLE.md` for the full token set.

### 8.5 External services
Anthropic Claude API (CyberLab chat/writeups, optional AI panels) · Ollama local models (GhostVault, optional) · HTB / THM (CyberLab progress) · RSS / CVE feeds (SignalBoard) · source URLs + GitHub/CVE APIs (VaultCore). Every external dependency fails soft — the app stays usable if the service is unavailable.

---

*ItsEliias // CyberOS Ecosystem Guide v2.0 — rebuilt from the live codebase.*
