// NetworkMap — NodeDetailTabs.tsx — PortTimeline, RiskBar, VulnsTab sub-components
import type { NetworkNode } from '@shared/types'
import { thStyle, tdStyle } from './NodeDetailParts'

// ─── Port Timeline ─────────────────────────────────────────────────────────────
export function PortTimeline({ node, allScans }: { node: NetworkNode; allScans: { scanName: string; nodes: NetworkNode[] }[] }) {
  const scans = allScans.filter(s => s.nodes.some(n => n.id === node.id))
  if (scans.length === 0) {
    return (
      <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: 8 }}>
        No multi-scan timeline data. Import multiple scans to compare.
      </p>
    )
  }

  const allPorts = new Set<number>()
  for (const s of scans) {
    s.nodes.find(nd => nd.id === node.id)?.ports.forEach(p => allPorts.add(p.port))
  }
  const sortedPorts = Array.from(allPorts).sort((a, b) => a - b)

  function cellColor(state: string | undefined): string {
    if (state === 'open')     return 'rgba(63,185,80,0.55)'
    if (state === 'filtered' || state === 'closed') return 'rgba(248,81,73,0.45)'
    return 'rgba(139,148,158,0.15)'
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 10, minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={thStyle}>PORT</th>
            {scans.map(s => <th key={s.scanName} style={thStyle}>{s.scanName.slice(0, 10)}</th>)}
          </tr>
        </thead>
        <tbody>
          {sortedPorts.map(port => (
            <tr key={port}>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{port}</td>
              {scans.map(s => {
                const n = s.nodes.find(nd => nd.id === node.id)
                const p = n?.ports.find(pp => pp.port === port)
                return (
                  <td key={s.scanName} style={{ ...tdStyle, background: cellColor(p?.state), width: 32 }}>
                    {p ? p.state[0].toUpperCase() : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Risk bar for vuln entries ─────────────────────────────────────────────────
function RiskBar({ severity }: { severity: string }) {
  const levels: Record<string, { pct: number; color: string }> = {
    critical: { pct: 100, color: '#f85149' },
    high:     { pct: 75,  color: '#ff8c42' },
    medium:   { pct: 50,  color: '#d29922' },
    low:      { pct: 25,  color: '#3fb950' },
    info:     { pct: 10,  color: '#8b949e' },
  }
  const { pct, color } = levels[severity] ?? levels.info
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>Risk</span>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(42,51,71,0.4)', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 2,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          boxShadow: `0 0 6px ${color}55`,
          transition: 'width 0.4s var(--ease)',
        }} />
      </div>
      <span style={{ fontSize: 9, color, fontWeight: 600, width: 26, flexShrink: 0 }}>{pct}%</span>
    </div>
  )
}

// ─── Vulns Tab ────────────────────────────────────────────────────────────────
export function VulnsTab({ node }: { node: NetworkNode }) {
  const vulns = node.vulns ?? []
  if (vulns.length === 0) {
    return (
      <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: 8 }}>
        No vulnerability data loaded. Use "Import Vulns" in the toolbar.
      </p>
    )
  }

  function sevColor(s: string): string {
    if (s === 'critical') return '#f85149'
    if (s === 'high')     return '#ff8c42'
    if (s === 'medium')   return '#d29922'
    if (s === 'low')      return '#3fb950'
    return '#8b949e'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {vulns.map((v, i) => (
        <div key={i} style={{
          padding: '8px 10px', borderRadius: 8,
          border: `1px solid ${sevColor(v.severity)}38`,
          background: `${sevColor(v.severity)}09`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              color: sevColor(v.severity), textTransform: 'uppercase',
              background: `${sevColor(v.severity)}18`,
              border: `1px solid ${sevColor(v.severity)}35`,
              borderRadius: 4, padding: '1px 6px',
            }}>{v.severity}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {v.cves.map(cve => (
              <span key={cve} style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4,
                background: 'rgba(139,148,158,0.12)', color: 'var(--text-secondary)',
                border: '1px solid rgba(42,51,71,0.5)',
              }}>{cve}</span>
            ))}
          </div>
          {v.description && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{v.description}</div>
          )}
          <RiskBar severity={v.severity} />
        </div>
      ))}
    </div>
  )
}
