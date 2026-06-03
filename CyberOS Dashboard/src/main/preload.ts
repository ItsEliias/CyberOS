// CyberOS Dashboard — preload.ts
// ItsEliias — contextBridge API v2.0
// Exposes both v1 compatibility channels and new dashboard-specific channels

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── Config & State ────────────────────────────────────────────────────────
  getState: (): Promise<any> => ipcRenderer.invoke('ecosystem:state'),
  getEvents: (): Promise<any[]> => ipcRenderer.invoke('ecosystem:events'),
  getEventHistory: (): Promise<any[]> => ipcRenderer.invoke('ecosystem:eventHistory'),
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),

  // ─── New Dashboard IPC ─────────────────────────────────────────────────────
  readConfig: (): Promise<any> => ipcRenderer.invoke('dashboard:config:read'),
  readEvents: (): Promise<any[]> => ipcRenderer.invoke('dashboard:events:read'),
  launchAppByKey: (appKey: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('dashboard:app:launch', appKey),
  startWatching: (): void => ipcRenderer.send('dashboard:watch:start'),

  // ─── App Actions ───────────────────────────────────────────────────────────
  launchApp: (execPath: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('app:launch', execPath),
  openUrl: (url: string): Promise<void> => ipcRenderer.invoke('shell:open', url),
  toggleFullscreen: (): Promise<void> => ipcRenderer.invoke('window:toggleFullscreen'),

  // ─── Push Listeners (main → renderer) ─────────────────────────────────────
  onStateUpdate: (cb: (cfg: any) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, cfg: any) => cb(cfg)
    ipcRenderer.on('ecosystem:update', listener)
    return () => ipcRenderer.removeListener('ecosystem:update', listener)
  },

  onEventsUpdate: (cb: (events: any[]) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, events: any[]) => cb(events)
    ipcRenderer.on('ecosystem:events', listener)
    return () => ipcRenderer.removeListener('ecosystem:events', listener)
  },

  onFullscreenChange: (cb: (v: boolean) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, v: boolean) => cb(v)
    ipcRenderer.on('window:fullscreen', listener)
    return () => ipcRenderer.removeListener('window:fullscreen', listener)
  },

  // ─── New Dashboard Push Listeners ──────────────────────────────────────────
  onConfigChanged: (cb: (cfg: any) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, cfg: any) => cb(cfg)
    ipcRenderer.on('dashboard:config:changed', listener)
    return () => ipcRenderer.removeListener('dashboard:config:changed', listener)
  },

  onEventsChanged: (cb: (events: any[]) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, events: any[]) => cb(events)
    ipcRenderer.on('dashboard:events:changed', listener)
    return () => ipcRenderer.removeListener('dashboard:events:changed', listener)
  },
})
