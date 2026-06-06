// NetLab — main.ts
// ItsEliias // v1.0

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { emitEvent } from './ecosystem-bus'
import { consumePendingAction, installPendingActionWatcher } from './pendingActions'
import { userDataDir } from './platform'
import type { Lab, LabProgress, NetLabPrefs } from '../shared/types'

const CYBERTOOLS_CONFIG = sharedConfigPath()
const GHOSTVAULT_DIR    = userDataDir('GhostVault')

const APP_VERSION = '1.0.0'
const DATA_DIR    = userDataDir('NetLab')
const LABS_FILE   = path.join(DATA_DIR, 'labs.json')
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json')
const PREFS_FILE  = path.join(DATA_DIR, 'netlab-prefs.json')
// Custom user snippets. Only persists the user-added ones; the renderer
// merges these with the built-in seed list on load.
const SNIPPETS_FILE   = path.join(DATA_DIR, 'snippets.json')
// Saved network topologies — diagrams the user has built and named.
const TOPOLOGIES_FILE = path.join(DATA_DIR, 'topologies.json')

// ─── Crash reporter (locally-stored minidumps; nothing uploaded) ─────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
try { require('electron').crashReporter.start({ uploadToServer: false, productName: "NetLab", companyName: 'CyberOS' }) } catch { /* unavailable */ }

let mainWindow: BrowserWindow | null = null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
  } catch { return fallback }
}

function writeJson(filePath: string, data: unknown): void {
  try {
    ensureDataDir()
    // Atomic write — a crash mid-fs.writeFileSync used to leave a partial
    // labs.json / progress.json / prefs.json that failed to parse on next
    // launch, dropping all of the user's labs.
    const tmp = `${filePath}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
    fs.renameSync(tmp, filePath)
  } catch (e) {
    console.error('[NetLab] writeJson failed:', (e as Error).message)
  }
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#0a0a0f',
    title: 'NetLab',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.once('did-finish-load', () => {
    emitEvent('NetLab', 'app:launched', { version: APP_VERSION })
    // Tray-menu pending action — let the renderer mount, then dispatch.
    setTimeout(() => {
      const pending = consumePendingAction('netlab')
      if (pending && mainWindow) {
        mainWindow.webContents.send('pending-action', pending.action)
      }
    }, 800)
  
    // Listen for tray-action writes while the app is already running
    installPendingActionWatcher('netlab', (action) => {
      try { mainWindow?.webContents.send('pending-action', action) } catch { /* ignore */ }
    })})
}

// ─── Helpers — CyberTools config ─────────────────────────────────────────────

function readCyberToolsConfig(): Record<string, unknown> {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {}
    return JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
  } catch { return {} }
}

// ─── IPC — Labs ───────────────────────────────────────────────────────────────

ipcMain.handle('labs:getAll', (): Lab[] => {
  return readJson<Lab[]>(LABS_FILE, [])
})

ipcMain.handle('labs:save', (_e, lab: Lab): void => {
  const labs = readJson<Lab[]>(LABS_FILE, [])
  const idx = labs.findIndex(l => l.id === lab.id)
  if (idx >= 0) { labs[idx] = lab } else { labs.push(lab) }
  writeJson(LABS_FILE, labs)
  emitEvent('NetLab', 'lab:saved', { id: lab.id, title: lab.title })
})

ipcMain.handle('labs:updateProgress', (_e, progress: LabProgress): void => {
  const all = readJson<Record<string, LabProgress>>(PROGRESS_FILE, {})
  all[progress.labId] = progress
  writeJson(PROGRESS_FILE, all)
  emitEvent('NetLab', 'progress:updated', { labId: progress.labId })
})

ipcMain.handle('labs:getProgress', (): Record<string, LabProgress> => {
  return readJson<Record<string, LabProgress>>(PROGRESS_FILE, {})
})

// ─── IPC — Prefs ──────────────────────────────────────────────────────────────

ipcMain.handle('prefs:get', (): NetLabPrefs => {
  return readJson<NetLabPrefs>(PREFS_FILE, { ghostVaultAutoSave: false })
})

ipcMain.handle('prefs:set', (_e, patch: Partial<NetLabPrefs>): void => {
  const existing = readJson<NetLabPrefs>(PREFS_FILE, { ghostVaultAutoSave: false })
  writeJson(PREFS_FILE, { ...existing, ...patch })
})

// ─── IPC — Custom snippets ────────────────────────────────────────────────────
// Custom snippets used to evaporate on app close because the renderer kept
// them in zustand only (see the TODO in store/index.ts). These IPCs let the
// store mirror snippets to disk so they survive a restart.

ipcMain.handle('snippets:getCustom', (): unknown[] => {
  return readJson<unknown[]>(SNIPPETS_FILE, [])
})

ipcMain.handle('snippets:saveCustom', (_e, snippets: unknown): boolean => {
  if (!Array.isArray(snippets)) return false
  // Cap the persisted list so a runaway addSnippet loop in the renderer
  // can't drop a multi-MB blob into the data dir.
  if (snippets.length > 500) return false
  writeJson(SNIPPETS_FILE, snippets)
  return true
})

// ─── IPC — Topologies ─────────────────────────────────────────────────────────
// Network topology diagrams used to live only in zustand state and were lost
// on each restart. Persist them to disk so the user's work survives.

ipcMain.handle('topologies:getAll', (): unknown[] => {
  return readJson<unknown[]>(TOPOLOGIES_FILE, [])
})

ipcMain.handle('topologies:saveAll', (_e, topologies: unknown): boolean => {
  if (!Array.isArray(topologies)) return false
  // Each topology can be moderately large (nodes + edges); cap at 100 to
  // avoid runaway growth. A normal user has 1–10 topologies.
  if (topologies.length > 100) return false
  writeJson(TOPOLOGIES_FILE, topologies)
  return true
})

// ─── IPC — GhostVault ─────────────────────────────────────────────────────────

ipcMain.handle('ghostvault:save-note', (_e, { labTitle, vendor, tags, content }: {
  labTitle: string
  vendor: string
  tags: string[]
  content: string
}): { ok: boolean; reason?: string } => {
  try {
    const cfg = readCyberToolsConfig()
    const vaultPath = (cfg['ghostvault_status'] as Record<string, unknown>)?.['vaultPath'] as string | undefined
    const baseDir   = vaultPath ?? path.join(os.homedir(), 'GhostVault')
    // Sanitize lab title. If everything gets stripped (e.g. labTitle was
    // "...") fall back to 'Untitled' so we don't end up writing into
    // baseDir/NetLab/ itself (no leaf = silent EISDIR on writeFileSync).
    const safeLab = labTitle.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Untitled'
    const labDir  = path.join(baseDir, 'NetLab', safeLab)
    // Path-confine: refuse to escape baseDir even if a future sanitize
    // change lets `..` through.
    const baseResolved = path.resolve(baseDir, 'NetLab') + path.sep
    const labResolved  = path.resolve(labDir)
    if (!labResolved.startsWith(baseResolved)) {
      return { ok: false, reason: 'Lab path escapes vault directory' }
    }
    ensureDataDir()
    if (!fs.existsSync(labDir)) fs.mkdirSync(labDir, { recursive: true })
    const ts       = new Date().toISOString().replace(/[:.]/g, '-')
    const filePath = path.join(labDir, `notes-${ts}.md`)
    const frontmatter = [
      '---',
      `lab: NetLab/${safeLab}`,
      // JSON.stringify handles every escape edge case in YAML quoted strings.
      `vendor: ${JSON.stringify(vendor)}`,
      `tags: [${tags.map(t => JSON.stringify(t)).join(', ')}]`,
      `savedAt: ${new Date().toISOString()}`,
      '---',
      '',
    ].join('\n')
    // Atomic — partial markdown on crash leaves a broken note in the vault.
    const tmp = `${filePath}.tmp`
    fs.writeFileSync(tmp, frontmatter + content, 'utf8')
    fs.renameSync(tmp, filePath)
    emitEvent('NetLab', 'ghostvault:note-saved', { labTitle: safeLab, filePath })
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: (e as Error).message }
  }
})

ipcMain.handle('ghostvault:vault-path', (): string | null => {
  try {
    const cfg = readCyberToolsConfig()
    const vaultPath = (cfg['ghostvault_status'] as Record<string, unknown>)?.['vaultPath'] as string | undefined
    return vaultPath ?? path.join(os.homedir(), 'GhostVault')
  } catch { return null }
})

// ─── IPC — TerminalLink ───────────────────────────────────────────────────────

ipcMain.handle('terminallink:send-command', (_e, command: string): void => {
  try {
    const cfg = readCyberToolsConfig()
    const existing = (cfg['shared_context'] as Record<string, unknown>) ?? {}
    const updated  = { ...cfg, shared_context: { ...existing, pendingCommand: command, commandSetBy: 'NetLab', commandSetAt: new Date().toISOString() } }
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(updated, null, 2), 'utf8')
    emitEvent('NetLab', 'terminallink:command', { command })
  } catch (e) { console.error('[NetLab] terminallink:send-command failed:', (e as Error).message) }
})

ipcMain.handle('ghostvault:status', (): { running: boolean; vaultPath?: string } => {
  try {
    const statusFile = path.join(GHOSTVAULT_DIR, 'status.json')
    if (!fs.existsSync(statusFile)) return { running: false }
    return JSON.parse(fs.readFileSync(statusFile, 'utf8')) as { running: boolean; vaultPath?: string }
  } catch { return { running: false } }
})

// ─── IPC — Shell / App ────────────────────────────────────────────────────────

ipcMain.handle('shell:openExternal', (_e, url: string) => shell.openExternal(url))
ipcMain.handle('app:version', () => APP_VERSION)

ipcMain.handle('ecosystem:send', (_e, event: string, data: Record<string, unknown>): void => {
  emitEvent('NetLab', event, data)
})

// ─── Boot ─────────────────────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    ensureDataDir()
    createWindow()
  })

  app.on('window-all-closed', () => {
    emitEvent('NetLab', 'app:closed', {})
    app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}
