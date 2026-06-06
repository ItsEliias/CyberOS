// ReconDesk — pendingActions.ts
// Consumes per-app pending tray-menu actions written into ~/cybertools-config.json
// by the CyberTools Launcher. Defensive: silently no-ops on any I/O or parse error.

import fs from 'fs'
import path from 'path'
import os from 'os'

const CONFIG_PATH = path.join(os.homedir(), 'cybertools-config.json')

interface PendingActionEntry {
  app:         string
  action:      string
  requestedAt: string
}

// Atomic write — tmp + rename so a crash mid-write can't leave a
// half-written cybertools-config.json that breaks every cooperating app.
function writeConfigAtomic(cfg: unknown): void {
  const tmp = `${CONFIG_PATH}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8')
  fs.renameSync(tmp, CONFIG_PATH)
}

/**
 * Find the first pending_actions entry whose `app` matches the given key,
 * remove it from the array, persist the config, and return the matched entry.
 *
 * Returns `null` when the config is missing, malformed, or has no match.
 */
export function consumePendingAction(appKey: string): { action: string } | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
    const cfg = JSON.parse(raw) as Record<string, unknown>

    const list = cfg.pending_actions
    if (!Array.isArray(list)) return null

    const idx = list.findIndex(e =>
      e && typeof e === 'object' &&
      (e as PendingActionEntry).app === appKey &&
      typeof (e as PendingActionEntry).action === 'string'
    )
    if (idx < 0) return null

    const entry = list[idx] as PendingActionEntry

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
    list.splice(idx, 1)
    cfg.pending_actions = list

    writeConfigAtomic(cfg)
    return { action: entry.action }
  } catch {
    return null
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
      if (!fs.existsSync(CONFIG_PATH)) return
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
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
    fs.watchFile(CONFIG_PATH, { interval: 1500 }, () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(check, 100)
    })
  } catch { /* ignore */ }
  // Initial check in case an action was queued between consume + watch.
  setTimeout(check, 200)
}
