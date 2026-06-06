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
    list.splice(idx, 1)
    cfg.pending_actions = list

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8')
    return { action: entry.action }
  } catch {
    return null
  }
}
