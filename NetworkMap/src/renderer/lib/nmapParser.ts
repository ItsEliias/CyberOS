// NetworkMap — nmap XML parser using browser DOMParser
// Per spec: no external XML library, DOMParser only
import type { NetworkNode, NetworkPort, VulnEntry, VulnSeverity } from '@shared/types'

export interface ParseResult {
  nodes: NetworkNode[]
  excluded: number  // hosts with no open ports
  errors: string[]
}

/** Derive OS icon from OS name string */
export function osIcon(os: string | undefined): string {
  if (!os) return '?'
  const l = os.toLowerCase()
  if (l.includes('linux') || l.includes('ubuntu') || l.includes('debian') || l.includes('centos') || l.includes('fedora')) return '\u{1F427}'
  if (l.includes('windows')) return '\u{1FA9F}'
  if (l.includes('mac') || l.includes('osx') || l.includes('darwin') || l.includes('ios')) return '\u{1F34E}'
  if (l.includes('cisco') || l.includes('router') || l.includes('switch') || l.includes('juniper') || l.includes('firewall') || l.includes('fortigate')) return '\u{1F4E1}'
  return '?'
}

/** Map common port service names to display labels */
export function serviceLabel(service: string | undefined, port: number): string | undefined {
  if (!service && !port) return undefined
  const s = (service ?? '').toLowerCase()
  const map: Record<string, string> = {
    http: 'HTTP', https: 'HTTPS', ssh: 'SSH', ftp: 'FTP',
    smtp: 'SMTP', pop3: 'POP3', imap: 'IMAP', dns: 'DNS',
    smb: 'SMB', 'microsoft-ds': 'SMB', snmp: 'SNMP',
    rdp: 'RDP', 'ms-wbt-server': 'RDP',
    mysql: 'MySQL', postgresql: 'PostgreSQL', 'ms-sql-s': 'MSSQL',
    ldap: 'LDAP', kerberos: 'Kerberos',
    telnet: 'Telnet', vnc: 'VNC', nfs: 'NFS',
  }
  if (map[s]) return map[s]
  const portMap: Record<number, string> = {
    80: 'HTTP', 443: 'HTTPS', 22: 'SSH', 21: 'FTP',
    25: 'SMTP', 110: 'POP3', 143: 'IMAP', 53: 'DNS',
    445: 'SMB', 139: 'NetBIOS', 161: 'SNMP',
    3389: 'RDP', 3306: 'MySQL', 5432: 'PostgreSQL',
    1433: 'MSSQL', 389: 'LDAP', 88: 'Kerberos',
    23: 'Telnet', 5900: 'VNC', 2049: 'NFS',
  }
  return portMap[port]
}

export function parseNmapXml(xml: string): ParseResult {
  const errors: string[] = []
  const nodes: NetworkNode[] = []
  let excluded = 0

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')

    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      errors.push('XML parse error: ' + (parseError.textContent ?? 'malformed XML'))
      return { nodes, excluded, errors }
    }

    const hosts = Array.from(doc.querySelectorAll('host'))

    for (const host of hosts) {
      try {
        const addrEl = host.querySelector('address[addrtype="ipv4"]')
        if (!addrEl) continue
        const ip = addrEl.getAttribute('addr') ?? ''
        if (!ip) continue

        const macEl = host.querySelector('address[addrtype="mac"]')
        const macAddress = macEl?.getAttribute('addr') ?? undefined

        const statusEl = host.querySelector('status')
        const statusState = statusEl?.getAttribute('state') ?? 'unknown'
        const status = (statusState === 'up' ? 'up' : statusState === 'down' ? 'down' : 'unknown') as 'up' | 'down' | 'unknown'

        const hostnameEl = host.querySelector('hostnames hostname')
        const hostname = hostnameEl?.getAttribute('name') ?? undefined

        // OS match — pick highest accuracy
        const osMatchEls = Array.from(host.querySelectorAll('os osmatch'))
        let os: string | undefined
        let osAccuracy: number | undefined
        if (osMatchEls.length > 0) {
          const best = osMatchEls.reduce((a, b) => {
            const aAcc = parseInt(a.getAttribute('accuracy') ?? '0', 10)
            const bAcc = parseInt(b.getAttribute('accuracy') ?? '0', 10)
            return bAcc > aAcc ? b : a
          })
          os = best.getAttribute('name') ?? undefined
          const accStr = best.getAttribute('accuracy')
          osAccuracy = accStr ? parseInt(accStr, 10) : undefined
        }

        const ports: NetworkPort[] = []
        const portEls = Array.from(host.querySelectorAll('ports port'))

        for (const portEl of portEls) {
          try {
            const portId    = portEl.getAttribute('portid')
            const protocol  = portEl.getAttribute('protocol') ?? 'tcp'
            const stateEl   = portEl.querySelector('state')
            const state     = stateEl?.getAttribute('state') ?? 'closed'
            const serviceEl = portEl.querySelector('service')
            const serviceName = serviceEl?.getAttribute('name') ?? undefined
            const product   = serviceEl?.getAttribute('product') ?? undefined
            const version   = serviceEl?.getAttribute('version') ?? undefined

            if (!portId) continue
            const portNum = parseInt(portId, 10)
            ports.push({
              port:     portNum,
              protocol,
              state:    state as 'open' | 'filtered' | 'closed',
              service:  serviceName,
              product,
              version,
            })
          } catch {
            // skip malformed port entry
          }
        }

        const openPortCount = ports.filter(p => p.state === 'open').length

        if (openPortCount === 0) {
          excluded++
          continue
        }

        // Parse vuln script output
        const vulns = parseHostVulns(ip, host)

        nodes.push({
          id:   ip,
          ip,
          hostname,
          os,
          osAccuracy,
          macAddress,
          status,
          ports,
          openPortCount,
          x: 0,
          y: 0,
          fx: null,
          fy: null,
          vulns: vulns.length > 0 ? vulns : undefined,
        })
      } catch {
        errors.push(`Skipped malformed host entry`)
      }
    }
  } catch (e) {
    errors.push('Failed to parse XML: ' + (e as Error).message)
  }

  return { nodes, excluded, errors }
}

/** Parse vuln scripts from a host element */
function parseHostVulns(ip: string, host: Element): VulnEntry[] {
  const entries: VulnEntry[] = []
  const scripts = Array.from(host.querySelectorAll('script'))
  for (const script of scripts) {
    const id = script.getAttribute('id') ?? ''
    if (!id.startsWith('vuln') && !id.includes('cve') && !id.includes('CVE')) continue
    const output = script.getAttribute('output') ?? ''
    const cves: string[] = []
    const cveMatches = output.matchAll(/CVE-\d{4}-\d+/gi)
    for (const m of cveMatches) cves.push(m[0].toUpperCase())
    const cvssEl = script.querySelector('elem[key="cvss"]')
    const cvssScore = cvssEl ? parseFloat(cvssEl.textContent ?? '0') : 0
    const severity = cvssToSeverity(cvssScore)
    if (cves.length > 0 || cvssScore > 0) {
      entries.push({ ip, cves: [...new Set(cves)], severity, description: output.slice(0, 200) })
    }
  }
  return entries
}

function cvssToSeverity(score: number): VulnSeverity {
  if (score >= 9.0) return 'critical'
  if (score >= 7.0) return 'high'
  if (score >= 4.0) return 'medium'
  if (score > 0)    return 'low'
  return 'info'
}

/** Parse GNS3 .gns3 topology file into nodes */
export function parseGns3Json(json: string): ParseResult {
  const errors: string[] = []
  const nodes: NetworkNode[] = []

  try {
    const data = JSON.parse(json)
    const topology = data.topology ?? data
    const gns3Nodes: any[] = topology.nodes ?? []

    for (const gn of gns3Nodes) {
      const ip = gn.properties?.ip_address || gn.label?.text || gn.node_id
      if (!ip) continue
      nodes.push({
        id: ip,
        ip: ip,
        hostname: gn.label?.text,
        status: 'up',
        ports: [],
        openPortCount: 0,
        x: gn.x ?? 0,
        y: gn.y ?? 0,
        fx: null,
        fy: null,
      })
    }
  } catch (e) {
    errors.push('Failed to parse GNS3 file: ' + (e as Error).message)
  }

  return { nodes, excluded: 0, errors }
}
