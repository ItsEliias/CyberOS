// NetworkMap — ImportModal.tsx  (3-tab: File / Paste / ReconDesk)
import { useState } from 'react'
import type { NetworkGraph, NetworkNode, NetworkEdge } from '@shared/types'
import { parseNmapXml, parseGns3Json, type ParseResult } from '../lib/nmapParser'
import { inferEdges } from '../lib/edgeInference'

interface Props {
  onClose: () => void
  onImport: (graph: NetworkGraph) => void
}

type Tab = 'file' | 'paste' | 'recondesk' | 'gns3'

function makeGraph(
  nodes: NetworkNode[],
  name: string,
  importSource: 'nmap-xml' | 'paste' | 'recondesk' | 'gns3',
  edges?: NetworkEdge[]
): NetworkGraph {
  const id = `graph-${Date.now()}`
  const resolvedEdges = edges ?? inferEdges(nodes)
  return {
    id, name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes,
    edges: resolvedEdges,
    metadata: { importSource },
  }
}

// ─── Shared SaveRow ────────────────────────────────────────────────────────────
function SaveRow({
  nodes, importSource, defaultName, onSave,
}: {
  nodes: NetworkNode[]
  importSource: 'nmap-xml' | 'paste' | 'recondesk'
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
        onClick={() => onSave(makeGraph(nodes, name.trim() || defaultName, importSource))}
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

// ─── Tab: File ────────────────────────────────────────────────────────────────
function FileTab({ onSave }: { onSave: (g: NetworkGraph) => void }) {
  const [result, setResult]       = useState<ParseResult | null>(null)
  const [loading, setLoading]     = useState(false)
  const [dragging, setDragging]   = useState(false)
  const [filename, setFilename]   = useState('')

  function processXml(xml: string, name: string) {
    setFilename(name)
    const r = parseNmapXml(xml)
    setResult(r)
  }

  async function handlePickFile() {
    setLoading(true)
    try {
      const res = await window.electronAPI.loadNmapFileRaw()
      if (res) processXml(res.content, res.filename)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => processXml(ev.target?.result as string, file.name.replace(/\.xml$/i, ''))
    reader.readAsText(file)
  }

  const defaultName = filename || `Scan ${new Date().toLocaleDateString()}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 8, padding: '28px 20px',
          textAlign: 'center', cursor: 'pointer',
          transition: 'border-color 0.15s',
          background: dragging ? 'rgba(210,153,34,0.05)' : 'transparent',
        }}
        onClick={handlePickFile}
      >
        <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>📄</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          {loading ? 'Opening…' : 'Click to select nmap XML file, or drag & drop here'}
        </div>
        {filename && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{filename}</div>}
      </div>

      {result && (
        <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ color: 'var(--success)' }}>✓ Found {result.nodes.length} hosts</div>
          <div style={{ color: 'var(--success)' }}>✓ Found {result.nodes.reduce((a, n) => a + n.openPortCount, 0)} open ports</div>
          {result.excluded > 0 && (
            <div style={{ color: 'var(--text-muted)' }}>✗ {result.excluded} hosts with no open ports (excluded)</div>
          )}
          {result.errors.map((err, i) => (
            <div key={i} style={{ color: 'var(--error)' }}>✗ {err}</div>
          ))}
        </div>
      )}

      {result && result.nodes.length > 0 && (
        <SaveRow nodes={result.nodes} importSource="nmap-xml" defaultName={defaultName} onSave={onSave} />
      )}
    </div>
  )
}

// ─── Tab: Paste ───────────────────────────────────────────────────────────────
function PasteTab({ onSave }: { onSave: (g: NetworkGraph) => void }) {
  const [xml, setXml]         = useState('')
  const [result, setResult]   = useState<ParseResult | null>(null)
  const [parsing, setParsing] = useState(false)

  function handleParse() {
    if (!xml.trim()) return
    setParsing(true)
    try {
      const r = parseNmapXml(xml)
      setResult(r)
    } finally {
      setParsing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 2 }}>
        Paste nmap XML output (-oX format):
      </div>
      <textarea
        value={xml}
        onChange={e => { setXml(e.target.value); setResult(null) }}
        placeholder="<?xml version=&quot;1.0&quot;...&#10;<nmaprun ...>"
        style={{
          minHeight: 200, background: 'var(--bg)',
          border: '1px solid var(--border)', borderRadius: 6,
          padding: 12, color: 'var(--text)', fontSize: 12,
          fontFamily: 'monospace', resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={handleParse}
          disabled={parsing || !xml.trim()}
          style={{
            padding: '6px 14px', borderRadius: 5,
            background: 'var(--panel)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 12,
            opacity: parsing || !xml.trim() ? 0.5 : 1,
          }}
        >{parsing ? 'Parsing…' : 'Parse →'}</button>
        {result && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Preview: {result.nodes.length} nodes found</span>}
      </div>

      {result && result.errors.length > 0 && result.errors.map((err, i) => (
        <div key={i} style={{ fontSize: 12, color: 'var(--error)' }}>✗ {err}</div>
      ))}

      {result && result.nodes.length > 0 && (
        <SaveRow
          nodes={result.nodes}
          importSource="paste"
          defaultName={`Pasted Scan ${new Date().toLocaleDateString()}`}
          onSave={onSave}
        />
      )}
    </div>
  )
}

// ─── Tab: ReconDesk ───────────────────────────────────────────────────────────
function ReconDeskTab({ onSave }: { onSave: (g: NetworkGraph) => void }) {
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
            importSource="recondesk"
            defaultName={targetName || `ReconDesk ${new Date().toLocaleDateString()}`}
            onSave={onSave}
          />
        </>
      )}
    </div>
  )
}

// ─── Tab: GNS3 ────────────────────────────────────────────────────────────────
function Gns3Tab({ onSave }: { onSave: (g: NetworkGraph) => void }) {
  const [result, setResult]     = useState<ParseResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const [filename, setFilename] = useState('')

  function processFile(content: string, name: string) {
    setFilename(name)
    const r = parseGns3Json(content)
    setResult(r)
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

const TAB_LABELS: Record<Tab, string> = {
  file: 'Import File', paste: 'Paste XML', recondesk: 'ReconDesk', gns3: 'GNS3',
}

// ─── ImportModal ────────────────────────────────────────────────────────────────
export default function ImportModal({ onClose, onImport }: Props) {
  const [tab, setTab] = useState<Tab>('file')

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="fade-up"
        style={{
          background: 'rgba(13,14,24,0.98)',
          border: '1px solid rgba(255,255,255,0.055)',
          borderRadius: 14, width: 580, maxHeight: '82vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px',
          background: 'rgba(255,140,66,0.04)',
          borderBottom: '1px solid rgba(255,140,66,0.10)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 2, height: 16, borderRadius: 1, background: 'linear-gradient(180deg, #ff8c42, rgba(255,140,66,0.4))', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>Import Scan Data</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1,
              width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms var(--ease)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '8px 16px 0', gap: 2 }}>
          {(['file', 'paste', 'recondesk', 'gns3'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: tab === t ? 600 : 400,
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${tab === t ? '#ff8c42' : 'transparent'}`,
                color: tab === t ? '#ff8c42' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 180ms var(--ease)', fontFamily: 'var(--font-display)',
              }}
              onMouseEnter={e => { if (tab !== t) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { if (tab !== t) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <div style={{ height: 1, background: 'rgba(42,51,71,0.5)', margin: '0 0 0 0' }} />

        {/* Tab body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {tab === 'file'      && <FileTab      onSave={g => { onImport(g); onClose() }} />}
          {tab === 'paste'     && <PasteTab     onSave={g => { onImport(g); onClose() }} />}
          {tab === 'recondesk' && <ReconDeskTab onSave={g => { onImport(g); onClose() }} />}
          {tab === 'gns3'      && <Gns3Tab      onSave={g => { onImport(g); onClose() }} />}
        </div>
      </div>
    </div>
  )
}
