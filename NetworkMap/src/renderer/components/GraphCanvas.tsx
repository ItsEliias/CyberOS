// NetworkMap — GraphCanvas.tsx  (orchestrates all graph features)
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type { NetworkGraph, NetworkNode, GraphSummary, ScanRecord, LayoutMode, NodeSchedule } from '@shared/types'
import { runSimulation } from '../lib/simulation'
import { inferEdges } from '../lib/edgeInference'
import { applyLayout } from '../lib/layouts'
import { findShortestPath, pathEdgeIds, calcHealthScore } from '../lib/graphAlgorithms'
import { loadSettings } from './SettingsView'
import GraphToolbar from './GraphToolbar'
import GraphSvg, { type LayerMode } from './GraphSvg'
import MiniMap from './MiniMap'
import FilterPanel, { FilterState, EMPTY_FILTERS, applyFilters, activeFilterCount } from './FilterPanel'
import DiffPanel, { DiffResult, computeDiff } from './DiffPanel'
import NodeContextMenu from './NodeContextMenu'
import NodeDetail from './NodeDetail'
import { GraphLegend, CanvasEmptyState } from './GraphCanvasExtras'

interface Transform { x: number; y: number; scale: number }
interface ContextMenu { nodeId: string; x: number; y: number }

interface Props {
  graph: NetworkGraph
  savedGraphs: GraphSummary[]
  allScans: ScanRecord[]
  onBack: () => void
  onSwitchGraph: (id: string) => void
}

function buildGraph(g: NetworkGraph, showInferred: boolean): NetworkGraph {
  const needsLayout = g.nodes.length > 0 && g.nodes.every(n => n.x === 0 && n.y === 0)
  let edges = g.edges.length > 0 ? g.edges : inferEdges(g.nodes)
  if (!showInferred) edges = edges.filter(e => e.type !== 'inferred')
  if (needsLayout) return { ...g, nodes: runSimulation(g.nodes, edges, 900, 650), edges }
  return { ...g, edges }
}

export default function GraphCanvas({ graph: initialGraph, savedGraphs, allScans, onBack, onSwitchGraph }: Props) {
  const settings = useMemo(() => loadSettings(), [])

  const [graph, setGraph]           = useState<NetworkGraph>(() => buildGraph(initialGraph, settings.showInferredEdges))
  const [graphName, setGraphName]   = useState(initialGraph.name)
  const [editingName, setEditingName] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saveMsg, setSaveMsg]       = useState('')

  // Feature toggles
  const [layoutMode, setLayoutMode]           = useState<LayoutMode>('force')
  const [showSubnets, setShowSubnets]         = useState(false)
  const [showVulnOverlay, setShowVulnOverlay] = useState(false)
  const [showHeatmap, setShowHeatmap]         = useState(false)
  const [compareMode, setCompareMode]         = useState(false)
  const [filterOpen, setFilterOpen]           = useState(false)
  const [filters, setFilters]                 = useState<FilterState>(EMPTY_FILTERS)
  const [searchQuery, setSearchQuery]         = useState('')
  const [selectedId, setSelectedId]           = useState<string | null>(null)
  const [ctxMenu, setCtxMenu]                 = useState<ContextMenu | null>(null)
  const [pathStart, setPathStart]             = useState<string | null>(null)
  const [tracedPath, setTracedPath]           = useState<string[] | null>(null)
  const [diffBase, setDiffBase]               = useState(0)
  const [diffLatest, setDiffLatest]           = useState(1)
  const [diffResult, setDiffResult]           = useState<DiffResult | null>(null)
  const [layerMode, setLayerMode]             = useState<LayerMode>('all')

  const svgRef       = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform]   = useState<Transform>({ x: 0, y: 0, scale: 1 })
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 650 })
  const zoomLevel = Math.round(transform.scale * 100)

  const dragState = useRef<{
    type: 'node' | 'pan'; nodeId?: string
    startMouseX: number; startMouseY: number
    startNodeX?: number; startNodeY?: number
    startPanX?: number; startPanY?: number
    moved?: boolean
  } | null>(null)

  // Track container size for MiniMap
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) setCanvasSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Re-init on graph switch
  useEffect(() => {
    setGraph(buildGraph(initialGraph, settings.showInferredEdges))
    setGraphName(initialGraph.name)
    setSelectedId(null)
    setTransform({ x: 0, y: 0, scale: 1 })
    setTracedPath(null); setPathStart(null)
  }, [initialGraph]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial layout when container has dimensions
  useEffect(() => {
    if (!containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    if (!width || !height) return
    setGraph(prev => {
      if (!prev.nodes.every(n => n.x === 0 && n.y === 0)) return prev
      return { ...prev, nodes: runSimulation(prev.nodes, prev.edges, width, height) }
    })
  }, [])

  // Diff computation
  useEffect(() => {
    if (!compareMode || allScans.length < 2) { setDiffResult(null); return }
    setDiffResult(computeDiff(allScans[diffBase]?.nodes ?? [], allScans[diffLatest]?.nodes ?? []))
  }, [compareMode, diffBase, diffLatest, allScans])

  // Listen for palette-dispatched "clear all filters"
  useEffect(() => {
    function onClear() { setFilters(EMPTY_FILTERS) }
    window.addEventListener('networkmap:clear-filters', onClear)
    return () => window.removeEventListener('networkmap:clear-filters', onClear)
  }, [])

  // ─── Derived state ─────────────────────────────────────────────────────────
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    return new Set(graph.nodes.filter(n =>
      n.ip.includes(q) || (n.hostname ?? '').toLowerCase().includes(q) ||
      n.ports.some(p => String(p.port).includes(q) || (p.service ?? '').toLowerCase().includes(q))
    ).map(n => n.id))
  }, [searchQuery, graph.nodes])

  const visibleSet = useMemo(() =>
    searchMatches ?? applyFilters(graph.nodes, filters)
  , [searchMatches, graph.nodes, filters])

  const pathEdgeSet = useMemo(() =>
    tracedPath ? pathEdgeIds(tracedPath, graph.edges) : new Set<string>()
  , [tracedPath, graph.edges])

  const healthScore = useMemo(() => {
    if (!graph.nodes.length) return null
    return calcHealthScore(graph.nodes, graph.nodes.flatMap(n => n.vulns ?? []))
  }, [graph.nodes])

  const neighborCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of graph.edges) {
      const src = typeof e.source === 'string' ? e.source : (e.source as NetworkNode).id
      const tgt = typeof e.target === 'string' ? e.target : (e.target as NetworkNode).id
      m.set(src, (m.get(src) ?? 0) + 1)
      m.set(tgt, (m.get(tgt) ?? 0) + 1)
    }
    return m
  }, [graph.edges])

  // ─── Mouse handlers ────────────────────────────────────────────────────────
  const onNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    if (e.button === 2) return
    const n = graph.nodes.find(nd => nd.id === nodeId)!
    dragState.current = { type: 'node', nodeId, startMouseX: e.clientX, startMouseY: e.clientY, startNodeX: n.x, startNodeY: n.y, moved: false }
  }, [graph.nodes])

  const onNodeMouseUp = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (dragState.current?.moved) { dragState.current = null; return }
    dragState.current = null
    if (e.shiftKey) {
      if (!pathStart) { setPathStart(nodeId); setTracedPath(null) }
      else if (pathStart === nodeId) { setPathStart(null); setTracedPath(null) }
      else {
        setTracedPath(findShortestPath(graph.nodes, graph.edges, pathStart, nodeId))
        setPathStart(null)
      }
    } else {
      setSelectedId(prev => prev === nodeId ? null : nodeId)
      setPathStart(null)
    }
  }, [pathStart, graph.nodes, graph.edges])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault(); e.stopPropagation()
    setCtxMenu({ nodeId, x: e.clientX, y: e.clientY })
  }, [])

  const onBgMouseDown = useCallback((e: React.MouseEvent) => {
    const el = e.target as Element
    if (el.tagName !== 'svg' && el.tagName !== 'rect') return
    setSelectedId(null); setCtxMenu(null)
    dragState.current = { type: 'pan', startMouseX: e.clientX, startMouseY: e.clientY, startPanX: transform.x, startPanY: transform.y, moved: false }
  }, [transform])

  const onMouseMove = useCallback((e: MouseEvent) => {
    const d = dragState.current; if (!d) return
    const dx = e.clientX - d.startMouseX, dy = e.clientY - d.startMouseY
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true
    if (d.type === 'pan') {
      setTransform(t => ({ ...t, x: (d.startPanX ?? 0) + dx, y: (d.startPanY ?? 0) + dy }))
    } else if (d.type === 'node' && d.nodeId) {
      setGraph(g => ({ ...g, nodes: g.nodes.map(n => n.id !== d.nodeId ? n : { ...n, x: (d.startNodeX ?? 0) + dx / transform.scale, y: (d.startNodeY ?? 0) + dy / transform.scale, fx: (d.startNodeX ?? 0) + dx / transform.scale, fy: (d.startNodeY ?? 0) + dy / transform.scale }) }))
    }
  }, [transform.scale])

  const onMouseUp = useCallback(() => { dragState.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [onMouseMove, onMouseUp])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = svgRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const d = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(t => {
      const ns = Math.max(0.3, Math.min(3.0, t.scale * d))
      const r = ns / t.scale
      return { scale: ns, x: mx - (mx - t.x) * r, y: my - (my - t.y) * r }
    })
  }, [])

  // ─── Feature actions ───────────────────────────────────────────────────────
  function handleLayoutChange(mode: LayoutMode) {
    setLayoutMode(mode)
    const { w, h } = canvasSize
    setGraph(g => ({ ...g, nodes: applyLayout(g.nodes, g.edges, mode, w, h) }))
  }

  function zoomIn()    { setTransform(t => ({ ...t, scale: Math.min(3, t.scale * 1.2) })) }
  function zoomOut()   { setTransform(t => ({ ...t, scale: Math.max(0.3, t.scale / 1.2) })) }
  function resetView() { setTransform({ x: 0, y: 0, scale: 1 }) }
  function fitView() {
    if (!containerRef.current || !graph.nodes.length) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    const xs = graph.nodes.map(n => n.x), ys = graph.nodes.map(n => n.y)
    const scale = Math.max(0.3, Math.min(3, Math.min((width - 80) / (Math.max(...xs) - Math.min(...xs) || 1), (height - 80) / (Math.max(...ys) - Math.min(...ys) || 1))))
    setTransform({ scale, x: width / 2 - ((Math.min(...xs) + Math.max(...xs)) / 2) * scale, y: height / 2 - ((Math.min(...ys) + Math.max(...ys)) / 2) * scale })
  }

  function handleSearchEnter() {
    if (!searchMatches?.size) return
    const first = graph.nodes.find(n => searchMatches.has(n.id))
    if (!first || !containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    setTransform(t => ({ ...t, x: width / 2 - first.x * t.scale, y: height / 2 - first.y * t.scale }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await window.electronAPI.saveGraph({ ...graph, name: graphName, updatedAt: new Date().toISOString() })
      setSaveMsg('Saved'); setTimeout(() => setSaveMsg(''), 2000)
    } catch { setSaveMsg('Error') } finally { setSaving(false) }
  }

  async function handleExport(format: 'svg' | 'png' | 'json') {
    if (format === 'json') {
      await window.electronAPI.exportJson(JSON.stringify(graph, null, 2), graphName)
    } else if (format === 'svg' && svgRef.current) {
      const clone = svgRef.current.cloneNode(true) as SVGSVGElement
      clone.querySelectorAll('foreignObject').forEach(el => el.remove())
      await window.electronAPI.exportSvg('<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone), graphName)
    } else if (format === 'png' && svgRef.current) {
      const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svgRef.current))))
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = svgRef.current!.clientWidth; c.height = svgRef.current!.clientHeight
        c.getContext('2d')!.drawImage(img, 0, 0)
        window.electronAPI.exportPng(c.toDataURL('image/png'), graphName)
      }
      img.src = url
    }
  }

  function handleAnnotate(nodeId: string, text: string) {
    setGraph(g => ({ ...g, nodes: g.nodes.map(n => n.id === nodeId ? { ...n, annotation: text || undefined } : n) }))
  }

  function handleSchedule(nodeId: string, schedule: NodeSchedule) {
    setGraph(g => ({ ...g, nodes: g.nodes.map(n => n.id === nodeId ? { ...n, schedule } : n) }))
  }

  const selectedNode = graph.nodes.find(n => n.id === selectedId) ?? null
  const ctxNode = ctxMenu ? graph.nodes.find(n => n.id === ctxMenu.nodeId) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <GraphToolbar
        graphName={graphName} editingName={editingName}
        nodeCount={graph.nodes.length} edgeCount={graph.edges.length}
        saveMsg={saveMsg} saving={saving}
        layoutMode={layoutMode} showSubnets={showSubnets}
        showVulnOverlay={showVulnOverlay} showHeatmap={showHeatmap}
        compareMode={compareMode} filterCount={activeFilterCount(filters)}
        filterOpen={filterOpen} searchQuery={searchQuery} healthScore={healthScore}
        onBack={onBack}
        onNameEdit={() => setEditingName(true)}
        onNameChange={setGraphName}
        onNameBlur={() => setEditingName(false)}
        onNameKeyDown={e => { if (e.key === 'Enter') setEditingName(false) }}
        onSave={handleSave}
        onLayoutChange={handleLayoutChange}
        onToggleSubnets={() => setShowSubnets(s => !s)}
        onToggleVulnOverlay={() => setShowVulnOverlay(v => !v)}
        onToggleHeatmap={() => setShowHeatmap(h => !h)}
        onToggleCompare={() => setCompareMode(m => !m)}
        onToggleFilter={() => setFilterOpen(f => !f)}
        onSearchChange={setSearchQuery}
        onSearchEnter={handleSearchEnter}
        onExport={handleExport}
        layerMode={layerMode}
        onLayerChange={setLayerMode}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ width: 180, minWidth: 180, borderRight: '1px solid rgba(42,51,71,0.5)', display: 'flex', flexDirection: 'column', background: 'rgba(10,11,18,0.95)' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(42,51,71,0.4)' }}>
            <div style={secLabel}>Legend</div>
            {[
              { color: '#3fb950', label: '1–2 ports' },
              { color: '#d29922', label: '3–5 ports' },
              { color: '#f85149', label: '6+ ports'  },
              { color: '#484f58', label: 'Down'       },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
                  boxShadow: `0 0 5px ${color}60`,
                }} />
                <span style={{ fontSize: 10, color: '#e2e8f0' }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 12px 4px' }}><div style={secLabel}>Graphs</div></div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {savedGraphs.map(g => (
              <div
                key={g.id}
                onClick={() => onSwitchGraph(g.id)}
                style={{
                  padding: '6px 12px', cursor: 'pointer', fontSize: 11,
                  color: g.id === graph.id ? '#d29922' : '#e2e8f0',
                  background: g.id === graph.id ? 'rgba(210,153,34,0.07)' : 'transparent',
                  borderLeft: g.id === graph.id ? '2px solid #d29922' : '2px solid transparent',
                  transition: 'all 150ms var(--ease)',
                }}
                onMouseEnter={e => { if (g.id !== graph.id) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0' } }}
                onMouseLeave={e => { if (g.id !== graph.id) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0' } }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: g.id === graph.id ? 600 : 400, fontSize: 12 }}>{g.name}</div>
                <div style={{ fontSize: 9, color: '#8b949e', marginTop: 1, fontFamily: 'var(--font-mono)' }}>{g.nodeCount} nodes</div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas area */}
        <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {graph.nodes.length === 0 ? (
            <CanvasEmptyState savedCount={savedGraphs.length} />
          ) : (
            <>
              <GraphSvg
                ref={svgRef}
                graph={graph} transform={transform}
                visibleSet={visibleSet} searchMatches={searchMatches}
                pathEdgeSet={pathEdgeSet} tracedPath={tracedPath} pathStart={pathStart}
                selectedId={selectedId} showSubnets={showSubnets}
                showVulnOverlay={showVulnOverlay} showHeatmap={showHeatmap}
                neighborCounts={neighborCounts} nodeLabel={settings.nodeLabel}
                onBgMouseDown={onBgMouseDown} onWheel={onWheel}
                onNodeMouseDown={onNodeMouseDown} onNodeMouseUp={onNodeMouseUp}
                onNodeContextMenu={onNodeContextMenu}
                layerMode={layerMode}
                compareMode={compareMode}
                diffAdded={diffResult?.added ?? new Set()}
                diffRemoved={diffResult?.removed ?? new Set()}
                diffChanged={diffResult?.changed ?? new Set()}
              />

              {/* Zoom controls */}
              <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 3, alignItems: 'center' }}>
                {([{l:'+', title:'Zoom in', f:zoomIn},{l:'−', title:'Zoom out', f:zoomOut},{l:'↺', title:'Reset', f:resetView},{l:'⊞', title:'Fit all nodes', f:fitView}] as const).map(b => (
                  <button
                    key={b.l}
                    onClick={b.f}
                    title={b.title}
                    style={zoomBtn}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(210,153,34,0.15)'
                      ;(e.currentTarget as HTMLElement).style.color = '#d29922'
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(210,153,34,0.4)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(10,10,15,0.92)'
                      ;(e.currentTarget as HTMLElement).style.color = '#e2e8f0'
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.75)'
                    }}
                  >{b.l}</button>
                ))}
                {pathStart && (
                  <span style={{
                    padding: '5px 10px', fontSize: 11, color: '#58a6ff',
                    background: 'rgba(13,14,24,0.95)', border: '1px solid rgba(88,166,255,0.3)',
                    borderRadius: 7, animation: 'badgePop 0.2s var(--ease)',
                  }}>Shift+click target</span>
                )}
              </div>

              <GraphLegend />

              {/* Selection count badge */}
              {selectedId && (
                <div
                  style={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 22, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 12px', borderRadius: 20,
                    background: 'rgba(10,10,15,0.92)',
                    border: '1px solid rgba(210,153,34,0.35)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    fontSize: 11, color: '#d29922', fontWeight: 600,
                    backdropFilter: 'blur(8px)',
                    animation: 'badgePop 0.2s var(--ease)',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d29922', boxShadow: '0 0 6px rgba(210,153,34,0.6)', flexShrink: 0 }} />
                  1 node selected
                </div>
              )}

              {/* Zoom controls overlay — bottom-right, above MiniMap */}
              <div style={{ position: 'absolute', bottom: 220, right: 16, zIndex: 21, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                {([{icon:'+',title:'Zoom in',fn:zoomIn},{icon:'−',title:'Zoom out',fn:zoomOut},{icon:'⊞',title:'Fit all',fn:fitView}] as const).map(b => (
                  <button key={b.title} onClick={b.fn} title={b.title} style={zoomOverlayBtn}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(210,153,34,0.15)'; el.style.borderColor='rgba(210,153,34,0.4)'; el.style.color='#d29922' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(10,10,15,0.88)'; el.style.borderColor='rgba(42,51,71,0.7)'; el.style.color='#e2e8f0' }}
                  >{b.icon}</button>
                ))}
                <div style={zoomLevelBadge}>{zoomLevel}%</div>
              </div>

              <MiniMap nodes={graph.nodes} transform={transform} canvasW={canvasSize.w} canvasH={canvasSize.h} onPan={(x, y) => setTransform(t => ({ ...t, x, y }))} />

              {filterOpen && <FilterPanel nodes={graph.nodes} filters={filters} onChange={setFilters} onClose={() => setFilterOpen(false)} />}

              {compareMode && allScans.length >= 2 && (
                <DiffPanel scans={allScans} diff={diffResult} selectedBase={diffBase} selectedLatest={diffLatest} onSelectBase={setDiffBase} onSelectLatest={setDiffLatest} onClose={() => setCompareMode(false)} />
              )}

              {selectedNode && (
                <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 320, background: 'var(--panel)', borderLeft: '1px solid var(--border)', overflowY: 'auto', zIndex: 30, animation: 'slideInRight 0.25s ease-out', display: 'flex', flexDirection: 'column' }}>
                  <NodeDetail node={selectedNode} onClose={() => setSelectedId(null)} allScans={allScans} onAnnotate={text => handleAnnotate(selectedNode.id, text)} searchQuery={searchQuery} />
                </div>
              )}

              {ctxMenu && ctxNode && (
                <NodeContextMenu node={ctxNode} x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)} onAnnotate={handleAnnotate} onSchedule={handleSchedule} onOpenInTerminalLink={ip => window.electronAPI.setTerminalLinkTarget(ip)} />
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '4px 16px', borderTop: '1px solid rgba(42,51,71,0.4)', fontSize: 10, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(7,8,15,0.6)' }}>
        <span style={{ color: 'rgba(210,153,34,0.6)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 9 }}>NetworkMap</span>
        <span style={{ color: 'rgba(42,51,71,0.7)' }}>·</span>
        <span style={{ color: '#e2e8f0', fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{graphName}</span>
        <span style={{ color: 'rgba(42,51,71,0.7)' }}>·</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: '#d29922' }}>{graph.nodes.length}</span>
          <span style={{ color: '#4a5568', margin: '0 2px' }}>n</span>
          <span style={{ color: 'rgba(42,51,71,0.7)', margin: '0 2px' }}>·</span>
          <span style={{ color: '#8b949e' }}>{graph.edges.length}</span>
          <span style={{ color: '#4a5568', margin: '0 2px' }}>e</span>
        </span>
        {tracedPath && <><span style={{ color: 'rgba(42,51,71,0.7)' }}>·</span><span className="badge-animate" style={{ color: '#d29922', fontWeight: 600 }}>{tracedPath.length - 1} hops</span></>}
      </div>
    </div>
  )
}

const secLabel: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, color: '#8b949e', letterSpacing: '0.07em', marginBottom: 6, textTransform: 'uppercase',
}
const zoomBtn: React.CSSProperties = {
  padding: '5px 9px', background: 'rgba(10,10,15,0.92)', border: '1px solid rgba(42,51,71,0.75)',
  borderRadius: 7, color: '#e2e8f0', fontSize: 12, transition: 'all 150ms var(--ease)',
  backdropFilter: 'blur(8px)',
}
const zoomOverlayBtn: React.CSSProperties = {
  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(10,10,15,0.88)', border: '1px solid rgba(42,51,71,0.7)', borderRadius: 7,
  color: '#e2e8f0', fontSize: 13, cursor: 'pointer', backdropFilter: 'blur(8px)',
  transition: 'all 150ms var(--ease)',
}
const zoomLevelBadge: React.CSSProperties = {
  marginTop: 2, padding: '3px 5px', minWidth: 28, textAlign: 'center',
  background: 'rgba(10,10,15,0.88)', border: '1px solid rgba(42,51,71,0.5)',
  borderRadius: 6, fontSize: 9, fontFamily: 'var(--font-mono)', backdropFilter: 'blur(8px)',
  color: 'rgba(210,153,34,0.8)', fontWeight: 600, letterSpacing: '0.04em',
}
