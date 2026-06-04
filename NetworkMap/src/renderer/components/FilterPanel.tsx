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

// ─── Active filter pill ────────────────────────────────────────────────────────
function ActivePill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px 3px 10px', borderRadius: 20,
      background: 'rgba(255,140,66,0.12)',
      border: '1px solid rgba(255,140,66,0.32)',
      fontSize: 10, color: '#ff8c42', fontWeight: 500,
      animation: 'badgePop 0.2s var(--ease)',
    }}>
      <span>{label}</span>
      <button
        onClick={onRemove}
        style={{
          width: 14, height: 14, borderRadius: '50%', border: 'none',
          background: 'rgba(255,140,66,0.18)', color: '#ff8c42',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, lineHeight: 1, padding: 0,
          transition: 'all 120ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,140,66,0.35)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,140,66,0.18)' }}
      >×</button>
    </div>
  )
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
    borderRadius: 8, padding: '5px 9px', color: 'var(--text-primary)', fontSize: 11, width: '100%',
    fontFamily: 'var(--font-display)', transition: 'border-color 150ms',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
    display: 'block', marginBottom: 5,
    textTransform: 'uppercase', letterSpacing: '0.08em',
  }

  const activeCount = activeFilterCount(filters)

  const OS_OPTIONS = [
    { value: '',        label: 'All',     icon: '◈' },
    { value: 'windows', label: 'Windows', icon: '⊞' },
    { value: 'linux',   label: 'Linux',   icon: '🐧' },
    { value: 'macos',   label: 'macOS',   icon: '◈' },
    { value: 'router',  label: 'Router',  icon: '⬡' },
    { value: 'unknown', label: '?',       icon: '?' },
  ]

  // Build active filter pills
  type FilterPill = { key: keyof FilterState; label: string }
  const activePills: FilterPill[] = []
  if (filters.osType) {
    const match = OS_OPTIONS.find(o => o.value === filters.osType)
    activePills.push({ key: 'osType', label: `OS: ${match?.label ?? filters.osType}` })
  }
  if (filters.openPort) activePills.push({ key: 'openPort', label: `Port: ${filters.openPort}` })
  if (filters.dateFrom) activePills.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}` })
  if (filters.dateTo)   activePills.push({ key: 'dateTo',   label: `To: ${filters.dateTo}` })

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 272,
      background: 'rgba(13,14,24,0.97)',
      borderLeft: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column', zIndex: 25,
      animation: 'slideInFromRight 0.22s cubic-bezier(0.2,0.8,0.2,1)',
      backdropFilter: 'blur(16px)',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', flexShrink: 0,
        background: 'rgba(255,140,66,0.04)',
        borderBottom: '1px solid rgba(255,140,66,0.10)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 2, height: 16, borderRadius: 1, background: 'linear-gradient(180deg, #ff8c42, rgba(255,140,66,0.4))', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ff8c42', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Filters
          </span>
          {activeCount > 0 && (
            <span
              key={activeCount}
              className="badge-animate"
              style={{
                fontSize: 9, fontWeight: 700,
                background: 'rgba(255,140,66,0.18)', color: '#ff8c42',
                border: '1px solid rgba(255,140,66,0.35)',
                borderRadius: 10, padding: '2px 7px',
              }}
            >{activeCount}</span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
            width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms var(--ease)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
        >×</button>
      </div>

      {/* Active filters pill area */}
      {activePills.length > 0 && (
        <div style={{
          padding: '8px 14px',
          borderBottom: '1px solid rgba(42,51,71,0.4)',
          background: 'rgba(255,140,66,0.02)',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,140,66,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Active filters
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {activePills.map(pill => (
              <ActivePill
                key={pill.key}
                label={pill.label}
                onRemove={() => set(pill.key, '')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Quick Filters */}
        <div>
          <label style={{
            fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
            display: 'block', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Quick Filters</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { label: 'Linux only',      preset: { osType: 'linux',   openPort: '', dateFrom: '', dateTo: '' } as FilterState },
              { label: 'Windows only',    preset: { osType: 'windows', openPort: '', dateFrom: '', dateTo: '' } as FilterState },
              { label: 'Open web ports',  preset: { osType: '',        openPort: '80',  dateFrom: '', dateTo: '' } as FilterState },
              { label: 'High port count', preset: { osType: '',        openPort: '8080', dateFrom: '', dateTo: '' } as FilterState },
            ].map(({ label, preset }) => {
              const active = JSON.stringify(filters) === JSON.stringify(preset)
              return (
                <button
                  key={label}
                  onClick={() => onChange(active ? { osType: '', openPort: '', dateFrom: '', dateTo: '' } : preset)}
                  style={{
                    padding: '6px 10px', fontSize: 11, borderRadius: 8, cursor: 'pointer',
                    textAlign: 'left',
                    background: active ? 'rgba(255,140,66,0.14)' : 'rgba(42,51,71,0.2)',
                    border: `1px solid ${active ? 'rgba(255,140,66,0.4)' : 'rgba(42,51,71,0.45)'}`,
                    color: active ? '#ff8c42' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-display)', fontWeight: active ? 600 : 400,
                    transition: 'all 150ms var(--ease)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,140,66,0.08)'; (e.currentTarget as HTMLElement).style.color = '#ff8c42'; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(42,51,71,0.2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; } }}
                >
                  <span>{label}</span>
                  {active && <span style={{ fontSize: 9 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(42,51,71,0.6), rgba(42,51,71,0.2))' }} />

        {/* OS Type — pill selector */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <label style={labelStyle}>OS Type</label>
            {filters.osType && (
              <button onClick={() => set('osType', '')} style={{ fontSize: 9, color: 'rgba(255,140,66,0.6)', background: 'none', cursor: 'pointer', padding: 0 }}>
                clear
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {OS_OPTIONS.map(opt => {
              const active = filters.osType === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => set('osType', opt.value)}
                  style={{
                    padding: '5px 10px', fontSize: 11, borderRadius: 8, cursor: 'pointer',
                    background: active ? 'rgba(255,140,66,0.15)' : 'rgba(42,51,71,0.25)',
                    border: `1px solid ${active ? 'rgba(255,140,66,0.45)' : 'rgba(42,51,71,0.5)'}`,
                    color: active ? '#ff8c42' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-display)', fontWeight: active ? 600 : 400,
                    transition: 'all 150ms var(--ease)',
                    boxShadow: active ? '0 0 8px rgba(255,140,66,0.15)' : 'none',
                  }}
                >{opt.label}</button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(42,51,71,0.6), rgba(42,51,71,0.2))' }} />

        {/* Open Port */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={labelStyle}>Open Port</label>
            {filters.openPort && (
              <button onClick={() => set('openPort', '')} style={{ fontSize: 9, color: 'rgba(255,140,66,0.6)', background: 'none', cursor: 'pointer', padding: 0 }}>
                clear
              </button>
            )}
          </div>
          <input
            type="number"
            placeholder="e.g. 22, 80, 443"
            value={filters.openPort}
            onChange={e => set('openPort', e.target.value)}
            style={{
              ...inputStyle,
              transition: 'border-color 150ms var(--ease), box-shadow 150ms var(--ease)',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgba(255,140,66,0.5)'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,140,66,0.08)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(42,51,71,0.75)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />

          {/* Port range visual indicator when a port is set */}
          {filters.openPort && !isNaN(parseInt(filters.openPort, 10)) && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>1</span>
                <span style={{ fontSize: 9, color: '#ff8c42', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  Port {filters.openPort}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>65535</span>
              </div>
              <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'rgba(42,51,71,0.4)' }}>
                {/* Track fill up to port position */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  borderRadius: 3,
                  width: `${Math.min(100, (parseInt(filters.openPort, 10) / 65535) * 100)}%`,
                  background: 'linear-gradient(90deg, rgba(255,140,66,0.3), rgba(255,140,66,0.7))',
                }} />
                {/* Port marker */}
                <div style={{
                  position: 'absolute', top: '50%',
                  left: `${Math.min(98, (parseInt(filters.openPort, 10) / 65535) * 100)}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#ff8c42',
                  border: '2px solid rgba(13,14,24,0.9)',
                  boxShadow: '0 0 6px rgba(255,140,66,0.6)',
                }} />
              </div>
              {/* Well-known ranges label */}
              {parseInt(filters.openPort, 10) <= 1023 && (
                <div style={{ fontSize: 9, color: 'rgba(255,140,66,0.55)', marginTop: 3 }}>
                  Well-known range (0–1023)
                </div>
              )}
              {parseInt(filters.openPort, 10) > 1023 && parseInt(filters.openPort, 10) <= 49151 && (
                <div style={{ fontSize: 9, color: 'rgba(210,153,34,0.6)', marginTop: 3 }}>
                  Registered range (1024–49151)
                </div>
              )}
              {parseInt(filters.openPort, 10) > 49151 && (
                <div style={{ fontSize: 9, color: 'rgba(139,148,158,0.6)', marginTop: 3 }}>
                  Dynamic/ephemeral range (49152–65535)
                </div>
              )}
            </div>
          )}

          {commonPorts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {commonPorts.map(port => {
                const active = filters.openPort === String(port)
                return (
                  <button
                    key={port}
                    onClick={() => set('openPort', active ? '' : String(port))}
                    style={{
                      padding: '3px 8px', fontSize: 10, borderRadius: 8, cursor: 'pointer',
                      background: active ? 'rgba(255,140,66,0.15)' : 'rgba(42,51,71,0.3)',
                      border: `1px solid ${active ? 'rgba(255,140,66,0.45)' : 'rgba(42,51,71,0.55)'}`,
                      color: active ? '#ff8c42' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)', transition: 'all 150ms var(--ease)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >{port}</button>
                )
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(42,51,71,0.6), rgba(42,51,71,0.2))' }} />

        {/* Clear all */}
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          disabled={activeCount === 0}
          style={{
            padding: '8px 14px', borderRadius: 8, cursor: activeCount === 0 ? 'not-allowed' : 'pointer',
            background: activeCount > 0 ? 'rgba(248,81,73,0.06)' : '#07080f',
            border: `1px solid ${activeCount > 0 ? 'rgba(248,81,73,0.22)' : 'rgba(42,51,71,0.6)'}`,
            color: activeCount > 0 ? '#f85149' : 'var(--text-muted)', fontSize: 11,
            transition: 'all 180ms var(--ease)', fontFamily: 'var(--font-display)',
            opacity: activeCount === 0 ? 0.45 : 1,
          }}
          onMouseEnter={e => { if (activeCount > 0) (e.currentTarget as HTMLElement).style.background = 'rgba(248,81,73,0.12)' }}
          onMouseLeave={e => { if (activeCount > 0) (e.currentTarget as HTMLElement).style.background = 'rgba(248,81,73,0.06)' }}
        >Clear all filters</button>
      </div>
    </div>
  )
}
