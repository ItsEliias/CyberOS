// SignalBoard — main.ts v2.1

import { app, BrowserWindow, ipcMain, shell, Notification, Tray, nativeImage, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import https from 'https'
import { emitEvent } from './ecosystem-bus'
import {
  DEFAULT_SOURCES, loadSources, saveSources,
  loadCache, saveCache, fetchAllFeeds, saveItemToVault,
  computeTier, applyAlertRules, deduplicateItems, probeFeed
} from './feeds'
import type {
  FeedItem, FeedSource, FeedState, RelevanceContext, AppSettings, AlertRule
} from '../shared/types'

const APP_VERSION       = '2.0.0'
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')
const DATA_DIR          = path.join(os.homedir(), '.signalboard')
const SETTINGS_FILE     = path.join(DATA_DIR, 'settings.json')
const BOOKMARKS_FILE    = path.join(DATA_DIR, 'bookmarks.json')
const BOOKMARK_TAGS_FILE = path.join(DATA_DIR, 'bookmark-tags.json')
const PER_SOURCE_TIMERS_FILE = path.join(DATA_DIR, 'per-source-timers.json')

const DEFAULT_SETTINGS: AppSettings = {
  refreshInterval:      15,
  maxItemsPerSource:    30,
  autoClearDays:        30,
  notificationsEnabled: true,
  notificationThreshold: 40,
  aiProvider:           'claude',
  claudeApiKey:         '',
  aiAutoSummarise:      false,
  alertRules:           [],
  readerLightMode:      false,
}

let mainWindow:      BrowserWindow | null = null
let tray:            Tray | null = null
let refreshTimer:    NodeJS.Timeout | null = null
let contextTimer:    NodeJS.Timeout | null = null
let digestTimer:     NodeJS.Timeout | null = null
let perSourceTimers: Map<string, NodeJS.Timeout> = new Map()
let cachedItems:     FeedItem[]    = []
let sources:         FeedSource[]  = []
let settings:        AppSettings   = DEFAULT_SETTINGS
let firedNotifIds:   Set<string>   = new Set()
let alertBadgeCount: number        = 0
let cveCache:        Map<string, { cvss?: number; severity?: string }> = new Map()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readCyberToolsConfig(): Record<string, unknown> {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {}
    return JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
  } catch { return {} }
}

function getRelevanceContext(): RelevanceContext {
  const cfg = readCyberToolsConfig()
  const sc  = cfg['shared_context'] as Record<string, unknown> | undefined
  const sb  = cfg['signalboard']    as Record<string, unknown> | undefined
  return {
    lab:            sc?.['activeLab']    as string | undefined,
    target:         sc?.['activeTarget'] as string | undefined,
    ip:             sc?.['activeIP']     as string | undefined,
    customKeywords: (sb?.['customKeywords'] as string[] | undefined) ?? [],
    isAuto:         true,
  }
}

function writeStatus(items: FeedItem[], lastRefresh: string): void {
  try {
    const cfg  = readCyberToolsConfig()
    const top  = [...items].sort((a, b) => b.relevanceScore - a.relevanceScore)[0]
    const unread = items.filter(i => !i.read).length
    const patch: Record<string, unknown> = {
      ...cfg,
      signalboard_status: {
        active:       true,
        unreadCount:  unread,
        lastRefresh:  lastRefresh,
        topItem:      top?.title ?? null,
      },
    }
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(patch, null, 2), 'utf8')
  } catch { /* non-critical */ }
}

function loadSettings(): AppSettings {
  try {
    ensureDir()
    if (!fs.existsSync(SETTINGS_FILE)) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }
  } catch { return DEFAULT_SETTINGS }
}

function saveSettings(s: AppSettings): void {
  ensureDir()
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2), 'utf8')
}

function loadBookmarks(): { ids: string[]; tags: Record<string, string[]> } {
  try {
    ensureDir()
    const ids  = fs.existsSync(BOOKMARKS_FILE) ? JSON.parse(fs.readFileSync(BOOKMARKS_FILE, 'utf8')) : []
    const tags = fs.existsSync(BOOKMARK_TAGS_FILE) ? JSON.parse(fs.readFileSync(BOOKMARK_TAGS_FILE, 'utf8')) : {}
    return { ids, tags }
  } catch { return { ids: [], tags: {} } }
}

function saveBookmarks(ids: string[], tags: Record<string, string[]>): void {
  ensureDir()
  fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(ids, null, 2), 'utf8')
  fs.writeFileSync(BOOKMARK_TAGS_FILE, JSON.stringify(tags, null, 2), 'utf8')
}

function getVaultPath(): string | undefined {
  const cfg = readCyberToolsConfig()
  return cfg['obsidianVaultPath'] as string | undefined
}

function push(channel: string, data: unknown): void {
  mainWindow?.webContents?.send(channel, data)
}

function updateTrayBadge(count: number): void {
  alertBadgeCount = count
  if (!tray) return
  if (count > 0) {
    tray.setToolTip(`SignalBoard — ${count} alert${count > 1 ? 's' : ''}`)
  } else {
    tray.setToolTip('SignalBoard')
  }
  // Update badge image with count overlaid
  const img = buildTrayIcon(count)
  tray.setImage(img)
}

function buildTrayIcon(count: number): Electron.NativeImage {
  // Simple: use default icon, badge via tooltip (macOS supports setBadge via app.dock)
  const size = 16
  const canvas = nativeImage.createEmpty()
  // Return empty image if we can't generate, tray will use template icon
  return canvas
}

function maybeFireAlertNotifications(items: FeedItem[]): void {
  const rules = settings.alertRules ?? []
  if (!rules.length || !settings.notificationsEnabled) return
  let newAlerts = 0
  items.forEach(item => {
    if (!item.alertMatches?.length) return
    const critical = item.alertMatches.find(m => m.severity === 'critical')
    if (critical && !firedNotifIds.has(`alert-${item.id}`)) {
      firedNotifIds.add(`alert-${item.id}`)
      newAlerts++
      if (Notification.isSupported()) {
        const n = new Notification({
          title: `ALERT: ${critical.label}`,
          body:  item.title,
          silent: false,
        })
        n.on('click', () => {
          mainWindow?.show()
          mainWindow?.focus()
          push('feeds:select-item', item.id)
        })
        n.show()
      }
    }
  })
  if (newAlerts > 0) updateTrayBadge(alertBadgeCount + newAlerts)
}

function maybeFireNotification(items: FeedItem[]): void {
  if (!settings.notificationsEnabled) return
  if (!Notification.isSupported()) return
  const threshold = settings.notificationThreshold
  items
    .filter(i => i.relevanceScore >= threshold && !firedNotifIds.has(i.id))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3)
    .forEach(item => {
      firedNotifIds.add(item.id)
      new Notification({
        title:  `SignalBoard — ${item.relevanceTier.toUpperCase()} [${item.relevanceScore}]`,
        body:   item.title,
        silent: false,
      }).show()
      emitEvent('SignalBoard', 'notification:fired', { id: item.id, score: item.relevanceScore })
    })
}

async function doRefresh(): Promise<void> {
  push('feeds:refreshing', true)
  const ctx        = getRelevanceContext()
  const prevItems  = cachedItems
  const rules      = settings.alertRules ?? []
  let freshItems   = await fetchAllFeeds(sources, prevItems, ctx, settings.maxItemsPerSource)
  freshItems       = applyAlertRules(freshItems, rules)
  freshItems       = deduplicateItems(freshItems)
  cachedItems      = freshItems
  saveCache(cachedItems)
  const ts = new Date().toISOString()
  writeStatus(cachedItems, ts)
  push('feeds:items',       cachedItems)
  push('feeds:refreshing',  false)
  push('feeds:lastRefreshed', ts)
  push('feeds:context',     ctx)
  maybeFireNotification(cachedItems)
  maybeFireAlertNotifications(cachedItems)
  emitEvent('SignalBoard', 'feeds:refreshed', { count: cachedItems.length })
  // Update sources from disk (fetchAllFeeds saves them)
  sources = loadSources()
  push('feeds:sources', sources)
}

function rescheduleRefresh(): void {
  if (refreshTimer) clearInterval(refreshTimer)
  if (settings.refreshInterval > 0) {
    refreshTimer = setInterval(doRefresh, settings.refreshInterval * 60 * 1_000)
  }
}

function schedulePerSourceTimers(): void {
  perSourceTimers.forEach(t => clearInterval(t))
  perSourceTimers.clear()
  sources.forEach(source => {
    if (!source.enabled || !source.pollIntervalMinutes) return
    const ms = source.pollIntervalMinutes * 60 * 1_000
    const timer = setInterval(async () => {
      push('feeds:refreshing', true)
      const ctx = getRelevanceContext()
      cachedItems = await fetchAllFeeds(sources, cachedItems, ctx, settings.maxItemsPerSource)
      cachedItems = applyAlertRules(cachedItems, settings.alertRules ?? [])
      cachedItems = deduplicateItems(cachedItems)
      saveCache(cachedItems)
      const ts = new Date().toISOString()
      push('feeds:items', cachedItems)
      push('feeds:refreshing', false)
      push('feeds:lastRefreshed', ts)
      sources = loadSources()
      push('feeds:sources', sources)
    }, ms)
    perSourceTimers.set(source.id, timer)
  })
}

function scheduleDigest(): void {
  if (digestTimer) clearInterval(digestTimer)
  const cfg = settings.digestConfig
  if (!cfg?.enabled) return
  // Check every minute if it's digest time
  digestTimer = setInterval(() => {
    const now = new Date()
    if (now.getHours() === cfg.hour && now.getMinutes() === cfg.minute) {
      const allowedSources = new Set(cfg.sourceIds)
      const candidates = cachedItems
        .filter(i => allowedSources.has(i.sourceId))
        .sort((a, b) => {
          const aMatch = (a.alertMatches?.length ?? 0)
          const bMatch = (b.alertMatches?.length ?? 0)
          return bMatch - aMatch || b.relevanceScore - a.relevanceScore
        })
      // Take top N per source
      const bySource = new Map<string, FeedItem[]>()
      candidates.forEach(item => {
        const arr = bySource.get(item.sourceId) ?? []
        if (arr.length < cfg.maxItemsPerSource) {
          arr.push(item)
          bySource.set(item.sourceId, arr)
        }
      })
      const digestItems = [...bySource.values()].flat()
      push('feeds:digest', digestItems)
    }
  }, 60_000)
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width:  1300,
    height: 820,
    minWidth:  960,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 12 },
    webPreferences: {
      preload:          path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  try {
    const icon = nativeImage.createFromNamedImage('NSImageNameApplicationIcon', [])
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
    tray.setToolTip('SignalBoard')
    tray.on('click', () => {
      mainWindow?.show()
      mainWindow?.focus()
      alertBadgeCount = 0
      updateTrayBadge(0)
    })
  } catch { /* tray not critical */ }
}

// ─── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.handle('feeds:get-state', (): FeedState => ({
  sources,
  items:         cachedItems,
  lastRefreshed: null,
  refreshing:    false,
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
  if (!item)  return { ok: false, error: 'Item not found' }
  if (!vault) return { ok: false, error: 'No vault path configured in cybertools-config.json' }
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
  schedulePerSourceTimers()
  return sources
})

ipcMain.handle('feeds:update-source', (_e, id: string, patch: Partial<FeedSource>) => {
  sources = sources.map(s => s.id === id ? { ...s, ...patch } : s)
  saveSources(sources)
  schedulePerSourceTimers()
  return sources
})

ipcMain.handle('feeds:add-source', (_e, src: Omit<FeedSource, 'id' | 'color' | 'itemCount' | 'errorCount'>) => {
  const id = `custom-${Date.now()}`
  const newSource: FeedSource = { ...src, id, color: '#ff6b6b', itemCount: 0, errorCount: 0 }
  sources = [...sources, newSource]
  saveSources(sources)
  schedulePerSourceTimers()
  return sources
})

ipcMain.handle('feeds:delete-source', (_e, id: string) => {
  sources = sources.filter(s => s.id !== id)
  saveSources(sources)
  push('feeds:sources', sources)
  schedulePerSourceTimers()
  return sources
})

ipcMain.handle('feeds:refresh-source', async (_e, id: string) => {
  const source = sources.find(s => s.id === id)
  if (!source) return false
  push('feeds:refreshing', true)
  const ctx = getRelevanceContext()
  cachedItems = await fetchAllFeeds(sources, cachedItems, ctx, settings.maxItemsPerSource)
  cachedItems = applyAlertRules(cachedItems, settings.alertRules ?? [])
  cachedItems = deduplicateItems(cachedItems)
  saveCache(cachedItems)
  const ts = new Date().toISOString()
  writeStatus(cachedItems, ts)
  push('feeds:items', cachedItems)
  push('feeds:refreshing', false)
  push('feeds:lastRefreshed', ts)
  sources = loadSources()
  push('feeds:sources', sources)
  return true
})

ipcMain.handle('feeds:test-source', async (_e, url: string) => {
  try {
    const raw   = await fetchUrlRaw(url)
    const count = (raw.match(/<item/g) ?? raw.match(/<entry/g) ?? []).length
    return { ok: true, count }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
})

// Probe a custom-feed URL: returns {ok, type, title, count} so the Custom Feeds UI can
// auto-detect rss/atom and seed the source name from the feed's own <title>.
ipcMain.handle('feeds:probe-feed', async (_e, url: string) => {
  return probeFeed(url)
})

ipcMain.handle('feeds:rescore', (_e) => {
  const ctx = getRelevanceContext()
  cachedItems = cachedItems.map(item => {
    const score = computeScoreFromContext(item, ctx)
    return { ...item, relevanceScore: score, relevanceTier: computeTier(score) }
  })
  cachedItems = applyAlertRules(cachedItems, settings.alertRules ?? [])
  saveCache(cachedItems)
  push('feeds:items', cachedItems)
  return true
})

ipcMain.handle('feeds:context', () => getRelevanceContext())

ipcMain.handle('feeds:get-bookmarks', () => loadBookmarks())

ipcMain.handle('feeds:save-bookmarks', (_e, ids: string[], tags: Record<string, string[]>) => {
  saveBookmarks(ids, tags)
  return true
})

ipcMain.handle('feeds:export-bookmarks', async (_e, format: 'json' | 'csv', ids: string[], tags: Record<string, string[]>) => {
  const bookmarked = cachedItems.filter(i => ids.includes(i.id))
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `signalboard-bookmarks.${format}`,
    filters: format === 'json'
      ? [{ name: 'JSON', extensions: ['json'] }]
      : [{ name: 'CSV',  extensions: ['csv'] }],
  })
  if (!filePath) return { ok: false }
  try {
    if (format === 'json') {
      const data = bookmarked.map(i => ({ ...i, bookmarkTags: tags[i.id] ?? [] }))
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    } else {
      const header = 'title,url,date,tags,source\n'
      const rows = bookmarked.map(i => {
        const t = (tags[i.id] ?? []).join(';')
        return `"${i.title.replace(/"/g, '""')}","${i.url}","${i.publishedAt}","${t}","${i.sourceName}"`
      })
      fs.writeFileSync(filePath, header + rows.join('\n'), 'utf8')
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
})

ipcMain.handle('feeds:recondesk-target', (_e, itemId: string) => {
  const item = cachedItems.find(i => i.id === itemId)
  if (!item) return { ok: false }
  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
  const hostRegex = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g
  const text = `${item.title} ${item.summary}`
  const ips   = [...text.matchAll(ipRegex)].map(m => m[0])
  const hosts = [...text.matchAll(hostRegex)].map(m => m[0]).filter(h => !h.match(/^\d/) && h.includes('.'))
  const targets = [...new Set([...ips, ...hosts])].slice(0, 10)
  // Emit ecosystem event for ReconDesk
  emitEvent('SignalBoard', 'recondesk:add-target', { targets, sourceTitle: item.title, sourceUrl: item.url })
  return { ok: true, targets }
})

ipcMain.handle('settings:get', () => settings)

ipcMain.handle('settings:set', (_e, patch: Partial<AppSettings>) => {
  settings = { ...settings, ...patch }
  saveSettings(settings)
  rescheduleRefresh()
  scheduleDigest()
  return settings
})

ipcMain.handle('config:write-keywords', (_e, keywords: string[]) => {
  try {
    const cfg = readCyberToolsConfig()
    const sb  = (cfg['signalboard'] as Record<string, unknown>) ?? {}
    cfg['signalboard'] = { ...sb, customKeywords: keywords }
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(cfg, null, 2), 'utf8')
    return true
  } catch { return false }
})

ipcMain.handle('ai:summarise', async (_e, item: FeedItem, apiKey: string) => {
  if (!apiKey) return { ok: false, error: 'No API key configured' }
  try {
    const bullets = await callClaudeApi(item, apiKey)
    cachedItems = cachedItems.map(i =>
      i.id === item.id ? { ...i, aiSummary: bullets } : i
    )
    saveCache(cachedItems)
    return { ok: true, bullets }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
})

ipcMain.handle('cve:lookup', async (_e, cveId: string) => {
  if (cveCache.has(cveId)) return { ok: true, data: cveCache.get(cveId) }
  try {
    const url  = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cveId)}`
    const raw  = await fetchUrlRaw(url)
    const json = JSON.parse(raw)
    const vuln = json?.vulnerabilities?.[0]?.cve
    const cvss = vuln?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore
              ?? vuln?.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore
              ?? vuln?.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore
    const severity = cvss == null ? undefined : cvss >= 9 ? 'critical' : cvss >= 7 ? 'high' : cvss >= 4 ? 'medium' : 'low'
    const data = { cvss, severity }
    cveCache.set(cveId, data)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
})

ipcMain.handle('app:version',       () => APP_VERSION)
ipcMain.handle('shell:open',        (_e, url: string) => shell.openExternal(url))
ipcMain.handle('app:toggle-fullscreen', () => {
  if (!mainWindow) return
  mainWindow.setFullScreen(!mainWindow.isFullScreen())
})

// ─── Score helper (main process copy) ─────────────────────────────────────────

const SEC_KEYWORDS = [
  'exploit', 'vulnerability', 'cve', 'rce', 'sql injection', 'xss',
  'privilege escalation', 'buffer overflow', 'authentication bypass',
  'command injection', 'ssrf', 'xxe', 'deserialization', 'ldap',
  'active directory', 'kerberos', 'smb', 'ntlm', 'hash', 'lateral movement',
  'persistence', 'exfiltration', 'c2', 'metasploit', 'payload', 'reverse shell',
  'web shell', 'container escape', 'kernel exploit', 'zero-day',
]

function computeScoreFromContext(item: Pick<FeedItem, 'title' | 'summary'>, ctx: RelevanceContext): number {
  const hay = `${item.title} ${item.summary}`.toLowerCase()
  let score = 0
  SEC_KEYWORDS.forEach(kw => { if (hay.includes(kw)) score += 5 })
  if (ctx.lab)    { const v = ctx.lab.toLowerCase().trim();    if (v && hay.includes(v)) score += 10 }
  if (ctx.target) { const v = ctx.target.toLowerCase().trim(); if (v && hay.includes(v)) score += 10 }
  if (ctx.ip)     { if (hay.includes(ctx.ip)) score += 10 }
  ctx.customKeywords?.forEach(kw => { if (kw && hay.includes(kw.toLowerCase())) score += 10 })
  return Math.min(score, 100)
}

// ─── Minimal HTTP helper ──────────────────────────────────────────────────────

function fetchUrlRaw(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'SignalBoard/2.0' },
      timeout: 8_000,
    }, res => {
      const chunks: Buffer[] = []
      res.on('data', c => chunks.push(c))
      res.on('end',  () => resolve(Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    })
    req.on('error',   reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// ─── Claude AI summarise ──────────────────────────────────────────────────────

async function callClaudeApi(item: FeedItem, apiKey: string): Promise<string[]> {
  const body = JSON.stringify({
    model:      'claude-haiku-20240307',
    max_tokens: 256,
    messages:   [{
      role:    'user',
      content: `Summarise this security intelligence item in exactly 3 concise bullet points (each starting with "• "). Focus on: what is affected, severity/impact, and recommended action.\n\nTitle: ${item.title}\n\nContent: ${item.summary}`,
    }],
  })

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers:  {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(body),
      },
    }, res => {
      const chunks: Buffer[] = []
      res.on('data', c => chunks.push(c))
      res.on('end',  () => {
        try {
          const data    = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          const text    = data?.content?.[0]?.text ?? ''
          const bullets = text.split('\n').filter((l: string) => l.trim().startsWith('•')).map((l: string) => l.trim())
          resolve(bullets.length >= 1 ? bullets : [text.slice(0, 200)])
        } catch (e) { reject(e) }
      })
      res.on('error', reject)
    })
    req.on('error',   reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('AI request timeout')) })
    req.write(body)
    req.end()
  })
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  settings    = loadSettings()
  sources     = loadSources()
  cachedItems = loadCache()

  createWindow()
  createTray()
  emitEvent('SignalBoard', 'app:launched', { version: APP_VERSION })

  mainWindow!.webContents.once('did-finish-load', () => {
    doRefresh()
    // Send bookmarks state on boot
    const bm = loadBookmarks()
    push('feeds:bookmarks', bm)
  })

  rescheduleRefresh()
  schedulePerSourceTimers()
  scheduleDigest()

  // Poll shared context every 10s and rescore if changed
  let lastCtxStr = ''
  contextTimer = setInterval(() => {
    const ctx    = getRelevanceContext()
    const ctxStr = JSON.stringify(ctx)
    if (ctxStr !== lastCtxStr) {
      lastCtxStr  = ctxStr
      cachedItems = cachedItems.map(item => {
        const score = computeScoreFromContext(item, ctx)
        return { ...item, relevanceScore: score, relevanceTier: computeTier(score) }
      })
      cachedItems = applyAlertRules(cachedItems, settings.alertRules ?? [])
      saveCache(cachedItems)
      push('feeds:items',   cachedItems)
      push('feeds:context', ctx)
    }
  }, 10_000)
})

app.on('window-all-closed', () => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (contextTimer) clearInterval(contextTimer)
  if (digestTimer)  clearInterval(digestTimer)
  perSourceTimers.forEach(t => clearInterval(t))
  writeStatus(cachedItems, new Date().toISOString())
  emitEvent('SignalBoard', 'app:closed', {})
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
