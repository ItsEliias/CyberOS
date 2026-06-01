// NetworkMap — GraphLibrary.tsx
import { useState, useEffect, useCallback } from 'react'
import type { GraphSummary, NetworkNode, NetworkGraph } from '@shared/types'
import PasteXmlModal from './PasteXmlModal'

interface Props {
  onOpenGraph: (graph: NetworkGraph) => void
}

function fmt(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
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

function nodesToGraph(nodes: NetworkNode[], name: string): NetworkGraph {
  const id = `graph-${Date.now()}`
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes,
    edges: [],
  }
}

export default function GraphLibrary({ onOpenGraph }: Props) {
  const [graphs, setGraphs]       = useState<GraphSummary[]>([])
  const [showPaste, setShowPaste] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const reload = useCallback(() => {
    window.electronAPI.loadGraphs().then(setGraphs).catch(console.error)
  }, [])

  useEffect(() => { reload() }, [reload])

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await window.electronAPI.deleteGraph(id)
    reload()
  }

  async function handleOpenGraph(id: string) {
    const g = await window.electronAPI.loadGraph(id)
    if (g) onOpenGraph(g)
  }

  async function handleImportFile() {
    setLoading(true)
    setError(null)
    try {
      const nodes = await window.electronAPI.loadNmapFile()
      if (nodes && nodes.length > 0) {
        const g = nodesToGraph(nodes, `Scan ${new Date().toLocaleDateString()}`)
        await window.electronAPI.saveGraph(g)
        reload()
        onOpenGraph(g)
      } else if (nodes !== null) {
        setError('No hosts found in the selected XML file.')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleImportReconDesk() {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.generateFromReconDesk()
      if (result && result.nodes.length > 0) {
        // Map ReconDesk port shape → NetworkPort shape
        const nodes: NetworkNode[] = result.nodes.map((n: any) => ({
          id:       n.ip,
          ip:       n.ip,
          hostname: n.label !== n.ip ? n.label : undefined,
          status:   'up' as const,
          ports:    n.ports.map((p: any) => ({
            port:     p.number,
            protocol: p.protocol,
            state:    p.state as 'open' | 'filtered' | 'closed',
            service:  p.service,
          })),
          x: 0,
          y: 0,
        }))
        const g = nodesToGraph(nodes, result.name)
        await window.electronAPI.saveGraph(g)
        reload()
        onOpenGraph(g)
      } else {
        setError('No active ReconDesk target found.')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePasteImport(nodes: NetworkNode[]) {
    setShowPaste(false)
    if (nodes.length === 0) return
    const g = nodesToGraph(nodes, `Pasted Scan ${new Date().toLocaleDateString()}`)
    await window.electronAPI.saveGraph(g)
    reload()
    onOpenGraph(g)
  }

  function handleNewEmpty() {
    const g = makeEmptyGraph()
    onOpenGraph(g)
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
            fontSize: 10, fontWeight: 500, color: 'var(--accent)',
            background: 'rgba(210,153,34,0.12)', border: '1px solid rgba(210,153,34,0.25)',
            borderRadius: 4, padding: '1px 6px', letterSpacing: '0.05em',
          }}>CYBERTOOLS</span>
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
      }}>
        <ToolBtn onClick={handleImportFile} disabled={loading}>
          Import nmap XML
        </ToolBtn>
        <ToolBtn onClick={() => setShowPaste(true)} disabled={loading}>
          Paste XML
        </ToolBtn>
        <ToolBtn onClick={handleImportReconDesk} disabled={loading}>
          Import from ReconDesk
        </ToolBtn>
        <ToolBtn onClick={handleNewEmpty} accent>
          + New Empty Graph
        </ToolBtn>
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

      {/* Graph grid */}
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
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
          }}>
            {graphs.map(g => (
              <GraphCard
                key={g.id}
                graph={g}
                onClick={() => handleOpenGraph(g.id)}
                onDelete={e => handleDelete(g.id, e)}
              />
            ))}
          </div>
        )}
      </div>

      {showPaste && (
        <PasteXmlModal
          onClose={() => setShowPaste(false)}
          onImport={handlePasteImport}
        />
      )}
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

function GraphCard({
  graph, onClick, onDelete,
}: {
  graph: GraphSummary
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '14px 16px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-dim)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13, marginBottom: 6 }}>
          {graph.name}
        </div>
        <button
          onClick={onDelete}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: 16,
            lineHeight: 1,
            padding: '0 2px',
            borderRadius: 4,
          }}
          title="Delete graph"
        >
          ×
        </button>
      </div>
      <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 4 }}>
        {graph.nodeCount} {graph.nodeCount === 1 ? 'host' : 'hosts'}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        {fmt(graph.createdAt)}
      </div>
    </div>
  )
}
