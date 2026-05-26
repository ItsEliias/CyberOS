import {
  app, BrowserWindow, ipcMain, shell, dialog, globalShortcut
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import https from 'https';
import http from 'http';
import * as ecosystemBus from './ecosystem-bus.js';
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

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function fetchJSON(url: string, opts: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const parsed  = new URL(url);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: parsed.hostname,
      port    : parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path    : parsed.pathname + parsed.search,
      method  : opts.method || 'GET',
      headers : opts.headers || {}
    };
    const req = lib.request(reqOpts, res => {
      let data = '';
      res.on('data', (c: string) => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 200, body: JSON.parse(data) }); }
        catch  { resolve({ status: res.statusCode ?? 200, body: data }); }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
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
        results.push({
          name    : e.name.replace('.md', ''),
          filename: e.name,
          path    : full,
          rel,
          folder  : relBase || '/',
          mtime   : stat.mtimeMs,
          size    : stat.size
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
    fs.writeFileSync(filePath, content, 'utf8');
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
const preloadPath = path.join(__dirname, '..', 'preload', 'preload.js');

function createCaptureWindow() {
  captureWindow = new BrowserWindow({
    width: 500, height: 600, minWidth: 400, minHeight: 480,
    show: false, frame: false, transparent: true,
    alwaysOnTop: true, skipTaskbar: true, resizable: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: true
    }
  });

  if (process.env.NODE_ENV === 'development') {
    captureWindow.loadURL('http://localhost:5173/capture.html');
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

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
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
    globalShortcut.register('CommandOrControl+Shift+G', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('quick-capture');
      }
    });
  } catch (e) { console.warn('Shortcut registration:', (e as Error).message); }
}

// ─── Ollama ───────────────────────────────────────────────────────────────────
function checkOllamaRunning(): Promise<boolean> {
  return new Promise(resolve => {
    const req = http.request(
      { hostname: 'localhost', port: 11434, path: '/api/tags', method: 'GET' },
      res => { resolve(res.statusCode === 200); }
    );
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

function callOllama(model: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: model || 'mistral', prompt, stream: false });
    const req  = http.request({
      hostname: 'localhost', port: 11434, path: '/api/generate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', (c: string) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).response || data); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Ollama timeout')); });
    req.write(body);
    req.end();
  });
}

function buildOllamaPrompt(text: string, _mode: string, ctx: string): string {
  const ctxInstructions: Record<string, string> = {
    work: `You are formatting a work note. Follow these rules STRICTLY:
- PRESERVE every name, phone number, email address, date, time, and amount EXACTLY as written
- PRESERVE all factual details, context, and shorthand — do NOT rewrite or paraphrase content
- Add structure AROUND the content, not instead of it
- Use clean professional markdown with clear sections
- Extract action items as unchecked checkboxes (- [ ] )
- NO corporate buzzwords, NO generic summaries, NO AI filler text
- Output ONLY the formatted markdown — no explanation or preamble`,
    cyber: `You are formatting a cybersecurity/hacking note. Follow these rules STRICTLY:
- PRESERVE all IP addresses, ports, hashes, CVEs, domains EXACTLY as written
- PRESERVE all commands and terminal output — wrap in code blocks
- Structure: Target Info → Open Ports → Findings → Commands → Next Steps
- Markdown optimized for Obsidian — use ## headers, code blocks, and bullet lists
- No rewriting — structure only
- Output ONLY the formatted markdown — no explanation or preamble`,
    personal: `You are lightly organising a personal note. Follow these rules STRICTLY:
- Keep the writer's voice and style — minimal reformatting
- PRESERVE all specific details, names, places, amounts exactly as written
- Only add structure if the note is genuinely messy — otherwise just clean up whitespace
- Use simple markdown — avoid complex section headers for short notes
- Checkboxes for any tasks or reminders mentioned
- Output ONLY the formatted markdown — no explanation or preamble`
  };
  return `${ctxInstructions[ctx] || ctxInstructions.work}\n\nRAW NOTE TO FORMAT:\n---\n${text}\n---`;
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  ensureDirs();
  const cfg = loadConfig();
  if (cfg.vaultPath) setTimeout(() => refreshVaultNoteCount(cfg.vaultPath!), 500);
  createWindow();
  startStatusWriter();
  ecosystemBus.emitEvent('GhostVault', 'ghostvault.app.opened', {});
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('before-quit', () => stopStatusWriter());
app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
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

ipcMain.handle('ollama-check', async () => {
  const running = await checkOllamaRunning();
  if (!running) return { running: false, models: [] };
  try {
    const res     = await fetchJSON('http://localhost:11434/api/tags');
    const body    = res.body as { models?: Array<{ name: string }> };
    const models  = (body?.models || []).map(m => m.name).sort();
    return { running: true, models };
  } catch { return { running: true, models: [] }; }
});

ipcMain.handle('ollama-format', async (_, { text, mode, ctx, model }: { text: string; mode: string; ctx: string; model?: string }) => {
  try {
    const running = await checkOllamaRunning();
    if (!running) return { error: 'ollama_not_running' };
    const prompt = buildOllamaPrompt(text, mode, ctx);
    const result = await callOllama(model || 'mistral', prompt);
    return { result: result.trim() };
  } catch (e) { return { error: (e as Error).message }; }
});

ipcMain.handle('get-capture-theme',  () => loadConfig().captureTheme || { core: 'stealth', personality: 'neutral' });
ipcMain.handle('save-capture-theme', (_, theme) => saveConfig({ captureTheme: theme }));
