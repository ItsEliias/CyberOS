'use strict';
/**
 * main.js — Electron main process for CYBERTOOLS LAUNCHER
 *
 * Responsibilities:
 *   • System tray icon + context menu
 *   • Floating panel window (480×620, frameless, transparent)
 *   • Config polling every 5 s → push updates to renderer
 *   • VPN detection every 30 s
 *   • Desktop notifications for key events
 *   • Async update checker (GitHub releases API)
 *   • All IPC handlers
 *   • App launching via child_process.spawn
 */

const {
  app, BrowserWindow, Tray, Menu, nativeImage,
  ipcMain, dialog, Notification, screen, shell
} = require('electron');

const path         = require('path');
const os           = require('os');
const fs           = require('fs');
const https        = require('https');
const { spawn }    = require('child_process');
const zlib         = require('zlib');

const {
  readConfig, writeConfig, updateConfig,
  addActivityEntry, clearActivityFeed, writeTrigger
} = require('./config');

const ecosystemBus = require('./ecosystem-bus');

// ─── Single-instance lock ─────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

app.on('second-instance', () => {
  if (tray) showPanel(tray.getBounds());
});

// ─── Globals ──────────────────────────────────────────────────────────────────

let tray             = null;
let panelWindow      = null;
let isPanelVisible   = false;
let isDialogOpen     = false;
let lastHideTime     = 0;
let currentConfig    = {};
let vpnStatus        = { active: false, interface: null };
let configPollTimer  = null;
let vpnCheckTimer    = null;

// Previous-state snapshots for notification diffing
let prevCLInstalled    = false;
let prevVSInstalled    = false;
let prevCLFindings     = 0;
let prevVSActiveScrape = null;
let prevCLSession      = false;

const APP_VERSION = app.getVersion() || '1.0.0';
const DEFAULT_UPDATE_URL =
  'https://api.github.com/repos/itsEliias/cybertools-launcher/releases/latest';

// ─── Mac dock hiding ──────────────────────────────────────────────────────────

if (process.platform === 'darwin') {
  app.dock.hide();
}

// ─── PNG generator (no external deps) ────────────────────────────────────────

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makePNGChunk(type, data) {
  const lenBuf  = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf  = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Generate a minimal solid-RGB PNG (size × size) without external deps.
 * Used only as a fallback tray icon when tray-icon.png is absent.
 */
function generateFallbackPNG(size, bgR, bgG, bgB, acR, acG, acB) {
  const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Build raw scanlines with filter byte 0 (None)
  const stride = size * 3 + 1;
  const raw    = Buffer.alloc(size * stride);
  const cx     = size / 2;
  const cy     = size / 2;

  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter
    for (let x = 0; x < size; x++) {
      const idx = y * stride + 1 + x * 3;
      // Simple "+" crosshair in accent colour, bg otherwise
      const isCross = (Math.abs(x - cx) < 3 && Math.abs(y - cy) < 8) ||
                      (Math.abs(y - cy) < 3 && Math.abs(x - cx) < 8);
      if (isCross) {
        raw[idx] = acR; raw[idx+1] = acG; raw[idx+2] = acB;
      } else {
        raw[idx] = bgR; raw[idx+1] = bgG; raw[idx+2] = bgB;
      }
    }
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    makePNGChunk('IHDR', ihdr),
    makePNGChunk('IDAT', compressed),
    makePNGChunk('IEND', Buffer.alloc(0))
  ]);
}

// ─── Tray icon ────────────────────────────────────────────────────────────────

function createTrayIcon() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  if (fs.existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath);
    if (process.platform === 'darwin') img.setTemplateImage(false);
    return img;
  }
  // Fallback: dark bg + purple crosshair (matches Cyberpunk accent)
  const buf = generateFallbackPNG(32, 13,13,26, 180,79,255);
  return nativeImage.createFromBuffer(buf, { scaleFactor: 1 });
}

// ─── VPN detection ────────────────────────────────────────────────────────────

function detectVPN() {
  const ifaces    = os.networkInterfaces();
  const patterns  = ['tun','tap','vpn','proton','wg','ppp','utun','ipsec','ovpn','nord'];
  for (const [name, addrs] of Object.entries(ifaces)) {
    const lo = name.toLowerCase();
    if (patterns.some(p => lo.includes(p)) && addrs && addrs.length > 0) {
      return { active: true, interface: name };
    }
  }
  return { active: false, interface: null };
}

// ─── Panel positioning ────────────────────────────────────────────────────────

function getPanelPosition(trayBounds) {
  const PW = 480, PH = 620, GAP = 8;
  const wa = screen.getPrimaryDisplay().workArea;
  let x, y;

  if (process.platform === 'darwin') {
    // Menu bar at top → panel drops below
    x = Math.round(trayBounds.x + trayBounds.width  / 2 - PW / 2);
    y = trayBounds.y + trayBounds.height + GAP;
  } else {
    // Windows / Linux: figure out taskbar position by tray Y vs screen centre
    const screenMidY = wa.y + wa.height / 2;
    if (trayBounds.y > screenMidY) {
      // Taskbar at bottom → panel appears above tray
      x = Math.round(trayBounds.x + trayBounds.width  / 2 - PW / 2);
      y = Math.round(trayBounds.y - PH - GAP);
    } else {
      // Taskbar at top → panel drops below
      x = Math.round(trayBounds.x + trayBounds.width  / 2 - PW / 2);
      y = trayBounds.y + trayBounds.height + GAP;
    }
  }

  // Clamp to work area
  x = Math.max(wa.x + GAP, Math.min(x, wa.x + wa.width  - PW  - GAP));
  y = Math.max(wa.y + GAP, Math.min(y, wa.y + wa.height - PH  - GAP));
  return { x, y };
}

// ─── Panel window ─────────────────────────────────────────────────────────────

function createPanelWindow() {
  panelWindow = new BrowserWindow({
    width        : 480,
    height       : 620,
    show         : false,
    frame        : false,
    resizable    : false,
    movable      : false,
    minimizable  : false,
    maximizable  : false,
    skipTaskbar  : true,
    alwaysOnTop  : true,
    transparent  : true,
    hasShadow    : true,
    title        : 'CYBERTOOLS — ItsEliias',
    webPreferences: {
      preload           : path.join(__dirname, 'preload.js'),
      contextIsolation  : true,
      nodeIntegration   : false,
      devTools          : process.env.NODE_ENV === 'development'
    }
  });

  panelWindow.loadFile(path.join(__dirname, 'index.html'));

  // Hide on blur (click-outside). Guard against dialog focus changes.
  panelWindow.on('blur', () => {
    if (isPanelVisible && !isDialogOpen && !panelWindow.webContents.isDevToolsFocused()) {
      // Small delay — on Windows, blur fires before tray click is processed
      setTimeout(() => {
        if (isPanelVisible && !isDialogOpen) hidePanel();
      }, 120);
    }
  });

  // Block navigation away from index.html
  panelWindow.webContents.on('will-navigate', e => e.preventDefault());
  panelWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

function showPanel(trayBounds) {
  if (!panelWindow || panelWindow.isDestroyed()) return;
  const { x, y } = getPanelPosition(trayBounds);
  panelWindow.setPosition(x, y, false);
  panelWindow.setAlwaysOnTop(true);
  panelWindow.show();
  panelWindow.focus();
  isPanelVisible = true;
  panelWindow.webContents.send('panel-shown');
}

function hidePanel() {
  if (!panelWindow || panelWindow.isDestroyed()) return;
  panelWindow.hide();
  isPanelVisible = false;
  lastHideTime   = Date.now();
}

function togglePanel(trayBounds) {
  if (isPanelVisible) {
    hidePanel();
  } else {
    // Prevent immediate re-show if panel just closed from a blur
    if (Date.now() - lastHideTime < 300) return;
    showPanel(trayBounds);
  }
}

// ─── Tray setup ───────────────────────────────────────────────────────────────

function setupTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('CyberTools Launcher — ItsEliias');

  tray.on('click', () => {
    togglePanel(tray.getBounds());
  });

  // Windows: double-click also opens
  tray.on('double-click', () => {
    if (!isPanelVisible) showPanel(tray.getBounds());
  });

  refreshContextMenu();
}

function refreshContextMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label      : 'Open Launcher',
      accelerator: 'CommandOrControl+O',
      click      : () => showPanel(tray.getBounds())
    },
    {
      label      : 'Open CyberLab Companion',
      accelerator: 'CommandOrControl+1',
      click      : () => launchApp('cyberlab')
    },
    {
      label      : 'Open VaultCore',
      accelerator: 'CommandOrControl+2',
      click      : () => launchApp('vaultscraper')
    },
    { type: 'separator' },
    {
      label: 'Run VaultCore Update Now',
      click: () => {
        writeTrigger({ action: 'update_now' });
        addActivityEntry({ type: 'launcher', text: 'VaultCore update triggered from tray menu' });
      }
    },
    { type: 'separator' },
    {
      label      : 'Settings',
      accelerator: 'CommandOrControl+,',
      click      : () => {
        showPanel(tray.getBounds());
        setTimeout(() => {
          if (panelWindow && !panelWindow.isDestroyed()) {
            panelWindow.webContents.send('open-settings');
          }
        }, 220);
      }
    },
    {
      label      : 'Quit CyberTools',
      accelerator: 'CommandOrControl+Q',
      click      : () => app.quit()
    }
  ]);
  tray.setContextMenu(menu);
}

// ─── App launching ────────────────────────────────────────────────────────────

function launchApp(appKey) {
  const config  = readConfig();
  let execPath  = '';
  let appName   = '';
  let args      = ['--launcher-open'];

  if (appKey === 'cyberlab') {
    execPath = config.cyberlab && config.cyberlab.execPath || '';
    appName  = 'CyberLab Companion';
  } else if (appKey === 'vaultscraper') {
    execPath = config.vaultscraper && config.vaultscraper.execPath || '';
    appName  = 'VaultCore';
  } else if (appKey === 'ghostvault') {
    execPath = config.ghostvault && config.ghostvault.execPath || '';
    appName  = 'GhostVault';
  } else if (appKey.startsWith('custom_')) {
    const idx  = parseInt(appKey.replace('custom_', ''), 10);
    const slots = config.launcher && config.launcher.customSlots || [];
    const slot  = slots[idx];
    if (slot) {
      execPath = slot.execPath || '';
      appName  = slot.name    || 'App';
      args     = [];
    }
  }

  if (!execPath) {
    console.warn(`[launch] No execPath for ${appKey}`);
    return false;
  }
  if (!fs.existsSync(execPath)) {
    console.warn(`[launch] execPath not found: ${execPath}`);
    return false;
  }

  try {
    if (process.platform === 'darwin' && execPath.endsWith('.app')) {
      // Production: open macOS app bundle
      spawn('open', [execPath, '--args', ...args], { detached: true, stdio: 'ignore' }).unref();
    } else if (fs.existsSync(execPath) && fs.statSync(execPath).isDirectory()) {
      // Dev mode: project directory — run `electron .` inside it
      const electronBin = path.join(execPath, 'node_modules', '.bin', 'electron');
      const electronCmd = fs.existsSync(electronBin) ? electronBin : 'electron';
      spawn(electronCmd, ['.'], { cwd: execPath, detached: true, stdio: 'ignore' }).unref();
    } else {
      // Production executable
      spawn(execPath, args, { detached: true, stdio: 'ignore' }).unref();
    }
    addActivityEntry({ type: 'launcher', text: `${appName} opened` });
    return true;
  } catch (err) {
    console.error(`[launch] Failed to spawn ${execPath}:`, err.message);
    return false;
  }
}

// ─── Config polling ───────────────────────────────────────────────────────────

function startConfigPolling() {
  pollConfig(); // immediate first read
  configPollTimer = setInterval(pollConfig, 5000);
}

function pollConfig() {
  try {
    const config  = readConfig();
    const prev    = currentConfig;
    currentConfig = config;

    // Notify renderer (only if page is ready)
    if (panelWindow && !panelWindow.isDestroyed() && panelWindow.webContents.getURL()) {
      panelWindow.webContents.send('config-update', config);
    }

    // Only diff after first successful read
    if (Object.keys(prev).length > 0) {
      checkNotifications(prev, config);
    }
  } catch (err) {
    console.error('[poll] Error:', err.message);
  }
}

// ─── Notification diffing ─────────────────────────────────────────────────────

function checkNotifications(prev, curr) {
  // ── Newly installed apps ──────────────────────────────────────────────────
  const prevCLInst = !!(prev.cyberlab  && prev.cyberlab.installed);
  const currCLInst = !!(curr.cyberlab  && curr.cyberlab.installed);
  if (!prevCLInst && currCLInst) {
    notify('CyberLab Companion connected to launcher ✓', '', () => launchApp('cyberlab'));
    addActivityEntry({ type: 'launcher', text: 'CyberLab Companion registered with launcher' });
  }

  const prevVSInst = !!(prev.vaultscraper && prev.vaultscraper.installed);
  const currVSInst = !!(curr.vaultscraper && curr.vaultscraper.installed);
  if (!prevVSInst && currVSInst) {
    notify('VaultCore connected to launcher ✓', '', () => launchApp('vaultscraper'));
    addActivityEntry({ type: 'launcher', text: 'VaultCore registered with launcher' });
  }

  const prevGVExec = prev.ghostvault && prev.ghostvault.execPath || '';
  const currGVExec = curr.ghostvault && curr.ghostvault.execPath || '';
  if (!prevGVExec && currGVExec) {
    notify('GhostVault connected to launcher ✓', '', () => launchApp('ghostvault'));
    addActivityEntry({ type: 'launcher', text: 'GhostVault registered with launcher' });
  }

  // ── Flag captured (findingsCount increase) ────────────────────────────────
  const prevFindings = prev.cyberlab_status ? (prev.cyberlab_status.findingsCount || 0) : 0;
  const currFindings = curr.cyberlab_status ? (curr.cyberlab_status.findingsCount || 0) : 0;
  const currLab      = curr.cyberlab_status && curr.cyberlab_status.currentLab || 'Unknown Lab';
  if (currFindings > prevFindings) {
    notify(`CyberLab: Flag captured on ${currLab} 🚩`, '', () => launchApp('cyberlab'));
    addActivityEntry({ type: 'cyberlab', text: `Flag captured on ${currLab}` });
  }

  // ── VaultCore scrape completed (activeScrape → null) ─────────────────────
  const prevActive = prev.vaultscraper_status && prev.vaultscraper_status.activeScrape;
  const currActive = curr.vaultscraper_status && curr.vaultscraper_status.activeScrape;
  if (prevActive && !currActive) {
    const srcName = prevActive.name || 'Source';
    const newCnt  = curr.vaultscraper_status && curr.vaultscraper_status.lastScrapeNew     || 0;
    const updCnt  = curr.vaultscraper_status && curr.vaultscraper_status.lastScrapeUpdated || 0;
    notify(
      `VaultCore: ${srcName} complete — ${newCnt} new, ${updCnt} updated`,
      '',
      () => launchApp('vaultscraper')
    );
    addActivityEntry({
      type: 'vaultscraper',
      text: `Scrape complete: ${srcName} — ${newCnt} new, ${updCnt} updated`
    });
  }

  // ── CyberLab session ended ────────────────────────────────────────────────
  const prevSession = !!(prev.cyberlab_status && prev.cyberlab_status.sessionActive);
  const currSession = !!(curr.cyberlab_status && curr.cyberlab_status.sessionActive);
  if (prevSession && !currSession) {
    const lab = prev.cyberlab_status && prev.cyberlab_status.currentLab || 'Lab';
    addActivityEntry({ type: 'cyberlab', text: `Session complete: ${lab}` });
  }
}

function notify(title, body, onClick) {
  if (!Notification.isSupported()) return;
  try {
    const n = new Notification({ title, body, silent: false });
    if (typeof onClick === 'function') n.on('click', onClick);
    n.show();
  } catch (e) {
    console.error('[notify]', e.message);
  }
}

// ─── VPN check ────────────────────────────────────────────────────────────────

function startVpnCheck() {
  vpnStatus   = detectVPN();
  vpnCheckTimer = setInterval(() => {
    vpnStatus = detectVPN();
    if (panelWindow && !panelWindow.isDestroyed()) {
      panelWindow.webContents.send('vpn-update', vpnStatus);
    }
  }, 30000);
}

// ─── Update checker ───────────────────────────────────────────────────────────

function checkForUpdates() {
  try {
    const config     = readConfig();
    const releaseUrl = (config.launcher && config.launcher.updateUrl) || DEFAULT_UPDATE_URL;

    const req = https.get(
      releaseUrl,
      { headers: { 'User-Agent': `CyberTools-Launcher/${APP_VERSION}` } },
      res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const data    = JSON.parse(body);
            const tagName = (data.tag_name || '').replace(/^v/, '');
            if (tagName && isNewerVersion(tagName, APP_VERSION)) {
              if (panelWindow && !panelWindow.isDestroyed()) {
                panelWindow.webContents.send('update-available', {
                  version  : tagName,
                  url      : data.html_url || ''
                });
              }
            }
          } catch (_) { /* silently ignore malformed response */ }
        });
      }
    );
    req.on('error', () => { /* silently ignore network errors */ });
    req.setTimeout(8000, () => req.destroy());
  } catch (_) { /* silently ignore */ }
}

function isNewerVersion(latest, current) {
  const lp = latest.split('.').map(Number);
  const cp = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((lp[i] || 0) > (cp[i] || 0)) return true;
    if ((lp[i] || 0) < (cp[i] || 0)) return false;
  }
  return false;
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

function setupIPC() {
  // Config
  ipcMain.handle('get-config', () => readConfig());

  ipcMain.handle('save-config', (_e, updates) => {
    return updateConfig(cfg => Object.assign({}, cfg, updates));
  });

  ipcMain.handle('save-config-deep', (_e, updates) => {
    return updateConfig(cfg => {
      const out = Object.assign({}, cfg);
      for (const [k, v] of Object.entries(updates)) {
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          out[k] = Object.assign({}, out[k] || {}, v);
        } else {
          out[k] = v;
        }
      }
      return out;
    });
  });

  // Launching
  ipcMain.handle('launch-app', (_e, appKey) => launchApp(appKey));

  // VaultCore quick trigger
  ipcMain.handle('update-now', () => {
    writeTrigger({ action: 'update_now' });
    addActivityEntry({ type: 'launcher', text: 'VaultCore update triggered' });
    return true;
  });

  // VPN
  ipcMain.handle('get-vpn-status', () => vpnStatus);

  // Panel visibility
  ipcMain.handle('hide-panel', () => { hidePanel(); return true; });
  ipcMain.on('hide-after-splash', () => hidePanel());

  // Dialogs
  ipcMain.handle('open-file-picker', async (_e, opts) => {
    isDialogOpen = true;
    try {
      const filters = (opts && opts.filters) || [{ name: 'All Files', extensions: ['*'] }];
      const result  = await dialog.showOpenDialog(panelWindow, {
        properties : ['openFile'],
        filters
      });
      return result.canceled ? null : result.filePaths[0];
    } finally {
      isDialogOpen = false;
    }
  });

  ipcMain.handle('open-folder-picker', async () => {
    isDialogOpen = true;
    try {
      const result = await dialog.showOpenDialog(panelWindow, {
        properties: ['openDirectory']
      });
      return result.canceled ? null : result.filePaths[0];
    } finally {
      isDialogOpen = false;
    }
  });

  ipcMain.handle('check-file-exists', (_e, filePath) => {
    return typeof filePath === 'string' && fs.existsSync(filePath);
  });

  // Activity
  ipcMain.handle('clear-activity', () => clearActivityFeed());
  ipcMain.handle('add-activity',   (_e, entry) => addActivityEntry(entry));

  // App meta
  ipcMain.handle('get-version', () => APP_VERSION);

  // Custom slots
  ipcMain.handle('add-custom-slot', (_e, slot) => {
    return updateConfig(cfg => {
      const slots = cfg.launcher.customSlots || [];
      if (slots.length >= 4) return cfg;
      cfg.launcher.customSlots = [...slots, slot];
      return cfg;
    });
  });

  ipcMain.handle('remove-custom-slot', (_e, index) => {
    return updateConfig(cfg => {
      const slots = [...(cfg.launcher.customSlots || [])];
      slots.splice(index, 1);
      cfg.launcher.customSlots = slots;
      return cfg;
    });
  });

  ipcMain.handle('update-custom-slot', (_e, { index, slot }) => {
    return updateConfig(cfg => {
      const slots = [...(cfg.launcher.customSlots || [])];
      if (index >= 0 && index < slots.length) slots[index] = slot;
      cfg.launcher.customSlots = slots;
      return cfg;
    });
  });

  // External URLs
  ipcMain.handle('open-external', (_e, url) => {
    shell.openExternal(url);
    return true;
  });

  // Ecosystem event bus
  ipcMain.handle('ecosystem-read-events', () => {
    return ecosystemBus.readEvents();
  });

  ipcMain.handle('ecosystem-emit', (_, appName, eventType, data) => {
    ecosystemBus.emitEvent(appName, eventType, data);
    return true;
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Auto-detect dev project directories if execPath is empty
  const PROJECT_BASE = path.join(os.homedir(), 'Documents', 'Claude', 'Projects');
  const AUTO_DETECT = [
    { key: 'cyberlab',     dir: 'Cyberlab Compaion' },
    { key: 'vaultscraper', dir: 'VaultCore' },
    { key: 'ghostvault',   dir: 'GhostVault' },
  ];
  try {
    const cfg = readConfig();
    let changed = false;
    for (const { key, dir } of AUTO_DETECT) {
      if (cfg[key] && !cfg[key].execPath) {
        const detected = path.join(PROJECT_BASE, dir);
        if (fs.existsSync(detected)) {
          cfg[key].execPath = detected;
          changed = true;
          console.log(`[Launcher] Auto-detected ${key} at ${detected}`);
        }
      }
    }
    if (changed) writeConfig(cfg);
  } catch (err) {
    console.error('[Launcher] Auto-detect error:', err.message);
  }

  setupTray();
  createPanelWindow();
  setupIPC();
  startConfigPolling();
  startVpnCheck();

  // Emit launcher opened event to ecosystem bus
  ecosystemBus.emitEvent('Launcher', 'launcher.opened', {});

  // Watch ecosystem bus for real-time updates → push to renderer
  ecosystemBus.watchEvents((events) => {
    if (panelWindow && !panelWindow.isDestroyed()) {
      panelWindow.webContents.send('ecosystem-events-updated', events);
    }
  });

  // Show panel for splash, then hide after 1.5 s (renderer handles animation)
  panelWindow.once('ready-to-show', () => {
    panelWindow.show();
    setTimeout(() => {
      if (panelWindow && !panelWindow.isDestroyed()) {
        panelWindow.webContents.send('splash-complete');
      }
    }, 1500);
  });

  // Silent update check after 4 s to not block startup
  setTimeout(checkForUpdates, 4000);
});

// Prevent quit when all windows close (tray app)
app.on('window-all-closed', e => e.preventDefault());

app.on('before-quit', () => {
  if (configPollTimer) clearInterval(configPollTimer);
  if (vpnCheckTimer)   clearInterval(vpnCheckTimer);
});

// Prevent Electron from showing a dock icon on macOS after launch
app.on('activate', () => {
  if (process.platform === 'darwin') app.dock.hide();
});
