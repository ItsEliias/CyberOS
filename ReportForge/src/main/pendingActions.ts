// ReportForge — Pending action consumer
// Reads the tray-menu queue from `~/cybertools-config.json`, finds the first
// entry targeted at this app, splices it out, and returns its action id.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { sharedConfigPath } from './platform';

const CYBERTOOLS_CONFIG = sharedConfigPath();

interface PendingActionEntry {
  app:         string;
  action:      string;
  requestedAt: string;
}

export interface ConsumedAction {
  action: string;
}

// Atomic write — tmp + rename so a crash mid-write can't leave a
// half-written cybertools-config.json that breaks every cooperating app.
function writeConfigAtomic(cfg: unknown): void {
  const tmp = `${CYBERTOOLS_CONFIG}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmp, CYBERTOOLS_CONFIG);
}

export function consumePendingAction(appKey: string): ConsumedAction | null {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return null;

    let raw: string;
    try { raw = fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'); }
    catch { return null; }

    let shared: Record<string, unknown>;
    try { shared = JSON.parse(raw); }
    catch { return null; }

    const queue = shared.pending_actions;
    if (!Array.isArray(queue)) return null;

    const idx = queue.findIndex((e: unknown): e is PendingActionEntry =>
      !!e && typeof e === 'object'
      && typeof (e as PendingActionEntry).app === 'string'
      && typeof (e as PendingActionEntry).action === 'string'
      && (e as PendingActionEntry).app === appKey
    );
    if (idx === -1) return null;

    const entry = queue[idx] as PendingActionEntry;

    // Skip stale entries (>30 min) — likely the user clicked the tray
    // ages ago and no longer wants the action. Still splice it out so it
    // doesn't pile up in the queue.
    const STALE_MS = 30 * 60 * 1000
    if (entry.requestedAt) {
      const age = Date.now() - new Date(entry.requestedAt).getTime()
      if (Number.isFinite(age) && age > STALE_MS) {
        queue.splice(idx, 1)
        shared.pending_actions = queue
        try { writeConfigAtomic(shared) } catch {}
        return null
      }
    }
    queue.splice(idx, 1);
    shared.pending_actions = queue;

    try { writeConfigAtomic(shared); }
    catch { /* if we can't write it back, still fall through and fire once */ }

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
