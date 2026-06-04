// NetworkMap — GraphLibrary.tsx — Orange-accent library view (UI redesign, logic unchanged)
import { useState, useEffect, useCallback } from 'react'
import type { GraphSummary, NetworkGraph } from '@shared/types'

interface Props {
  onOpenGraph: (graph: NetworkGraph) => void
  onOpenImport: () => void
  onOpenSettings: () => void
  onOpenHelp?: () => void
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

function importSourceLabel(src?: string): string {
  if (src === 'nmap-xml')   return 'nmap XML'
  if (src === 'paste')      return 'Paste'
  if (src === 'recondesk')  return 'ReconDesk'
  return '—'
}

function makeEmptyGraph(): NetworkGraph {
  const id = `graph-${Date.now()}`
  return {
    id, name: 'Unnamed Graph',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [], edges: [],
  }
}

export default function GraphLibrary({ onOpenGraph, onOpenImport, onOpenSettings, onOpenHelp }: Props) {
  const [graphs, setGraphs]               = useState<GraphSummary[]>([])
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const reload = useCallback(() => {
    window.electronAPI.loadGraphs().then(setGraphs).catch(console.error)
  }, [])

  useEffect(() => { reload() }, [reload])

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (deleteConfirm === id) {
      await window.electronAPI.deleteGraph(id)
      setDeleteConfirm(null)
      reload()
    } else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(prev => prev === id ? null : prev), 3000)
    }
  }

  async function handleOpenGraph(id: string) {
    setLoading(true)
    try {
      const g = await window.electronAPI.loadGraph(id)
      if (g) onOpenGraph(g)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#07080f' }}>

      {/* Title bar */}
      <div
        className="drag-region"
        style={{
          padding: '0 20px',
          height: 48,
          display: 'flex', alignItems: 'center',
          background: 'rgba(7,8,15,0.98)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          position: 'relative',
        }}
      >
        {/* Accent underline */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,140,66,0.18) 40%, rgba(255,140,66,0.18) 60%, transparent 100%)',
        }} />

        {/* Traffic light spacer */}
        <div className="no-drag" style={{ width: 70 }} />

        {/* Brand */}
        <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ filter: 'drop-shadow(0 0 4px rgba(255,140,66,0.4))' }}>
            <path d="M8 1L14.5 4.75V11.25L8 15L1.5 11.25V4.75L8 1Z" stroke="#ff8c42" strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="8" r="2" fill="#ff8c42" />
          </svg>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '0.02em' }}>NetworkMap</span>
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 4,
            background: 'rgba(255,140,66,0.08)', border: '1px solid rgba(255,140,66,0.18)', color: '#ff8c42',
          }}>CYBERTOOLS</span>
        </div>

        <div style={{ flex: 1 }} />

        {onOpenHelp && (
          <button
            className="no-drag"
            onClick={onOpenHelp}
            title="Help & onboarding"
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: '1px solid rgba(42,51,71,0.75)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff8c42'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,66,0.4)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.75)' }}
          >?</button>
        )}

        <button
          className="no-drag"
          onClick={onOpenSettings}
          title="Settings"
          style={{
            width: 28, height: 28, borderRadius: 6, marginLeft: 6,
            border: '1px solid rgba(42,51,71,0.75)', background: 'transparent',
            color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.75)' }}
        >⚙</button>
      </div>

      {/* Section header */}
      <div style={{ padding: '20px 24px 0' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
          Network topology graphs from nmap scans
        </p>
      </div>

      {/* Action toolbar */}
      <div style={{
        display: 'flex', gap: 8, padding: '14px 24px',
        borderBottom: '1px solid rgba(42,51,71,0.5)',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <button
          onClick={onOpenImport}
          disabled={loading}
          style={{
            padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: 'rgba(255,140,66,0.12)', border: '1px solid rgba(255,140,66,0.30)',
            color: '#ff8c42', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1, transition: 'all 150ms',
            fontFamily: 'var(--font-display)',
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'rgba(255,140,66,0.2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,140,66,0.12)' }}
        >Import ▾</button>
        <button
          onClick={() => onOpenGraph(makeEmptyGraph())}
          style={{
            padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
            background: '#0d0e18', border: '1px solid rgba(42,51,71,0.75)',
            color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 150ms',
            fontFamily: 'var(--font-display)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
        >+ New Empty Graph</button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          margin: '8px 24px', padding: '8px 12px', borderRadius: 7,
          background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)',
          color: '#f85149', fontSize: 12,
        }}>{error}</div>
      )}

      {/* Graph table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 16px' }}>
        {graphs.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 12,
          }}>
            <svg width="48" height="48" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.18 }}>
              <path d="M8 1L14.5 4.75V11.25L8 15L1.5 11.25V4.75L8 1Z" stroke="#ff8c42" strokeWidth="1.5" fill="none" />
              <circle cx="8" cy="8" r="2" fill="#ff8c42" />
            </svg>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No saved graphs yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Import an nmap XML scan to get started</p>
            <button
              onClick={onOpenImport}
              style={{
                marginTop: 8, padding: '8px 22px', borderRadius: 8,
                background: 'rgba(255,140,66,0.12)', border: '1px solid rgba(255,140,66,0.30)',
                color: '#ff8c42', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                transition: 'all 150ms', fontFamily: 'var(--font-display)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,140,66,0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,140,66,0.12)' }}
            >Import Scan</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
            <thead>
              <tr>
                {(['Name', 'Source', 'Date', 'Nodes', 'Edges', 'Actions'] as const).map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 12px',
                    fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(42,51,71,0.5)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {graphs.map(g => (
                <tr
                  key={g.id}
                  onClick={() => handleOpenGraph(g.id)}
                  style={{ cursor: 'pointer', transition: 'background 100ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,140,66,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{g.name}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 4,
                      background: 'rgba(255,140,66,0.08)', border: '1px solid rgba(255,140,66,0.18)',
                      color: '#ff8c42',
                    }}>{importSourceLabel(g.importSource)}</span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>{fmt(g.createdAt)}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{g.nodeCount}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{g.edgeCount ?? 0}</td>
                  <td style={{ ...tdStyle }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <RowBtn onClick={() => handleOpenGraph(g.id)}>Open</RowBtn>
                      <RowBtn onClick={e => handleDelete(g.id, e)} danger={deleteConfirm === g.id}>
                        {deleteConfirm === g.id ? 'Confirm?' : 'Delete'}
                      </RowBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function RowBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 5,
        background: danger ? 'rgba(248,81,73,0.10)' : '#0d0e18',
        border: `1px solid ${danger ? 'rgba(248,81,73,0.35)' : 'rgba(42,51,71,0.75)'}`,
        color: danger ? '#f85149' : 'var(--text-secondary)',
        fontSize: 11, cursor: 'pointer', transition: 'all 150ms',
        fontFamily: 'var(--font-display)',
      }}
    >{children}</button>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid rgba(42,51,71,0.4)',
  color: 'var(--text-secondary)',
  fontSize: 12,
}
