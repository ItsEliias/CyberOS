export interface NetworkPort {
  port: number
  protocol: string
  state: 'open' | 'filtered' | 'closed'
  service?: string
  product?: string
  version?: string
}

export interface NetworkNode {
  id: string        // IP address used as key
  ip: string
  hostname?: string
  os?: string
  status: 'up' | 'down' | 'unknown'
  ports: NetworkPort[]
  x: number         // canvas position
  y: number
}

export interface NetworkEdge {
  id: string
  source: string    // node ip
  target: string    // node ip
  label?: string
}

export interface NetworkGraph {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

export interface GraphSummary {
  id: string
  name: string
  createdAt: string
  nodeCount: number
}
