// SignalBoard — feeds.ts
// ItsEliias // v2.1 — RSS + CVE + Uptime + GitHub feed engine with full relevance scoring

import https from 'https'
import http from 'http'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { XMLParser } from 'fast-xml-parser'
import type { FeedSource, FeedItem, RelevanceContext, RelevanceTier, AlertRule, FeedCategory } from '../shared/types'

const CVE_RE = /CVE-\d{4}-\d+/gi

export function extractCveIds(text: string): string[] {
  const matches = text.match(CVE_RE)
  return matches ? [...new Set(matches.map(m => m.toUpperCase()))] : []
}

const DATA_DIR     = path.join(os.homedir(), '.signalboard')
const CACHE_FILE   = path.join(DATA_DIR, 'cache.json')
const SOURCES_FILE = path.join(DATA_DIR, 'sources.json')
const MAX_ITEMS    = 500

// ─── Relevance scoring ────────────────────────────────────────────────────────

const SEC_KEYWORDS = [
  'exploit', 'vulnerability', 'cve', 'rce', 'sql injection', 'xss',
  'privilege escalation', 'buffer overflow', 'authentication bypass',
  'command injection', 'ssrf', 'xxe', 'deserialization', 'ldap',
  'active directory', 'kerberos', 'smb', 'ntlm', 'hash', 'lateral movement',
  'persistence', 'exfiltration', 'c2', 'metasploit', 'payload', 'reverse shell',
  'web shell', 'container escape', 'kernel exploit', 'zero-day',
]

export function computeTier(score: number): RelevanceTier {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

function scoreRelevance(item: Pick<FeedItem, 'title' | 'summary'>, ctx: RelevanceContext): number {
  const hay = `${item.title} ${item.summary}`.toLowerCase()
  let score = 0
  SEC_KEYWORDS.forEach(kw => { if (hay.includes(kw)) score += 5 })
  if (ctx.lab)    { const v = ctx.lab.toLowerCase().trim();    if (v && hay.includes(v)) score += 10 }
  if (ctx.target) { const v = ctx.target.toLowerCase().trim(); if (v && hay.includes(v)) score += 10 }
  if (ctx.ip)     { if (hay.includes(ctx.ip)) score += 10 }
  ctx.customKeywords?.forEach(kw => { if (kw && hay.includes(kw.toLowerCase())) score += 10 })
  return Math.min(score, 100)
}

// ─── Default sources ─────────────────────────────────────────────────────────

export const DEFAULT_SOURCES: FeedSource[] = [
  // Security News
  { id: 'bleepingcomputer', name: 'BleepingComputer',     url: 'https://www.bleepingcomputer.com/feed/',                 type: 'rss', category: 'Security News', color: '#4a9eff', enabled: true,  itemCount: 0, errorCount: 0 },
  { id: 'thehackernews',    name: 'The Hacker News',       url: 'https://feeds.feedburner.com/TheHackersNews',            type: 'rss', category: 'Security News', color: '#4a9eff', enabled: true,  itemCount: 0, errorCount: 0 },
  { id: 'sans-isc',         name: 'SANS ISC',              url: 'https://isc.sans.edu/rssfeed_full.xml',                 type: 'rss', category: 'Security News', color: '#3fb950', enabled: false, itemCount: 0, errorCount: 0 },
  // Threat Intel
  { id: 'krebs',            name: 'Krebs on Security',     url: 'https://krebsonsecurity.com/feed/',                     type: 'rss', category: 'Threat Intel',  color: '#3fb950', enabled: true,  itemCount: 0, errorCount: 0 },
  { id: 'schneier',         name: 'Schneier on Security',  url: 'https://www.schneier.com/feed/atom',                    type: 'rss', category: 'Threat Intel',  color: '#3fb950', enabled: true,  itemCount: 0, errorCount: 0 },
  { id: 'darkreading',      name: 'Dark Reading',          url: 'https://www.darkreading.com/rss.xml',                   type: 'rss', category: 'Threat Intel',  color: '#ff9b9b', enabled: false, itemCount: 0, errorCount: 0 },
  // Malware
  { id: 'malwarebytes',     name: 'Malwarebytes Labs',     url: 'https://www.malwarebytes.com/blog/feed',                type: 'rss', category: 'Malware',       color: '#f85149', enabled: true,  itemCount: 0, errorCount: 0 },
  // Research
  { id: 'portswigger',      name: 'PortSwigger Research',  url: 'https://portswigger.net/research/rss',                  type: 'rss', category: 'Research',      color: '#b44fff', enabled: true,  itemCount: 0, errorCount: 0 },
  // Exploits
  { id: 'exploitdb',        name: 'Exploit-DB',            url: 'https://www.exploit-db.com/rss.xml',                    type: 'rss', category: 'Security News', color: '#f85149', enabled: true,  itemCount: 0, errorCount: 0 },
  // Community
  { id: 'hnrss-security',   name: 'HN · Security',         url: 'https://hnrss.org/newest?q=security+exploit&points=20', type: 'rss', category: 'Security News', color: '#ff6314', enabled: true,  itemCount: 0, errorCount: 0 },
  // CVE
  { id: 'cve-recent',       name: 'Recent CVEs',           url: 'https://cve.circl.lu/api/last/20',                      type: 'cve', category: 'CVE',           color: '#d29922', enabled: true,  itemCount: 0, errorCount: 0 },
]

// ─── Persistence ─────────────────────────────────────────────────────────────

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export function loadSources(): FeedSource[] {
  try {
    ensureDir()
    if (!fs.existsSync(SOURCES_FILE)) return DEFAULT_SOURCES
    const saved = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8')) as FeedSource[]
    const savedIds = new Set(saved.map(s => s.id))
    const merged   = saved.map(s => ({ itemCount: 0, errorCount: 0, ...s }))
    DEFAULT_SOURCES.forEach(d => { if (!savedIds.has(d.id)) merged.push(d) })
    return merged
  } catch { return DEFAULT_SOURCES }
}

export function saveSources(sources: FeedSource[]): void {
  ensureDir()
  // Atomic — a crash mid-write would corrupt sources.json and the next
  // launch would fall back to DEFAULT_SOURCES, losing every custom feed.
  const tmp = `${SOURCES_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(sources, null, 2), 'utf8')
  fs.renameSync(tmp, SOURCES_FILE)
}

export function loadCache(): FeedItem[] {
  try {
    ensureDir()
    if (!fs.existsSync(CACHE_FILE)) return []
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as FeedItem[]
  } catch { return [] }
}

export function saveCache(items: FeedItem[]): void {
  ensureDir()
  const sorted = [...items].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
  // Atomic — cache.json holds read/saved state. Corrupting it would lose
  // the user's bookmarks-by-read-state across a refresh.
  const tmp = `${CACHE_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(sorted.slice(0, MAX_ITEMS), null, 2), 'utf8')
  fs.renameSync(tmp, CACHE_FILE)
}

// ─── HTTP fetch ───────────────────────────────────────────────────────────────

// Bound redirect depth — without this, a malicious or misconfigured feed
// host could redirect indefinitely (each hop opens a new socket + waits
// for the timeout), holding open file handles and burning memory. Also
// resolve the Location header against the current URL so relative
// redirects work, and enforce http(s) only at every hop (a sneaky
// http→file: redirect would otherwise hit a different code path).
const MAX_REDIRECTS = 5
export function fetchUrl(url: string, redirectsLeft: number = MAX_REDIRECTS): Promise<string> {
  return new Promise((resolve, reject) => {
    let proto: string
    try { proto = new URL(url).protocol } catch { reject(new Error('invalid url')); return }
    if (proto !== 'http:' && proto !== 'https:') { reject(new Error(`unsupported scheme ${proto}`)); return }
    const mod = proto === 'https:' ? https : http
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'SignalBoard/2.0 (CYBERTOOLS; ItsEliias)',
        'Accept':     'application/rss+xml, application/xml, text/xml, application/json, */*',
      },
      timeout: 10_000,
    }, res => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        if (redirectsLeft <= 0) { reject(new Error('too many redirects')); return }
        // Resolve relative redirects against the current URL.
        const next = new URL(res.headers.location, url).toString()
        fetchUrl(next, redirectsLeft - 1).then(resolve).catch(reject)
        return
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const chunks: Buffer[] = []
      res.on('data',  c => chunks.push(c))
      res.on('end',   () => resolve(Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    })
    req.on('error',   reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// ─── RSS/Atom parser ──────────────────────────────────────────────────────────

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

// Probe a remote feed URL: returns a guess at the feed type and the channel/feed title.
// Used by the Custom Feeds UI to auto-populate metadata when a user pastes a URL.
export async function probeFeed(url: string): Promise<{ ok: true; type: 'rss' | 'atom'; title: string; count: number } | { ok: false; error: string }> {
  try {
    const raw = await fetchUrl(url)
    const parsed = xmlParser.parse(raw)
    let type: 'rss' | 'atom' = 'rss'
    let title = ''
    let count = 0
    if (parsed?.rss?.channel) {
      type = 'rss'
      const ch = parsed.rss.channel as Record<string, unknown>
      title = typeof ch['title'] === 'string' ? (ch['title'] as string).trim() : ''
      const items = ch['item']
      count = Array.isArray(items) ? items.length : items ? 1 : 0
    } else if (parsed?.feed) {
      type = 'atom'
      const f = parsed.feed as Record<string, unknown>
      const rawTitle = f['title']
      if (typeof rawTitle === 'string') title = rawTitle.trim()
      else if (rawTitle && typeof rawTitle === 'object') {
        const t = (rawTitle as Record<string, unknown>)['#text']
        if (typeof t === 'string') title = t.trim()
      }
      const entries = f['entry']
      count = Array.isArray(entries) ? entries.length : entries ? 1 : 0
    } else {
      return { ok: false, error: 'Not a recognised RSS or Atom feed' }
    }
    return { ok: true, type, title: title.slice(0, 120), count }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim()
    .slice(0, 500)
}

function resolveLink(item: Record<string, unknown>): string {
  const raw = item['link']
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    return (o['@_href'] ?? o['#text'] ?? '') as string
  }
  return (item['@_href'] ?? '') as string
}

function parseRss(xml: string, source: FeedSource): FeedItem[] {
  try {
    const parsed  = xmlParser.parse(xml)
    const rawItems: unknown[] = []
    const rssItems  = parsed?.rss?.channel?.item
    const atomItems = parsed?.feed?.entry
    if (rssItems)  rawItems.push(...(Array.isArray(rssItems)  ? rssItems  : [rssItems]))
    if (atomItems) rawItems.push(...(Array.isArray(atomItems) ? atomItems : [atomItems]))

    const now = new Date().toISOString()
    const out: FeedItem[] = []
    for (const item of (rawItems as Record<string, unknown>[]).slice(0, 30)) {
      try {
        const title   = stripHtml(String(item['title'] ?? ''))
        const link    = resolveLink(item)
        const summary = stripHtml(String(item['description'] ?? item['summary'] ?? item['content'] ?? ''))
        const pubDate = String(item['pubDate'] ?? item['published'] ?? item['updated'] ?? now)
        const id      = `${source.id}::${link || title}`
        const score   = 0

        // Malformed RSS dates throw RangeError on .toISOString(). Fall back
        // to the fetch time so one bad item doesn't kill the whole feed.
        const parsedDate = new Date(pubDate)
        const publishedAt = Number.isFinite(parsedDate.getTime())
          ? parsedDate.toISOString() : now

        const cveIds = extractCveIds(`${title} ${summary}`)
        out.push({
          id,
          sourceId:       source.id,
          sourceName:     source.name,
          title,
          url:            link,
          summary,
          publishedAt,
          fetchedAt:      now,
          tags:           [],
          read:           false,
          saved:          false,
          relevanceScore: score,
          relevanceTier:  computeTier(score),
          cveIds:         cveIds.length ? cveIds : undefined,
        } satisfies FeedItem)
      } catch (e) {
        console.warn(`[SignalBoard] skipping item in ${source.name}:`, (e as Error).message)
      }
    }
    return out
  } catch (e) {
    console.warn(`[SignalBoard] RSS parse error (${source.name}):`, (e as Error).message)
    return []
  }
}

// ─── CVE parser (CIRCL JSON) ──────────────────────────────────────────────────

interface CirclCve {
  id?: string
  summary?: string
  Published?: string
  cvss?: number
}

function parseCve(json: string, source: FeedSource): FeedItem[] {
  try {
    const data = JSON.parse(json) as CirclCve[]
    const now  = new Date().toISOString()
    const out: FeedItem[] = []
    for (const cve of data.slice(0, 20)) {
      try {
        const id      = cve.id ?? 'UNKNOWN'
        const summary = (cve.summary ?? '').slice(0, 500)
        const cvss    = cve.cvss ? ` · CVSS ${cve.cvss}` : ''
        const score   = 0
        // Same fallback pattern as parseRss — malformed dates throw.
        const parsedDate = cve.Published ? new Date(cve.Published) : null
        const publishedAt = parsedDate && Number.isFinite(parsedDate.getTime())
          ? parsedDate.toISOString() : now
        out.push({
          id:             `${source.id}::${id}`,
          sourceId:       source.id,
          sourceName:     source.name,
          title:          id,
          url:            `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${id}`,
          summary:        `${summary}${cvss}`,
          publishedAt,
          fetchedAt:      now,
          tags:           ['cve'],
          read:           false,
          saved:          false,
          relevanceScore: score,
          relevanceTier:  computeTier(score),
        } satisfies FeedItem)
      } catch (e) {
        console.warn(`[SignalBoard] skipping CVE in ${source.name}:`, (e as Error).message)
      }
    }
    return out
  } catch (e) {
    console.warn('[SignalBoard] CVE parse error:', (e as Error).message)
    return []
  }
}

// ─── Main fetch loop ──────────────────────────────────────────────────────────

export async function fetchAllFeeds(
  allSources: FeedSource[],
  existingItems: FeedItem[],
  ctx: RelevanceContext,
  maxPerSource = 30,
): Promise<FeedItem[]> {
  const existingMap = new Map(existingItems.map(i => [i.id, i]))
  const fresh: FeedItem[] = []
  const enabled = allSources.filter(s => s.enabled)
  const updatedSources = [...allSources]

  await Promise.allSettled(enabled.map(async source => {
    const srcIdx = updatedSources.findIndex(s => s.id === source.id)
    try {
      let parsed: FeedItem[]
      if (source.type === 'uptime') {
        parsed = await fetchUptimeMonitor(source)
      } else if (source.type === 'github') {
        parsed = await fetchGitHubRepo(source)
      } else {
        const raw = await fetchUrl(source.url)
        parsed = source.type === 'cve' ? parseCve(raw, source) : parseRss(raw, source)
      }
      const sliced = parsed.slice(0, maxPerSource)

      sliced.forEach(item => {
        const existing = existingMap.get(item.id)
        const score    = scoreRelevance(item, ctx)
        fresh.push({
          ...item,
          read:           existing?.read   ?? false,
          saved:          existing?.saved  ?? false,
          aiSummary:      existing?.aiSummary,
          relevanceScore: score,
          relevanceTier:  computeTier(score),
        })
      })

      if (srcIdx >= 0) {
        const prev      = updatedSources[srcIdx]
        const today     = new Date().toISOString().slice(0, 10)
        const vol       = { ...(prev.dailyVolume ?? {}) }
        vol[today]      = (vol[today] ?? 0) + sliced.length
        const volKeys   = Object.keys(vol).sort()
        if (volKeys.length > 14) volKeys.slice(0, volKeys.length - 14).forEach(k => delete vol[k])
        updatedSources[srcIdx] = {
          ...prev,
          lastFetchAt:          new Date().toISOString(),
          lastSuccess:          new Date().toISOString(),
          itemCount:            sliced.length,
          errorCount:           0,
          consecutiveFailures:  0,
          error:                undefined,
          attemptCount:         (prev.attemptCount ?? 0) + 1,
          successCount:         (prev.successCount ?? 0) + 1,
          dailyVolume:          vol,
        }
      }
    } catch (e) {
      console.warn(`[SignalBoard] fetch failed (${source.name}):`, (e as Error).message)
      if (srcIdx >= 0) {
        const prev = updatedSources[srcIdx]
        updatedSources[srcIdx] = {
          ...prev,
          lastFetchAt:          new Date().toISOString(),
          errorCount:           (prev.errorCount ?? 0) + 1,
          consecutiveFailures:  (prev.consecutiveFailures ?? 0) + 1,
          attemptCount:         (prev.attemptCount ?? 0) + 1,
          error:                (e as Error).message,
        }
      }
    }
  }))

  // Save updated source metadata
  saveSources(updatedSources)

  // Merge: fresh items take precedence; keep cached items not in any enabled source
  const freshIds = new Set(fresh.map(i => i.id))
  existingItems.forEach(item => {
    if (!freshIds.has(item.id)) {
      const score = scoreRelevance(item, ctx)
      fresh.push({ ...item, relevanceScore: score, relevanceTier: computeTier(score) })
    }
  })

  return fresh.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}

// ─── Alert rule matching ──────────────────────────────────────────────────────

export function applyAlertRules(items: FeedItem[], rules: AlertRule[]): FeedItem[] {
  if (!rules.length) return items
  return items.map(item => {
    const hay = `${item.title} ${item.summary}`.toLowerCase()
    const matches = rules.flatMap(rule => {
      try {
        const rx = new RegExp(rule.regex, 'i')
        if (rx.test(hay)) {
          return [{ ruleId: rule.id, label: rule.label, severity: rule.severity, color: rule.color }]
        }
      } catch { /* invalid regex */ }
      return []
    })
    return matches.length ? { ...item, alertMatches: matches } : { ...item, alertMatches: [] }
  })
}

// ─── Deduplication (Levenshtein > 85% similarity) ────────────────────────────

function levenshteinSim(a: string, b: string): number {
  const la = a.slice(0, 80).toLowerCase()
  const lb = b.slice(0, 80).toLowerCase()
  if (la === lb) return 1
  const m = la.length, n = lb.length
  if (!m || !n) return 0
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  dp[0] = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = la[i - 1] === lb[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return 1 - dp[m][n] / Math.max(m, n)
}

export function deduplicateItems(items: FeedItem[]): FeedItem[] {
  const result: FeedItem[] = []
  const consumed = new Set<string>()
  for (let i = 0; i < items.length; i++) {
    if (consumed.has(items[i].id)) continue
    const dupes: string[] = []
    for (let j = i + 1; j < items.length; j++) {
      if (consumed.has(items[j].id)) continue
      if (levenshteinSim(items[i].title, items[j].title) >= 0.85) {
        dupes.push(items[j].id)
        consumed.add(items[j].id)
      }
    }
    result.push({ ...items[i], duplicateCount: dupes.length > 0 ? dupes.length : undefined })
  }
  return result
}

// ─── Uptime monitor fetch ─────────────────────────────────────────────────────

async function fetchUptimeMonitor(source: FeedSource): Promise<FeedItem[]> {
  const now = new Date().toISOString()
  const method = source.url.startsWith('https') ? https : http
  return new Promise(resolve => {
    const start = Date.now()
    const req = method.request(source.url, { method: 'HEAD', timeout: 8_000 }, res => {
      const latency = Date.now() - start
      const up = res.statusCode !== undefined && res.statusCode < 400
      if (!up) {
        resolve([{
          id:             `${source.id}::downtime::${now}`,
          sourceId:       source.id,
          sourceName:     source.name,
          title:          `SERVICE DOWN: ${source.name} (HTTP ${res.statusCode})`,
          url:            source.url,
          summary:        `Uptime check failed. Status: ${res.statusCode}. Latency: ${latency}ms.`,
          publishedAt:    now,
          fetchedAt:      now,
          tags:           ['uptime', 'alert'],
          read:           false,
          saved:          false,
          relevanceScore: 80,
          relevanceTier:  'critical',
        }])
      } else {
        resolve([])
      }
    })
    req.on('error', err => {
      resolve([{
        id:             `${source.id}::downtime::${now}`,
        sourceId:       source.id,
        sourceName:     source.name,
        title:          `SERVICE DOWN: ${source.name} — ${err.message}`,
        url:            source.url,
        summary:        `Uptime check failed with error: ${err.message}`,
        publishedAt:    now,
        fetchedAt:      now,
        tags:           ['uptime', 'alert'],
        read:           false,
        saved:          false,
        relevanceScore: 80,
        relevanceTier:  'critical',
      }])
    })
    req.on('timeout', () => {
      req.destroy()
      const ts = new Date().toISOString()
      resolve([{
        id:             `${source.id}::downtime::${ts}`,
        sourceId:       source.id,
        sourceName:     source.name,
        title:          `SERVICE DOWN: ${source.name} — Timeout`,
        url:            source.url,
        summary:        `Uptime check timed out after 8 seconds.`,
        publishedAt:    ts,
        fetchedAt:      ts,
        tags:           ['uptime', 'alert'],
        read:           false,
        saved:          false,
        relevanceScore: 80,
        relevanceTier:  'critical',
      }])
    })
    req.end()
  })
}

// ─── GitHub repo watcher ──────────────────────────────────────────────────────

async function fetchGitHubRepo(source: FeedSource): Promise<FeedItem[]> {
  // source.url stores the repo slug e.g. "owner/repo"
  // githubApiKey optional in source
  const slug = source.url.replace('https://github.com/', '').replace(/\/$/, '')
  const apiUrl = `https://api.github.com/repos/${slug}/releases?per_page=5`
  const now = new Date().toISOString()
  try {
    const raw  = await fetchUrl(apiUrl)
    const data = JSON.parse(raw) as Array<Record<string, unknown>>
    if (!Array.isArray(data)) return []
    return data.slice(0, 5).map(rel => {
      const tagName    = String(rel['tag_name']   ?? '')
      const name       = String(rel['name']        ?? tagName)
      const body       = String(rel['body']        ?? '').slice(0, 400)
      const published  = String(rel['published_at'] ?? now)
      const htmlUrl    = String(rel['html_url']    ?? `https://github.com/${slug}/releases`)
      return {
        id:             `${source.id}::release::${tagName}`,
        sourceId:       source.id,
        sourceName:     source.name,
        title:          `${slug} ${name || tagName} released`,
        url:            htmlUrl,
        summary:        body || `New release: ${tagName}`,
        publishedAt:    new Date(published).toISOString(),
        fetchedAt:      now,
        tags:           ['github', 'release'],
        read:           false,
        saved:          false,
        relevanceScore: 20,
        relevanceTier:  'low',
      } satisfies FeedItem
    })
  } catch {
    // fallback: commits
    try {
      const commitsUrl = `https://api.github.com/repos/${slug}/commits?per_page=5`
      const raw2  = await fetchUrl(commitsUrl)
      const data2 = JSON.parse(raw2) as Array<Record<string, unknown>>
      if (!Array.isArray(data2)) return []
      return data2.slice(0, 5).map(c => {
        const commit  = c['commit'] as Record<string, unknown> | undefined
        const msg     = String(commit?.['message'] ?? '').split('\n')[0].slice(0, 120)
        const author  = (commit?.['author'] as Record<string, unknown>)?.['date']
        const sha     = String(c['sha'] ?? '').slice(0, 7)
        const htmlUrl = String(c['html_url'] ?? `https://github.com/${slug}`)
        return {
          id:             `${source.id}::commit::${sha}`,
          sourceId:       source.id,
          sourceName:     source.name,
          title:          `${slug}: ${msg}`,
          url:            htmlUrl,
          summary:        msg,
          publishedAt:    author ? new Date(String(author)).toISOString() : now,
          fetchedAt:      now,
          tags:           ['github', 'commit'],
          read:           false,
          saved:          false,
          relevanceScore: 15,
          relevanceTier:  'low',
        } satisfies FeedItem
      })
    } catch { return [] }
  }
}

// ─── Vault save ───────────────────────────────────────────────────────────────

export function saveItemToVault(item: FeedItem, vaultPath: string): boolean {
  try {
    const dir  = path.join(vaultPath, 'SignalBoard')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    // Feed titles come from arbitrary RSS publishers — a malicious title
    // like "../../../etc/something" would survive the old regex (it only
    // stripped /\<>:"|?*) and path.join would normalize the `..` segments,
    // escaping the vault dir. Also strip `..` runs, leading dots, and null
    // bytes, then re-verify the resolved file is under `dir`.
    let safe = item.title
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')  // banned chars + control bytes
      .replace(/\.{2,}/g, '-')                   // collapse any run of dots (kills ..)
      .replace(/^\.+/, '')                        // strip leading dots
      .trim()
      .slice(0, 80) || 'untitled'
    const date = new Date(item.publishedAt).toISOString().slice(0, 10)
    const file = path.join(dir, `${date} ${safe}.md`)
    // Defence-in-depth: confirm the resolved path is still inside `dir`.
    const dirReal  = path.resolve(dir) + path.sep
    const fileReal = path.resolve(file)
    if (!fileReal.startsWith(dirReal)) {
      console.error('[SignalBoard] vault save blocked: path escapes vault dir')
      return false
    }

    const aiSection = item.aiSummary?.length
      ? `\n## AI Summary\n\n${item.aiSummary.map(b => `- ${b}`).join('\n')}\n`
      : ''

    const md = [
      '---',
      `title: "${item.title.replace(/"/g, '\\"')}"`,
      `source: ${item.sourceName}`,
      `url: ${item.url}`,
      `saved_at: ${new Date().toISOString()}`,
      `published: ${item.publishedAt}`,
      `relevance_score: ${item.relevanceScore}`,
      `relevance_tier: ${item.relevanceTier}`,
      item.tags.length ? `tags:\n${item.tags.map(t => `  - ${t}`).join('\n')}` : 'tags: []',
      '---',
      '',
      `# ${item.title}`,
      '',
      `> **Source:** [${item.sourceName}](${item.url})  `,
      `> **Relevance:** ${item.relevanceTier.toUpperCase()} [${item.relevanceScore}]`,
      aiSection,
      '',
      item.summary,
      '',
      `[Read full article →](${item.url})`,
    ].join('\n')

    fs.writeFileSync(file, md, 'utf8')
    return true
  } catch (e) {
    console.error('[SignalBoard] vault save failed:', (e as Error).message)
    return false
  }
}
