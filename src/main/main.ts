import {
  app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, Notification, nativeImage
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const _require   = createRequire(import.meta.url);

// Backend CommonJS modules (copied to out/main/lib/ by vite build plugin)
const launcher      = _require('./lib/launcher.js');
const ecosystemBus  = _require('./lib/ecosystem-bus.js');
const sourcelibrary = _require('./lib/sourcelibrary.js');
const vaulthealth   = _require('./lib/vaulthealth.js');
const conflict      = _require('./lib/conflict.js');
const processor     = _require('./lib/processor.js');
const scraper       = _require('./lib/scraper.js');
const cron          = _require('node-cron');

// ─── Globals ──────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let currentScrapeState: { sourceName: string; progress: number; startTime: number; paused?: boolean } | null = null;
let scheduledJobs: Record<string, ReturnType<typeof cron.schedule>> = {};
let vaultNoteCountCache = 0;
let lastScrapeTimestamp: string | null = null;

const SCRAPE_STATE_FILE = '_scrape_state.json';
const preloadPath = path.join(__dirname, '..', 'preload', 'preload.mjs');

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'logo.png');
  mainWindow = new BrowserWindow({
    width: 1200, height: 780, minWidth: 900, minHeight: 650,
    title: 'VAULTCORE — CYBERTOOLS',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#0e1117',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true, nodeIntegration: false, webSecurity: true
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => { mainWindow!.show(); });

  mainWindow.on('close', (e) => {
    const cfg = launcher.readConfig() || {};
    if (cfg.minimiseToTray !== false && tray) {
      e.preventDefault();
      mainWindow!.hide();
      if (process.platform !== 'darwin') {
        new Notification({ title: 'VAULTCORE', body: 'Running in background. Right-click tray to open.' }).show();
      }
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'logo.png');
  let trayIcon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(trayIcon);
  tray.setToolTip('VAULTCORE — ItsEliias');
  updateTrayMenu();
  tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
}

function updateTrayMenu() {
  if (!tray) return;
  const isScraping = currentScrapeState !== null;
  const menu = Menu.buildFromTemplate([
    { label: 'Open VAULTCORE', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Run All Sources Now', enabled: !isScraping, click: () => runAllSourcesScheduled() },
    {
      label: isScraping ? 'Pause Scraping' : 'Pause All Schedules',
      click: () => {
        if (isScraping && mainWindow) mainWindow.webContents.send('tray-pause-scrape');
        else pauseAllSchedules();
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { launcher.stopStatusWriter(); stopAllSchedules(); app.exit(0); } }
  ]);
  tray.setContextMenu(menu);
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
function initSchedules() {
  const sources = sourcelibrary.getAllSources();
  for (const src of sources) {
    if (src.schedule?.enabled && src.schedule?.cronExpression) scheduleSource(src);
  }
}

function scheduleSource(source: Record<string, unknown>) {
  const id = source.id as string;
  if (scheduledJobs[id]) { scheduledJobs[id].stop(); delete scheduledJobs[id]; }
  const schedule = source.schedule as Record<string, unknown>;
  if (!schedule?.enabled || !schedule?.cronExpression) return;
  try {
    scheduledJobs[id] = cron.schedule(schedule.cronExpression as string, async () => {
      if (currentScrapeState) return;
      await runScheduledScrape(source);
    });
  } catch (e) { console.error('[scheduler] Failed:', (source.name as string), (e as Error).message); }
}

async function runScheduledScrape(source: Record<string, unknown>) {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return;
  const schedule = source.schedule as Record<string, unknown>;
  const config = { ...source, conflictStrategy: schedule?.conflictStrategy || 'skip', updateMode: 'updates', scheduled: true };
  currentScrapeState = { sourceName: source.name as string, progress: 0, startTime: Date.now() };
  updateTrayMenu();
  try {
    const result = await scraper.runScrape(config, vaultPath, (progress: Record<string, unknown>) => {
      if (currentScrapeState) currentScrapeState.progress = (progress.percent as number) || 0;
      if (mainWindow) mainWindow.webContents.send('scrape-progress', progress);
    });
    lastScrapeTimestamp = new Date().toISOString();
    currentScrapeState = null;
    updateTrayMenu();
    refreshVaultNoteCount();
    sourcelibrary.updateSourceLastScraped(source.id, lastScrapeTimestamp, result);
    ecosystemBus.emitEvent('VaultCore', 'vaultcore.sync.completed', { source: source.name });
    new Notification({ title: 'VAULTCORE', body: `${source.name} — ${result.saved} new, ${result.updated} updated` }).show();
    if (mainWindow) {
      mainWindow.webContents.send('scrape-complete', { source: source.name, result });
      mainWindow.webContents.send('schedule-complete', { source: source.name, result });
    }
  } catch (e) {
    currentScrapeState = null;
    updateTrayMenu();
    console.error('[scheduler] Scrape failed for', source.name, (e as Error).message);
  }
}

async function runAllSourcesScheduled() {
  const sources = sourcelibrary.getAllSources();
  for (const src of sources) {
    if (!currentScrapeState) await runScheduledScrape(src);
  }
}

function pauseAllSchedules() {
  for (const id in scheduledJobs) scheduledJobs[id].stop();
}

function stopAllSchedules() {
  for (const id in scheduledJobs) scheduledJobs[id].destroy();
  scheduledJobs = {};
}

function getNextScheduledTime(): string | null {
  const sources = sourcelibrary.getAllSources();
  let soonest: string | null = null;
  for (const src of sources) {
    if (src.schedule?.nextRun) {
      if (!soonest || new Date(src.schedule.nextRun) < new Date(soonest)) soonest = src.schedule.nextRun;
    }
  }
  return soonest;
}

function refreshVaultNoteCount() {
  const vaultPath = launcher.getVaultPath();
  if (vaultPath) setTimeout(() => { vaultNoteCountCache = launcher.countVaultNotes(vaultPath); }, 100);
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  launcher.registerPresence(app.getPath('exe'));
  createWindow();
  createTray();
  launcher.startStatusWriter(() => ({
    activeScrape  : currentScrapeState ? currentScrapeState.sourceName : null,
    scrapeProgress: currentScrapeState ? currentScrapeState.progress : null,
    totalSources  : sourcelibrary.getAllSources().length,
    lastScrape    : lastScrapeTimestamp,
    nextScheduled : getNextScheduledTime(),
    vaultNoteCount: vaultNoteCountCache
  }));
  initSchedules();
  refreshVaultNoteCount();
  setTimeout(() => {
    launcher.checkForUpdates((_: unknown, result: { hasUpdate: boolean; version?: string; url?: string }) => {
      if (result?.hasUpdate && mainWindow) mainWindow.webContents.send('update-available', result);
    });
  }, 5000);
  setTimeout(() => {
    ecosystemBus.emitEvent('VaultCore', 'vaultcore.app.opened', {
      sources: sourcelibrary.getAllSources().length, notes: vaultNoteCountCache
    });
  }, 1500);

  app.on('activate', () => {
    if (!mainWindow) createWindow();
    else { mainWindow.show(); mainWindow.focus(); }
  });
});

app.on('second-instance', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
app.on('window-all-closed', () => { /* Keep in tray */ });
app.on('before-quit', () => { launcher.stopStatusWriter(); stopAllSchedules(); });

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-config',    ()       => launcher.readConfig() || {});
ipcMain.handle('set-config',    (_, k, v) => { const u: Record<string,unknown> = {}; u[k] = v; return launcher.writeConfig(u); });
ipcMain.handle('config-exists', ()       => launcher.configExists());
ipcMain.handle('get-vault-path',()       => launcher.getVaultPath());
ipcMain.handle('set-vault-path',(_, vp)  => { launcher.setVaultPath(vp); refreshVaultNoteCount(); return true; });
ipcMain.handle('get-theme',     ()       => launcher.getTheme());
ipcMain.handle('set-theme',     (_, t)   => launcher.setTheme(t));
ipcMain.handle('is-cyberlab-installed', () => launcher.isCyberLabInstalled());
ipcMain.handle('open-cyberlab',         () => launcher.openCyberLab());

ipcMain.handle('select-folder', async () => {
  const r = await dialog.showOpenDialog(mainWindow!, { properties: ['openDirectory'], title: 'Select Obsidian Vault Folder' });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('select-file', async (_, filters) => {
  const r = await dialog.showOpenDialog(mainWindow!, { properties: ['openFile'], filters: filters || [] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('select-files', async (_, filters) => {
  const r = await dialog.showOpenDialog(mainWindow!, { properties: ['openFile', 'multiSelections'], filters: filters || [] });
  return r.canceled ? [] : r.filePaths;
});

ipcMain.handle('open-vault-in-obsidian', async (_, vp) => {
  await shell.openExternal(`obsidian://open?path=${encodeURIComponent(vp || launcher.getVaultPath())}`);
  return true;
});
ipcMain.handle('open-folder',   async (_, p) => { await shell.openPath(p); return true; });
ipcMain.handle('open-external', async (_, u) => { await shell.openExternal(u); return true; });

ipcMain.handle('start-scrape', async (_, config) => {
  if (currentScrapeState) return { error: 'A scrape is already running' };
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return { error: 'No vault path configured' };
  currentScrapeState = { sourceName: config.sourceName || config.url || 'Unknown', progress: 0, startTime: Date.now(), paused: false };
  updateTrayMenu();
  try {
    const result = await scraper.runScrape(config, vaultPath, (progress: Record<string,unknown>) => {
      if (currentScrapeState) currentScrapeState.progress = (progress.percent as number) || 0;
      if (mainWindow) mainWindow.webContents.send('scrape-progress', progress);
    });
    lastScrapeTimestamp = new Date().toISOString();
    currentScrapeState = null;
    updateTrayMenu();
    refreshVaultNoteCount();
    if (config.saveToLibrary && config.sourceName) {
      const existing = sourcelibrary.getSourceByName(config.sourceName);
      if (!existing) sourcelibrary.addSource({ name: config.sourceName, type: config.sourceType, url: config.url, config, lastScraped: lastScrapeTimestamp, noteCount: result.saved + result.updated });
      else sourcelibrary.updateSourceLastScraped(existing.id, lastScrapeTimestamp, result);
      initSchedules();
    }
    ecosystemBus.emitEvent('VaultCore', 'vaultcore.sync.completed', { source: config.sourceName || config.url });
    if (mainWindow) mainWindow.webContents.send('scrape-complete', { result });
    return { success: true, result };
  } catch (e) {
    currentScrapeState = null;
    updateTrayMenu();
    if (mainWindow) mainWindow.webContents.send('scrape-error', { error: (e as Error).message });
    return { error: (e as Error).message };
  }
});

ipcMain.handle('pause-scrape',  () => { scraper.pauseScrape(); if (currentScrapeState) currentScrapeState.paused = true; return true; });
ipcMain.handle('resume-scrape', () => { scraper.resumeScrape(); if (currentScrapeState) currentScrapeState.paused = false; return true; });
ipcMain.handle('stop-scrape',   () => { scraper.stopScrape(); currentScrapeState = null; updateTrayMenu(); return true; });
ipcMain.handle('retry-failed',  async (_, config) => {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return { error: 'No vault path' };
  return scraper.retryFailed(config, vaultPath, (p: unknown) => { if (mainWindow) mainWindow.webContents.send('scrape-progress', p); });
});

ipcMain.handle('get-sources',      ()        => sourcelibrary.getAllSources());
ipcMain.handle('add-source',       (_, s)    => { const a = sourcelibrary.addSource(s); scheduleSource(a); return a; });
ipcMain.handle('update-source',    (_, id, s) => { const u = sourcelibrary.updateSource(id, s); scheduleSource(u); return u; });
ipcMain.handle('delete-source',    (_, id)   => { if (scheduledJobs[id]) { scheduledJobs[id].destroy(); delete scheduledJobs[id]; } return sourcelibrary.deleteSource(id); });
ipcMain.handle('get-source-health',()        => sourcelibrary.getHealthSummary(launcher.getVaultPath()));
ipcMain.handle('scrape-source-now',async (_, id) => {
  const source = sourcelibrary.getSourceById(id);
  if (!source) return { error: 'Source not found' };
  if (currentScrapeState) return { error: 'Another scrape is running' };
  await runScheduledScrape(source);
  return { success: true };
});

ipcMain.handle('get-vault-stats',  async () => { const vp = launcher.getVaultPath(); return vp ? vaulthealth.getStats(vp) : null; });
ipcMain.handle('run-duplicate-check', async () => {
  const vp = launcher.getVaultPath();
  if (!vp) return { error: 'No vault path' };
  return vaulthealth.findDuplicates(vp, (p: unknown) => { if (mainWindow) mainWindow.webContents.send('vault-health-progress', p); });
});
ipcMain.handle('run-dead-link-check', async () => {
  const vp = launcher.getVaultPath();
  if (!vp) return { error: 'No vault path' };
  return vaulthealth.findDeadLinks(vp, (p: unknown) => { if (mainWindow) mainWindow.webContents.send('vault-health-progress', p); });
});
ipcMain.handle('clean-markdown',         async (_, opts)     => vaulthealth.cleanMarkdown(opts, launcher.getVaultPath()));
ipcMain.handle('split-note',             async (_, fp, sp)   => vaulthealth.splitNote(fp, sp, launcher.getVaultPath()));
ipcMain.handle('analyse-note-headings',  async (_, fp)       => vaulthealth.analyseNoteHeadings(fp));
ipcMain.handle('merge-notes',            async (_, a, b, kp) => vaulthealth.mergeNotes(a, b, kp));
ipcMain.handle('delete-note',            async (_, fp)       => vaulthealth.deleteNote(fp));
ipcMain.handle('export-dead-links-csv',  async (_, r)        => vaulthealth.exportDeadLinksCsv(r, launcher.getVaultPath()));
ipcMain.handle('archive-wayback',        async (_, url)      => { await shell.openExternal(`https://web.archive.org/web/${url}`); return true; });
ipcMain.handle('generate-knowledge-gap-report', async () => {
  const vp = launcher.getVaultPath();
  return vp ? vaulthealth.generateKnowledgeGapReport(vp) : { error: 'No vault path' };
});
ipcMain.handle('validate-links',    async (_, fp) => vaulthealth.validateLinks(fp || launcher.getVaultPath()));
ipcMain.handle('generate-canvas',   async (_, sn, of_) => processor.generateCanvas(sn, of_, launcher.getVaultPath()));

ipcMain.handle('read-file',  (_, fp) => { try { return fs.readFileSync(fp, 'utf8'); } catch { return null; } });
ipcMain.handle('write-file', (_, fp, c) => {
  try { fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, c, 'utf8'); return true; } catch { return false; }
});
ipcMain.handle('file-exists', (_, fp) => fs.existsSync(fp));
ipcMain.handle('list-vault-notes', (_, folderPath) => {
  const vp = launcher.getVaultPath();
  const base = folderPath ? path.join(vp, folderPath) : vp;
  const notes: string[] = [];
  function walk(dir: string) {
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name.startsWith('.')) continue;
        if (e.isDirectory()) walk(path.join(dir, e.name));
        else if (e.name.endsWith('.md')) notes.push(path.relative(vp, path.join(dir, e.name)));
      }
    } catch { /* ignore */ }
  }
  walk(base);
  return notes;
});
ipcMain.handle('get-vault-note-count', () => { const vp = launcher.getVaultPath(); return vp ? launcher.countVaultNotes(vp) : 0; });

ipcMain.handle('get-conflict-diff', (_, a, b) => conflict.getDiff(a, b));
ipcMain.handle('resolve-conflict',  async (_, r) => conflict.resolveConflict(r, launcher.getVaultPath()));

ipcMain.handle('factory-reset',     () => { sourcelibrary.clearAll(); stopAllSchedules(); return true; });
ipcMain.handle('check-for-updates', () => new Promise(resolve => {
  launcher.checkForUpdates((_: unknown, r: unknown) => resolve(r || { hasUpdate: false }));
}));
ipcMain.handle('get-app-version',   () => launcher.APP_VERSION);
ipcMain.handle('detect-obsidian-plugins', () => {
  const vp = launcher.getVaultPath();
  if (!vp) return [];
  const pf = path.join(vp, '.obsidian', 'community-plugins.json');
  try { return fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : []; } catch { return []; }
});
ipcMain.handle('focus-window', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } return true; });

ipcMain.handle('save-scrape-resume-state', (_, state) => {
  const vp = launcher.getVaultPath(); if (!vp) return false;
  try { fs.writeFileSync(path.join(vp, SCRAPE_STATE_FILE), JSON.stringify(state, null, 2)); return true; } catch { return false; }
});
ipcMain.handle('load-scrape-resume-state', () => {
  const vp = launcher.getVaultPath(); if (!vp) return null;
  const f = path.join(vp, SCRAPE_STATE_FILE);
  try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; } catch { return null; }
});
ipcMain.handle('clear-scrape-resume-state', () => {
  const vp = launcher.getVaultPath(); if (!vp) return false;
  try { const f = path.join(vp, SCRAPE_STATE_FILE); if (fs.existsSync(f)) fs.unlinkSync(f); return true; } catch { return false; }
});

ipcMain.handle('ecosystem-emit', (_, appName: string, eventType: string, data: Record<string, unknown>) => {
  ecosystemBus.emitEvent(appName, eventType, data);
  return true;
});
