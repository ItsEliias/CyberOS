// SignalBoard — main.ts
// ItsEliias // v1.0

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { emitEvent } from './ecosystem-bus'
import {
  DEFAULT_SOURCES, loadSources, saveSources,
  loadCache, saveCache, fetchAllFeeds, saveItemToVault
} from './feeds'
import type { FeedItem, FeedSource, RelevanceContext } from '../shared/types'

const APP_VERSION       = '1.0.0'
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')
const REFRESH_INTERVAL  = 15 * 60 * 1_000 // 15 minutes

let mainWindow:      BrowserWindow | null = null
let refreshTimer:    NodeJS.Timeout | null = null
let cachedItems:     FeedItem[]    = []
let sources:         FeedSource[]  = []

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readCyberToolsConfig(): Record<string, unknown> {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {}
    return JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
  } catch { return {} }
}

function getRelevanceContext(): RelevanceContext {
  const cfg = readCyberToolsConfig()
  const cl  = cfg['cyberlab_status']  as Record<string, unknown> | undefined
  const rd  = cfg['recondesk_status'] as Record<string, unknown> | undefined
  return {
    lab:    cl?.['currentLab']    as string | undefined,
    target: rd?.['activeTarget']  as string | undefined,
  }
}

function getVaultPath(): string | undefined {
  const cfg = readCyberToolsConfig()
  return cfg['obsidianVaultPath'] as string | undefined
}

function push(channel: string, data: unknown): void {
  mainWindow?.webContents?.send(channel, data)
}

async function doRefresh(): Promise<void> {
  push('feeds:refreshing', true)
  const ctx   = getRelevanceContext()
  cachedItems = await fetchAllFeeds(sources, cachedItems, ctx)
  saveCache(cachedItems)
  push('feeds:items',      cachedItems)
  push('feeds:refreshing', false)
  push('feeds:lastRefreshed', new Date().toISOString())
  emitEvent('SignalBoard', 'feeds:refreshed', { count: cachedItems.length })
}

// ─── Window ───────────────────────────────────────────────────────────────────

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

// ─── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.handle('feeds:get-state', () => ({
  sources,
  items:          cachedItems,
  lastRefreshed:  null,
  refreshing:     false,
}))

ipcMain.handle('feeds:refresh', async () => {
  await doRefresh()
  return true
})

ipcMain.handle('feeds:mark-read', (_e, id: string) => {
  cachedItems = cachedItems.map(i => i.id === id ? { ...i, read: true } : i)
  saveCache(cachedItems)
  return true
})

ipcMain.handle('feeds:toggle-saved', (_e, id: string) => {
  cachedItems = cachedItems.map(i => i.id === id ? { ...i, saved: !i.saved } : i)
  saveCache(cachedItems)
  return cachedItems.find(i => i.id === id)?.saved ?? false
})

ipcMain.handle('feeds:save-to-vault', (_e, id: string) => {
  const item  = cachedItems.find(i => i.id === id)
  const vault = getVaultPath()
  if (!item || !vault) return { ok: false, error: !vault ? 'No vault path configured' : 'Item not found' }
  const ok = saveItemToVault(item, vault)
  if (ok) {
    cachedItems = cachedItems.map(i => i.id === id ? { ...i, saved: true } : i)
    saveCache(cachedItems)
    emitEvent('SignalBoard', 'note:saved', { title: item.title })
  }
  return { ok }
})

ipcMain.handle('feeds:toggle-source', (_e, id: string) => {
  sources = sources.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
  saveSources(sources)
  return sources
})

ipcMain.handle('feeds:add-source', (_e, src: Omit<FeedSource, 'id' | 'color'>) => {
  const id = `custom-${Date.now()}`
  const newSource: FeedSource = { ...src, id, color: '#8b949e' }
  sources = [...sources, newSource]
  saveSources(sources)
  return sources
})

ipcMain.handle('app:version',  () => APP_VERSION)
ipcMain.handle('shell:open',   (_e, url: string) => shell.openExternal(url))
ipcMain.handle('feeds:context', () => getRelevanceContext())

// ─── Boot ─────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  sources     = loadSources()
  cachedItems = loadCache()

  createWindow()
  emitEvent('SignalBoard', 'app:launched', { version: APP_VERSION })

  // Initial refresh after window loads
  mainWindow!.webContents.once('did-finish-load', () => {
    doRefresh()
  })

  // Scheduled refresh
  refreshTimer = setInterval(doRefresh, REFRESH_INTERVAL)
})

app.on('window-all-closed', () => {
  if (refreshTimer) clearInterval(refreshTimer)
  emitEvent('SignalBoard', 'app:closed', {})
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
