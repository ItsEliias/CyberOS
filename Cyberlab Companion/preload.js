// preload.js — contextBridge API surface (renderer ↔ main process)
// Only exposes what the renderer strictly needs — principle of least privilege

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  // ─── Config ───────────────────────────────────────────────────────────
  getConfig:   ()           => ipcRenderer.invoke('get-config'),
  saveConfig:  (cfg)        => ipcRenderer.invoke('save-config', cfg),
  getOutputDir:()           => ipcRenderer.invoke('get-output-dir'),

  // ─── API Key ──────────────────────────────────────────────────────────
  saveApiKey:  (key)        => ipcRenderer.invoke('save-api-key', key),
  testApiKey:  (key)        => ipcRenderer.invoke('test-api-key', key),
  hasApiKey:   ()           => ipcRenderer.invoke('has-api-key'),

  // ─── Claude API ───────────────────────────────────────────────────────
  claudeChat:  (payload)    => ipcRenderer.invoke('claude-chat', payload),

  // ─── Sessions ─────────────────────────────────────────────────────────
  saveSession: (data)       => ipcRenderer.invoke('save-session', data),
  loadSession: (id)         => ipcRenderer.invoke('load-session', id),
  listSessions:()           => ipcRenderer.invoke('list-sessions'),
  deleteSession:(id)        => ipcRenderer.invoke('delete-session', id),

  // ─── Writeups ─────────────────────────────────────────────────────────
  saveWriteup: (data)       => ipcRenderer.invoke('save-writeup', data),
  exportPDF:   (data)       => ipcRenderer.invoke('export-pdf', data),

  // ─── Vault ────────────────────────────────────────────────────────────
  scanVault:   (path)       => ipcRenderer.invoke('scan-vault', path),
  pickFolder:  ()           => ipcRenderer.invoke('pick-folder'),

  // ─── VPN ──────────────────────────────────────────────────────────────
  checkVPN:    ()           => ipcRenderer.invoke('check-vpn'),

  // ─── Update ───────────────────────────────────────────────────────────
  checkUpdate: ()           => ipcRenderer.invoke('check-update'),

  // ─── HTB / THM ────────────────────────────────────────────────────────
  syncHTB:     (apiKey)     => ipcRenderer.invoke('sync-htb', apiKey),
  syncTHM:     (username)   => ipcRenderer.invoke('sync-thm', username),

  // ─── Launcher ─────────────────────────────────────────────────────────
  updateLauncherStatus: (status) => ipcRenderer.invoke('update-launcher-status', status),

  // ─── Progress Data ────────────────────────────────────────────────────
  saveProgress: (data)      => ipcRenderer.invoke('save-progress', data),
  loadProgress: ()          => ipcRenderer.invoke('load-progress'),

  // ─── Lab Tracker ──────────────────────────────────────────────────────
  saveLabTracker: (data)    => ipcRenderer.invoke('save-lab-tracker', data),
  loadLabTracker: ()        => ipcRenderer.invoke('load-lab-tracker'),

  // ─── Snippets ─────────────────────────────────────────────────────────
  saveSnippets: (data)      => ipcRenderer.invoke('save-snippets', data),
  loadSnippets: ()          => ipcRenderer.invoke('load-snippets'),

  // ─── Shell / External ─────────────────────────────────────────────────
  openExternal: (url)       => ipcRenderer.invoke('open-external', url),
  getVersion:   ()          => ipcRenderer.invoke('get-version'),
  getPlatform:  ()          => ipcRenderer.invoke('get-platform'),

  // ─── Events from main ─────────────────────────────────────────────────
  onUpdateAvailable: (cb)   => {
    ipcRenderer.on('update-available', (_, data) => cb(data));
  },
  onFocusWindow: (cb) => {
    ipcRenderer.on('focus-window', () => cb());
  },
  onAutosaveTick: (cb) => {
    ipcRenderer.on('autosave-tick', () => cb());
  },
  onVpnStatus: (cb) => {
    ipcRenderer.on('vpn-status', (_, data) => cb(data));
  },

  // ─── Ecosystem event bus ──────────────────────────────────────────────
  ecosystemEmit: (appName, eventType, data) => ipcRenderer.invoke('ecosystem-emit', appName, eventType, data),

  // ─── Remove listeners (cleanup) ───────────────────────────────────────
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
