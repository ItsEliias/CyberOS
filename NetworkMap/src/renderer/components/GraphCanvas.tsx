// NetworkMap — GraphCanvas.tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import type { NetworkGraph, NetworkNode, GraphSummary } from '@shared/types'
import { runSimulation } from '../lib/simulation'
import NodeDetail from './NodeDetail'

interface Props {
  graph: NetworkGraph
  savedGraphs: GraphSummary[]
  onBack: () => void
  onSwitchGraph: (id: string) => void
}

// ─── Port-weighted radius ──────────────────────────────────────────────────
function nodeRadius(openPorts: number): number {
  if (openPorts === 0)  return 14
  if (openPorts <= 2)   return 18
  if (openPorts <= 5)   return 22
  if (openPorts <= 10)  return 26
  return 30
}

// ─── Platform inference ───────────────────────────────────────────────────
type Platform = 'windows' | 'linux' | 'web' | 'macos' | 'unknown'

function inferPlatform(node: NetworkNode): Platform {
  const os = (node.os ?? '').toLowerCase()
  if (os.includes('win'))    return 'windows'
  if (os.includes('mac') || os.includes('darwin') || os.includes('osx')) return 'macos'
  if (os.includes('linux'))  return 'linux'

  // Infer from open service names
  const services = node.ports
    .filter(p => p.state === 'open')
    .map(p => (p.service ?? '').toLowerCase())

  const hasHttp  = services.some(s => s === 'http' || s === 'https' || s === 'www')
  const hasSMB   = services.some(s => s.includes('smb') || s.includes('microsoft-ds') || s.includes('netbios'))
  const hasSSH   = services.some(s => s.includes('ssh'))

  // Port-based inference for http/https
  const openPortNums = node.ports.filter(p => p.state === 'open').map(p => p.port)
  const hasWebPort   = openPortNums.includes(80) || openPortNums.includes(443)
  const hasWinPort   = openPortNums.includes(135) || openPortNums.includes(445) || openPortNums.includes(3389)

  if (hasHttp || hasWebPort)  return 'web'
  if (hasSMB  || hasWinPort)  return 'windows'
  if (hasSSH)                 return 'linux'
  return 'unknown'
}

const PLATFORM_COLORS: Record<Platform, string> = {
  windows: '#3b82f6',
  linux:   '#22c55e',
  web:     '#06b6d4',
  macos:   '#a855f7',
  unknown: '#64748b',
}

const PLATFORM_LABELS: Array<{ platform: Platform; label: string }> = [
  { platform: 'windows', label: 'Windows' },
  { platform: 'linux',   label: 'Linux'   },
  { platform: 'web',     label: 'Web'     },
  { platform: 'macos',   label: 'macOS'   },
  { platform: 'unknown', label: 'Unknown' },
]

const SIZE_SCALE: Array<{ label: string; r: number }> = [
  { label: '0',    r: 14 },
  { label: '1–2',  r: 18 },
  { label: '3–5',  r: 22 },
  { label: '6–10', r: 26 },
  { label: '11+',  r: 30 },
]

export default function GraphCanvas({ graph: initialGraph, savedGraphs, onBack, onSwitchGraph }: Props) {
  const [graph, setGraph]             = useState<NetworkGraph>(() => {
    // Run simulation if all nodes have default x:0, y:0
    const needsLayout = initialGraph.nodes.every(n => n.x === 0 && n.y === 0)
    if (needsLayout && initialGraph.nodes.length > 0) {
      const laid = runSimulation(initialGraph.nodes, initialGraph.edges, 800, 600)
      return { ...initialGraph, nodes: laid }
    }
    return initialGraph
  })
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [graphName, setGraphName]     = useState(initialGraph.name)
  const [saving, setSaving]           = useState(false)
  const [saveMsg, setSaveMsg]         = useState('')

  // SVG pan/zoom state
  const [transform, setTransform]     = useState({ x: 0, y: 0, scale: 1 })
  const svgRef      = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Drag state (node drag or pan)
  const dragState = useRef<{
    type: 'node' | 'pan'
    nodeId?: string
    startMouseX: number
    startMouseY: number
    startNodeX?: number
    startNodeY?: number
    startPanX?: number
    startPanY?: number
  } | null>(null)

  const selectedNode = graph.nodes.find(n => n.id === selectedId) ?? null

  // Re-run simulation when graph changes and all nodes are at 0,0
  useEffect(() => {
    const needsLayout = initialGraph.nodes.every(n => n.x === 0 && n.y === 0)
    if (needsLayout && initialGraph.nodes.length > 0 && containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect()
      const laid = runSimulation(initialGraph.nodes, initialGraph.edges, width || 800, height || 600)
      setGraph({ ...initialGraph, nodes: laid })
    } else {
      setGraph(initialGraph)
    }
    setGraphName(initialGraph.name)
    setSelectedId(null)
  }, [initialGraph])

  // ─── Mouse handlers ──────────────────────────────────────────────────────────

  function svgCoords(e: React.MouseEvent | MouseEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left - transform.x) / transform.scale,
      y: (e.clientY - rect.top  - transform.y) / transform.scale,
    }
  }

  const onNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const n = graph.nodes.find(nd => nd.id === nodeId)!
    dragState.current = {
      type: 'node', nodeId,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startNodeX: n.x, startNodeY: n.y,
    }
    setSelectedId(nodeId)
  }, [graph.nodes])

  const onBgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== svgRef.current && (e.target as SVGElement).tagName !== 'rect') return
    setSelectedId(null)
    dragState.current = {
      type: 'pan',
      startMouseX: e.clientX, startMouseY: e.clientY,
      startPanX: transform.x, startPanY: transform.y,
    }
  }, [transform])

  const onMouseMove = useCallback((e: MouseEvent) => {
    const d = dragState.current
    if (!d) return
    const dx = e.clientX - d.startMouseX
    const dy = e.clientY - d.startMouseY

    if (d.type === 'pan') {
      setTransform(t => ({ ...t, x: (d.startPanX ?? 0) + dx, y: (d.startPanY ?? 0) + dy }))
    } else if (d.type === 'node' && d.nodeId) {
      setGraph(g => ({
        ...g,
        nodes: g.nodes.map(n =>
          n.id === d.nodeId
            ? { ...n, x: (d.startNodeX ?? 0) + dx / transform.scale, y: (d.startNodeY ?? 0) + dy / transform.scale }
            : n
        ),
      }))
    }
  }, [transform.scale])

  const onMouseUp = useCallback(() => { dragState.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = svgRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(t => {
      const newScale = Math.max(0.3, Math.min(3.0, t.scale * delta))
      const ratio = newScale / t.scale
      return {
        scale: newScale,
        x: mouseX - (mouseX - t.x) * ratio,
        y: mouseY - (mouseY - t.y) * ratio,
      }
    })
  }, [])

  // ─── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    try {
      const updated: NetworkGraph = { ...graph, name: graphName, updatedAt: new Date().toISOString() }
      await window.electronAPI.saveGraph(updated)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 2000)
    } catch { setSaveMsg('Error') } finally { setSaving(false) }
  }

  // ─── Export PNG ──────────────────────────────────────────────────────────────

  function handleExportPng() {
    if (!svgRef.current) return
    const svg = svgRef.current
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${graphName}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openCount = graph.nodes.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Top toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        WebkitAppRegion: 'drag' as React.CSSProperties['WebkitAppRegion'],
        minHeight: 50,
      }}>
        <div style={{ WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'], paddingLeft: 70 }}>
          <button
            onClick={onBack}
            style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              color: 'var(--text-dim)', borderRadius: 6, padding: '5px 10px', fontSize: 12,
            }}
          >← Library</button>
        </div>

        <div style={{ flex: 1, WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'] }}>
          {editingName ? (
            <input
              autoFocus
              value={graphName}
              onChange={e => setGraphName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingName(false) }}
              style={{
                background: 'var(--bg)', border: '1px solid var(--accent)',
                color: 'var(--text)', borderRadius: 4, padding: '3px 8px',
                fontSize: 14, fontWeight: 600, width: 240,
              }}
            />
          ) : (
            <span
              onClick={() => setEditingName(true)}
              style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', cursor: 'text' }}
              title="Click to rename"
            >{graphName}</span>
          )}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'],
        }}>
          <span style={{
            fontSize: 11, color: 'var(--text-dim)',
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '3px 8px',
          }}>{openCount} {openCount === 1 ? 'host' : 'hosts'}</span>
          {saveMsg && (
            <span style={{ fontSize: 11, color: saveMsg === 'Saved' ? 'var(--success)' : 'var(--error)' }}>
              {saveMsg}
            </span>
          )}
          <ToolbarBtn onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</ToolbarBtn>
          <ToolbarBtn onClick={handleExportPng}>Export SVG</ToolbarBtn>
        </div>
      </div>

      {/* Main area: sidebar + canvas */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left sidebar */}
        <div style={{
          width: 220, minWidth: 220,
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--panel)',
          overflow: 'hidden',
        }}>
          {/* Graph list */}
          <div style={{
            flex: selectedNode ? '0 0 auto' : '1 1 auto',
            overflowY: 'auto',
            borderBottom: selectedNode ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
              letterSpacing: '0.06em', padding: '10px 12px 6px',
            }}>SAVED GRAPHS</div>
            {savedGraphs.length === 0 && (
              <div style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                No saved graphs
              </div>
            )}
            {savedGraphs.map(g => (
              <div
                key={g.id}
                onClick={() => onSwitchGraph(g.id)}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: g.id === graph.id ? 'var(--accent)' : 'var(--text-dim)',
                  background: g.id === graph.id ? 'rgba(210,153,34,0.08)' : 'transparent',
                  borderLeft: g.id === graph.id ? '2px solid var(--accent)' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (g.id !== graph.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { if (g.id !== graph.id) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{g.nodeCount} hosts</div>
              </div>
            ))}
          </div>

          {/* Node detail */}
          {selectedNode && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <NodeDetail node={selectedNode} onClose={() => setSelectedId(null)} />
            </div>
          )}
        </div>

        {/* SVG Canvas */}
        <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {graph.nodes.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 12,
              color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: 40, opacity: 0.3 }}>⬡</div>
              <p style={{ fontSize: 13 }}>Empty graph — save to library or go back and import nodes</p>
            </div>
          ) : (
            <svg
              ref={svgRef}
              className="graph-canvas"
              width="100%"
              height="100%"
              onMouseDown={onBgMouseDown}
              onWheel={onWheel}
            >
              {/* Background rect to catch click events */}
              <rect width="100%" height="100%" fill="transparent" />

              <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
                {/* Edges */}
                {graph.edges.map(edge => {
                  const src = graph.nodes.find(n => n.id === edge.source)
                  const tgt = graph.nodes.find(n => n.id === edge.target)
                  if (!src || !tgt) return null
                  return (
                    <line
                      key={edge.id}
                      x1={src.x} y1={src.y}
                      x2={tgt.x} y2={tgt.y}
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                  )
                })}

                {/* Nodes */}
                {graph.nodes.map(node => {
                  const openPorts = node.ports.filter(p => p.state === 'open').length
                  const isSelected = node.id === selectedId
                  const r         = nodeRadius(openPorts)
                  const platform  = inferPlatform(node)
                  const fillColor = PLATFORM_COLORS[platform]
                  const selRing   = r + 6
                  return (
                    <g
                      key={node.id}
                      className="node-group"
                      transform={`translate(${node.x},${node.y})`}
                      onMouseDown={e => onNodeMouseDown(e, node.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {isSelected && (
                        <circle r={selRing} fill="rgba(210,153,34,0.1)" stroke="var(--accent)" strokeWidth={1.5} />
                      )}
                      <circle
                        r={r}
                        fill={fillColor}
                        stroke={isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}
                        strokeWidth={isSelected ? 2 : 1}
                        style={{ opacity: node.status === 'down' ? 0.4 : 1 }}
                      />
                      {/* Port count badge — always shown, white centered text */}
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={r >= 22 ? 11 : 10}
                        fontWeight={700}
                        fill="white"
                        style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                      >{openPorts}</text>
                      {/* Status cross for down nodes */}
                      {node.status === 'down' && (
                        <text
                          y={-r - 4}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={10}
                          fill="#8b949e"
                          style={{ pointerEvents: 'none' }}
                        >✕</text>
                      )}
                      {/* IP label */}
                      <text
                        y={r + 12}
                        textAnchor="middle"
                        fontSize={11}
                        fill="var(--text-dim)"
                        style={{ pointerEvents: 'none' }}
                      >{node.ip}</text>
                      {/* Hostname */}
                      <text
                        y={r + 23}
                        textAnchor="middle"
                        fontSize={9}
                        fill="var(--text-muted)"
                        style={{ pointerEvents: 'none' }}
                      >{node.hostname ?? ''}</text>
                    </g>
                  )
                })}
              </g>

              {/* ─── Legend (bottom-left, fixed in SVG viewport coords) ── */}
              <MapLegend />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolbarBtn({
  children, onClick, disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 10px', borderRadius: 6,
        background: 'var(--panel)', border: '1px solid var(--border)',
        color: 'var(--text)', fontSize: 12,
        opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >{children}</button>
  )
}

// ─── Map Legend ─────────────────────────────────────────────────────────────
// Rendered inside the SVG using foreignObject so we can use HTML/CSS.
function MapLegend() {
  const PAD    = 12
  const WIDTH  = 148
  const HEIGHT = 178

  return (
    <foreignObject x={PAD} y={`calc(100% - ${HEIGHT + PAD}px)`} width={WIDTH} height={HEIGHT}>
      <div
        style={{
          background: 'rgba(13,17,23,0.82)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '7px 9px',
          backdropFilter: 'blur(6px)',
          fontSize: 10,
          color: 'var(--text-dim)',
          lineHeight: 1.5,
          userSelect: 'none',
        }}
      >
        {/* Platform colours */}
        <div style={{ fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4, fontSize: 9, textTransform: 'uppercase' }}>Platform</div>
        {PLATFORM_LABELS.map(({ platform, label }) => (
          <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: PLATFORM_COLORS[platform],
              display: 'inline-block', flexShrink: 0,
            }} />
            <span>{label}</span>
          </div>
        ))}

        {/* Size scale */}
        <div style={{ fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-muted)', marginTop: 7, marginBottom: 4, fontSize: 9, textTransform: 'uppercase' }}>Ports (size)</div>
        {SIZE_SCALE.map(({ label, r }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <span style={{
              width: r * 0.5, height: r * 0.5,
              minWidth: r * 0.5,
              borderRadius: '50%',
              background: 'var(--text-dim)',
              display: 'inline-block',
            }} />
            <span>{label} ports</span>
          </div>
        ))}
      </div>
    </foreignObject>
  )
}
