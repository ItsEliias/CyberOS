// CyberOS Dashboard — Shared Types (v2.0)
// Used by both main process and renderer

export interface AppStatus {
  active: boolean
  lastActive: string
}

export interface CyberLabStatus extends AppStatus {
  sessionActive?: boolean
  currentLab?: string
  sessionStart?: string
  hintLevel?: string
  streak?: number
  labsDone?: number
  findingsCount?: number
}

export interface ReconDeskStatus extends AppStatus {
  activeTarget?: string
  targetCount?: number
  cardCount?: number
}

export interface GhostVaultStatus extends AppStatus {
  lastCapture?: string
  noteCount?: number
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

export interface SignalBoardStatus extends AppStatus {
  unreadCount?: number
  lastRefresh?: string
  topItem?: string
}

export interface CredVaultStatus extends AppStatus {
  credentialCount?: number
  locked?: boolean
}

export interface PlaybookStudioStatus extends AppStatus {
  activePlaybook?: string
}

export interface ReportForgeStatus extends AppStatus {
  reportCount?: number
}

export interface TerminalLinkStatus extends AppStatus {
  commandCount?: number
  linkedSession?: string
}

export interface NetworkMapStatus extends AppStatus {
  currentGraph?: string
  nodeCount?: number
}

export interface CyberOSLauncherStatus extends AppStatus {}

export interface AgenticOSStatus extends AppStatus {
  activeAgentCount?: number
  runningTaskCount?: number
  completedTaskCount?: number
}

export interface AppRegistration {
  installed?: boolean
  execPath?: string
  name?: string
  version?: string
}

export interface EcosystemConfig {
  theme?: string
  obsidianVaultPath?: string

  // App registrations
  cyberlab?: AppRegistration
  recondesk?: AppRegistration
  ghostvault?: AppRegistration
  vaultscraper?: AppRegistration
  signalboard?: AppRegistration
  credvault?: AppRegistration
  playbookstudio?: AppRegistration
  reportforge?: AppRegistration
  terminallink?: AppRegistration
  networkmap?: AppRegistration
  cyberos?: AppRegistration
  agenticos?: AppRegistration

  // App statuses
  cyberlab_status?: CyberLabStatus
  recondesk_status?: ReconDeskStatus
  ghostvault_status?: GhostVaultStatus
  vaultscraper_status?: VaultScraperStatus
  signalboard_status?: SignalBoardStatus
  credvault_status?: CredVaultStatus
  playbookstudio_status?: PlaybookStudioStatus
  reportforge_status?: ReportForgeStatus
  terminallink_status?: TerminalLinkStatus
  networkmap_status?: NetworkMapStatus
  cyberos_status?: CyberOSLauncherStatus
  agenticos_status?: AgenticOSStatus

  // Operator
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

  // Shared context
  shared_context?: {
    activeLab?: string | null
    activeTarget?: string | null
    activeIP?: string | null
    activePlaybook?: string | null
    lastUpdated?: string
    updatedBy?: string
  }

  // Legacy
  launcher?: { activityFeed?: EcosystemEvent[] }
}

export interface EcosystemEvent {
  id: string
  timestamp: string
  app?: string
  appName?: string       // legacy schema
  event?: string
  eventType?: string     // legacy schema
  data?: Record<string, unknown>
}

export type AppId =
  | 'cyberos'
  | 'dashboard'
  | 'cyberlab'
  | 'recondesk'
  | 'ghostvault'
  | 'vaultcore'
  | 'signalboard'
  | 'credvault'
  | 'playbookstudio'
  | 'reportforge'
  | 'terminallink'
  | 'networkmap'
  | 'agenticos'
