// NetworkMap — ImportModalTabs.tsx — ReconDesk and GNS3 import tab components
import { useState } from 'react'
import type { NetworkGraph, NetworkNode } from '@shared/types'
import { parseGns3Json } from '../lib/nmapParser'
import { inferEdges } from '../lib/edgeInference'

function makeGraph(
  nodes: NetworkNode[],
  name: string,
  importSource: 'nmap-xml' | 'paste' | 'recondesk' | 'gns3',
): NetworkGraph {
  const id = `graph-${Date.now()}`
  return {
    id, name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes,
    edges: inferEdges(nodes),
    metadata: { importSource },
  }
}

function SaveRow({
  nodes, defaultName, onSave,
}: {
  nodes: NetworkNode[]
  defaultName: string
  onSave: (g: NetworkGraph) => void
}) {
  const [name, setName] = useState(defaultName)
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Graph name…"
        style={{
          flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 5, padding: '6px 10px', color: 'var(--text)', fontSize: 12,
        }}
      />
      <button
        disabled={nodes.length === 0 || !name.trim()}
        onClick={() => onSave(makeGraph(nodes, name.trim() || defaultName, 'recondesk'))}
        style={{
          padding: '6px 14px', borderRadius: 5,
          background: 'var(--accent)', border: 'none',
          color: '#0d1117', fontWeight: 600, fontSize: 12,
          opacity: nodes.length === 0 || !name.trim() ? 0.5 : 1,
          cursor: nodes.length === 0 || !name.trim() ? 'not-allowed' : 'pointer',
        }}
      >Import ({nodes.length} nodes)</button>
    </div>
  )
}

// ─── Tab: ReconDesk ───────────────────────────────────────────────────────────
export function ReconDeskTab({ onSave }: { onSave: (g: NetworkGraph) => void }) {
  const [loading, setLoading] = useState(false)
  const [nodes, setNodes]     = useState<NetworkNode[] | null>(null)
  const [targetName, setTargetName] = useState('')
  const [error, setError]     = useState<string | null>(null)

  async function handleLoad() {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.generateFromReconDesk()
      if (!result || result.nodes.length === 0) {
        setError('No active ReconDesk target found.')
        return
      }
      setTargetName(result.name)
      const mapped: NetworkNode[] = result.nodes.map((n: any) => ({
        id:            n.ip,
        ip:            n.ip,
        hostname:      n.label !== n.ip ? n.label : undefined,
        status:        'up' as const,
        ports:         n.ports.map((p: any) => ({
          port:     p.number,
          protocol: p.protocol,
          state:    p.state as 'open' | 'filtered' | 'closed',
          service:  p.service,
        })),
        openPortCount: n.ports.filter((p: any) => p.state === 'open').length,
        x: 0, y: 0, fx: null, fy: null,
      }))
      setNodes(mapped)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        Import ports for the active ReconDesk target:
      </div>
      {!nodes && (
        <button
          onClick={handleLoad}
          disabled={loading}
          style={{
            padding: '7px 14px', borderRadius: 5,
            background: 'var(--panel)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 12,
            opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >{loading ? 'Loading…' : 'Load from ReconDesk'}</button>
      )}
      {error && <div style={{ fontSize: 12, color: 'var(--error)' }}>{error}</div>}
      {nodes && nodes.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text)' }}>
            Target: <strong style={{ color: 'var(--accent)' }}>{targetName}</strong>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {nodes.reduce((a, n) => a + n.openPortCount, 0)} open ports available
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {nodes.flatMap(n => n.ports.filter(p => p.state === 'open')).map(p => (
              <span key={`${p.port}-${p.protocol}`} style={{
                padding: '2px 8px', borderRadius: 4,
                background: 'rgba(210,153,34,0.1)', border: '1px solid rgba(210,153,34,0.25)',
                color: 'var(--accent)', fontSize: 11, fontFamily: 'monospace',
              }}>{p.port}/{p.protocol}{p.service ? ` ${p.service}` : ''}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            This will create a single-node graph.
          </div>
          <SaveRow
            nodes={nodes}
            defaultName={targetName || `ReconDesk ${new Date().toLocaleDateString()}`}
            onSave={onSave}
          />
        </>
      )}
    </div>
  )
}

// ─── Tab: GNS3 ────────────────────────────────────────────────────────────────
export function Gns3Tab({ onSave }: { onSave: (g: NetworkGraph) => void }) {
  const [result, setResult]     = useState<ReturnType<typeof parseGns3Json> | null>(null)
  const [dragging, setDragging] = useState(false)
  const [filename, setFilename] = useState('')

  function processFile(content: string, name: string) {
    setFilename(name)
    setResult(parseGns3Json(content))
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => processFile(ev.target?.result as string, file.name.replace(/\.gns3$/i, ''))
    reader.readAsText(file)
  }

  function handlePick() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.gns3,.json'
    input.onchange = () => {
      const f = input.files?.[0]; if (!f) return
      const reader = new FileReader()
      reader.onload = ev => processFile(ev.target?.result as string, f.name.replace(/\.(gns3|json)$/i, ''))
      reader.readAsText(f)
    }
    input.click()
  }

  const defaultName = filename || `GNS3 Topology ${new Date().toLocaleDateString()}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        Import a GNS3 <code style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>.gns3</code> topology file. Nodes, positions, and links are extracted automatically.
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={handlePick}
        style={{ border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(210,153,34,0.05)' : 'transparent' }}
      >
        <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>🗺</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Click or drag a .gns3 file here</div>
        {filename && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{filename}.gns3</div>}
      </div>
      {result && (
        <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ color: 'var(--success)' }}>✓ {result.nodes.length} devices loaded</div>
          {result.errors.map((e, i) => <div key={i} style={{ color: 'var(--error)' }}>✗ {e}</div>)}
        </div>
      )}
      {result && result.nodes.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', flex: 1 }}>Ready: {result.nodes.length} nodes from GNS3</span>
          <button
            onClick={() => onSave(makeGraph(result.nodes, defaultName, 'gns3'))}
            style={{ padding: '6px 14px', borderRadius: 5, background: 'var(--accent)', border: 'none', color: '#0d1117', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
          >Import ({result.nodes.length} nodes)</button>
        </div>
      )}
    </div>
  )
}
