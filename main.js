'use strict';
// main.js — Electron main process: window, IPC, tray, scheduler, file I/O
const { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, Notification, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cron = require('node-cron');

const launcher = require('./launcher');
const ecosystemBus = require('./ecosystem-bus');
const sourcelibrary = require('./sourcelibrary');
const vaulthealth = require('./vaulthealth');
const conflict = require('./conflict');
const processor = require('./processor');
const scraper = require('./scraper');

// ─── Globals ────────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let currentScrapeState = null; // { sourceName, progress, startTime, paused }
let scheduledJobs = {}; // sourceId → cron job
let vaultNoteCountCache = 0;
let lastScrapeTimestamp = null;

const SCRAPE_STATE_FILE = '_scrape_state.json';
const SCRAPE_LOG_FILE = '_scrape_log.json';

// ─── Window creation ────────────────────────────────────────────────────────────
function createWindow() {
  const icon = getAppIcon();
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 650,
    title: 'VAULTCORE — CYBERTOOLS',
    icon: icon,
    backgroundColor: '#0e1117',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    const cfg = launcher.readConfig() || {};
    const minimiseToTray = cfg.minimiseToTray !== false;
    if (minimiseToTray && tray) {
      e.preventDefault();
      mainWindow.hide();
      if (process.platform !== 'darwin') {
        new Notification({ title: 'VAULTCORE', body: 'Running in background. Right-click tray to open.' }).show();
      }
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function getAppIcon() {
  const logoPath = path.join(__dirname, 'assets', 'logo.png');
  if (fs.existsSync(logoPath)) {
    return logoPath;
  }
  return undefined;
}

// ─── System Tray ────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'logo.png');
  let trayIcon;
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('VAULTCORE — ItsEliias');
  updateTrayMenu();

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;
  const isScraping = currentScrapeState !== null;
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open VAULTCORE',
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
      }
    },
    { type: 'separator' },
    {
      label: 'Run All Sources Now',
      enabled: !isScraping,
      click: () => { runAllSourcesScheduled(); }
    },
    {
      label: isScraping ? 'Pause Scraping' : 'Pause All Schedules',
      click: () => {
        if (isScraping && mainWindow) {
          mainWindow.webContents.send('tray-pause-scrape');
        } else {
          pauseAllSchedules();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        launcher.stopStatusWriter();
        stopAllSchedules();
        app.exit(0);
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
}

// ─── App lifecycle ───────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const execPath = app.getPath('exe');
  launcher.registerPresence(execPath);

  // Handle --launcher-open
  if (process.argv.includes('--launcher-open')) {
    // Window will show on creation
  }

  createWindow();
  createTray();

  // Start status writer
  launcher.startStatusWriter(() => ({
    activeScrape: currentScrapeState ? currentScrapeState.sourceName : null,
    scrapeProgress: currentScrapeState ? currentScrapeState.progress : null,
    totalSources: sourcelibrary.getAllSources().length,
    lastScrape: lastScrapeTimestamp,
    nextScheduled: getNextScheduledTime(),
    vaultNoteCount: vaultNoteCountCache
  }));

  // Load and start schedules
  initSchedules();

  // Auto-update check
  setTimeout(() => {
    launcher.checkForUpdates((err, result) => {
      if (!err && result && result.hasUpdate && mainWindow) {
        mainWindow.webContents.send('update-available', result);
      }
    });
  }, 5000);

  // Cache vault note count
  refreshVaultNoteCount();

  // Ecosystem startup event
  setTimeout(() => {
    ecosystemBus.emitEvent('VaultCore', 'vaultcore.app.opened', {
      sources: sourcelibrary.getAllSources().length,
      notes: vaultNoteCountCache
    });
  }, 1500);
});

app.on('second-instance', () => {
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray
  }
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
  else { mainWindow.show(); mainWindow.focus(); }
});

app.on('before-quit', () => {
  launcher.stopStatusWriter();
  stopAllSchedules();
});

// ─── Scheduler ──────────────────────────────────────────────────────────────────
function initSchedules() {
  const sources = sourcelibrary.getAllSources();
  for (const src of sources) {
    if (src.schedule && src.schedule.enabled && src.schedule.cronExpression) {
      scheduleSource(src);
    }
  }
}

function scheduleSource(source) {
  const id = source.id;
  if (scheduledJobs[id]) {
    scheduledJobs[id].stop();
    delete scheduledJobs[id];
  }
  if (!source.schedule || !source.schedule.enabled || !source.schedule.cronExpression) return;

  try {
    scheduledJobs[id] = cron.schedule(source.schedule.cronExpression, async () => {
      if (currentScrapeState) return; // another scrape running
      await runScheduledScrape(source);
    });
  } catch (e) {
    console.error('[scheduler] Failed to schedule source:', source.name, e.message);
  }
}

async function runScheduledScrape(source) {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return;

  const conflictStrategy = (source.schedule && source.schedule.conflictStrategy) || 'skip';
  const config = Object.assign({}, source, { conflictStrategy, updateMode: 'updates', scheduled: true });

  currentScrapeState = { sourceName: source.name, progress: 0, startTime: Date.now() };
  updateTrayMenu();

  try {
    const result = await scraper.runScrape(config, vaultPath, (progress) => {
      if (currentScrapeState) currentScrapeState.progress = progress.percent || 0;
      if (mainWindow) mainWindow.webContents.send('scrape-progress', progress);
    });

    lastScrapeTimestamp = new Date().toISOString();
    currentScrapeState = null;
    updateTrayMenu();
    refreshVaultNoteCount();

    // Update source last scraped
    sourcelibrary.updateSourceLastScraped(source.id, lastScrapeTimestamp, result);

    // Emit ecosystem event
    ecosystemBus.emitEvent('VaultCore', 'vaultcore.sync.completed', { source: source.name });

    // Desktop notification
    const note = `${source.name} — ${result.saved} new, ${result.updated} updated`;
    new Notification({ title: 'VAULTCORE', body: note }).show();

    if (mainWindow) {
      mainWindow.webContents.send('scrape-complete', { source: source.name, result });
      mainWindow.webContents.send('schedule-complete', { source: source.name, result });
    }
  } catch (e) {
    currentScrapeState = null;
    updateTrayMenu();
    console.error('[scheduler] Scrape failed for', source.name, e.message);
  }
}

async function runAllSourcesScheduled() {
  const sources = sourcelibrary.getAllSources();
  for (const src of sources) {
    if (!currentScrapeState) await runScheduledScrape(src);
  }
}

function pauseAllSchedules() {
  for (const id in scheduledJobs) {
    scheduledJobs[id].stop();
  }
}

function stopAllSchedules() {
  for (const id in scheduledJobs) {
    scheduledJobs[id].destroy();
  }
  scheduledJobs = {};
}

function getNextScheduledTime() {
  // Return the soonest next scheduled time from sources
  const sources = sourcelibrary.getAllSources();
  let soonest = null;
  for (const src of sources) {
    if (src.schedule && src.schedule.nextRun) {
      if (!soonest || new Date(src.schedule.nextRun) < new Date(soonest)) {
        soonest = src.schedule.nextRun;
      }
    }
  }
  return soonest;
}

function refreshVaultNoteCount() {
  const vaultPath = launcher.getVaultPath();
  if (vaultPath) {
    setTimeout(() => {
      vaultNoteCountCache = launcher.countVaultNotes(vaultPath);
    }, 100);
  }
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────────

// Config
ipcMain.handle('get-config', () => launcher.readConfig() || {});
ipcMain.handle('set-config', (_, key, value) => {
  const update = {};
  update[key] = value;
  return launcher.writeConfig(update);
});
ipcMain.handle('config-exists', () => launcher.configExists());
ipcMain.handle('get-vault-path', () => launcher.getVaultPath());
ipcMain.handle('set-vault-path', (_, vp) => { launcher.setVaultPath(vp); refreshVaultNoteCount(); return true; });
ipcMain.handle('get-theme', () => launcher.getTheme());
ipcMain.handle('set-theme', (_, theme) => launcher.setTheme(theme));
ipcMain.handle('is-cyberlab-installed', () => launcher.isCyberLabInstalled());
ipcMain.handle('open-cyberlab', () => launcher.openCyberLab());

// Folder picker
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Obsidian Vault Folder'
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-file', async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-files', async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: filters || [{ name: 'PDF Files', extensions: ['pdf'] }]
  });
  return result.canceled ? [] : result.filePaths;
});

// Shell operations
ipcMain.handle('open-vault-in-obsidian', async (_, vaultPath) => {
  const obsidianUri = `obsidian://open?path=${encodeURIComponent(vaultPath || launcher.getVaultPath())}`;
  await shell.openExternal(obsidianUri);
  return true;
});

ipcMain.handle('open-folder', async (_, folderPath) => {
  await shell.openPath(folderPath);
  return true;
});

ipcMain.handle('open-external', async (_, url) => {
  await shell.openExternal(url);
  return true;
});

// Scraping
ipcMain.handle('start-scrape', async (event, config) => {
  if (currentScrapeState) return { error: 'A scrape is already running' };

  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return { error: 'No vault path configured' };

  currentScrapeState = {
    sourceName: config.sourceName || config.url || 'Unknown',
    progress: 0,
    startTime: Date.now(),
    paused: false
  };
  updateTrayMenu();

  try {
    const result = await scraper.runScrape(config, vaultPath, (progress) => {
      if (currentScrapeState) currentScrapeState.progress = progress.percent || 0;
      if (mainWindow) mainWindow.webContents.send('scrape-progress', progress);
    });

    lastScrapeTimestamp = new Date().toISOString();
    currentScrapeState = null;
    updateTrayMenu();
    refreshVaultNoteCount();

    // Save to source library if requested
    if (config.saveToLibrary && config.sourceName) {
      const existing = sourcelibrary.getSourceByName(config.sourceName);
      if (!existing) {
        sourcelibrary.addSource({
          name: config.sourceName,
          type: config.sourceType,
          url: config.url,
          config: config,
          lastScraped: lastScrapeTimestamp,
          noteCount: result.saved + result.updated
        });
      } else {
        sourcelibrary.updateSourceLastScraped(existing.id, lastScrapeTimestamp, result);
      }
      initSchedules();
    }

    // Emit ecosystem event
    ecosystemBus.emitEvent('VaultCore', 'vaultcore.sync.completed', { source: config.sourceName || config.url });

    if (mainWindow) mainWindow.webContents.send('scrape-complete', { result });
    return { success: true, result };
  } catch (e) {
    currentScrapeState = null;
    updateTrayMenu();
    if (mainWindow) mainWindow.webContents.send('scrape-error', { error: e.message });
    return { error: e.message };
  }
});

ipcMain.handle('pause-scrape', () => {
  scraper.pauseScrape();
  if (currentScrapeState) currentScrapeState.paused = true;
  return true;
});

ipcMain.handle('resume-scrape', () => {
  scraper.resumeScrape();
  if (currentScrapeState) currentScrapeState.paused = false;
  return true;
});

ipcMain.handle('stop-scrape', () => {
  scraper.stopScrape();
  currentScrapeState = null;
  updateTrayMenu();
  return true;
});

ipcMain.handle('retry-failed', async (event, config) => {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return { error: 'No vault path' };
  const result = await scraper.retryFailed(config, vaultPath, (progress) => {
    if (mainWindow) mainWindow.webContents.send('scrape-progress', progress);
  });
  return result;
});

// Source Library
ipcMain.handle('get-sources', () => sourcelibrary.getAllSources());
ipcMain.handle('add-source', (_, source) => {
  const added = sourcelibrary.addSource(source);
  scheduleSource(added);
  return added;
});
ipcMain.handle('update-source', (_, id, source) => {
  const updated = sourcelibrary.updateSource(id, source);
  scheduleSource(updated);
  return updated;
});
ipcMain.handle('delete-source', (_, id) => {
  if (scheduledJobs[id]) { scheduledJobs[id].destroy(); delete scheduledJobs[id]; }
  return sourcelibrary.deleteSource(id);
});
ipcMain.handle('get-source-health', () => sourcelibrary.getHealthSummary(launcher.getVaultPath()));
ipcMain.handle('scrape-source-now', async (_, sourceId) => {
  const source = sourcelibrary.getSourceById(sourceId);
  if (!source) return { error: 'Source not found' };
  if (currentScrapeState) return { error: 'Another scrape is running' };
  await runScheduledScrape(source);
  return { success: true };
});

// Vault Health
ipcMain.handle('get-vault-stats', async () => {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return null;
  return await vaulthealth.getStats(vaultPath);
});

ipcMain.handle('run-duplicate-check', async () => {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return { error: 'No vault path' };
  return await vaulthealth.findDuplicates(vaultPath, (progress) => {
    if (mainWindow) mainWindow.webContents.send('vault-health-progress', progress);
  });
});

ipcMain.handle('run-dead-link-check', async () => {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return { error: 'No vault path' };
  return await vaulthealth.findDeadLinks(vaultPath, (progress) => {
    if (mainWindow) mainWindow.webContents.send('vault-health-progress', progress);
  });
});

ipcMain.handle('clean-markdown', async (_, options) => {
  const vaultPath = launcher.getVaultPath();
  return await vaulthealth.cleanMarkdown(options, vaultPath);
});

ipcMain.handle('split-note', async (_, filePath, splitPoints) => {
  const vaultPath = launcher.getVaultPath();
  return await vaulthealth.splitNote(filePath, splitPoints, vaultPath);
});

ipcMain.handle('analyse-note-headings', async (_, filePath) => {
  return await vaulthealth.analyseNoteHeadings(filePath);
});

ipcMain.handle('merge-notes', async (_, noteA, noteB, keepPath) => {
  return await vaulthealth.mergeNotes(noteA, noteB, keepPath);
});

ipcMain.handle('delete-note', async (_, filePath) => {
  return vaulthealth.deleteNote(filePath);
});

ipcMain.handle('export-dead-links-csv', async (_, results) => {
  const vaultPath = launcher.getVaultPath();
  return vaulthealth.exportDeadLinksCsv(results, vaultPath);
});

ipcMain.handle('archive-wayback', async (_, url) => {
  await shell.openExternal(`https://web.archive.org/web/${url}`);
  return true;
});

// Knowledge Gap Report
ipcMain.handle('generate-knowledge-gap-report', async () => {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return { error: 'No vault path' };
  return await vaulthealth.generateKnowledgeGapReport(vaultPath);
});

// Processor utilities
ipcMain.handle('validate-links', async (_, folderPath) => {
  return await vaulthealth.validateLinks(folderPath || launcher.getVaultPath());
});

ipcMain.handle('generate-canvas', async (_, sourceName, outputFolder) => {
  return await processor.generateCanvas(sourceName, outputFolder, launcher.getVaultPath());
});

// File system
ipcMain.handle('read-file', (_, filePath) => {
  try { return fs.readFileSync(filePath, 'utf8'); } catch (e) { return null; }
});

ipcMain.handle('write-file', (_, filePath, content) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (e) { return false; }
});

ipcMain.handle('file-exists', (_, filePath) => fs.existsSync(filePath));

ipcMain.handle('list-vault-notes', (_, folderPath) => {
  const vaultPath = launcher.getVaultPath();
  const base = folderPath ? path.join(vaultPath, folderPath) : vaultPath;
  const notes = [];
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        if (e.isDirectory()) walk(path.join(dir, e.name));
        else if (e.name.endsWith('.md')) {
          notes.push(path.relative(vaultPath, path.join(dir, e.name)));
        }
      }
    } catch (_) {}
  }
  walk(base);
  return notes;
});

ipcMain.handle('get-vault-note-count', () => {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return 0;
  return launcher.countVaultNotes(vaultPath);
});

// Diff
ipcMain.handle('get-conflict-diff', (_, fileA, fileB) => {
  return conflict.getDiff(fileA, fileB);
});

ipcMain.handle('resolve-conflict', async (_, resolution) => {
  return await conflict.resolveConflict(resolution, launcher.getVaultPath());
});

// Settings
ipcMain.handle('factory-reset', () => {
  sourcelibrary.clearAll();
  stopAllSchedules();
  return true;
});

ipcMain.handle('check-for-updates', async () => {
  return new Promise(resolve => {
    launcher.checkForUpdates((err, result) => resolve(result || { hasUpdate: false }));
  });
});

ipcMain.handle('get-app-version', () => launcher.APP_VERSION);

ipcMain.handle('detect-obsidian-plugins', () => {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return [];
  const pluginsFile = path.join(vaultPath, '.obsidian', 'community-plugins.json');
  try {
    if (fs.existsSync(pluginsFile)) {
      return JSON.parse(fs.readFileSync(pluginsFile, 'utf8'));
    }
  } catch (_) {}
  return [];
});

// Bring to front
ipcMain.handle('focus-window', () => {
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  return true;
});

// Scrape state persistence
ipcMain.handle('save-scrape-resume-state', (_, state) => {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return false;
  const stateFile = path.join(vaultPath, SCRAPE_STATE_FILE);
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
    return true;
  } catch (_) { return false; }
});

ipcMain.handle('load-scrape-resume-state', () => {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return null;
  const stateFile = path.join(vaultPath, SCRAPE_STATE_FILE);
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (_) {}
  return null;
});

ipcMain.handle('clear-scrape-resume-state', () => {
  const vaultPath = launcher.getVaultPath();
  if (!vaultPath) return false;
  const stateFile = path.join(vaultPath, SCRAPE_STATE_FILE);
  try {
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
    return true;
  } catch (_) { return false; }
});

// Ecosystem event bus
ipcMain.handle('ecosystem-emit', (_, appName, eventType, data) => {
  ecosystemBus.emitEvent(appName, eventType, data);
  return true;
});
