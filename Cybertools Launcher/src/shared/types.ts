export interface CyberlabConfig {
  installed: boolean;
  execPath: string;
}

export interface CyberlabStatus {
  sessionActive?: boolean;
  currentLab?: string | null;
  sessionStart?: string;
  sessionTime?: string;
  hintLevel?: number | null;
  streak?: number;
  labsDone?: number;
  findingsCount?: number;
  lastActive?: string | null;
  error?: string;
}

export interface VaultscraperConfig {
  installed: boolean;
  execPath: string;
}

export interface ActiveScrape {
  name: string;
  progress: number;
}

export interface VaultscraperStatus {
  activeScrape?: ActiveScrape | null;
  lastScrape?: string | null;
  nextScheduled?: string | null;
  vaultNoteCount?: number;
  totalSources?: number;
  lastScrapeNew?: number;
  lastScrapeUpdated?: number;
  lastActive?: string | null;
  error?: string;
}

export interface GhostVaultConfig {
  name: string;
  execPath: string;
}

export interface GhostVaultStatus {
  lastActive?: string | null;
  error?: string;
}

export interface ReconDeskConfig {
  execPath: string;
}

export interface ReconDeskStatus {
  activeTarget?: string | null;
  targetCount?: number;
  lastActive?: string | null;
  error?: string;
}

export interface SignalBoardConfig {
  execPath: string;
}

export interface SignalBoardStatus {
  feedCount?: number;
  lastRefresh?: string | null;
  lastActive?: string | null;
  error?: string;
}

export interface CyberOSConfig {
  execPath: string;
}

export interface CyberOSStatus {
  lastActive?: string | null;
  error?: string;
}

export interface CredVaultConfig {
  execPath: string;
}

export interface CredVaultStatus {
  active?: boolean;
  credentialCount?: number;
  lastActive?: string | null;
  error?: string;
}

export interface PlaybookStudioConfig {
  execPath: string;
}

export interface PlaybookStudioStatus {
  active?: boolean;
  activePlaybook?: string | null;
  lastActive?: string | null;
  error?: string;
}

export interface ReportForgeConfig {
  execPath: string;
}

export interface ReportForgeStatus {
  active?: boolean;
  reportCount?: number;
  lastActive?: string | null;
  error?: string;
}

export interface TerminalLinkConfig {
  execPath: string;
}

export interface TerminalLinkStatus {
  active?: boolean;
  commandCount?: number;
  lastActive?: string | null;
  error?: string;
}

export interface NetworkMapConfig {
  execPath: string;
}

export interface NetworkMapStatus {
  active?: boolean;
  currentGraph?: string | null;
  lastActive?: string | null;
  error?: string;
}

export interface CustomSlot {
  name: string;
  execPath: string;
  icon?: string;
}

export interface LauncherConfig {
  customSlots: CustomSlot[];
  activityFeed: ActivityEntry[];
  updateUrl: string;
}

export interface ActivityEntry {
  type: 'cyberlab' | 'vaultscraper' | 'ghostvault' | 'recondesk' | 'signalboard' | 'cyberos' | 'credvault' | 'playbookstudio' | 'reportforge' | 'terminallink' | 'networkmap' | 'launcher' | 'error';
  text: string;
  timestamp: string;
}

export interface CyberToolsConfig {
  obsidianVaultPath: string;
  theme: string;
  personalityTheme?: string;
  cyberlab: CyberlabConfig;
  cyberlab_status: CyberlabStatus | null;
  vaultscraper: VaultscraperConfig;
  vaultscraper_status: VaultscraperStatus | null;
  vaultscraper_trigger: unknown;
  ghostvault: GhostVaultConfig;
  ghostvault_status: GhostVaultStatus | null;
  recondesk: ReconDeskConfig;
  recondesk_status: ReconDeskStatus | null;
  signalboard: SignalBoardConfig;
  signalboard_status: SignalBoardStatus | null;
  cyberos: CyberOSConfig;
  cyberos_status: CyberOSStatus | null;
  credvault?: CredVaultConfig;
  credvault_status?: CredVaultStatus | null;
  playbookstudio?: PlaybookStudioConfig;
  playbookstudio_status?: PlaybookStudioStatus | null;
  reportforge?: ReportForgeConfig;
  reportforge_status?: ReportForgeStatus | null;
  terminallink?: TerminalLinkConfig;
  terminallink_status?: TerminalLinkStatus | null;
  networkmap?: NetworkMapConfig;
  networkmap_status?: NetworkMapStatus | null;
  launcher: LauncherConfig;
}

export interface VpnStatus {
  active: boolean;
  interface: string | null;
}

export interface ParsedCyberlabStatus {
  connected: boolean;
  sessionActive: boolean;
  currentLab: string | null;
  sessionTime: string | null;
  hintLevel: number | null;
  streak: number;
  labsDone: number;
  findingsCount: number;
  lastActive: string | null;
  isStale: boolean;
}

export interface ParsedVaultscraperStatus {
  connected: boolean;
  activeScrape: ActiveScrape | null;
  progress: number;
  lastScrape: string | null;
  nextScheduled: string | null;
  vaultNoteCount: number;
  totalSources: number;
  lastScrapeNew: number;
  lastScrapeUpdated: number;
  isStale: boolean;
  hasError: boolean;
}

export interface UpdateInfo {
  version: string;
  url: string;
  current?: string;
  latest?: string;
  notes?: string;
}

export interface EcosystemEvent {
  id: string;
  appName: string;
  eventType: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface SearchResult {
  app: string;
  type: 'target' | 'port' | 'credential' | 'context';
  title: string;
  subtitle: string;
  score: number;
}
