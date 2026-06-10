// NetworkMap — GraphLibrary.tsx — Orange-accent library view (UI redesign, logic unchanged)
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { GraphSummary, NetworkGraph } from '@shared/types'
import HelpTip from './ui/HelpTip'

/** Highlight substrings matching query in amber */
function AmberHighlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const lower = text.toLowerCase()
  const lq = q.toLowerCase()
  const nodes: React.ReactNode[] = []
  let cursor = 0
  while (cursor < text.length) {
    const idx = lower.indexOf(lq, cursor)
    if (idx === -1) { nodes.push(text.slice(cursor)); break }
    if (idx > cursor) nodes.push(text.slice(cursor, idx))
    nodes.push(
      <mark
        key={idx}
        style={{
          background: 'rgba(255,140,66,0.28)',
          color: '#ff8c42',
          borderRadius: 2,
          padding: '0 1px',
          fontWeight: 700,
        }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>
    )
    cursor = idx + q.length
  }
  return <>{nodes}</>
}

interface Props {
  onOpenGraph: (graph: NetworkGraph) => void
  onOpenImport: () => void
  onOpenSettings: () => void
  onOpenHelp?: () => void
}

type SortKey = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'nodes-desc' | 'nodes-asc'

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

function fmtRelative(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(ms / 60000)
    const hrs = Math.floor(ms / 3600000)
    const days = Math.floor(ms / 86400000)
    if (mins < 1)  return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hrs < 24)  return `${hrs}h ago`
    if (days < 7)  return `${days}d ago`
    return fmt(iso)
  } catch { return iso }
}

function importSourceLabel(src?: string): string {
  if (src === 'nmap-xml')   return 'nmap XML'
  if (src === 'paste')      return 'Paste'
  if (src === 'recondesk')  return 'ReconDesk'
  if (src === 'gns3')       return 'GNS3'
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

function sortGraphs(graphs: GraphSummary[], sort: SortKey): GraphSummary[] {
  return [...graphs].sort((a, b) => {
    switch (sort) {
      case 'date-desc': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'date-asc':  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'name-asc':  return a.name.localeCompare(b.name)
      case 'name-desc': return b.name.localeCompare(a.name)
      case 'nodes-desc': return (b.nodeCount ?? 0) - (a.nodeCount ?? 0)
      case 'nodes-asc':  return (a.nodeCount ?? 0) - (b.nodeCount ?? 0)
      default: return 0
    }
  })
}

export default function GraphLibrary({ onOpenGraph, onOpenImport, onOpenSettings, onOpenHelp }: Props) {
  const [graphs, setGraphs]               = useState<GraphSummary[]>([])
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [sort, setSort]                   = useState<SortKey>('date-desc')
  const [libSearch, setLibSearch]         = useState('')

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

  const sorted = useMemo(() => {
    const base = sortGraphs(graphs, sort)
    if (!libSearch.trim()) return base
    const q = libSearch.toLowerCase()
    return base.filter(g => g.name.toLowerCase().includes(q))
  }, [graphs, sort, libSearch])

  const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'date-desc',  label: 'Newest first' },
    { value: 'date-asc',   label: 'Oldest first' },
    { value: 'name-asc',   label: 'Name A–Z' },
    { value: 'name-desc',  label: 'Name Z–A' },
    { value: 'nodes-desc', label: 'Most nodes' },
    { value: 'nodes-asc',  label: 'Fewest nodes' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#07080f' }}>

      {/* Title bar — polish: 32px height, lockup + ╱ separator, flat metric strip */}
      <div
        className="drag-region"
        style={{
          padding: '0 16px',
          height: 32,
          display: 'flex', alignItems: 'center',
          background: 'var(--surface-0)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Traffic light spacer */}
        <div className="no-drag" style={{ width: 70 }} />

        {/* Brand lockup: node/graph icon + app-name (600) + ╱ + subname (muted) */}
        <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1L14.5 4.75V11.25L8 15L1.5 11.25V4.75L8 1Z" />
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: 'var(--type-body)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              NetworkMap
            </span>
            <span style={{ color: 'var(--border-default)', userSelect: 'none' }}>╱</span>
            <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              Topology
            </span>
          </div>
        </div>

        {/* Flat metric strip */}
        {graphs.length > 0 && (
          <div
            className="no-drag"
            style={{
              display: 'flex', alignItems: 'center', marginLeft: 12,
              fontSize: 'var(--type-caption)', color: 'var(--text-muted)',
              borderLeft: '1px solid var(--border-subtle)', paddingLeft: 8,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>{graphs.length}</span>
            <span style={{ margin: '0 4px', color: 'var(--border-default)' }}>·</span>
            <span>{graphs.length === 1 ? 'graph' : 'graphs'}</span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* CYBERTOOLS text badge */}
        <span
          className="no-drag"
          style={{
            marginRight: 8,
            fontSize: 'var(--type-caption)', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          CYBERTOOLS
        </span>

        {onOpenHelp && (
          <button
            className="no-drag"
            onClick={onOpenHelp}
            title="Help & onboarding"
            style={{
              width: 24, height: 24, borderRadius: 6,
              border: '1px solid var(--border-subtle)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: 'var(--type-caption)', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)' }}
          >?</button>
        )}

        <button
          className="no-drag"
          onClick={onOpenSettings}
          title="Settings"
          style={{
            width: 24, height: 24, borderRadius: 6, marginLeft: 4,
            border: '1px solid var(--border-subtle)', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)' }}
        >
          {/* Settings cog — SVG 13×13 */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <span className="no-drag" style={{ marginLeft: 4 }}>
          <HelpTip
            title="Settings"
            body="Configure storage paths, default layout, edge inference rules, and integrations like ReconDesk and GNS3."
          />
        </span>
      </div>

      {/* Section header */}
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Graph Library</h1>
            <HelpTip
              title="Graph Library"
              body="All saved network topology graphs. Click a row to open it in the canvas, or use the toolbar to import a scan or start a blank graph."
            />
            {graphs.length > 0 && (
              <span
                key={graphs.length}
                className="badge-animate"
                style={{
                  fontSize: 10, fontWeight: 700,
                  background: 'rgba(255,140,66,0.10)', color: '#ff8c42',
                  border: '1px solid rgba(255,140,66,0.22)',
                  borderRadius: 10, padding: '2px 8px',
                }}
              >{graphs.length}</span>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>
            Network topology graphs from nmap scans
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: '10px 24px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{
            position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, color: 'rgba(255,140,66,0.4)', pointerEvents: 'none',
          }}>⌕</span>
          <input
            type="text"
            value={libSearch}
            onChange={e => setLibSearch(e.target.value)}
            placeholder="Search graphs by name…"
            style={{
              width: '100%', background: '#0d0e18',
              border: '1px solid rgba(42,51,71,0.75)', borderRadius: 8,
              padding: '6px 28px 6px 28px',
              color: 'var(--text-primary)', fontSize: 12,
              fontFamily: 'var(--font-display)', outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 150ms',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,140,66,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(42,51,71,0.75)')}
          />
          {libSearch && (
            <button
              onClick={() => setLibSearch('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '0 2px',
              }}
            >✕</button>
          )}
        </div>
        {libSearch && (
          <span style={{ fontSize: 10, color: 'rgba(255,140,66,0.6)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {sorted.length} result{sorted.length !== 1 ? 's' : ''}
          </span>
        )}
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
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'rgba(255,140,66,0.12)', border: '1px solid rgba(255,140,66,0.30)',
            color: '#ff8c42', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1, transition: 'all 150ms',
            fontFamily: 'var(--font-display)',
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'rgba(255,140,66,0.2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,140,66,0.12)' }}
        >Import ▾</button>
        <HelpTip
          title="Import Scan"
          body="Open the import dialog to load an nmap XML file, paste raw XML, or pull from ReconDesk or GNS3. Hosts and services become graph nodes."
        />
        <button
          onClick={() => onOpenGraph(makeEmptyGraph())}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: '#0d0e18', border: '1px solid rgba(42,51,71,0.75)',
            color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 150ms',
            fontFamily: 'var(--font-display)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
        >+ New Empty Graph</button>
        <HelpTip
          title="New Empty Graph"
          body="Create a blank topology you can build by hand — add nodes and edges manually in the canvas without importing a scan."
        />
        <HelpTip
          title="Filters & Search"
          body="Type a name above to filter graphs in the library. Use the Sort dropdown to reorder by date, name, or node count."
          style={{ marginLeft: 4 }}
        />

        {graphs.length > 1 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sort:</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              style={{
                background: '#0d0e18', border: '1px solid rgba(42,51,71,0.75)',
                borderRadius: 8, padding: '4px 8px', color: 'var(--text-secondary)',
                fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-display)',
                outline: 'none', transition: 'border-color 150ms',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,140,66,0.4)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(42,51,71,0.75)')}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          margin: '8px 24px', padding: '8px 12px', borderRadius: 8,
          background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)',
          color: '#f85149', fontSize: 12,
        }}>{error}</div>
      )}

      {/* Graph table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 16px' }}>
        {sorted.length === 0 ? (
          <EmptyState onOpenImport={onOpenImport} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
            <thead>
              <tr>
                {(['Name', 'Source', 'Created', 'Modified', 'Nodes', 'Edges', 'Actions'] as const).map(h => (
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
              {sorted.map(g => (
                <tr
                  key={g.id}
                  className="lib-row"
                  onClick={() => handleOpenGraph(g.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                      <AmberHighlight text={g.name} query={libSearch} />
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 4,
                      background: 'rgba(255,140,66,0.08)', border: '1px solid rgba(255,140,66,0.18)',
                      color: '#ff8c42',
                    }}>{importSourceLabel(g.importSource)}</span>
                  </td>
                  <td style={{ ...tdStyle }} title={fmt(g.createdAt)}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{fmt(g.createdAt)}</span>
                  </td>
                  <td style={{ ...tdStyle }}>
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 10, color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                      title={fmt(g.createdAt)}
                    >
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="rgba(255,140,66,0.4)" strokeWidth="1.4">
                        <circle cx="5" cy="5" r="4" />
                        <path d="M5 2.5v2.5l1.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {fmtRelative(g.createdAt)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                    <NodeCountBadge count={g.nodeCount} />
                  </td>
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

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ onOpenImport }: { onOpenImport: () => void }) {
  return (
    <div className="empty-state content-stream-in" style={{ height: '100%', justifyContent: 'center' }}>
      <div className="empty-glyph">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <line x1="12" y1="7" x2="5" y2="17" />
          <line x1="12" y1="7" x2="19" y2="17" />
          <line x1="7" y1="19" x2="17" y2="19" />
        </svg>
      </div>
      <div className="empty-title">No graphs yet</div>
      <div className="empty-sub">Import an nmap XML scan to visualise your network topology.</div>
      <button
        onClick={onOpenImport}
        style={{
          marginTop: 8, padding: '7px 20px', borderRadius: 'var(--radius-md)',
          background: 'var(--accent-tint)', border: '1px solid var(--accent-border)',
          color: 'var(--accent)', fontWeight: 600, fontSize: 'var(--type-body)',
          cursor: 'pointer', transition: 'all 150ms var(--ease)',
          fontFamily: 'var(--font-display)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'var(--accent-tint2)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'var(--accent-tint)'
        }}
      >Import Scan</button>
    </div>
  )
}

// ─── Animated node count badge ───────────────────────────────────────────────
function NodeCountBadge({ count }: { count: number }) {
  return (
    <span
      key={count}
      className="badge-animate"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '2px 7px', borderRadius: 10,
        background: 'rgba(255,140,66,0.07)', border: '1px solid rgba(255,140,66,0.18)',
        color: '#ff8c42', fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
      }}
    >
      {count}
    </span>
  )
}

function RowBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 8,
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
