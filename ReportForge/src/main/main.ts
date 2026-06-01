import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import * as ecosystemBus from './ecosystem-bus.js';
import type {
  Report, CyberToolsSharedConfig, ExportResult, WriteupFile, ReconDeskTarget
} from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Constants ────────────────────────────────────────────────────────────────
const APP_VERSION       = '1.0.0';
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json');
const DATA_DIR          = path.join(os.homedir(), 'Library', 'Application Support', 'ReportForge');
const REPORTS_FILE      = path.join(DATA_DIR, 'reports.json');

let mainWindow: BrowserWindow | null = null;
let statusInterval: ReturnType<typeof setInterval> | null = null;

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

function saveReports(reports: Report[]): boolean {
  try {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf8');
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
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8');
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
      fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8');
    }
  } catch (_) {}
}

// ─── Markdown export helper ───────────────────────────────────────────────────
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

function assembleMarkdown(report: Report): string {
  const lines: string[] = [];

  lines.push(`# ${report.title}`);
  lines.push(`**Target:** ${report.targetName} (${report.targetIP}) | **Platform:** ${report.platform} | **Date:** ${report.assessmentDate} | **Operator:** ${report.operator}`);
  if (report.difficulty) lines.push(`**Difficulty:** ${report.difficulty}`);
  lines.push('');

  const sorted = [...report.sections].filter(s => s.visible).sort((a, b) => a.order - b.order);

  for (const section of sorted) {
    if (section.title === 'Findings') {
      lines.push(`## Findings`);
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
          lines.push(`**Evidence:** ${f.evidence}`);
          lines.push('');
          lines.push(`**Impact:** ${f.impact}`);
          lines.push('');
          lines.push(`**Recommendation:** ${f.recommendation}`);
          if (f.references.length > 0) {
            lines.push('');
            lines.push('**References:**');
            f.references.forEach(r => lines.push(`- ${r}`));
          }
          lines.push('');
        }
      }
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

  mainWindow.once('ready-to-show', () => mainWindow!.show());
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
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ─── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.handle('get-version', () => APP_VERSION);
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
ipcMain.handle('export-markdown', async (_, report: Report): Promise<ExportResult> => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export Markdown',
      defaultPath: `${report.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false };
    const md = assembleMarkdown(report);
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

    // Wait for renderer to signal print-ready
    await new Promise<void>((resolve) => {
      ipcMain.once('print-ready', () => resolve());
      setTimeout(resolve, 2000); // fallback
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
  ipcMain.emit('print-ready');
  return true;
});

ipcMain.handle('open-external', (_, url: string) => shell.openExternal(url));

// Ecosystem emit from renderer
ipcMain.handle('ecosystem-emit', (_, appName: string, event: string, data: Record<string, unknown>) => {
  ecosystemBus.emitEvent(appName, event, data);
  return true;
});
