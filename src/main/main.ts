// CyberOS Dashboard — main.ts
// ItsEliias // v1.0

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { execFile } from 'child_process'
import { emitEvent, readEvents, watchEvents } from './ecosystem-bus'
import type { EcosystemConfig } from '../shared/types'

const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')
const APP_VERSION       = '1.0.0'

// How long without a heartbeat before an app is considered offline (ms)
const OFFLINE_THRESHOLD = 30_000

let mainWindow: BrowserWindow | null = null
let pollInterval: NodeJS.Timeout | null = null
let busWatcher: fs.FSWatcher | null = null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readConfig(): EcosystemConfig {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {}
    return JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
  } catch { return {} }
}

function isOnline(lastActive?: string): boolean {
  if (!lastActive) return false
  return Date.now() - new Date(lastActive).getTime() < OFFLINE_THRESHOLD
}

function annotateConfig(cfg: EcosystemConfig): EcosystemConfig {
  // Stamp each status with a live `active` flag based on heartbeat age
  if (cfg.cyberlab_status)   cfg.cyberlab_status.active   = isOnline(cfg.cyberlab_status.lastActive)
  if (cfg.vaultscraper_status) cfg.vaultscraper_status.active = isOnline(cfg.vaultscraper_status.lastActive)
  if (cfg.ghostvault_status) cfg.ghostvault_status.active  = isOnline(cfg.ghostvault_status.lastActive)
  if (cfg.recondesk_status)  cfg.recondesk_status.active   = isOnline(cfg.recondesk_status.lastActive)
  return cfg
}

function push(channel: string, data: unknown): void {
  mainWindow?.webContents?.send(channel, data)
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0e1117',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// ─── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.handle('ecosystem:state', () => annotateConfig(readConfig()))
ipcMain.handle('ecosystem:events', () => readEvents().slice(0, 50))
ipcMain.handle('app:version', () => APP_VERSION)

ipcMain.handle('app:launch', (_e, execPath: string) => {
  if (!execPath || !fs.existsSync(execPath)) return { ok: false, error: 'Path not found' }
  try {
    execFile(execPath, [], { detached: true })
    return { ok: true }
  } catch (e) {
    // macOS .app bundles — try shell.openPath
    shell.openPath(execPath)
    return { ok: true }
  }
})

ipcMain.handle('shell:open', (_e, url: string) => shell.openExternal(url))

// ─── Boot ─────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()

  // Poll config every 5s and push to renderer
  pollInterval = setInterval(() => {
    push('ecosystem:update', annotateConfig(readConfig()))
  }, 5_000)

  // Watch event bus and push new events
  busWatcher = watchEvents(events => {
    push('ecosystem:events', events.slice(0, 50))
  })

  emitEvent('CyberOS', 'dashboard:launched', { version: APP_VERSION })
})

app.on('window-all-closed', () => {
  if (pollInterval) clearInterval(pollInterval)
  if (busWatcher) busWatcher.close()
  emitEvent('CyberOS', 'dashboard:closed', {})
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
