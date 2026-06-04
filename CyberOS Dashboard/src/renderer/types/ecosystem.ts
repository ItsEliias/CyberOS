// CyberOS Dashboard — Type Definitions
// ItsEliias // All 12 app statuses + ecosystem types

// ─── Base Types ──────────────────────────────────────────────────────────────

export interface AppStatus {
  active: boolean
  lastActive: string
}

export interface AppRegistration {
  installed?: boolean
  execPath?: string
  name?: string
  version?: string
}

// ─── App-Specific Status Types ───────────────────────────────────────────────

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

// ─── Operator Profile ────────────────────────────────────────────────────────

export interface SkillProgress {
  web: number
  network: number
  activeDirectory: number
  linux: number
  windows: number
  crypto: number
  forensics: number
}

export interface OperatorProfile {
  operatorName: string
  totalLabsCompleted: number
  totalFlags: number
  totalCredentials: number
  currentStreak: number
  lastActiveDate: string
  skillProgress: SkillProgress
  activityDates?: string[]
}

// ─── Shared Context ──────────────────────────────────────────────────────────

export interface SharedContext {
  activeLab: string | null
  activeTarget: string | null
  activeIP: string | null
  activePlaybook: string | null
  lastUpdated: string
  updatedBy: string
}

// ─── Ecosystem Config ────────────────────────────────────────────────────────

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
  operator_profile?: OperatorProfile

  // Shared context
  shared_context?: SharedContext

  // Legacy
  launcher?: { activityFeed?: EcosystemEvent[] }
}

// ─── Ecosystem Events ────────────────────────────────────────────────────────

export interface EcosystemEvent {
  id: string
  timestamp: string
  app?: string
  appName?: string       // legacy schema
  event?: string
  eventType?: string     // legacy schema
  data?: Record<string, unknown>
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export type AlertType = 'app_offline' | 'no_events' | 'credvault_locked' | 'high_unread'
export type AlertSeverity = 'warning' | 'critical'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  message: string
  triggeredAt: Date
  appKey?: string
}

// ─── App IDs ─────────────────────────────────────────────────────────────────

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

// ─── App Card Definition ─────────────────────────────────────────────────────

export interface AppCardData {
  id: AppId
  name: string
  subtitle: string
  accentColor: string
  active: boolean
  lastActive?: string
  execPath?: string
  metrics: { label: string; value: string | number; highlight?: boolean }[]
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface DashboardSettings {
  operatorName: string
  refreshInterval: 5000 | 10000 | 30000
  defaultView: 'dashboard' | 'profile' | 'ecosystem'
  notifications: boolean
  alertSound: boolean
  fullscreen: boolean
  feedMaxItems: 25 | 50 | 100
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type ViewId = 'dashboard' | 'profile' | 'ecosystem' | 'settings' | 'apps'

// ─── Live Stats ───────────────────────────────────────────────────────────────

export interface MetricSnapshot {
  timestamp: number
  value: number
}

export interface AppLiveStats {
  appKey: string
  history: MetricSnapshot[]  // up to 20 most-recent snapshots
}
