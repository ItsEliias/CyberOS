// SignalBoard — pendingActions.ts
// Consumes tray-menu queued actions written by the CyberTools Launcher into
// ~/cybertools-config.json under `pending_actions`. Reads, finds the first
// entry matching this app, splices it out, writes back, returns the action.
// Defensive: silent skip on any malformed state.

import fs from 'fs'
import os from 'os'
import path from 'path'

const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')

interface PendingAction {
  app:         string
  action:      string
  requestedAt?: string
}

export function consumePendingAction(appKey: string): { action: string } | null {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return null
    const raw = fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')
    const cfg = JSON.parse(raw) as Record<string, unknown>
    const arr = cfg['pending_actions']
    if (!Array.isArray(arr)) return null

    const idx = arr.findIndex(
      (e): e is PendingAction =>
        !!e && typeof e === 'object' &&
        typeof (e as PendingAction).app    === 'string' &&
        typeof (e as PendingAction).action === 'string' &&
        (e as PendingAction).app === appKey
    )
    if (idx === -1) return null

    const entry = arr[idx] as PendingAction

    // Skip stale entries (>30 min) — likely the user clicked the tray
    // ages ago and no longer wants the action. Still splice it out so it
    // doesn't pile up in the queue.
    const STALE_MS = 30 * 60 * 1000
    if (entry.requestedAt) {
      const age = Date.now() - new Date(entry.requestedAt).getTime()
      if (Number.isFinite(age) && age > STALE_MS) {
        arr.splice(idx, 1)
        cfg['pending_actions'] = list
        try { fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(cfg, null, 2), 'utf8') } catch {}
        return null
      }
    }
    arr.splice(idx, 1)
    cfg['pending_actions'] = arr
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(cfg, null, 2), 'utf8')

    return { action: entry.action }
  } catch {
    return null
  }
}
