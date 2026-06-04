// NetworkMap — Graph algorithms: BFS path tracing, subnet grouping, health score
import type { NetworkNode, NetworkEdge, VulnEntry } from '@shared/types'

/** BFS shortest path between two nodes. Returns node IDs in order, or null if unreachable */
export function findShortestPath(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  fromId: string,
  toId: string
): string[] | null {
  if (fromId === toId) return [fromId]

  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    const src = typeof e.source === 'string' ? e.source : (e.source as any).id
    const tgt = typeof e.target === 'string' ? e.target : (e.target as any).id
    adj.get(src)?.push(tgt)
    adj.get(tgt)?.push(src)
  }

  const visited = new Set<string>([fromId])
  const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }]

  while (queue.length > 0) {
    const { id, path } = queue.shift()!
    for (const neighbor of (adj.get(id) ?? [])) {
      if (neighbor === toId) return [...path, neighbor]
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push({ id: neighbor, path: [...path, neighbor] })
      }
    }
  }
  return null
}

/** Extract /24 subnet prefix from an IP address */
export function subnet24(ip: string): string {
  const parts = ip.split('.')
  if (parts.length < 3) return ip
  return parts.slice(0, 3).join('.') + '.0/24'
}

/** Group nodes by their /24 subnet */
export function groupBySubnet(nodes: NetworkNode[]): Map<string, NetworkNode[]> {
  const groups = new Map<string, NetworkNode[]>()
  for (const n of nodes) {
    const sub = subnet24(n.ip)
    if (!groups.has(sub)) groups.set(sub, [])
    groups.get(sub)!.push(n)
  }
  return groups
}

interface BoundingBox {
  minX: number; minY: number; maxX: number; maxY: number
}

/** Compute bounding box for a group of nodes with given radius padding */
export function groupBoundingBox(nodes: NetworkNode[], padding: number = 40): BoundingBox {
  const xs = nodes.map(n => n.x)
  const ys = nodes.map(n => n.y)
  return {
    minX: Math.min(...xs) - padding,
    minY: Math.min(...ys) - padding,
    maxX: Math.max(...xs) + padding,
    maxY: Math.max(...ys) + padding,
  }
}

export interface HealthScore {
  score: number
  maxScore: number
  deductions: { reason: string; points: number }[]
}

const RISKY_PORTS = [22, 23, 3389, 445, 21]

/** Calculate network health score (0-100) */
export function calcHealthScore(nodes: NetworkNode[], vulns: VulnEntry[]): HealthScore {
  const deductions: { reason: string; points: number }[] = []
  let total = 0

  for (const node of nodes) {
    for (const rp of RISKY_PORTS) {
      if (node.ports.some(p => p.state === 'open' && p.port === rp)) {
        deductions.push({ reason: `${node.ip}: port ${rp} open`, points: 5 })
        total += 5
      }
    }
    if (!node.os) {
      deductions.push({ reason: `${node.ip}: OS unknown`, points: 2 })
      total += 2
    }
  }

  for (const v of vulns) {
    if (v.severity === 'critical') {
      deductions.push({ reason: `${v.ip}: critical CVE (${v.cves[0] ?? ''})`, points: 10 })
      total += 10
    } else if (v.severity === 'high') {
      deductions.push({ reason: `${v.ip}: high CVE (${v.cves[0] ?? ''})`, points: 5 })
      total += 5
    }
  }

  return { score: Math.max(0, 100 - total), maxScore: 100, deductions }
}

/** Compute edge IDs that form the path */
export function pathEdgeIds(path: string[], edges: NetworkEdge[]): Set<string> {
  const result = new Set<string>()
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    for (const e of edges) {
      const src = typeof e.source === 'string' ? e.source : (e.source as any).id
      const tgt = typeof e.target === 'string' ? e.target : (e.target as any).id
      if ((src === a && tgt === b) || (src === b && tgt === a)) {
        result.add(e.id)
      }
    }
  }
  return result
}
