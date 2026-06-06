import { app, BrowserWindow, ipcMain, shell, dialog, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { emitEvent } from './ecosystem-bus.js';
import { registerExtrasIPC } from './ipc-extras.js';
import { consumePendingAction, installPendingActionWatcher } from './pendingActions.js'
import {
  saveTokenSecure, loadTokenSecure, clearTokenSecure,
  fetchHtbStats, fetchThmStats, writeActiveLab,
} from './platforms.js';

const APP_VERSION        = '1.0';
const CONFIG_PATH        = path.join(os.homedir(), 'cybertools-config.json');
const DATA_DIR           = path.join(os.homedir(), '.cyberlab-companion');
const SESSIONS_DIR       = path.join(DATA_DIR, 'sessions');
const ENCRYPTED_KEY_FILE = path.join(DATA_DIR, 'apikey.enc');
const HTB_TOKEN_FILE     = path.join(DATA_DIR, 'htb-token.enc');
const THM_TOKEN_FILE     = path.join(DATA_DIR, 'thm-token.enc');
const PROGRESS_FILE      = path.join(DATA_DIR, 'progress.json');
const LAB_TRACKER_FILE   = path.join(DATA_DIR, 'labs.json');
const SNIPPETS_FILE      = path.join(DATA_DIR, 'snippets.json');
const KNOWLEDGE_FILE     = path.join(DATA_DIR, 'knowledgebase.json');
const LAB_REVIEWS_FILE   = path.join(DATA_DIR, 'lab-reviews.json');
const CLAUDE_API_URL     = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL       = 'claude-sonnet-4-20250514';
const UPDATE_CHECK_URL   = 'https://api.github.com/repos/ItsEliias/cyberlab-companion/releases/latest';

// ─── Crash reporter (locally-stored minidumps; nothing uploaded) ─────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
try { require('electron').crashReporter.start({ uploadToServer: false, productName: "CyberlabCompanion", companyName: 'CyberOS' }) } catch { /* unavailable */ }

let mainWindow: BrowserWindow | null = null;
let apiKey: string | null = null;
let autosaveInterval: ReturnType<typeof setInterval> | null = null;
let vpnCheckInterval: ReturnType<typeof setInterval> | null = null;

function ensureDirs() {
  [DATA_DIR, SESSIONS_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function loadConfig(): Record<string, unknown> {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {}
  return {};
}

function saveConfig(cfg: Record<string, unknown>): boolean {
  try {
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try { existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
    }
    // Atomic write: every CyberTools app writes to this same shared
    // ~/cybertools-config.json. Direct fs.writeFileSync races against
    // sibling apps reading mid-write (their JSON.parse throws or sees
    // a truncated config, and they silently degrade to defaults until
    // the next refresh). tmp+rename keeps readers seeing either the
    // old or new bytes.
    const tmp = CONFIG_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ ...existing, ...cfg }, null, 2), 'utf8');
    fs.renameSync(tmp, CONFIG_PATH);
    return true;
  } catch (e: unknown) {
    console.error('saveConfig error:', (e as Error).message);
    return false;
  }
}

function saveApiKeySecure(key: string): boolean {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      // Base64 is NOT encryption — refuse rather than storing the Claude
      // API key in effectively plaintext. Same rationale as platforms.ts.
      console.warn('[CyberLab] safeStorage unavailable — refusing to save API key in cleartext');
      return false;
    }
    fs.writeFileSync(ENCRYPTED_KEY_FILE, safeStorage.encryptString(key));
    apiKey = key;
    return true;
  } catch (e: unknown) { console.error('saveApiKey error:', (e as Error).message); return false; }
}

function loadApiKeySecure(): string | null {
  try {
    if (fs.existsSync(ENCRYPTED_KEY_FILE) && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(fs.readFileSync(ENCRYPTED_KEY_FILE));
    }
    // Migration: older releases fell back to a base64 file. If one exists,
    // surface its value once and remove it so we don't keep reading from an
    // insecure source.
    const b64 = ENCRYPTED_KEY_FILE + '.b64';
    if (fs.existsSync(b64)) {
      const value = Buffer.from(fs.readFileSync(b64, 'utf8'), 'base64').toString('utf8');
      try { fs.unlinkSync(b64); } catch { /* ignore */ }
      return value;
    }
  } catch {}
  return null;
}

// HTB/THM logic + encrypted token storage extracted to './platforms.ts'.

function fetchJSON(url: string, opts: { method?: string; headers?: Record<string,string>; body?: string } = {}, _hops = 0): Promise<{ status: number; data: unknown; raw?: boolean }> {
  return new Promise((resolve, reject) => {
    if (_hops > 5) return reject(new Error('Too many redirects'));
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: { 'Accept': 'application/json', ...(opts.headers || {}) },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode!) && res.headers.location) {
        const loc = res.headers.location;
        const next = loc.startsWith('http') ? loc : new URL(loc, url).href;
        resolve(fetchJSON(next, opts, _hops + 1));
        return;
      }
      let data = '';
      res.on('data', (chunk: Buffer) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode!, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode!, data, raw: true }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function callClaude(payload: { system?: string; messages?: unknown[]; model?: string }): Promise<unknown> {
  if (!apiKey) throw new Error('No API key configured');
  const body = JSON.stringify({
    model: payload.model || CLAUDE_MODEL,
    max_tokens: 2000,
    system: payload.system || '',
    messages: payload.messages || [],
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey!,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode! >= 400) reject(new Error(parsed.error?.message || `API error ${res.statusCode}`));
          else resolve(parsed);
        } catch { reject(new Error('Failed to parse API response')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('API request timeout')); });
    req.write(body);
    req.end();
  });
}

const VPN_INTERFACES = ['tun0','tun1','tap0','tap1','ppp0','ppp1','utun0','utun1','utun2','utun3','utun4','utun5','wg0'];

function checkVPN() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of VPN_INTERFACES) {
      const iface = interfaces[name];
      if (iface) {
        const ipv4 = iface.find(i => i.family === 'IPv4' && !i.internal);
        if (ipv4) return { status: 'active', interface: name, ip: ipv4.address };
      }
    }
    return { status: 'off' };
  } catch { return { status: 'unknown' }; }
}

function semverGt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0, nb = pb[i] || 0;
    if (na > nb) return true;
    if (na < nb) return false;
  }
  return false;
}

async function checkForUpdates() {
  try {
    const cfg = loadConfig();
    const result = await fetchJSON((cfg.updateCheckUrl as string) || UPDATE_CHECK_URL, {
      headers: { 'User-Agent': 'CYBERLAB-COMPANION/1.0', 'Accept': 'application/vnd.github+json' }
    });
    if (result.status === 200 && (result.data as Record<string,unknown>).tag_name) {
      const latest = ((result.data as Record<string,unknown>).tag_name as string).replace(/^v/, '');
      if (latest !== APP_VERSION && semverGt(latest, APP_VERSION)) {
        return { available: true, version: latest, url: (result.data as Record<string,unknown>).html_url };
      }
    }
    return { available: false };
  } catch { return { available: false }; }
}

function scanVaultForNotes(vaultPath: string): string[] {
  if (!vaultPath || !fs.existsSync(vaultPath)) return [];
  const notes: string[] = [];
  function walk(dir: string) {
    try {
      fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
        if (e.isDirectory() && !e.name.startsWith('.')) walk(path.join(dir, e.name));
        else if (e.name.endsWith('.md')) notes.push(e.name.replace(/\.md$/, ''));
      });
    } catch {}
  }
  walk(vaultPath);
  return notes;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1100, minHeight: 750,
    title: 'CYBERLAB COMPANION — ItsEliias',
    backgroundColor: '#0e1117',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
    show: false,
    autoHideMenuBar: true,
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
    // Give the renderer time to mount its pending-action listener
    setTimeout(() => {
      const result = consumePendingAction('cyberlab');
      if (result && mainWindow) {
        mainWindow.webContents.send('pending-action', result.action);
      }
    }, 800);
    // Listen for tray-action writes while the app is already running
    installPendingActionWatcher('cyberlab', (action) => {
      try { mainWindow?.webContents.send('pending-action', action) } catch { /* ignore */ }
    })
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function registerIPC() {
  ipcMain.handle('get-config', () => loadConfig());
  ipcMain.handle('save-config', (_, cfg) => saveConfig(cfg));
  ipcMain.handle('get-output-dir', () => DATA_DIR);

  ipcMain.handle('save-api-key', (_, key: string) => {
    const ok = saveApiKeySecure(key);
    saveConfig({ apiKeyConfigured: true });
    return ok;
  });
  ipcMain.handle('has-api-key', () => !!loadApiKeySecure());
  ipcMain.handle('test-api-key', async (_, keyToTest: string) => {
    const prev = apiKey;
    apiKey = keyToTest;
    try {
      await callClaude({ system: 'You are a test assistant.', messages: [{ role: 'user', content: 'Say "ok" in one word.' }] });
      return { success: true };
    } catch (e: unknown) {
      const msg = (e as Error).message || '';
      // 402 billing error — key is valid, just no credits; save it anyway
      if (/credit|billing|balance|quota/i.test(msg)) {
        return { success: true, warning: msg };
      }
      apiKey = prev;
      return { success: false, error: msg };
    }
  });

  ipcMain.handle('claude-chat', async (_, payload: unknown) => {
    // Validate the shape so a renderer bug can't crash callClaude with null
    // deref, and so we don't ship a multi-MB messages array to Anthropic
    // (which would burn API credit without a clear failure to the user).
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'Invalid payload' };
    }
    const p = payload as { system?: unknown; messages?: unknown; model?: unknown };
    if (p.system !== undefined && typeof p.system !== 'string') {
      return { success: false, error: 'payload.system must be a string' };
    }
    if (p.messages !== undefined && !Array.isArray(p.messages)) {
      return { success: false, error: 'payload.messages must be an array' };
    }
    if (p.model !== undefined && typeof p.model !== 'string') {
      return { success: false, error: 'payload.model must be a string' };
    }
    // Cap the body size to prevent runaway API spend if the renderer somehow
    // assembles an enormous prompt (e.g. paste-of-a-log-file).
    const approxSize = JSON.stringify(p).length;
    if (approxSize > 256 * 1024) {
      return { success: false, error: `Prompt too large (${(approxSize / 1024).toFixed(0)}KB; max 256KB)` };
    }
    try { return { success: true, data: await callClaude(p as { system?: string; messages?: unknown[]; model?: string }) }; }
    catch (e: unknown) { return { success: false, error: (e as Error).message }; }
  });

  ipcMain.handle('save-session',(_, data: { id: string; name?: string; labName?: string }) => {
    try {
      // Sanity-check id so a renderer can't traverse out of SESSIONS_DIR
      // via "id" like "../../../something". Session ids are short
      // alphanumeric strings (uuid/nanoid-style) in normal use.
      if (!data?.id || typeof data.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(data.id)) {
        return { success: false, error: 'Invalid session id' };
      }
      if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
      const fp  = path.join(SESSIONS_DIR, `session_${data.id}.json`);
      // Atomic write: tmp + rename. A crash or kill mid-writeFileSync
      // of an active session leaves a truncated/half-parsed JSON that
      // load-session quietly drops as null next launch — the user
      // loses their lab notes for no reason.
      const tmp = fp + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmp, fp);
      emitEvent('CyberLab', 'cyberlab.session.started', { name: data.name || data.labName || data.id });
      return { success: true, path: fp };
    } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
  });
  ipcMain.handle('load-session', (_, id: string) => {
    try {
      // Same id format guard as save-session — block traversal /
      // accidental read of arbitrary JSON files in SESSIONS_DIR's parent.
      if (typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
      const fp = path.join(SESSIONS_DIR, `session_${id}.json`);
      if (!fs.existsSync(fp)) return null;
      return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch { return null; }
  });
  ipcMain.handle('list-sessions', () => {
    try {
      return fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json')).map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8')); } catch { return null; }
      }).filter(Boolean);
    } catch { return []; }
  });
  ipcMain.handle('delete-session', (_, id: string) => {
    try {
      // Same id format guard as save-session — block traversal.
      if (typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) return false;
      const fp = path.join(SESSIONS_DIR, `session_${id}.json`);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      return true;
    } catch { return false; }
  });

  ipcMain.handle('save-writeup', (_, { content, labName, platform, vaultPath }: { content: string; labName: string; platform: string; vaultPath: string }) => {
    try {
      if (!vaultPath) throw new Error('No vault path configured');
      // Sanitize lab name. Previously the regex stripped `.` too, so a
      // labName like ".." sanitized to "" and the file saved as ".md" — a
      // hidden dotfile in the writeups dir. Fall back to 'Untitled' instead.
      const safeName = labName.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Untitled';
      const dir = path.join(vaultPath, 'Writeups', platform || 'Other');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const fp = path.join(dir, `${safeName}.md`);
      // Confine writeup output to the configured vault root so a tampered
      // labName / platform can't escape via path traversal (e.g.
      // platform="../../" + labName=".ssh/authorized_keys").
      const vaultResolved = path.resolve(vaultPath);
      const fpResolved    = path.resolve(fp);
      if (!fpResolved.startsWith(vaultResolved + path.sep)) {
        throw new Error('Writeup path escapes vault directory');
      }
      // Atomic — a crash mid-write would leave a half-flushed writeup that
      // VSCode / Obsidian would happily render as truncated garbage.
      const tmp = `${fp}.tmp`;
      fs.writeFileSync(tmp, content, 'utf8');
      fs.renameSync(tmp, fp);
      return { success: true, path: fp };
    } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
  });
  ipcMain.handle('export-pdf', async (_, { content, labName }: { content: string; labName: string }) => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: `${labName || 'writeup'}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (!filePath) return { success: false, error: 'Cancelled' };
      const pdfData = await mainWindow!.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
      fs.writeFileSync(filePath, pdfData);
      return { success: true, path: filePath };
    } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
  });

  ipcMain.handle('scan-vault', (_, vaultPath: string) => scanVaultForNotes(vaultPath));
  ipcMain.handle('pick-folder', async () => {
    const { filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return filePaths[0] || null;
  });

  ipcMain.handle('check-vpn', () => checkVPN());
  ipcMain.handle('check-update', () => checkForUpdates());

  ipcMain.handle('sync-htb', async (_, htbKey: string) => {
    if (!htbKey) return { success: false, error: 'No HTB API key — add it in Settings first' };
    try {
      const headers = { 'Authorization': `Bearer ${htbKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; CyberLab/1.0)' };
      let userId: string | null = null;
      try {
        const parts = htbKey.split('.');
        if (parts.length === 3) {
          const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const p = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
          userId = p.sub || p.id || p.user_id || null;
        }
      } catch {}
      const authRes = await fetchJSON('https://www.hackthebox.com/api/v4/user/info', { headers });
      if (authRes.status === 401 || authRes.status === 403) throw new Error('Invalid HTB API key');
      if (!userId && authRes.status === 200) {
        const d = authRes.data as Record<string, unknown>;
        userId = String(d?.id || d?.info?.id || d?.user?.id || '');
      }
      const eps = userId ? [
        `https://www.hackthebox.com/api/v4/profile/${userId}/machines/owns`,
        `https://app.hackthebox.com/api/v4/profile/${userId}/machines/owns`,
      ] : ['https://www.hackthebox.com/api/v4/machine/owns'];
      for (const ep of eps) {
        try {
          const res = await fetchJSON(ep, { headers });
          if (res.status !== 200 || res.raw) continue;
          const d = res.data as Record<string, unknown>;
          const machines = (d?.profile as Record<string,unknown>)?.owns || d?.owns || d?.machines || d?.data || [];
          if (Array.isArray(machines) && machines.length > 0) {
            const labs = machines.map((m: Record<string,unknown>) => ({
              name: m.name || m.machine_name || 'Unknown', platform: 'HTB',
              difficulty: m.difficultyText || m.difficulty || '',
              os: m.os || '', url: m.id ? `https://app.hackthebox.com/machines/${m.id}` : '',
              notes: '', ip: '',
            }));
            emitEvent('CyberLab', 'cyberlab.htb.synced', { count: labs.length });
            return { success: true, labs };
          }
        } catch {}
      }
      return { success: true, labs: [], partial: true, partialMsg: 'No machines found. Complete some machines on HTB first.' };
    } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
  });

  ipcMain.handle('sync-thm', async (_, username: string) => {
    if (!username) return { success: false, error: 'No THM username — add it in Settings first' };
    try {
      const result = await fetchJSON(`https://tryhackme.com/api/user/${encodeURIComponent(username)}`, { headers: { 'Accept': 'application/json' } });
      if (result.raw) throw new Error('THM requires auth — use Bulk Import instead');
      if (result.status === 404) throw new Error(`THM user "${username}" not found`);
      if (result.status !== 200) throw new Error(`THM API returned ${result.status}`);
      const data = result.data as Record<string, unknown>;
      const rooms = data.completedRooms || data.rooms || [];
      if (!Array.isArray(rooms) || rooms.length === 0) throw new Error('No rooms returned — use Bulk Import');
      const labs = rooms.map((r: Record<string,unknown>) => ({
        name: r.title || r.roomName || r.name || 'Unknown Room', platform: 'THM',
        difficulty: r.difficulty || '', os: '',
        url: r.code ? `https://tryhackme.com/room/${r.code}` : '', notes: '', ip: '',
      }));
      emitEvent('CyberLab', 'cyberlab.thm.synced', { count: labs.length });
      return { success: true, labs };
    } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
  });

  // ── HTB / THM token management (encrypted at rest) ─────────────────────────

  ipcMain.handle('save-htb-token', async (_, token: string) => {
    if (!token || typeof token !== 'string') return { success: false, error: 'Empty token' };
    const test = await fetchHtbStats(token);
    if (!test.success) return { success: false, error: test.error || 'HTB validation failed' };
    if (!saveTokenSecure(HTB_TOKEN_FILE, token)) return { success: false, error: 'Failed to encrypt token' };
    saveConfig({ htbConnected: true });
    emitEvent('CyberLab', 'cyberlab.htb.connected', { username: test.data?.username });
    return { success: true, data: test.data };
  });

  ipcMain.handle('test-htb-token', async (_, token?: string) => {
    const t = token || loadTokenSecure(HTB_TOKEN_FILE);
    if (!t) return { success: false, error: 'No HTB token configured' };
    const res = await fetchHtbStats(t);
    return res;
  });

  ipcMain.handle('clear-htb-token', () => {
    clearTokenSecure(HTB_TOKEN_FILE);
    saveConfig({ htbConnected: false });
    emitEvent('CyberLab', 'cyberlab.htb.disconnected', {});
    return { success: true };
  });

  ipcMain.handle('has-htb-token', () => !!loadTokenSecure(HTB_TOKEN_FILE));

  ipcMain.handle('fetch-htb-stats', async () => {
    const token = loadTokenSecure(HTB_TOKEN_FILE);
    if (!token) return { success: false, error: 'Not connected to HTB' };
    const res = await fetchHtbStats(token);
    // Update shared_context if there's an active machine
    if (res.success && res.data?.activeMachines?.length) {
      const m = res.data.activeMachines[0];
      writeActiveLab(CONFIG_PATH, m.name, 'HTB', { activeIP: m.ip || null, activeDifficulty: m.difficulty || null });
    }
    return res;
  });

  ipcMain.handle('save-thm-token', async (_, payload: { token: string; username?: string }) => {
    const token = payload?.token || '';
    if (!token) return { success: false, error: 'Empty THM token' };
    const test = await fetchThmStats(token, payload.username);
    if (!test.success) return { success: false, error: test.error || 'THM validation failed' };
    if (!saveTokenSecure(THM_TOKEN_FILE, token)) return { success: false, error: 'Failed to encrypt token' };
    saveConfig({ thmConnected: true, thmUsername: test.data?.username || payload.username });
    emitEvent('CyberLab', 'cyberlab.thm.connected', { username: test.data?.username });
    return { success: true, data: test.data };
  });

  ipcMain.handle('test-thm-token', async (_, payload?: { token?: string; username?: string }) => {
    const token = payload?.token || loadTokenSecure(THM_TOKEN_FILE);
    if (!token) return { success: false, error: 'No THM token configured' };
    return fetchThmStats(token, payload?.username);
  });

  ipcMain.handle('clear-thm-token', () => {
    clearTokenSecure(THM_TOKEN_FILE);
    saveConfig({ thmConnected: false });
    emitEvent('CyberLab', 'cyberlab.thm.disconnected', {});
    return { success: true };
  });

  ipcMain.handle('has-thm-token', () => !!loadTokenSecure(THM_TOKEN_FILE));

  ipcMain.handle('fetch-thm-stats', async () => {
    const token = loadTokenSecure(THM_TOKEN_FILE);
    if (!token) return { success: false, error: 'Not connected to THM' };
    const cfg = loadConfig();
    return fetchThmStats(token, cfg.thmUsername as string | undefined);
  });

  ipcMain.handle('set-active-lab', (_, payload: { name: string | null; platform: string; ip?: string }) => {
    writeActiveLab(CONFIG_PATH, payload?.name || null, payload?.platform || '', { activeIP: payload?.ip || null });
    return { success: true };
  });

  ipcMain.handle('update-launcher-status', (_, status: Record<string, unknown>) => {
    try {
      saveConfig({ cyberlab_status: { ...status, lastActive: new Date().toISOString() } });
      if (status.currentLab) {
        let shared: Record<string, unknown> = {};
        if (fs.existsSync(CONFIG_PATH)) {
          try { shared = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
        }
        const existingCtx = (shared.shared_context as Record<string, unknown>) || {};
        shared.shared_context = {
          ...existingCtx,
          activeLab:   status.currentLab,
          lastUpdated: new Date().toISOString(),
          updatedBy:   'CyberLab'
        };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(shared, null, 2), 'utf8');
      }
    } catch {}
  });

  ipcMain.handle('ecosystem-emit', (_, appName: string, eventType: string, data: unknown) => {
    emitEvent(appName, eventType, data as Record<string, unknown>);
    return true;
  });

  ipcMain.handle('save-progress', (_, data: unknown) => {
    try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf8'); return true; } catch { return false; }
  });
  ipcMain.handle('load-progress', () => {
    try { if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch {}
    return null;
  });
  ipcMain.handle('save-lab-tracker', (_, data: unknown) => {
    try { fs.writeFileSync(LAB_TRACKER_FILE, JSON.stringify(data, null, 2), 'utf8'); return true; } catch { return false; }
  });
  ipcMain.handle('load-lab-tracker', () => {
    try { if (fs.existsSync(LAB_TRACKER_FILE)) return JSON.parse(fs.readFileSync(LAB_TRACKER_FILE, 'utf8')); } catch {}
    return null;
  });
  ipcMain.handle('save-snippets', (_, data: unknown) => {
    try { fs.writeFileSync(SNIPPETS_FILE, JSON.stringify(data, null, 2), 'utf8'); return true; } catch { return false; }
  });
  ipcMain.handle('load-snippets', () => {
    try { if (fs.existsSync(SNIPPETS_FILE)) return JSON.parse(fs.readFileSync(SNIPPETS_FILE, 'utf8')); } catch {}
    return null;
  });

  ipcMain.handle('open-external', (_, url: string) => shell.openExternal(url));
  ipcMain.handle('get-version', () => APP_VERSION);
  ipcMain.handle('get-platform', () => process.platform);

  ipcMain.handle('save-knowledge-base', (_, data: unknown) => {
    try { fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(data, null, 2), 'utf8'); return true; } catch { return false; }
  });
  ipcMain.handle('load-knowledge-base', () => {
    try { if (fs.existsSync(KNOWLEDGE_FILE)) return JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8')); } catch {}
    return null;
  });
  ipcMain.handle('save-lab-reviews', (_, data: unknown) => {
    try { fs.writeFileSync(LAB_REVIEWS_FILE, JSON.stringify(data, null, 2), 'utf8'); return true; } catch { return false; }
  });
  ipcMain.handle('load-lab-reviews', () => {
    try { if (fs.existsSync(LAB_REVIEWS_FILE)) return JSON.parse(fs.readFileSync(LAB_REVIEWS_FILE, 'utf8')); } catch {}
    return null;
  });
  ipcMain.handle('export-html', async (_, { content, labName, meta }: { content: string; labName: string; meta: Record<string, string> }) => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: `${labName || 'writeup'}.html`,
        filters: [{ name: 'HTML', extensions: ['html'] }],
      });
      if (!filePath) return { success: false, error: 'Cancelled' };
      const metaRows = Object.entries(meta).map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${labName} Writeup</title>
<style>body{font-family:monospace;background:#0a0a0f;color:#e6edf3;padding:2rem;max-width:900px;margin:0 auto}
h1,h2,h3{color:#b44fff}table{border-collapse:collapse;width:100%;margin:1rem 0}
th,td{padding:6px 10px;border:1px solid #2a3347;text-align:left}code,pre{background:#161b27;padding:2px 6px;border-radius:3px}
pre{padding:1rem;overflow:auto}</style></head>
<body><h1>${labName}</h1><table>${metaRows}</table><hr>
<div id="content"><pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div></body></html>`;
      fs.writeFileSync(filePath, html, 'utf8');
      return { success: true, path: filePath };
    } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
  });
}

app.whenReady().then(async () => {
  ensureDirs();
  apiKey = loadApiKeySecure();
  registerIPC();
  registerExtrasIPC();
  createWindow();
  saveConfig({ cyberlab: { installed: true, version: APP_VERSION, execPath: app.isPackaged ? app.getPath('exe') : app.getAppPath() } });

  vpnCheckInterval = setInterval(() => {
    if (mainWindow) mainWindow.webContents.send('vpn-status', checkVPN());
  }, 30000);

  autosaveInterval = setInterval(() => {
    if (mainWindow) mainWindow.webContents.send('autosave-tick');
  }, 60000);

  setTimeout(async () => {
    const update = await checkForUpdates();
    if (update.available && mainWindow) mainWindow.webContents.send('update-available', update);
  }, 3000);

  if (process.argv.includes('--launcher-open')) { mainWindow?.show(); mainWindow?.focus(); }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('window-all-closed', () => {
  if (vpnCheckInterval) clearInterval(vpnCheckInterval);
  if (autosaveInterval) clearInterval(autosaveInterval);
  app.quit();
});

app.on('before-quit', () => {
  if (vpnCheckInterval) clearInterval(vpnCheckInterval);
  if (autosaveInterval) clearInterval(autosaveInterval);
  try { saveConfig({ cyberlab_status: { activeSession: null, elapsedTime: null } }); } catch {}
});

app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) { event.preventDefault(); shell.openExternal(url); }
  });
  contents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
});
