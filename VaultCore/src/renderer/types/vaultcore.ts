// VaultCore — Type Definitions

export type SourceType =
  | 'obsidian-publish'
  | 'website'
  | 'github'
  | 'youtube'
  | 'pdf'
  | 'reddit'
  | 'twitter'
  | 'notion'
  | 'medium'
  | 'cve'
  | 'rss';

export type SourceInterval = 'hourly' | 'daily' | 'weekly' | 'manual';
export type SourceHealth = 'healthy' | 'warning' | 'error';
export type ActiveView = 'dashboard' | 'sources' | 'history' | 'health' | 'settings';

// ── Secret Detection Types ────────────────────────────────────────────────────

export type SecretPatternType =
  | 'aws_key'
  | 'private_key'
  | 'jwt'
  | 'generic_api_key'
  | 'high_entropy';

export type SecretEnv = 'development' | 'staging' | 'production' | 'unknown';

export type SecretType =
  | 'api_key'
  | 'password'
  | 'certificate'
  | 'token'
  | 'private_key'
  | 'other';

export interface DetectedSecret {
  id: string;
  repoId: string;
  filePath: string;
  lineNumber: number;
  patternType: SecretPatternType;
  maskedValue: string;
  entropy?: number;
  environment: SecretEnv;
  secretType: SecretType;
  comment?: string;
  expiresAt?: string;
  rotationHistory: RotationEvent[];
  revealedAt?: number;
  tags: string[];
  referenceUrl?: string;
}

export interface RotationEvent {
  timestamp: string;
  oldValueMasked: string;
  newValueMasked: string;
  rotatedBy: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'view' | 'reveal' | 'rotate' | 'export' | 'import' | 'scan';
  secretId?: string;
  secretFile?: string;
  user: string;
  detail?: string;
}

export interface ScanResult {
  repoId: string;
  scannedAt: string;
  secrets: DetectedSecret[];
  filesScanned: number;
  duration: number;
}

export interface Repository {
  id: string;
  name: string;
  path: string;
  currentBranch: string;
  branches: string[];
  lastScanAt?: string;
  secretCount: number;
}

export interface ConflictBlock {
  marker: string;
  oursLines: string[];
  theirsLines: string[];
  startLine: number;
  resolved?: 'ours' | 'theirs' | 'manual';
  manualContent?: string;
}

export interface GitDiffLine {
  lineNumber: number;
  content: string;
  type: 'added' | 'removed' | 'context';
  hasSecret?: boolean;
}

export interface GitFileDiff {
  filePath: string;
  hunks: GitDiffHunk[];
}

export interface GitDiffHunk {
  header: string;
  lines: GitDiffLine[];
}

export interface ScrapingSource {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  enabled: boolean;
  interval: SourceInterval;
  outputPath: string;
  lastScrapeAt?: string;
  lastSuccessAt?: string;
  consecutiveFailures: number;
  health: SourceHealth;
  totalNotesSaved: number;
  tags: string[];
  config?: Record<string, unknown>;
  lastError?: string;
}

export type ScrapeRunStatus = 'running' | 'completed' | 'failed';

export interface ScrapeRun {
  id: string;
  sourceId: string;
  sourceName: string;
  startedAt: string;
  completedAt?: string;
  status: ScrapeRunStatus;
  result?: ScrapeResultData;
  error?: string;
  duration?: number;
}

export interface ScrapeResultData {
  newNotes: number;
  updatedNotes: number;
  unchangedNotes: number;
  totalNotes: number;
  suggestedTags: string[];
  diffs: NoteDiff[];
}

export type NoteDiffType = 'new' | 'updated' | 'unchanged';

export interface NoteDiff {
  path: string;
  type: NoteDiffType;
  oldFirstLine?: string;
  newFirstLine?: string;
  changePercent?: number;
}

export interface TagRule {
  category: string;
  tag: string;
  keywords: string[];
}

export interface VaultStats {
  totalNotes: number;
  byFolder: { folder: string; count: number }[];
  addedToday: number;
}

export interface TagReviewPending {
  sourceId: string;
  suggestedTags: string[];
  selectedTags: string[];
  notesToSave: { path: string; content: string }[];
}

export interface VaultCoreSettings {
  vaultPath: string;
  autoCreateDirs: boolean;
  schedulingEnabled: boolean;
  defaultInterval: SourceInterval;
  failureThreshold: number;
  autoDisableAfterFailures: boolean;
  autoTagEnabled: boolean;
  tagRules: TagRule[];
}
