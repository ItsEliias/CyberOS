// NetworkMap — FilterPanel.tsx — Feature 12: Slide-out filter panel
import { useMemo } from 'react'
import type { NetworkNode } from '@shared/types'

export interface FilterState {
  osType: string        // '' = all
  openPort: string      // '' = any, else port number string
  dateFrom: string      // ISO or ''
  dateTo: string        // ISO or ''
}

export const EMPTY_FILTERS: FilterState = { osType: '', openPort: '', dateFrom: '', dateTo: '' }

export function applyFilters(nodes: NetworkNode[], filters: FilterState): Set<string> {
  const ids = new Set<string>()
  for (const n of nodes) {
    let pass = true
    if (filters.osType) {
      const osLower = (n.os ?? '').toLowerCase()
      if (filters.osType === 'windows' && !osLower.includes('windows')) pass = false
      else if (filters.osType === 'linux' && !osLower.includes('linux') && !osLower.includes('ubuntu') && !osLower.includes('debian')) pass = false
      else if (filters.osType === 'macos' && !osLower.includes('mac') && !osLower.includes('osx') && !osLower.includes('darwin')) pass = false
      else if (filters.osType === 'router' && !osLower.includes('cisco') && !osLower.includes('router') && !osLower.includes('juniper')) pass = false
      else if (filters.osType === 'unknown' && n.os) pass = false
    }
    if (pass && filters.openPort) {
      const port = parseInt(filters.openPort, 10)
      if (!isNaN(port) && !n.ports.some(p => p.state === 'open' && p.port === port)) pass = false
    }
    if (pass) ids.add(n.id)
  }
  return ids
}

export function activeFilterCount(f: FilterState): number {
  return [f.osType, f.openPort, f.dateFrom, f.dateTo].filter(Boolean).length
}

interface Props {
  nodes: NetworkNode[]
  filters: FilterState
  onChange: (f: FilterState) => void
  onClose: () => void
}

export default function FilterPanel({ nodes, filters, onChange, onClose }: Props) {
  const commonPorts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const n of nodes) {
      for (const p of n.ports) {
        if (p.state === 'open') counts.set(p.port, (counts.get(p.port) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([port]) => port)
  }, [nodes])

  function set<K extends keyof FilterState>(k: K, v: FilterState[K]) {
    onChange({ ...filters, [k]: v })
  }

  const s: React.CSSProperties = { fontSize: 12, color: 'var(--text)' }
  const inputStyle: React.CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '4px 8px', color: 'var(--text)', fontSize: 11, width: '100%',
  }

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 260,
      background: 'var(--panel)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 25,
      animation: 'slideInRight 0.2s ease-out',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 12px', borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em' }}>FILTERS</span>
        <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 16 }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ ...s, fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>OS Type</label>
          <select value={filters.osType} onChange={e => set('osType', e.target.value)} style={inputStyle}>
            <option value="">All OS</option>
            <option value="windows">Windows</option>
            <option value="linux">Linux</option>
            <option value="macos">macOS</option>
            <option value="router">Router/Network</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div>
          <label style={{ ...s, fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open Port</label>
          <input
            type="number" placeholder="e.g. 22, 80, 443"
            value={filters.openPort}
            onChange={e => set('openPort', e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {commonPorts.map(port => (
              <button
                key={port}
                onClick={() => set('openPort', filters.openPort === String(port) ? '' : String(port))}
                style={{
                  padding: '2px 7px', fontSize: 10, borderRadius: 4, cursor: 'pointer',
                  background: filters.openPort === String(port) ? 'rgba(210,153,34,0.2)' : 'rgba(42,51,71,0.6)',
                  border: `1px solid ${filters.openPort === String(port) ? 'rgba(210,153,34,0.5)' : 'var(--border)'}`,
                  color: filters.openPort === String(port) ? 'var(--accent)' : 'var(--text-dim)',
                  fontFamily: 'monospace',
                }}
              >{port}</button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          style={{
            marginTop: 4, padding: '6px 12px', borderRadius: 5,
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
          }}
        >Clear Filters</button>
      </div>
    </div>
  )
}
