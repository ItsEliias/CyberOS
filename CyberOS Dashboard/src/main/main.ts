// CyberOS Dashboard — main.ts
// ItsEliias // v2.0 — Multi-screen dashboard with full ecosystem monitoring

import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { emitEvent, readEvents, watchEvents } from './ecosystem-bus'
import { registerDashboardIPC } from './ipc/dashboard'

const APP_VERSION = '2.0.0'
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')

let mainWindow: BrowserWindow | null = null
let pollInterval: NodeJS.Timeout | null = null
let busWatcher: fs.FSWatcher | null = null

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readConfig(): Record<string, unknown> {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {}
    return JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
  } catch {
    return {}
  }
}

function push(channel: string, data: unknown): void {
  mainWindow?.webContents?.send(channel, data)
}

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 850,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Notify renderer when fullscreen state changes
  mainWindow.on('enter-full-screen', () => push('window:fullscreen', true))
  mainWindow.on('leave-full-screen', () => push('window:fullscreen', false))

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// ─── IPC Registration ────────────────────────────────────────────────────────

registerDashboardIPC()

// ─── Boot ────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()

  // Poll config every 5s and push to renderer
  pollInterval = setInterval(() => {
    push('ecosystem:update', readConfig())
  }, 5_000)

  // Watch event bus and push new events
  busWatcher = watchEvents((events) => {
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
