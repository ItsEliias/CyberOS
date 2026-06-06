// NetLab — TopologyView.tsx

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNetLabStore } from '../store'
import type { TopologyNode, TopologyLink, Topology } from '@shared/types'

type DeviceType = TopologyNode['type']

const DEVICE_ICONS: Record<DeviceType, string> = {
  router: '🔷', switch: '🔶', firewall: '🔴', pc: '💻', cloud: '☁️', server: '🖥️',
}

const DEVICE_COLORS: Record<DeviceType, string> = {
  router: '#5ec4ff', switch: '#3fb950', firewall: '#f85149',
  pc: '#8b949e', cloud: '#d29922', server: '#b44fff',
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function makeNode(type: DeviceType, x: number, y: number): TopologyNode {
  return { id: generateId(), type, label: type.charAt(0).toUpperCase() + type.slice(1), x, y, interfaces: [] }
}

export default function TopologyView() {
  // Each useNetLabStore call must select a single value (or use shallow
  // equality) — passing an object literal selector caused a new object
  // identity on every store update, which forced this component to
  // re-render on every progress, labs, snippet, or activeView change.
  // During topology drag (which fires setNodes -> store-adjacent state
  // change -> store subscriber notify), this produced a re-render storm.
  const topologies       = useNetLabStore(s => s.topologies)
  const saveTopology     = useNetLabStore(s => s.saveTopology)
  const activeTopology   = useNetLabStore(s => s.activeTopology)
  const setActiveTopology = useNetLabStore(s => s.setActiveTopology)

  const [nodes, setNodes]         = useState<TopologyNode[]>(activeTopology?.nodes ?? [])
  const [links, setLinks]         = useState<TopologyLink[]>(activeTopology?.links ?? [])
  const [topoName, setTopoName]   = useState(activeTopology?.name ?? 'Untitled Topology')

  // Re-sync the local editor state whenever the store's activeTopology
  // changes (e.g. user opened a different saved topology). Previously the
  // useState initializers above ran exactly once on mount, so picking a
  // different topology from the library showed the old one until reload.
  useEffect(() => {
    setNodes(activeTopology?.nodes ?? [])
    setLinks(activeTopology?.links ?? [])
    setTopoName(activeTopology?.name ?? 'Untitled Topology')
  }, [activeTopology?.id])
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null)
  const [linkStart, setLinkStart] = useState<string | null>(null)
  const [placingType, setPlacingType] = useState<DeviceType | null>(null)
  const [dragging, setDragging]   = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const getSvgCoords = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  function handleCanvasClick(e: React.MouseEvent) {
    if (e.target !== svgRef.current) return
    if (placingType) {
      const { x, y } = getSvgCoords(e)
      setNodes(prev => [...prev, makeNode(placingType, x, y)])
      setPlacingType(null)
    } else {
      setSelectedNode(null)
      setLinkStart(null)
    }
  }

  function handleNodeClick(node: TopologyNode, e: React.MouseEvent) {
    e.stopPropagation()
    if (linkStart) {
      if (linkStart !== node.id) {
        const link: TopologyLink = { id: generateId(), sourceId: linkStart, targetId: node.id }
        setLinks(prev => [...prev, link])
      }
      setLinkStart(null)
    } else {
      setSelectedNode(node)
    }
  }

  function handleNodeMouseDown(node: TopologyNode, e: React.MouseEvent) {
    e.stopPropagation()
    if (linkStart) return
    setDragging(node.id)
    setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return
    setNodes(prev => prev.map(n => n.id === dragging
      ? { ...n, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
      : n))
  }

  function handleMouseUp() { setDragging(null) }

  function updateNodeProp(id: string, key: keyof TopologyNode, value: unknown) {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, [key]: value } : n))
    if (selectedNode?.id === id) setSelectedNode(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function deleteNode(id: string) {
    setNodes(prev => prev.filter(n => n.id !== id))
    setLinks(prev => prev.filter(l => l.sourceId !== id && l.targetId !== id))
    setSelectedNode(null)
  }

  function save() {
    const topology: Topology = {
      id: activeTopology?.id ?? generateId(),
      name: topoName,
      nodes,
      links,
    }
    saveTopology(topology)
    setActiveTopology(topology)
  }

  function exportToNetworkMap() {
    window.electronAPI.ipc.sendEcosystemEvent('netlab:topology-export', {
      name: topoName, nodes: nodes.map(n => ({ id: n.id, label: n.label, type: n.type })),
    })
  }

  const DEVICE_TYPES: DeviceType[] = ['router', 'switch', 'firewall', 'pc', 'cloud', 'server']

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left toolbar */}
      <div className="w-14 flex flex-col items-center pt-4 gap-3 border-r border-border-subtle shrink-0"
        style={{ background: '#0a0a0f' }}>
        {DEVICE_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setPlacingType(t => t === type ? null : type)}
            title={type}
            className="w-9 h-9 rounded flex items-center justify-center text-lg transition-colors"
            style={placingType === type
              ? { background: 'rgba(94,196,255,0.15)', border: '1px solid #5ec4ff' }
              : { border: '1px solid #2a3347' }}
          >
            {DEVICE_ICONS[type]}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setLinkStart(l => l ? null : 'pending')}
          title="Draw Link"
          className="w-9 h-9 rounded flex items-center justify-center text-sm transition-colors mb-4"
          style={linkStart !== null
            ? { background: 'rgba(94,196,255,0.15)', border: '1px solid #5ec4ff', color: '#5ec4ff' }
            : { border: '1px solid #2a3347', color: '#8b949e' }}
        >
          ─
        </button>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {placingType && (
          <div className="absolute top-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
            <span className="text-xs px-3 py-1.5 rounded border"
              style={{ background: 'rgba(94,196,255,0.1)', borderColor: '#5ec4ff', color: '#5ec4ff' }}>
              Click canvas to place {placingType}
            </span>
          </div>
        )}
        {linkStart === 'pending' && (
          <div className="absolute top-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
            <span className="text-xs px-3 py-1.5 rounded border"
              style={{ background: 'rgba(94,196,255,0.1)', borderColor: '#5ec4ff', color: '#5ec4ff' }}>
              Click source device, then target device
            </span>
          </div>
        )}
        <svg
          ref={svgRef}
          className="w-full h-full cursor-crosshair select-none"
          style={{ background: '#0a0a0f' }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Links */}
          {links.map(link => {
            const src = nodes.find(n => n.id === link.sourceId)
            const tgt = nodes.find(n => n.id === link.targetId)
            if (!src || !tgt) return null
            const mx = (src.x + tgt.x) / 2
            const my = (src.y + tgt.y) / 2
            return (
              <g key={link.id}>
                <line
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke="#2a3347" strokeWidth={2}
                />
                {link.protocol && (
                  <text x={mx} y={my - 4} textAnchor="middle" fill="#8b949e" fontSize={10} fontFamily="JetBrains Mono">
                    {link.protocol}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isSelected = selectedNode?.id === node.id
            const isLinkSrc  = linkStart === node.id
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onClick={(e) => handleNodeClick(node, e)}
                onMouseDown={(e) => handleNodeMouseDown(node, e)}
                style={{ cursor: dragging === node.id ? 'grabbing' : 'grab' }}
              >
                <circle
                  r={22}
                  fill={isSelected ? 'rgba(94,196,255,0.15)' : '#161b27'}
                  stroke={isLinkSrc ? '#5ec4ff' : isSelected ? '#5ec4ff' : DEVICE_COLORS[node.type]}
                  strokeWidth={isSelected ? 2 : 1.5}
                />
                <text textAnchor="middle" dominantBaseline="central" fontSize={16}>{DEVICE_ICONS[node.type]}</text>
                <text y={32} textAnchor="middle" fill="#e6edf3" fontSize={11} fontFamily="JetBrains Mono">
                  {node.label}
                </text>
                {node.interfaces[0]?.ip && (
                  <text y={44} textAnchor="middle" fill="#5ec4ff" fontSize={9} fontFamily="JetBrains Mono">
                    {node.interfaces[0].ip}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Right config panel */}
      <div className="w-64 shrink-0 border-l border-border-subtle flex flex-col"
        style={{ background: '#0f1117' }}>
        {/* Topology name + save */}
        <div className="p-3 border-b border-border-subtle">
          <input
            value={topoName}
            onChange={e => setTopoName(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-sm bg-bg-elevated border border-border-default text-text-primary focus:outline-none focus:border-[#5ec4ff] mb-2"
          />
          <div className="flex gap-2">
            <motion.button onClick={save}
              className="flex-1 py-1.5 rounded text-xs font-semibold transition-colors"
              style={{ background: '#5ec4ff', color: '#0a0a0f' }}
              whileHover={{ opacity: 0.85 }}>
              Save
            </motion.button>
            <motion.button onClick={exportToNetworkMap}
              className="flex-1 py-1.5 rounded text-xs font-medium transition-colors"
              style={{ background: '#161b27', color: '#8b949e', border: '1px solid #2a3347' }}
              whileHover={{ color: '#5ec4ff' }}>
              Export
            </motion.button>
          </div>
        </div>

        {selectedNode ? (
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Device Config</p>
              <button onClick={() => deleteNode(selectedNode.id)}
                className="text-2xs text-danger hover:opacity-75">Delete</button>
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-2xs text-text-muted mb-1 block">Hostname</label>
                <input
                  value={selectedNode.label}
                  onChange={e => updateNodeProp(selectedNode.id, 'label', e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-sm bg-bg-elevated border border-border-default text-text-primary focus:outline-none focus:border-[#5ec4ff]"
                />
              </div>

              <div>
                <label className="text-2xs text-text-muted mb-1 block">Interface / IP</label>
                <input
                  placeholder="e.g. Gi0/0"
                  value={selectedNode.interfaces[0]?.name ?? ''}
                  onChange={e => updateNodeProp(selectedNode.id, 'interfaces', [
                    { ...selectedNode.interfaces[0], name: e.target.value },
                    ...selectedNode.interfaces.slice(1),
                  ])}
                  className="w-full px-2 py-1.5 rounded text-sm bg-bg-elevated border border-border-default text-text-primary focus:outline-none focus:border-[#5ec4ff] mb-1"
                />
                <input
                  placeholder="IP address"
                  value={selectedNode.interfaces[0]?.ip ?? ''}
                  onChange={e => updateNodeProp(selectedNode.id, 'interfaces', [
                    { ...selectedNode.interfaces[0], ip: e.target.value },
                    ...selectedNode.interfaces.slice(1),
                  ])}
                  className="w-full px-2 py-1.5 rounded text-sm font-mono-code bg-bg-elevated border border-border-default text-text-primary focus:outline-none focus:border-[#5ec4ff]"
                />
              </div>

              <div>
                <label className="text-2xs text-text-muted mb-1 block">Config</label>
                <textarea
                  value={selectedNode.config ?? ''}
                  onChange={e => updateNodeProp(selectedNode.id, 'config', e.target.value)}
                  placeholder="IOS config snippet..."
                  rows={6}
                  className="w-full px-2 py-1.5 rounded text-xs font-mono-code bg-bg-elevated border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-[#5ec4ff] resize-none"
                />
              </div>

              <button
                onClick={() => setLinkStart(selectedNode.id)}
                className="w-full py-1.5 rounded text-xs transition-colors"
                style={linkStart === selectedNode.id
                  ? { background: 'rgba(94,196,255,0.1)', color: '#5ec4ff', border: '1px solid #5ec4ff' }
                  : { background: '#161b27', color: '#8b949e', border: '1px solid #2a3347' }}>
                {linkStart === selectedNode.id ? 'Click target...' : 'Draw link from here'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-3">
            <p className="text-xs text-text-muted">Select a device to configure it.</p>
            {topologies.length > 0 && (
              <div className="mt-4">
                <p className="text-2xs text-text-muted uppercase tracking-wider mb-2">Saved Topologies</p>
                {topologies.map(t => (
                  <button key={t.id}
                    onClick={() => { setNodes(t.nodes); setLinks(t.links); setTopoName(t.name); setActiveTopology(t) }}
                    className="w-full text-left text-xs py-1.5 px-2 rounded hover:bg-bg-elevated transition-colors text-text-secondary">
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
