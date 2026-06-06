// GhostVault — pendingActions.ts
// Consumes tray-menu action entries from the shared cybertools-config.json.
// The Launcher writes `pending_actions: [{ app, action, requestedAt }]`; this
// helper finds the first entry matching this app's key, splices it out, and
// writes the file back. Defensive against missing / malformed config.

import fs from 'fs';
import path from 'path';
import os from 'os';

const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json');

interface PendingActionEntry {
  app:         string;
  action:      string;
  requestedAt: string;
}

/**
 * Read pending_actions, splice out the first entry whose `app` matches
 * `appKey`, write the config back, return the splice'd action id. Returns
 * null on any error or when no matching entry exists.
 */
export function consumePendingAction(appKey: string): { action: string } | null {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return null;
    const raw = fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8');
    const cfg = JSON.parse(raw) as Record<string, unknown>;
    const list = cfg.pending_actions;
    if (!Array.isArray(list)) return null;

    const idx = list.findIndex(
      e => e && typeof e === 'object' && (e as PendingActionEntry).app === appKey
    );
    if (idx === -1) return null;

    const entry = list[idx] as PendingActionEntry;
    if (!entry?.action || typeof entry.action !== 'string') return null;

    // Skip stale entries (>30 min) — likely the user clicked the tray
    // ages ago and no longer wants the action. Still splice it out so it
    // doesn't pile up in the queue.
    const STALE_MS = 30 * 60 * 1000
    if (entry.requestedAt) {
      const age = Date.now() - new Date(entry.requestedAt).getTime()
      if (Number.isFinite(age) && age > STALE_MS) {
        list.splice(idx, 1)
        cfg.pending_actions = list
        try { fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(cfg, null, 2), 'utf8') } catch {}
        return null
      }
    }

    list.splice(idx, 1);
    cfg.pending_actions = list;
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(cfg, null, 2), 'utf8');
    return { action: entry.action };
  } catch {
    return null;
  }
}
