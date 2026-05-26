// Shared types — CyberOS Dashboard

export interface AppStatus {
  active: boolean
  lastActive: string
}

export interface CyberLabStatus extends AppStatus {
  sessionActive: boolean
  currentLab?: string
  sessionStart?: string
  hintLevel?: string
  streak?: number
  labsDone?: number
  findingsCount?: number
}

export interface VaultScraperStatus extends AppStatus {
  activeScrape?: string | null
  lastScrape?: string
  nextScheduled?: string
  vaultNoteCount?: number
  totalSources?: number
  lastScrapeNew?: number
  lastScrapeUpdated?: number
}

export interface GhostVaultStatus extends AppStatus {
  lastCapture?: string
  noteCount?: number
}

export interface ReconDeskStatus extends AppStatus {
  activeTarget?: string
  targetCount?: number
  cardCount?: number
}

export interface AppRegistration {
  installed: boolean
  execPath?: string
}

export interface EcosystemConfig {
  theme?: string
  obsidianVaultPath?: string
  cyberlab?: AppRegistration
  cyberlab_status?: CyberLabStatus
  vaultscraper?: AppRegistration
  vaultscraper_status?: VaultScraperStatus
  ghostvault_status?: GhostVaultStatus
  recondesk_status?: ReconDeskStatus
  launcher?: { activityFeed?: EcosystemEvent[] }
}

export interface EcosystemEvent {
  id: string
  timestamp: string
  app: string
  event: string
  data: Record<string, unknown>
}

export type AppId = 'ghostvault' | 'vaultcore' | 'cyberlab' | 'recondesk' | 'launcher'
