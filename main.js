// main.js — Electron main process
// IPC handlers, Claude API, safeStorage, VPN detection, file I/O, autosave, update checker

'use strict';

const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, nativeTheme } = require('electron');
const path  = require('path');
const fs    = require('fs');
const os    = require('os');
const https = require('https');
const http  = require('http');
const { URL } = require('url');
const ecosystemBus = require('./ecosystem-bus');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const APP_VERSION      = '1.0';
const CONFIG_PATH      = path.join(os.homedir(), 'cybertools-config.json');
const DATA_DIR         = path.join(os.homedir(), '.cyberlab-companion');
const SESSIONS_DIR     = path.join(DATA_DIR, 'sessions');
const ENCRYPTED_KEY_FILE = path.join(DATA_DIR, 'apikey.enc');
const PROGRESS_FILE    = path.join(DATA_DIR, 'progress.json');
const LAB_TRACKER_FILE = path.join(DATA_DIR, 'labs.json');
const SNIPPETS_FILE    = path.join(DATA_DIR, 'snippets.json');
const CLAUDE_API_URL   = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL     = 'claude-sonnet-4-20250514';
const UPDATE_CHECK_URL = 'https://api.github.com/repos/ItsEliias/cyberlab-companion/releases/latest';

let mainWindow = null;
let apiKey = null;
let autosaveInterval = null;
let vpnCheckInterval = null;
let launcherInterval = null;

// ─── ENSURE DIRS ─────────────────────────────────────────────────────────────
function ensureDirs() {
  [DATA_DIR, SESSIONS_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch {}
  return {};
}

function saveConfig(cfg) {
  try {
    let existing = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try { existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
    }
    const merged = { ...existing, ...cfg };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('saveConfig error:', e.message);
    return false;
  }
}

// ─── API KEY (safeStorage) ───────────────────────────────────────────────────
function saveApiKeySecure(key) {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(key);
      fs.writeFileSync(ENCRYPTED_KEY_FILE, encrypted);
    } else {
      // Fallback: base64 obfuscation (not true encryption but avoids plaintext)
      fs.writeFileSync(ENCRYPTED_KEY_FILE + '.b64', Buffer.from(key).toString('base64'));
    }
    apiKey = key;
    return true;
  } catch (e) {
    console.error('saveApiKey error:', e.message);
    return false;
  }
}

function loadApiKeySecure() {
  try {
    if (fs.existsSync(ENCRYPTED_KEY_FILE)) {
      if (safeStorage.isEncryptionAvailable()) {
        const enc = fs.readFileSync(ENCRYPTED_KEY_FILE);
        return safeStorage.decryptString(enc);
      }
    }
    const b64file = ENCRYPTED_KEY_FILE + '.b64';
    if (fs.existsSync(b64file)) {
      return Buffer.from(fs.readFileSync(b64file, 'utf8'), 'base64').toString('utf8');
    }
  } catch {}
  return null;
}

// ─── FETCH HELPER (Node built-in https/http) ─────────────────────────────────
function fetchJSON(url, opts = {}, _hops = 0) {
  return new Promise((resolve, reject) => {
    if (_hops > 5) return reject(new Error('Too many redirects'));
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: { 'Accept': 'application/json', ...(opts.headers || {}) },
    };
    const req = mod.request(reqOpts, (res) => {
      // Follow redirects automatically (301/302/303/307/308)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const loc = res.headers.location;
        const nextUrl = loc.startsWith('http') ? loc : new URL(loc, url).href;
        resolve(fetchJSON(nextUrl, opts, _hops + 1));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data, raw: true }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ─── CLAUDE API ──────────────────────────────────────────────────────────────
async function callClaude(payload) {
  if (!apiKey) throw new Error('No API key configured');

  const body = JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: payload.system || '',
    messages: payload.messages || [],
  });

  return new Promise((resolve, reject) => {
    const parsed = new URL(CLAUDE_API_URL);
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error?.message || `API error ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error('Failed to parse API response'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('API request timeout')); });
    req.write(body);
    req.end();
  });
}

// ─── VPN DETECTION ───────────────────────────────────────────────────────────
const VPN_INTERFACES = ['tun0','tun1','tap0','tap1','ppp0','ppp1','utun0','utun1','utun2','utun3','utun4','utun5','wg0'];

function checkVPN() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of VPN_INTERFACES) {
      if (interfaces[name]) {
        const iface = interfaces[name];
        const ipv4 = iface.find(i => i.family === 'IPv4' && !i.internal);
        if (ipv4) {
          return { status: 'active', interface: name, ip: ipv4.address };
        }
      }
    }
    return { status: 'off' };
  } catch {
    return { status: 'unknown' };
  }
}

// ─── UPDATE CHECKER ──────────────────────────────────────────────────────────
async function checkForUpdates() {
  try {
    const cfg = loadConfig();
    const updateUrl = cfg.updateCheckUrl || UPDATE_CHECK_URL;
    const result = await fetchJSON(updateUrl, {
      headers: { 'User-Agent': 'CYBERLAB-COMPANION/1.0', 'Accept': 'application/vnd.github+json' }
    });
    if (result.status === 200 && result.data.tag_name) {
      const latest = result.data.tag_name.replace(/^v/, '');
      if (latest !== APP_VERSION && semverGt(latest, APP_VERSION)) {
        return { available: true, version: latest, url: result.data.html_url };
      }
    }
    return { available: false };
  } catch {
    return { available: false };
  }
}

function semverGt(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0, nb = pb[i] || 0;
    if (na > nb) return true;
    if (na < nb) return false;
  }
  return false;
}

// ─── OBSIDIAN VAULT SCANNER ──────────────────────────────────────────────────
function scanVaultForNotes(vaultPath) {
  if (!vaultPath || !fs.existsSync(vaultPath)) return [];
  const notes = [];
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach(e => {
        if (e.isDirectory() && !e.name.startsWith('.')) {
          walk(path.join(dir, e.name));
        } else if (e.name.endsWith('.md')) {
          notes.push(e.name.replace(/\.md$/, ''));
        }
      });
    } catch {}
  }
  walk(vaultPath);
  return notes;
}

// ─── WRITEUP: SAVE TO OBSIDIAN ───────────────────────────────────────────────
function saveWriteupToVault(content, labName, platform, vaultPath) {
  if (!vaultPath) throw new Error('No Obsidian vault path configured');
  const writeupDir = path.join(vaultPath, 'Writeups', platform || 'Other');
  if (!fs.existsSync(writeupDir)) fs.mkdirSync(writeupDir, { recursive: true });
  const filename = `${labName.replace(/[^a-zA-Z0-9 -]/g, '').trim()}.md`;
  const fullPath = path.join(writeupDir, filename);
  fs.writeFileSync(fullPath, content, 'utf8');
  return fullPath;
}

// ─── LAUNCHER INTEGRATION ────────────────────────────────────────────────────
function registerWithLauncher() {
  try {
    saveConfig({
      cyberlab: {
        installed: true,
        version: APP_VERSION,
        execPath: app.getPath('exe'),
      }
    });
  } catch {}
}

function updateLauncherStatus(status) {
  try {
    saveConfig({ cyberlab_status: { ...status, lastActive: new Date().toISOString() } });
  } catch {}
}

// ─── WINDOW ──────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 750,
    title: 'CYBERLAB COMPANION — ItsEliias',
    backgroundColor: '#0e1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
    show: false,
    autoHideMenuBar: true,
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── IPC HANDLERS ────────────────────────────────────────────────────────────
function registerIPC() {

  // Config
  ipcMain.handle('get-config', () => loadConfig());
  ipcMain.handle('save-config', (_, cfg) => saveConfig(cfg));
  ipcMain.handle('get-output-dir', () => DATA_DIR);

  // API Key
  ipcMain.handle('save-api-key', (_, key) => {
    const ok = saveApiKeySecure(key);
    saveConfig({ apiKeyConfigured: true });
    return ok;
  });
  ipcMain.handle('has-api-key', () => {
    const key = loadApiKeySecure();
    return !!key;
  });
  ipcMain.handle('test-api-key', async (_, keyToTest) => {
    const prevKey = apiKey;
    apiKey = keyToTest;
    try {
      const result = await callClaude({
        system: 'You are a test assistant.',
        messages: [{ role: 'user', content: 'Say "ok" in one word.' }]
      });
      const ok = result.content?.[0]?.text?.toLowerCase().includes('ok') ||
                 result.content?.[0]?.type === 'text';
      apiKey = keyToTest; // Keep it if valid
      return { success: true };
    } catch (e) {
      apiKey = prevKey;
      return { success: false, error: e.message };
    }
  });

  // Claude API
  ipcMain.handle('claude-chat', async (_, payload) => {
    try {
      const result = await callClaude(payload);
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Sessions
  ipcMain.handle('save-session', (_, data) => {
    try {
      const filename = path.join(SESSIONS_DIR, `session_${data.id}.json`);
      fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
      const sessionName = data.name || data.labName || data.id || 'Unknown';
      ecosystemBus.emitEvent('CyberLab', 'cyberlab.session.started', { name: sessionName });
      return { success: true, path: filename };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle('load-session', (_, id) => {
    try {
      const filename = path.join(SESSIONS_DIR, `session_${id}.json`);
      if (!fs.existsSync(filename)) return null;
      return JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch { return null; }
  });
  ipcMain.handle('list-sessions', () => {
    try {
      const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
      return files.map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8')); }
        catch { return null; }
      }).filter(Boolean);
    } catch { return []; }
  });
  ipcMain.handle('delete-session', (_, id) => {
    try {
      const filename = path.join(SESSIONS_DIR, `session_${id}.json`);
      if (fs.existsSync(filename)) fs.unlinkSync(filename);
      return true;
    } catch { return false; }
  });

  // Writeups
  ipcMain.handle('save-writeup', (_, { content, labName, platform, vaultPath }) => {
    try {
      const savedPath = saveWriteupToVault(content, labName, platform, vaultPath);
      return { success: true, path: savedPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle('export-pdf', async (_, { content, labName }) => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: `${labName || 'writeup'}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (!filePath) return { success: false, error: 'Cancelled' };
      const pdfData = await mainWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
      });
      fs.writeFileSync(filePath, pdfData);
      return { success: true, path: filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Vault
  ipcMain.handle('scan-vault', (_, vaultPath) => {
    return scanVaultForNotes(vaultPath);
  });
  ipcMain.handle('pick-folder', async () => {
    const { filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return filePaths[0] || null;
  });

  // VPN
  ipcMain.handle('check-vpn', () => checkVPN());

  // Update
  ipcMain.handle('check-update', () => checkForUpdates());

  // HTB / THM
  ipcMain.handle('sync-htb', async (_, apiKey) => {
    if (!apiKey) return { success: false, error: 'No HTB API key — add it in Settings first' };
    try {
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; CyberLab/1.0)',
      };

      // Step 1: Decode user ID directly from the JWT payload (no network call needed)
      let userId = null;
      try {
        const parts = apiKey.split('.');
        if (parts.length === 3) {
          const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
          userId = payload.sub || payload.id || payload.user_id || null;
        }
      } catch (_) {}

      // Step 2: Verify auth + get user ID if not in JWT
      // HTB app tokens work at both www and app subdomains — try both
      const authEndpoints = [
        'https://www.hackthebox.com/api/v4/user/info',
        'https://app.hackthebox.com/api/v4/user/info',
        'https://www.hackthebox.com/api/v4/profile/activity',
      ];
      let authOk = false;
      for (const ep of authEndpoints) {
        const res = await fetchJSON(ep, { headers });
        if (res.status === 401 || res.status === 403) {
          throw new Error('Invalid HTB API key — check Settings');
        }
        if (res.status === 200 && !res.raw) {
          authOk = true;
          if (!userId) {
            userId = res.data?.id
              || res.data?.info?.id
              || res.data?.user?.id
              || res.data?.profile?.id
              || res.data?.data?.id
              || res.data?.data?.profile?.id;
          }
          // Also harvest machines from activity feed while we have the response
          if (ep.includes('activity')) {
            const items = res.data?.activity || res.data?.data?.activity || [];
            for (const item of items) {
              if (item.object_type === 'Machine' || item.type === 'machine') {
                const name = item.name || item.machine_name;
                if (name) _activityMachines.set(name, {
                  name, platform: 'HTB',
                  difficulty: item.difficulty || item.difficultyText || '',
                  os: item.os || '', url: '', notes: '', ip: '',
                });
              }
            }
          }
          break;
        }
      }
      if (!authOk) throw new Error('HTB auth failed — could not reach API');

      // Collect activity-feed machines in a Map (keyed by name for dedup)
      const _activityMachines = new Map();
      // Re-fetch activity if not already done above
      if (_activityMachines.size === 0) {
        const actRes = await fetchJSON('https://www.hackthebox.com/api/v4/profile/activity', { headers });
        if (actRes.status === 200 && !actRes.raw) {
          const items = actRes.data?.activity || actRes.data?.data?.activity || [];
          for (const item of items) {
            if (item.object_type === 'Machine' || item.type === 'machine') {
              const name = item.name || item.machine_name;
              if (name) _activityMachines.set(name, {
                name, platform: 'HTB',
                difficulty: item.difficulty || item.difficultyText || '',
                os: item.os || '', url: '', notes: '', ip: '',
              });
            }
          }
        }
      }

      // Step 3: Try every known machine-list endpoint pattern
      const machineEndpoints = [];
      if (userId) {
        const id = Number(userId);
        machineEndpoints.push(
          `https://www.hackthebox.com/api/v4/profile/${id}/machines/owns`,
          `https://app.hackthebox.com/api/v4/profile/${id}/machines/owns`,
          `https://www.hackthebox.com/api/v4/user/profile/progress/machines/${id}`,
          `https://app.hackthebox.com/api/v4/user/profile/progress/machines/${id}`,
        );
      }
      // Non-ID endpoints
      machineEndpoints.push(
        'https://www.hackthebox.com/api/v4/user/profile/progress/machines',
        'https://app.hackthebox.com/api/v4/user/profile/progress/machines',
        'https://www.hackthebox.com/api/v4/machine/owns',
        'https://app.hackthebox.com/api/v4/machine/owns',
      );

      for (const ep of machineEndpoints) {
        let res;
        try { res = await fetchJSON(ep, { headers }); } catch { continue; }
        if (res.status !== 200 || res.raw) continue;
        const machines = res.data?.profile?.owns
          || res.data?.profile?.machine?.owns
          || res.data?.owns
          || res.data?.machines
          || res.data?.data?.machines
          || res.data?.data
          || [];
        if (Array.isArray(machines) && machines.length > 0) {
          const labs = machines.map(m => ({
            name:       m.name || m.machine_name || 'Unknown',
            platform:   'HTB',
            difficulty: m.difficultyText || m.difficulty || m.rating || '',
            os:         m.os || '',
            url:        m.id ? `https://app.hackthebox.com/machines/${m.id}` : '',
            notes: '', ip: '',
          }));
          ecosystemBus.emitEvent('CyberLab', 'cyberlab.htb.synced', { count: labs.length });
          return { success: true, labs };
        }
      }

      // Step 4: Fall back to activity-derived machines (recent only)
      const activityLabs = Array.from(_activityMachines.values());
      if (activityLabs.length > 0) {
        ecosystemBus.emitEvent('CyberLab', 'cyberlab.htb.synced', { count: activityLabs.length });
        return {
          success: true, labs: activityLabs, partial: true,
          partialMsg: `Showing ${activityLabs.length} recent machines from your activity feed. HTB's full machine history endpoint may require a different API key type — try generating a new key at app.hackthebox.com → Profile → API Key.`,
        };
      }

      // Auth worked but truly no data
      return {
        success: true, labs: [], partial: true,
        partialMsg: 'HTB auth successful but no machines found. Complete some machines on HTB first, or use Bulk Import to add them manually.',
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle('sync-thm', async (_, username) => {
    if (!username) return { success: false, error: 'No THM username — add it in Settings first' };
    try {
      // Try the public profile endpoint — fetchJSON now follows redirects automatically
      const result = await fetchJSON(
        `https://tryhackme.com/api/user/${encodeURIComponent(username)}`,
        { headers: { 'Accept': 'application/json' } }
      );

      // If the response is HTML (redirected to login page), the server requires auth
      if (result.raw) {
        throw new Error('THM requires authentication for this data — use Bulk Import to add rooms manually');
      }
      if (result.status === 404) throw new Error(`THM user "${username}" not found — check spelling in Settings`);
      if (result.status !== 200) throw new Error(`THM API returned ${result.status}`);

      const data = result.data || {};
      if (data.success === false) throw new Error(`THM user "${username}" not found — check spelling in Settings`);

      // Response shape: { completedRooms: [{title, code, difficulty, ...}] }
      const rooms = data.completedRooms || data.completed_rooms || data.rooms || [];
      if (!Array.isArray(rooms) || rooms.length === 0) {
        // Profile found but no room list — THM may have restricted this endpoint
        throw new Error('THM profile found but no room list returned — use Bulk Import to add rooms manually');
      }

      const thmLabs = rooms.map(r => ({
        name:       r.title || r.roomName || r.name || 'Unknown Room',
        platform:   'THM',
        difficulty: r.difficulty || '',
        os:         '',
        url:        r.code ? `https://tryhackme.com/room/${r.code}` : '',
        notes:      '', ip: '',
      }));
      ecosystemBus.emitEvent('CyberLab', 'cyberlab.thm.synced', { count: thmLabs.length });
      return { success: true, labs: thmLabs };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Launcher
  ipcMain.handle('update-launcher-status', (_, status) => {
    updateLauncherStatus(status);
  });

  // Ecosystem event bus
  ipcMain.handle('ecosystem-emit', (_, appName, eventType, data) => {
    ecosystemBus.emitEvent(appName, eventType, data);
    return true;
  });

  // Persistent data
  ipcMain.handle('save-progress', (_, data) => {
    try {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch { return false; }
  });
  ipcMain.handle('load-progress', () => {
    try {
      if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch {}
    return null;
  });
  ipcMain.handle('save-lab-tracker', (_, data) => {
    try {
      fs.writeFileSync(LAB_TRACKER_FILE, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch { return false; }
  });
  ipcMain.handle('load-lab-tracker', () => {
    try {
      if (fs.existsSync(LAB_TRACKER_FILE)) return JSON.parse(fs.readFileSync(LAB_TRACKER_FILE, 'utf8'));
    } catch {}
    return null;
  });
  ipcMain.handle('save-snippets', (_, data) => {
    try {
      fs.writeFileSync(SNIPPETS_FILE, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch { return false; }
  });
  ipcMain.handle('load-snippets', () => {
    try {
      if (fs.existsSync(SNIPPETS_FILE)) return JSON.parse(fs.readFileSync(SNIPPETS_FILE, 'utf8'));
    } catch {}
    return null;
  });

  // Shell / misc
  ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
  ipcMain.handle('get-version', () => APP_VERSION);
  ipcMain.handle('get-platform', () => process.platform);
}

// ─── BACKGROUND INTERVALS ────────────────────────────────────────────────────
function startIntervals() {
  // VPN check every 30 seconds
  vpnCheckInterval = setInterval(() => {
    if (mainWindow) {
      mainWindow.webContents.send('vpn-status', checkVPN());
    }
  }, 30000);

  // Autosave signal every 60 seconds
  autosaveInterval = setInterval(() => {
    if (mainWindow) {
      mainWindow.webContents.send('autosave-tick');
    }
  }, 60000);

  // Launcher status every 10 seconds
  launcherInterval = setInterval(() => {
    // Status is pushed from renderer via IPC; launcher interval is a no-op here
    // The renderer calls update-launcher-status when state changes
  }, 10000);
}

function stopIntervals() {
  clearInterval(vpnCheckInterval);
  clearInterval(autosaveInterval);
  clearInterval(launcherInterval);
}

// ─── APP LIFECYCLE ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  ensureDirs();

  // Load API key at startup
  apiKey = loadApiKeySecure();

  // Register IPC handlers
  registerIPC();

  // Create window
  createWindow();

  // Register with launcher
  registerWithLauncher();

  // Start background intervals
  startIntervals();

  // Check for updates after window is ready (non-blocking)
  setTimeout(async () => {
    const update = await checkForUpdates();
    if (update.available && mainWindow) {
      mainWindow.webContents.send('update-available', update);
    }
  }, 3000);

  // Handle --launcher-open flag
  if (process.argv.includes('--launcher-open')) {
    mainWindow?.show();
    mainWindow?.focus();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('window-all-closed', () => {
  stopIntervals();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopIntervals();
  // Clear launcher status
  try { updateLauncherStatus({ activeSession: null, elapsedTime: null, hintLevel: 1, streak: 0 }); } catch {}
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});
