import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CyberToolsConfig, ActivityEntry } from '../shared/types.js';

export const CONFIG_PATH = path.join(os.homedir(), 'cybertools-config.json');
const MAX_ACTIVITY = 50;

function getDefaultConfig(): CyberToolsConfig {
  return {
    obsidianVaultPath: '',
    theme: 'stealth',
    cyberlab: { installed: false, execPath: '' },
    cyberlab_status: null,
    vaultscraper: { installed: false, execPath: '' },
    vaultscraper_status: null,
    vaultscraper_trigger: null,
    ghostvault: { name: 'GhostVault', execPath: '' },
    ghostvault_status: null,
    recondesk: { execPath: '' },
    recondesk_status: null,
    signalboard: { execPath: '' },
    signalboard_status: null,
    cyberos: { execPath: '' },
    cyberos_status: null,
    launcher: { customSlots: [], activityFeed: [], updateUrl: '' }
  };
}

function mergeWithDefaults(raw: Partial<CyberToolsConfig>): CyberToolsConfig {
  const def = getDefaultConfig();
  const out = { ...def, ...raw } as CyberToolsConfig;

  out.cyberlab     = { ...def.cyberlab,     ...(raw.cyberlab     || {}) };
  out.vaultscraper = { ...def.vaultscraper, ...(raw.vaultscraper || {}) };
  out.ghostvault   = { ...def.ghostvault,   ...(raw.ghostvault   || {}) };
  out.recondesk    = { ...def.recondesk,    ...(raw.recondesk    || {}) };
  out.signalboard  = { ...def.signalboard,  ...(raw.signalboard  || {}) };
  out.cyberos      = { ...def.cyberos,      ...(raw.cyberos      || {}) };

  const rawLauncher = raw.launcher || {};
  out.launcher = {
    customSlots : Array.isArray(rawLauncher.customSlots)  ? rawLauncher.customSlots  : [],
    activityFeed: Array.isArray(rawLauncher.activityFeed) ? rawLauncher.activityFeed : [],
    updateUrl   : rawLauncher.updateUrl || ''
  };

  return out;
}

export function readConfig(): CyberToolsConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const def = getDefaultConfig();
      writeConfig(def);
      return def;
    }
    const raw    = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<CyberToolsConfig>;
    return mergeWithDefaults(parsed);
  } catch (err) {
    console.error('[config] Read error:', (err as Error).message);
    return getDefaultConfig();
  }
}

export function writeConfig(config: CyberToolsConfig): boolean {
  try {
    const json    = JSON.stringify(config, null, 2);
    const tmpPath = CONFIG_PATH + '.tmp';
    fs.writeFileSync(tmpPath, json, 'utf8');
    fs.renameSync(tmpPath, CONFIG_PATH);
    return true;
  } catch (err) {
    console.error('[config] Write error:', (err as Error).message);
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
      return true;
    } catch (e2) {
      console.error('[config] Direct write also failed:', (e2 as Error).message);
      return false;
    }
  }
}

export function updateConfig(updaterFn: (cfg: CyberToolsConfig) => CyberToolsConfig): boolean {
  try {
    const current = readConfig();
    const updated = updaterFn(current);
    return writeConfig(updated);
  } catch (err) {
    console.error('[config] updateConfig error:', (err as Error).message);
    return false;
  }
}

export function addActivityEntry(entry: Partial<ActivityEntry>): boolean {
  return updateConfig(config => {
    const feed = Array.isArray(config.launcher.activityFeed)
      ? config.launcher.activityFeed
      : [];

    feed.unshift({
      type     : (entry.type      || 'launcher') as ActivityEntry['type'],
      text     : entry.text      || '',
      timestamp: entry.timestamp || new Date().toISOString()
    });

    if (feed.length > MAX_ACTIVITY) feed.length = MAX_ACTIVITY;
    config.launcher.activityFeed = feed;
    return config;
  });
}

export function clearActivityFeed(): boolean {
  return updateConfig(config => {
    config.launcher.activityFeed = [];
    return config;
  });
}

export function writeTrigger(triggerData: Record<string, unknown>): boolean {
  return updateConfig(config => {
    config.vaultscraper_trigger = { ...triggerData, timestamp: new Date().toISOString() };
    return config;
  });
}
