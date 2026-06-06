// NetLab — preload.ts
// ItsEliias — contextBridge API

import { contextBridge, ipcRenderer } from 'electron'
import type { Lab, LabProgress, NetLabPrefs } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  labs: {
    getAll:          (): Promise<Lab[]>                          => ipcRenderer.invoke('labs:getAll'),
    save:            (lab: Lab): Promise<void>                   => ipcRenderer.invoke('labs:save', lab),
    updateProgress:  (progress: LabProgress): Promise<void>      => ipcRenderer.invoke('labs:updateProgress', progress),
    getProgress:     (): Promise<Record<string, LabProgress>>    => ipcRenderer.invoke('labs:getProgress'),
  },
  prefs: {
    get: (): Promise<NetLabPrefs>                                => ipcRenderer.invoke('prefs:get'),
    set: (prefs: Partial<NetLabPrefs>): Promise<void>           => ipcRenderer.invoke('prefs:set', prefs),
  },
  snippets: {
    // Custom (user-added) snippets only — built-ins are seeded in the renderer.
    getCustom:  (): Promise<unknown[]>                          => ipcRenderer.invoke('snippets:getCustom'),
    saveCustom: (snippets: unknown[]): Promise<boolean>         => ipcRenderer.invoke('snippets:saveCustom', snippets),
  },
  shell: {
    openExternal: (url: string): Promise<void>                  => ipcRenderer.invoke('shell:openExternal', url),
  },
  app: {
    version: (): Promise<string>                                => ipcRenderer.invoke('app:version'),
  },
  ghostvault: {
    saveNote: (payload: { labTitle: string; vendor: string; tags: string[]; content: string }): Promise<{ ok: boolean; reason?: string }> =>
      ipcRenderer.invoke('ghostvault:save-note', payload),
    vaultPath: (): Promise<string | null>                        => ipcRenderer.invoke('ghostvault:vault-path'),
    status:    (): Promise<{ running: boolean; vaultPath?: string }> => ipcRenderer.invoke('ghostvault:status'),
  },
  terminallink: {
    sendCommand: (command: string): Promise<void>               => ipcRenderer.invoke('terminallink:send-command', command),
  },
  ipc: {
    onEcosystemEvent: (cb: (event: unknown) => void) => {
      ipcRenderer.on('ecosystem:event', (_e, data) => cb(data))
    },
    sendEcosystemEvent: (event: string, data: Record<string, unknown>): Promise<void> =>
      ipcRenderer.invoke('ecosystem:send', event, data),
  },

  // ── Tray pending actions (from CyberTools Launcher) ───────────────────────
  onPendingAction: (cb: (action: string) => void): (() => void) => {
    const fn = (_: Electron.IpcRendererEvent, action: string) => cb(action)
    ipcRenderer.on('pending-action', fn)
    return () => ipcRenderer.removeListener('pending-action', fn)
  },
})
