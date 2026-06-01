// ReconDesk — preload.ts
// ItsEliias — contextBridge API surface

import { contextBridge, ipcRenderer } from 'electron'
import type { ReconDeskData } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  loadData:   (): Promise<ReconDeskData>        => ipcRenderer.invoke('data:load'),
  saveData:   (data: ReconDeskData): Promise<boolean> => ipcRenderer.invoke('data:save', data),
  getVersion: (): Promise<string>               => ipcRenderer.invoke('app:version'),
  openUrl:    (url: string): Promise<void>      => ipcRenderer.invoke('shell:open', url),
})
