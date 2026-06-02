// ReconDesk — main.ts
// ItsEliias // v1.0 — Electron main process

import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import https from 'https'
import { emitEvent } from './ecosystem-bus'
import type { ReconDeskData, ReconDeskStatus, CveResult } from '../shared/types'

// ─── CVE lookup ───────────────────────────────────────────────────────────────

const cveCache = new Map<string, CveResult[]>()

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
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
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

  // Detect new credentials across all targets
  if (prev) {
    let credentialDelta = 0
    for (const target of data.targets) {
      const prevTarget = prev.targets.find(t => t.id === target.id)
      const prevCredCount = prevTarget ? prevTarget.credentials.length : 0
      const currCredCount = target.credentials.length
      if (currCredCount > prevCredCount) {
        credentialDelta += currCredCount - prevCredCount
      }
    }
    if (credentialDelta > 0) {
      try {
        let shared: Record<string, unknown> = {}
        if (fs.existsSync(CYBERTOOLS_CONFIG)) {
          try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch {}
        }
        const profile = (shared.operator_profile as Record<string, unknown>) || {}
        const current = typeof profile.totalCredentials === 'number' ? profile.totalCredentials : 0
        updateOperatorProfile({ totalCredentials: current + credentialDelta })
      } catch {}

      // Collect new credential objects and push to credvault_pending
      try {
        const newCreds: Array<{ targetName: string; targetIP: string; username?: string; hash?: string; type: string; service?: string; queuedAt: string }> = []
        for (const target of data.targets) {
          const prevTarget = prev.targets.find(t => t.id === target.id)
          const prevCredIds = new Set(prevTarget?.credentials.map(c => c.id) ?? [])
          for (const cred of target.credentials) {
            if (!prevCredIds.has(cred.id)) {
              newCreds.push({
                targetName: target.name,
                targetIP:   target.ip,
                username:   cred.username,
                hash:       cred.hash,
                type:       cred.type ?? 'unknown',
                service:    cred.service,
                queuedAt:   new Date().toISOString()
              })
            }
          }
        }
        if (newCreds.length > 0) {
          let shared: Record<string, unknown> = {}
          if (fs.existsSync(CYBERTOOLS_CONFIG)) {
            try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch {}
          }
          const existing = (shared.credvault_pending as typeof newCreds) || []
          shared.credvault_pending = [...existing, ...newCreds]
          fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8')
        }
      } catch {}
    }

    // Detect targets newly marked completed — emit ecosystem event (don't count labs here)
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

ipcMain.handle('cve:lookup', (_e, service: string, version: string): Promise<CveResult[]> => {
  const key = `${service} ${version}`.trim().toLowerCase()
  if (!key || key.length < 3) return Promise.resolve([])
  if (cveCache.has(key)) return Promise.resolve(cveCache.get(key)!)

  return new Promise((resolve) => {
    const query = encodeURIComponent(key)
    const reqPath = `/rest/json/cves/2.0?keywordSearch=${query}&resultsPerPage=5`
    const options = {
      hostname: 'services.nvd.nist.gov',
      path: reqPath,
      headers: { 'User-Agent': 'CyberOS-ReconDesk' }
    }
    const timer = setTimeout(() => resolve([]), 8000)
    https.get(options, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        clearTimeout(timer)
        try {
          const json = JSON.parse(data)
          const results: CveResult[] = (json.vulnerabilities ?? []).map((v: any) => {
            const cve    = v.cve
            const metric = cve.metrics?.cvssMetricV31?.[0] ?? cve.metrics?.cvssMetricV2?.[0]
            return {
              id:          cve.id,
              description: cve.descriptions?.find((d: any) => d.lang === 'en')?.value ?? '',
              score:       metric?.cvssData?.baseScore ?? null,
              severity:    metric?.cvssData?.baseSeverity ?? null,
              published:   cve.published?.slice(0, 10) ?? '',
              url:         `https://nvd.nist.gov/vuln/detail/${cve.id}`
            }
          })
          cveCache.set(key, results)
          resolve(results)
        } catch { resolve([]) }
      })
    }).on('error', () => { clearTimeout(timer); resolve([]) })
  })
})

ipcMain.handle('shell:open', (_e, url: string) => shell.openExternal(url))

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

app.whenReady().then(() => {
  createWindow()
  const data = loadData()
  _previousData = data  // seed so first save doesn't false-positive on existing credentials
  writeStatus(data)
  emitEvent('ReconDesk', 'app:launched', { version: APP_VERSION })
  if (mainWindow) setupConfigWatch(mainWindow)

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

app.on('before-quit', () => { configWatcher?.close() })

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
