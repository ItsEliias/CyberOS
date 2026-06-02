// ReconDesk — preload.ts
// ItsEliias — contextBridge API surface

import { contextBridge, ipcRenderer } from 'electron'
import type { ReconDeskData, CveResult } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  loadData:      (): Promise<ReconDeskData>        => ipcRenderer.invoke('data:load'),
  saveData:      (data: ReconDeskData): Promise<boolean> => ipcRenderer.invoke('data:save', data),
  getVersion:    (): Promise<string>               => ipcRenderer.invoke('app:version'),
  openUrl:       (url: string): Promise<void>      => ipcRenderer.invoke('shell:open', url),
  exportTarget:  (p: { json: string; md: string; defaultName: string }) => ipcRenderer.invoke('export-target', p) as Promise<{ ok: boolean; filePath?: string }>,
  cveLookup:     (service: string, version: string) => ipcRenderer.invoke('cve:lookup', service, version) as Promise<CveResult[]>,
  flagCaptured:  (): Promise<void>                 => ipcRenderer.invoke('flag:captured'),

  // fs.watch IPC bus — fires when any other app writes to cybertools-config.json
  onConfigUpdated: (cb: (data: Record<string, unknown>) => void) =>
    ipcRenderer.on('config:updated', (_e, data) => cb(data)),
})
