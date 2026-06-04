export interface NetworkPort {
  port: number
  protocol: string
  state: 'open' | 'filtered' | 'closed'
  service?: string
  product?: string
  version?: string
}

export interface NodeSchedule {
  scheduledAt: string   // ISO datetime when re-scan is due
  status: 'pending' | 'running' | 'complete'
  nmapArgs?: string
}

export interface NetworkNode {
  id: string        // IP address used as key
  ip: string
  hostname?: string
  os?: string
  osAccuracy?: number   // from osmatch accuracy attribute
  macAddress?: string
  status: 'up' | 'down' | 'unknown'
  ports: NetworkPort[]
  openPortCount: number
  x: number         // canvas position
  y: number
  fx?: number | null  // fixed x (dragged)
  fy?: number | null  // fixed y (dragged)
  annotation?: string
  vulns?: VulnEntry[]
  schedule?: NodeSchedule
}

export type RoutingProtocol = 'OSPF' | 'EIGRP' | 'BGP' | 'VLAN' | 'static'

export interface NetworkEdge {
  id: string
  source: string    // node ip
  target: string    // node ip
  type: 'inferred' | 'manual' | 'gns3'
  label?: string
  service?: string  // e.g. 'HTTP', 'SSH', 'SMB'
  protocol?: RoutingProtocol  // Feature 19
  layer?: 2 | 3 | 4           // Feature 20
}

export type AclAction = 'permit' | 'deny'

export interface AclRule {
  id: string
  action: AclAction
  srcIp: string     // CIDR or 'any'
  dstIp: string
  dstPort?: number
  protocol?: string
  description?: string
}

export interface NetworkGraph {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  metadata?: {
    scanDate?: string
    subnet?: string
    importSource: 'nmap-xml' | 'paste' | 'recondesk' | 'gns3'
    filePath?: string
    schedule?: ScanSchedule
  }
}

export interface GraphSummary {
  id: string
  name: string
  createdAt: string
  nodeCount: number
  edgeCount: number
  importSource?: 'nmap-xml' | 'paste' | 'recondesk' | 'gns3'
}

export type VulnSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface VulnEntry {
  ip: string
  cves: string[]
  severity: VulnSeverity
  description?: string
}

export type LayoutMode = 'force' | 'hierarchical' | 'circular' | 'grid'

export type GraphMode = 'normal' | 'trace-path' | 'compare' | 'vuln-overlay' | 'heatmap'

export interface ScanSchedule {
  interval: '1h' | '6h' | '24h' | '7d'
  filePath?: string
  lastChecked?: string
  nextDue?: string
}

/** Multi-scan record for port timeline and diff features */
export interface ScanRecord {
  scanName: string
  importedAt: string
  nodes: NetworkNode[]
}
