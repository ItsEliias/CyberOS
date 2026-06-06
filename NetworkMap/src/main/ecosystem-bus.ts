// CYBERTOOLS Ecosystem Event Bus — ItsEliias
import path from 'path'
import fs from 'fs'
import os from 'os'
import { ecosystemBusPath } from './platform'

const BUS_FILE = ecosystemBusPath()
const BUS_DIR  = path.dirname(BUS_FILE)

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

export function emitEvent(app: string, event: string, data: Record<string, unknown> = {}): void {
  try {
    ensureDir()
    const events = readEvents()
    events.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, timestamp: new Date().toISOString(), app, event, data })
    if (events.length > 150) events.splice(150)
    const tmp = `${BUS_FILE}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(events, null, 2), 'utf8')
    fs.renameSync(tmp, BUS_FILE)
  } catch (e) { console.error('[EcosystemBus]', (e as Error).message) }
}
