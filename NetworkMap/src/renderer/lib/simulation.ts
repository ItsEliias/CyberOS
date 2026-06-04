// NetworkMap — D3 Force Simulation
// Uses d3 forceManyBody(-300) + tick(200) per spec
import * as d3 from 'd3'
import type { NetworkNode, NetworkEdge } from '@shared/types'

type SimNode = NetworkNode & d3.SimulationNodeDatum

export function runSimulation(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  width: number,
  height: number
): NetworkNode[] {
  if (nodes.length === 0) return []

  // Deep clone nodes so we don't mutate originals
  const simNodes: SimNode[] = nodes.map(n => ({
    ...n,
    x: (n.fx != null ? n.fx : null) ?? (n.x !== 0 ? n.x : width / 2 + (Math.random() - 0.5) * 200),
    y: (n.fy != null ? n.fy : null) ?? (n.y !== 0 ? n.y : height / 2 + (Math.random() - 0.5) * 200),
    fx: n.fx ?? null,
    fy: n.fy ?? null,
  }))

  // Build edge objects — d3 mutates source/target to node objects after simulation
  const simLinks: d3.SimulationLinkDatum<SimNode>[] = edges.flatMap(e => {
    const src = simNodes.find(n => n.id === e.source)
    const tgt = simNodes.find(n => n.id === e.target)
    if (!src || !tgt) return []
    return [{ source: src as unknown as SimNode, target: tgt as unknown as SimNode }]
  })

  const simulation = d3.forceSimulation<SimNode>(simNodes)
    .force('link', d3.forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(simLinks)
      .id(d => d.id)
      .distance(100)
    )
    .force('charge', d3.forceManyBody<SimNode>().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide<SimNode>().radius(40))
    .stop()

  // Run 200 iterations before rendering — graph appears already settled
  simulation.tick(200)

  return simNodes.map(n => ({
    ...n,
    x: Math.max(60, Math.min(width - 60, n.x ?? width / 2)),
    y: Math.max(60, Math.min(height - 60, n.y ?? height / 2)),
  }))
}
