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

interface ReconDeskGraphResult {
  name: string
  nodes: Array<{ id: string; label: string; ip: string; ports: Array<{ number: number; protocol: string; service?: string; state: string }> }>
  edges: unknown[]
} | null

contextBridge.exposeInMainWorld('electronAPI', {
  parseNmapXml:           (xml: string): Promise<NetworkNode[]>            => ipcRenderer.invoke('parse-nmap-xml', xml),
  loadNmapFile:           (): Promise<NetworkNode[] | null>                 => ipcRenderer.invoke('load-nmap-file'),
  importFromReconDesk:    (): Promise<NetworkNode[]>                        => ipcRenderer.invoke('import-from-recondesk'),
  saveGraph:              (graph: NetworkGraph): Promise<void>              => ipcRenderer.invoke('save-graph', graph),
  loadGraphs:             (): Promise<GraphSummary[]>                       => ipcRenderer.invoke('load-graphs'),
  loadGraph:              (id: string): Promise<NetworkGraph | null>        => ipcRenderer.invoke('load-graph', id),
  deleteGraph:            (id: string): Promise<void>                       => ipcRenderer.invoke('delete-graph', id),
  getVersion:             (): Promise<string>                               => ipcRenderer.invoke('app:version'),
  pushToReconDesk:        (node: PushNodePayload): Promise<PushNodeResult>  => ipcRenderer.invoke('recondesk:push-node', node),
  generateFromReconDesk:  (): Promise<ReconDeskGraphResult>                 => ipcRenderer.invoke('recondesk:generate-graph'),
})
