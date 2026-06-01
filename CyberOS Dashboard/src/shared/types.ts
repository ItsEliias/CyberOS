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
  installed?: boolean
  execPath?: string
  name?: string
  version?: string
}

export interface SignalBoardStatus extends AppStatus {
  unreadCount?: number
  lastRefresh?: string
  topItem?: string
}

export interface AgenticOSStatus extends AppStatus {
  activeAgentCount?: number
  runningTaskCount?: number
  completedTaskCount?: number
}

export interface EcosystemConfig {
  theme?: string
  obsidianVaultPath?: string
  cyberlab?: AppRegistration
  cyberlab_status?: CyberLabStatus
  vaultscraper?: AppRegistration
  vaultscraper_status?: VaultScraperStatus
  ghostvault?: AppRegistration
  ghostvault_status?: GhostVaultStatus
  recondesk?: AppRegistration
  recondesk_status?: ReconDeskStatus
  signalboard?: AppRegistration
  signalboard_status?: SignalBoardStatus
  agenticos?: AppRegistration
  agenticos_status?: AgenticOSStatus
  cyberos?: AppRegistration
  launcher?: { activityFeed?: EcosystemEvent[] }
  operator_profile?: {
    operatorName?: string
    totalLabsCompleted?: number
    totalFlags?: number
    totalCredentials?: number
    currentStreak?: number
    lastActiveDate?: string
    skillProgress?: Record<string, number>
    activityDates?: string[]
  }
  shared_context?: {
    activeLab?: string
    activeTarget?: string
    activeIP?: string
    activePlaybook?: string
    lastUpdated?: string
    updatedBy?: string
  }
}

export interface EcosystemEvent {
  id: string
  timestamp: string
  app: string
  event: string
  data: Record<string, unknown>
}

export type AppId = 'ghostvault' | 'vaultcore' | 'cyberlab' | 'recondesk' | 'launcher'
