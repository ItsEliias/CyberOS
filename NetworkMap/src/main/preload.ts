// NetworkMap — preload.ts
// ItsEliias — contextBridge API

import { contextBridge, ipcRenderer } from 'electron'
import type { NetworkNode, NetworkGraph, GraphSummary } from '../shared/types'

interface PushNodePayload {
  ip: string
  ports: Array<{ number: number; protocol: string; service?: string; version?: string; state: string }>
}

interface PushNodeResult {
  ok: boolean
  targetName?: string
  portsAdded?: number
  reason?: string
}

type ReconDeskGraphResult = {
  name: string
  nodes: Array<{ id: string; label: string; ip: string; ports: Array<{ number: number; protocol: string; service?: string; state: string }> }>
  edges: unknown[]
} | null

contextBridge.exposeInMainWorld('electronAPI', {
  parseNmapXml:           (xml: string): Promise<NetworkNode[]>                                       => ipcRenderer.invoke('parse-nmap-xml', xml),
  loadNmapFile:           (): Promise<NetworkNode[] | null>                                            => ipcRenderer.invoke('load-nmap-file'),
  loadNmapFileRaw:        (): Promise<{ content: string; filename: string } | null>                   => ipcRenderer.invoke('load-nmap-file-raw'),
  importFromReconDesk:    (): Promise<NetworkNode[]>                                                   => ipcRenderer.invoke('import-from-recondesk'),
  saveGraph:              (graph: NetworkGraph): Promise<void>                                         => ipcRenderer.invoke('save-graph', graph),
  loadGraphs:             (): Promise<GraphSummary[]>                                                  => ipcRenderer.invoke('load-graphs'),
  loadGraph:              (id: string): Promise<NetworkGraph | null>                                   => ipcRenderer.invoke('load-graph', id),
  deleteGraph:            (id: string): Promise<void>                                                  => ipcRenderer.invoke('delete-graph', id),
  getVersion:             (): Promise<string>                                                          => ipcRenderer.invoke('app:version'),
  pushToReconDesk:        (node: PushNodePayload): Promise<PushNodeResult>                             => ipcRenderer.invoke('recondesk:push-node', node),
  generateFromReconDesk:  (): Promise<ReconDeskGraphResult>                                            => ipcRenderer.invoke('recondesk:generate-graph'),
  exportSvg:              (svgContent: string, name: string): Promise<void>                           => ipcRenderer.invoke('export-svg', svgContent, name),
  exportPng:              (dataUrl: string, name: string): Promise<void>                              => ipcRenderer.invoke('export-png', dataUrl, name),
  exportJson:             (json: string, name: string): Promise<void>                                 => ipcRenderer.invoke('export-json', json, name),
  openExternal:           (url: string): Promise<void>                                                => ipcRenderer.invoke('open-external', url),
  setTerminalLinkTarget:  (ip: string): Promise<void>                                                 => ipcRenderer.invoke('terminallink:set-target', ip),
  runNmap:                (ip: string): Promise<void>                                                  => ipcRenderer.invoke('nmap:run', ip),
  onPendingAction:        (cb: (action: string) => void): (() => void) => {
    ipcRenderer.on('pending-action', (_e, d) => cb(d))
    return () => ipcRenderer.removeAllListeners('pending-action')
  },
})
