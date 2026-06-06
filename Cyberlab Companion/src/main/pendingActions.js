// Cyberlab Companion — Pending action consumer
// Reads the tray-menu queue from `~/cybertools-config.json`, finds the first
// entry targeted at this app, splices it out, and returns its action id.
import fs from 'fs';
import os from 'os';
import path from 'path';
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json');
// Atomic write — tmp + rename so a concurrent reader (Launcher, sibling
// app) never sees a half-written / truncated cybertools-config.json.
// Falls back to direct writeFileSync only if rename itself fails.
function writeSharedAtomic(payload) {
    const json = JSON.stringify(payload, null, 2);
    const tmpPath = CYBERTOOLS_CONFIG + '.tmp';
    try {
        fs.writeFileSync(tmpPath, json, 'utf8');
        fs.renameSync(tmpPath, CYBERTOOLS_CONFIG);
    }
    catch {
        try {
            fs.writeFileSync(CYBERTOOLS_CONFIG, json, 'utf8');
        }
        catch { /* swallow */ }
        try {
            if (fs.existsSync(tmpPath))
                fs.unlinkSync(tmpPath);
        }
        catch { /* swallow */ }
    }
}
export function consumePendingAction(appKey) {
    try {
        if (!fs.existsSync(CYBERTOOLS_CONFIG))
            return null;
        let raw;
        try {
            raw = fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8');
        }
        catch {
            return null;
        }
        let shared;
        try {
            shared = JSON.parse(raw);
        }
        catch {
            return null;
        }
        const queue = shared.pending_actions;
        if (!Array.isArray(queue))
            return null;
        const idx = queue.findIndex((e) => !!e && typeof e === 'object'
            && typeof e.app === 'string'
            && typeof e.action === 'string'
            && e.app === appKey);
        if (idx === -1)
            return null;
        const entry = queue[idx];
        // Skip stale entries (>30 min) — likely the user clicked the tray
        // ages ago and no longer wants the action. Still splice it out so it
        // doesn't pile up in the queue.
        const STALE_MS = 30 * 60 * 1000;
        if (entry.requestedAt) {
            const age = Date.now() - new Date(entry.requestedAt).getTime();
            if (Number.isFinite(age) && age > STALE_MS) {
                queue.splice(idx, 1);
                shared.pending_actions = queue;
                writeSharedAtomic(shared);
                return null;
            }
        }
        queue.splice(idx, 1);
        shared.pending_actions = queue;
        writeSharedAtomic(shared);
        return { action: entry.action };
    }
    catch {
        return null;
    }
}
// Watch ~/cybertools-config.json for new pending actions while the app is
// already running. Debounced + de-duped: only the LATEST `requestedAt` for
// the current appKey is acted on. The watcher fires `consumePendingAction`
// itself so the entry is spliced out atomically.
let watcherInstalled = false;
let lastSeenRequestedAt = null;
export function installPendingActionWatcher(appKey, send) {
    if (watcherInstalled)
        return;
    watcherInstalled = true;
    let debounce = null;
    function check() {
        try {
            if (!fs.existsSync(CYBERTOOLS_CONFIG))
                return;
            const raw = fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8');
            const cfg = JSON.parse(raw);
            const arr = cfg.pending_actions;
            if (!Array.isArray(arr))
                return;
            const mine = arr.find((e) => !!e && typeof e === 'object' &&
                e.app === appKey);
            if (!mine?.action || mine.requestedAt === lastSeenRequestedAt)
                return;
            lastSeenRequestedAt = mine.requestedAt ?? null;
            const result = consumePendingAction(appKey);
            if (result)
                send(result.action);
        }
        catch { /* swallow */ }
    }
    try {
        fs.watchFile(CYBERTOOLS_CONFIG, { interval: 1500 }, () => {
            if (debounce)
                clearTimeout(debounce);
            debounce = setTimeout(check, 100);
        });
    }
    catch { /* ignore */ }
    // Initial check in case an action was queued between consume + watch.
    setTimeout(check, 200);
}
