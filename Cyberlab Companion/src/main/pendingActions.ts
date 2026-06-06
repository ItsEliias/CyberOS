// Cyberlab Companion — Pending action consumer
// Reads the tray-menu queue from `~/cybertools-config.json`, finds the first
// entry targeted at this app, splices it out, and returns its action id.

import fs from 'fs';
import os from 'os';
import path from 'path';

const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json');

interface PendingActionEntry {
  app:         string;
  action:      string;
  requestedAt: string;
}

export interface ConsumedAction {
  action: string;
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
    queue.splice(idx, 1);
    shared.pending_actions = queue;

    try { fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8'); }
    catch { /* if we can't write it back, still fall through and fire once */ }

    return { action: entry.action };
  } catch {
    return null;
  }
}
