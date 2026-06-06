import {
  app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, Notification, nativeImage
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import { registerSecretIpc } from './secretIpc';
import { consumePendingAction, installPendingActionWatcher } from './pendingActions'

const APP_KEY = 'vaultscraper';

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
const cronParser    = _require('cron-parser');

// ── cron next-run helper ─────────────────────────────────────────────────────
function computeNextRun(cronExpression: string | null | undefined): string | null {
  if (!cronExpression) return null;
  try {
    const it = cronParser.parseExpression(cronExpression);
    return it.next().toDate().toISOString();
  } catch { return null; }
}

// ─── Globals ──────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let currentScrapeState: { sourceName: string; progress: number; startTime: number; paused?: boolean } | null = null;
let scheduledJobs: Record<string, ReturnType<typeof cron.schedule>> = {};
let vaultNoteCountCache = 0;
let lastScrapeTimestamp: string | null = null;

const SCRAPE_STATE_FILE = '_scrape_state.json';
// preload.js for CJS packages (no "type":"module"), preload.mjs for ESM packages
const preloadFile = fs.existsSync(path.join(__dirname, '..', 'preload', 'preload.mjs'))
  ? 'preload.mjs' : 'preload.js';
const preloadPath = path.join(__dirname, '..', 'preload', preloadFile);

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
      contextIsolation: true, nodeIntegration: false, sandbox: false, webSecurity: true
    }
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => { mainWindow!.show(); });

  // Tray-menu action dispatch — after the renderer mounts, forward any
  // pending action queued by the Launcher to the renderer.
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      const result = consumePendingAction(APP_KEY);
      if (result && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pending-action', result.action);
      }
    }, 800);
    // Listen for tray-action writes while the app is already running
    installPendingActionWatcher(APP_KEY, (action) => {
      try { mainWindow?.webContents.send('pending-action', action) } catch { /* ignore */ }
    })
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
    // Persist next run so renderer/list rows can show it without re-querying.
    const nextRun = computeNextRun(schedule.cronExpression as string);
    if (nextRun) sourcelibrary.updateSource(id, { schedule: { ...schedule, nextRun } });
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
    const errMsg = (e as Error).message;
    sourcelibrary.updateSourceHealthFailure(source.id, errMsg);
    console.error('[scheduler] Scrape failed for', source.name, errMsg);
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

function buildFolderStats(vaultPath: string): Array<{ folder: string; count: number }> {
  const stats: Record<string, number> = {};
  try {
    const entries = fs.readdirSync(vaultPath, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.') || !e.isDirectory()) continue;
      const dirPath = path.join(vaultPath, e.name);
      let count = 0;
      function countMd(dir: string) {
        try {
          for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
            if (f.name.startsWith('.')) continue;
            if (f.isDirectory()) countMd(path.join(dir, f.name));
            else if (f.name.endsWith('.md')) count++;
          }
        } catch { /* ignore */ }
      }
      countMd(dirPath);
      if (count > 0) stats[e.name] = count;
    }
  } catch { /* ignore */ }
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .map(([folder, count]) => ({ folder, count }));
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  launcher.registerPresence(app.isPackaged ? app.getPath('exe') : app.getAppPath());
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
app.on('window-all-closed', () => { app.quit(); });
app.on('before-quit', () => {
  launcher.stopStatusWriter();
  stopAllSchedules();
  // Stop any in-flight scrape — `runScrape` spawns a Playwright Chromium
  // child; without an explicit stopScrape() here the child outlives the
  // VaultCore process when the user Cmd-Qs mid-scrape, leaving an orphan
  // browser eating memory + a stale `_scrape_state.json` on disk.
  try { scraper.stopScrape(); } catch { /* best-effort */ }
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// SSO state — read CredVault's session from the shared cybertools-config.json
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

ipcMain.handle('open-credvault', () => {
  try {
    const target = '/Applications/CredVault.app';
    if (!fs.existsSync(target)) return false;
    const { spawn } = _require('child_process') as typeof import('child_process');
    spawn('open', [target], { detached: true, stdio: 'ignore' }).unref();
    return true;
  } catch { return false; }
});

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
ipcMain.handle('open-folder',   async (_, p) => {
  // openPath only opens files/folders that exist on disk, but a non-string
  // argument crashes the main process with a sync TypeError before shell
  // sees it. Defend at the boundary.
  if (typeof p !== 'string' || p.length === 0) return false;
  await shell.openPath(p);
  return true;
});
ipcMain.handle('open-external', async (_, u) => {
  // shell.openExternal forwards to the OS scheme handler. Without a scheme
  // allowlist a compromised renderer could open file://, javascript:, or
  // arbitrary custom schemes. The renderer only legitimately opens http/https
  // links (article URLs, GitHub, etc.) and mailto for contact links.
  if (typeof u !== 'string' || u.length === 0) return false;
  let parsed: URL;
  try { parsed = new URL(u); } catch { return false; }
  const allowed = new Set(['http:', 'https:', 'mailto:']);
  if (!allowed.has(parsed.protocol)) return false;
  await shell.openExternal(u);
  return true;
});

ipcMain.handle('start-scrape', async (_, config) => {
  // The renderer hands us a free-form config object. Without this guard a
  // null/non-object payload crashed the main process on the first property
  // read (`config.sourceName`).
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { error: 'Invalid scrape config' };
  }
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
    // Enrich result with folder stats and suggested tags
    result.folderStats = buildFolderStats(vaultPath);
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
    const errMsg = (e as Error).message;
    if (config.saveToLibrary && config.sourceName) {
      const existing = sourcelibrary.getSourceByName(config.sourceName);
      if (existing) sourcelibrary.updateSourceHealthFailure(existing.id, errMsg);
    }
    if (mainWindow) mainWindow.webContents.send('scrape-error', { error: errMsg });
    return { error: errMsg };
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
ipcMain.handle('add-source',       (_, s)    => {
  // sourcelibrary.addSource spreads `s` into the new record. Null / non-object
  // payload used to throw 'Cannot convert undefined to object'. Validate at
  // the boundary so the renderer gets a clean error instead of a crash.
  if (s === null || typeof s !== 'object' || Array.isArray(s)) {
    return { error: 'Invalid source payload' };
  }
  const a = sourcelibrary.addSource(s); scheduleSource(a); return a;
});
ipcMain.handle('update-source',    (_, id, s) => {
  if (typeof id !== 'string' || id.length === 0) return { error: 'Invalid id' };
  if (s === null || typeof s !== 'object' || Array.isArray(s)) {
    return { error: 'Invalid source payload' };
  }
  const u = sourcelibrary.updateSource(id, s); scheduleSource(u); return u;
});
ipcMain.handle('delete-source',    (_, id)   => {
  if (typeof id !== 'string' || id.length === 0) return false;
  if (scheduledJobs[id]) { scheduledJobs[id].destroy(); delete scheduledJobs[id]; }
  return sourcelibrary.deleteSource(id);
});
ipcMain.handle('get-source-health',()        => sourcelibrary.getHealthSummary(launcher.getVaultPath()));
ipcMain.handle('scrape-source-now',async (_, id) => {
  const source = sourcelibrary.getSourceById(id);
  if (!source) return { error: 'Source not found' };
  if (currentScrapeState) return { error: 'Another scrape is running' };
  await runScheduledScrape(source);
  return { success: true };
});

// Schedule-specific update — persists schedule + re-registers cron job and returns
// the source with a freshly-computed nextRun. Renderer uses this from the modal.
ipcMain.handle('update-source-schedule', (_, id: unknown, schedule: unknown) => {
  // Validate at the boundary — id is used as a sourcelibrary lookup key,
  // and schedule.cronExpression was force-cast to string before being
  // handed to cron-parser. Both used to silently mis-behave on bad input.
  if (typeof id !== 'string' || id.length === 0) return { error: 'Invalid id' };
  if (schedule === null || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return { error: 'Invalid schedule payload' };
  }
  const existing = sourcelibrary.getSourceById(id);
  if (!existing) return { error: 'Source not found' };
  const s = schedule as Record<string, unknown>;
  const cron = typeof s.cronExpression === 'string' ? s.cronExpression : null;
  const nextRun = s.enabled && cron ? computeNextRun(cron) : null;
  const merged = { ...s, nextRun: nextRun ?? undefined };
  const updated = sourcelibrary.updateSource(id, { schedule: merged });
  scheduleSource(updated);
  return updated;
});

// Returns whatever scrape (if any) is currently in flight — used by the source
// list to render a "scraping now" pulse on the matching row.
ipcMain.handle('get-active-scrape', () => currentScrapeState);

// Pure cron-string → ISO timestamp helper for renderer-side previews.
ipcMain.handle('compute-next-run', (_, cronExpression: string) => computeNextRun(cronExpression));

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
ipcMain.handle('split-note',             async (_, fp, sp)   => {
  if (!isUnderVault(fp)) return { error: 'Path outside vault' };
  return vaulthealth.splitNote(fp, sp, launcher.getVaultPath());
});
ipcMain.handle('analyse-note-headings',  async (_, fp)       => {
  if (!isUnderVault(fp)) return { error: 'Path outside vault' };
  return vaulthealth.analyseNoteHeadings(fp);
});
ipcMain.handle('merge-notes',            async (_, a, b, kp) => {
  if (!isUnderVault(a) || !isUnderVault(b) || !isUnderVault(kp)) {
    return { error: 'One or more paths are outside the vault' };
  }
  return vaulthealth.mergeNotes(a, b, kp);
});
ipcMain.handle('delete-note',            async (_, fp)       => {
  // delete-note unlinks the path it's given. Without confinement a
  // compromised renderer could delete arbitrary user files, and the
  // .deleted_* backup the helper writes alongside the file would also land
  // outside the vault. Same isUnderVault guard the read/write IPCs use.
  if (!isUnderVault(fp)) return { error: 'Path outside vault' };
  return vaulthealth.deleteNote(fp);
});
ipcMain.handle('export-dead-links-csv',  async (_, r)        => vaulthealth.exportDeadLinksCsv(r, launcher.getVaultPath()));
ipcMain.handle('archive-wayback',        async (_, url)      => { await shell.openExternal(`https://web.archive.org/web/${url}`); return true; });
ipcMain.handle('generate-knowledge-gap-report', async () => {
  const vp = launcher.getVaultPath();
  return vp ? vaulthealth.generateKnowledgeGapReport(vp) : { error: 'No vault path' };
});
ipcMain.handle('validate-links',    async (_, fp) => {
  // validateLinks walks the folder it's given. Falling through to the vault
  // path when fp is empty is fine, but a renderer-supplied fp outside the
  // vault would walk + read arbitrary directories (info disclosure of any
  // .md files on disk). Pin to the vault root.
  const vp = launcher.getVaultPath();
  if (!fp) return vaulthealth.validateLinks(vp);
  if (!isUnderVault(fp)) return { error: 'Path outside vault' };
  return vaulthealth.validateLinks(fp);
});
ipcMain.handle('generate-canvas',   async (_, sn, of_) => processor.generateCanvas(sn, of_, launcher.getVaultPath()));

// Confine renderer file IPCs to the configured vault root. Without this a
// compromised renderer could read SSH keys or overwrite arbitrary user files
// via `electronAPI.readFile('/etc/passwd')` etc.
function isUnderVault(fp: unknown): fp is string {
  if (typeof fp !== 'string' || !fp) return false;
  const root = launcher.getVaultPath();
  if (!root) return false;
  const resolved = path.resolve(fp);
  const resolvedRoot = path.resolve(root) + path.sep;
  return resolved === path.resolve(root) || resolved.startsWith(resolvedRoot);
}

ipcMain.handle('read-file',  (_, fp) => {
  if (!isUnderVault(fp)) return null;
  try { return fs.readFileSync(fp, 'utf8'); } catch { return null; }
});
ipcMain.handle('write-file', (_, fp, c) => {
  if (!isUnderVault(fp)) return false;
  // A non-string content used to silently write the literal "undefined" /
  // "[object Object]" to the file, corrupting notes for any renderer bug
  // that forgot to stringify first.
  if (typeof c !== 'string') return false;
  try { fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, c, 'utf8'); return true; } catch { return false; }
});
ipcMain.handle('file-exists', (_, fp) => isUnderVault(fp) && fs.existsSync(fp));
ipcMain.handle('list-vault-notes', (_, folderPath) => {
  const vp = launcher.getVaultPath();
  if (!vp) return [];
  // The renderer-supplied folderPath used to be path.joined onto the vault
  // root with no further checks, so 'list-vault-notes("../..")' would walk
  // ~/, returning '.md' files outside the configured vault. Resolve + assert
  // the final path stays inside the vault before walking it.
  let base: string;
  if (folderPath && typeof folderPath === 'string') {
    const candidate = path.resolve(vp, folderPath);
    const root      = path.resolve(vp) + path.sep;
    if (candidate !== path.resolve(vp) && !candidate.startsWith(root)) {
      return [];
    }
    base = candidate;
  } else {
    base = vp;
  }
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

// ─── Secret Detection IPC ────────────────────────────────────────────────────
registerSecretIpc(() => mainWindow);

// Override credvault handlers registered by secretIpc to use ecosystemBus
ipcMain.removeHandler('credvault-read');
ipcMain.removeHandler('credvault-push');
ipcMain.handle('credvault-read', async () => {
  try {
    const data = (ecosystemBus.readSharedData?.('GhostVault') ?? ecosystemBus.readSharedData?.('CredVault')) ?? {};
    return { success: true, data };
  } catch (e) { return { error: (e as Error).message }; }
});
ipcMain.handle('credvault-push', async (_, entries: unknown[]) => {
  try { ecosystemBus.emitEvent('VaultCore', 'vaultcore.credvault.push', { entries }); return { success: true }; }
  catch (e) { return { error: (e as Error).message }; }
});
