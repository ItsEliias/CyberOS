// ═══════════════════════════════════════════════════════════
//   GHOSTVAULT — preload.js
//   ItsEliias // v1.0 — Secure context bridge
// ═══════════════════════════════════════════════════════════

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ghostvault', {
  // Config
  getConfig:       ()              => ipcRenderer.invoke('get-config'),
  saveConfig:      (cfg)           => ipcRenderer.invoke('save-config', cfg),
  getVersion:      ()              => ipcRenderer.invoke('get-version'),

  // AI is fully local (local-ai.js) — no API key needed

  // Window
  setAlwaysOnTop:  (v)             => ipcRenderer.invoke('set-always-on-top', v),
  getAlwaysOnTop:  ()              => ipcRenderer.invoke('get-always-on-top'),
  minimizeWindow:  ()              => ipcRenderer.invoke('minimize-window'),
  closeWindow:     ()              => ipcRenderer.invoke('close-window'),

  // Vault
  pickVaultDir:    (opts)          => ipcRenderer.invoke('pick-vault-dir', opts || {}),
  listNotes:       (vaultPath)     => ipcRenderer.invoke('list-notes', vaultPath),
  readNote:        (filePath)      => ipcRenderer.invoke('read-note', filePath),
  writeNote:       (filePath, c)   => ipcRenderer.invoke('write-note', filePath, c),
  deleteNote:      (filePath)      => ipcRenderer.invoke('delete-note', filePath),
  renameNote:      (old, nw)       => ipcRenderer.invoke('rename-note', old, nw),
  newNote:         (vp, folder, t) => ipcRenderer.invoke('new-note', vp, folder, t),
  createFolder:    (vp, name)      => ipcRenderer.invoke('create-folder', vp, name),
  listFolders:     (vp)            => ipcRenderer.invoke('list-folders', vp),
  revealInFinder:  (p)             => ipcRenderer.invoke('reveal-in-finder', p),
  openExternal:    (url)           => ipcRenderer.invoke('open-external', url),

  // Capture window
  toggleCapture:      ()           => ipcRenderer.invoke('toggle-capture'),
  hideCapture:        ()           => ipcRenderer.invoke('hide-capture'),
  minimizeCapture:    ()           => ipcRenderer.invoke('minimize-capture'),
  saveCaptureNote:    (data)       => ipcRenderer.invoke('save-capture-note', data),
  getCaptureTheme:    ()           => ipcRenderer.invoke('get-capture-theme'),
  saveCaptureTheme:   (theme)      => ipcRenderer.invoke('save-capture-theme', theme),

  // Ollama AI
  ollamaCheck:        ()           => ipcRenderer.invoke('ollama-check'),
  ollamaFormat:       (data)       => ipcRenderer.invoke('ollama-format', data),

  // Events from main → renderer
  onQuickCapture:  (cb)            => ipcRenderer.on('quick-capture', cb),
  onCaptureFolders:(cb)            => ipcRenderer.on('capture-folders', (_, folders) => cb(folders)),
  onVaultRefresh:  (cb)            => ipcRenderer.on('vault-refresh', cb),
});

contextBridge.exposeInMainWorld('electronAPI', {
  ecosystemEmit: (appName, eventType, data) => ipcRenderer.invoke('ecosystem-emit', appName, eventType, data),
});
