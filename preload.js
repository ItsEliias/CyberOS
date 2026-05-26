'use strict';
/**
 * preload.js — contextBridge API surface
 * Exposes a safe, typed API to the renderer process.
 * No Node.js APIs bleed through — everything routes via IPC.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {

  // ── Config ────────────────────────────────────────────────────────────────
  getConfig       : ()        => ipcRenderer.invoke('get-config'),
  saveConfig      : (updates) => ipcRenderer.invoke('save-config', updates),
  saveConfigDeep  : (updates) => ipcRenderer.invoke('save-config-deep', updates),

  // ── App actions ───────────────────────────────────────────────────────────
  launchApp  : (appKey) => ipcRenderer.invoke('launch-app', appKey),
  updateNow  : ()       => ipcRenderer.invoke('update-now'),
  hidePanel  : ()       => ipcRenderer.invoke('hide-panel'),

  // ── VPN ───────────────────────────────────────────────────────────────────
  getVpnStatus : () => ipcRenderer.invoke('get-vpn-status'),

  // ── Dialogs ───────────────────────────────────────────────────────────────
  openFilePicker   : (opts) => ipcRenderer.invoke('open-file-picker', opts),
  openFolderPicker : ()     => ipcRenderer.invoke('open-folder-picker'),
  checkFileExists  : (p)    => ipcRenderer.invoke('check-file-exists', p),

  // ── Activity ──────────────────────────────────────────────────────────────
  clearActivity : ()      => ipcRenderer.invoke('clear-activity'),
  addActivity   : (entry) => ipcRenderer.invoke('add-activity', entry),

  // ── App meta ──────────────────────────────────────────────────────────────
  getVersion : () => ipcRenderer.invoke('get-version'),

  // ── Custom slots ──────────────────────────────────────────────────────────
  addCustomSlot    : (slot)         => ipcRenderer.invoke('add-custom-slot', slot),
  removeCustomSlot : (index)        => ipcRenderer.invoke('remove-custom-slot', index),
  updateCustomSlot : (index, slot)  => ipcRenderer.invoke('update-custom-slot', { index, slot }),

  // ── External links ────────────────────────────────────────────────────────
  openExternal : (url) => ipcRenderer.invoke('open-external', url),

  // ── Push events from main → renderer ─────────────────────────────────────
  onConfigUpdate : (cb) => {
    ipcRenderer.on('config-update', (_e, config) => cb(config));
  },
  onVpnUpdate : (cb) => {
    ipcRenderer.on('vpn-update', (_e, status) => cb(status));
  },
  onUpdateAvailable : (cb) => {
    ipcRenderer.on('update-available', (_e, info) => cb(info));
  },
  onSplashComplete : (cb) => {
    ipcRenderer.once('splash-complete', () => cb());
  },
  onPanelShown : (cb) => {
    ipcRenderer.on('panel-shown', () => cb());
  },
  onOpenSettings : (cb) => {
    ipcRenderer.on('open-settings', () => cb());
  },

  // ── One-way signals renderer → main ──────────────────────────────────────
  signalHideAfterSplash : () => ipcRenderer.send('hide-after-splash'),

  // ── Ecosystem event bus ───────────────────────────────────────────────────
  ecosystemReadEvents : () => ipcRenderer.invoke('ecosystem-read-events'),
  ecosystemEmit       : (appName, eventType, data) => ipcRenderer.invoke('ecosystem-emit', appName, eventType, data),
  onEcosystemUpdated  : (cb) => ipcRenderer.on('ecosystem-events-updated', (_, events) => cb(events))
});
