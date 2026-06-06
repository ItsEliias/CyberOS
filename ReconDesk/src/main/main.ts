// ReconDesk — main.ts
// ItsEliias // v1.0 — Electron main process

import { app, BrowserWindow, ipcMain, shell, dialog, Notification, desktopCapturer } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import https from 'https'
import { emitEvent } from './ecosystem-bus'
import { detectCredentialChanges } from './credential-tracker'
import { registerNetworkHandlers } from './ipc-network-handlers'
import { consumePendingAction, installPendingActionWatcher } from './pendingActions'
import type { ReconDeskData, ReconDeskStatus } from '../shared/types'

// ─────────────────────────────────────────────────────────────────────────────

const APP_VERSION       = '1.0.0'
const DATA_FILE         = path.join(os.homedir(), '.recondesk', 'data.json')
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')

let mainWindow: BrowserWindow | null = null
let statusInterval: NodeJS.Timeout | null = null
let configWatcher: fs.FSWatcher | null = null

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
  // Atomic write — a crash mid-fs.writeFileSync used to leave a half-written
  // data.json that failed to parse on next launch, losing every target.
  const tmp = `${DATA_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, DATA_FILE)
}

function defaultData(): ReconDeskData {
  return { targets: [], cards: [], activeTargetId: null, version: APP_VERSION }
}

function updateOperatorProfile(updates: Record<string, unknown>): void {
  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch {}
    }
    const existing = (shared.operator_profile as Record<string, unknown>) || {}
    shared.operator_profile = { ...existing, ...updates }
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8')
  } catch {}
}

function writeStatus(data: ReconDeskData): void {
  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch (_) {}
    }
    const activeTarget = data.targets.find(t => t.id === data.activeTargetId)
    const status: ReconDeskStatus = {
      active:       true,
      lastActive:   new Date().toISOString(),
      targetCount:  data.targets.length,
      cardCount:    data.cards.length,
      activeTarget: activeTarget?.name
    }
    shared.recondesk_status = status
    const existingCtx = (shared.shared_context as Record<string, unknown>) || {}
    shared.shared_context = {
      ...existingCtx,
      activeTarget: activeTarget?.name,
      activeIP:     activeTarget?.ip,
      lastUpdated:  new Date().toISOString(),
      updatedBy:    'ReconDesk'
    }
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8')
  } catch (e) {
    console.warn('[ReconDesk] status write failed:', (e as Error).message)
  }
}

function setupConfigWatch(win: BrowserWindow): void {
  try {
    configWatcher = fs.watch(CYBERTOOLS_CONFIG, { persistent: false }, () => {
      setTimeout(() => {
        try {
          const data = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
          win.webContents.send('config:updated', data)
        } catch {}
      }, 100)
    })
  } catch {}
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

// Track previous state for change detection
let _previousData: ReconDeskData | null = null

ipcMain.handle('data:save', (_e, data: ReconDeskData) => {
  const prev = _previousData

  if (prev) {
    // Credential tracking (extracted to credential-tracker.ts)
    detectCredentialChanges(prev, data)

    // Detect targets newly marked completed
    for (const target of data.targets) {
      const prevTarget = prev.targets.find(t => t.id === target.id)
      if (target.status === 'completed' && prevTarget && prevTarget.status !== 'completed') {
        try { emitEvent('ReconDesk', 'target:completed', { name: target.name, ip: target.ip }) } catch {}
      }
    }
  }

  _previousData = data
  saveData(data)
  writeStatus(data)
  return true
})

ipcMain.handle('app:version', () => APP_VERSION)

ipcMain.handle('shell:open', (_e, url: string) => shell.openExternal(url))

// ─── New V2 IPC handlers ──────────────────────────────────────────────────────

ipcMain.handle('recondesk:write-context', (_e, ctx: { activeTarget: string; activeIP: string }) => {
  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch {}
    }
    const existingCtx = (shared.shared_context as Record<string, unknown>) || {}
    shared.shared_context = {
      ...existingCtx,
      activeTarget: ctx.activeTarget,
      activeIP: ctx.activeIP,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'ReconDesk'
    }
    const existingStatus = (shared.recondesk_status as Record<string, unknown>) || {}
    shared.recondesk_status = {
      ...existingStatus,
      activeTarget: ctx.activeTarget,
    }
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8')
    return { ok: true }
  } catch (e) {
    console.warn('[ReconDesk] writeContext failed:', (e as Error).message)
    return { ok: false }
  }
})

ipcMain.handle('recondesk:emit-event', (_e, event: string, data: Record<string, unknown>) => {
  try {
    emitEvent('ReconDesk', event, data)
  } catch {}
})

ipcMain.handle('recondesk:read-config', () => {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {}
    return JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
  } catch { return {} }
})

// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('flag:captured', () => {
  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch {}
    }
    const profile = (shared.operator_profile as Record<string, unknown>) || {}
    const current = typeof profile.totalFlags === 'number' ? profile.totalFlags : 0
    updateOperatorProfile({ totalFlags: current + 1 })
  } catch {}
})

ipcMain.handle('export-target', async (_e, payload: { json: string; md: string; defaultName: string }) => {
  const win = BrowserWindow.getFocusedWindow()
  const { filePath, canceled } = await dialog.showSaveDialog(win!, {
    title: 'Export Target Data',
    defaultPath: payload.defaultName,
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'Markdown', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (canceled || !filePath) return { ok: false }

  const isMarkdown = filePath.endsWith('.md')
  fs.writeFileSync(filePath, isMarkdown ? payload.md : payload.json, 'utf8')

  // Also write the other format alongside
  const alt = isMarkdown
    ? filePath.replace(/\.md$/, '.json')
    : filePath.replace(/\.json$/, '.md')
  fs.writeFileSync(alt, isMarkdown ? payload.json : payload.md, 'utf8')

  return { ok: true, filePath }
})

// ─── Screenshot capture ───────────────────────────────────────────────────────

ipcMain.handle('recondesk:capture-screenshot', async (_e, label: string) => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } })
    if (sources.length === 0) return { ok: false, error: 'No screen sources' }
    const source = sources[0]
    const thumbnail = source.thumbnail.toDataURL()
    const dataDir = path.join(app.getPath('userData'), 'screenshots')
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    const fileName = `screenshot-${Date.now()}.png`
    const filePath = path.join(dataDir, fileName)
    const base64 = thumbnail.replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
    return { ok: true, path: filePath, thumbnail }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
})

// ─── PDF export ───────────────────────────────────────────────────────────────

ipcMain.handle('recondesk:export-pdf', async (_e, payload: { html: string; defaultName: string }) => {
  const win = BrowserWindow.getFocusedWindow()
  const { filePath, canceled } = await dialog.showSaveDialog(win!, {
    title: 'Export PDF Report',
    defaultPath: payload.defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return { ok: false }

  const offscreen = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false },
  })
  try {
    await offscreen.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(payload.html)}`)
    const pdfBuffer = await offscreen.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
    fs.writeFileSync(filePath, pdfBuffer)
    return { ok: true, filePath }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  } finally {
    offscreen.destroy()
  }
})

// ─── SSO state (read from shared cybertools-config.json) ─────────────────────
ipcMain.handle('get-sso', () => {
  try {
    const cfgPath = path.join(os.homedir(), 'cybertools-config.json')
    if (!fs.existsSync(cfgPath)) return { unlocked: false }
    const shared = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {}
    const sso = shared.sso as { unlocked?: boolean; expiresAt?: string | null; unlockedAt?: string | null } | undefined
    if (!sso?.unlocked) return { unlocked: false }
    if (sso.expiresAt && new Date(sso.expiresAt).getTime() < Date.now()) return { unlocked: false }
    return { unlocked: true, unlockedAt: sso.unlockedAt, expiresAt: sso.expiresAt }
  } catch { return { unlocked: false } }
})

ipcMain.handle('open-credvault', () => {
  try {
    const target = '/Applications/CredVault.app'
    if (!fs.existsSync(target)) return false
    const { spawn } = require('child_process') as typeof import('child_process')
    spawn('open', [target], { detached: true, stdio: 'ignore' }).unref()
    return true
  } catch { return false }
})

// ─── System notification ──────────────────────────────────────────────────────

ipcMain.handle('recondesk:notify', (_e, title: string, body: string) => {
  try {
    const n = new Notification({ title, body, silent: false })
    n.show()
    return true
  } catch { return false }
})

// ─── NetworkMap IPC bridge ────────────────────────────────────────────────────

ipcMain.handle('recondesk:open-in-networkmap', (_e, ip: string) => {
  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch {}
    }
    shared.networkmap_focus = { ip, requestedAt: new Date().toISOString(), requestedBy: 'ReconDesk' }
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8')
    emitEvent('ReconDesk', 'networkmap:focus-ip', { ip })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
})

// ─── CredVault linked credentials ────────────────────────────────────────────

ipcMain.handle('recondesk:fetch-credvault', (_e, ip: string, hostname: string) => {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return []
    const shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
    const pending = (shared.credvault_pending as any[]) ?? []
    const stored  = (shared.credvault_stored  as any[]) ?? []
    const all     = [...pending, ...stored]
    const q = [ip, hostname].filter(Boolean).map(s => s.toLowerCase())
    return all.filter((c: any) =>
      q.some(v => c.targetIP?.toLowerCase() === v || c.hostname?.toLowerCase()?.includes(v))
    )
  } catch { return [] }
})

// ─── CSV import (no-op IPC, handled in renderer) ─────────────────────────────

ipcMain.handle('recondesk:open-file-dialog', async (_e, opts: Electron.OpenDialogOptions) => {
  const win = BrowserWindow.getFocusedWindow()
  return dialog.showOpenDialog(win!, opts)
})

// ─── AI next-step suggestions ─────────────────────────────────────────────────

ipcMain.handle('recondesk:ai-suggest', (_e, payload: {
  apiKey: string; ports: string[]; os: string; cves: string[]; engagement: string
}): Promise<string[] | null> => {
  if (!payload.apiKey) return Promise.resolve(null)
  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `You are a penetration tester. Given this target context, suggest 3-5 concrete next enumeration or exploitation steps. Return ONLY a JSON array of strings, no commentary.\n\nOS: ${payload.os || 'Unknown'}\nOpen ports: ${payload.ports.join(', ') || 'None scanned'}\nKnown CVEs: ${payload.cves.join(', ') || 'None'}\nEngagement type: ${payload.engagement || 'General'}`
    }]
  })

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 20000)
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': payload.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      }
    }, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        clearTimeout(timer)
        try {
          const json  = JSON.parse(data)
          const text  = json.content?.[0]?.text ?? ''
          const match = text.match(/\[[\s\S]*\]/)
          if (match) resolve(JSON.parse(match[0]))
          else resolve(null)
        } catch { resolve(null) }
      })
    })
    req.on('error', () => { clearTimeout(timer); resolve(null) })
    req.write(body)
    req.end()
  })
})

app.whenReady().then(() => {
  registerNetworkHandlers()
  createWindow()
  const data = loadData()
  _previousData = data  // seed so first save doesn't false-positive on existing credentials
  writeStatus(data)
  emitEvent('ReconDesk', 'app:launched', { version: APP_VERSION })
  if (mainWindow) setupConfigWatch(mainWindow)

  // Tray-menu pending action — let the renderer mount, then dispatch.
  setTimeout(() => {
    const pending = consumePendingAction('recondesk')
    if (pending && mainWindow) {
      mainWindow.webContents.send('pending-action', pending.action)
    }
  }, 800)

  
    // Listen for tray-action writes while the app is already running
    installPendingActionWatcher('recondesk', (action) => {
      try { mainWindow?.webContents.send('pending-action', action) } catch { /* ignore */ }
    })

  statusInterval = setInterval(() => {
    const d = loadData()
    writeStatus(d)
  }, 10_000)
})

app.on('window-all-closed', () => {
  if (statusInterval) clearInterval(statusInterval)
  emitEvent('ReconDesk', 'app:closed', {})
  app.quit()
})

app.on('before-quit', () => { configWatcher?.close() })

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
