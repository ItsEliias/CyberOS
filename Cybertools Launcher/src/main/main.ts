import {
  app, BrowserWindow, Tray, Menu, nativeImage,
  ipcMain, dialog, Notification, screen, shell, globalShortcut, safeStorage
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';
import https from 'https';
import { spawn } from 'child_process';
import zlib from 'zlib';
import cryptoModule from 'crypto';

import {
  readConfig, writeConfig, updateConfig,
  addActivityEntry, clearActivityFeed, writeTrigger
} from './config.js';
import * as ecosystemBus from './ecosystem-bus.js';
import { peerAppPath, userDataDir, sharedConfigPath, launchPeerApp } from './platform.js';
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
let searchWindow:   BrowserWindow | null  = null;
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
  const buf = generateFallbackPNG(32, 13,13,26, 210,153,34);
  return nativeImage.createFromBuffer(buf, { scaleFactor: 1 });
}

// ─── VPN detection ────────────────────────────────────────────────────────────

function detectVPN(): VpnStatus {
  const ifaces   = os.networkInterfaces();
  const patterns = ['tun','tap','vpn','proton','wg','ppp','utun','ipsec','ovpn','nord'];
  // A real VPN tunnel carries routable traffic. macOS keeps utun0..utunN
  // around for Continuity / AirDrop with only link-local fe80:: IPv6 — those
  // would otherwise be misread as "VPN active". Require at least one address
  // that isn't link-local and isn't loopback before flagging the interface.
  function hasRoutableAddress(addrs: os.NetworkInterfaceInfo[] | undefined): boolean {
    if (!addrs) return false;
    return addrs.some(a => {
      if (a.internal) return false;
      const ip = a.address || '';
      if (a.family === 'IPv6' && ip.toLowerCase().startsWith('fe80')) return false;
      if (a.family === 'IPv4' && ip.startsWith('169.254.'))            return false;
      return true;
    });
  }
  for (const [name, addrs] of Object.entries(ifaces)) {
    const lo = name.toLowerCase();
    if (patterns.some(p => lo.includes(p)) && hasRoutableAddress(addrs)) {
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
    width       : 620,
    height      : 700,
    show        : false,
    frame       : false,
    resizable   : false,
    movable     : true,
    minimizable : false,
    maximizable : false,
    skipTaskbar : true,
    alwaysOnTop : true,
    transparent : true,
    hasShadow   : true,
    title       : 'CYBERTOOLS — ItsEliias',
    webPreferences: {
      preload         : path.join(__dirname, '..', 'preload', 'preload.cjs'),
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

// ─── Unified Search window ────────────────────────────────────────────────────

function createSearchWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const SW = 640, SH = 480;

  searchWindow = new BrowserWindow({
    width       : SW,
    height      : SH,
    x           : Math.round((width  - SW) / 2),
    y           : Math.round((height - SH) / 2),
    show        : false,
    frame       : false,
    resizable   : false,
    movable     : false,
    minimizable : false,
    maximizable : false,
    skipTaskbar : true,
    alwaysOnTop : true,
    transparent : false,
    hasShadow   : true,
    backgroundColor: '#0e1117',
    title       : 'CyberOS Search',
    webPreferences: {
      preload         : path.join(__dirname, '..', 'preload', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration : false,
      sandbox         : false,
      devTools        : process.env.NODE_ENV === 'development'
    }
  });

  if (process.env.NODE_ENV === 'development') {
    searchWindow.loadURL('http://localhost:5173/search.html');
  } else {
    searchWindow.loadFile(path.join(__dirname, '..', 'renderer', 'search.html'));
  }

  searchWindow.on('blur', () => {
    if (searchWindow && !searchWindow.isDestroyed()) searchWindow.hide();
  });

  searchWindow.webContents.on('will-navigate', e => e.preventDefault());
  searchWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

function showSearchWindow(): void {
  if (!searchWindow || searchWindow.isDestroyed()) createSearchWindow();
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const SW = 640;
  const x  = Math.round((width - SW) / 2);
  searchWindow!.setPosition(x, Math.round(height * 0.22), false);
  searchWindow!.setAlwaysOnTop(true);
  searchWindow!.show();
  searchWindow!.focus();
  searchWindow!.webContents.send('search-shown');
}

// ─── Search IPC ───────────────────────────────────────────────────────────────

interface SearchResult {
  app: string;
  type: 'target' | 'port' | 'credential' | 'context';
  title: string;
  subtitle: string;
  score: number;
}

function scoreText(field: string, query: string): number {
  const f = field.toLowerCase();
  const q = query.toLowerCase();
  if (f === q)           return 100;
  if (f.startsWith(q))   return 70;
  if (f.includes(q))     return 40;
  return 0;
}

function scoreFields(fields: string[], query: string): number {
  return fields.reduce((sum, f) => sum + scoreText(f, query), 0);
}

function searchReconDesk(query: string): SearchResult[] {
  const dataPath = path.join(os.homedir(), '.recondesk', 'data.json');
  if (!fs.existsSync(dataPath)) return [];
  try {
    const raw  = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw) as {
      targets?: Array<{
        name?: string; ip?: string; os?: string;
        ports?: Array<{ number?: number; service?: string; version?: string }>;
        credentials?: Array<{ username?: string; service?: string }>;
      }>;
    };
    const results: SearchResult[] = [];
    for (const target of data.targets || []) {
      const tName = target.name || '';
      const tIp   = target.ip   || '';
      const tOs   = target.os   || '';
      const s = scoreFields([tName, tIp, tOs], query);
      if (s > 0) {
        results.push({ app: 'ReconDesk', type: 'target', title: tName, subtitle: `${tIp}${tOs ? ' · ' + tOs : ''}`, score: s });
      }
      for (const port of target.ports || []) {
        const svc  = port.service || '';
        const ver  = port.version || '';
        const ps   = scoreFields([String(port.number || ''), svc, ver], query);
        if (ps > 0) {
          results.push({ app: 'ReconDesk', type: 'port', title: `${port.number}/${svc || 'unknown'}`, subtitle: `${tName}${ver ? ' · ' + ver : ''}`, score: ps });
        }
      }
      for (const cred of target.credentials || []) {
        const uname = cred.username || '';
        const svc2  = cred.service  || '';
        const cs    = scoreFields([uname, svc2], query);
        if (cs > 0) {
          results.push({ app: 'ReconDesk', type: 'credential', title: uname || 'credential', subtitle: `${tName}${svc2 ? ' · ' + svc2 : ''}`, score: cs });
        }
      }
    }
    return results;
  } catch { return []; }
}

function searchCyberContext(query: string): SearchResult[] {
  const cfgPath = sharedConfigPath();
  if (!fs.existsSync(cfgPath)) return [];
  try {
    const raw  = fs.readFileSync(cfgPath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const results: SearchResult[] = [];
    const ctx = (data.shared_context || data) as Record<string, unknown>;
    for (const [key, val] of Object.entries(ctx)) {
      const strVal = typeof val === 'string' ? val : JSON.stringify(val);
      const s = scoreFields([key, strVal], query);
      if (s > 0) {
        results.push({ app: 'Launcher', type: 'context', title: key, subtitle: String(strVal).slice(0, 80), score: s });
      }
    }
    return results;
  } catch { return []; }
}

function setupSearchIPC(): void {
  ipcMain.handle('search:query', (_e, query: string): SearchResult[] => {
    if (!query || typeof query !== 'string' || !query.trim()) return [];
    const q       = query.trim().slice(0, 200);
    const all     = [...searchReconDesk(q), ...searchCyberContext(q)];
    return all.sort((a, b) => b.score - a.score).slice(0, 30);
  });

  ipcMain.handle('search:close', () => {
    if (searchWindow && !searchWindow.isDestroyed()) searchWindow.hide();
    return true;
  });
}

// ─── Tray setup ───────────────────────────────────────────────────────────────

// Read the shared CredVault session state from cybertools-config.json so the
// tray menu and IPC handler share one source of truth.
function readSSOState(): { unlocked: boolean; expiresAt?: string | null } {
  try {
    const cfgPath = sharedConfigPath();
    if (!fs.existsSync(cfgPath)) return { unlocked: false };
    const shared = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {};
    const sso = shared.sso as { unlocked?: boolean; expiresAt?: string | null } | undefined;
    if (!sso?.unlocked) return { unlocked: false };
    if (sso.expiresAt && new Date(sso.expiresAt).getTime() < Date.now()) return { unlocked: false };
    return { unlocked: true, expiresAt: sso.expiresAt };
  } catch { return { unlocked: false }; }
}

function setupTray(): void {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('CyberTools Launcher — ItsEliias');
  tray.on('click', () => tray!.popUpContextMenu());
  tray.on('double-click', () => tray!.popUpContextMenu());
  refreshContextMenu();
  // Re-poll SSO state every 7 s so the menu's status line stays accurate
  // when CredVault is locked/unlocked from another app. Also drives the
  // pre-expiry warning notification.
  setInterval(() => {
    try { refreshContextMenu(); } catch { /* ignore */ }
    try { ssoExpiryWatcher(); } catch { /* ignore */ }
  }, 7000);
}

// ─── SSO pre-expiry warning ──────────────────────────────────────────────────
// Fires a single desktop notification when the CredVault session is within
// 90 s of expiry. Resets once the session is re-unlocked or fully expires so
// the next renewal cycle can warn again.
let ssoExpiryNotifiedFor: string | null = null;

function ssoExpiryWatcher(): void {
  const sso = readSSOState();
  if (!sso.unlocked || !sso.expiresAt) {
    // Session locked / re-unlocked / no expiry — clear so the next session can warn.
    ssoExpiryNotifiedFor = null;
    return;
  }
  const ms = new Date(sso.expiresAt).getTime() - Date.now();
  if (ms <= 0) { ssoExpiryNotifiedFor = null; return; }
  if (ms > 90_000) return;
  if (ssoExpiryNotifiedFor === sso.expiresAt) return;
  ssoExpiryNotifiedFor = sso.expiresAt;
  const seconds = Math.max(1, Math.round(ms / 1000));
  notify(
    'CredVault session expiring',
    `Auto-lock in ~${seconds}s. Click to renew.`,
    () => launchApp('credvault'),
  );
}

function refreshContextMenu(): void {
  // Only surface apps that are actually installed
  const installedKey = (key: string) => {
    const fallback = APP_FALLBACK_PRODUCTS[key];
    return !!(fallback && fs.existsSync(`/Applications/${fallback}.app`));
  };

  const appItem = (key: string, label: string, accelerator?: string) => {
    const installed = installedKey(key);
    const actions = APP_TRAY_ACTIONS[key] || [];
    if (!installed || actions.length === 0) {
      return { label, accelerator, enabled: installed, click: () => { launchApp(key); } };
    }
    // Submenu: open + per-app actions. Clicking "Open" launches with no action.
    return {
      label, accelerator, enabled: installed,
      submenu: [
        { label: 'Open', click: () => { launchApp(key); } },
        { type: 'separator' as const },
        ...actions.map(a => ({
          label: a.label,
          click: () => { writePendingAction(key, a.id); launchApp(key); },
        })),
      ],
    };
  };

  const menu = Menu.buildFromTemplate([
    {
      label: 'Launcher', accelerator: 'CommandOrControl+O',
      click: () => showPanel(tray!.getBounds())
    },
    {
      label: 'CyberOS Dashboard', accelerator: 'CommandOrControl+6',
      enabled: installedKey('cyberos'),
      click: () => { launchApp('cyberos'); }
    },
    { type: 'separator' },
    // Vaults & secrets
    appItem('credvault',      'CredVault',          'CommandOrControl+1'),
    appItem('ghostvault',     'GhostVault',         'CommandOrControl+2'),
    appItem('vaultscraper',   'VaultCore',          'CommandOrControl+3'),
    { type: 'separator' },
    // Recon & network
    appItem('recondesk',      'ReconDesk',          'CommandOrControl+4'),
    appItem('signalboard',    'SignalBoard',        'CommandOrControl+5'),
    appItem('networkmap',     'NetworkMap'),
    { type: 'separator' },
    // Workflow & lab
    appItem('playbookstudio', 'PlaybookStudio'),
    appItem('reportforge',    'ReportForge'),
    appItem('terminallink',   'TermLink'),
    appItem('cyberlab',       'CyberLab Companion'),
    { type: 'separator' },
    {
      label: 'Run VaultCore Update Now',
      enabled: installedKey('vaultscraper'),
      click: () => {
        // Use the standard pending-actions queue VaultCore already handles so
        // the action actually runs, instead of the legacy vaultscraper_trigger
        // field that no client reads.
        writePendingAction('vaultscraper', 'run-all-scrapes');
        launchApp('vaultscraper');
        addActivityEntry({ type: 'launcher', text: 'VaultCore update triggered from tray menu' });
      }
    },
    // SSO status read-out (disabled "label" item) — updates on each menu rebuild.
    ...(installedKey('credvault') ? [
      {
        label: readSSOState().unlocked
          ? 'CredVault session: active'
          : 'CredVault session: locked',
        enabled: false,
      },
    ] : []),
    {
      // Action flips based on current state: lock when active, open CredVault when locked.
      label: readSSOState().unlocked ? 'Lock CredVault session' : 'Unlock CredVault…',
      accelerator: 'CommandOrControl+L',
      enabled: installedKey('credvault'),
      click: () => {
        if (readSSOState().unlocked) {
          lockEcosystemSession();
        } else {
          launchApp('credvault');
        }
        // Reflect new state immediately rather than waiting for the next poll.
        setTimeout(() => { try { refreshContextMenu(); } catch { /* ignore */ } }, 400);
      },
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

// ─── Tray-menu per-app quick actions ─────────────────────────────────────────
// When a user picks a submenu item, we write `pending_action` into the shared
// cybertools-config.json, then launch the target app. The target app reads
// the pending entry on startup (filtered by appKey), runs it, and clears it.

interface TrayAction { id: string; label: string }

const APP_TRAY_ACTIONS: Record<string, TrayAction[]> = {
  credvault:      [{ id: 'add-credential', label: 'Add credential…' },
                   { id: 'generate-password', label: 'Generate password…' },
                   { id: 'run-hibp',        label: 'Run HIBP breach check' },
                   { id: 'lock-vault',      label: 'Lock vault' }],
  vaultscraper:   [{ id: 'run-all-scrapes', label: 'Run all scrapes now' },
                   { id: 'refresh-stats',   label: 'Refresh stats' }],
  ghostvault:     [{ id: 'new-note',        label: 'New note…' },
                   { id: 'quick-capture',   label: 'Quick capture' }],
  signalboard:    [{ id: 'refresh-feeds',   label: 'Refresh all feeds' },
                   { id: 'add-custom-feed', label: 'Add custom feed…' }],
  networkmap:     [{ id: 'new-graph',       label: 'New empty graph' },
                   { id: 'import-scan',     label: 'Import scan…' }],
  playbookstudio: [{ id: 'new-playbook',    label: 'New playbook…' }],
  terminallink:   [{ id: 'new-session',     label: 'New session' }],
  netlab:         [{ id: 'new-lab',         label: 'New lab…' }],
  recondesk:      [{ id: 'new-target',      label: 'New target…' }],
  reportforge:    [{ id: 'new-report',      label: 'New report…' }],
  cyberlab:       [{ id: 'refresh-stats',   label: 'Refresh platform stats' }],
};

// Atomic tmp+rename writer for the shared cybertools-config.json.
// The Launcher's writeConfig() in config.ts handles the typed CyberToolsConfig
// shape, but the SSO + pending_actions paths below need to read+modify the
// raw JSON (it carries extra keys other apps write). Direct writeFileSync
// here races against concurrent readers (sibling apps polling the file)
// and risks half-written JSON; tmp+rename is the standard fix.
function writeSharedConfigAtomic(cfgPath: string, payload: Record<string, unknown>): void {
  const json    = JSON.stringify(payload, null, 2);
  const tmpPath = cfgPath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, json, 'utf8');
    fs.renameSync(tmpPath, cfgPath);
  } catch (e) {
    // Fall back so a transient rename failure doesn't leave the SSO lock
    // in an inconsistent state. The fall-back is non-atomic by design.
    try { fs.writeFileSync(cfgPath, json, 'utf8'); }
    catch (e2) { throw e2; }
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* swallow */ }
    void e;
  }
}

// One-tap soft-lock for the whole ecosystem. Writes sso.unlocked=false
// straight into the shared cybertools-config.json so soft-locked apps
// (GhostVault, VaultCore, ReportForge with the setting on) flip back to
// their lock screen within ~5 s. Also queues a `lock-vault` action for
// CredVault itself so its in-memory key is wiped on next focus / launch.
function lockEcosystemSession(): void {
  try {
    const cfgPath = sharedConfigPath();
    const shared = fs.existsSync(cfgPath)
      ? JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      : {};
    shared.sso = {
      unlocked:   false,
      unlockedAt: null,
      expiresAt:  null,
      token:      null,
      source:     'credvault',
    };
    writeSharedConfigAtomic(cfgPath, shared);
  } catch { /* ignore */ }
  writePendingAction('credvault', 'lock-vault');
  ecosystemBus.emitEvent('Launcher', 'launcher.sso.locked', {});
  addActivityEntry({ type: 'launcher', text: 'Ecosystem session locked' });
}

function writePendingAction(appKey: string, actionId: string): void {
  try {
    const cfgPath = sharedConfigPath();
    const shared = fs.existsSync(cfgPath)
      ? JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      : {};
    const queue = (shared.pending_actions as Record<string, unknown>[] | undefined) || [];
    // Replace any existing queued action for the same appKey so we don't pile up.
    const filtered = queue.filter(q => (q as { app?: string }).app !== appKey);
    filtered.push({
      app: appKey,
      action: actionId,
      requestedAt: new Date().toISOString(),
    });
    shared.pending_actions = filtered;
    writeSharedConfigAtomic(cfgPath, shared);
    addActivityEntry({ type: 'launcher', text: `Queued ${appKey}: ${actionId}` });
  } catch (e) {
    console.warn('[tray-action] write failed:', (e as Error).message);
  }
}

// Fallback install paths (productName) per appKey — used when config has no
// recorded execPath. Matches the productName each app's electron-builder uses.
const APP_FALLBACK_PRODUCTS: Record<string, string> = {
  cyberlab:       'CyberLab Companion',
  vaultscraper:   'VaultCore',
  ghostvault:     'GhostVault',
  recondesk:      'ReconDesk',
  signalboard:    'SignalBoard',
  cyberos:        'CyberOS Dashboard',
  credvault:      'CredVault',
  playbookstudio: 'PlaybookStudio',
  reportforge:    'ReportForge',
  terminallink:   'TermLink',
  networkmap:     'NetworkMap',
  netlab:         'NetLab',
};

// ─── App launching ────────────────────────────────────────────────────────────

// Static metadata for the built-in app keys. The execPath comes from the
// matching config field (same name as the key). Replaces ~50 lines of
// hand-rolled if/else that were error-prone to extend.
const BUILTIN_APP_META: Record<string, { displayName: string }> = {
  cyberlab:       { displayName: 'CyberLab Companion' },
  vaultscraper:   { displayName: 'VaultCore' },
  ghostvault:     { displayName: 'GhostVault' },
  recondesk:      { displayName: 'ReconDesk' },
  signalboard:    { displayName: 'SignalBoard' },
  cyberos:        { displayName: 'CyberOS Dashboard' },
  credvault:      { displayName: 'CredVault' },
  playbookstudio: { displayName: 'PlaybookStudio' },
  reportforge:    { displayName: 'ReportForge' },
  terminallink:   { displayName: 'TermLink' },
  networkmap:     { displayName: 'NetworkMap' },
  netlab:         { displayName: 'NetLab' },
};

function launchApp(appKey: string): boolean {
  const config   = readConfig();
  let execPath   = '';
  let appName    = '';
  let args: string[] = ['--launcher-open'];

  const builtin = BUILTIN_APP_META[appKey];
  if (builtin) {
    const cfgEntry = (config as Record<string, { execPath?: string }>)[appKey];
    execPath = cfgEntry?.execPath || '';
    appName  = builtin.displayName;
  } else if (appKey.startsWith('custom_')) {
    const idx  = parseInt(appKey.replace('custom_', ''), 10);
    const slot = config.launcher?.customSlots?.[idx];
    if (slot) {
      execPath = slot.execPath || '';
      appName  = slot.name    || 'App';
      args     = [];
    }
  }

  // Fall back to the OS-conventional install path if config has no execPath.
  // Cross-platform via peerAppPath: /Applications/X.app on macOS,
  // %LOCALAPPDATA%\Programs\X\X.exe on Windows, /usr/local/bin/x on Linux.
  if (!execPath || !fs.existsSync(execPath)) {
    const product = APP_FALLBACK_PRODUCTS[appKey];
    if (product) {
      const fallback = peerAppPath(product);
      if (fallback) execPath = fallback;
    }
  }

  if (!execPath || !fs.existsSync(execPath)) {
    console.warn(`[launch] execPath invalid for ${appKey}: ${execPath}`);
    return false;
  }

  try {
    let child;
    // Strip dev env vars so spawned apps load their own built renderer, not localhost:5173
    const childEnv = { ...process.env, NODE_ENV: 'production' };
    delete (childEnv as Record<string, string | undefined>)['ELECTRON_RENDERER_URL'];
    if (process.platform === 'darwin' && execPath.endsWith('.app')) {
      child = spawn('open', [execPath, '--args', ...args], { detached: true, stdio: 'ignore' });
    } else if (fs.statSync(execPath).isDirectory()) {
      // .bin/electron is a shell script — spawn() won't execute shebangs without shell:true.
      // Use the real Electron binary and pass the app directory as the argument.
      let electronBin: string;
      if (process.platform === 'darwin') {
        electronBin = path.join(execPath, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
      } else if (process.platform === 'win32') {
        electronBin = path.join(execPath, 'node_modules', 'electron', 'dist', 'electron.exe');
      } else {
        electronBin = path.join(execPath, 'node_modules', 'electron', 'dist', 'electron');
      }
      const electronExec = fs.existsSync(electronBin) ? electronBin : 'electron';
      child = spawn(electronExec, [execPath], { detached: true, stdio: 'ignore', env: childEnv });
    } else {
      child = spawn(execPath, args, { detached: true, stdio: 'ignore', env: childEnv });
    }
    // Absorb spawn errors (e.g. ENOENT) before unref so they don't throw globally
    child.on('error', (err) => {
      console.error(`[launch] spawn error for ${execPath}:`, err.message);
    });
    child.unref();
    addActivityEntry({ type: 'launcher', text: `${appName} opened` });
    return true;
  } catch (err) {
    console.error(`[launch] Failed to spawn ${execPath}:`, (err as Error).message);
    return false;
  }
}

// ─── Backup / restore ────────────────────────────────────────────────────────
// Snapshot all CyberOS app config locations into a single tar.gz in the
// user-selected backup folder. No encryption yet — warn user this is plain.

interface BackupResult { ok: boolean; file?: string; error?: string; count?: number; encrypted?: boolean }

// AES-GCM wrapped tarball:
//   [4-byte magic 'CBKP'] [16-byte salt] [12-byte iv] [16-byte tag] [ciphertext]
// Magic distinguishes encrypted backups from plain tar.gz so import can route.
const BACKUP_MAGIC = Buffer.from('CBKP');
const PBKDF2_ITERS = 200_000;
const SALT_LEN = 16;
const IV_LEN   = 12;
const TAG_LEN  = 16;

function deriveBackupKey(password: string, salt: Buffer): Buffer {
  return cryptoModule.pbkdf2Sync(password, salt, PBKDF2_ITERS, 32, 'sha256');
}

function encryptToFile(plainPath: string, encPath: string, password: string): void {
  const salt = cryptoModule.randomBytes(SALT_LEN);
  const iv   = cryptoModule.randomBytes(IV_LEN);
  const key  = deriveBackupKey(password, salt);
  const cipher = cryptoModule.createCipheriv('aes-256-gcm', key, iv);
  const plain  = fs.readFileSync(plainPath);
  const enc    = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag    = cipher.getAuthTag();
  fs.writeFileSync(encPath, Buffer.concat([BACKUP_MAGIC, salt, iv, tag, enc]));
}

function decryptFromFile(encPath: string, plainPath: string, password: string): void {
  const buf = fs.readFileSync(encPath);
  if (buf.length < BACKUP_MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN ||
      !buf.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) {
    throw new Error('Not an encrypted CyberOS backup');
  }
  let off = BACKUP_MAGIC.length;
  const salt = buf.subarray(off, off + SALT_LEN); off += SALT_LEN;
  const iv   = buf.subarray(off, off + IV_LEN);   off += IV_LEN;
  const tag  = buf.subarray(off, off + TAG_LEN);  off += TAG_LEN;
  const enc  = buf.subarray(off);
  const key  = deriveBackupKey(password, salt);
  const decipher = cryptoModule.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
  fs.writeFileSync(plainPath, plain);
}

function isEncryptedBackup(file: string): boolean {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return buf.equals(BACKUP_MAGIC);
  } catch { return false; }
}

// Apps whose per-app data directory we want to capture in a backup. Both the
// CamelCase and lowercase variants are tried because different apps used
// different casing historically. Cross-platform: userDataDir() returns the
// macOS / Linux XDG / Windows APPDATA path as appropriate.
const BACKUP_APP_NAMES = [
  'CredVault', 'GhostVault', 'VaultCore', 'ReconDesk', 'SignalBoard',
  'PlaybookStudio', 'ReportForge', 'NetworkMap', 'NetLab',
  'cyberlab-companion', 'TerminalLink', 'CyberTools',
];

const BACKUP_PATHS = [
  // Shared ecosystem config (~/cybertools-config.json on macOS;
  // APPDATA / XDG-equivalent on other platforms).
  sharedConfigPath(),
  // Per-app data dirs, both cases (filtered by existsSync at backup time).
  ...BACKUP_APP_NAMES.flatMap(name => [
    userDataDir(name),
    userDataDir(name.toLowerCase()),
  ]),
  // TermLink shell-hook log — same path on every OS (~/.cybertools/).
  path.join(os.homedir(), '.cybertools/term-log.jsonl'),
];

async function runBackupSnapshot(password?: string): Promise<BackupResult> {
  try {
    const cfg     = readConfig() as Record<string, { folder?: string }>;
    const folder  = cfg.backup?.folder;
    if (!folder || !fs.existsSync(folder)) {
      return { ok: false, error: 'Backup folder not set or no longer exists.' };
    }
    const present = BACKUP_PATHS.filter(p => fs.existsSync(p));
    if (present.length === 0) {
      return { ok: false, error: 'Nothing to back up — no app data found.' };
    }

    const stamp   = new Date().toISOString().replace(/[:.]/g, '-');
    const home    = os.homedir();
    const relPaths = present.map(p => p.startsWith(home + '/') ? p.slice(home.length + 1) : p);
    const tarPath  = path.join(os.tmpdir(), `cyberos-backup-${stamp}.tar.gz`);

    await new Promise<void>((resolve, reject) => {
      const child = spawn('tar', ['-czf', tarPath, '-C', home, ...relPaths],
        { stdio: ['ignore', 'pipe', 'pipe'] });
      let err = '';
      child.stderr?.on('data', d => { err += d.toString(); });
      child.on('error', reject);
      child.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(err || `tar exited ${code}`));
      });
    });

    let finalFile: string;
    const encrypted = !!password;
    if (encrypted) {
      finalFile = path.join(folder, `cyberos-backup-${stamp}.cyberos-backup`);
      try {
        encryptToFile(tarPath, finalFile, password!);
      } finally {
        // Always delete the plaintext tar — even if encryption threw — so
        // the unencrypted snapshot can't be recovered from /tmp.
        try { fs.unlinkSync(tarPath); } catch { /* ignore */ }
      }
    } else {
      finalFile = path.join(folder, `cyberos-backup-${stamp}.tar.gz`);
      fs.renameSync(tarPath, finalFile);
    }

    addActivityEntry({ type: 'launcher', text: `Backup snapshot saved (${path.basename(finalFile)})${encrypted ? ' [encrypted]' : ''}` });
    ecosystemBus.emitEvent('Launcher', 'launcher.backup.created', { file: path.basename(finalFile), count: present.length, encrypted });
    return { ok: true, file: finalFile, count: present.length, encrypted };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function runBackupImport(password?: string): Promise<BackupResult> {
  try {
    isDialogOpen = true;
    const result = await dialog.showOpenDialog(panelWindow!, {
      properties: ['openFile'],
      filters: [{ name: 'CyberOS backup', extensions: ['cyberos-backup', 'gz', 'tgz', 'tar.gz'] }],
    });
    isDialogOpen = false;
    if (result.canceled || !result.filePaths[0]) return { ok: false, error: '' };
    const file = result.filePaths[0];

    let tarFile = file;
    let cleanup = false;
    if (isEncryptedBackup(file)) {
      if (!password) return { ok: false, error: 'This backup is encrypted — password required.', encrypted: true };
      tarFile = path.join(os.tmpdir(), `cyberos-restore-${Date.now()}.tar.gz`);
      try {
        decryptFromFile(file, tarFile, password);
        cleanup = true;
      } catch (e) {
        return { ok: false, error: `Decrypt failed: ${(e as Error).message}` };
      }
    }

    const home = os.homedir();
    let list: string[];
    try {
      list = await new Promise<string[]>((resolve, reject) => {
        const child = spawn('tar', ['-tzf', tarFile], { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        child.stdout?.on('data', d => { out += d.toString(); });
        child.on('error', reject);
        child.on('close', code => code === 0 ? resolve(out.split('\n').filter(Boolean)) : reject(new Error(`tar -t exited ${code}`)));
      });

      // Tar-slip guard. Before extraction, validate every member path
      // resolves *inside* the user's home directory. A backup is just a
      // user-supplied file — without this, a malicious .cyberos-backup
      // could embed `../../etc/...` or absolute paths and overwrite
      // anywhere the user can write.
      const resolvedHome = path.resolve(home);
      const homePrefix   = resolvedHome.endsWith(path.sep) ? resolvedHome : resolvedHome + path.sep;
      for (const rawMember of list) {
        const member = rawMember.replace(/\/+$/, ''); // strip trailing slash on dirs
        if (!member) continue;
        if (path.isAbsolute(member)) {
          throw new Error(`Backup rejected — absolute path entry: ${member}`);
        }
        if (member.split('/').some(seg => seg === '..')) {
          throw new Error(`Backup rejected — parent-traversal entry: ${member}`);
        }
        const resolved = path.resolve(home, member);
        if (resolved !== resolvedHome && !resolved.startsWith(homePrefix)) {
          throw new Error(`Backup rejected — entry escapes home: ${member}`);
        }
      }

      await new Promise<void>((resolve, reject) => {
        const child = spawn('tar', ['-xzf', tarFile, '-C', home], { stdio: ['ignore', 'pipe', 'pipe'] });
        let err = '';
        child.stderr?.on('data', d => { err += d.toString(); });
        child.on('error', reject);
        child.on('close', code => code === 0 ? resolve() : reject(new Error(err || `tar -x exited ${code}`)));
      });
    } finally {
      // Always remove the decrypted temp tar so it never lingers on /tmp,
      // even if extraction failed.
      if (cleanup) { try { fs.unlinkSync(tarFile); } catch { /* ignore */ } }
    }

    addActivityEntry({ type: 'launcher', text: `Backup restored from ${path.basename(file)}` });
    ecosystemBus.emitEvent('Launcher', 'launcher.backup.restored', { file: path.basename(file), count: list.length });
    return { ok: true, count: list.length };
  } catch (e) {
    isDialogOpen = false;
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Backup scheduling ────────────────────────────────────────────────────────
// Checks every 30 min: if backup is enabled with daily/weekly frequency and the
// last run is older than the interval, run a snapshot. Uses safeStorage for the
// encrypted-backup password — if encryption is on, the password must have been
// captured at enable-time.

let backupSchedulerTimer: NodeJS.Timeout | null = null;

function savedBackupPasswordPath(): string {
  return path.join(os.homedir(), 'Library/Application Support/CyberTools/backup-key.enc');
}

function saveBackupPassword(password: string): boolean {
  try {
    if (!safeStorage.isEncryptionAvailable()) return false;
    const enc = safeStorage.encryptString(password);
    fs.mkdirSync(path.dirname(savedBackupPasswordPath()), { recursive: true });
    fs.writeFileSync(savedBackupPasswordPath(), enc);
    return true;
  } catch { return false; }
}

function loadBackupPassword(): string | null {
  try {
    const p = savedBackupPasswordPath();
    if (!fs.existsSync(p)) return null;
    if (!safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(fs.readFileSync(p));
  } catch { return null; }
}

function clearBackupPassword(): void {
  try { fs.unlinkSync(savedBackupPasswordPath()); } catch { /* ignore */ }
}

async function checkScheduledBackup(): Promise<void> {
  try {
    const cfg = readConfig() as Record<string, {
      enabled?: boolean; folder?: string; frequency?: 'manual' | 'daily' | 'weekly'; lastRun?: string; encrypt?: boolean
    }>;
    const b = cfg.backup;
    if (!b?.enabled || !b.folder) return;
    const freq = b.frequency || 'manual';
    if (freq === 'manual') return;

    const intervalMs = freq === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const last = b.lastRun ? new Date(b.lastRun).getTime() : 0;
    if (Date.now() - last < intervalMs) return;

    const password = b.encrypt ? loadBackupPassword() : undefined;
    if (b.encrypt && !password) {
      console.warn('[backup] scheduled backup skipped — encryption enabled but no saved password');
      return;
    }

    const result = await runBackupSnapshot(password || undefined);
    if (result.ok) {
      writeConfig({ backup: { ...b, lastRun: new Date().toISOString() } });
      const shared = readConfig();
      if (panelWindow && !panelWindow.isDestroyed()) {
        panelWindow.webContents.send('config-update', shared);
      }
    }
  } catch (e) {
    console.warn('[backup] scheduler error:', (e as Error).message);
  }
}

function startBackupScheduler(): void {
  if (backupSchedulerTimer) clearInterval(backupSchedulerTimer);
  // First check after 60s, then every 30 min
  setTimeout(() => { void checkScheduledBackup(); }, 60_000);
  backupSchedulerTimer = setInterval(() => { void checkScheduledBackup(); }, 30 * 60_000);
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

  const prevRDExec = prev.recondesk?.execPath || '';
  const currRDExec = curr.recondesk?.execPath || '';
  if (!prevRDExec && currRDExec) {
    notify('ReconDesk connected to launcher', '', () => launchApp('recondesk'));
    addActivityEntry({ type: 'launcher', text: 'ReconDesk registered with launcher' });
  }

  const prevSBExec = prev.signalboard?.execPath || '';
  const currSBExec = curr.signalboard?.execPath || '';
  if (!prevSBExec && currSBExec) {
    notify('SignalBoard connected to launcher', '', () => launchApp('signalboard'));
    addActivityEntry({ type: 'launcher', text: 'SignalBoard registered with launcher' });
  }

  const prevCOExec = prev.cyberos?.execPath || '';
  const currCOExec = curr.cyberos?.execPath || '';
  if (!prevCOExec && currCOExec) {
    notify('CyberOS Dashboard connected to launcher', '', () => launchApp('cyberos'));
    addActivityEntry({ type: 'launcher', text: 'CyberOS Dashboard registered with launcher' });
  }

  const p = prev as Record<string,{execPath?:string}|undefined>;
  const c = curr  as Record<string,{execPath?:string}|undefined>;
  const newApps: Array<[string,string,string]> = [
    ['credvault',      'CredVault',      'credvault'],
    ['playbookstudio', 'PlaybookStudio', 'playbookstudio'],
    ['reportforge',    'ReportForge',    'reportforge'],
    ['terminallink',   'TerminalLink',   'terminallink'],
    ['networkmap',     'NetworkMap',     'networkmap'],
  ];
  for (const [key, label, appKey] of newApps) {
    if (!p[key]?.execPath && c[key]?.execPath) {
      notify(`${label} connected to launcher`, '', () => launchApp(appKey));
      addActivityEntry({ type: 'launcher', text: `${label} registered with launcher` });
    }
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
    const options = {
      hostname: 'api.github.com',
      path    : '/repos/ItsEliias/CyberOS/releases/latest',
      headers : { 'User-Agent': 'CyberOS-Launcher' }
    };
    const req = https.get(options, res => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        try {
          const release      = JSON.parse(data);
          const latestVersion = release.tag_name?.replace(/^v/, '') ?? '';
          if (latestVersion && isNewerVersion(latestVersion, APP_VERSION)) {
            const payload = {
              version: latestVersion,
              url    : release.html_url || '',
              current: APP_VERSION,
              latest : latestVersion,
              notes  : release.body?.slice(0, 300) ?? ''
            };
            panelWindow?.webContents.send('update:available', payload);
            panelWindow?.webContents.send('update-available',  payload);
          }
        } catch (_) {}
      });
    });
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

// ─── App Manager ──────────────────────────────────────────────────────────────

interface AppStatus {
  id: string;
  name: string;
  description: string;
  dir: string;
  installed: boolean;
  built: boolean;
  hasNodeModules: boolean;
}

const APP_MANAGER_APPS: Array<{ id: string; description: string }> = [
  { id: 'CredVault',         description: 'Encrypted credential & secret storage' },
  { id: 'VaultCore',         description: 'Core vault management & key derivation' },
  { id: 'GhostVault',        description: 'Stealth file vault with plausible deniability' },
  { id: 'SignalBoard',       description: 'Real-time signal monitoring & alerts' },
  { id: 'NetworkMap',        description: 'Network topology visualization' },
  { id: 'PlaybookStudio',    description: 'Security playbook builder & runner' },
  { id: 'TerminalLink',      description: 'Persistent terminal sessions & multiplexer' },
  { id: 'NetLab',            description: 'Network lab environment manager' },
  { id: 'ReconDesk',         description: 'Recon workflow & OSINT aggregator' },
  { id: 'ReportForge',       description: 'Security report generation' },
  { id: 'Cyberlab Companion', description: 'HTB / CTF lab companion & flag tracker' },
];

const CYBERTOOLS_BASE = path.join(
  os.homedir(), 'Documents', 'Claude', 'Projects', 'CyberOS'
);

function getAppDir(id: string): string {
  return path.join(CYBERTOOLS_BASE, id);
}

function readProductName(dir: string, id: string): string {
  try {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) return id;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
    return (pkg.build as Record<string, unknown>)?.productName as string
      || pkg.productName as string
      || id;
  } catch { return id; }
}

function findBuiltApp(dir: string): boolean {
  for (const sub of ['dist', 'release']) {
    const base = path.join(dir, sub);
    if (!fs.existsSync(base)) continue;
    const found = findAppBundle(base, 3);
    if (found) return true;
  }
  return false;
}

function findAppBundle(dir: string, depth: number): string | null {
  if (depth < 0) return null;
  try {
    const entries = fs.readdirSync(dir);
    // Prefer arm64 over x64 — sort so mac-arm64 comes before mac
    entries.sort((a, b) => {
      const aArm = a.includes('arm64') ? -1 : 0;
      const bArm = b.includes('arm64') ? -1 : 0;
      return aArm - bArm;
    });
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (entry.endsWith('.app')) return full;
      try {
        if (fs.statSync(full).isDirectory()) {
          const found = findAppBundle(full, depth - 1);
          if (found) return found;
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return null;
}

function getAppStatuses(): AppStatus[] {
  return APP_MANAGER_APPS.map(({ id, description }) => {
    const dir         = getAppDir(id);
    const productName = readProductName(dir, id);
    const installed   = fs.existsSync(`/Applications/${productName}.app`);
    const built       = findBuiltApp(dir);
    const hasNodeModules = fs.existsSync(path.join(dir, 'node_modules'));
    return { id, name: productName, description, dir, installed, built, hasNodeModules };
  });
}

function spawnAsync(
  cmd: string,
  args: string[],
  cwd: string,
  onStdout?: (line: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout?.on('data', (d: Buffer) => onStdout?.(d.toString().trim()));
    child.stderr?.on('data', (d: Buffer) => onStdout?.(d.toString().trim()));
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
    child.on('error', reject);
  });
}

function detectBuildScript(dir: string): string {
  try {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) return 'build:mac';
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
    const scripts = (pkg.scripts || {}) as Record<string, unknown>;
    if (scripts['build:mac'])   return 'build:mac';
    if (scripts['package:mac']) return 'package:mac';
    return 'build';
  } catch { return 'build:mac'; }
}

function setupAppManagerIPC(): void {
  ipcMain.handle('app-manager:get-status', () => getAppStatuses());

  ipcMain.handle('app-manager:install', async (event, { id }: { id: string }) => {
    const entry = APP_MANAGER_APPS.find(a => a.id === id);
    if (!entry) return { success: false, error: 'Unknown app' };

    const dir         = getAppDir(id);
    const productName = readProductName(dir, id);
    const send        = (msg: string) => event.sender.send('app-manager:progress', { id, message: msg });

    try {
      // Fast path: if a fresh bundle already exists in dist/ or release/, just
      // copy it. Avoids a full rebuild when the user has already run a build
      // and the "Install →/Apps" button is just for the copy step.
      const existing = findAppBundle(path.join(dir, 'dist'), 4)
        ?? findAppBundle(path.join(dir, 'release'), 4);
      // Only fast-path an arm64 bundle on Apple Silicon. An x86_64 bundle
      // would otherwise be installed on an arm64 user and silently run
      // through Rosetta (slow, and breaks native deps like node-pty).
      const looksArm64 = !!existing && /\b(mac-arm64|arm64)\b/i.test(existing);
      if (existing && (process.arch !== 'arm64' || looksArm64)) {
        send(`Copying existing ${path.basename(existing)} to /Applications/...`);
        await spawnAsync('cp', ['-R', existing, `/Applications/${productName}.app`], '/', send);
        send('Installed successfully.');
        return { success: true };
      }
      if (existing && process.arch === 'arm64' && !looksArm64) {
        send('Existing bundle is not arm64 — rebuilding for native performance.');
      }

      if (!fs.existsSync(path.join(dir, 'node_modules'))) {
        send('Installing dependencies...');
        await spawnAsync('npm', ['install'], dir, (l) => send(l.slice(0, 120)));
      }

      send('Building app bundle (arm64)...');
      const buildScript = detectBuildScript(dir);
      await spawnAsync('npm', ['run', buildScript, '--', '--arm64'], dir, (l) => send(l.slice(0, 120)));

      const appBundle = findAppBundle(path.join(dir, 'dist'), 4)
        ?? findAppBundle(path.join(dir, 'release'), 4);
      if (!appBundle) return { success: false, error: 'Build succeeded but no .app bundle found' };

      send(`Copying ${path.basename(appBundle)} to /Applications/...`);
      await spawnAsync('cp', ['-R', appBundle, `/Applications/${productName}.app`], '/', send);

      send('Installed successfully.');
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('app-manager:uninstall', async (_e, { productName }: { id: string; productName: string }) => {
    try {
      const target = `/Applications/${productName}.app`;
      if (fs.existsSync(target)) {
        await spawnAsync('rm', ['-rf', target], '/');
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('app-manager:open', async (_e, { productName }: { productName: string }) => {
    // Cross-platform via launchPeerApp: /Applications/X.app on macOS,
    // %LOCALAPPDATA%\Programs\X\X.exe on Windows, /usr/local/bin/x on Linux.
    if (typeof productName !== 'string' || !productName) {
      return { success: false, error: 'Invalid productName' };
    }
    const ok = launchPeerApp(productName);
    if (!ok) return { success: false, error: `${productName} is not installed` };
    return { success: true };
  });
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

function setupIPC(): void {
  ipcMain.handle('get-config', () => readConfig());

  // Block any update whose key is __proto__ / constructor / prototype to
  // foreclose prototype-pollution via the IPC boundary. The renderer
  // never legitimately writes any of these into the shared config.
  function isUnsafeKey(k: string): boolean {
    return k === '__proto__' || k === 'constructor' || k === 'prototype';
  }
  function stripUnsafe<T extends Record<string, unknown>>(o: T): T {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (isUnsafeKey(k)) continue;
      out[k] = v;
    }
    return out as T;
  }

  ipcMain.handle('save-config', (_e, updates: unknown) => {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return false;
    const safe = stripUnsafe(updates as Record<string, unknown>);
    return updateConfig(cfg => ({ ...cfg, ...safe }));
  });

  ipcMain.handle('save-config-deep', (_e, updates: unknown) => {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return false;
    const safe = stripUnsafe(updates as Record<string, unknown>);
    return updateConfig(cfg => {
      const out = { ...cfg };
      for (const [k, v] of Object.entries(safe)) {
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          (out as Record<string, unknown>)[k] = { ...((out as Record<string, unknown>)[k] as object || {}), ...stripUnsafe(v as Record<string, unknown>) };
        } else {
          (out as Record<string, unknown>)[k] = v;
        }
      }
      return out;
    });
  });

  ipcMain.handle('launch-app',     (_e, appKey: string)  => launchApp(appKey));
  ipcMain.handle('update-now',     () => {
    // Mirrors the tray-menu path: use the pending-actions queue so VaultCore
    // actually receives the request.
    writePendingAction('vaultscraper', 'run-all-scrapes');
    launchApp('vaultscraper');
    addActivityEntry({ type: 'launcher', text: 'VaultCore update triggered' });
    return true;
  });
  ipcMain.handle('get-vpn-status', () => vpnStatus);
  ipcMain.handle('hide-panel',     () => { hidePanel(); return true; });
  ipcMain.on('hide-after-splash',  () => hidePanel());

  ipcMain.handle('backup-snapshot', async (_e, password?: string) => {
    return await runBackupSnapshot(password);
  });

  ipcMain.handle('lock-ecosystem', () => { lockEcosystemSession(); return true; });

  ipcMain.handle('get-sso', () => readSSOState());

  ipcMain.handle('backup-import', async (_e, password?: string) => {
    return await runBackupImport(password);
  });

  ipcMain.handle('backup-save-password', (_e, password: string) => {
    return saveBackupPassword(password);
  });

  ipcMain.handle('backup-has-saved-password', () => {
    return fs.existsSync(savedBackupPasswordPath());
  });

  ipcMain.handle('backup-clear-password', () => {
    clearBackupPassword();
    return true;
  });

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

  // Reject malformed custom-slot payloads at the boundary so a renderer
  // bug can't insert garbage that breaks the tray-menu / app-grid render.
  function isValidSlot(s: unknown): s is { name: string; execPath: string; icon?: string } {
    if (!s || typeof s !== 'object') return false;
    const o = s as Record<string, unknown>;
    return typeof o.name === 'string' && o.name.length > 0 && o.name.length < 100
        && typeof o.execPath === 'string' && o.execPath.length > 0 && o.execPath.length < 2048;
  }

  ipcMain.handle('add-custom-slot', (_e, slot: unknown) => {
    if (!isValidSlot(slot)) return false;
    return updateConfig(cfg => {
      const slots = cfg.launcher.customSlots || [];
      if (slots.length >= 4) return cfg;
      cfg.launcher.customSlots = [...slots, slot];
      return cfg;
    });
  });

  ipcMain.handle('remove-custom-slot', (_e, index: unknown) => {
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) return false;
    return updateConfig(cfg => {
      const slots = [...(cfg.launcher.customSlots || [])];
      if (index >= slots.length) return cfg;
      slots.splice(index, 1);
      cfg.launcher.customSlots = slots;
      return cfg;
    });
  });

  ipcMain.handle('update-custom-slot', (_e, payload: unknown) => {
    if (!payload || typeof payload !== 'object') return false;
    const { index, slot } = payload as { index?: unknown; slot?: unknown };
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) return false;
    if (!isValidSlot(slot)) return false;
    return updateConfig(cfg => {
      const slots = [...(cfg.launcher.customSlots || [])];
      if (index >= slots.length) return cfg;
      slots[index] = slot;
      cfg.launcher.customSlots = slots;
      return cfg;
    });
  });

  ipcMain.handle('open-external', (_e, url: unknown) => {
    // Tightened from "open anything" — a compromised renderer could open
    // `javascript:`, `file:///etc/passwd`, or any custom URI handler.
    if (typeof url !== 'string' || !url) return false;
    try {
      const proto = new URL(url).protocol;
      if (proto !== 'http:' && proto !== 'https:' && proto !== 'mailto:') return false;
    } catch { return false; }
    shell.openExternal(url);
    return true;
  });
  ipcMain.handle('update:check-now', () => { checkForUpdates(); return true; });

  ipcMain.handle('ecosystem-read-events', () => ecosystemBus.readEvents());
  ipcMain.handle('ecosystem-emit', (_e, appName: unknown, eventType: unknown, data: unknown) => {
    // Validate at the IPC boundary so a renderer bug can't shovel garbage
    // into the bus file (every CyberOS app reads this) or DoS it via a 100 MB
    // data blob. Short hand-typed strings; small JSON payloads.
    if (typeof appName !== 'string' || !appName || appName.length > 80)   return false;
    if (typeof eventType !== 'string' || !eventType || eventType.length > 120) return false;
    if (data !== undefined && (typeof data !== 'object' || data === null)) return false;
    if (data !== undefined) {
      const size = JSON.stringify(data).length;
      if (size > 64 * 1024) return false;  // 64 KB hard cap per event payload
    }
    ecosystemBus.emitEvent(appName, eventType, (data ?? {}) as Record<string, unknown>);
    return true;
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

// ─── Crash reporter (locally-stored minidumps; nothing uploaded) ─────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
try { require('electron').crashReporter.start({ uploadToServer: false, productName: "CybertoolsLauncher", companyName: 'CyberOS' }) } catch { /* unavailable */ }

app.whenReady().then(() => {
  const PROJECT_BASE  = path.join(os.homedir(), 'Documents', 'Claude', 'Projects');
  const CYBER_APPS    = path.join(PROJECT_BASE, 'Cyber Apps');
  const AUTO_DETECT = [
    { key: 'cyberlab',       base: CYBER_APPS, dir: 'Cyberlab Compaion' },
    { key: 'vaultscraper',  base: CYBER_APPS, dir: 'VaultCore' },
    { key: 'ghostvault',    base: CYBER_APPS, dir: 'GhostVault' },
    { key: 'recondesk',     base: CYBER_APPS, dir: 'ReconDesk' },
    { key: 'signalboard',   base: CYBER_APPS, dir: 'SignalBoard' },
    { key: 'cyberos',       base: CYBER_APPS, dir: 'CyberOS Dashboard' },
    { key: 'credvault',     base: CYBER_APPS, dir: 'CredVault' },
    { key: 'playbookstudio',base: CYBER_APPS, dir: 'PlaybookStudio' },
    { key: 'reportforge',   base: CYBER_APPS, dir: 'ReportForge' },
    { key: 'terminallink',  base: CYBER_APPS, dir: 'TerminalLink' },
    { key: 'networkmap',    base: CYBER_APPS, dir: 'NetworkMap' },
  ];
  try {
    const cfg = readConfig();
    let changed = false;
    for (const { key, base, dir } of AUTO_DETECT) {
      const appCfg = (cfg as Record<string, unknown>)[key] as { execPath?: string } | undefined;
      if (appCfg && (!appCfg.execPath || !fs.existsSync(appCfg.execPath))) {
        const detected = path.join(base, dir);
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
  createSearchWindow();
  setupIPC();
  setupSearchIPC();
  setupAppManagerIPC();

  globalShortcut.register('CommandOrControl+Shift+F', () => showSearchWindow());

  // ⌘K — global command palette: show the panel if hidden, then ask the
  // renderer to open the palette. Toggles closed if already open in the panel.
  globalShortcut.register('CommandOrControl+K', () => {
    if (!isPanelVisible) showPanel(tray!.getBounds());
    setTimeout(() => {
      if (panelWindow && !panelWindow.isDestroyed()) {
        panelWindow.webContents.send('command-palette:toggle');
      }
    }, 80);
  });

  configPollTimer = setInterval(pollConfig, 5000);
  pollConfig();

  startVpnCheck();

  ecosystemBus.emitEvent('Launcher', 'launcher.opened', {});

  startBackupScheduler();

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

  setTimeout(checkForUpdates, 3000);
});

app.on('window-all-closed', e => e.preventDefault());

app.on('before-quit', () => {
  if (configPollTimer) clearInterval(configPollTimer);
  if (vpnCheckTimer)   clearInterval(vpnCheckTimer);
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (process.platform === 'darwin') app.dock.hide();
});
