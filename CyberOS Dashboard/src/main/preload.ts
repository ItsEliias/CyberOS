// CyberOS Dashboard — preload.ts
// ItsEliias — contextBridge API

import { contextBridge, ipcRenderer } from 'electron'
import type { EcosystemConfig, EcosystemEvent } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  getState:         (): Promise<EcosystemConfig>       => ipcRenderer.invoke('ecosystem:state'),
  getEvents:        (): Promise<EcosystemEvent[]>      => ipcRenderer.invoke('ecosystem:events'),
  getVersion:       (): Promise<string>                => ipcRenderer.invoke('app:version'),
  launchApp:        (execPath: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('app:launch', execPath),
  openUrl:          (url: string): Promise<void>       => ipcRenderer.invoke('shell:open', url),
  toggleFullscreen: (): Promise<void>                  => ipcRenderer.invoke('window:toggleFullscreen'),
  getEventHistory:  (): Promise<EcosystemEvent[]>      => ipcRenderer.invoke('ecosystem:eventHistory'),

  // Push listeners — main → renderer
  onStateUpdate: (cb: (cfg: EcosystemConfig) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, cfg: EcosystemConfig) => cb(cfg)
    ipcRenderer.on('ecosystem:update', listener)
    return () => ipcRenderer.removeListener('ecosystem:update', listener)
  },
  onEventsUpdate: (cb: (events: EcosystemEvent[]) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, events: EcosystemEvent[]) => cb(events)
    ipcRenderer.on('ecosystem:events', listener)
    return () => ipcRenderer.removeListener('ecosystem:events', listener)
  },
  onFullscreenChange: (cb: (v: boolean) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, v: boolean) => cb(v)
    ipcRenderer.on('window:fullscreen', listener)
    return () => ipcRenderer.removeListener('window:fullscreen', listener)
  },
})
