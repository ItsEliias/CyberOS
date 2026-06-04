// CredVault — Shared types (main process + renderer)

export type CredentialStatus = 'active' | 'rotated' | 'invalid'
export type HashType = 'ntlm' | 'sha256' | 'md5' | 'bcrypt' | 'sha1' | 'lm' | 'other'
export type CredentialType = 'credential' | 'note'
export type CredentialCategory = 'SSH' | 'API Key' | 'Web' | 'Database' | 'Certificate' | 'Token' | 'Other'

export interface Credential {
  id: string
  createdAt: string
  updatedAt: string
  type?: CredentialType      // 'credential' | 'note' — defaults to 'credential'
  // Identity
  username: string
  password?: string
  hash?: string
  hashType?: HashType | string
  // Context
  service: string
  ip?: string
  port?: number
  protocol?: string
  // Origin
  source: string
  labName?: string
  targetName?: string
  // Organization
  category?: CredentialCategory
  folder?: string
  // Metadata
  tags: string[]
  notes?: string            // also used as secure note body when type === 'note'
  // Status
  verified: boolean
  status: CredentialStatus
  // Expiry
  expiresAt?: string        // ISO date string
  // TOTP
  totpSecret?: string       // base32 secret for TOTP generation (renderer-side)
  // Usage tracking
  lastUsed?: string         // ISO datetime of last copy
  useCount?: number
}

export interface VaultData {
  credentials: Credential[]
  version: string
}

export interface ImportPreviewRow {
  selected: boolean
  credential: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>
  sourceTarget: string
}

export interface CredVaultStatus {
  active: boolean
  lastActive: string
  credentialCount: number
  locked: boolean
}

// IPC types
export interface UnlockResult {
  ok: boolean
  error?: string
  attemptsLeft?: number
  lockoutSeconds?: number
}

export interface VaultStats {
  total: number
  byService: Record<string, number>
  byLab: Record<string, number>
  bySource: Record<string, number>
}

export interface ReconTarget {
  id: string
  name: string
  ip: string
  credentials?: ReconCredential[]
}

export interface ReconCredential {
  id: string
  username?: string
  password?: string
  hash?: string
  type?: string
  service?: string
  notes?: string
}

export interface ImportHistoryEntry {
  timestamp: string
  count: number
  sourceLabel: string
}

export interface ExportBackupPayload {
  exportPassword: string
}

export interface SearchResult {
  id: string
  service: string
  username: string
  ip?: string
  targetName?: string
}

export interface PendingCredential {
  targetName: string
  targetIP: string
  username?: string
  hash?: string
  type: string
  service?: string
  queuedAt: string
}

export interface BreachCheckResult {
  ok: boolean
  breachCount?: number
  error?: string
  checkedAt?: string
}

export interface BreachCache {
  [credId: string]: BreachCheckResult & { checkedAt: string }
}
