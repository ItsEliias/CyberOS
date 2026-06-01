'use strict';
// launcher.js — CyberLab integration, config management, status writer, update checker
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const CONFIG_PATH = path.join(os.homedir(), 'cybertools-config.json');
const UPDATE_CHECK_URL = 'https://api.github.com/repos/itsEliias/vaultcore/releases/latest';
const APP_VERSION = '1.0.0';

let statusInterval = null;
let getStatusFn = null; // injected from main

// ─── Config helpers ────────────────────────────────────────────────────────────

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[launcher] Failed to read config:', e.message);
  }
  return null;
}

function writeConfig(data) {
  try {
    let existing = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try { existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch (_) {}
    }
    const merged = Object.assign({}, existing, data);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[launcher] Failed to write config:', e.message);
    return false;
  }
}

function getVaultPath() {
  const cfg = readConfig();
  return cfg ? (cfg.obsidianVaultPath || null) : null;
}

function getTheme() {
  const cfg = readConfig();
  return cfg ? (cfg.theme || 'stealth') : 'stealth';
}

function setVaultPath(vaultPath) {
  return writeConfig({ obsidianVaultPath: vaultPath });
}

function setTheme(theme) {
  return writeConfig({ theme });
}

function configExists() {
  return fs.existsSync(CONFIG_PATH);
}

// ─── App registration ──────────────────────────────────────────────────────────

function registerPresence(execPath) {
  writeConfig({
    vaultscraper: {
      installed: true,
      version: APP_VERSION,
      execPath: execPath || process.execPath
    }
  });
}

// ─── Status writer ─────────────────────────────────────────────────────────────

function startStatusWriter(statusProvider) {
  getStatusFn = statusProvider;
  if (statusInterval) clearInterval(statusInterval);
  statusInterval = setInterval(() => {
    writeStatusTick();
  }, 10000);
  writeStatusTick(); // immediate first write
}

function stopStatusWriter() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

function writeStatusTick() {
  const status = getStatusFn ? getStatusFn() : getDefaultStatus();
  writeConfig({ vaultscraper_status: status });
}

function getDefaultStatus() {
  return {
    activeScrape: null,
    scrapeProgress: null,
    totalSources: 0,
    lastScrape: null,
    nextScheduled: null,
    vaultNoteCount: 0
  };
}

// ─── CyberLab detection ────────────────────────────────────────────────────────

function isCyberLabInstalled() {
  const cfg = readConfig();
  return cfg && cfg.cyberlab && cfg.cyberlab.installed === true;
}

function getCyberLabExecPath() {
  const cfg = readConfig();
  return cfg && cfg.cyberlab ? cfg.cyberlab.execPath : null;
}

function openCyberLab() {
  const execPath = getCyberLabExecPath();
  if (!execPath) return false;
  try {
    const { spawn } = require('child_process');
    spawn(execPath, ['--launcher-open'], { detached: true, stdio: 'ignore' }).unref();
    return true;
  } catch (e) {
    console.error('[launcher] Failed to open CyberLab:', e.message);
    return false;
  }
}

// ─── Update checker ────────────────────────────────────────────────────────────

function checkForUpdates(callback) {
  try {
    const url = new URL(UPDATE_CHECK_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': `VaultCore/${APP_VERSION}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 8000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latestVersion = release.tag_name ? release.tag_name.replace(/^v/, '') : null;
          if (latestVersion && isNewerVersion(latestVersion, APP_VERSION)) {
            callback(null, {
              hasUpdate: true,
              version: latestVersion,
              url: release.html_url,
              notes: release.body ? release.body.slice(0, 500) : ''
            });
          } else {
            callback(null, { hasUpdate: false });
          }
        } catch (e) {
          callback(null, { hasUpdate: false });
        }
      });
    });

    req.on('error', () => callback(null, { hasUpdate: false }));
    req.on('timeout', () => { req.destroy(); callback(null, { hasUpdate: false }); });
    req.end();
  } catch (e) {
    callback(null, { hasUpdate: false });
  }
}

function isNewerVersion(latestStr, currentStr) {
  const parse = v => v.split('.').map(Number);
  const latest = parse(latestStr);
  const current = parse(currentStr);
  for (let i = 0; i < 3; i++) {
    if ((latest[i] || 0) > (current[i] || 0)) return true;
    if ((latest[i] || 0) < (current[i] || 0)) return false;
  }
  return false;
}

// ─── Vault note count ──────────────────────────────────────────────────────────

function countVaultNotes(vaultPath) {
  if (!vaultPath || !fs.existsSync(vaultPath)) return 0;
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
  return count;
}

module.exports = {
  readConfig,
  writeConfig,
  getVaultPath,
  getTheme,
  setVaultPath,
  setTheme,
  configExists,
  registerPresence,
  startStatusWriter,
  stopStatusWriter,
  writeStatusTick,
  isCyberLabInstalled,
  getCyberLabExecPath,
  openCyberLab,
  checkForUpdates,
  countVaultNotes,
  APP_VERSION,
  CONFIG_PATH
};
