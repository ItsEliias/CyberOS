// SignalBoard — feeds.ts
// ItsEliias // RSS + CVE feed engine

import https from 'https'
import http from 'http'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { XMLParser } from 'fast-xml-parser'
import type { FeedSource, FeedItem, FeedState, RelevanceContext } from '../shared/types'

const DATA_DIR     = path.join(os.homedir(), '.signalboard')
const CACHE_FILE   = path.join(DATA_DIR, 'cache.json')
const SOURCES_FILE = path.join(DATA_DIR, 'sources.json')
const MAX_ITEMS    = 500

// ─── Security keyword weighting ──────────────────────────────────────────────

const SEC_KEYWORDS = [
  'cve', 'exploit', 'vulnerability', 'rce', 'lfi', 'rfi', 'sqli', 'xss', 'csrf',
  'buffer overflow', 'privilege escalation', 'privesc', 'lateral movement',
  'active directory', 'kerberos', 'mimikatz', 'metasploit', 'burp',
  'pentest', 'ctf', 'hackthebox', 'tryhackme', 'zero-day', '0day',
  'malware', 'ransomware', 'phishing', 'apt', 'threat', 'intrusion',
  'reverse shell', 'webshell', 'persistence', 'enumeration',
]

function scoreRelevance(item: Omit<FeedItem, 'relevanceScore'>, ctx: RelevanceContext): number {
  const haystack = `${item.title} ${item.summary}`.toLowerCase()
  let score = 0

  if (ctx.lab) {
    const lab = ctx.lab.toLowerCase().replace(/\s*\(.*?\)/, '').trim()
    if (lab && haystack.includes(lab)) score += 20
  }
  if (ctx.target) {
    const tgt = ctx.target.toLowerCase().trim()
    if (tgt && haystack.includes(tgt)) score += 20
  }
  SEC_KEYWORDS.forEach(kw => { if (haystack.includes(kw)) score += 1 })
  return Math.min(score, 100)
}

// ─── Default sources ─────────────────────────────────────────────────────────

export const DEFAULT_SOURCES: FeedSource[] = [
  { id: 'bleepingcomputer', name: 'BleepingComputer',      url: 'https://www.bleepingcomputer.com/feed/',                  type: 'rss',  category: 'news',      color: '#4a9eff', enabled: true  },
  { id: 'thehackernews',    name: 'The Hacker News',        url: 'https://feeds.feedburner.com/TheHackersNews',             type: 'rss',  category: 'news',      color: '#4a9eff', enabled: true  },
  { id: 'portswigger',      name: 'PortSwigger Research',   url: 'https://portswigger.net/research/rss',                   type: 'rss',  category: 'research',  color: '#b44fff', enabled: true  },
  { id: 'netsec',           name: 'r/netsec',               url: 'https://www.reddit.com/r/netsec/.rss',                   type: 'rss',  category: 'community', color: '#ff6314', enabled: false },
  { id: 'hnrss-security',   name: 'HN · Security',          url: 'https://hnrss.org/newest?q=security+exploit&points=20',  type: 'rss',  category: 'community', color: '#ff6314', enabled: true  },
  { id: 'exploitdb',        name: 'Exploit-DB',             url: 'https://www.exploit-db.com/rss.xml',                     type: 'rss',  category: 'exploits',  color: '#f85149', enabled: true  },
  { id: 'cve-recent',       name: 'Recent CVEs',            url: 'https://cve.circl.lu/api/last/20',                       type: 'cve',  category: 'cve',       color: '#d29922', enabled: true  },
  { id: 'sans-isc',         name: 'SANS ISC',               url: 'https://isc.sans.edu/rssfeed_full.xml',                  type: 'rss',  category: 'news',      color: '#3fb950', enabled: false },
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
    // Merge: keep saved prefs, add any new default sources not yet in saved
    const savedIds = new Set(saved.map(s => s.id))
    const merged = [...saved]
    DEFAULT_SOURCES.forEach(d => { if (!savedIds.has(d.id)) merged.push(d) })
    return merged
  } catch { return DEFAULT_SOURCES }
}

export function saveSources(sources: FeedSource[]): void {
  ensureDir()
  fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2), 'utf8')
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
  // Keep newest MAX_ITEMS, preserve read/saved state
  const sorted = items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  fs.writeFileSync(CACHE_FILE, JSON.stringify(sorted.slice(0, MAX_ITEMS), null, 2), 'utf8')
}

// ─── HTTP fetch ───────────────────────────────────────────────────────────────

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'SignalBoard/1.0 (CYBERTOOLS; ItsEliias)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/json, */*',
      },
      timeout: 10_000,
    }, res => {
      // Follow one redirect
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject)
        return
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', c => chunks.push(c))
      res.on('end',  () => resolve(Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    })
    req.on('error',   reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// ─── RSS/Atom parser ──────────────────────────────────────────────────────────

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ').trim()
    .slice(0, 400)
}

function parseRss(xml: string, source: FeedSource): FeedItem[] {
  try {
    const parsed = xmlParser.parse(xml)
    const items: unknown[] = []

    // RSS 2.0
    const rssItems = parsed?.rss?.channel?.item
    if (rssItems) items.push(...(Array.isArray(rssItems) ? rssItems : [rssItems]))

    // Atom
    const atomEntries = parsed?.feed?.entry
    if (atomEntries) items.push(...(Array.isArray(atomEntries) ? atomEntries : [atomEntries]))

    return (items as Record<string, unknown>[]).slice(0, 30).map(item => {
      const title   = stripHtml(String(item['title'] ?? ''))
      const link    = String(item['link'] ?? item['@_href'] ?? (typeof item['link'] === 'object' ? (item['link'] as Record<string,unknown>)['@_href'] : '') ?? '')
      const summary = stripHtml(String(item['description'] ?? item['summary'] ?? item['content'] ?? ''))
      const pubDate = String(item['pubDate'] ?? item['published'] ?? item['updated'] ?? new Date().toISOString())
      const id      = `${source.id}::${link || title}`

      return {
        id, sourceId: source.id, sourceName: source.name,
        title, url: link, summary, tags: [],
        publishedAt: new Date(pubDate).toISOString(),
        read: false, saved: false, relevanceScore: 0,
      } satisfies FeedItem
    })
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
    return data.slice(0, 20).map(cve => {
      const id      = cve.id ?? 'UNKNOWN'
      const summary = (cve.summary ?? '').slice(0, 400)
      const cvss    = cve.cvss ? ` · CVSS ${cve.cvss}` : ''
      return {
        id:           `${source.id}::${id}`,
        sourceId:     source.id,
        sourceName:   source.name,
        title:        id,
        url:          `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${id}`,
        summary:      `${summary}${cvss}`,
        tags:         ['cve'],
        publishedAt:  cve.Published ? new Date(cve.Published).toISOString() : new Date().toISOString(),
        read:         false,
        saved:        false,
        relevanceScore: 0,
      } satisfies FeedItem
    })
  } catch (e) {
    console.warn('[SignalBoard] CVE parse error:', (e as Error).message)
    return []
  }
}

// ─── Main fetch loop ──────────────────────────────────────────────────────────

export async function fetchAllFeeds(
  sources: FeedSource[],
  existingItems: FeedItem[],
  ctx: RelevanceContext
): Promise<FeedItem[]> {
  const existingMap = new Map(existingItems.map(i => [i.id, i]))
  const fresh: FeedItem[] = []

  const enabled = sources.filter(s => s.enabled)

  await Promise.allSettled(enabled.map(async source => {
    try {
      const raw  = await fetchUrl(source.url)
      const parsed = source.type === 'cve' ? parseCve(raw, source) : parseRss(raw, source)
      parsed.forEach(item => {
        const existing = existingMap.get(item.id)
        fresh.push({
          ...item,
          // Preserve user state from cache
          read:  existing?.read  ?? false,
          saved: existing?.saved ?? false,
          relevanceScore: scoreRelevance(item, ctx),
        })
      })
    } catch (e) {
      console.warn(`[SignalBoard] fetch failed (${source.name}):`, (e as Error).message)
    }
  }))

  // Merge: fresh items take precedence, keep saved/read-only cached items
  const freshIds = new Set(fresh.map(i => i.id))
  existingItems.forEach(item => {
    if (!freshIds.has(item.id)) {
      fresh.push({ ...item, relevanceScore: scoreRelevance(item, ctx) })
    }
  })

  return fresh.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}

// ─── Vault save ───────────────────────────────────────────────────────────────

export function saveItemToVault(item: FeedItem, vaultPath: string): boolean {
  try {
    const dir  = path.join(vaultPath, 'SignalBoard')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const safe = item.title.replace(/[<>:"/\\|?*]/g, '-').slice(0, 80)
    const date = new Date(item.publishedAt).toISOString().slice(0, 10)
    const file = path.join(dir, `${date} ${safe}.md`)

    const md = [
      '---',
      `title: "${item.title.replace(/"/g, '\\"')}"`,
      `source: ${item.sourceName}`,
      `url: ${item.url}`,
      `saved_at: ${new Date().toISOString()}`,
      `published: ${item.publishedAt}`,
      item.tags.length ? `tags:\n${item.tags.map(t => `  - ${t}`).join('\n')}` : 'tags: []',
      '---',
      '',
      `# ${item.title}`,
      '',
      `> Source: [${item.sourceName}](${item.url})`,
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
