import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import * as ecosystemBus from './ecosystem-bus.js';
import { consumePendingAction, installPendingActionWatcher } from './pendingActions.js'
import { launchPeerApp } from './platform.js'
import type {
  Report, CyberToolsSharedConfig, ExportResult, WriteupFile, ReconDeskTarget
} from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Constants ────────────────────────────────────────────────────────────────
const APP_VERSION       = '1.0.0';
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json');
const DATA_DIR          = path.join(os.homedir(), 'Library', 'Application Support', 'ReportForge');
const REPORTS_FILE      = path.join(DATA_DIR, 'reports.json');

// ─── Crash reporter (locally-stored minidumps; nothing uploaded) ─────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
try { require('electron').crashReporter.start({ uploadToServer: false, productName: "ReportForge", companyName: 'CyberOS' }) } catch { /* unavailable */ }

let mainWindow: BrowserWindow | null = null;
let statusInterval: ReturnType<typeof setInterval> | null = null;
let printReadyResolver: (() => void) | null = null;

// ─── Dirs ─────────────────────────────────────────────────────────────────────
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Reports persistence ──────────────────────────────────────────────────────
function loadReports(): Report[] {
  try {
    if (fs.existsSync(REPORTS_FILE)) return JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
  } catch (_) {}
  return [];
}

// Atomic write — tmp + rename so a crash mid-write can't leave a half-written
// cybertools-config.json that breaks every cooperating CyberOS app.
function writeSharedConfigAtomic(cfg: unknown): void {
  const tmp = `${CYBERTOOLS_CONFIG}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmp, CYBERTOOLS_CONFIG);
}

function saveReports(reports: Report[]): boolean {
  try {
    // Atomic write — a crash mid-fs.writeFileSync used to leave a half-written
    // reports.json that failed to parse on next launch, losing every report.
    const tmp = `${REPORTS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(reports, null, 2), 'utf8');
    fs.renameSync(tmp, REPORTS_FILE);
    return true;
  } catch (e) {
    console.error('[ReportForge] saveReports:', (e as Error).message);
    return false;
  }
}

// ─── Shared config helpers ────────────────────────────────────────────────────
function readSharedConfig(): CyberToolsSharedConfig {
  try {
    if (fs.existsSync(CYBERTOOLS_CONFIG)) return JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'));
  } catch (_) {}
  return {};
}

function writeReportForgeStatus() {
  try {
    const shared = readSharedConfig();
    const reports = loadReports();
    shared.reportforge_status = {
      active      : true,
      lastActive  : new Date().toISOString(),
      reportCount : reports.length
    };
    writeSharedConfigAtomic(shared);
  } catch (e) {
    console.warn('[ReportForge] status write failed:', (e as Error).message);
  }
}

function startStatusWriter() {
  writeReportForgeStatus();
  statusInterval = setInterval(writeReportForgeStatus, 15000);
}

function stopStatusWriter() {
  if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }
  try {
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      const shared = readSharedConfig();
      if (shared.reportforge_status) (shared.reportforge_status as Record<string, unknown>).active = false;
      writeSharedConfigAtomic(shared);
    }
  } catch (_) {}
}

// ─── Markdown export helper ───────────────────────────────────────────────────
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

interface AssembleOptions {
  includeToc?: boolean;
  includeFindingsTable?: boolean;
  includeCredentials?: boolean;
  redactCredentials?: boolean;
  includeRawNmap?: boolean;
}

function redactCredentialContent(content: string): string {
  // Redact password/hash columns from Markdown tables.
  // Matches pipe-delimited table rows containing password-like values.
  return content.replace(
    /(\|[^|\n]*\|)([^|\n]+)(\|[^|\n]*\|?)/g,
    (match, _pre, cell, _post) => {
      // Heuristic: if the row is a credential table body row (has | Username | Password | columns)
      // we just do a full replacement below
      return match;
    }
  ).replace(
    // Replace password/hash values in table rows — look for rows that look like cred table entries
    /(\| *[^\n|]+ *\| *)([A-Za-z0-9$./+]{6,}|[a-f0-9]{32,})( *\|)/g,
    '$1[redacted]$3'
  );
}

function assembleMarkdown(report: Report, opts: AssembleOptions = {}): string {
  const {
    includeToc = true,
    includeFindingsTable = true,
    includeCredentials = true,
    redactCredentials = true,
    includeRawNmap = false,
  } = opts;

  const lines: string[] = [];

  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push(`**Target:** ${report.targetName}${report.targetIP ? ` (${report.targetIP})` : ''} | **Platform:** ${report.platform} | **Date:** ${report.assessmentDate} | **Operator:** ${report.operator}`);
  if (report.difficulty) lines.push(`**Difficulty:** ${report.difficulty}`);
  lines.push('');

  const sorted = [...report.sections]
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order)
    .filter(s => {
      if (!includeCredentials && s.title === 'Credentials Discovered') return false;
      if (!includeRawNmap && (s.title === 'Appendix' || s.title === 'Appendices')) {
        // Still include appendix unless raw nmap filter is off — keep it simple; just filter if titled "Raw Output"
      }
      return true;
    });

  // Table of contents
  if (includeToc && sorted.length > 1) {
    lines.push('## Table of Contents');
    lines.push('');
    sorted.forEach((s, i) => {
      const anchor = s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      lines.push(`${i + 1}. [${s.title}](#${anchor})`);
    });
    lines.push('');
  }

  // Findings severity summary table
  if (includeFindingsTable && report.findings.length > 0) {
    lines.push('## Finding Summary');
    lines.push('');
    lines.push('| # | Title | Severity | CVSS |');
    lines.push('|---|-------|----------|------|');
    const sortedFindings = [...report.findings].sort((a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    );
    sortedFindings.forEach((f, i) => {
      lines.push(`| ${i + 1} | ${f.title} | ${f.severity.toUpperCase()} | ${f.cvss ?? '—'} |`);
    });
    lines.push('');
  }

  for (const section of sorted) {
    if (section.title === 'Findings') {
      lines.push('## Findings');
      lines.push('');
      const grouped: Record<string, typeof report.findings> = {};
      SEVERITY_ORDER.forEach(s => { grouped[s] = []; });
      report.findings.forEach(f => { if (grouped[f.severity]) grouped[f.severity].push(f); });
      for (const sev of SEVERITY_ORDER) {
        for (const f of grouped[sev]) {
          lines.push(`### [${f.severity.toUpperCase()}] ${f.title}`);
          if (f.cvss) lines.push(`**CVSS:** ${f.cvss}`);
          lines.push('');
          lines.push(`**Description:** ${f.description}`);
          lines.push('');
          if (f.evidence) { lines.push(`**Evidence:**`); lines.push(''); lines.push(f.evidence); lines.push(''); }
          if (f.impact) lines.push(`**Impact:** ${f.impact}`);
          lines.push('');
          if (f.recommendation) lines.push(`**Recommendation:** ${f.recommendation}`);
          if (f.references.length > 0) {
            lines.push('');
            lines.push('**References:**');
            f.references.forEach(r => lines.push(`- ${r}`));
          }
          lines.push('');
        }
      }
    } else if (section.title === 'Credentials Discovered') {
      if (!includeCredentials) continue;
      lines.push(`## ${section.title}`);
      lines.push('');
      const content = redactCredentials
        ? redactCredentialContent(section.content)
        : section.content;
      if (content.trim()) lines.push(content);
      lines.push('');
    } else {
      lines.push(`## ${section.title}`);
      lines.push('');
      if (section.content.trim()) lines.push(section.content);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Main window ──────────────────────────────────────────────────────────────
function createWindow() {
  const preloadPath = path.join(__dirname, '..', 'preload', 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1100, height: 750,
    minWidth: 900, minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d0f0d',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
    // Give the renderer time to mount its pending-action listener
    setTimeout(() => {
      const result = consumePendingAction('reportforge');
      if (result && mainWindow) {
        mainWindow.webContents.send('pending-action', result.action);
      }
    }, 800);
    // Listen for tray-action writes while the app is already running
    installPendingActionWatcher('reportforge', (action) => {
      try { mainWindow?.webContents.send('pending-action', action) } catch { /* ignore */ }
    })
  });
  mainWindow.on('close', () => { mainWindow = null; });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  ensureDirs();
  createWindow();
  startStatusWriter();
  ecosystemBus.emitEvent('ReportForge', 'app:opened', {});
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('before-quit', () => stopStatusWriter());
app.on('window-all-closed', () => { app.quit(); });

// ─── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.handle('get-version', () => APP_VERSION);

// ─── SSO state (read from shared cybertools-config.json) ─────────────────────
// Returns CredVault's session state so the renderer can soft-lock when the
// user has opted into "Require CredVault session".
ipcMain.handle('get-sso', () => {
  try {
    const cfgPath = path.join(os.homedir(), 'cybertools-config.json');
    if (!fs.existsSync(cfgPath)) return { unlocked: false };
    const shared = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {};
    const sso = shared.sso as { unlocked?: boolean; expiresAt?: string | null; unlockedAt?: string | null } | undefined;
    if (!sso?.unlocked) return { unlocked: false };
    if (sso.expiresAt && new Date(sso.expiresAt).getTime() < Date.now()) return { unlocked: false };
    return { unlocked: true, unlockedAt: sso.unlockedAt, expiresAt: sso.expiresAt };
  } catch { return { unlocked: false }; }
});

ipcMain.handle('open-credvault', () => launchPeerApp('CredVault'))
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('close-window',    () => mainWindow?.close());

// Reports CRUD
ipcMain.handle('load-reports', () => loadReports());

ipcMain.handle('save-report', (_, report: Report) => {
  const reports = loadReports();
  const idx = reports.findIndex(r => r.id === report.id);
  const now = new Date().toISOString();
  report.updatedAt = now;
  if (idx >= 0) {
    reports[idx] = report;
  } else {
    report.createdAt = report.createdAt || now;
    reports.unshift(report);
  }
  const ok = saveReports(reports);
  if (ok) writeReportForgeStatus();
  return ok;
});

ipcMain.handle('delete-report', (_, id: string) => {
  const reports = loadReports().filter(r => r.id !== id);
  const ok = saveReports(reports);
  if (ok) writeReportForgeStatus();
  return ok;
});

ipcMain.handle('duplicate-report', (_, id: string) => {
  const reports = loadReports();
  const source = reports.find(r => r.id === id);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy: Report = {
    ...JSON.parse(JSON.stringify(source)),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${source.title} (Copy)`,
    createdAt: now,
    updatedAt: now,
  };
  reports.unshift(copy);
  saveReports(reports);
  writeReportForgeStatus();
  return copy;
});

// Ecosystem import
ipcMain.handle('get-shared-config', () => readSharedConfig());

ipcMain.handle('list-recon-targets', (): ReconDeskTarget[] => {
  try {
    const cfg = readSharedConfig();
    return (cfg.recondesk_status?.targets as ReconDeskTarget[]) || [];
  } catch { return []; }
});

ipcMain.handle('list-writeup-files', (): WriteupFile[] => {
  try {
    const cfg = readSharedConfig();
    const vaultPath = (cfg.cyberlab as { obsidianVault?: string } | undefined)?.obsidianVault
      || cfg.obsidianVaultPath as string | undefined;
    if (!vaultPath || !fs.existsSync(vaultPath as string)) return [];
    const results: WriteupFile[] = [];
    function walk(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.md')) {
          const stat = fs.statSync(full);
          results.push({ name: e.name.replace('.md', ''), path: full, mtime: stat.mtimeMs });
        }
      }
    }
    walk(vaultPath as string);
    return results.sort((a, b) => b.mtime - a.mtime).slice(0, 50);
  } catch { return []; }
});

ipcMain.handle('read-writeup-file', (_, filePath: string): string => {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
});

// Export
ipcMain.handle('export-markdown', async (_, report: Report, opts?: AssembleOptions): Promise<ExportResult> => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export Markdown',
      defaultPath: `${report.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false };
    const md = assembleMarkdown(report, opts ?? { redactCredentials: true });
    fs.writeFileSync(result.filePath, md, 'utf8');
    ecosystemBus.emitEvent('ReportForge', 'report:exported', { title: report.title, target: report.targetName, format: 'markdown' });
    return { ok: true, path: result.filePath };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
});

ipcMain.handle('export-pdf', async (_, report: Report): Promise<ExportResult> => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export PDF',
      defaultPath: `${report.title.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false };

    if (!mainWindow) return { ok: false, error: 'No window' };
    mainWindow.webContents.send('trigger-print-view', report);

    // Wait for renderer to signal print-ready via 'signal-print-ready' IPC call
    await new Promise<void>((resolve) => {
      printReadyResolver = resolve;
      setTimeout(() => { if (printReadyResolver === resolve) { printReadyResolver = null; resolve(); } }, 2500);
    });

    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 1, bottom: 1, left: 1, right: 1 }
    });
    fs.writeFileSync(result.filePath, pdfData);
    mainWindow.webContents.send('print-done');
    ecosystemBus.emitEvent('ReportForge', 'report:exported', { title: report.title, target: report.targetName, format: 'pdf' });
    return { ok: true, path: result.filePath };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
});

ipcMain.handle('signal-print-ready', () => {
  if (printReadyResolver) {
    printReadyResolver();
    printReadyResolver = null;
  }
  return true;
});

// Allowlist URL schemes — without this, a poisoned URL baked into a
// shared_context payload or imported writeup file could fire javascript:,
// file://, or data: URIs through shell.openExternal and trigger code or
// disclose local files via the default handler.
const OPEN_EXTERNAL_SCHEMES = new Set(['http:', 'https:', 'mailto:']);
ipcMain.handle('open-external', (_, url: string) => {
  try {
    if (typeof url !== 'string' || url.length === 0) return;
    const u = new URL(url);
    if (!OPEN_EXTERNAL_SCHEMES.has(u.protocol)) return;
    return shell.openExternal(u.toString());
  } catch { /* malformed URL — drop silently */ }
});

// GhostVault export check
ipcMain.handle('reportforge:check-ghostvault', (): Record<string, unknown> | null => {
  try {
    const cfg = readSharedConfig();
    const exp = cfg.ghostvault_export as Record<string, unknown> | undefined;
    return exp && exp.notes ? exp : null;
  } catch { return null; }
});

ipcMain.handle('reportforge:clear-ghostvault-export', (): boolean => {
  try {
    const shared = readSharedConfig();
    delete shared.ghostvault_export;
    writeSharedConfigAtomic(shared);
    return true;
  } catch { return false; }
});

// Ecosystem emit from renderer
ipcMain.handle('ecosystem-emit', (_, appName: string, event: string, data: Record<string, unknown>) => {
  ecosystemBus.emitEvent(appName, event, data);
  return true;
});
