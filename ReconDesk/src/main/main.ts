// ReconDesk — main.ts
// ItsEliias // v1.0 — Electron main process

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { emitEvent } from './ecosystem-bus'
import type { ReconDeskData, ReconDeskStatus } from '../shared/types'

const APP_VERSION       = '1.0.0'
const DATA_FILE         = path.join(os.homedir(), '.recondesk', 'data.json')
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')

let mainWindow: BrowserWindow | null = null
let statusInterval: NodeJS.Timeout | null = null

function ensureDataDir(): void {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function loadData(): ReconDeskData {
  try {
    ensureDataDir()
    if (!fs.existsSync(DATA_FILE)) return defaultData()
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return defaultData()
  }
}

function saveData(data: ReconDeskData): void {
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function defaultData(): ReconDeskData {
  return { targets: [], cards: [], activeTargetId: null, version: APP_VERSION }
}

function writeStatus(data: ReconDeskData): void {
  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch (_) {}
    }
    const status: ReconDeskStatus = {
      active:       true,
      lastActive:   new Date().toISOString(),
      targetCount:  data.targets.length,
      cardCount:    data.cards.length,
      activeTarget: data.targets.find(t => t.id === data.activeTargetId)?.name
    }
    shared.recondesk_status = status
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8')
  } catch (e) {
    console.warn('[ReconDesk] status write failed:', (e as Error).message)
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
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

// IPC handlers
ipcMain.handle('data:load', () => loadData())

ipcMain.handle('data:save', (_e, data: ReconDeskData) => {
  saveData(data)
  writeStatus(data)
  return true
})

ipcMain.handle('app:version', () => APP_VERSION)

ipcMain.handle('shell:open', (_e, url: string) => shell.openExternal(url))

app.whenReady().then(() => {
  createWindow()
  const data = loadData()
  writeStatus(data)
  emitEvent('ReconDesk', 'app:launched', { version: APP_VERSION })

  statusInterval = setInterval(() => {
    const d = loadData()
    writeStatus(d)
  }, 10_000)
})

app.on('window-all-closed', () => {
  if (statusInterval) clearInterval(statusInterval)
  emitEvent('ReconDesk', 'app:closed', {})
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
