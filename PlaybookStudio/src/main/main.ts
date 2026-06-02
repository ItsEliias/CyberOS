// PlaybookStudio — main.ts
// ItsEliias // v1.0

import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { emitEvent } from './ecosystem-bus'
import { BUILTIN_PLAYBOOKS } from '../shared/builtinPlaybooks'
import type { Playbook, PlaybookRun, SharedContext } from '../shared/types'

const APP_VERSION        = '1.0.0'
const APP_DATA_DIR       = path.join(os.homedir(), 'Library', 'Application Support', 'PlaybookStudio')
const PLAYBOOKS_FILE     = path.join(APP_DATA_DIR, 'playbooks.json')
const RUNS_FILE          = path.join(APP_DATA_DIR, 'runs.json')
const CYBERTOOLS_CONFIG  = path.join(os.homedir(), 'cybertools-config.json')
const CONTEXT_POLL_MS    = 10_000

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

function saveCustomPlaybooks(pbs: Playbook[]): void {
  try {
    ensureAppDir()
    fs.writeFileSync(PLAYBOOKS_FILE, JSON.stringify(pbs, null, 2), 'utf8')
  } catch (e) { console.warn('[PlaybookStudio] playbooks save failed:', (e as Error).message) }
}

function loadRuns(): PlaybookRun[] {
  try {
    ensureAppDir()
    if (!fs.existsSync(RUNS_FILE)) return []
    return JSON.parse(fs.readFileSync(RUNS_FILE, 'utf8')) as PlaybookRun[]
  } catch { return [] }
}

function saveRuns(r: PlaybookRun[]): void {
  try {
    ensureAppDir()
    fs.writeFileSync(RUNS_FILE, JSON.stringify(r, null, 2), 'utf8')
  } catch (e) { console.warn('[PlaybookStudio] runs save failed:', (e as Error).message) }
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
    const merged   = { ...existing, ...patch }
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(merged, null, 2), 'utf8')
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
      active: true,
      lastActive: new Date().toISOString(),
      ...(activePlaybook !== undefined && { activePlaybook }),
      ...(progress       !== undefined && { activePlaybookProgress: progress }),
    }
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function push(channel: string, data: unknown): void {
  mainWindow?.webContents?.send(channel, data)
}

function allPlaybooks(): Playbook[] {
  return [...BUILTIN_PLAYBOOKS, ...customPlaybooks]
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

  if (changed) {
    lastContext = sc
    push('context:updated', sc)
  }
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#0e1117',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    title: 'PlaybookStudio',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// ─── IPC: App ─────────────────────────────────────────────────────────────────

ipcMain.handle('app:version', () => APP_VERSION)
ipcMain.handle('app:get-state', () => ({
  playbooks: allPlaybooks(),
  runs,
  sharedContext: getSharedContext(),
}))

// ─── IPC: Playbooks ───────────────────────────────────────────────────────────

ipcMain.handle('playbooks:get-all', () => allPlaybooks())

ipcMain.handle('playbooks:save', (_e, playbook: Playbook) => {
  if (playbook.isBuiltIn) return { ok: false, error: 'Cannot modify built-in playbooks' }
  const idx = customPlaybooks.findIndex(p => p.id === playbook.id)
  const updated = { ...playbook, updatedAt: new Date().toISOString() }
  if (idx >= 0) {
    customPlaybooks[idx] = updated
  } else {
    customPlaybooks = [...customPlaybooks, updated]
  }
  saveCustomPlaybooks(customPlaybooks)
  emitEvent('PlaybookStudio', 'playbook:saved', { id: playbook.id, name: playbook.name })
  return { ok: true, playbook: updated }
})

ipcMain.handle('playbooks:delete', (_e, id: string) => {
  const pb = customPlaybooks.find(p => p.id === id)
  if (!pb) return { ok: false, error: 'Playbook not found' }
  if (pb.isBuiltIn) return { ok: false, error: 'Cannot delete built-in playbooks' }
  customPlaybooks = customPlaybooks.filter(p => p.id !== id)
  saveCustomPlaybooks(customPlaybooks)
  return { ok: true }
})

ipcMain.handle('playbooks:clone', (_e, id: string) => {
  const source = allPlaybooks().find(p => p.id === id)
  if (!source) return { ok: false, error: 'Playbook not found' }
  const now = new Date().toISOString()
  const cloned: Playbook = {
    ...source,
    id: `custom-${uid()}`,
    name: `${source.name} (Copy)`,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
  }
  customPlaybooks = [...customPlaybooks, cloned]
  saveCustomPlaybooks(customPlaybooks)
  return { ok: true, playbook: cloned }
})

// ─── IPC: Runs ────────────────────────────────────────────────────────────────

ipcMain.handle('runs:get-all', () => runs)

ipcMain.handle('runs:start', (_e, playbookId: string) => {
  const pb = allPlaybooks().find(p => p.id === playbookId)
  if (!pb) return { ok: false, error: 'Playbook not found' }
  const ctx = getSharedContext()
  const now = new Date().toISOString()
  const run: PlaybookRun = {
    id: `run-${uid()}`,
    playbookId: pb.id,
    playbookName: pb.name,
    startedAt: now,
    targetName: ctx.activeTarget,
    labName: ctx.activeLab,
    steps: pb.steps.map(s => ({ ...s, status: 'todo' as const })),
    status: 'running',
  }
  runs = [run, ...runs]
  saveRuns(runs)

  // Update shared context and ecosystem
  const cfg = readCyberToolsConfig()
  const sc  = (cfg['shared_context'] ?? {}) as Record<string, unknown>
  writeCyberToolsConfig({ shared_context: { ...sc, activePlaybook: pb.name } })
  updateStatus(pb.name, `0/${pb.steps.length} steps`)
  emitEvent('PlaybookStudio', 'playbook:started', { runId: run.id, playbook: pb.name, target: ctx.activeTarget })
  return { ok: true, run }
})

ipcMain.handle('runs:update-step', (_e, runId: string, stepId: string, patch: Partial<import('../shared/types').PlaybookStep>) => {
  const runIdx = runs.findIndex(r => r.id === runId)
  if (runIdx < 0) return { ok: false, error: 'Run not found' }
  const run = runs[runIdx]
  const updated: PlaybookRun = {
    ...run,
    steps: run.steps.map(s => s.id === stepId ? { ...s, ...patch } : s),
  }
  runs[runIdx] = updated
  saveRuns(runs)

  // Update progress in ecosystem
  const done     = updated.steps.filter(s => s.status === 'done' || s.status === 'skipped').length
  const total    = updated.steps.length
  const progress = `${done}/${total} steps`
  updateStatus(updated.playbookName, progress)
  emitEvent('PlaybookStudio', 'step:completed', { runId, stepId, progress })
  return { ok: true, run: updated }
})

ipcMain.handle('runs:complete', (_e, runId: string) => {
  const runIdx = runs.findIndex(r => r.id === runId)
  if (runIdx < 0) return { ok: false, error: 'Run not found' }
  const now = new Date().toISOString()
  const run = { ...runs[runIdx], status: 'completed' as const, completedAt: now }
  runs[runIdx] = run
  saveRuns(runs)

  // Clear active playbook from shared context
  const cfg = readCyberToolsConfig()
  const sc  = (cfg['shared_context'] ?? {}) as Record<string, unknown>
  writeCyberToolsConfig({ shared_context: { ...sc, activePlaybook: undefined } })
  updateStatus(undefined, undefined)
  emitEvent('PlaybookStudio', 'playbook:completed', { runId, playbook: run.playbookName })
  return { ok: true, run }
})

ipcMain.handle('runs:abandon', (_e, runId: string) => {
  const runIdx = runs.findIndex(r => r.id === runId)
  if (runIdx < 0) return { ok: false, error: 'Run not found' }
  const run = { ...runs[runIdx], status: 'abandoned' as const, completedAt: new Date().toISOString() }
  runs[runIdx] = run
  saveRuns(runs)

  const cfg = readCyberToolsConfig()
  const sc  = (cfg['shared_context'] ?? {}) as Record<string, unknown>
  writeCyberToolsConfig({ shared_context: { ...sc, activePlaybook: undefined } })
  updateStatus(undefined, undefined)
  return { ok: true, run }
})

ipcMain.handle('context:get', () => getSharedContext())

// ─── IPC: Run command in TerminalLink ─────────────────────────────────────────

interface RunCommandPayload {
  command: string
  stepTitle: string
  playbookTitle: string
  source: string
  queuedAt: string
}

ipcMain.handle('playbook:run-command', (_e, payload: RunCommandPayload) => {
  try {
    writeCyberToolsConfig({ pending_command: payload })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
})

// ─── Boot ─────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  customPlaybooks = loadCustomPlaybooks()
  runs            = loadRuns()
  lastContext     = getSharedContext()

  createWindow()
  updateStatus()
  emitEvent('PlaybookStudio', 'app:launched', { version: APP_VERSION })

  mainWindow!.webContents.once('did-finish-load', () => {
    push('context:updated', lastContext)
  })

  contextTimer = setInterval(pollContext, CONTEXT_POLL_MS)
})

app.on('window-all-closed', () => {
  if (contextTimer) clearInterval(contextTimer)
  emitEvent('PlaybookStudio', 'app:closed', {})
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
