// ReconDesk — Full type definitions

export type Platform = 'HTB' | 'THM' | 'CTF' | 'Client' | 'Internal'
export type TargetStatus = 'active' | 'completed' | 'abandoned' | 'paused'
export type PortState = 'open' | 'filtered' | 'closed'
export type HashType = 'NTLM' | 'MD5' | 'SHA1' | 'bcrypt' | 'other'
export type AttackStage = 'recon' | 'enum' | 'exploit' | 'post' | 'privesc' | 'loot'
export type CardStatus = 'todo' | 'inprogress' | 'done' | 'blocked'
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Insane'
export type TimelineEntryType =
  | 'card_created'
  | 'card_moved'
  | 'card_completed'
  | 'port_added'
  | 'credential_added'
  | 'status_changed'
  | 'note_added'
  | 'enrichment'
  | 'screenshot'
  | 'cve_alert'
  | 'import'

export interface TimelineEntry {
  id: string
  timestamp: string
  type: TimelineEntryType
  description: string
  data?: Record<string, unknown>
}

export interface Port {
  id: string
  port: number
  protocol: 'tcp' | 'udp'
  state: PortState
  service: string
  version: string
  notes: string
  addedAt: string
  source: 'manual' | 'nmap-import'
}

export interface Credential {
  id: string
  username: string
  password?: string
  hash?: string
  hashType?: HashType
  service: string
  port?: number
  notes: string
  source: string
  verified: boolean
  addedAt: string
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
  assignee?: string
  createdAt: string
}

export interface Screenshot {
  id: string
  path: string
  thumbnail?: string
  capturedAt: string
  label: string
}

export interface EnrichmentData {
  status: 'pending' | 'done' | 'error'
  resolvedHostname?: string
  resolvedIPs?: string[]
  completedAt?: string
  error?: string
}

export interface GeoData {
  status: 'pending' | 'done' | 'error' | 'private'
  country?: string
  countryCode?: string
  city?: string
  org?: string
  flag?: string
  cachedAt?: string
}

// CVSS v3 base metric values
export interface CvssMetrics {
  AV: 'N' | 'A' | 'L' | 'P'  // Attack Vector
  AC: 'L' | 'H'              // Attack Complexity
  PR: 'N' | 'L' | 'H'        // Privileges Required
  UI: 'N' | 'R'              // User Interaction
  S: 'U' | 'C'               // Scope
  C: 'N' | 'L' | 'H'         // Confidentiality
  I: 'N' | 'L' | 'H'         // Integrity
  A: 'N' | 'L' | 'H'         // Availability
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface AttackCard {
  id: string
  title: string
  description: string
  stage: AttackStage
  status: CardStatus
  linkedPortIds: string[]
  linkedCredentialIds: string[]
  notes: string
  createdAt: string
  completedAt?: string
  cvss?: CvssMetrics
  subtasks?: Subtask[]
}

export interface Engagement {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface LinkedCredential {
  id: string
  username?: string
  service?: string
  url?: string
  notes?: string
  source: 'auto' | 'manual'
}

export interface Target {
  id: string
  name: string
  ip: string
  additionalIPs?: string[]
  platform: Platform
  os: string
  tags: string[]
  status: TargetStatus
  difficulty?: Difficulty
  notes: string
  createdAt: string
  completedAt?: string
  dueDate?: string
  ports: Port[]
  credentials: Credential[]
  attackCards: AttackCard[]
  timeline: TimelineEntry[]
  engagementId?: string
  enrichment?: EnrichmentData
  geo?: GeoData
  checklist: ChecklistItem[]
  screenshots: Screenshot[]
  linkedCredentialIds: string[]
  wordlists: string[]
  scheduledDate?: string
  notificationIds?: string[]
}
