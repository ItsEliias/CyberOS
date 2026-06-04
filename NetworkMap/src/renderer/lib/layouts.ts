// NetworkMap — Layout engine for hierarchical, circular, and grid layouts
import type { NetworkNode, NetworkEdge, LayoutMode } from '@shared/types'
import { runSimulation } from './simulation'

/** Apply a named layout to nodes, returning updated positions */
export function applyLayout(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  mode: LayoutMode,
  width: number,
  height: number
): NetworkNode[] {
  if (nodes.length === 0) return nodes

  switch (mode) {
    case 'force':
      return runSimulation(nodes, edges, width, height)
    case 'hierarchical':
      return hierarchicalLayout(nodes, edges, width, height)
    case 'circular':
      return circularLayout(nodes, width, height)
    case 'grid':
      return gridLayout(nodes, width, height)
    default:
      return nodes
  }
}

function hierarchicalLayout(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  width: number,
  height: number
): NetworkNode[] {
  // Build adjacency for BFS to assign levels
  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    const src = typeof e.source === 'string' ? e.source : ''
    const tgt = typeof e.target === 'string' ? e.target : ''
    adj.get(src)?.push(tgt)
    adj.get(tgt)?.push(src)
  }

  const levels = new Map<string, number>()
  const queue: string[] = []
  const root = nodes[0].id
  levels.set(root, 0)
  queue.push(root)

  while (queue.length > 0) {
    const cur = queue.shift()!
    const curLevel = levels.get(cur)!
    for (const neighbor of (adj.get(cur) ?? [])) {
      if (!levels.has(neighbor)) {
        levels.set(neighbor, curLevel + 1)
        queue.push(neighbor)
      }
    }
  }

  // Group by level
  const byLevel = new Map<number, NetworkNode[]>()
  for (const n of nodes) {
    const lv = levels.get(n.id) ?? 0
    if (!byLevel.has(lv)) byLevel.set(lv, [])
    byLevel.get(lv)!.push(n)
  }

  const maxLevel = Math.max(...Array.from(byLevel.keys()))
  const levelHeight = height / (maxLevel + 2)

  return nodes.map(n => {
    const lv = levels.get(n.id) ?? 0
    const group = byLevel.get(lv)!
    const idx = group.indexOf(n)
    const colWidth = width / (group.length + 1)
    return {
      ...n,
      x: colWidth * (idx + 1),
      y: levelHeight * (lv + 1),
      fx: null, fy: null,
    }
  })
}

function circularLayout(
  nodes: NetworkNode[],
  width: number,
  height: number
): NetworkNode[] {
  const cx = width / 2
  const cy = height / 2
  const r = Math.min(width, height) / 2 - 80
  const count = nodes.length
  return nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2
    return {
      ...n,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      fx: null, fy: null,
    }
  })
}

function gridLayout(
  nodes: NetworkNode[],
  width: number,
  height: number
): NetworkNode[] {
  const cols = Math.ceil(Math.sqrt(nodes.length))
  const rows = Math.ceil(nodes.length / cols)
  const cellW = (width - 120) / cols
  const cellH = (height - 120) / rows

  return nodes.map((n, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      ...n,
      x: 60 + cellW * col + cellW / 2,
      y: 60 + cellH * row + cellH / 2,
      fx: null, fy: null,
    }
  })
}
