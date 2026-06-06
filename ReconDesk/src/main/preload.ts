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

  // Ecosystem context writes
  writeContext: (ctx: { activeTarget: string; activeIP: string }): Promise<void> =>
    ipcRenderer.invoke('recondesk:write-context', ctx),

  // Ecosystem event emitter
  emitEvent: (event: string, data?: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('recondesk:emit-event', event, data ?? {}),

  // Read cybertools-config.json (for ecosystem context)
  readConfig: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('recondesk:read-config'),

  // fs.watch IPC bus — fires when any other app writes to cybertools-config.json
  onConfigUpdated: (cb: (data: Record<string, unknown>) => void) =>
    ipcRenderer.on('config:updated', (_e, data) => cb(data)),

  // Fires when ReconDesk's own data.json is touched from outside (e.g. when
  // SignalBoard / NetworkMap pushes a target). The renderer should re-fetch
  // its data so the user sees the change live.
  onDataUpdated: (cb: () => void): (() => void) => {
    const listener = () => cb()
    ipcRenderer.on('data:updated', listener)
    return () => ipcRenderer.removeListener('data:updated', listener)
  },

  // Feature 1 — enrichment
  enrichTarget: (ip: string, name: string): Promise<Record<string, unknown> | null> =>
    ipcRenderer.invoke('recondesk:enrich-target', ip, name),

  // Feature 17 — geolocation
  geoLookup: (ip: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('recondesk:geo-lookup', ip),

  // Feature 6 — screenshot
  captureScreenshot: (label: string): Promise<{ ok: boolean; path?: string; thumbnail?: string; error?: string }> =>
    ipcRenderer.invoke('recondesk:capture-screenshot', label),

  // Feature 16 — PDF export
  exportPdf: (p: { html: string; defaultName: string }): Promise<{ ok: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('recondesk:export-pdf', p),

  // Feature 15 — system notification
  sendNotification: (title: string, body: string): Promise<boolean> =>
    ipcRenderer.invoke('recondesk:notify', title, body),

  // Feature 12 — NetworkMap
  openInNetworkMap: (ip: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('recondesk:open-in-networkmap', ip),

  // Feature 13 — CredVault
  fetchCredVault: (ip: string, hostname: string): Promise<any[]> =>
    ipcRenderer.invoke('recondesk:fetch-credvault', ip, hostname),

  // Feature 9 — CSV file dialog
  openFileDialog: (opts: { filters?: { name: string; extensions: string[] }[]; title?: string }) =>
    ipcRenderer.invoke('recondesk:open-file-dialog', { ...opts, properties: ['openFile'] }) as Promise<{ canceled: boolean; filePaths: string[] }>,

  // Feature 18 — AI next-step suggestions
  aiSuggest: (payload: { apiKey: string; ports: string[]; os: string; cves: string[]; engagement: string }): Promise<string[] | null> =>
    ipcRenderer.invoke('recondesk:ai-suggest', payload),

  // Tray pending actions (from CyberTools Launcher)
  onPendingAction: (cb: (action: string) => void): (() => void) => {
    const fn = (_: Electron.IpcRendererEvent, action: string) => cb(action)
    ipcRenderer.on('pending-action', fn)
    return () => ipcRenderer.removeListener('pending-action', fn)
  },
})
