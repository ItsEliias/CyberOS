export type LabCategory = 'CCNA' | 'CCNP' | 'Linux' | 'FortiGate' | 'EVE-NG' | 'GNS3'
export type Vendor = 'Cisco IOS' | 'Junos' | 'FortiOS' | 'MikroTik' | 'Linux'

export interface LabStep {
  id: string
  number: number
  title: string
  description: string
  deviceName?: string
  command?: string
  verificationCommand?: string
  expectedOutput?: string
  hints: string[]
}

export interface Lab {
  id: string
  title: string
  category: LabCategory
  vendor: Vendor
  difficulty: 1 | 2 | 3 | 4 | 5
  description: string
  topology?: string
  steps: LabStep[]
  tags: string[]
  createdAt: string
  isBuiltin: boolean
}

export interface LabProgress {
  labId: string
  startedAt: string
  completedAt?: string
  stepResults: Record<string, { passed: boolean; actualOutput?: string; attemptedAt: string }>
  notes: string
  rating?: 1 | 2 | 3 | 4 | 5
  bestTimeMs?: number
}

export interface TopologyNode {
  id: string
  type: 'router' | 'switch' | 'firewall' | 'pc' | 'cloud' | 'server'
  label: string
  x: number
  y: number
  config?: string
  interfaces: { name: string; ip?: string; mask?: string }[]
}

export interface TopologyLink {
  id: string
  sourceId: string
  targetId: string
  sourceInterface?: string
  targetInterface?: string
  protocol?: string
}

export interface Topology {
  id: string
  name: string
  nodes: TopologyNode[]
  links: TopologyLink[]
}

export type SnippetCategory =
  | 'Cisco Routing'
  | 'Cisco Switching'
  | 'ACL'
  | 'NAT'
  | 'Linux Networking'
  | 'FortiGate'
  | 'Verification'

export interface CommandSnippet {
  id: string
  title: string
  command: string
  category: SnippetCategory
  description?: string
  variables?: string[]
}

export interface NetLabPrefs {
  terminalLinkPath?: string
  ghostVaultAutoSave: boolean
  labDataDir?: string
}
