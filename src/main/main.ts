import {
  app, BrowserWindow, Tray, Menu, nativeImage,
  ipcMain, dialog, Notification, screen, shell
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';
import https from 'https';
import { spawn } from 'child_process';
import zlib from 'zlib';

import {
  readConfig, writeConfig, updateConfig,
  addActivityEntry, clearActivityFeed, writeTrigger
} from './config.js';
import * as ecosystemBus from './ecosystem-bus.js';
import type { VpnStatus } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Single-instance lock ─────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

app.on('second-instance', () => {
  if (tray) showPanel(tray.getBounds());
});

// ─── Globals ──────────────────────────────────────────────────────────────────

let tray:           Tray | null           = null;
let panelWindow:    BrowserWindow | null  = null;
let isPanelVisible  = false;
let isDialogOpen    = false;
let lastHideTime    = 0;
let currentConfig   = readConfig();
let vpnStatus: VpnStatus = { active: false, interface: null };
let configPollTimer: ReturnType<typeof setInterval> | null = null;
let vpnCheckTimer:   ReturnType<typeof setInterval> | null = null;

const APP_VERSION = app.getVersion() || '1.0.0';
const DEFAULT_UPDATE_URL =
  'https://api.github.com/repos/itsEliias/cybertools-launcher/releases/latest';

// ─── Mac dock hiding ──────────────────────────────────────────────────────────

if (process.platform === 'darwin') app.dock.hide();

// ─── PNG generator (no external deps) ────────────────────────────────────────

function crc32(buf: Buffer): number {
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

function makePNGChunk(type: string, data: Buffer): Buffer {
  const lenBuf  = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf   = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generateFallbackPNG(
  size: number,
  bgR: number, bgG: number, bgB: number,
  acR: number, acG: number, acB: number
): Buffer {
  const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;

  const stride = size * 3 + 1;
  const raw    = Buffer.alloc(size * stride);
  const cx = size / 2, cy = size / 2;

  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const idx = y * stride + 1 + x * 3;
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

function createTrayIcon(): Electron.NativeImage {
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'tray-icon.png');
  if (fs.existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath);
    if (process.platform === 'darwin') img.setTemplateImage(false);
    return img;
  }
  const buf = generateFallbackPNG(32, 13,13,26, 180,79,255);
  return nativeImage.createFromBuffer(buf, { scaleFactor: 1 });
}

// ─── VPN detection ────────────────────────────────────────────────────────────

function detectVPN(): VpnStatus {
  const ifaces   = os.networkInterfaces();
  const patterns = ['tun','tap','vpn','proton','wg','ppp','utun','ipsec','ovpn','nord'];
  for (const [name, addrs] of Object.entries(ifaces)) {
    const lo = name.toLowerCase();
    if (patterns.some(p => lo.includes(p)) && addrs && addrs.length > 0) {
      return { active: true, interface: name };
    }
  }
  return { active: false, interface: null };
}

// ─── Panel positioning ────────────────────────────────────────────────────────

function getPanelPosition(trayBounds: Electron.Rectangle): { x: number; y: number } {
  const PW = 480, PH = 620, GAP = 8;
  const wa = screen.getPrimaryDisplay().workArea;
  let x: number, y: number;

  if (process.platform === 'darwin') {
    x = Math.round(trayBounds.x + trayBounds.width  / 2 - PW / 2);
    y = trayBounds.y + trayBounds.height + GAP;
  } else {
    const screenMidY = wa.y + wa.height / 2;
    if (trayBounds.y > screenMidY) {
      x = Math.round(trayBounds.x + trayBounds.width  / 2 - PW / 2);
      y = Math.round(trayBounds.y - PH - GAP);
    } else {
      x = Math.round(trayBounds.x + trayBounds.width  / 2 - PW / 2);
      y = trayBounds.y + trayBounds.height + GAP;
    }
  }

  x = Math.max(wa.x + GAP, Math.min(x, wa.x + wa.width  - PW  - GAP));
  y = Math.max(wa.y + GAP, Math.min(y, wa.y + wa.height - PH  - GAP));
  return { x, y };
}

// ─── Panel window ─────────────────────────────────────────────────────────────

function createPanelWindow(): void {
  panelWindow = new BrowserWindow({
    width       : 480,
    height      : 620,
    show        : false,
    frame       : false,
    resizable   : false,
    movable     : false,
    minimizable : false,
    maximizable : false,
    skipTaskbar : true,
    alwaysOnTop : true,
    transparent : true,
    hasShadow   : true,
    title       : 'CYBERTOOLS — ItsEliias',
    webPreferences: {
      preload         : path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration : false,
      sandbox         : false,
      devTools        : process.env.NODE_ENV === 'development'
    }
  });

  if (process.env.NODE_ENV === 'development') {
    panelWindow.loadURL('http://localhost:5173');
  } else {
    panelWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  panelWindow.on('blur', () => {
    if (isPanelVisible && !isDialogOpen && !panelWindow!.webContents.isDevToolsFocused()) {
      setTimeout(() => {
        if (isPanelVisible && !isDialogOpen) hidePanel();
      }, 120);
    }
  });

  panelWindow.webContents.on('will-navigate', e => e.preventDefault());
  panelWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

function showPanel(trayBounds: Electron.Rectangle): void {
  if (!panelWindow || panelWindow.isDestroyed()) return;
  const { x, y } = getPanelPosition(trayBounds);
  panelWindow.setPosition(x, y, false);
  panelWindow.setAlwaysOnTop(true);
  panelWindow.show();
  panelWindow.focus();
  isPanelVisible = true;
  panelWindow.webContents.send('panel-shown');
}

function hidePanel(): void {
  if (!panelWindow || panelWindow.isDestroyed()) return;
  panelWindow.hide();
  isPanelVisible = false;
  lastHideTime   = Date.now();
}

function togglePanel(trayBounds: Electron.Rectangle): void {
  if (isPanelVisible) {
    hidePanel();
  } else {
    if (Date.now() - lastHideTime < 300) return;
    showPanel(trayBounds);
  }
}

// ─── Tray setup ───────────────────────────────────────────────────────────────

function setupTray(): void {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('CyberTools Launcher — ItsEliias');
  tray.on('click', () => togglePanel(tray!.getBounds()));
  tray.on('double-click', () => { if (!isPanelVisible) showPanel(tray!.getBounds()); });
  refreshContextMenu();
}

function refreshContextMenu(): void {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Launcher', accelerator: 'CommandOrControl+O',
      click: () => showPanel(tray!.getBounds())
    },
    {
      label: 'Open CyberLab Companion', accelerator: 'CommandOrControl+1',
      click: () => launchApp('cyberlab')
    },
    {
      label: 'Open VaultCore', accelerator: 'CommandOrControl+2',
      click: () => launchApp('vaultscraper')
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
      label: 'Settings', accelerator: 'CommandOrControl+,',
      click: () => {
        showPanel(tray!.getBounds());
        setTimeout(() => {
          if (panelWindow && !panelWindow.isDestroyed()) {
            panelWindow.webContents.send('open-settings');
          }
        }, 220);
      }
    },
    {
      label: 'Quit CyberTools', accelerator: 'CommandOrControl+Q',
      click: () => app.quit()
    }
  ]);
  tray!.setContextMenu(menu);
}

// ─── App launching ────────────────────────────────────────────────────────────

function launchApp(appKey: string): boolean {
  const config   = readConfig();
  let execPath   = '';
  let appName    = '';
  let args: string[] = ['--launcher-open'];

  if (appKey === 'cyberlab') {
    execPath = config.cyberlab?.execPath || '';
    appName  = 'CyberLab Companion';
  } else if (appKey === 'vaultscraper') {
    execPath = config.vaultscraper?.execPath || '';
    appName  = 'VaultCore';
  } else if (appKey === 'ghostvault') {
    execPath = config.ghostvault?.execPath || '';
    appName  = 'GhostVault';
  } else if (appKey.startsWith('custom_')) {
    const idx  = parseInt(appKey.replace('custom_', ''), 10);
    const slot = config.launcher?.customSlots?.[idx];
    if (slot) {
      execPath = slot.execPath || '';
      appName  = slot.name    || 'App';
      args     = [];
    }
  }

  if (!execPath || !fs.existsSync(execPath)) {
    console.warn(`[launch] execPath invalid for ${appKey}: ${execPath}`);
    return false;
  }

  try {
    if (process.platform === 'darwin' && execPath.endsWith('.app')) {
      spawn('open', [execPath, '--args', ...args], { detached: true, stdio: 'ignore' }).unref();
    } else if (fs.statSync(execPath).isDirectory()) {
      const electronBin = path.join(execPath, 'node_modules', '.bin', 'electron');
      const electronCmd = fs.existsSync(electronBin) ? electronBin : 'electron';
      spawn(electronCmd, ['.'], { cwd: execPath, detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn(execPath, args, { detached: true, stdio: 'ignore' }).unref();
    }
    addActivityEntry({ type: 'launcher', text: `${appName} opened` });
    return true;
  } catch (err) {
    console.error(`[launch] Failed to spawn ${execPath}:`, (err as Error).message);
    return false;
  }
}

// ─── Config polling ───────────────────────────────────────────────────────────

function pollConfig(): void {
  try {
    const config = readConfig();
    const prev   = currentConfig;
    currentConfig = config;

    if (panelWindow && !panelWindow.isDestroyed() && panelWindow.webContents.getURL()) {
      panelWindow.webContents.send('config-update', config);
    }

    if (Object.keys(prev).length > 0) checkNotifications(prev, config);
  } catch (err) {
    console.error('[poll] Error:', (err as Error).message);
  }
}

// ─── Notification diffing ─────────────────────────────────────────────────────

function checkNotifications(prev: typeof currentConfig, curr: typeof currentConfig): void {
  const prevCLInst = !!(prev.cyberlab?.installed);
  const currCLInst = !!(curr.cyberlab?.installed);
  if (!prevCLInst && currCLInst) {
    notify('CyberLab Companion connected to launcher', '', () => launchApp('cyberlab'));
    addActivityEntry({ type: 'launcher', text: 'CyberLab Companion registered with launcher' });
  }

  const prevVSInst = !!(prev.vaultscraper?.installed);
  const currVSInst = !!(curr.vaultscraper?.installed);
  if (!prevVSInst && currVSInst) {
    notify('VaultCore connected to launcher', '', () => launchApp('vaultscraper'));
    addActivityEntry({ type: 'launcher', text: 'VaultCore registered with launcher' });
  }

  const prevGVExec = prev.ghostvault?.execPath || '';
  const currGVExec = curr.ghostvault?.execPath || '';
  if (!prevGVExec && currGVExec) {
    notify('GhostVault connected to launcher', '', () => launchApp('ghostvault'));
    addActivityEntry({ type: 'launcher', text: 'GhostVault registered with launcher' });
  }

  const prevFindings = prev.cyberlab_status ? (prev.cyberlab_status.findingsCount || 0) : 0;
  const currFindings = curr.cyberlab_status ? (curr.cyberlab_status.findingsCount || 0) : 0;
  const currLab      = curr.cyberlab_status?.currentLab || 'Unknown Lab';
  if (currFindings > prevFindings) {
    notify(`CyberLab: Flag captured on ${currLab}`, '', () => launchApp('cyberlab'));
    addActivityEntry({ type: 'cyberlab', text: `Flag captured on ${currLab}` });
  }

  const prevActive = prev.vaultscraper_status?.activeScrape;
  const currActive = curr.vaultscraper_status?.activeScrape;
  if (prevActive && !currActive) {
    const srcName = (prevActive as { name?: string }).name || 'Source';
    const newCnt  = curr.vaultscraper_status?.lastScrapeNew     || 0;
    const updCnt  = curr.vaultscraper_status?.lastScrapeUpdated || 0;
    notify(`VaultCore: ${srcName} complete — ${newCnt} new, ${updCnt} updated`, '', () => launchApp('vaultscraper'));
    addActivityEntry({ type: 'vaultscraper', text: `Scrape complete: ${srcName} — ${newCnt} new, ${updCnt} updated` });
  }

  const prevSession = !!(prev.cyberlab_status?.sessionActive);
  const currSession = !!(curr.cyberlab_status?.sessionActive);
  if (prevSession && !currSession) {
    const lab = prev.cyberlab_status?.currentLab || 'Lab';
    addActivityEntry({ type: 'cyberlab', text: `Session complete: ${lab}` });
  }
}

function notify(title: string, body: string, onClick?: () => void): void {
  if (!Notification.isSupported()) return;
  try {
    const n = new Notification({ title, body, silent: false });
    if (onClick) n.on('click', onClick);
    n.show();
  } catch (e) {
    console.error('[notify]', (e as Error).message);
  }
}

// ─── VPN check ────────────────────────────────────────────────────────────────

function startVpnCheck(): void {
  vpnStatus   = detectVPN();
  vpnCheckTimer = setInterval(() => {
    vpnStatus = detectVPN();
    if (panelWindow && !panelWindow.isDestroyed()) {
      panelWindow.webContents.send('vpn-update', vpnStatus);
    }
  }, 30000);
}

// ─── Update checker ───────────────────────────────────────────────────────────

function checkForUpdates(): void {
  try {
    const config     = readConfig();
    const releaseUrl = config.launcher?.updateUrl || DEFAULT_UPDATE_URL;
    const req = https.get(
      releaseUrl,
      { headers: { 'User-Agent': `CyberTools-Launcher/${APP_VERSION}` } },
      res => {
        let body = '';
        res.on('data', (chunk: string) => { body += chunk; });
        res.on('end', () => {
          try {
            const data    = JSON.parse(body);
            const tagName = (data.tag_name || '').replace(/^v/, '');
            if (tagName && isNewerVersion(tagName, APP_VERSION)) {
              panelWindow?.webContents.send('update-available', {
                version: tagName,
                url    : data.html_url || ''
              });
            }
          } catch (_) {}
        });
      }
    );
    req.on('error', () => {});
    req.setTimeout(8000, () => req.destroy());
  } catch (_) {}
}

function isNewerVersion(latest: string, current: string): boolean {
  const lp = latest.split('.').map(Number);
  const cp = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((lp[i] || 0) > (cp[i] || 0)) return true;
    if ((lp[i] || 0) < (cp[i] || 0)) return false;
  }
  return false;
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

function setupIPC(): void {
  ipcMain.handle('get-config', () => readConfig());

  ipcMain.handle('save-config', (_e, updates: Record<string, unknown>) =>
    updateConfig(cfg => ({ ...cfg, ...updates }))
  );

  ipcMain.handle('save-config-deep', (_e, updates: Record<string, unknown>) =>
    updateConfig(cfg => {
      const out = { ...cfg };
      for (const [k, v] of Object.entries(updates)) {
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          (out as Record<string, unknown>)[k] = { ...((out as Record<string, unknown>)[k] as object || {}), ...(v as object) };
        } else {
          (out as Record<string, unknown>)[k] = v;
        }
      }
      return out;
    })
  );

  ipcMain.handle('launch-app',     (_e, appKey: string)  => launchApp(appKey));
  ipcMain.handle('update-now',     () => { writeTrigger({ action: 'update_now' }); addActivityEntry({ type: 'launcher', text: 'VaultCore update triggered' }); return true; });
  ipcMain.handle('get-vpn-status', () => vpnStatus);
  ipcMain.handle('hide-panel',     () => { hidePanel(); return true; });
  ipcMain.on('hide-after-splash',  () => hidePanel());

  ipcMain.handle('open-file-picker', async (_e, opts: { filters?: Electron.FileFilter[] }) => {
    isDialogOpen = true;
    try {
      const filters = opts?.filters || [{ name: 'All Files', extensions: ['*'] }];
      const result  = await dialog.showOpenDialog(panelWindow!, { properties: ['openFile'], filters });
      return result.canceled ? null : result.filePaths[0];
    } finally { isDialogOpen = false; }
  });

  ipcMain.handle('open-folder-picker', async () => {
    isDialogOpen = true;
    try {
      const result = await dialog.showOpenDialog(panelWindow!, { properties: ['openDirectory'] });
      return result.canceled ? null : result.filePaths[0];
    } finally { isDialogOpen = false; }
  });

  ipcMain.handle('check-file-exists', (_e, filePath: string) =>
    typeof filePath === 'string' && fs.existsSync(filePath)
  );

  ipcMain.handle('clear-activity', () => clearActivityFeed());
  ipcMain.handle('add-activity',   (_e, entry) => addActivityEntry(entry));
  ipcMain.handle('get-version',    () => APP_VERSION);

  ipcMain.handle('add-custom-slot', (_e, slot) =>
    updateConfig(cfg => {
      const slots = cfg.launcher.customSlots || [];
      if (slots.length >= 4) return cfg;
      cfg.launcher.customSlots = [...slots, slot];
      return cfg;
    })
  );

  ipcMain.handle('remove-custom-slot', (_e, index: number) =>
    updateConfig(cfg => {
      const slots = [...(cfg.launcher.customSlots || [])];
      slots.splice(index, 1);
      cfg.launcher.customSlots = slots;
      return cfg;
    })
  );

  ipcMain.handle('update-custom-slot', (_e, { index, slot }: { index: number; slot: unknown }) =>
    updateConfig(cfg => {
      const slots = [...(cfg.launcher.customSlots || [])];
      if (index >= 0 && index < slots.length) slots[index] = slot as typeof slots[0];
      cfg.launcher.customSlots = slots;
      return cfg;
    })
  );

  ipcMain.handle('open-external', (_e, url: string) => { shell.openExternal(url); return true; });

  ipcMain.handle('ecosystem-read-events', () => ecosystemBus.readEvents());
  ipcMain.handle('ecosystem-emit', (_e, appName: string, eventType: string, data: Record<string, unknown>) => {
    ecosystemBus.emitEvent(appName, eventType, data);
    return true;
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
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
      const appCfg = (cfg as Record<string, unknown>)[key] as { execPath?: string } | undefined;
      if (appCfg && !appCfg.execPath) {
        const detected = path.join(PROJECT_BASE, dir);
        if (fs.existsSync(detected)) {
          appCfg.execPath = detected;
          changed = true;
          console.log(`[Launcher] Auto-detected ${key} at ${detected}`);
        }
      }
    }
    if (changed) writeConfig(cfg);
  } catch (err) {
    console.error('[Launcher] Auto-detect error:', (err as Error).message);
  }

  setupTray();
  createPanelWindow();
  setupIPC();

  configPollTimer = setInterval(pollConfig, 5000);
  pollConfig();

  startVpnCheck();

  ecosystemBus.emitEvent('Launcher', 'launcher.opened', {});

  ecosystemBus.watchEvents((events) => {
    if (panelWindow && !panelWindow.isDestroyed()) {
      panelWindow.webContents.send('ecosystem-events-updated', events);
    }
  });

  panelWindow!.once('ready-to-show', () => {
    panelWindow!.show();
    setTimeout(() => {
      panelWindow?.webContents.send('splash-complete');
    }, 1500);
  });

  setTimeout(checkForUpdates, 4000);
});

app.on('window-all-closed', e => e.preventDefault());

app.on('before-quit', () => {
  if (configPollTimer) clearInterval(configPollTimer);
  if (vpnCheckTimer)   clearInterval(vpnCheckTimer);
});

app.on('activate', () => {
  if (process.platform === 'darwin') app.dock.hide();
});
