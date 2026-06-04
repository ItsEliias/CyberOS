// Shared types used by both main process and renderer

export interface CveResult {
  id: string
  description: string
  score: number | null
  severity: string | null
  published: string
  url: string
}

export type Platform = 'HTB' | 'THM' | 'CTF' | 'Custom' | 'Client' | 'Internal'
export type TargetStatus = 'active' | 'completed' | 'abandoned' | 'paused'
export type PortState = 'open' | 'filtered' | 'closed'
export type CredType = 'plaintext' | 'hash' | 'key' | 'token'
export type AttackStage = 'recon' | 'enum' | 'exploit' | 'post' | 'privesc' | 'loot'
export type CardStatus = 'todo' | 'inprogress' | 'done' | 'blocked'

export interface Port {
  id: string
  port: number
  protocol: 'tcp' | 'udp'
  service?: string
  version?: string
  state: PortState
  notes?: string
  addedAt?: string
  source?: string
}

export interface Credential {
  id: string
  username?: string
  password?: string
  hash?: string
  type?: CredType
  service?: string
  notes?: string
  verified?: boolean
  addedAt?: string
}

export interface AttackCard {
  id: string
  targetId?: string
  title: string
  notes?: string
  command?: string
  stage: AttackStage
  status: CardStatus
  createdAt: string
}

export interface Engagement {
  id: string
  name: string
  color: string
  createdAt: string
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
  timeline: unknown[]
  createdAt: string
  engagementId?: string
}

export interface ReconDeskData {
  targets: Target[]
  cards: AttackCard[]
  activeTargetId: string | null
  version: string
  engagements?: Engagement[]
}

export interface ReconDeskStatus {
  active: boolean
  lastActive: string
  activeTarget?: string
  targetCount: number
  cardCount: number
}
