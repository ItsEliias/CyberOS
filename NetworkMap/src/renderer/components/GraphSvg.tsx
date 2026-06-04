// NetworkMap — GraphSvg.tsx  (SVG rendering layer extracted from GraphCanvas)
import { forwardRef } from 'react'
import type { NetworkGraph, NetworkNode, RoutingProtocol } from '@shared/types'
import SubnetBubbles from './SubnetBubbles'

export type LayerMode = 'all' | 2 | 3 | 4

interface Props {
  graph: NetworkGraph
  transform: { x: number; y: number; scale: number }
  visibleSet: Set<string>
  searchMatches: Set<string> | null
  pathEdgeSet: Set<string>
  tracedPath: string[] | null
  pathStart: string | null
  selectedId: string | null
  showSubnets: boolean
  showVulnOverlay: boolean
  showHeatmap: boolean
  neighborCounts: Map<string, number>
  nodeLabel: 'ip' | 'ip-hostname' | 'hostname'
  layerMode?: LayerMode
  onBgMouseDown: (e: React.MouseEvent) => void
  onWheel: (e: React.WheelEvent) => void
  onNodeMouseDown: (e: React.MouseEvent, id: string) => void
  onNodeMouseUp: (e: React.MouseEvent, id: string) => void
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void
  compareMode: boolean
  diffAdded: Set<string>
  diffRemoved: Set<string>
  diffChanged: Set<string>
}

/** Color an edge by routing protocol — Feature 19 */
function protocolColor(protocol: RoutingProtocol | undefined): string {
  if (!protocol) return 'var(--border)'
  if (protocol === 'OSPF')   return '#4a9eff'
  if (protocol === 'EIGRP')  return '#3fb950'
  if (protocol === 'BGP')    return '#ff8800'
  if (protocol === 'VLAN')   return '#a371f7'
  return 'var(--border)'
}

function nodeBaseColor(openPortCount: number): string {
  if (openPortCount === 0)  return '#484f58'
  if (openPortCount <= 2)   return '#3fb950'
  if (openPortCount <= 5)   return '#d29922'
  return '#f85149'
}

function resolveNodeColor(node: NetworkNode, showVuln: boolean, compareMode: boolean, added: Set<string>, removed: Set<string>, changed: Set<string>): string {
  if (showVuln && node.vulns && node.vulns.length > 0) {
    const s = node.vulns[0].severity
    if (s === 'critical') return '#ff4444'
    if (s === 'high')     return '#ff8800'
    if (s === 'medium')   return '#ffcc00'
    return '#44cc44'
  }
  if (compareMode) {
    if (added.has(node.id))   return '#3fb950'
    if (removed.has(node.id)) return '#f85149'
    if (changed.has(node.id)) return '#d29922'
  }
  return nodeBaseColor(node.openPortCount)
}

function nodeRadius(n: number): number {
  if (n === 0)  return 12
  if (n <= 2)   return 16
  if (n <= 5)   return 20
  return 28
}

function resolveLabel(node: NetworkNode, mode: 'ip' | 'ip-hostname' | 'hostname'): { primary: string; secondary?: string } {
  if (mode === 'ip')        return { primary: node.ip }
  if (mode === 'hostname')  return { primary: node.hostname ?? node.ip }
  return { primary: node.ip, secondary: node.hostname }
}

function osEmoji(os: string | undefined): string {
  if (!os) return ''
  const l = os.toLowerCase()
  if (l.includes('windows'))                          return '🪟'
  if (l.includes('linux') || l.includes('ubuntu'))    return '🐧'
  if (l.includes('mac') || l.includes('darwin'))      return '🍎'
  if (l.includes('cisco') || l.includes('router'))    return '📡'
  return ''
}

// eslint-disable-next-line react/display-name
const GraphSvg = forwardRef<SVGSVGElement, Props>((props, ref) => {
  const {
    graph, transform, visibleSet, searchMatches, pathEdgeSet, tracedPath, pathStart,
    selectedId, showSubnets, showVulnOverlay, showHeatmap, neighborCounts, nodeLabel,
    layerMode = 'all',
    onBgMouseDown, onWheel, onNodeMouseDown, onNodeMouseUp, onNodeContextMenu,
    compareMode, diffAdded, diffRemoved, diffChanged,
  } = props

  // Feature 20: filter edges by layer
  const edgesToRender = layerMode === 'all'
    ? graph.edges
    : graph.edges.filter(e => e.layer === layerMode || !e.layer)

  return (
    <svg ref={ref} className="graph-canvas" width="100%" height="100%"
      onMouseDown={onBgMouseDown} onWheel={onWheel}
      onContextMenu={e => e.preventDefault()}
    >
      <rect width="100%" height="100%" fill="transparent" />
      <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>

        <SubnetBubbles nodes={graph.nodes} enabled={showSubnets} />

        {/* Heatmap gradient defs */}
        {showHeatmap && (
          <defs>
            {graph.nodes.map(n => {
              const nc = neighborCounts.get(n.id) ?? 0
              if (nc < 3) return null
              const alpha = Math.min(0.35, 0.06 * nc)
              return (
                <radialGradient key={`hg-${n.id}`} id={`hg-${n.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={`rgba(210,153,34,${alpha})`} />
                  <stop offset="100%" stopColor="rgba(210,153,34,0)" />
                </radialGradient>
              )
            })}
          </defs>
        )}

        {/* Heatmap circles */}
        {showHeatmap && graph.nodes.map(n => {
          const nc = neighborCounts.get(n.id) ?? 0
          if (nc < 3) return null
          const r = Math.min(120, 40 + nc * 12)
          return <circle key={`hc-${n.id}`} cx={n.x} cy={n.y} r={r} fill={`url(#hg-${n.id})`} style={{ pointerEvents: 'none' }} />
        })}

        {/* Edges — Feature 11 (service labels), 19 (protocol colors), 20 (layer filter) */}
        {edgesToRender.map(edge => {
          const srcId = typeof edge.source === 'string' ? edge.source : (edge.source as NetworkNode).id
          const tgtId = typeof edge.target === 'string' ? edge.target : (edge.target as NetworkNode).id
          const src = graph.nodes.find(n => n.id === srcId)
          const tgt = graph.nodes.find(n => n.id === tgtId)
          if (!src || !tgt) return null
          const isPath     = pathEdgeSet.has(edge.id)
          const bothVis    = visibleSet.has(srcId) && visibleSet.has(tgtId)
          const edgeColor  = isPath ? 'var(--accent)' : protocolColor(edge.protocol)
          const midX = (src.x + tgt.x) / 2
          const midY = (src.y + tgt.y) / 2
          const edgeLabel  = edge.protocol ?? edge.service

          return (
            <g key={edge.id}>
              <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke={edgeColor}
                strokeWidth={isPath ? 2.5 : edge.protocol ? 2 : 1.5}
                opacity={bothVis ? 1 : 0.07}
                strokeDasharray={edge.protocol === 'VLAN' ? '4 2' : undefined}
              />
              {edgeLabel && bothVis && (
                <text x={midX} y={midY - 4} textAnchor="middle" fontSize={8}
                  fill={edge.protocol ? edgeColor : 'rgba(139,148,158,0.7)'}
                  style={{ pointerEvents: 'none' }}>
                  {edgeLabel}
                </text>
              )}
            </g>
          )
        })}

        {/* Path hop label */}
        {tracedPath && tracedPath.length > 0 && (() => {
          const end = graph.nodes.find(n => n.id === tracedPath[tracedPath.length - 1])
          if (!end) return null
          return <text x={end.x} y={end.y - 36} textAnchor="middle" fontSize={10} fill="var(--accent)" style={{ pointerEvents: 'none' }}>{`${tracedPath.length - 1} hops`}</text>
        })()}

        {/* Nodes */}
        {graph.nodes.map(node => {
          const r = nodeRadius(node.openPortCount)
          const fill = resolveNodeColor(node, showVulnOverlay, compareMode, diffAdded, diffRemoved, diffChanged)
          const lbl = resolveLabel(node, nodeLabel)
          const isSelected = node.id === selectedId
          const isPathNode = !!tracedPath?.includes(node.id)
          const isStart    = node.id === pathStart
          const isVisible  = visibleSet.has(node.id)
          const isMatch    = searchMatches ? searchMatches.has(node.id) : true
          const em         = osEmoji(node.os)

          return (
            <g key={node.id} className="node-group"
              transform={`translate(${node.x},${node.y})`}
              onMouseDown={e => onNodeMouseDown(e, node.id)}
              onMouseUp={e => onNodeMouseUp(e, node.id)}
              onContextMenu={e => onNodeContextMenu(e, node.id)}
              style={{ cursor: 'pointer', opacity: isVisible ? (isMatch ? 1 : 0.15) : 0.2 }}
            >
              {(isSelected || isPathNode || isStart) && (
                <circle r={r + 6}
                  fill={isStart ? 'rgba(88,166,255,0.1)' : 'rgba(210,153,34,0.1)'}
                  stroke={isStart ? '#58a6ff' : 'var(--accent)'}
                  strokeWidth={2}
                />
              )}
              {searchMatches?.has(node.id) && (
                <circle r={r + 10} fill="none" stroke="var(--accent)" strokeWidth={1.5} opacity={0.5} />
              )}
              <circle r={r} fill={fill}
                stroke={isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}
                strokeWidth={isSelected ? 2 : 1}
              />
              <text textAnchor="middle" dominantBaseline="central"
                fontSize={r >= 20 ? 11 : 10} fontWeight={700} fill="white"
                style={{ pointerEvents: 'none' }}>{node.openPortCount}</text>
              {em && <text x={r} y={-r + 2} fontSize={9} fill="rgba(255,255,255,0.8)" textAnchor="middle" style={{ pointerEvents: 'none' }}>{em}</text>}
              {node.annotation && <text x={-r} y={-r + 2} fontSize={9} fill="var(--accent)" style={{ pointerEvents: 'none' }}>✎</text>}
              {node.schedule?.status === 'pending' && <circle cx={r - 2} cy={-(r - 2)} r={4} fill="#4a9eff" />}
              <text y={r + 12} textAnchor="middle" fontSize={11} fill="var(--text-dim)" style={{ pointerEvents: 'none' }}>{lbl.primary}</text>
              {lbl.secondary && <text y={r + 23} textAnchor="middle" fontSize={9} fill="var(--text-muted)" style={{ pointerEvents: 'none' }}>{lbl.secondary}</text>}
            </g>
          )
        })}
      </g>
    </svg>
  )
})

export default GraphSvg
