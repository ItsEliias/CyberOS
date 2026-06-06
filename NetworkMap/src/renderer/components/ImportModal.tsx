// NetworkMap — ImportModal.tsx  (4-tab: File / Paste / ReconDesk / GNS3)
import { useState } from 'react'
import type { NetworkGraph, NetworkNode, NetworkEdge } from '@shared/types'
import { parseNmapXml, type ParseResult } from '../lib/nmapParser'
import { inferEdges } from '../lib/edgeInference'
import { ReconDeskTab, Gns3Tab } from './ImportModalTabs'
import HelpTip from './ui/HelpTip'

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
        onClick={handlePickFile}
        className={dragging ? 'dropzone-active' : ''}
        style={{
          borderRadius: 10, padding: '32px 24px',
          textAlign: 'center', cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
          background: dragging
            ? 'rgba(255,140,66,0.06)'
            : result
            ? 'rgba(63,185,80,0.04)'
            : 'rgba(13,14,24,0.5)',
          border: `2px dashed ${
            dragging ? '#ff8c42' : result ? 'rgba(63,185,80,0.4)' : 'rgba(42,51,71,0.7)'
          }`,
          boxShadow: dragging ? '0 0 20px rgba(255,140,66,0.12), inset 0 0 20px rgba(255,140,66,0.04)' : 'none',
          transform: dragging ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        {/* Animated marching dashes overlay on drag-over */}
        {dragging && (
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', borderRadius: 10 }}
            viewBox="0 0 100 100" preserveAspectRatio="none"
          >
            <rect
              x="1" y="1" width="98" height="98" rx="9"
              fill="none"
              stroke="#ff8c42"
              strokeWidth="2"
              strokeDasharray="10 5"
              className="dropzone-dash-rect"
            />
          </svg>
        )}

        {/* Icon */}
        {dragging ? (
          <div style={{ marginBottom: 10 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ margin: '0 auto', display: 'block' }}>
              <circle cx="16" cy="16" r="14" fill="rgba(255,140,66,0.12)" stroke="rgba(255,140,66,0.4)" strokeWidth="1.5" />
              <path d="M16 10v12M10 16l6-6 6 6" stroke="#ff8c42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : result ? (
          <div style={{ fontSize: 26, marginBottom: 8 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ margin: '0 auto', display: 'block' }}>
              <circle cx="14" cy="14" r="12" fill="rgba(63,185,80,0.12)" stroke="rgba(63,185,80,0.35)" strokeWidth="1.5" />
              <path d="M9 14l3.5 3.5L19 11" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : (
          <div style={{ marginBottom: 10 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ margin: '0 auto', display: 'block', opacity: 0.4 }}>
              <rect x="6" y="4" width="16" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 10h8M10 14h8M10 18h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}

        <div style={{ fontSize: 13, color: dragging ? '#ff8c42' : result ? '#3fb950' : 'var(--text-dim)', fontWeight: dragging ? 600 : 400 }}>
          {loading ? 'Opening…'
            : dragging ? 'Drop to import'
            : result ? `${filename} — ready to import`
            : 'Click to select nmap XML file, or drag & drop'}
        </div>
        {!dragging && !result && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
            Supports .xml (nmap -oX format)
          </div>
        )}
        {filename && !result && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{filename}</div>}
      </div>

      {result && (
        <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ color: '#3fb950' }}>✓ Found {result.nodes.length} hosts</div>
          <div style={{ color: '#3fb950' }}>✓ Found {result.nodes.reduce((a, n) => a + n.openPortCount, 0)} open ports</div>
          {result.excluded > 0 && (
            <div style={{ color: '#d29922' }}>⚠ {result.excluded} hosts with no open ports (excluded)</div>
          )}
          {result.errors.map((err, i) => (
            <div key={i} style={{ color: '#f85149' }}>✗ {err}</div>
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
          minHeight: 200, background: 'rgba(10,10,15,0.8)',
          border: '1px solid rgba(42,51,71,0.6)', borderRadius: 6,
          padding: 12, color: '#e2e8f0', fontSize: 12,
          fontFamily: 'var(--font-mono)', resize: 'vertical',
          outline: 'none', transition: 'border-color 150ms',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,153,34,0.5)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(42,51,71,0.6)')}
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

const TAB_LABELS: Record<Tab, string> = {
  file: 'Import File', paste: 'Paste XML', recondesk: 'ReconDesk', gns3: 'GNS3',
}

// ─── Import history chip ───────────────────────────────────────────────────────
interface HistoryEntry { name: string; importedAt: string; nodeCount: number }

function HistoryChip({ entry }: { entry: HistoryEntry }) {
  const ts = new Date(entry.importedAt)
  const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = ts.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 8px',
      borderRadius: 20,
      background: 'rgba(42,51,71,0.25)',
      border: '1px solid rgba(42,51,71,0.55)',
      flexShrink: 0,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: 'rgba(63,185,80,0.7)',
        boxShadow: '0 0 4px rgba(63,185,80,0.5)',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500,
        maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{entry.name}</span>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {entry.nodeCount}n · {dateStr} {timeStr}
      </span>
    </div>
  )
}

// ─── ImportModal ────────────────────────────────────────────────────────────────
export default function ImportModal({ onClose, onImport }: Props) {
  const [tab, setTab] = useState<Tab>('file')
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem('nm_import_history')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  function handleImport(g: NetworkGraph) {
    const entry: HistoryEntry = {
      name: g.name,
      importedAt: g.createdAt,
      nodeCount: g.nodes.length,
    }
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 5)
      try { localStorage.setItem('nm_import_history', JSON.stringify(next)) } catch {}
      return next
    })
    onImport(g)
  }

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
            <HelpTip
              title="Import Scan dialog"
              body="Bring hosts and services into NetworkMap. Pick a tab to import from an nmap XML file, raw pasted XML, ReconDesk, or a running GNS3 project."
            />
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
                borderBottom: `2px solid ${tab === t ? '#d29922' : 'transparent'}`,
                color: tab === t ? '#d29922' : '#8b949e',
                cursor: 'pointer', transition: 'all 180ms var(--ease)', fontFamily: 'var(--font-display)',
              }}
              onMouseEnter={e => { if (tab !== t) (e.currentTarget as HTMLElement).style.color = '#e2e8f0' }}
              onMouseLeave={e => { if (tab !== t) (e.currentTarget as HTMLElement).style.color = '#8b949e' }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <div style={{ height: 1, background: 'rgba(42,51,71,0.5)', margin: '0 0 0 0' }} />

        {/* Import history chips */}
        {history.length > 0 && (
          <div style={{
            padding: '8px 20px 6px',
            borderBottom: '1px solid rgba(42,51,71,0.4)',
            background: 'rgba(42,51,71,0.06)',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'rgba(139,148,158,0.45)',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
            }}>Recent imports</div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {history.map((entry, i) => (
                <HistoryChip key={i} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {/* Tab body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {tab === 'file'      && <FileTab      onSave={g => { handleImport(g); onClose() }} />}
          {tab === 'paste'     && <PasteTab     onSave={g => { handleImport(g); onClose() }} />}
          {tab === 'recondesk' && <ReconDeskTab onSave={g => { handleImport(g); onClose() }} />}
          {tab === 'gns3'      && <Gns3Tab      onSave={g => { handleImport(g); onClose() }} />}
        </div>
      </div>
    </div>
  )
}
