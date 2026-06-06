// CYBERTOOLS Ecosystem Event Bus — ItsEliias
import path from 'path'
import fs from 'fs'
import os from 'os'
import { ecosystemBusPath } from './platform'

const BUS_FILE = ecosystemBusPath()
const BUS_DIR  = path.dirname(BUS_FILE)
const MAX_EVENTS = 150

interface EcosystemEvent {
  id: string
  timestamp: string
  app: string
  event: string
  data: Record<string, unknown>
}

function ensureDir(): void {
  if (!fs.existsSync(BUS_DIR)) fs.mkdirSync(BUS_DIR, { recursive: true })
}

function readEvents(): EcosystemEvent[] {
  try {
    ensureDir()
    if (!fs.existsSync(BUS_FILE)) return []
    return JSON.parse(fs.readFileSync(BUS_FILE, 'utf8')) || []
  } catch {
    return []
  }
}

export function emitEvent(appName: string, eventType: string, data: Record<string, unknown> = {}): void {
  try {
    ensureDir()
    const events = readEvents()
    events.unshift({
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      app:       appName,
      event:     eventType,
      data
    })
    if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS)
    const tmp = `${BUS_FILE}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(events, null, 2), 'utf8')
    fs.renameSync(tmp, BUS_FILE)
  } catch (e) {
    console.error('[EcosystemBus] emit error:', (e as Error).message)
  }
}
