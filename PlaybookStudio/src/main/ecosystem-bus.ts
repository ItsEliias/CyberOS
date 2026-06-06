// CYBERTOOLS Ecosystem Event Bus — ItsEliias
import path from 'path'
import fs from 'fs'
import os from 'os'

const BUS_DIR  = path.join(os.homedir(), 'Library', 'Application Support', 'CyberTools')
const BUS_FILE = path.join(BUS_DIR, 'ecosystem-events.json')

function ensureDir(): void {
  if (!fs.existsSync(BUS_DIR)) fs.mkdirSync(BUS_DIR, { recursive: true })
}

function readEvents(): unknown[] {
  try {
    ensureDir()
    if (!fs.existsSync(BUS_FILE)) return []
    return JSON.parse(fs.readFileSync(BUS_FILE, 'utf8')) || []
  } catch { return [] }
}

// Atomic write helper. The bus file is shared across all 11 CyberOS apps;
// without tmp+rename a crash mid-write (or interleaved writes from a peer
// app) used to leave a truncated JSON array that every subsequent
// readEvents() would parse to []. That cleared the activity feed.
function atomicWriteBus(events: unknown[]): void {
  // Unique tmp suffix so two apps writing concurrently don't fight over
  // the same tmp path and one of them gets ENOENT on rename.
  const tmp = `${BUS_FILE}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(events, null, 2), 'utf8')
  try {
    fs.renameSync(tmp, BUS_FILE)
  } catch (e) {
    // Cleanup leftover tmp if rename failed (rare — e.g. EXDEV across
    // mountpoints, which shouldn't happen in userData but be defensive).
    try { fs.unlinkSync(tmp) } catch { /* ignore */ }
    throw e
  }
}

export function emitEvent(app: string, event: string, data: Record<string, unknown> = {}): void {
  try {
    ensureDir()
    const events = readEvents()
    events.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      app,
      event,
      data,
    })
    if (events.length > 150) events.splice(150)
    atomicWriteBus(events)
  } catch (e) { console.error('[EcosystemBus]', (e as Error).message) }
}
