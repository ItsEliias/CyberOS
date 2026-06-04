// NetworkMap — Edge Inference
// Infers relationships between nodes based on subnet and service patterns
import type { NetworkNode, NetworkEdge } from '@shared/types'
import { serviceLabel } from './nmapParser'

function ipToSubnet24(ip: string): string {
  const parts = ip.split('.')
  if (parts.length < 3) return ip
  return parts.slice(0, 3).join('.')
}

function hasPort(node: NetworkNode, ...portNums: number[]): boolean {
  return node.ports.some(p => p.state === 'open' && portNums.includes(p.port))
}

function openServiceLabel(a: NetworkNode, b: NetworkNode): string | undefined {
  // Find a shared notable service
  const openA = a.ports.filter(p => p.state === 'open')
  for (const p of openA) {
    const label = serviceLabel(p.service, p.port)
    if (label && b.ports.some(bp => bp.state === 'open' && bp.port === p.port)) {
      return label
    }
  }
  return undefined
}

export function inferEdges(nodes: NetworkNode[]): NetworkEdge[] {
  const edges: NetworkEdge[] = []
  const added = new Set<string>()

  function addEdge(aId: string, bId: string, svc?: string): void {
    const key = [aId, bId].sort().join('|')
    if (added.has(key)) return
    added.add(key)
    edges.push({
      id: `edge-${key}`,
      source: aId,
      target: bId,
      type: 'inferred',
      service: svc,
    })
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]

      // Rule 1: Same /24 subnet
      if (ipToSubnet24(a.ip) === ipToSubnet24(b.ip)) {
        addEdge(a.id, b.id, openServiceLabel(a, b))
        continue
      }

      // Rule 2: SMB / AD
      const aSMB = hasPort(a, 445)
      const bSMB = hasPort(b, 445)
      const aAD  = hasPort(a, 88, 389, 636)
      const bAD  = hasPort(b, 88, 389, 636)
      if ((aSMB && bAD) || (bSMB && aAD) || (aSMB && bSMB)) {
        addEdge(a.id, b.id, 'SMB')
        continue
      }

      // Rule 3: Web server pair
      const aWeb = hasPort(a, 80, 443)
      const bWeb = hasPort(b, 80, 443)
      if (aWeb && bWeb) {
        addEdge(a.id, b.id, hasPort(a, 443) || hasPort(b, 443) ? 'HTTPS' : 'HTTP')
        continue
      }

      // Rule 4: SSH pairs
      if (hasPort(a, 22) && hasPort(b, 22)) {
        addEdge(a.id, b.id, 'SSH')
        continue
      }

      // Rule 5: Database
      const aDB = hasPort(a, 3306, 5432, 1433, 1521)
      const bDB = hasPort(b, 3306, 5432, 1433, 1521)
      if (aDB || bDB) {
        addEdge(a.id, b.id, 'DB')
        continue
      }
    }
  }

  return edges
}
