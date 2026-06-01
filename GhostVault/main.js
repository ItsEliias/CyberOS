// ═══════════════════════════════════════════════════════════
//   GHOSTVAULT — main.js
//   ItsEliias // v1.0 — Electron main process
//   Vault sync · Always-on-top · IPC · AI API · File I/O
// ═══════════════════════════════════════════════════════════

'use strict';

const {
  app, BrowserWindow, ipcMain, shell, dialog,
  safeStorage, nativeTheme, globalShortcut
} = require('electron');
const path  = require('path');
const fs    = require('fs');
const os    = require('os');
const https = require('https');
const http  = require('http');
const ecosystemBus = require('./ecosystem-bus');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const APP_VERSION        = '1.0.0';
const CONFIG_PATH        = path.join(os.homedir(), 'ghostvault-config.json');
const CYBERTOOLS_CONFIG  = path.join(os.homedir(), 'cybertools-config.json');
const DATA_DIR           = path.join(os.homedir(), '.ghostvault');
// AI processing is handled locally in local-ai.js — no API needed

// Default vault folder structure (created only when useExistingStructure is false)
const VAULT_FOLDERS = ['Notes', 'Meetings', 'Projects', 'Study', 'Tasks', 'Archive'];

let mainWindow       = null;
let captureWindow    = null;
let autosaveTimer    = null;
let statusInterval   = null;
let lastCaptureTime  = null;
let vaultNoteCount   = 0;

// ─── ENSURE DIRS ──────────────────────────────────────────────────────────────
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── CYBERTOOLS STATUS WRITER ─────────────────────────────────────────────────
// Writes ghostvault_status into the shared cybertools-config.json so the
// Launcher can display live GhostVault stats on its card.
function writeGhostVaultStatus() {
  try {
    let shared = {};
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')); } catch (_) {}
    }
    shared.ghostvault_status = {
      active:       true,
      lastActive:   new Date().toISOString(),
      lastCapture:  lastCaptureTime,
      noteCount:    vaultNoteCount
    };
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8');
  } catch (e) {
    console.warn('[GhostVault] status write failed:', e.message);
  }
}

function startGhostVaultStatusWriter() {
  writeGhostVaultStatus();
  statusInterval = setInterval(writeGhostVaultStatus, 15000);
}

function stopGhostVaultStatusWriter() {
  if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }
  // Mark inactive on quit
  try {
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      const shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'));
      if (shared.ghostvault_status) shared.ghostvault_status.active = false;
      fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8');
    }
  } catch (_) {}
}

function refreshVaultNoteCount(vaultPath) {
  if (!vaultPath) { vaultNoteCount = 0; return; }
  let count = 0;
  function walk(dir) {
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

// ─── CONFIG ───────────────────────────────────────────────────────────────────
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {}
  return {};
}

function saveConfig(cfg) {
  try {
    let existing = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try { existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...existing, ...cfg }, null, 2), 'utf8');
    return true;
  } catch (e) { console.error('saveConfig:', e.message); return false; }
}

// API key functions removed — all AI processing is local (local-ai.js)

// ─── HTTP HELPER ──────────────────────────────────────────────────────────────
function fetchJSON(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   opts.method || 'GET',
      headers:  opts.headers || {}
    };
    const req = lib.request(reqOpts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end',  () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ─── VAULT HELPERS ────────────────────────────────────────────────────────────
function ensureVaultFolders(vaultPath) {
  // Only create default folders when useExistingStructure is false/unset
  const cfg = loadConfig();
  if (cfg.useExistingStructure) return;
  VAULT_FOLDERS.forEach(f => {
    const p = path.join(vaultPath, f);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });
}

function listVaultNotes(vaultPath) {
  const results = [];
  function walk(dir, relBase) {
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
          name:     e.name.replace('.md', ''),
          filename: e.name,
          path:     full,
          rel:      rel,
          folder:   relBase || '/',
          mtime:    stat.mtimeMs,
          size:     stat.size
        });
      }
    }
  }
  walk(vaultPath, '');
  return results.sort((a, b) => b.mtime - a.mtime);
}

function readNote(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return ''; }
}

function writeNote(filePath, content) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (e) { console.error('writeNote:', e.message); return false; }
}

function deleteNote(filePath) {
  try { fs.unlinkSync(filePath); return true; }
  catch { return false; }
}

function renameNote(oldPath, newPath) {
  try {
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(oldPath, newPath);
    return true;
  } catch { return false; }
}

// ─── CAPTURE WINDOW ───────────────────────────────────────────────────────────
function createCaptureWindow() {
  captureWindow = new BrowserWindow({
    width:           500,
    height:          600,
    minWidth:        400,
    minHeight:       480,
    show:            false,
    frame:           false,
    transparent:     true,
    alwaysOnTop:     true,
    vibrancy:        'under-window',
    visualEffectState: 'active',
    titleBarStyle:   'customButtonsOnHover',
    skipTaskbar:     true,
    resizable:       true,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      spellcheck:       true
    }
  });

  captureWindow.loadFile('capture.html');

  captureWindow.on('close', (e) => {
    // Never destroy — just hide so it re-opens instantly
    e.preventDefault();
    captureWindow.hide();
  });

  captureWindow.on('ready-to-show', () => {
    // Send folder list on first show
    sendCaptureFolders();
  });
}

function sendCaptureFolders() {
  if (!captureWindow) return;
  const cfg = loadConfig();
  if (!cfg.vaultPath) return;
  try {
    const entries = fs.readdirSync(cfg.vaultPath, { withFileTypes: true });
    const folders = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);
    captureWindow.webContents.send('capture-folders', folders.length ? folders : ['Notes']);
  } catch {
    captureWindow.webContents.send('capture-folders', ['Notes']);
  }
}

function toggleCaptureWindow() {
  if (!captureWindow) createCaptureWindow();
  if (captureWindow.isVisible()) {
    captureWindow.hide();
  } else {
    sendCaptureFolders();
    captureWindow.show();
    captureWindow.setAlwaysOnTop(true, 'floating');
    // Don't steal focus from main window — just make it visible
    captureWindow.focus();
  }
}

// ─── MAIN WINDOW ──────────────────────────────────────────────────────────────
function createWindow() {
  const cfg = loadConfig();
  mainWindow = new BrowserWindow({
    width:           cfg.windowWidth  || 1400,
    height:          cfg.windowHeight || 900,
    x:               cfg.windowX,
    y:               cfg.windowY,
    minWidth:        900,
    minHeight:       600,
    show:            false,
    titleBarStyle:   'hiddenInset',
    backgroundColor: '#0d0d1a',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      spellcheck:       true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (cfg.alwaysOnTop) mainWindow.setAlwaysOnTop(true, 'floating');
  });

  mainWindow.on('close', () => {
    const [w, h] = mainWindow.getSize();
    const [x, y] = mainWindow.getPosition();
    saveConfig({ windowWidth: w, windowHeight: h, windowX: x, windowY: y });
    // Destroy capture window on main close
    if (captureWindow) {
      captureWindow.removeAllListeners('close');
      captureWindow.destroy();
      captureWindow = null;
    }
  });

  // Global shortcuts
  try {
    // Cmd+N → toggle capture window
    globalShortcut.register('CommandOrControl+N', () => {
      toggleCaptureWindow();
    });
    // Cmd+Shift+G → bring main window + quick capture overlay
    globalShortcut.register('CommandOrControl+Shift+G', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('quick-capture');
      }
    });
  } catch (e) { console.warn('Shortcut registration:', e.message); }
}

app.whenReady().then(() => {
  ensureDirs();

  // Pre-load vault note count for status writer
  const cfg = loadConfig();
  if (cfg.vaultPath) setTimeout(() => refreshVaultNoteCount(cfg.vaultPath), 500);

  createWindow();
  startGhostVaultStatusWriter();
  ecosystemBus.emitEvent('GhostVault', 'ghostvault.app.opened', {});
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('before-quit', () => {
  stopGhostVaultStatusWriter();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC HANDLERS ─────────────────────────────────────────────────────────────

// Config
ipcMain.handle('get-config',    ()      => loadConfig());
ipcMain.handle('save-config',   (_, c)  => saveConfig(c));
ipcMain.handle('get-version',   ()      => APP_VERSION);

// Ecosystem event bus
ipcMain.handle('ecosystem-emit', (_, appName, eventType, data) => {
  ecosystemBus.emitEvent(appName, eventType, data);
  return true;
});

// No API key handlers needed — AI is fully local

// Always-on-top
ipcMain.handle('set-always-on-top', (_, v) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(v, 'floating');
    saveConfig({ alwaysOnTop: v });
    return true;
  }
  return false;
});
ipcMain.handle('get-always-on-top', () => mainWindow ? mainWindow.isAlwaysOnTop() : false);

// Window minimize/close
ipcMain.handle('minimize-window', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle('close-window',    () => { if (mainWindow) mainWindow.close(); });

// Vault operations
ipcMain.handle('list-notes',   (_, vaultPath) => listVaultNotes(vaultPath));
ipcMain.handle('read-note',    (_, filePath)  => readNote(filePath));
ipcMain.handle('write-note', (_, filePath, content) => {
  const result = writeNote(filePath, content);
  lastCaptureTime = new Date().toISOString();
  writeGhostVaultStatus();
  return result;
});
ipcMain.handle('delete-note',  (_, filePath)  => { const r = deleteNote(filePath); vaultNoteCount = Math.max(0, vaultNoteCount - 1); writeGhostVaultStatus(); return r; });
ipcMain.handle('rename-note',  (_, oldPath, newPath) => renameNote(oldPath, newPath));

ipcMain.handle('new-note', async (_, vaultPath, folder, title) => {
  const safeName = title.replace(/[/\\?%*:|"<>]/g, '-') || 'Untitled';
  const filePath  = path.join(vaultPath, folder, `${safeName}.md`);
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const content   = `# ${title}\n\n*Created: ${timestamp}*\n\n---\n\n`;
  writeNote(filePath, content);
  lastCaptureTime = new Date().toISOString();
  vaultNoteCount++;
  writeGhostVaultStatus();
  return { path: filePath, name: safeName, folder, content };
});

ipcMain.handle('create-folder', async (_, vaultPath, folderName) => {
  try {
    const p = path.join(vaultPath, folderName);
    fs.mkdirSync(p, { recursive: true });
    return true;
  } catch { return false; }
});

ipcMain.handle('list-folders', (_, vaultPath) => {
  if (!vaultPath || !fs.existsSync(vaultPath)) return VAULT_FOLDERS;
  try {
    const entries = fs.readdirSync(vaultPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);
  } catch { return VAULT_FOLDERS; }
});

// Open vault folder in Finder/Explorer
ipcMain.handle('reveal-in-finder', (_, p) => {
  if (p && fs.existsSync(p)) shell.showItemInFolder(p);
});

ipcMain.handle('open-external', (_, url) => shell.openExternal(url));

// ─── VAULT FOLDER PICKER (respects useExistingStructure) ──────────────────────
ipcMain.handle('pick-vault-dir', async (_, opts = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title:      'Select Vault Directory',
    properties: ['openDirectory', 'createDirectory']
  });
  if (!result.canceled && result.filePaths[0]) {
    const vaultPath = result.filePaths[0];
    const cfg = loadConfig();
    if (!cfg.useExistingStructure && !opts.skipFolderCreate) {
      ensureVaultFolders(vaultPath);
    }
    saveConfig({ vaultPath });
    // Update note count for new vault
    setTimeout(() => { refreshVaultNoteCount(vaultPath); writeGhostVaultStatus(); }, 300);
    return vaultPath;
  }
  return null;
});

// ─── CAPTURE WINDOW IPC ───────────────────────────────────────────────────────
ipcMain.handle('toggle-capture', () => toggleCaptureWindow());

ipcMain.handle('hide-capture', () => {
  if (captureWindow) captureWindow.hide();
});

ipcMain.handle('minimize-capture', () => {
  if (captureWindow) captureWindow.minimize();
});

ipcMain.handle('save-capture-note', async (_, { folder, title, text }) => {
  try {
    const cfg = loadConfig();
    if (!cfg.vaultPath) return { ok: false, error: 'No vault configured' };

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const safeName  = (title || `Quick Note ${timestamp}`).replace(/[/\\?%*:|"<>]/g, '-');
    const content   = `# ${safeName}\n\n*Captured: ${timestamp}*\n\n---\n\n${text}\n`;
    const filePath  = path.join(cfg.vaultPath, folder || 'Notes', `${safeName}.md`);

    writeNote(filePath, content);

    // Update status tracking
    lastCaptureTime = new Date().toISOString();
    vaultNoteCount++;
    writeGhostVaultStatus();

    // Notify main window to refresh vault
    if (mainWindow) mainWindow.webContents.send('vault-refresh');

    return { ok: true, path: filePath, name: safeName };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ─── OLLAMA INTEGRATION ───────────────────────────────────────────────────────

function checkOllamaRunning() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost', port: 11434, path: '/api/tags', method: 'GET'
    }, res => { resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

function callOllama(model, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: model || 'mistral', prompt, stream: false });
    const req = http.request({
      hostname: 'localhost', port: 11434, path: '/api/generate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
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

function buildOllamaPrompt(text, mode, ctx) {
  const ctxInstructions = {
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
- PRESERVE all commands and terminal output — wrap in code blocks (\`\`\`bash or \`\`\`text)
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

  return `${ctxInstructions[ctx] || ctxInstructions.work}

RAW NOTE TO FORMAT:
---
${text}
---`;
}

ipcMain.handle('ollama-check', async () => {
  const running = await checkOllamaRunning();
  if (!running) return { running: false, models: [] };
  try {
    const res = await fetchJSON('http://localhost:11434/api/tags');
    const models = (res.body?.models || []).map(m => m.name).sort();
    return { running: true, models };
  } catch {
    return { running: true, models: [] };
  }
});

ipcMain.handle('ollama-format', async (_, { text, mode, ctx, model }) => {
  try {
    const running = await checkOllamaRunning();
    if (!running) return { error: 'ollama_not_running' };
    const prompt = buildOllamaPrompt(text, mode, ctx);
    const result = await callOllama(model || 'mistral', prompt);
    return { result: result.trim() };
  } catch (e) {
    return { error: e.message };
  }
});

// ─── CAPTURE THEME IPC ────────────────────────────────────────────────────────
ipcMain.handle('get-capture-theme', () => {
  const cfg = loadConfig();
  return cfg.captureTheme || { core: 'stealth', personality: 'neutral' };
});

ipcMain.handle('save-capture-theme', (_, theme) => {
  return saveConfig({ captureTheme: theme });
});
