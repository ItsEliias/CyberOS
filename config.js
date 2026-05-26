'use strict';
/**
 * config.js — cybertools-config.json read/write management
 * All I/O is synchronous and guarded; never corrupts the config file.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const CONFIG_PATH         = path.join(os.homedir(), 'cybertools-config.json');
const MAX_ACTIVITY        = 50;

// ─── Defaults ────────────────────────────────────────────────────────────────

function getDefaultConfig() {
  return {
    obsidianVaultPath : '',
    theme             : 'stealth',
    cyberlab: {
      installed : false,
      execPath  : ''
    },
    cyberlab_status : null,
    vaultscraper: {
      installed : false,
      execPath  : ''
    },
    vaultscraper_status  : null,
    vaultscraper_trigger : null,
    ghostvault: {
      name    : 'GhostVault',
      execPath: ''
    },
    ghostvault_status: null,
    launcher: {
      customSlots   : [],
      activityFeed  : [],
      updateUrl     : ''
    }
  };
}

// ─── Deep-merge helper ───────────────────────────────────────────────────────

function mergeWithDefaults(raw) {
  const def = getDefaultConfig();
  const out = Object.assign({}, def, raw);

  // Nested objects — merge shallowly one level down
  out.cyberlab     = Object.assign({}, def.cyberlab,     raw.cyberlab     || {});
  out.vaultscraper = Object.assign({}, def.vaultscraper, raw.vaultscraper || {});
  out.ghostvault   = Object.assign({}, def.ghostvault,   raw.ghostvault   || {});

  const rawLauncher = raw.launcher || {};
  out.launcher = {
    customSlots  : Array.isArray(rawLauncher.customSlots)  ? rawLauncher.customSlots  : [],
    activityFeed : Array.isArray(rawLauncher.activityFeed) ? rawLauncher.activityFeed : [],
    updateUrl    : rawLauncher.updateUrl || ''
  };

  return out;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const def = getDefaultConfig();
      writeConfig(def);
      return def;
    }
    const raw    = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return mergeWithDefaults(parsed);
  } catch (err) {
    console.error('[config] Read error:', err.message);
    return getDefaultConfig();
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────
// Write to a temp file then rename — atomic on POSIX, best-effort on Windows.

function writeConfig(config) {
  try {
    const json    = JSON.stringify(config, null, 2);
    const tmpPath = CONFIG_PATH + '.tmp';
    fs.writeFileSync(tmpPath, json, 'utf8');
    fs.renameSync(tmpPath, CONFIG_PATH);
    return true;
  } catch (err) {
    console.error('[config] Write error:', err.message);
    // Last-resort: try writing directly
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
      return true;
    } catch (e2) {
      console.error('[config] Direct write also failed:', e2.message);
      return false;
    }
  }
}

// ─── Read-modify-write ────────────────────────────────────────────────────────

function updateConfig(updaterFn) {
  try {
    const current = readConfig();
    const updated = updaterFn(current);
    return writeConfig(updated);
  } catch (err) {
    console.error('[config] updateConfig error:', err.message);
    return false;
  }
}

// ─── Activity feed ────────────────────────────────────────────────────────────

/**
 * entry: { type: 'cyberlab'|'vaultscraper'|'launcher'|'error', text: string }
 */
function addActivityEntry(entry) {
  return updateConfig(config => {
    const feed = Array.isArray(config.launcher.activityFeed)
      ? config.launcher.activityFeed
      : [];

    feed.unshift({
      type      : entry.type      || 'launcher',
      text      : entry.text      || '',
      timestamp : entry.timestamp || new Date().toISOString()
    });

    // Cap at MAX_ACTIVITY
    if (feed.length > MAX_ACTIVITY) {
      feed.length = MAX_ACTIVITY;
    }

    config.launcher.activityFeed = feed;
    return config;
  });
}

function clearActivityFeed() {
  return updateConfig(config => {
    config.launcher.activityFeed = [];
    return config;
  });
}

// ─── VaultCore quick trigger ──────────────────────────────────────────────────

function writeTrigger(triggerData) {
  return updateConfig(config => {
    config.vaultscraper_trigger = Object.assign(
      {},
      triggerData,
      { timestamp: new Date().toISOString() }
    );
    return config;
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  CONFIG_PATH,
  getDefaultConfig,
  readConfig,
  writeConfig,
  updateConfig,
  addActivityEntry,
  clearActivityFeed,
  writeTrigger
};
