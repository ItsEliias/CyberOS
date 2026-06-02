# MANUS PROMPT — ReportForge
### CyberOS Ecosystem UI/UX Implementation Project

---

## MANDATORY FIRST STEP

Read `CYBEROS_DESIGN_BIBLE.md` first. All design decisions must conform to it.

---

## YOUR ROLE

Produce production-ready React + TypeScript + Tailwind CSS + Framer Motion + Zustand code for ReportForge. No placeholders. No pseudo-code. Directly implementable in Electron.

---

## CONTEXT: WHAT IS REPORTFORGE?

ReportForge is the **professional assessment report generator**. After completing a lab or engagement, the operator uses ReportForge to assemble a polished report from the data collected across the CyberOS ecosystem — ReconDesk target data, CyberLab writeups, credentials discovered — and exports it as Markdown or PDF.

**Accent color:** `#3fb950` (Green)

---

## DATA MODEL

```typescript
interface Report {
  id: string;
  title: string;
  targetName: string;
  targetIP: string;
  platform: string;
  date: string;
  operatorName: string;
  status: 'draft' | 'complete';
  createdAt: string;
  updatedAt: string;
  
  sections: ReportSection[];
  findings: Finding[];
}

interface ReportSection {
  id: string;
  title: string;
  content: string;    // Markdown
  order: number;
  visible: boolean;
}

interface Finding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  evidence: string;        // Markdown
  impact: string;
  recommendation: string;
  cvssScore?: number;
  linkedCardRef?: string;  // ReconDesk attack card reference
  references: string[];    // URLs
}
```

**Default sections (in order):**
1. Cover
2. Executive Summary
3. Scope
4. Methodology
5. Findings
6. Credentials Discovered
7. Recommendations
8. Appendix

---

## SCREENS TO BUILD

### Screen 1: Report Library (Home)

Grid of all saved reports.

**Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│  TitleBar: [●●●] 📄 ReportForge                [+ New Report] │
├────────────────────────────────────────────────────────────────┤
│  [Search reports...]                          [Sort: Recent ▾] │
│                                                                │
│  ┌─────────────────────────┐  ┌──────────────────────────┐   │
│  │ Pickle Rick Assessment   │  │ Blue Machine — EternalBlue│   │
│  │ THM • 2026-06-03         │  │ THM • 2026-06-02          │   │
│  │ 4 findings • Draft       │  │ 6 findings • Complete     │   │
│  │ [Open]  [Duplicate] [🗑] │  │ [Open]  [Duplicate] [🗑] │   │
│  └─────────────────────────┘  └──────────────────────────┘   │
│                                                                │
│  [Empty state if no reports]                                   │
└────────────────────────────────────────────────────────────────┘
```

**Report card:**
- Title, platform, date
- Finding count with severity dot summary (colors)
- Status badge: Draft (amber) / Complete (green)
- Open, Duplicate, Delete actions

---

### Screen 2: New Report Wizard (3-step)

**Step 1 — Metadata:**
```
┌──────────────────────────────────────────────────────┐
│  New Report  ○──●──○                                 │
│  Step 1 of 3: Report Details                         │
├──────────────────────────────────────────────────────┤
│  Report Title:     [Pickle Rick Assessment        ]  │
│  Target Name:      [Pickle Rick                  ]  │
│  Target IP:        [10.10.3.164                  ]  │
│  Platform:         [THM ▾]                          │
│  Assessment Date:  [2026-06-03                   ]  │
│  Operator Name:    [ItsEliias                    ]  │
│                                                      │
│                          [Cancel]  [Next →]          │
└──────────────────────────────────────────────────────┘
```

**Step 2 — Import from ReconDesk:**
```
┌──────────────────────────────────────────────────────┐
│  New Report  ●──●──○                                 │
│  Step 2 of 3: Import Reconnaissance Data             │
├──────────────────────────────────────────────────────┤
│  Import target data from ReconDesk?                  │
│                                                      │
│  Select target:  [Pickle Rick ▾]                    │
│                                                      │
│  Preview:                                            │
│  ✓ Target name + IP                                 │
│  ✓ 5 open ports → will populate Findings section   │
│  ✓ 2 credentials → Credentials Discovered section  │
│  ✓ 8 attack cards → Findings entries               │
│                                                      │
│  [Skip this step]       [← Back]  [Import & Next →] │
└──────────────────────────────────────────────────────┘
```

**Step 3 — Import CyberLab Writeup:**
```
┌──────────────────────────────────────────────────────┐
│  New Report  ●──●──●                                 │
│  Step 3 of 3: Import Lab Writeup                     │
├──────────────────────────────────────────────────────┤
│  Import a CyberLab writeup for Executive Summary?    │
│                                                      │
│  Vault path: ~/Documents/ObsidianVault/              │
│  [Browse for writeup .md file]                       │
│                                                      │
│  OR paste markdown directly:                         │
│  [Large textarea for Markdown paste]                 │
│                                                      │
│  [Skip this step]    [← Back]  [Create Report →]    │
└──────────────────────────────────────────────────────┘
```

---

### Screen 3: Report Editor (Primary workspace)

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  TitleBar: [●●●] 📄 Pickle Rick Assessment          [Export ▾]  │
├──────────────────────────────────────────────────────────────────┤
│  SECTIONS (left, 240px)   │  EDITOR (center, flex-1)            │
│                           │                                      │
│  ≡ Cover           [●]   │  EXECUTIVE SUMMARY                   │
│  ≡ Executive Sum.  [●]   │  ─────────────────────────────────── │
│  ≡ Scope           [●]   │  [Markdown editor — full height]     │
│  ≡ Methodology     [●]   │                                      │
│  ≡ Findings        [●]   │  This assessment was performed on    │
│  ≡ Credentials     [●]   │  10.10.3.164 (Pickle Rick, THM)...  │
│  ≡ Recommendations [●]   │                                      │
│  ≡ Appendix        [○]   │  [Rich Markdown editor with toolbar] │
│                           │  [B] [I] [Code] [Link] [Table] [H1] │
│  [+ Add Section]          │                                      │
│                           │                                      │
│  ──────────────────────── │                                      │
│  FINDINGS (4)             │                                      │
│  [●] Critical (1)         │                                      │
│  [●] High     (1)         │                                      │
│  [●] Medium   (2)         │                                      │
│  [+ Add Finding]          │                                      │
└───────────────────────────┴──────────────────────────────────────┘
│  Draft • Auto-saved 5s ago • 4 findings                         │
└──────────────────────────────────────────────────────────────────┘
```

**Section list (left panel):**
- Drag handle (≡) for reordering
- Visibility toggle [●/○] — hide sections from export without deleting
- Click section: loads in editor
- Active section: green left border accent

**Editor (center):**
- Full Markdown editor with a minimal toolbar
- The "Findings" section renders the findings table automatically (not directly edited — findings are managed in the Findings panel below)
- The "Credentials Discovered" section auto-renders the credentials table from imported ReconDesk data
- Other sections: free Markdown

**Findings panel (bottom of left panel):**
- Grouped by severity (Critical, High, Medium, Low, Info)
- Colored dots matching severity
- Click to expand finding detail inline
- "+ Add Finding" opens finding form
- Finding form fields: Title, Severity (select), Description (markdown), Evidence (markdown), Impact, Recommendation, CVSS Score (numeric), References (URL list)

---

### Screen 4: Export Modal

```
┌──────────────────────────────────┐
│  Export Report                   │
├──────────────────────────────────┤
│  Format:                         │
│  ● Markdown (.md)                │
│  ○ PDF (.pdf)                    │
│                                  │
│  Include:                        │
│  [✓] Table of contents          │
│  [✓] Finding severity table     │
│  [✓] Credentials section        │
│  [○] Raw nmap output (appendix) │
│                                  │
│  [Cancel]  [Export]              │
└──────────────────────────────────┘
```

- Markdown: assembles all visible sections + findings into one `.md` file
- PDF: uses `webContents.printToPDF()` with print-optimized CSS
  - Print CSS: white background, black text, page breaks between sections
  - CyberOS branding in header/footer: subtle, not distracting
- File save via system dialog

---

## ZUSTAND STORE

```typescript
interface ReportForgeState {
  reports: Report[];
  activeReportId: string | null;
  activeSectionId: string | null;
  activeView: 'library' | 'wizard' | 'editor' | 'settings';
  wizardStep: 1 | 2 | 3;
  wizardData: Partial<Report>;
  
  isDirty: boolean;
  lastSavedAt: Date | null;
  
  // Actions
  loadReports: () => Promise<void>;
  saveReports: () => Promise<void>;
  
  createReport: (data: Partial<Report>) => string;  // returns new ID
  openReport: (id: string) => void;
  duplicateReport: (id: string) => void;
  deleteReport: (id: string) => void;
  
  updateSection: (reportId: string, sectionId: string, content: string) => void;
  toggleSectionVisibility: (reportId: string, sectionId: string) => void;
  reorderSections: (reportId: string, sectionIds: string[]) => void;
  addSection: (reportId: string, title: string) => void;
  
  addFinding: (reportId: string, finding: Omit<Finding, 'id'>) => void;
  updateFinding: (reportId: string, findingId: string, patch: Partial<Finding>) => void;
  deleteFinding: (reportId: string, findingId: string) => void;
  
  importFromReconDesk: (reportId: string, targetName: string) => Promise<void>;
  importWriteup: (reportId: string, markdownContent: string) => void;
  
  exportMarkdown: (reportId: string) => Promise<void>;
  exportPDF: (reportId: string) => Promise<void>;
  
  writeStatus: () => Promise<void>;
  emitEvent: (event: string, data?: unknown) => Promise<void>;
}
```

---

## IPC HANDLERS

```typescript
ipcMain.handle('reportforge:reports:read', async () => { /* read reports.json from app data */ })
ipcMain.handle('reportforge:reports:write', async (_, reports) => { /* atomic write */ })
ipcMain.handle('reportforge:config:read', async () => { /* read recondesk target data from cybertools-config.json */ })
ipcMain.handle('reportforge:vault:read', async (_, filePath: string) => { /* read .md file from vault */ })
ipcMain.handle('reportforge:export:markdown', async (_, content: string, filename: string) => { /* save dialog + write */ })
ipcMain.handle('reportforge:export:pdf', async (event, reportId: string) => { /* printToPDF + save dialog */ })
ipcMain.handle('reportforge:config:write-status', async (_, patch) => { /* write reportforge_status */ })
ipcMain.handle('reportforge:event:emit', async (_, event) => { /* append to ecosystem-events.json */ })
```

---

## COMPONENT ARCHITECTURE

```
src/
├── renderer/
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── library/
│   │   │   ├── ReportLibrary.tsx
│   │   │   └── ReportCard.tsx
│   │   ├── wizard/
│   │   │   ├── WizardStep1.tsx
│   │   │   ├── WizardStep2.tsx
│   │   │   └── WizardStep3.tsx
│   │   ├── editor/
│   │   │   ├── ReportEditor.tsx
│   │   │   ├── SectionList.tsx
│   │   │   ├── SectionListItem.tsx
│   │   │   ├── MarkdownEditor.tsx
│   │   │   ├── FindingsPanel.tsx
│   │   │   ├── FindingCard.tsx
│   │   │   ├── FindingForm.tsx
│   │   │   └── SeveritySummary.tsx
│   │   └── export/
│   │       └── ExportModal.tsx
│   ├── stores/
│   │   └── useReportForgeStore.ts
│   ├── utils/
│   │   ├── markdownAssembler.ts    # Assembles sections + findings into one .md
│   │   └── printStyles.ts          # Print CSS for PDF export
│   └── types/
│       └── reportforge.ts
```

---

## ANIMATIONS

- **Library cards:** stagger on load
- **Wizard steps:** slide transition between steps (step 1 slides out left, step 2 slides in right)
- **Section list reorder:** Framer Motion Reorder component
- **Finding form expand:** slide down from the finding card
- **Export modal:** scale + fade in
- **Auto-save indicator:** brief flash of "Saved ✓" in status bar

---

## CRITICAL REQUIREMENTS

1. Auto-save every 30 seconds — dirty state tracking is mandatory
2. PDF export must use Electron's native `printToPDF` — no external libraries
3. The print CSS must produce a clean, professional document: white background, readable typography, page breaks between major sections
4. Importing from ReconDesk reads from `cybertools-config.json` directly — reads the target data that ReconDesk writes there
5. Passwords/hashes from imported credentials must NOT appear in the default Markdown export — show `[redacted]` unless operator explicitly enables them in export settings
6. Drag-to-reorder sections must update the `order` field on all sections
7. The "Findings" section in the editor must auto-render a severity-sorted table from the findings array, not from free Markdown
8. Report IDs must be UUIDs — no sequential integers

---

## DELIVERABLES

1. All component files
2. Zustand store
3. Markdown assembler utility
4. Print CSS styles
5. IPC handlers
6. Type definitions
7. `IMPLEMENTATION_PLAN.md` for ReportForge

---

*Read CYBEROS_DESIGN_BIBLE.md first.*
