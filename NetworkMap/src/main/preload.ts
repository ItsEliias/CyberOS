// NetworkMap — preload.ts
// ItsEliias — contextBridge API

import { contextBridge, ipcRenderer } from 'electron'
import type { NetworkNode, NetworkGraph, GraphSummary } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  parseNmapXml:        (xml: string): Promise<NetworkNode[]>            => ipcRenderer.invoke('parse-nmap-xml', xml),
  loadNmapFile:        (): Promise<NetworkNode[] | null>                 => ipcRenderer.invoke('load-nmap-file'),
  importFromReconDesk: (): Promise<NetworkNode[]>                        => ipcRenderer.invoke('import-from-recondesk'),
  saveGraph:           (graph: NetworkGraph): Promise<void>             => ipcRenderer.invoke('save-graph', graph),
  loadGraphs:          (): Promise<GraphSummary[]>                      => ipcRenderer.invoke('load-graphs'),
  loadGraph:           (id: string): Promise<NetworkGraph | null>       => ipcRenderer.invoke('load-graph', id),
  deleteGraph:         (id: string): Promise<void>                      => ipcRenderer.invoke('delete-graph', id),
  getVersion:          (): Promise<string>                              => ipcRenderer.invoke('app:version'),
})
