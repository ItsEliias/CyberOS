import {
  app, BrowserWindow, ipcMain, shell, dialog, globalShortcut
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import * as ecosystemBus from './ecosystem-bus.js';
import { registerExtras, DEFAULT_CAPTURE_HOTKEY } from './ipc-extras.js';
import type { GhostVaultConfig, NoteFile, NewNoteResult, SaveCaptureResult } from '../shared/types.js';

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
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8');
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
      fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8');
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
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.handle('get-config',  ()        => loadConfig());
ipcMain.handle('save-config', (_, c: Partial<GhostVaultConfig>) => {
  const result = saveConfig(c);
  // Push theme changes to the capture window so it stays in sync
  if (c.theme && captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.webContents.send('theme-change', c.theme);
  }
  return result;
});
ipcMain.handle('get-version', ()        => APP_VERSION);

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

ipcMain.handle('load-vault', (_, vaultPath: string) => {
  const notes   = listVaultNotes(vaultPath);
  const folders: string[] = fs.existsSync(vaultPath)
    ? fs.readdirSync(vaultPath, { withFileTypes: true })
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(e => e.name)
    : VAULT_FOLDERS;
  return { notes, folders };
});

ipcMain.handle('list-notes',  (_, vaultPath: string) => listVaultNotes(vaultPath));
ipcMain.handle('read-note',   (_, filePath: string)  => readNote(filePath));
ipcMain.handle('write-note',  (_, filePath: string, content: string) => {
  const result = writeNote(filePath, content);
  lastCaptureTime = new Date().toISOString();
  writeGhostVaultStatus();
  return result;
});
ipcMain.handle('delete-note', (_, filePath: string) => {
  const r = deleteNote(filePath);
  vaultNoteCount = Math.max(0, vaultNoteCount - 1);
  writeGhostVaultStatus();
  return r;
});
ipcMain.handle('rename-note', (_, oldPath: string, newPath: string) => renameNote(oldPath, newPath));

ipcMain.handle('new-note', async (_, vaultPath: string, folder: string, title: string): Promise<NewNoteResult> => {
  const safeName  = title.replace(/[/\\?%*:|"<>]/g, '-') || 'Untitled';
  const filePath  = path.join(vaultPath, folder, `${safeName}.md`);
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const content   = `# ${title}\n\n*Created: ${timestamp}*\n\n---\n\n`;
  writeNote(filePath, content);
  lastCaptureTime = new Date().toISOString();
  vaultNoteCount++;
  writeGhostVaultStatus();
  return { path: filePath, name: safeName, folder, content };
});

ipcMain.handle('create-folder', async (_, vaultPath: string, folderName: string) => {
  try { fs.mkdirSync(path.join(vaultPath, folderName), { recursive: true }); return true; }
  catch { return false; }
});

ipcMain.handle('list-folders', (_, vaultPath: string): string[] => {
  if (!vaultPath || !fs.existsSync(vaultPath)) return VAULT_FOLDERS;
  try {
    return fs.readdirSync(vaultPath, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);
  } catch { return VAULT_FOLDERS; }
});

ipcMain.handle('reveal-in-finder', (_, p: string) => {
  if (p && fs.existsSync(p)) shell.showItemInFolder(p);
});
ipcMain.handle('open-external', (_, url: string) => shell.openExternal(url));

ipcMain.handle('pick-vault-dir', async (_, opts: { skipFolderCreate?: boolean } = {}) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select Vault Directory', properties: ['openDirectory', 'createDirectory']
  });
  if (!result.canceled && result.filePaths[0]) {
    const vaultPath = result.filePaths[0];
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
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[GhostVault] export-notes failed:', (e as Error).message);
    return false;
  }
});

// ─── Move note ────────────────────────────────────────────────────────────────
ipcMain.handle('move-note', (_, srcPath: string, destFolder: string): boolean => {
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
  const vp = getVersionsPath(notePath);
  try {
    if (fs.existsSync(vp)) return JSON.parse(fs.readFileSync(vp, 'utf8'));
  } catch { /* ignore */ }
  return [];
});

ipcMain.handle('note:versions:save', (_, notePath: string, content: string): void => {
  const vp = getVersionsPath(notePath);
  let versions: import('../shared/types.js').NoteVersion[] = [];
  try {
    if (fs.existsSync(vp)) versions = JSON.parse(fs.readFileSync(vp, 'utf8'));
  } catch { /* ignore */ }
  versions.push({ timestamp: Date.now(), content });
  if (versions.length > 20) versions = versions.slice(-20);
  try { fs.writeFileSync(vp, JSON.stringify(versions, null, 2), 'utf8'); } catch { /* ignore */ }
});

// ─── Note encryption ──────────────────────────────────────────────────────────
const crypto = await import('crypto');

ipcMain.handle('ghostvault:note:lock', async (_, notePath: string, password: string): Promise<{ ok: boolean; error?: string }> => {
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
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Export as HTML',
    defaultPath: `${noteName}.html`,
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
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export as PDF',
    defaultPath: `${noteName}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return false;
  try {
    const pdfWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    const data = await pdfWin.webContents.printToPDF({ printBackground: true });
    pdfWin.destroy();
    fs.writeFileSync(result.filePath, data);
    return true;
  } catch { return false; }
});

// ─── Spec-canonical IPC aliases ───────────────────────────────────────────────
// The spec defines these channel names; we alias them to the existing handlers
// so both naming conventions work without breaking existing renderer code.

ipcMain.handle('ghostvault:vault:list', (_, vaultPath: string) => listVaultNotes(vaultPath));
ipcMain.handle('ghostvault:note:read',  (_, filePath: string)  => readNote(filePath));
ipcMain.handle('ghostvault:note:write', (_, filePath: string, content: string) => {
  const ok = writeNote(filePath, content);
  if (ok) { lastCaptureTime = new Date().toISOString(); writeGhostVaultStatus(); }
  return ok;
});
ipcMain.handle('ghostvault:note:delete', (_, filePath: string) => {
  const ok = deleteNote(filePath);
  if (ok) { vaultNoteCount = Math.max(0, vaultNoteCount - 1); writeGhostVaultStatus(); }
  return ok;
});
ipcMain.handle('ghostvault:note:search', async (_, vaultPath: string, query: string) => {
  if (!query.trim()) return [];
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
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {};
    return JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'));
  } catch { return {}; }
});
ipcMain.handle('ghostvault:event:emit', (_, event: { appName: string; eventType: string; data: Record<string, unknown> }) => {
  ecosystemBus.emitEvent(event.appName || 'GhostVault', event.eventType, event.data || {});
  return true;
});
ipcMain.handle('ghostvault:clipboard:read', () => {
  // Delegates to read-clipboard (handled in ipc-extras.ts)
  // This alias ensures spec-canonical channel is available
  const { clipboard } = require('electron');
  return clipboard.readText();
});

