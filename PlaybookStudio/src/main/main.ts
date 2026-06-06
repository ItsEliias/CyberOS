// PlaybookStudio — main.ts
// ItsEliias // v2.0

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { sharedConfigPath } from './platform'
import { emitEvent } from './ecosystem-bus'
import { consumePendingAction, installPendingActionWatcher } from './pendingActions'
import { registerAiHandlers } from './aiHandler'
import { registerIpcHandlers, type AppRefs } from './ipc-handlers'
import type { Playbook, PlaybookRun, SharedContext } from '../shared/types'

const APP_VERSION       = '2.0.0'
const APP_DATA_DIR      = userDataDir('PlaybookStudio')
const PLAYBOOKS_FILE    = path.join(APP_DATA_DIR, 'playbooks.json')
const RUNS_FILE         = path.join(APP_DATA_DIR, 'runs.json')
const CYBERTOOLS_CONFIG = sharedConfigPath()
const CONTEXT_POLL_MS   = 10_000

// ─── Crash reporter (locally-stored minidumps; nothing uploaded) ─────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
try { require('electron').crashReporter.start({ uploadToServer: false, productName: "PlaybookStudio", companyName: 'CyberOS' }) } catch { /* unavailable */ }

// ─── Top-level error handlers — log instead of crash silently ────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[PlaybookStudio] unhandled rejection:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[PlaybookStudio] uncaught exception:', err)
})

let mainWindow:      BrowserWindow | null = null
let contextTimer:    NodeJS.Timeout | null = null
let customPlaybooks: Playbook[]    = []
let runs:            PlaybookRun[] = []
let lastContext:     SharedContext = {}

// ─── Disk helpers ─────────────────────────────────────────────────────────────

function ensureAppDir(): void {
  if (!fs.existsSync(APP_DATA_DIR)) fs.mkdirSync(APP_DATA_DIR, { recursive: true })
}

function loadCustomPlaybooks(): Playbook[] {
  try {
    ensureAppDir()
    if (!fs.existsSync(PLAYBOOKS_FILE)) return []
    return JSON.parse(fs.readFileSync(PLAYBOOKS_FILE, 'utf8')) as Playbook[]
  } catch { return [] }
}

function loadRuns(): PlaybookRun[] {
  try {
    ensureAppDir()
    if (!fs.existsSync(RUNS_FILE)) return []
    return JSON.parse(fs.readFileSync(RUNS_FILE, 'utf8')) as PlaybookRun[]
  } catch { return [] }
}

// Atomic write helper — writes to a sibling .tmp and renames into place so a
// crash mid-write can't leave a half-formed JSON file that fails to parse on
// next launch.
function atomicWriteJson(filePath: string, data: unknown): void {
  ensureAppDir()
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, filePath)
}

function savePlaybooks(): void {
  try { atomicWriteJson(PLAYBOOKS_FILE, customPlaybooks) }
  catch (e) { console.warn('[PlaybookStudio] playbooks write failed:', (e as Error).message) }
}

function saveRuns(): void {
  try { atomicWriteJson(RUNS_FILE, runs) }
  catch (e) { console.warn('[PlaybookStudio] runs write failed:', (e as Error).message) }
}

// ─── CyberTools config helpers ────────────────────────────────────────────────

function readCyberToolsConfig(): Record<string, unknown> {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {}
    return JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
  } catch { return {} }
}

function writeCyberToolsConfig(patch: Record<string, unknown>): void {
  try {
    const existing = readCyberToolsConfig()
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify({ ...existing, ...patch }, null, 2), 'utf8')
  } catch (e) { console.warn('[PlaybookStudio] config write failed:', (e as Error).message) }
}

function getSharedContext(): SharedContext {
  const cfg = readCyberToolsConfig()
  const sc  = cfg['shared_context'] as Record<string, unknown> | undefined
  return {
    activeLab:    sc?.['activeLab']    as string | undefined,
    activeTarget: sc?.['activeTarget'] as string | undefined,
    activeIP:     sc?.['activeIP']     as string | undefined,
  }
}

function updateStatus(activePlaybook?: string, progress?: string): void {
  writeCyberToolsConfig({
    playbookstudio_status: {
      active: true, lastActive: new Date().toISOString(),
      ...(activePlaybook !== undefined && { activePlaybook }),
      ...(progress       !== undefined && { activePlaybookProgress: progress }),
    }
  })
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Context polling ──────────────────────────────────────────────────────────

function pollContext(): void {
  const sc = getSharedContext()
  const changed =
    sc.activeLab    !== lastContext.activeLab    ||
    sc.activeTarget !== lastContext.activeTarget ||
    sc.activeIP     !== lastContext.activeIP
  if (changed) { lastContext = sc; mainWindow?.webContents?.send('context:updated', sc) }
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000, height: 700, minWidth: 800, minHeight: 560,
    backgroundColor: '#0e1117', titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 }, title: 'PlaybookStudio',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    }
  })
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// ─── App-level IPC ────────────────────────────────────────────────────────────

ipcMain.handle('app:version', () => APP_VERSION)
ipcMain.handle('open-external', (_e, url: unknown) => {
  // Validate at the boundary — shell.openExternal will gladly hand off
  // `file:///etc/passwd` or `javascript:`-style URLs to the OS otherwise.
  if (typeof url !== 'string' || !url) return false
  try {
    const proto = new URL(url).protocol
    if (proto !== 'http:' && proto !== 'https:' && proto !== 'mailto:') return false
  } catch { return false }
  void shell.openExternal(url)
  return true
})
ipcMain.handle('context:get', () => getSharedContext())
ipcMain.handle('app:get-state', () => ({
  playbooks: customPlaybooks,
  runs,
  sharedContext: getSharedContext(),
}))

// ─── Boot ─────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  customPlaybooks = loadCustomPlaybooks()
  runs            = loadRuns()
  lastContext     = getSharedContext()

  const refs: AppRefs = {
    get customPlaybooks() { return customPlaybooks },
    set customPlaybooks(v) { customPlaybooks = v },
    get runs() { return runs },
    set runs(v) { runs = v },
    getWindow: () => mainWindow,
    readConfig: readCyberToolsConfig,
    writeConfig: writeCyberToolsConfig,
    updateStatus,
    uid,
    savePlaybooks,
    saveRuns,
  }

  registerIpcHandlers(refs)
  registerAiHandlers()
  createWindow()
  updateStatus()
  emitEvent('PlaybookStudio', 'app:launched', { version: APP_VERSION })

  mainWindow!.webContents.once('did-finish-load', () => {
    mainWindow?.webContents?.send('context:updated', lastContext)
    // Consume any tray-menu queued action once the renderer has had time to mount.
    setTimeout(() => {
      const pending = consumePendingAction('playbookstudio')
      if (pending) mainWindow?.webContents?.send('pending-action', pending.action)
    }, 800)
    installPendingActionWatcher('playbookstudio', (action) => {
      try { mainWindow?.webContents?.send('pending-action', action) } catch { /* ignore */ }
    })
  })

  contextTimer = setInterval(pollContext, CONTEXT_POLL_MS)
})

app.on('window-all-closed', () => {
  if (contextTimer) clearInterval(contextTimer)
  emitEvent('PlaybookStudio', 'app:closed', {})
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
