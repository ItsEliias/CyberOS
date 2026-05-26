// CyberOS Dashboard — preload.ts
// ItsEliias — contextBridge API

import { contextBridge, ipcRenderer } from 'electron'
import type { EcosystemConfig, EcosystemEvent } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  getState:   (): Promise<EcosystemConfig>       => ipcRenderer.invoke('ecosystem:state'),
  getEvents:  (): Promise<EcosystemEvent[]>      => ipcRenderer.invoke('ecosystem:events'),
  getVersion: (): Promise<string>                => ipcRenderer.invoke('app:version'),
  launchApp:  (execPath: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('app:launch', execPath),
  openUrl:    (url: string): Promise<void>       => ipcRenderer.invoke('shell:open', url),

  // Push listeners — main → renderer
  onStateUpdate: (cb: (cfg: EcosystemConfig) => void) => {
    ipcRenderer.on('ecosystem:update', (_e, cfg) => cb(cfg))
    return () => ipcRenderer.removeAllListeners('ecosystem:update')
  },
  onEventsUpdate: (cb: (events: EcosystemEvent[]) => void) => {
    ipcRenderer.on('ecosystem:events', (_e, events) => cb(events))
    return () => ipcRenderer.removeAllListeners('ecosystem:events')
  },
})
