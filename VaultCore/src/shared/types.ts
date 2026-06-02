export type CoreTheme        = 'stealth' | 'graphite' | 'frost' | 'oled';
export type PersonalityTheme = 'neutral' | 'cyberpunk' | 'terminal' | 'threat';
export type ViewId           = 'scrape' | 'sources' | 'health' | 'settings' | 'schedules' | 'logs';

export type SourceType =
  | 'obsidian-publish' | 'website' | 'github' | 'youtube'
  | 'pdf' | 'reddit' | 'twitter' | 'notion' | 'medium' | 'cve' | 'rss';

export type ConflictStrategy = 'skip' | 'overwrite' | 'keepBoth' | 'ask';
export type UpdateMode       = 'all' | 'updates';

export interface ThemeConfig {
  core: CoreTheme;
  personality: PersonalityTheme;
}

export interface VaultCoreConfig {
  obsidianVaultPath?: string;
  theme?            : ThemeConfig | string;
  minimiseToTray?   : boolean;
  notifications?    : boolean;
  soundEnabled?     : boolean;
  soundVolume?      : number;
  vaultscraper?     : Record<string, unknown>;
  vaultscraper_status?: Record<string, unknown>;
}

export interface SourceSchedule {
  enabled?          : boolean;
  cronExpression?   : string;
  conflictStrategy? : ConflictStrategy;
  nextRun?          : string;
}

export interface SourceHealth {
  lastChecked?         : string;
  lastSuccess?         : string;
  consecutiveFailures  : number;
  lastError?           : string;
  status               : 'healthy' | 'warning' | 'error' | 'unknown';
}

export interface Source {
  id          : string;
  name        : string;
  type        : SourceType;
  url?        : string;
  config      : Record<string, unknown>;
  lastScraped?: string;
  noteCount?  : number;
  schedule?   : SourceSchedule;
  health?     : SourceHealth;
}

export interface ScrapeProgress {
  percent  : number;
  message  : string;
  saved?   : number;
  updated? : number;
  failed?  : number;
  total?   : number;
  paused?  : boolean;
  phase?   : string;
}

export interface DiffLine {
  line: string;
  type: 'added' | 'removed' | 'unchanged';
}

export interface ScrapeDiff {
  url             : string;
  previous        : string;
  current         : string;
  diff            : DiffLine[];
  scrapedAt       : string;
  previousScrapedAt: string;
}

export interface ScrapeResult {
  saved   : number;
  updated : number;
  failed  : number;
  skipped?: number;
  errors? : string[];
  updatedNotes?: Array<{ title: string; oldFirstLine: string; newFirstLine: string }>;
  folderStats? : Array<{ folder: string; count: number }>;
  suggestedTags?: Record<string, string[]>;
  scrapeDiffs?: ScrapeDiff[];
}

export interface ScrapeConfig {
  sourceType      : SourceType;
  sourceName?     : string;
  url?            : string;
  outputSubfolder?: string;
  conflictStrategy: ConflictStrategy;
  updateMode      : UpdateMode;
  saveToLibrary?  : boolean;
  scheduled?      : boolean;
  pdfFiles?       : string[];
  // per-source options
  depth?          : number;
  maxPages?       : number;
  delay?          : number;
  branch?         : string;
  fileTypes?      : string[];
  maxVideos?      : number;
  includeComments?: boolean;
  limit?          : number;
  query?          : string;
  cveIds?         : string;
  feedUrl?        : string;
}

export interface LogEntry {
  type    : 'info' | 'success' | 'error' | 'warn';
  message : string;
  time    : string;
}

export interface VaultStats {
  noteCount   : number;
  wordCount   : number;
  folderCount : number;
  totalSize?  : number;
  topFolders? : Array<{ name: string; count: number }>;
  topLinked?  : Array<{ name: string; links: number }>;
  recentNotes?: Array<{ name: string; mtime: number }>;
}

export interface DuplicateGroup {
  hash  : string;
  files : string[];
  size  : number;
}

export interface DeadLink {
  source : string;
  link   : string;
  type   : 'wikilink' | 'url';
  status?: number;
}

export interface UpdateInfo {
  hasUpdate : boolean;
  version?  : string;
  url?      : string;
  notes?    : string;
}

export interface HealthProgress {
  percent : number;
  message : string;
}
