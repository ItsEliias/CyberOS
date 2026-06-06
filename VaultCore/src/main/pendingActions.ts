// VaultCore — pendingActions.ts
// Consumes tray-menu action entries from the shared cybertools-config.json.
// The Launcher writes `pending_actions: [{ app, action, requestedAt }]`; this
// helper finds the first entry matching this app's key, splices it out, and
// writes the file back. Defensive against missing / malformed config.

import fs from 'fs';
import path from 'path';
import os from 'os';

const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json');

/**
 * Atomic write to ~/cybertools-config.json. Every CyberOS app reads this
 * file for SSO + pending actions; a partial write (process killed mid-flush,
 * disk full, etc.) would corrupt JSON and bounce every running app through
 * the lock screen. Matches the tmp+rename pattern used in sibling apps.
 */
function writeConfigAtomic(cfg: unknown): void {
  const tmp = `${CYBERTOOLS_CONFIG}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmp, CYBERTOOLS_CONFIG);
}

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
        try { writeConfigAtomic(cfg) } catch {}
        return null
      }
    }

    list.splice(idx, 1);
    cfg.pending_actions = list;
    writeConfigAtomic(cfg);
    return { action: entry.action };
  } catch {
    return null;
  }
}


// Watch ~/cybertools-config.json for new pending actions while the app is
// already running. Debounced + de-duped: only the LATEST `requestedAt` for
// the current appKey is acted on. The watcher fires `consumePendingAction`
// itself so the entry is spliced out atomically.
let watcherInstalled = false
let lastSeenRequestedAt: string | null = null
export function installPendingActionWatcher(
  appKey: string,
  send: (action: string) => void
): void {
  if (watcherInstalled) return
  watcherInstalled = true
  let debounce: NodeJS.Timeout | null = null
  function check() {
    try {
      if (!fs.existsSync(CYBERTOOLS_CONFIG)) return
      const raw = fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')
      const cfg = JSON.parse(raw) as Record<string, unknown>
      const arr = (cfg as { pending_actions?: unknown }).pending_actions
      if (!Array.isArray(arr)) return
      const mine = arr.find(
        (e: unknown) => !!e && typeof e === 'object' &&
          (e as { app?: string }).app === appKey
      ) as { action?: string; requestedAt?: string } | undefined
      if (!mine?.action || mine.requestedAt === lastSeenRequestedAt) return
      lastSeenRequestedAt = mine.requestedAt ?? null
      const result = consumePendingAction(appKey)
      if (result) send(result.action)
    } catch { /* swallow */ }
  }
  try {
    fs.watchFile(CYBERTOOLS_CONFIG, { interval: 1500 }, () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(check, 100)
    })
  } catch { /* ignore */ }
  // Initial check in case an action was queued between consume + watch.
  setTimeout(check, 200)
}
