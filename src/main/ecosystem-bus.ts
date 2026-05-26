// CYBERTOOLS Ecosystem Event Bus — ItsEliias
import path from 'path'
import fs from 'fs'
import os from 'os'
import type { EcosystemEvent } from '../shared/types'

const BUS_DIR  = path.join(os.homedir(), 'Library', 'Application Support', 'CyberTools')
const BUS_FILE = path.join(BUS_DIR, 'ecosystem-events.json')

function ensureDir(): void {
  if (!fs.existsSync(BUS_DIR)) fs.mkdirSync(BUS_DIR, { recursive: true })
}

export function readEvents(): EcosystemEvent[] {
  try {
    ensureDir()
    if (!fs.existsSync(BUS_FILE)) return []
    return JSON.parse(fs.readFileSync(BUS_FILE, 'utf8')) || []
  } catch { return [] }
}

export function emitEvent(app: string, event: string, data: Record<string, unknown> = {}): void {
  try {
    ensureDir()
    const events = readEvents()
    events.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, timestamp: new Date().toISOString(), app, event, data })
    if (events.length > 150) events.splice(150)
    fs.writeFileSync(BUS_FILE, JSON.stringify(events, null, 2), 'utf8')
  } catch (e) { console.error('[EcosystemBus]', (e as Error).message) }
}

export function watchEvents(callback: (events: EcosystemEvent[]) => void): fs.FSWatcher {
  ensureDir()
  if (!fs.existsSync(BUS_FILE)) fs.writeFileSync(BUS_FILE, '[]', 'utf8')
  let debounce: NodeJS.Timeout
  return fs.watch(BUS_FILE, () => {
    clearTimeout(debounce)
    debounce = setTimeout(() => callback(readEvents()), 80)
  })
}
