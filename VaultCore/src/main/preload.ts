import { contextBridge, ipcRenderer } from 'electron';
import type {
  VaultCoreConfig, Source, ScrapeConfig, ScrapeResult,
  ScrapeProgress, VaultStats, DuplicateGroup, DeadLink,
  UpdateInfo, HealthProgress, ThemeConfig
} from '../shared/types.js';

const api = {
  // ── Config ────────────────────────────────────────────────────────────────
  getConfig      : ()          => ipcRenderer.invoke('get-config') as Promise<VaultCoreConfig>,
  setConfig      : (k: string, v: unknown) => ipcRenderer.invoke('set-config', k, v) as Promise<boolean>,
  configExists   : ()          => ipcRenderer.invoke('config-exists') as Promise<boolean>,
  getVaultPath   : ()          => ipcRenderer.invoke('get-vault-path') as Promise<string | null>,
  setVaultPath   : (vp: string) => ipcRenderer.invoke('set-vault-path', vp) as Promise<boolean>,
  getTheme       : ()          => ipcRenderer.invoke('get-theme') as Promise<ThemeConfig | string>,
  setTheme       : (t: ThemeConfig) => ipcRenderer.invoke('set-theme', t) as Promise<boolean>,
  isCyberLabInstalled: () => ipcRenderer.invoke('is-cyberlab-installed') as Promise<boolean>,
  openCyberLab   : ()          => ipcRenderer.invoke('open-cyberlab') as Promise<boolean>,

  // ── Dialogs ───────────────────────────────────────────────────────────────
  selectFolder   : ()           => ipcRenderer.invoke('select-folder') as Promise<string | null>,
  selectFile     : (filters?: Electron.FileFilter[]) => ipcRenderer.invoke('select-file', filters) as Promise<string | null>,
  selectFiles    : (filters?: Electron.FileFilter[]) => ipcRenderer.invoke('select-files', filters) as Promise<string[]>,

  // ── Shell ─────────────────────────────────────────────────────────────────
  openVaultInObsidian: (vp?: string) => ipcRenderer.invoke('open-vault-in-obsidian', vp) as Promise<boolean>,
  openFolder         : (p: string)   => ipcRenderer.invoke('open-folder', p) as Promise<boolean>,
  openExternal       : (url: string) => ipcRenderer.invoke('open-external', url) as Promise<boolean>,

  // ── Scraping ──────────────────────────────────────────────────────────────
  startScrape    : (cfg: ScrapeConfig) => ipcRenderer.invoke('start-scrape', cfg) as Promise<{ success?: boolean; result?: ScrapeResult; error?: string }>,
  pauseScrape    : ()            => ipcRenderer.invoke('pause-scrape') as Promise<boolean>,
  resumeScrape   : ()            => ipcRenderer.invoke('resume-scrape') as Promise<boolean>,
  stopScrape     : ()            => ipcRenderer.invoke('stop-scrape') as Promise<boolean>,
  retryFailed    : (cfg: ScrapeConfig) => ipcRenderer.invoke('retry-failed', cfg) as Promise<unknown>,

  // ── Source Library ────────────────────────────────────────────────────────
  getSources     : ()        => ipcRenderer.invoke('get-sources') as Promise<Source[]>,
  addSource      : (s: Partial<Source>) => ipcRenderer.invoke('add-source', s) as Promise<Source>,
  updateSource   : (id: string, s: Partial<Source>) => ipcRenderer.invoke('update-source', id, s) as Promise<Source>,
  deleteSource   : (id: string) => ipcRenderer.invoke('delete-source', id) as Promise<boolean>,
  getSourceHealth: ()        => ipcRenderer.invoke('get-source-health') as Promise<unknown>,
  scrapeSourceNow: (id: string) => ipcRenderer.invoke('scrape-source-now', id) as Promise<{ success?: boolean; error?: string }>,
  updateSourceSchedule: (id: string, schedule: Record<string, unknown>) =>
    ipcRenderer.invoke('update-source-schedule', id, schedule) as Promise<Source | { error: string }>,
  getActiveScrape: () =>
    ipcRenderer.invoke('get-active-scrape') as Promise<{ sourceName: string; progress: number; startTime: number; paused?: boolean } | null>,
  computeNextRun: (cronExpression: string) =>
    ipcRenderer.invoke('compute-next-run', cronExpression) as Promise<string | null>,

  // ── Vault Health ──────────────────────────────────────────────────────────
  getVaultStats            : ()                   => ipcRenderer.invoke('get-vault-stats') as Promise<VaultStats | null>,
  runDuplicateCheck        : ()                   => ipcRenderer.invoke('run-duplicate-check') as Promise<DuplicateGroup[]>,
  runDeadLinkCheck         : ()                   => ipcRenderer.invoke('run-dead-link-check') as Promise<DeadLink[]>,
  cleanMarkdown            : (opts: unknown)      => ipcRenderer.invoke('clean-markdown', opts) as Promise<unknown>,
  splitNote                : (fp: string, sp: unknown) => ipcRenderer.invoke('split-note', fp, sp) as Promise<unknown>,
  analyseNoteHeadings      : (fp: string)         => ipcRenderer.invoke('analyse-note-headings', fp) as Promise<unknown>,
  mergeNotes               : (a: string, b: string, kp: string) => ipcRenderer.invoke('merge-notes', a, b, kp) as Promise<unknown>,
  deleteNote               : (fp: string)         => ipcRenderer.invoke('delete-note', fp) as Promise<boolean>,
  exportDeadLinksCsv       : (r: unknown)         => ipcRenderer.invoke('export-dead-links-csv', r) as Promise<unknown>,
  archiveWayback           : (url: string)        => ipcRenderer.invoke('archive-wayback', url) as Promise<boolean>,
  generateKnowledgeGapReport: ()                  => ipcRenderer.invoke('generate-knowledge-gap-report') as Promise<unknown>,
  validateLinks            : (fp?: string)        => ipcRenderer.invoke('validate-links', fp) as Promise<{ live?: string[]; dead?: string[] }>,
  generateCanvas           : (sn: string, of_: string) => ipcRenderer.invoke('generate-canvas', sn, of_) as Promise<unknown>,

  // ── File System ───────────────────────────────────────────────────────────
  readFile         : (fp: string)         => ipcRenderer.invoke('read-file', fp) as Promise<string | null>,
  writeFile        : (fp: string, c: string) => ipcRenderer.invoke('write-file', fp, c) as Promise<boolean>,
  fileExists       : (fp: string)         => ipcRenderer.invoke('file-exists', fp) as Promise<boolean>,
  listVaultNotes   : (folder?: string)    => ipcRenderer.invoke('list-vault-notes', folder) as Promise<string[]>,
  getVaultNoteCount: ()                   => ipcRenderer.invoke('get-vault-note-count') as Promise<number>,

  // ── Conflict ──────────────────────────────────────────────────────────────
  getConflictDiff : (a: string, b: string) => ipcRenderer.invoke('get-conflict-diff', a, b) as Promise<unknown>,
  resolveConflict : (r: unknown)           => ipcRenderer.invoke('resolve-conflict', r) as Promise<unknown>,

  // ── Settings ──────────────────────────────────────────────────────────────
  factoryReset           : ()  => ipcRenderer.invoke('factory-reset') as Promise<boolean>,
  checkForUpdates        : ()  => ipcRenderer.invoke('check-for-updates') as Promise<UpdateInfo>,
  getAppVersion          : ()  => ipcRenderer.invoke('get-app-version') as Promise<string>,
  detectObsidianPlugins  : ()  => ipcRenderer.invoke('detect-obsidian-plugins') as Promise<string[]>,
  focusWindow            : ()  => ipcRenderer.invoke('focus-window') as Promise<boolean>,

  // ── Scrape State ──────────────────────────────────────────────────────────
  saveScrapeResumeState  : (s: unknown) => ipcRenderer.invoke('save-scrape-resume-state', s) as Promise<boolean>,
  loadScrapeResumeState  : ()           => ipcRenderer.invoke('load-scrape-resume-state') as Promise<unknown>,
  clearScrapeResumeState : ()           => ipcRenderer.invoke('clear-scrape-resume-state') as Promise<boolean>,

  // ── Push Events ───────────────────────────────────────────────────────────
  onScrapeProgress     : (cb: (d: ScrapeProgress) => void) => {
    const fn = (_: Electron.IpcRendererEvent, d: ScrapeProgress) => cb(d);
    ipcRenderer.on('scrape-progress', fn);
    return () => ipcRenderer.removeListener('scrape-progress', fn);
  },
  onScrapeComplete     : (cb: (d: { result?: ScrapeResult; source?: string }) => void) => {
    const fn = (_: Electron.IpcRendererEvent, d: { result?: ScrapeResult; source?: string }) => cb(d);
    ipcRenderer.on('scrape-complete', fn);
    return () => ipcRenderer.removeListener('scrape-complete', fn);
  },
  onScrapeError        : (cb: (d: { error: string }) => void) => {
    const fn = (_: Electron.IpcRendererEvent, d: { error: string }) => cb(d);
    ipcRenderer.on('scrape-error', fn);
    return () => ipcRenderer.removeListener('scrape-error', fn);
  },
  onScheduleComplete   : (cb: (d: { source: string; result: ScrapeResult }) => void) => {
    const fn = (_: Electron.IpcRendererEvent, d: { source: string; result: ScrapeResult }) => cb(d);
    ipcRenderer.on('schedule-complete', fn);
    return () => ipcRenderer.removeListener('schedule-complete', fn);
  },
  onUpdateAvailable    : (cb: (d: UpdateInfo) => void) => {
    const fn = (_: Electron.IpcRendererEvent, d: UpdateInfo) => cb(d);
    ipcRenderer.on('update-available', fn);
    return () => ipcRenderer.removeListener('update-available', fn);
  },
  onVaultHealthProgress: (cb: (d: HealthProgress) => void) => {
    const fn = (_: Electron.IpcRendererEvent, d: HealthProgress) => cb(d);
    ipcRenderer.on('vault-health-progress', fn);
    return () => ipcRenderer.removeListener('vault-health-progress', fn);
  },
  onTrayPauseScrape    : (cb: () => void) => {
    const fn = () => cb();
    ipcRenderer.on('tray-pause-scrape', fn);
    return () => ipcRenderer.removeListener('tray-pause-scrape', fn);
  },
  onPendingAction      : (cb: (action: string) => void) => {
    const fn = (_: Electron.IpcRendererEvent, action: string) => cb(action);
    ipcRenderer.on('pending-action', fn);
    return () => ipcRenderer.removeListener('pending-action', fn);
  },

  // ── Ecosystem ─────────────────────────────────────────────────────────────
  ecosystemEmit: (appName: string, eventType: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('ecosystem-emit', appName, eventType, data) as Promise<void>,

  // ── Secret Detection ──────────────────────────────────────────────────────
  scanDirectory: (dirPath: string) =>
    ipcRenderer.invoke('scan-directory', dirPath) as Promise<{ results?: Array<{ filePath: string; lineNumber: number; patternType: string; rawValue: string }>; filesScanned?: number; duration?: number; error?: string }>,

  gitBranches: (repoPath: string) =>
    ipcRenderer.invoke('git-branches', repoPath) as Promise<{ branches?: string[]; error?: string }>,

  gitCurrentBranch: (repoPath: string) =>
    ipcRenderer.invoke('git-current-branch', repoPath) as Promise<{ branch?: string; error?: string }>,

  gitDiffBranches: (repoPath: string, branch1: string, branch2: string) =>
    ipcRenderer.invoke('git-diff-branches', repoPath, branch1, branch2) as Promise<{ diff?: string; error?: string }>,

  gitPull: (repoPath: string) =>
    ipcRenderer.invoke('git-pull', repoPath) as Promise<{ success?: boolean; output?: string; error?: string }>,

  gitFindConflicts: (repoPath: string) =>
    ipcRenderer.invoke('git-find-conflicts', repoPath) as Promise<{ conflictFiles?: string[]; error?: string }>,

  resolveConflictFile: (filePath: string, resolvedContent: string) =>
    ipcRenderer.invoke('resolve-conflict-file', filePath, resolvedContent) as Promise<{ success?: boolean; error?: string }>,

  getCertExpiry: (certPath: string) =>
    ipcRenderer.invoke('get-cert-expiry', certPath) as Promise<{ expiresAt?: string; error?: string }>,

  exportBackup: (secrets: unknown[], password: string) =>
    ipcRenderer.invoke('export-backup', secrets, password) as Promise<{ success?: boolean; filePath?: string; canceled?: boolean; error?: string }>,

  importBackup: (password: string) =>
    ipcRenderer.invoke('import-backup', password) as Promise<{ success?: boolean; data?: unknown; canceled?: boolean; error?: string }>,

  credvaultRead: () =>
    ipcRenderer.invoke('credvault-read') as Promise<{ success?: boolean; data?: unknown; error?: string }>,

  credvaultPush: (entries: unknown[]) =>
    ipcRenderer.invoke('credvault-push', entries) as Promise<{ success?: boolean; error?: string }>,

  // SSO soft-lock: ask main whether CredVault has an active session.
  getSSO       : () =>
    ipcRenderer.invoke('get-sso') as Promise<{ unlocked: boolean; expiresAt?: string | null }>,
  openCredVault: () =>
    ipcRenderer.invoke('open-credvault') as Promise<boolean>,
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type VaultCoreAPI = typeof api;
