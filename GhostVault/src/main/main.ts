import {
  app, BrowserWindow, ipcMain, shell, dialog, globalShortcut
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import * as ecosystemBus from './ecosystem-bus.js';
import { registerExtras, DEFAULT_CAPTURE_HOTKEY } from './ipc-extras.js';
import { consumePendingAction, installPendingActionWatcher } from './pendingActions.js'
import type { GhostVaultConfig, NoteFile, NewNoteResult, SaveCaptureResult } from '../shared/types.js';

const APP_KEY = 'ghostvault';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Constants ────────────────────────────────────────────────────────────────
const APP_VERSION       = '1.0.0';
const CONFIG_PATH       = path.join(os.homedir(), 'ghostvault-config.json');
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json');
const DATA_DIR          = path.join(os.homedir(), '.ghostvault');
const VAULT_FOLDERS     = ['Notes', 'Meetings', 'Projects', 'Study', 'Tasks', 'Archive'];

let mainWindow:    BrowserWindow | null = null;
let captureWindow: BrowserWindow | null = null;
let statusInterval: ReturnType<typeof setInterval> | null = null;
let lastCaptureTime: string | null = null;
let vaultNoteCount = 0;

// ─── Dirs ─────────────────────────────────────────────────────────────────────
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Shared status writer ─────────────────────────────────────────────────────
// Atomic write to the shared cybertools-config.json. Every sibling app polls
// this file every few seconds; a torn read (mid-write JSON.parse failing or
// returning {}) would silently clobber state across the whole CyberOS suite.
function writeCyberToolsConfigAtomic(shared: Record<string, unknown>): void {
  const json = JSON.stringify(shared, null, 2);
  const tmp  = `${CYBERTOOLS_CONFIG}.tmp-${process.pid}-${Date.now()}`;
  const fd   = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, json, 0, 'utf8');
    try { fs.fsyncSync(fd); } catch { /* fsync best-effort */ }
  } finally {
    try { fs.closeSync(fd); } catch { /* already closed */ }
  }
  fs.renameSync(tmp, CYBERTOOLS_CONFIG);
}

function writeGhostVaultStatus() {
  try {
    let shared: Record<string, unknown> = {};
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')); } catch (_) {}
    }
    shared.ghostvault_status = {
      active      : true,
      lastActive  : new Date().toISOString(),
      lastCapture : lastCaptureTime,
      noteCount   : vaultNoteCount
    };
    writeCyberToolsConfigAtomic(shared);
  } catch (e) {
    console.warn('[GhostVault] status write failed:', (e as Error).message);
  }
}

function startStatusWriter() {
  writeGhostVaultStatus();
  statusInterval = setInterval(writeGhostVaultStatus, 15000);
}

function stopStatusWriter() {
  if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }
  try {
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      const shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'));
      if (shared.ghostvault_status) shared.ghostvault_status.active = false;
      writeCyberToolsConfigAtomic(shared);
    }
  } catch (_) {}
}

function refreshVaultNoteCount(vaultPath: string) {
  if (!vaultPath) { vaultNoteCount = 0; return; }
  let count = 0;
  function walk(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        if (e.isDirectory()) walk(path.join(dir, e.name));
        else if (e.name.endsWith('.md')) count++;
      }
    } catch (_) {}
  }
  walk(vaultPath);
  vaultNoteCount = count;
}

// ─── Config ───────────────────────────────────────────────────────────────────
function loadConfig(): GhostVaultConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (_) {}
  return {};
}

function saveConfig(cfg: Partial<GhostVaultConfig>): boolean {
  try {
    let existing: GhostVaultConfig = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try { existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch (_) {}
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, ...cfg }, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('saveConfig:', (e as Error).message);
    return false;
  }
}


// ─── Vault helpers ────────────────────────────────────────────────────────────
function ensureVaultFolders(vaultPath: string) {
  const cfg = loadConfig();
  if (cfg.useExistingStructure) return;
  VAULT_FOLDERS.forEach(f => {
    const p = path.join(vaultPath, f);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });
}

function parseNoteTags(content: string): string[] {
  const tags: string[] = [];
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const inlineMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m);
    if (inlineMatch) {
      inlineMatch[1].split(',').forEach(t => {
        const tag = t.trim().replace(/['"]/g, '');
        if (tag) tags.push(tag.startsWith('#') ? tag.slice(1) : tag);
      });
    }
    const blockMatches = fm.matchAll(/^  - (.+)$/gm);
    for (const m of blockMatches) {
      const tag = m[1].trim().replace(/['"]/g, '');
      if (tag) tags.push(tag.startsWith('#') ? tag.slice(1) : tag);
    }
  }
  const inlineTags = content.match(/(?<!\w)#([\w-]+)/g) || [];
  inlineTags.forEach(t => tags.push(t.slice(1)));
  return [...new Set(tags)];
}

function listVaultNotes(vaultPath: string): NoteFile[] {
  const results: NoteFile[] = [];
  function walk(dir: string, relBase: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      const rel  = relBase ? `${relBase}/${e.name}` : e.name;
      if (e.isDirectory()) {
        walk(full, rel);
      } else if (e.name.endsWith('.md')) {
        const stat = fs.statSync(full);
        let tags: string[] = [];
        let firstLine = '';
        let wordCount = 0;
        try {
          const content = fs.readFileSync(full, 'utf8');
          tags = parseNoteTags(content);
          const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
          firstLine = lines[0]?.trim().slice(0, 100) || '';
          wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
        } catch (_) {}
        results.push({
          name      : e.name.replace('.md', ''),
          filename  : e.name,
          path      : full,
          rel,
          folder    : relBase || '/',
          mtime     : stat.mtimeMs,
          size      : stat.size,
          tags,
          firstLine,
          wordCount
        });
      }
    }
  }
  walk(vaultPath, '');
  return results.sort((a, b) => b.mtime - a.mtime);
}

// ─── Path confinement ────────────────────────────────────────────────────────
// Validates a candidate vaultPath supplied via save-config. Must be an
// absolute path strictly under the user's home directory — rejects empties,
// relative paths, /etc, /private, /, /var, /tmp, /System, /Library, etc.
// We allow setting the vault directly to $HOME but not to any system root.
function isSafeVaultPath(p: unknown): boolean {
  // Undefined / null is allowed (caller may want to unset).
  if (p === undefined || p === null || p === '') return true;
  if (typeof p !== 'string') return false;
  try {
    const resolved = path.resolve(p);
    const home     = path.resolve(os.homedir());
    if (!path.isAbsolute(resolved)) return false;
    // Reject obvious system roots even if they happen to be under $HOME
    // (unlikely, but cheap to check first).
    const denyPrefixes = ['/etc', '/private', '/var', '/tmp', '/usr', '/bin', '/sbin', '/System', '/Library'];
    for (const deny of denyPrefixes) {
      if (resolved === deny || resolved.startsWith(deny + path.sep)) return false;
    }
    if (resolved === '/') return false;
    // Require the candidate to be at or under the user's home directory.
    const homePrefix = home.endsWith(path.sep) ? home : home + path.sep;
    return resolved === home || resolved.startsWith(homePrefix);
  } catch {
    return false;
  }
}

// Renderer-supplied paths must resolve inside the configured vault root.
// Otherwise a compromised renderer can read SSH keys or overwrite shell rc
// files via the note IPCs. Symlinks inside the vault are deliberately not
// resolved — the user opted into them by placing them in the vault.
function isUnderVault(filePath: string): boolean {
  if (typeof filePath !== 'string' || !filePath) return false;
  const vault = loadConfig().vaultPath;
  if (!vault || typeof vault !== 'string') return false;
  try {
    const resolvedVault = path.resolve(vault);
    const resolvedFile  = path.resolve(filePath);
    if (resolvedFile === resolvedVault) return true;
    const prefix = resolvedVault.endsWith(path.sep) ? resolvedVault : resolvedVault + path.sep;
    return resolvedFile.startsWith(prefix);
  } catch {
    return false;
  }
}

const readNote  = (filePath: string): string => {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
};

function writeNote(filePath: string, content: string): boolean {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, filePath);
    return true;
  } catch (e) { console.error('writeNote:', (e as Error).message); return false; }
}

const deleteNote = (filePath: string): boolean => {
  try { fs.unlinkSync(filePath); return true; } catch { return false; }
};

function renameNote(oldPath: string, newPath: string): boolean {
  try {
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(oldPath, newPath);
    return true;
  } catch { return false; }
}

// ─── Capture window ───────────────────────────────────────────────────────────
const preloadPath = path.join(__dirname, '..', 'preload', 'preload.cjs');

function createCaptureWindow() {
  captureWindow = new BrowserWindow({
    width: 480, height: 400, minWidth: 480, minHeight: 400,
    show: false, frame: false, transparent: true,
    alwaysOnTop: true, skipTaskbar: true, resizable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: true
    }
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    captureWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/capture.html`);
  } else {
    captureWindow.loadFile(path.join(__dirname, '..', 'renderer', 'capture.html'));
  }

  captureWindow.on('close', (e) => {
    e.preventDefault();
    captureWindow?.hide();
  });

  captureWindow.once('ready-to-show', () => sendCaptureFolders());
}

function sendCaptureFolders() {
  if (!captureWindow) return;
  const cfg = loadConfig();
  if (!cfg.vaultPath) return;
  try {
    const entries = fs.readdirSync(cfg.vaultPath, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name);
    captureWindow.webContents.send('capture-folders', folders.length ? folders : ['Notes']);
  } catch { captureWindow.webContents.send('capture-folders', ['Notes']); }
}

function toggleCaptureWindow() {
  if (!captureWindow) createCaptureWindow();
  if (captureWindow!.isVisible()) {
    captureWindow!.hide();
  } else {
    sendCaptureFolders();
    captureWindow!.show();
    captureWindow!.setAlwaysOnTop(true, 'floating');
    captureWindow!.focus();
  }
}

// ─── Global capture hotkey ────────────────────────────────────────────────────
function registerCaptureHotkey() {
  const cfg = loadConfig();
  const key = cfg.captureHotkey || DEFAULT_CAPTURE_HOTKEY;
  try {
    globalShortcut.register(key, () => {
      if (!captureWindow) createCaptureWindow();
      if (captureWindow!.isVisible()) {
        captureWindow!.focus();
      } else {
        sendCaptureFolders();
        captureWindow!.show();
        captureWindow!.setAlwaysOnTop(true, 'floating');
        captureWindow!.focus();
      }
    });
  } catch (e) {
    console.warn('[GhostVault] Capture hotkey registration failed for', key, ':', (e as Error).message);
  }
}

// ─── Main window ──────────────────────────────────────────────────────────────
function createWindow() {
  const cfg = loadConfig();
  mainWindow = new BrowserWindow({
    width: cfg.windowWidth || 1400, height: cfg.windowHeight || 900,
    x: cfg.windowX, y: cfg.windowY,
    minWidth: 900, minHeight: 600, show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d0d1a',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: true
    }
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
    if (cfg.alwaysOnTop) mainWindow!.setAlwaysOnTop(true, 'floating');
  });

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

  mainWindow.on('close', () => {
    const [w, h] = mainWindow!.getSize();
    const [x, y] = mainWindow!.getPosition();
    saveConfig({ windowWidth: w, windowHeight: h, windowX: x, windowY: y });
    if (captureWindow) {
      captureWindow.removeAllListeners('close');
      captureWindow.destroy();
      captureWindow = null;
    }
  });

  try {
    globalShortcut.register('CommandOrControl+N', () => toggleCaptureWindow());
  } catch (e) { console.warn('Shortcut registration (Ctrl+N):', (e as Error).message); }

  registerCaptureHotkey();
}


// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  ensureDirs();
  const cfg = loadConfig();
  if (cfg.vaultPath) setTimeout(() => refreshVaultNoteCount(cfg.vaultPath!), 500);
  createWindow();
  startStatusWriter();
  registerExtras({
    loadConfig,
    saveConfig,
    cybertoolsConfigPath: CYBERTOOLS_CONFIG,
    getCaptureWindow: () => captureWindow,
    createCaptureWindow,
    sendCaptureFolders,
  });
  ecosystemBus.emitEvent('GhostVault', 'ghostvault.app.opened', {});
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('before-quit', () => stopStatusWriter());
app.on('will-quit', () => { globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => {
  app.quit();
});

// ─── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.handle('get-config',  ()        => loadConfig());
ipcMain.handle('save-config', (_, c: Partial<GhostVaultConfig>) => {
  // Reject patches that try to point the vault at a system directory.
  // Without this, a compromised renderer could set vaultPath=/etc/ and
  // every subsequent write-note would persist under /etc.
  if (c && Object.prototype.hasOwnProperty.call(c, 'vaultPath')) {
    if (!isSafeVaultPath(c.vaultPath)) {
      console.warn('[GhostVault] save-config rejected: unsafe vaultPath');
      return false;
    }
  }
  const result = saveConfig(c);
  // Push theme changes to the capture window so it stays in sync
  if (c.theme && captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.webContents.send('theme-change', c.theme);
  }
  return result;
});
ipcMain.handle('get-version', ()        => APP_VERSION);

// ─── SSO state (read from shared cybertools-config.json) ─────────────────────
// Returns the CredVault SSO state so the renderer can soft-lock when the
// user has opted into "Require CredVault session".
ipcMain.handle('get-sso', () => {
  try {
    const cfgPath = path.join(os.homedir(), 'cybertools-config.json');
    if (!fs.existsSync(cfgPath)) return { unlocked: false };
    const shared = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {};
    const sso = shared.sso as { unlocked?: boolean; expiresAt?: string | null; unlockedAt?: string | null; token?: string | null } | undefined;
    if (!sso?.unlocked) return { unlocked: false };
    if (sso.expiresAt && new Date(sso.expiresAt).getTime() < Date.now()) return { unlocked: false };
    return { unlocked: true, unlockedAt: sso.unlockedAt, expiresAt: sso.expiresAt };
  } catch { return { unlocked: false }; }
});

// Cross-app: open CredVault from the lock screen.
ipcMain.handle('open-credvault', () => {
  try {
    const target = '/Applications/CredVault.app';
    if (!fs.existsSync(target)) return false;
    const { spawn } = require('child_process') as typeof import('child_process');
    spawn('open', [target], { detached: true, stdio: 'ignore' }).unref();
    return true;
  } catch { return false; }
});

ipcMain.handle('ecosystem-emit', (_, appName: string, eventType: string, data: Record<string, unknown>) => {
  ecosystemBus.emitEvent(appName, eventType, data);
  return true;
});

ipcMain.handle('set-always-on-top', (_, v: boolean) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(v, 'floating');
    saveConfig({ alwaysOnTop: v });
    mainWindow.webContents.send('aot-change', v);
    return true;
  }
  return false;
});
ipcMain.handle('get-always-on-top', () => mainWindow?.isAlwaysOnTop() ?? false);

ipcMain.handle('minimize-window', () => { mainWindow?.minimize(); });
ipcMain.handle('close-window',    () => { mainWindow?.close(); });

// Returns true only when the supplied path matches the configured vault.
// Used as the gate for IPCs that walk a directory tree — without this a
// renderer could enumerate the entire filesystem by passing '/'.
function isConfiguredVault(vp: unknown): boolean {
  if (typeof vp !== 'string' || !vp) return false;
  const cfg = loadConfig();
  if (!cfg.vaultPath) return false;
  try {
    return path.resolve(vp) === path.resolve(cfg.vaultPath);
  } catch { return false; }
}

ipcMain.handle('load-vault', (_, vaultPath: string) => {
  if (!isConfiguredVault(vaultPath)) return { notes: [], folders: VAULT_FOLDERS };
  const notes   = listVaultNotes(vaultPath);
  const folders: string[] = fs.existsSync(vaultPath)
    ? fs.readdirSync(vaultPath, { withFileTypes: true })
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(e => e.name)
    : VAULT_FOLDERS;
  return { notes, folders };
});

ipcMain.handle('list-notes',  (_, vaultPath: string) => {
  if (!isConfiguredVault(vaultPath)) return [];
  return listVaultNotes(vaultPath);
});
ipcMain.handle('read-note',   (_, filePath: string)  => {
  if (!isUnderVault(filePath)) return '';
  return readNote(filePath);
});
ipcMain.handle('write-note',  (_, filePath: string, content: string) => {
  if (!isUnderVault(filePath)) return false;
  const result = writeNote(filePath, content);
  lastCaptureTime = new Date().toISOString();
  writeGhostVaultStatus();
  return result;
});
ipcMain.handle('delete-note', (_, filePath: string) => {
  if (!isUnderVault(filePath)) return false;
  const r = deleteNote(filePath);
  vaultNoteCount = Math.max(0, vaultNoteCount - 1);
  writeGhostVaultStatus();
  return r;
});
ipcMain.handle('rename-note', (_, oldPath: string, newPath: string) => {
  if (!isUnderVault(oldPath) || !isUnderVault(newPath)) return false;
  return renameNote(oldPath, newPath);
});

ipcMain.handle('new-note', async (_, vaultPath: string, folder: string, title: string): Promise<NewNoteResult> => {
  const safeName  = title.replace(/[/\\?%*:|"<>]/g, '-') || 'Untitled';
  const filePath  = path.join(vaultPath, folder, `${safeName}.md`);
  // Defence-in-depth — both vaultPath and folder come from the renderer.
  // isUnderVault re-resolves against the SAVED config, so even if the
  // renderer passes a poisoned vaultPath we still write under the real one.
  if (!isUnderVault(filePath)) {
    return { path: '', name: safeName, folder, content: '' };
  }
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const content   = `# ${title}\n\n*Created: ${timestamp}*\n\n---\n\n`;
  writeNote(filePath, content);
  lastCaptureTime = new Date().toISOString();
  vaultNoteCount++;
  writeGhostVaultStatus();
  return { path: filePath, name: safeName, folder, content };
});

ipcMain.handle('create-folder', async (_, vaultPath: string, folderName: string) => {
  const target = path.join(vaultPath, folderName);
  if (!isUnderVault(target)) return false;
  try { fs.mkdirSync(target, { recursive: true }); return true; }
  catch { return false; }
});

ipcMain.handle('list-folders', (_, vaultPath: string): string[] => {
  if (!isConfiguredVault(vaultPath)) return VAULT_FOLDERS;
  if (!fs.existsSync(vaultPath)) return VAULT_FOLDERS;
  try {
    return fs.readdirSync(vaultPath, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);
  } catch { return VAULT_FOLDERS; }
});

ipcMain.handle('reveal-in-finder', (_, p: string) => {
  if (!isUnderVault(p)) return;
  if (p && fs.existsSync(p)) shell.showItemInFolder(p);
});
ipcMain.handle('open-external', (_, url: string) => {
  // shell.openExternal will happily hand any URL scheme to the OS — `file://`
  // opens local files, custom schemes can launch handler apps with attacker-
  // controlled args. Restrict to the three schemes a notes app legitimately
  // needs and drop everything else on the floor.
  if (typeof url !== 'string' || !url) return;
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.toLowerCase();
    if (scheme !== 'http:' && scheme !== 'https:' && scheme !== 'mailto:') {
      console.warn('[GhostVault] open-external rejected:', scheme);
      return;
    }
    shell.openExternal(url);
  } catch {
    // Malformed URL — silently drop.
  }
});

ipcMain.handle('pick-vault-dir', async (_, opts: { skipFolderCreate?: boolean } = {}) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select Vault Directory', properties: ['openDirectory', 'createDirectory']
  });
  if (!result.canceled && result.filePaths[0]) {
    const vaultPath = result.filePaths[0];
    // Same validation as save-config — a user could otherwise pick /etc/
    // through the dialog and we'd happily create note folders there.
    if (!isSafeVaultPath(vaultPath)) {
      try {
        dialog.showMessageBox(mainWindow!, {
          type: 'warning',
          title: 'Invalid vault location',
          message: `"${vaultPath}" is outside your home directory.`,
          detail: 'Pick a folder inside ~/Documents, ~/Library, or another path under your home.',
        });
      } catch { /* dialog optional */ }
      return null;
    }
    const cfg = loadConfig();
    if (!cfg.useExistingStructure && !opts.skipFolderCreate) ensureVaultFolders(vaultPath);
    saveConfig({ vaultPath });
    setTimeout(() => { refreshVaultNoteCount(vaultPath); writeGhostVaultStatus(); }, 300);
    return vaultPath;
  }
  return null;
});

ipcMain.handle('toggle-capture',    () => toggleCaptureWindow());
ipcMain.handle('hide-capture',      () => { captureWindow?.hide(); });
ipcMain.handle('minimize-capture',  () => { captureWindow?.minimize(); });

ipcMain.handle('save-capture-note', async (_, { folder, title, text }: { folder: string; title?: string; text: string }): Promise<SaveCaptureResult> => {
  try {
    const cfg = loadConfig();
    if (!cfg.vaultPath) return { ok: false, error: 'No vault configured' };
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const safeName  = (title || `Quick Note ${timestamp}`).replace(/[/\\?%*:|"<>]/g, '-');
    const content   = `# ${safeName}\n\n*Captured: ${timestamp}*\n\n---\n\n${text}\n`;
    const filePath  = path.join(cfg.vaultPath, folder || 'Notes', `${safeName}.md`);
    // Folder is renderer-controlled — reject "../../../tmp/evil" patterns
    // that would escape the vault even though vaultPath itself is trusted.
    if (!isUnderVault(filePath)) {
      return { ok: false, error: 'folder escapes vault' };
    }
    writeNote(filePath, content);
    lastCaptureTime = new Date().toISOString();
    vaultNoteCount++;
    writeGhostVaultStatus();
    if (mainWindow) mainWindow.webContents.send('vault-refresh');
    return { ok: true, path: filePath, name: safeName };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
});

ipcMain.handle('get-capture-theme',  () => loadConfig().captureTheme || { core: 'stealth', personality: 'neutral' });
ipcMain.handle('save-capture-theme', (_, theme) => saveConfig({ captureTheme: theme }));

ipcMain.handle('ghostvault:export-notes', (_, payload: { sessionName: string; notes: string }): boolean => {
  try {
    let shared: Record<string, unknown> = {};
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')); } catch (_) {}
    }
    shared.ghostvault_export = {
      sessionName: payload.sessionName,
      notes      : payload.notes,
      exportedAt : new Date().toISOString()
    };
    writeCyberToolsConfigAtomic(shared);
    return true;
  } catch (e) {
    console.error('[GhostVault] export-notes failed:', (e as Error).message);
    return false;
  }
});

// ─── Move note ────────────────────────────────────────────────────────────────
ipcMain.handle('move-note', (_, srcPath: string, destFolder: string): boolean => {
  // Both src and dest must live under the configured vault. Without this a
  // renderer could move a vault note out to e.g. /tmp, or pull an arbitrary
  // host file into the vault for later exfiltration through the notes UI.
  if (!isUnderVault(srcPath) || !isUnderVault(destFolder)) return false;
  try {
    const filename = path.basename(srcPath);
    const newPath  = path.join(destFolder, filename);
    if (srcPath === newPath) return true;
    fs.mkdirSync(destFolder, { recursive: true });
    fs.renameSync(srcPath, newPath);
    return true;
  } catch { return false; }
});

// ─── Note versions ────────────────────────────────────────────────────────────
function getVersionsPath(notePath: string): string {
  return notePath.replace(/\.md$/, '.versions.json');
}

ipcMain.handle('note:versions:list', (_, notePath: string): import('../shared/types.js').NoteVersion[] => {
  if (!isUnderVault(notePath)) return [];
  const vp = getVersionsPath(notePath);
  try {
    if (fs.existsSync(vp)) return JSON.parse(fs.readFileSync(vp, 'utf8'));
  } catch { /* ignore */ }
  return [];
});

ipcMain.handle('note:versions:save', (_, notePath: string, content: string): void => {
  if (!isUnderVault(notePath)) return;
  if (typeof content !== 'string') return;
  // 2 MB per version. 20 versions × 2 MB = 40 MB ceiling on .versions.json,
  // which keeps note read amplification reasonable.
  if (content.length > 2 * 1024 * 1024) return;
  const vp = getVersionsPath(notePath);
  let versions: import('../shared/types.js').NoteVersion[] = [];
  try {
    if (fs.existsSync(vp)) versions = JSON.parse(fs.readFileSync(vp, 'utf8'));
  } catch { /* ignore */ }
  if (!Array.isArray(versions)) versions = [];
  versions.push({ timestamp: Date.now(), content });
  if (versions.length > 20) versions = versions.slice(-20);
  // Atomic — versions file is read on every note open; a torn write would
  // surface as an empty version history.
  try {
    const json = JSON.stringify(versions, null, 2);
    const tmp = `${vp}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, vp);
  } catch { /* ignore */ }
});

// ─── Note encryption ──────────────────────────────────────────────────────────
const crypto = await import('crypto');

ipcMain.handle('ghostvault:note:lock', async (_, notePath: string, password: string): Promise<{ ok: boolean; error?: string }> => {
  // Path confinement matters more here than anywhere else — without it a
  // compromised renderer could pass `~/.ssh/id_rsa` and we'd encrypt the
  // user's SSH key in place with an attacker-known password. Equivalent
  // to ransomware.
  if (!isUnderVault(notePath)) return { ok: false, error: 'path outside vault' };
  try {
    const content = readNote(notePath);
    const salt    = crypto.randomBytes(16);
    const iv      = crypto.randomBytes(12);
    const key     = crypto.scryptSync(password, salt, 32);
    const cipher  = crypto.createCipheriv('aes-256-gcm', key, iv);
    let enc       = cipher.update(content, 'utf8', 'hex');
    enc          += cipher.final('hex');
    const tag     = cipher.getAuthTag().toString('hex');
    const payload = `GHOSTVAULT_ENCRYPTED_V1:${salt.toString('hex')}:${iv.toString('hex')}:${tag}:${enc}`;
    writeNote(notePath, payload);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
});

ipcMain.handle('ghostvault:note:unlock', async (_, notePath: string, password: string): Promise<{ ok: boolean; content?: string; error?: string }> => {
  if (!isUnderVault(notePath)) return { ok: false, error: 'path outside vault' };
  try {
    const raw = readNote(notePath);
    if (!raw.startsWith('GHOSTVAULT_ENCRYPTED_V1:')) return { ok: false, error: 'Not encrypted' };
    const parts = raw.slice('GHOSTVAULT_ENCRYPTED_V1:'.length).split(':');
    if (parts.length < 5) return { ok: false, error: 'Invalid format' };
    const [saltHex, ivHex, tagHex, ...encParts] = parts;
    const enc  = encParts.join(':');
    const salt = Buffer.from(saltHex, 'hex');
    const iv   = Buffer.from(ivHex, 'hex');
    const tag  = Buffer.from(tagHex, 'hex');
    const key  = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let dec = decipher.update(enc, 'hex', 'utf8');
    dec    += decipher.final('utf8');
    return { ok: true, content: dec };
  } catch { return { ok: false, error: 'Wrong password or corrupted data' }; }
});

// ─── Export as HTML ───────────────────────────────────────────────────────────
ipcMain.handle('note:export:html', async (_, html: string, noteName: string): Promise<boolean> => {
  if (typeof html !== 'string') return false;
  // Cap exported HTML at 50 MB. A note that big is almost certainly the
  // renderer trying to make us OOM via dialog.showSaveDialog stack.
  if (html.length > 50 * 1024 * 1024) return false;
  // Sanitize noteName for the default path — Electron will quote it, but
  // path separators in defaultPath have historically influenced the dialog.
  const safeName = (typeof noteName === 'string' ? noteName : 'note')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .slice(0, 128);
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Export as HTML',
    defaultPath: `${safeName}.html`,
    filters: [{ name: 'HTML', extensions: ['html'] }],
  });
  if (result.canceled || !result.filePath) return false;
  try {
    fs.writeFileSync(result.filePath, html, 'utf8');
    return true;
  } catch { return false; }
});

// ─── Export as PDF ────────────────────────────────────────────────────────────
ipcMain.handle('note:export:pdf', async (_, htmlContent: string, noteName: string): Promise<boolean> => {
  if (!mainWindow) return false;
  if (typeof htmlContent !== 'string') return false;
  // 50 MB ceiling — encodeURIComponent triples size, and BrowserWindow.loadURL
  // chokes on data: URIs much above this anyway.
  if (htmlContent.length > 50 * 1024 * 1024) return false;
  const safeName = (typeof noteName === 'string' ? noteName : 'note')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .slice(0, 128);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export as PDF',
    defaultPath: `${safeName}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return false;
  // Track the offscreen window so we can destroy it on every path (success
  // or any thrown error). Without this, a printToPDF / loadURL failure
  // leaves the BrowserWindow alive and accumulating on every retry.
  let pdfWin: BrowserWindow | null = null;
  try {
    pdfWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    const data = await pdfWin.webContents.printToPDF({ printBackground: true });
    fs.writeFileSync(result.filePath, data);
    return true;
  } catch { return false; }
  finally {
    if (pdfWin && !pdfWin.isDestroyed()) {
      try { pdfWin.destroy(); } catch { /* already gone */ }
    }
  }
});

// ─── Spec-canonical IPC aliases ───────────────────────────────────────────────
// The spec defines these channel names; we alias them to the existing handlers
// so both naming conventions work without breaking existing renderer code.

ipcMain.handle('ghostvault:vault:list', (_, vaultPath: string) => listVaultNotes(vaultPath));
ipcMain.handle('ghostvault:note:read',  (_, filePath: string)  => {
  if (!isUnderVault(filePath)) return '';
  return readNote(filePath);
});
ipcMain.handle('ghostvault:note:write', (_, filePath: string, content: string) => {
  if (!isUnderVault(filePath)) return false;
  const ok = writeNote(filePath, content);
  if (ok) { lastCaptureTime = new Date().toISOString(); writeGhostVaultStatus(); }
  return ok;
});
ipcMain.handle('ghostvault:note:delete', (_, filePath: string) => {
  if (!isUnderVault(filePath)) return false;
  const ok = deleteNote(filePath);
  if (ok) { vaultNoteCount = Math.max(0, vaultNoteCount - 1); writeGhostVaultStatus(); }
  return ok;
});
ipcMain.handle('ghostvault:note:search', async (_, vaultPath: string, query: string) => {
  // Bound the query — a multi-MB query would burn CPU on every note
  // toLowerCase + indexOf. 256 chars covers every legitimate search.
  if (typeof query !== 'string' || !query.trim() || query.length > 256) return [];
  // Require the searched vault to match the configured one — otherwise a
  // renderer could ask us to walk `/` and list every file on the system.
  if (typeof vaultPath !== 'string' || !vaultPath) return [];
  const cfg = loadConfig();
  if (!cfg.vaultPath) return [];
  if (path.resolve(vaultPath) !== path.resolve(cfg.vaultPath)) return [];
  const notes = listVaultNotes(vaultPath);
  const lower = query.toLowerCase();
  const results: { path: string; name: string; snippet: string }[] = [];
  for (const note of notes) {
    try {
      const content = fs.readFileSync(note.path, 'utf8');
      const idx = content.toLowerCase().indexOf(lower);
      if (idx !== -1 || note.name.toLowerCase().includes(lower)) {
        const start = Math.max(0, idx - 30);
        results.push({ path: note.path, name: note.name, snippet: content.slice(start, idx + lower.length + 80) });
      }
    } catch { /* skip */ }
    if (results.length >= 50) break;
  }
  return results;
});
ipcMain.handle('ghostvault:config:read', () => {
  // The full shared config is intentionally NOT returned to the renderer:
  // it contains the SSO session (CredVault unlock token + expiry), every
  // sibling app's status block, and TerminalLink's chosen shell binary.
  // A compromised renderer would otherwise have a one-shot read of the
  // whole CyberOS state. Project only the keys this renderer actually
  // needs to drive its capture / status UI.
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {};
    const raw = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) as Record<string, unknown>;
    return {
      shared_context:    raw.shared_context     ?? null,
      ghostvault_status: raw.ghostvault_status  ?? null,
    };
  } catch { return {}; }
});
ipcMain.handle('ghostvault:event:emit', (_, event: { appName: string; eventType: string; data: Record<string, unknown> }) => {
  // appName is ALWAYS overridden to 'GhostVault' — never trust the renderer
  // to identify itself when the process boundary already tells us. Bound
  // eventType + data to prevent DoS against polling sibling apps.
  if (!event || typeof event !== 'object') return false;
  const { eventType, data } = event;
  if (typeof eventType !== 'string' || eventType.length === 0 || eventType.length > 128) return false;
  if (!/^[a-zA-Z0-9_:.\-]+$/.test(eventType)) return false;
  let safeData: Record<string, unknown> = {};
  if (data !== undefined && data !== null) {
    if (typeof data !== 'object' || Array.isArray(data)) return false;
    try {
      if (JSON.stringify(data).length > 16 * 1024) return false; // 16 KB cap
    } catch { return false; }
    safeData = data;
  }
  ecosystemBus.emitEvent('GhostVault', eventType, safeData);
  return true;
});
ipcMain.handle('ghostvault:clipboard:read', () => {
  // Delegates to read-clipboard (handled in ipc-extras.ts)
  // This alias ensures spec-canonical channel is available
  const { clipboard } = require('electron');
  return clipboard.readText();
});

