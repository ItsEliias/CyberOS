// NetworkMap — GraphLibrary.tsx
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
  if (src === 'nmap-xml') return 'nmap XML'
  if (src === 'paste')    return 'Paste'
  if (src === 'recondesk') return 'ReconDesk'
  return '—'
}

function makeEmptyGraph(): NetworkGraph {
  const id = `graph-${Date.now()}`
  return {
    id,
    name: 'Unnamed Graph',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [],
    edges: [],
  }
}

export default function GraphLibrary({ onOpenGraph, onOpenImport, onOpenSettings, onOpenHelp }: Props) {
  const [graphs, setGraphs]         = useState<GraphSummary[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
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
      // Auto-dismiss confirm after 3 seconds
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

  function handleNewEmpty() {
    onOpenGraph(makeEmptyGraph())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 0',
        WebkitAppRegion: 'drag' as React.CSSProperties['WebkitAppRegion'],
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>NetworkMap</span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 9, fontWeight: 600, color: '#4a5568',
            background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.12)',
            borderRadius: 999, padding: '2px 8px', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>⬡ CYBERTOOLS</span>
          {onOpenHelp && (
            <button
              onClick={onOpenHelp}
              title="Help & onboarding"
              style={{
                width: 24, height: 24, borderRadius: 4, border: '1px solid rgba(42,51,71,0.6)',
                background: 'transparent', color: '#4a5568', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'],
              }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.color = '#d29922'; el.style.borderColor = 'rgba(210,153,34,0.4)' }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.color = '#4a5568'; el.style.borderColor = 'rgba(42,51,71,0.6)' }}
            >
              ?
            </button>
          )}
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>
          Network topology graphs from nmap scans
        </p>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 8, padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'],
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <ToolBtn onClick={onOpenImport} disabled={loading} accent>
          Import ▾
        </ToolBtn>
        <ToolBtn onClick={handleNewEmpty}>
          + New Empty Graph
        </ToolBtn>
        <div style={{ flex: 1 }} />
        <ToolBtn onClick={onOpenSettings}>⚙ Settings</ToolBtn>
      </div>

      {error && (
        <div style={{
          margin: '8px 24px', padding: '8px 12px',
          background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)',
          borderRadius: 6, color: 'var(--error)', fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {/* Graph table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {graphs.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 12,
          }}>
            <div style={{ fontSize: 40, opacity: 0.3 }}>⬡</div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No saved graphs yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Import an nmap XML scan to get started
            </p>
            <button
              onClick={onOpenImport}
              style={{
                marginTop: 8, padding: '8px 20px', borderRadius: 6,
                background: 'var(--accent)', border: 'none',
                color: '#0d1117', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >Import Scan</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {(['Name', 'Source', 'Date', 'Nodes', 'Edges', 'Actions'] as const).map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontSize: 10, fontWeight: 600,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                    }}
                  >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {graphs.map(g => (
                <tr
                  key={g.id}
                  onClick={() => handleOpenGraph(g.id)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>
                      {g.name}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 4,
                      background: 'rgba(210,153,34,0.08)',
                      border: '1px solid rgba(210,153,34,0.18)',
                      color: 'var(--accent)',
                    }}>
                      {importSourceLabel(g.importSource)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>
                    {fmt(g.createdAt)}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-dim)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                    {g.nodeCount}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-dim)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                    {g.edgeCount ?? 0}
                  </td>
                  <td style={{ ...tdStyle }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <ActionBtn onClick={() => handleOpenGraph(g.id)}>Open</ActionBtn>
                      <ActionBtn
                        onClick={e => handleDelete(g.id, e)}
                        danger={deleteConfirm === g.id}
                      >
                        {deleteConfirm === g.id ? 'Confirm?' : 'Delete'}
                      </ActionBtn>
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

function ToolBtn({
  children, onClick, disabled, accent,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: accent ? 'var(--accent)' : 'var(--panel)',
        color: accent ? '#0d1117' : 'var(--text)',
        border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function ActionBtn({
  children, onClick, danger,
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 5,
        background: danger ? 'rgba(248,81,73,0.12)' : 'var(--panel)',
        border: `1px solid ${danger ? 'rgba(248,81,73,0.4)' : 'var(--border)'}`,
        color: danger ? 'var(--error)' : 'var(--text-dim)',
        fontSize: 11, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid rgba(48,54,61,0.5)',
  color: 'var(--text-dim)',
  fontSize: 12,
}
