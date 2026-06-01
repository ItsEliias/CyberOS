import type { NetworkNode, NetworkEdge } from '@shared/types'

export function runSimulation(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  width: number,
  height: number
): NetworkNode[] {
  // Clone nodes
  const ns = nodes.map(n => ({
    ...n,
    x: n.x || width / 2 + (Math.random() - 0.5) * 200,
    y: n.y || height / 2 + (Math.random() - 0.5) * 200,
    vx: 0,
    vy: 0,
  })) as (NetworkNode & { vx: number; vy: number })[]

  const REPULSION   = 3000
  const SPRING      = 0.05
  const SPRING_LEN  = 180
  const DAMPING     = 0.85
  const CENTER_PULL = 0.01

  for (let iter = 0; iter < 200; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx   = ns[j].x - ns[i].x
        const dy   = ns[j].y - ns[i].y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = REPULSION / (dist * dist)
        const fx   = (dx / dist) * force
        const fy   = (dy / dist) * force
        ns[i].vx -= fx; ns[i].vy -= fy
        ns[j].vx += fx; ns[j].vy += fy
      }
    }
    // Spring attraction along edges
    for (const edge of edges) {
      const a = ns.find(n => n.id === edge.source)
      const b = ns.find(n => n.id === edge.target)
      if (!a || !b) continue
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const stretch = (dist - SPRING_LEN) * SPRING
      const fx = (dx / dist) * stretch, fy = (dy / dist) * stretch
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy
    }
    // Center pull + damping + position update
    for (const n of ns) {
      n.vx += (width / 2 - n.x) * CENTER_PULL
      n.vy += (height / 2 - n.y) * CENTER_PULL
      n.vx *= DAMPING; n.vy *= DAMPING
      n.x += n.vx; n.y += n.vy
      // Clamp to canvas
      n.x = Math.max(60, Math.min(width - 60, n.x))
      n.y = Math.max(60, Math.min(height - 60, n.y))
    }
  }
  return ns.map(({ vx: _vx, vy: _vy, ...n }) => n)
}
