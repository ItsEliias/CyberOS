// ReconDesk — network-related IPC handlers (CVE lookup, geo lookup, target enrichment)
import { ipcMain } from 'electron'
import https from 'https'
import { exec } from 'child_process'
import type { CveResult } from '../shared/types'

const cveCache = new Map<string, CveResult[]>()
const geoCache = new Map<string, Record<string, unknown>>()
const PRIVATE_IP_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1|fc00:|fd[0-9a-f]{2}:)/i

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RE.test(ip.trim())
}

export function registerNetworkHandlers(): void {
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

  ipcMain.handle('recondesk:geo-lookup', (_e, ip: string): Promise<Record<string, unknown>> => {
    if (isPrivateIp(ip)) return Promise.resolve({ status: 'private' })
    if (geoCache.has(ip)) return Promise.resolve(geoCache.get(ip)!)

    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ status: 'error' }), 6000)
      https.get(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { headers: { 'User-Agent': 'CyberOS-ReconDesk' } }, (res) => {
        let data = ''
        res.on('data', c => { data += c })
        res.on('end', () => {
          clearTimeout(timer)
          try {
            const json = JSON.parse(data)
            if (json.error) { resolve({ status: 'error' }); return }
            const result = {
              status: 'done',
              country: json.country_name ?? '',
              countryCode: json.country_code ?? '',
              city: json.city ?? '',
              org: json.org ?? '',
              flag: json.country_code
                ? String.fromCodePoint(...[...json.country_code.toUpperCase()].map((c: string) => 0x1F1E6 + c.charCodeAt(0) - 65))
                : '',
            }
            geoCache.set(ip, result)
            resolve(result)
          } catch { resolve({ status: 'error' }) }
        })
      }).on('error', () => { clearTimeout(timer); resolve({ status: 'error' }) })
    })
  })

  ipcMain.handle('recondesk:enrich-target', (_e, ip: string, _name: string) => {
    return new Promise<Record<string, unknown> | null>((resolve) => {
      const result: Record<string, unknown> = {}
      let pending = 2

      function done() {
        if (--pending === 0) resolve(Object.keys(result).length > 0 ? result : null)
      }

      exec(`whois ${ip}`, { timeout: 8000 }, (err, stdout) => {
        if (!err && stdout) result.whois = stdout.slice(0, 2000)
        done()
      })

      exec(`nslookup ${ip}`, { timeout: 8000 }, (err, stdout) => {
        if (!err && stdout) {
          const hostMatch = stdout.match(/name\s*=\s*([^\s\n]+)/i)
          if (hostMatch) result.hostname = hostMatch[1].replace(/\.$/, '')
        }
        done()
      })
    })
  })
}
