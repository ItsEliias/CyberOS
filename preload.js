'use strict';
// preload.js — contextBridge API surface
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── Config ──────────────────────────────────────────────────────────────────
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  configExists: () => ipcRenderer.invoke('config-exists'),
  getVaultPath: () => ipcRenderer.invoke('get-vault-path'),
  setVaultPath: (vp) => ipcRenderer.invoke('set-vault-path', vp),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  isCyberLabInstalled: () => ipcRenderer.invoke('is-cyberlab-installed'),
  openCyberLab: () => ipcRenderer.invoke('open-cyberlab'),

  // ─── Dialogs ─────────────────────────────────────────────────────────────────
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
  selectFiles: (filters) => ipcRenderer.invoke('select-files', filters),

  // ─── Shell ───────────────────────────────────────────────────────────────────
  openVaultInObsidian: (vaultPath) => ipcRenderer.invoke('open-vault-in-obsidian', vaultPath),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // ─── Scraping ────────────────────────────────────────────────────────────────
  startScrape: (config) => ipcRenderer.invoke('start-scrape', config),
  pauseScrape: () => ipcRenderer.invoke('pause-scrape'),
  resumeScrape: () => ipcRenderer.invoke('resume-scrape'),
  stopScrape: () => ipcRenderer.invoke('stop-scrape'),
  retryFailed: (config) => ipcRenderer.invoke('retry-failed', config),

  // ─── Source Library ───────────────────────────────────────────────────────────
  getSources: () => ipcRenderer.invoke('get-sources'),
  addSource: (source) => ipcRenderer.invoke('add-source', source),
  updateSource: (id, source) => ipcRenderer.invoke('update-source', id, source),
  deleteSource: (id) => ipcRenderer.invoke('delete-source', id),
  getSourceHealth: () => ipcRenderer.invoke('get-source-health'),
  scrapeSourceNow: (sourceId) => ipcRenderer.invoke('scrape-source-now', sourceId),

  // ─── Vault Health ─────────────────────────────────────────────────────────────
  getVaultStats: () => ipcRenderer.invoke('get-vault-stats'),
  runDuplicateCheck: () => ipcRenderer.invoke('run-duplicate-check'),
  runDeadLinkCheck: () => ipcRenderer.invoke('run-dead-link-check'),
  cleanMarkdown: (options) => ipcRenderer.invoke('clean-markdown', options),
  splitNote: (filePath, splitPoints) => ipcRenderer.invoke('split-note', filePath, splitPoints),
  analyseNoteHeadings: (filePath) => ipcRenderer.invoke('analyse-note-headings', filePath),
  mergeNotes: (noteA, noteB, keepPath) => ipcRenderer.invoke('merge-notes', noteA, noteB, keepPath),
  deleteNote: (filePath) => ipcRenderer.invoke('delete-note', filePath),
  exportDeadLinksCsv: (results) => ipcRenderer.invoke('export-dead-links-csv', results),
  archiveWayback: (url) => ipcRenderer.invoke('archive-wayback', url),
  generateKnowledgeGapReport: () => ipcRenderer.invoke('generate-knowledge-gap-report'),
  validateLinks: (folderPath) => ipcRenderer.invoke('validate-links', folderPath),
  generateCanvas: (sourceName, outputFolder) => ipcRenderer.invoke('generate-canvas', sourceName, outputFolder),

  // ─── File System ─────────────────────────────────────────────────────────────
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  listVaultNotes: (folderPath) => ipcRenderer.invoke('list-vault-notes', folderPath),
  getVaultNoteCount: () => ipcRenderer.invoke('get-vault-note-count'),

  // ─── Conflict ────────────────────────────────────────────────────────────────
  getConflictDiff: (fileA, fileB) => ipcRenderer.invoke('get-conflict-diff', fileA, fileB),
  resolveConflict: (resolution) => ipcRenderer.invoke('resolve-conflict', resolution),

  // ─── Settings ────────────────────────────────────────────────────────────────
  factoryReset: () => ipcRenderer.invoke('factory-reset'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  detectObsidianPlugins: () => ipcRenderer.invoke('detect-obsidian-plugins'),
  focusWindow: () => ipcRenderer.invoke('focus-window'),

  // ─── Scrape State Persistence ─────────────────────────────────────────────────
  saveScrapeResumeState: (state) => ipcRenderer.invoke('save-scrape-resume-state', state),
  loadScrapeResumeState: () => ipcRenderer.invoke('load-scrape-resume-state'),
  clearScrapeResumeState: () => ipcRenderer.invoke('clear-scrape-resume-state'),

  // ─── Events from main ────────────────────────────────────────────────────────
  onScrapeProgress: (cb) => ipcRenderer.on('scrape-progress', (_, data) => cb(data)),
  onScrapeComplete: (cb) => ipcRenderer.on('scrape-complete', (_, data) => cb(data)),
  onScrapeError: (cb) => ipcRenderer.on('scrape-error', (_, data) => cb(data)),
  onScheduleComplete: (cb) => ipcRenderer.on('schedule-complete', (_, data) => cb(data)),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, data) => cb(data)),
  onVaultHealthProgress: (cb) => ipcRenderer.on('vault-health-progress', (_, data) => cb(data)),
  onTrayPauseScrape: (cb) => ipcRenderer.on('tray-pause-scrape', () => cb()),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // ─── Ecosystem Event Bus ──────────────────────────────────────────────────────
  ecosystemEmit: (appName, eventType, data) => ipcRenderer.invoke('ecosystem-emit', appName, eventType, data)
});
