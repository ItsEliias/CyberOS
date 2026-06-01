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
  type: 'cyberlab' | 'vaultscraper' | 'ghostvault' | 'launcher' | 'error';
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
}

export interface EcosystemEvent {
  id: string;
  appName: string;
  eventType: string;
  data: Record<string, unknown>;
  timestamp: string;
}
