// NetworkMap — FilterPanel.tsx — Dark glass filter sidebar (UI redesign, logic unchanged)
import { useMemo } from 'react'
import type { NetworkNode } from '@shared/types'

export interface FilterState {
  osType: string
  openPort: string
  dateFrom: string
  dateTo: string
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

  const inputStyle: React.CSSProperties = {
    background: '#07080f', border: '1px solid rgba(42,51,71,0.75)',
    borderRadius: 6, padding: '5px 9px', color: 'var(--text-primary)', fontSize: 11, width: '100%',
    fontFamily: 'var(--font-display)', transition: 'border-color 150ms',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
    display: 'block', marginBottom: 5,
    textTransform: 'uppercase', letterSpacing: '0.08em',
  }

  const activeCount = activeFilterCount(filters)

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 264,
      background: 'rgba(13,14,24,0.98)',
      borderLeft: '1px solid rgba(255,255,255,0.04)',
      display: 'flex', flexDirection: 'column', zIndex: 25,
      animation: 'slideInRight 0.2s ease-out',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', flexShrink: 0,
        background: 'rgba(255,140,66,0.05)',
        borderBottom: '1px solid rgba(255,140,66,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 2, height: 14, borderRadius: 1, background: '#ff8c42', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#ff8c42', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Filters
          </span>
          {activeCount > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              background: 'rgba(255,140,66,0.15)', color: '#ff8c42',
              border: '1px solid rgba(255,140,66,0.3)',
              borderRadius: 10, padding: '1px 6px',
            }}>{activeCount}</span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
            width: 24, height: 24, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 120ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
        >×</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* OS Type */}
        <div>
          <label style={labelStyle}>OS Type</label>
          <select
            value={filters.osType}
            onChange={e => set('osType', e.target.value)}
            style={inputStyle}
          >
            <option value="">All OS</option>
            <option value="windows">Windows</option>
            <option value="linux">Linux</option>
            <option value="macos">macOS</option>
            <option value="router">Router / Network</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        {/* Open Port */}
        <div>
          <label style={labelStyle}>Open Port</label>
          <input
            type="number"
            placeholder="e.g. 22, 80, 443"
            value={filters.openPort}
            onChange={e => set('openPort', e.target.value)}
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,140,66,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(42,51,71,0.75)')}
          />
          {commonPorts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
              {commonPorts.map(port => {
                const active = filters.openPort === String(port)
                return (
                  <button
                    key={port}
                    onClick={() => set('openPort', active ? '' : String(port))}
                    style={{
                      padding: '2px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer',
                      background: active ? 'rgba(255,140,66,0.15)' : 'rgba(42,51,71,0.35)',
                      border: `1px solid ${active ? 'rgba(255,140,66,0.4)' : 'rgba(42,51,71,0.6)'}`,
                      color: active ? '#ff8c42' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)', transition: 'all 120ms',
                    }}
                  >{port}</button>
                )
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(42,51,71,0.4)' }} />

        {/* Clear */}
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          style={{
            padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
            background: '#07080f', border: '1px solid rgba(42,51,71,0.75)',
            color: 'var(--text-secondary)', fontSize: 11,
            transition: 'all 150ms', fontFamily: 'var(--font-display)',
            opacity: activeCount === 0 ? 0.4 : 1,
          }}
        >Clear Filters</button>
      </div>
    </div>
  )
}
