// CredVault — main.ts
// Electron main process: window creation, app lifecycle, IPC registration.
// All crypto and credential IPC is delegated to ipc/credvault.ts + cryptoManager.ts

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { emitEvent } from './ecosystem-bus'
import { registerCredVaultHandlers, setMainWindow, lockVault, writeCredVaultStatus, credCount } from './ipc/credvault'
import { consumePendingAction, installPendingActionWatcher } from './pendingActions'

const APP_KEY = 'credvault'

const APP_VERSION       = '1.0.0'
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')

let mainWindow:      BrowserWindow | null = null
let statusInterval:  NodeJS.Timeout | null = null
let pendingInterval: NodeJS.Timeout | null = null
let configWatcher:   import('fs').FSWatcher | null = null

function readPendingCount(): number {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return 0
    const cfg = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
    return ((cfg?.credvault_pending as unknown[]) ?? []).length
  } catch {
    return 0
  }
}

function setupConfigWatch(win: BrowserWindow): void {
  try {
    configWatcher = fs.watch(CYBERTOOLS_CONFIG, { persistent: false }, () => {
      setTimeout(() => {
        try {
          win.webContents.send('push:pending-count', readPendingCount())
        } catch {}
      }, 100)
    })
  } catch {}
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 750,
    minHeight: 500,
    backgroundColor: '#0e1117',
    title: 'CredVault',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  setMainWindow(mainWindow)

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Tray-menu action dispatch — after the renderer mounts, forward any
  // pending action queued by the Launcher to the renderer.
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      const result = consumePendingAction(APP_KEY)
      if (result && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pending-action', result.action)
      }
    }, 800)
  
    // Listen for tray-action writes while the app is already running
    installPendingActionWatcher(APP_KEY, (action) => {
      try { mainWindow?.webContents.send('pending-action', action) } catch { /* ignore */ }
    })})
}

// Register all IPC handlers (crypto + credentials + backup + pending)
registerCredVaultHandlers()

ipcMain.handle('open-external', (_e, url: string) => shell.openExternal(url))

// App lifecycle

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()
    writeCredVaultStatus(true, 0)
    emitEvent('CredVault', 'app:launched', { version: APP_VERSION })

    // Periodic status heartbeat
    statusInterval = setInterval(() => {
      writeCredVaultStatus(credCount() === 0, credCount())
    }, 10_000)

    // Watch for pending credential pushes from ReconDesk
    if (mainWindow) setupConfigWatch(mainWindow)
    pendingInterval = setInterval(() => {
      mainWindow?.webContents.send('push:pending-count', readPendingCount())
    }, 30_000)
  })

  app.on('window-all-closed', () => {
    if (statusInterval)  clearInterval(statusInterval)
    if (pendingInterval) clearInterval(pendingInterval)
    if (mainWindow && !mainWindow.isDestroyed()) lockVault('app closed')
    app.quit()
  })

  app.on('before-quit', () => { configWatcher?.close() })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}
