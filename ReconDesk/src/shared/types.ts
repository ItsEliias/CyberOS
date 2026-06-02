// Shared types used by both main process and renderer

export interface CveResult {
  id: string
  description: string
  score: number | null
  severity: string | null
  published: string
  url: string
}

export type Platform = 'HTB' | 'THM' | 'CTF' | 'Custom'
export type TargetStatus = 'active' | 'completed' | 'abandoned'
export type PortState = 'open' | 'filtered' | 'closed'
export type CredType = 'plaintext' | 'hash' | 'key' | 'token'
export type AttackStage = 'recon' | 'enum' | 'exploit' | 'post' | 'privesc' | 'loot'
export type CardStatus = 'todo' | 'inprogress' | 'done' | 'blocked'

export interface TimelineEvent {
  id: string
  timestamp: string
  type: 'card' | 'asset' | 'status'
  description: string
}

export interface Port {
  id: string
  number: number
  protocol: 'tcp' | 'udp'
  service?: string
  version?: string
  state: PortState
  notes?: string
}

export interface Credential {
  id: string
  username?: string
  password?: string
  hash?: string
  type: CredType
  service?: string
  notes?: string
}

export interface Target {
  id: string
  name: string
  ip: string
  os?: string
  platform: Platform
  status: TargetStatus
  tags: string[]
  notes?: string
  ports: Port[]
  credentials: Credential[]
  flags?: string[]
  timeline: TimelineEvent[]
  createdAt: string
  updatedAt: string
}

export interface AttackCard {
  id: string
  targetId: string
  title: string
  notes?: string
  command?: string
  stage: AttackStage
  status: CardStatus
  findings: string[]
  linkedAssets?: string[]
  createdAt: string
  updatedAt: string
}

export interface ReconDeskData {
  targets: Target[]
  cards: AttackCard[]
  activeTargetId: string | null
  version: string
}

// Ecosystem shared config keys written by ReconDesk
export interface ReconDeskStatus {
  active: boolean
  lastActive: string
  activeTarget?: string
  targetCount: number
  cardCount: number
}
