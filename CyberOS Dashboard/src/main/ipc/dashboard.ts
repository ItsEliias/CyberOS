// CyberOS Dashboard — Main Process IPC Handlers
// ItsEliias // v2.0

import { ipcMain, shell, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import type { EcosystemConfig } from '../../shared/types'

const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')
const EVENTS_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'CyberTools')
const EVENTS_FILE = path.join(EVENTS_DIR, 'ecosystem-events.json')

// How long without a heartbeat before an app is considered offline
const OFFLINE_THRESHOLD = 30_000

// ─── Config Helpers ──────────────────────────────────────────────────────────

function readConfig(): EcosystemConfig {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {}
    const raw = fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function isOnline(lastActive?: string): boolean {
  if (!lastActive) return false
  return Date.now() - new Date(lastActive).getTime() < OFFLINE_THRESHOLD
}

function annotateConfig(cfg: EcosystemConfig): EcosystemConfig {
  const statusKeys = [
    'cyberlab_status',
    'recondesk_status',
    'ghostvault_status',
    'vaultscraper_status',
    'signalboard_status',
    'credvault_status',
    'playbookstudio_status',
    'reportforge_status',
    'terminallink_status',
    'networkmap_status',
    'cyberos_status',
    'agenticos_status',
  ] as const

  for (const key of statusKeys) {
    const status = (cfg as any)[key]
    if (status) {
      status.active = isOnline(status.lastActive)
    }
  }

  return cfg
}

// ─── Events Helpers ──────────────────────────────────────────────────────────

function readEvents(): any[] {
  try {
    if (!fs.existsSync(EVENTS_FILE)) return []
    const raw = fs.readFileSync(EVENTS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ─── Register IPC Handlers ───────────────────────────────────────────────────

export function registerDashboardIPC(): void {
  // Read config (annotated with live active flags)
  ipcMain.handle('dashboard:config:read', async () => {
    return annotateConfig(readConfig())
  })

  // Read events
  ipcMain.handle('dashboard:events:read', async () => {
    return readEvents()
  })

  // Launch an app by key
  ipcMain.handle('dashboard:app:launch', async (_event, appKey: string) => {
    const cfg = readConfig()
    const registration = (cfg as any)[appKey]
    const execPath = registration?.execPath

    if (!execPath) {
      return { success: false, error: 'App not configured — execPath not set' }
    }

    if (!fs.existsSync(execPath)) {
      return { success: false, error: `Path not found: ${execPath}` }
    }

    try {
      execFile(execPath, [], { detached: true })
      return { success: true }
    } catch {
      // Fallback for macOS .app bundles
      shell.openPath(execPath)
      return { success: true }
    }
  })

  // Start file watchers
  ipcMain.on('dashboard:watch:start', (event) => {
    const sender = event.sender

    // Watch config file
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      let debounce: NodeJS.Timeout | null = null
      fs.watch(CYBERTOOLS_CONFIG, () => {
        if (debounce) clearTimeout(debounce)
        debounce = setTimeout(() => {
          sender.send('dashboard:config:changed', annotateConfig(readConfig()))
        }, 80)
      })
    }

    // Watch events file
    if (fs.existsSync(EVENTS_FILE)) {
      let debounce: NodeJS.Timeout | null = null
      fs.watch(EVENTS_FILE, () => {
        if (debounce) clearTimeout(debounce)
        debounce = setTimeout(() => {
          sender.send('dashboard:events:changed', readEvents())
        }, 80)
      })
    }
  })

  // ─── Existing IPC compatibility (preserve v1 channels) ────────────────────

  ipcMain.handle('ecosystem:state', () => annotateConfig(readConfig()))
  ipcMain.handle('ecosystem:events', () => readEvents().slice(0, 50))
  ipcMain.handle('ecosystem:eventHistory', () => readEvents())

  ipcMain.handle('app:launch', (_e, execPath: string) => {
    if (!execPath || !fs.existsSync(execPath)) {
      return { ok: false, error: 'Path not found' }
    }
    try {
      execFile(execPath, [], { detached: true })
      return { ok: true }
    } catch {
      shell.openPath(execPath)
      return { ok: true }
    }
  })

  ipcMain.handle('shell:open', (_e, url: string) => shell.openExternal(url))

  ipcMain.handle('window:toggleFullscreen', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.setFullScreen(!win.isFullScreen())
  })

  ipcMain.handle('app:version', () => '2.0.0')
}
