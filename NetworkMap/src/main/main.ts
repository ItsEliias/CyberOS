// NetworkMap — main.ts
// ItsEliias // v1.0

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { exec } from 'child_process'
import { emitEvent } from './ecosystem-bus'
import { consumePendingAction, installPendingActionWatcher } from './pendingActions'
import type { NetworkNode, NetworkPort, NetworkGraph, GraphSummary } from '../shared/types'

const APP_VERSION       = '1.0.0'
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')
const GRAPHS_DIR        = path.join(os.homedir(), 'Library', 'Application Support', 'NetworkMap', 'graphs')

let mainWindow: BrowserWindow | null = null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureGraphsDir(): void {
  if (!fs.existsSync(GRAPHS_DIR)) fs.mkdirSync(GRAPHS_DIR, { recursive: true })
}

function readCyberToolsConfig(): Record<string, unknown> {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {}
    return JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
  } catch { return {} }
}

function writeCyberToolsConfig(patch: Record<string, unknown>): void {
  try {
    const existing = readCyberToolsConfig()
    const merged = { ...existing, ...patch }
    // Atomic: every CyberTools app polls this file. A crash mid-write would
    // leave a truncated file that crashes the JSON.parse in every reader.
    const tmp = `${CYBERTOOLS_CONFIG}.${process.pid}.${Date.now()}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(merged, null, 2), 'utf8')
    fs.renameSync(tmp, CYBERTOOLS_CONFIG)
  } catch (e) {
    console.warn('[NetworkMap] config write failed:', (e as Error).message)
  }
}

// ─── Nmap XML Parser ──────────────────────────────────────────────────────────

function parseNmapXml(xml: string): NetworkNode[] {
  const nodes: NetworkNode[] = []
  const hostBlocks = xml.match(/<host[\s\S]*?<\/host>/g) || []

  for (const block of hostBlocks) {
    const ipMatch = block.match(/<address addr="([^"]+)" addrtype="ipv4"/)
    if (!ipMatch) continue
    const ip = ipMatch[1]

    const statusMatch = block.match(/<status state="([^"]+)"/)
    const status = (statusMatch?.[1] === 'up' ? 'up' : 'down') as 'up' | 'down'

    const hostnameMatch = block.match(/<hostname name="([^"]+)"/)
    const hostname = hostnameMatch?.[1]

    const osMatch = block.match(/<osmatch name="([^"]+)"/)
    const os = osMatch?.[1]

    const ports: NetworkPort[] = []
    const portBlocks = block.match(/<port [^>]+>[\s\S]*?<\/port>/g) || []
    for (const pb of portBlocks) {
      const portMatch   = pb.match(/portid="(\d+)"/)
      const protoMatch  = pb.match(/protocol="([^"]+)"/)
      const stateMatch  = pb.match(/<state state="([^"]+)"/)
      const serviceMatch = pb.match(/<service name="([^"]*)"/)
      const productMatch = pb.match(/product="([^"]*)"/)
      const versionMatch = pb.match(/version="([^"]*)"/)
      if (!portMatch || !stateMatch) continue
      ports.push({
        port:     parseInt(portMatch[1]),
        protocol: protoMatch?.[1] || 'tcp',
        state:    stateMatch[1] as 'open' | 'filtered' | 'closed',
        service:  serviceMatch?.[1],
        product:  productMatch?.[1],
        version:  versionMatch?.[1],
      })
    }

    const openPortCount = ports.filter(p => p.state === 'open').length
    // Per spec: only include hosts with at least 1 open port
    if (openPortCount === 0) continue
    nodes.push({ id: ip, ip, hostname, os, status, ports, openPortCount, x: 0, y: 0 })
  }
  return nodes
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d1117',
    title: 'NetworkMap',
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
    writeNetworkMapStatus({ running: true })
    emitEvent('NetworkMap', 'app:launched', { version: APP_VERSION })
    // Consume any tray-menu queued action once the renderer has had time to mount.
    setTimeout(() => {
      const pending = consumePendingAction('networkmap')
      if (pending) mainWindow?.webContents?.send('pending-action', pending.action)
    }, 800)
  })
}

function writeNetworkMapStatus(patch: Record<string, unknown>): void {
  const cfg = readCyberToolsConfig()
  const existing = (cfg['networkmap_status'] ?? {}) as Record<string, unknown>
  writeCyberToolsConfig({ networkmap_status: { ...existing, ...patch, updatedAt: new Date().toISOString() } })
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('parse-nmap-xml', (_e, xml: string): NetworkNode[] => {
  return parseNmapXml(xml)
})

ipcMain.handle('load-nmap-file', async (): Promise<NetworkNode[] | null> => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Nmap XML',
    filters: [{ name: 'XML', extensions: ['xml'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  try {
    const xml = fs.readFileSync(result.filePaths[0], 'utf8')
    return parseNmapXml(xml)
  } catch (e) {
    console.error('[NetworkMap] Failed to read nmap file:', (e as Error).message)
    return null
  }
})

ipcMain.handle('load-nmap-file-raw', async (): Promise<{ content: string; filename: string } | null> => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Nmap XML',
    filters: [{ name: 'XML', extensions: ['xml'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  try {
    const filePath = result.filePaths[0]
    const content  = fs.readFileSync(filePath, 'utf8')
    const filename = path.basename(filePath, '.xml')
    return { content, filename }
  } catch (e) {
    console.error('[NetworkMap] load-nmap-file-raw failed:', (e as Error).message)
    return null
  }
})

ipcMain.handle('export-svg', async (_e, svgContent: string, name: string): Promise<void> => {
  if (!mainWindow) return
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export SVG',
    defaultPath: `${name.replace(/[^a-z0-9_-]/gi, '_')}.svg`,
    filters: [{ name: 'SVG', extensions: ['svg'] }],
  })
  if (result.canceled || !result.filePath) return
  try {
    fs.writeFileSync(result.filePath, svgContent, 'utf8')
    emitEvent('NetworkMap', 'graph:exported', { name, format: 'svg' })
  } catch (e) {
    console.error('[NetworkMap] export-svg failed:', (e as Error).message)
  }
})

ipcMain.handle('import-from-recondesk', (): NetworkNode[] => {
  try {
    const cfg = readCyberToolsConfig()
    const rd = cfg['recondesk_status'] as Record<string, unknown> | undefined
    const activeTarget = rd?.['activeTarget'] as string | undefined
    if (!activeTarget) return []

    const targets = cfg['recondesk_targets'] as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(targets)) return []

    const target = targets.find(t => t['name'] === activeTarget || t['ip'] === activeTarget)
    if (!target) return []

    const ip = (target['ip'] ?? activeTarget) as string
    const portsRaw = target['ports'] as Array<Record<string, unknown>> | undefined
    const ports: NetworkPort[] = Array.isArray(portsRaw)
      ? portsRaw.map(p => ({
          port:     Number(p['port'] ?? 0),
          protocol: (p['protocol'] as string) ?? 'tcp',
          state:    ((p['state'] as string) ?? 'open') as 'open' | 'filtered' | 'closed',
          service:  p['service'] as string | undefined,
          product:  p['product'] as string | undefined,
          version:  p['version'] as string | undefined,
        }))
      : []

    const openPortCount = ports.filter(p => p.state === 'open').length
    const node: NetworkNode = {
      id: ip,
      ip,
      hostname: target['hostname'] as string | undefined,
      os: target['os'] as string | undefined,
      status: 'up',
      ports,
      openPortCount,
      x: 0,
      y: 0,
    }
    return [node]
  } catch (e) {
    console.error('[NetworkMap] import-from-recondesk failed:', (e as Error).message)
    return []
  }
})

ipcMain.handle('save-graph', (_e, graph: NetworkGraph): void => {
  try {
    ensureGraphsDir()
    const file = path.join(GRAPHS_DIR, `${graph.id}.json`)
    // Atomic — a crash mid-write would leave a half-formed graph JSON that
    // would silently disappear from the library on next load.
    const tmp = `${file}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(graph, null, 2), 'utf8')
    fs.renameSync(tmp, file)
    emitEvent('NetworkMap', 'graph:saved', { id: graph.id, name: graph.name })
  } catch (e) {
    console.error('[NetworkMap] save-graph failed:', (e as Error).message)
  }
})

ipcMain.handle('load-graphs', (): GraphSummary[] => {
  try {
    ensureGraphsDir()
    const files = fs.readdirSync(GRAPHS_DIR).filter(f => f.endsWith('.json'))
    return files
      .map(f => {
        try {
          const g = JSON.parse(fs.readFileSync(path.join(GRAPHS_DIR, f), 'utf8')) as NetworkGraph
          return {
            id:           g.id,
            name:         g.name,
            createdAt:    g.createdAt,
            nodeCount:    g.nodes.length,
            edgeCount:    g.edges.length,
            importSource: g.metadata?.importSource,
          } satisfies GraphSummary
        } catch { return null }
      })
      .filter((s): s is GraphSummary => s !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch { return [] }
})

ipcMain.handle('load-graph', (_e, id: string): NetworkGraph | null => {
  try {
    const file = path.join(GRAPHS_DIR, `${id}.json`)
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8')) as NetworkGraph
  } catch { return null }
})

ipcMain.handle('delete-graph', (_e, id: string): void => {
  try {
    const file = path.join(GRAPHS_DIR, `${id}.json`)
    if (fs.existsSync(file)) fs.unlinkSync(file)
    emitEvent('NetworkMap', 'graph:deleted', { id })
  } catch (e) {
    console.error('[NetworkMap] delete-graph failed:', (e as Error).message)
  }
})

ipcMain.handle('app:version', () => APP_VERSION)

// Validate before handing to shell.openExternal — the renderer process is
// less trusted than main, and a malformed IPC payload (or a future XSS via
// an imported nmap XML field rendered as a link) could shell-execute
// arbitrary URI handlers via custom schemes (x-apple-*, vscode://, etc.).
// Allow only the schemes the app actually uses: http(s) for external links,
// file: for the bundled docs path, and mailto:. Bare absolute paths to .md
// files are also allowed (OnboardingModal opens a docs path directly).
ipcMain.handle('open-external', (_e, url: string) => {
  if (typeof url !== 'string' || !url) return
  // Bare absolute path to a markdown docs file — OnboardingModal does this.
  if (url.startsWith('/') && url.endsWith('.md')) { shell.openExternal(url); return }
  try {
    const proto = new URL(url).protocol
    if (proto !== 'http:' && proto !== 'https:' && proto !== 'file:' && proto !== 'mailto:') return
    shell.openExternal(url)
  } catch { /* invalid URL — silently drop */ }
})

// ─── ReconDesk Sync Handlers ──────────────────────────────────────────────────

ipcMain.handle('recondesk:push-node', (_e, node: {
  ip: string
  ports: Array<{ number: number; protocol: string; service?: string; version?: string; state: string }>
}) => {
  try {
    const dataPath = path.join(os.homedir(), '.recondesk', 'data.json')
    if (!fs.existsSync(dataPath)) return { ok: false, reason: 'ReconDesk data not found' }
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    const target = data.targets.find((t: any) => t.ip === node.ip)
    if (!target) return { ok: false, reason: `No ReconDesk target with IP ${node.ip}` }

    const now = new Date().toISOString()
    let portsAdded = 0
    for (const port of node.ports) {
      const exists = target.ports.find((p: any) => p.number === port.number && p.protocol === port.protocol)
      if (!exists) {
        target.ports.push({
          id: `${Date.now()}-${port.number}`,
          ...port,
          notes: 'Imported from NetworkMap',
        })
        portsAdded++
      }
    }
    target.updatedAt = now
    // Atomic — this writes into ReconDesk's data.json; a partial write would
    // corrupt every target. (A file lock would be ideal here since ReconDesk
    // may be writing concurrently, but at minimum prevent corruption.)
    const tmp = `${dataPath}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
    fs.renameSync(tmp, dataPath)
    return { ok: true, targetName: target.name, portsAdded }
  } catch (e) {
    console.error('[NetworkMap] recondesk:push-node failed:', (e as Error).message)
    return { ok: false, reason: (e as Error).message }
  }
})

ipcMain.handle('recondesk:generate-graph', () => {
  try {
    const dataPath = path.join(os.homedir(), '.recondesk', 'data.json')
    if (!fs.existsSync(dataPath)) return null
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    const config = readCyberToolsConfig()
    const activeIP = (config['shared_context'] as any)?.activeIP
    const activeTarget =
      (activeIP ? data.targets.find((t: any) => t.ip === activeIP) : null) ??
      data.targets.find((t: any) => t.id === data.activeTargetId)
    if (!activeTarget) return null

    return {
      name: `${activeTarget.name} (ReconDesk)`,
      nodes: [{
        id: activeTarget.ip,
        label: activeTarget.name,
        ip: activeTarget.ip,
        ports: activeTarget.ports.map((p: any) => ({
          number:   p.number,
          protocol: p.protocol,
          service:  p.service,
          state:    p.state,
        })),
      }],
      edges: [],
    }
  } catch (e) {
    console.error('[NetworkMap] recondesk:generate-graph failed:', (e as Error).message)
    return null
  }
})

ipcMain.handle('export-png', async (_e, dataUrl: string, name: string): Promise<void> => {
  if (!mainWindow) return
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PNG',
    defaultPath: `${name.replace(/[^a-z0-9_-]/gi, '_')}.png`,
    filters: [{ name: 'PNG', extensions: ['png'] }],
  })
  if (result.canceled || !result.filePath) return
  try {
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
    fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'))
    emitEvent('NetworkMap', 'graph:exported', { name, format: 'png' })
  } catch (e) { console.error('[NetworkMap] export-png failed:', (e as Error).message) }
})

ipcMain.handle('export-json', async (_e, json: string, name: string): Promise<void> => {
  if (!mainWindow) return
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export JSON',
    defaultPath: `${name.replace(/[^a-z0-9_-]/gi, '_')}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (result.canceled || !result.filePath) return
  try {
    fs.writeFileSync(result.filePath, json, 'utf8')
    emitEvent('NetworkMap', 'graph:exported', { name, format: 'json' })
  } catch (e) { console.error('[NetworkMap] export-json failed:', (e as Error).message) }
})

ipcMain.handle('terminallink:set-target', (_e, ip: string): void => {
  try {
    writeCyberToolsConfig({ shared_context: { activeIP: ip, setBy: 'NetworkMap', setAt: new Date().toISOString() } })
    emitEvent('NetworkMap', 'terminallink:target-set', { ip })
  } catch (e) { console.error('[NetworkMap] terminallink:set-target failed:', (e as Error).message) }
})

ipcMain.handle('nmap:run', (_e, ip: string): Promise<void> => {
  return new Promise(resolve => {
    const cmd = `nmap -sV -sC ${ip} -oN /tmp/networkmap-rescan-${ip.replace(/\./g, '_')}.txt`
    exec(cmd, { timeout: 120000 }, (err) => {
      if (err) console.error('[NetworkMap] nmap:run failed:', err.message)
      resolve()
    })
  })
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
    ensureGraphsDir()
    createWindow()
  })

  app.on('window-all-closed', () => {
    writeNetworkMapStatus({ running: false })
    emitEvent('NetworkMap', 'app:closed', {})
    app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}
