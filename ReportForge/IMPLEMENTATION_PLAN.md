# ReportForge — Implementation Plan

## Overview

ReportForge is the professional assessment report generator in the CyberOS ecosystem. It assembles polished reports from data collected across CyberOS apps — ReconDesk targets, CyberLab writeups, discovered credentials — and exports them as Markdown or PDF.

**Accent colour:** `#3fb950` (Green)

---

## Architecture

### Process Model

```
Main (Electron)          Renderer (React + Zustand)
─────────────────        ──────────────────────────
main.ts                  App.tsx
  IPC handlers             useStore (Zustand)
  File I/O                 Components
  PDF export               utils/
  Ecosystem bus            types/
```

### Technology Stack

| Layer         | Technology                        |
|---------------|-----------------------------------|
| Framework     | Electron 33 + electron-vite       |
| Renderer      | React 18 + TypeScript             |
| State         | Zustand                           |
| Styling       | Tailwind CSS + CSS Variables      |
| Animation     | Framer Motion                     |
| Build         | electron-vite + Vite 5            |

---

## Data Model

### Core Types (`src/shared/types.ts`)

- **`Report`** — Top-level report entity: metadata + sections + findings
- **`ReportSection`** — Ordered, togglable Markdown section
- **`Finding`** — Security finding with severity, CVSS, evidence, references
- **`Severity`** — `critical | high | medium | low | info`
- **`ReportTemplate`** — `blank | ptes | owasp-web | htb-machine`

### Default Sections (in order)

1. Cover
2. Executive Summary
3. Scope
4. Methodology
5. Findings *(auto-generated from findings array)*
6. Credentials Discovered *(redacted by default)*
7. Recommendations
8. Appendix

---

## Screen Architecture

### Screen 1: Report Library (`ReportLibrary.tsx`)

- Grid of report cards with stagger-on-load animation
- Search (title, target, platform) + sort (recent / title / findings)
- Each card shows: title, platform badge, target, date, severity dot summary, status badge
- Actions: Open, Duplicate, Delete

### Screen 2: New Report Wizard (`NewReportWizard.tsx`)

**4 steps** (extended beyond spec 3-step to include template selection):

| Step | Content                  |
|------|--------------------------|
| 1    | Template selection       |
| 2    | Report metadata          |
| 3    | Import from ReconDesk    |
| 4    | Import CyberLab writeup  |

- Step transitions: slide in/out via Framer Motion AnimatePresence
- Step 3 reads `cybertools-config.json` → `recondesk_status.targets`
- Step 4 supports: vault file browser, paste Markdown directly, GhostVault staged export
- Credentials imported from ReconDesk are placed in the Credentials Discovered section as a Markdown table

### Screen 3: Report Editor (`ReportEditor.tsx`)

**Left panel** (210px):
- Tabs: Sections / Findings
- Sections tab: Framer Motion `Reorder.Group` for drag-to-reorder; visibility toggle per section; active section has green left border
- Findings tab: Severity-sorted table of findings; click to edit in FindingEditor modal

**Center pane**:
- `SectionEditor.tsx`: Edit / Split / Preview modes; Markdown toolbar (B, I, Code, H1, Link, Code Block, Table)
- Findings section renders auto-generated notice directing to the Findings tab
- Markdown preview uses inline HTML renderer (no external library)

**Status bar** (`StatusBar.tsx`): Status badge, auto-save time, findings count, visible sections count

**EditorHeader** (`EditorHeader.tsx`): Back to library, report title (inline editable), severity summary, status toggle (Draft ↔ Complete), Save, Export menu

### Screen 4: Export Modal (`ExportModal.tsx`)

- Format: Markdown or PDF
- Include options: TOC, findings severity table, credentials section, raw nmap output
- Credentials sub-option: redact passwords/hashes (on by default)
- Scale + fade animation (Framer Motion)

---

## Auto-Save

- Interval: 30 seconds
- Triggers only when `dirty === true` and view is `editor`
- On save: clears dirty flag, updates `lastSavedAt`, flashes "Saved ✓" in status bar
- Also saves on "Back to Library" if dirty

---

## Export

### Markdown Export (`utils/markdownAssembler.ts`)

1. Document header (title, metadata)
2. Optional: Table of Contents
3. Optional: Finding severity summary table
4. Visible sections in order:
   - Findings section → auto-assembled from findings array, severity-sorted
   - Credentials Discovered → redacted by default (`[redacted]` replaces password/hash columns)
   - All other sections → raw Markdown content

### PDF Export

1. Main process sends `trigger-print-view` to renderer with the full Report object
2. Renderer mounts `PrintView.tsx` (white background, print-optimised layout)
3. `PrintView` injects `PRINT_STYLES` CSS (`utils/printStyles.ts`) and calls `onReady` after 500ms
4. `onReady` calls `window.reportforge.signalPrintReady()` → IPC resolves the pending `printReadyResolver`
5. Main calls `webContents.printToPDF({ printBackground: true, pageSize: 'A4' })`
6. Saves to user-chosen path; renderer un-mounts `PrintView`

**Print CSS features:** A4 page size, 20mm margins, white background, serif body font, page breaks between major sections, colour-coded severity borders, CyberOS green accent for cover rule.

---

## IPC Handlers

| Channel                              | Direction         | Purpose                               |
|--------------------------------------|-------------------|---------------------------------------|
| `load-reports`                       | renderer → main   | Load all reports from reports.json    |
| `save-report`                        | renderer → main   | Upsert report; write reports.json     |
| `delete-report`                      | renderer → main   | Remove report by ID                   |
| `duplicate-report`                   | renderer → main   | Clone report with new UUID            |
| `get-shared-config`                  | renderer → main   | Read cybertools-config.json           |
| `list-recon-targets`                 | renderer → main   | ReconDesk targets from shared config  |
| `list-writeup-files`                 | renderer → main   | .md files from Obsidian vault         |
| `read-writeup-file`                  | renderer → main   | Read a vault .md file by path         |
| `export-markdown`                    | renderer → main   | Assemble + save-dialog .md export     |
| `export-pdf`                         | renderer → main   | printToPDF + save-dialog export       |
| `signal-print-ready`                 | renderer → main   | Renderer signals PDF DOM is ready     |
| `trigger-print-view`                 | main → renderer   | Main tells renderer to mount PrintView|
| `print-done`                         | main → renderer   | Main tells renderer PDF capture done  |
| `open-external`                      | renderer → main   | shell.openExternal for URLs           |
| `reportforge:check-ghostvault`       | renderer → main   | Check for staged GhostVault export    |
| `reportforge:clear-ghostvault-export`| renderer → main   | Clear GhostVault export from config   |
| `ecosystem-emit`                     | renderer → main   | Write event to ecosystem-events.json  |

---

## File Structure

```
src/
├── main/
│   ├── main.ts               — Electron main, IPC handlers, PDF export
│   ├── preload.ts            — contextBridge API surface
│   └── ecosystem-bus.ts      — ecosystem-events.json append utility
├── shared/
│   └── types.ts              — Report, Finding, ReportSection, etc.
└── renderer/
    ├── App.tsx               — Root: routing, auto-save, export orchestration
    ├── store.ts              — Zustand store
    ├── main.tsx              — React entry point
    ├── index.css             — CSS variables, buttons, badges, print media
    ├── globals.css           — Tailwind base + glassmorphism + drag regions
    ├── env.d.ts              — Window type declarations
    ├── index.html
    ├── lib/
    │   └── defaults.ts       — makeId, makeReport, templates, SEV_COLORS
    ├── types/
    │   └── reportforge.ts    — Renderer-only types (AppView, ExportOptions, etc.)
    ├── utils/
    │   ├── markdownAssembler.ts — Assembles sections + findings → .md
    │   └── printStyles.ts       — Print CSS + inject/remove helpers
    └── components/
        ├── layout/
        │   ├── TitleBar.tsx     — Frameless title bar (Tailwind)
        │   └── StatusBar.tsx    — Editor status bar
        ├── export/
        │   └── ExportModal.tsx  — Export format + options modal
        ├── App.tsx              — (root, see above)
        ├── ReportLibrary.tsx    — Library grid + ReportCard
        ├── NewReportWizard.tsx  — 4-step creation wizard
        ├── ReportEditor.tsx     — Editor shell (header + panels + status bar)
        ├── EditorHeader.tsx     — Header with title, export, status toggle
        ├── SectionList.tsx      — Drag-to-reorder sections + findings tabs
        ├── SectionEditor.tsx    — Markdown editor with toolbar + preview
        ├── FindingsPanel.tsx    — Findings table grouped by severity
        ├── FindingEditor.tsx    — Finding create/edit modal
        ├── SeverityBadge.tsx    — SeverityBadge + SeveritySummary components
        ├── TemplateCard.tsx     — Template selection card
        ├── PrintView.tsx        — White-background PDF render target
        └── Toast.tsx            — Toast notification system
```

---

## Security Notes

- Credentials imported from ReconDesk are **redacted by default** in all exports
- The `redactCredentialContent()` function targets password/hash column values in Markdown tables using regex patterns for hashes (MD5/NTLM/bcrypt) and long alphanumeric strings
- Operator must explicitly disable redaction in the Export Modal to expose credentials
- Report IDs are RFC 4122 UUID v4 (via `crypto.randomUUID()`)
- Context isolation is enabled; Node integration is disabled in renderer

---

## Ecosystem Integration

| App        | Integration                                                      |
|------------|------------------------------------------------------------------|
| ReconDesk  | Reads `recondesk_status.targets` from `cybertools-config.json`  |
| CyberLab   | Reads `.md` files from Obsidian vault path in shared config     |
| GhostVault | Reads `ghostvault_export` from shared config (staged export)    |
| Dashboard  | Writes `reportforge_status` to shared config every 15 seconds  |
| All apps   | Appends events to `ecosystem-events.json` via ecosystem-bus     |
