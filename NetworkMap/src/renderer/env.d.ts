/// <reference types="vite/client" />

import type { NetworkNode, NetworkGraph, GraphSummary } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      parseNmapXml(xml: string): Promise<NetworkNode[]>
      loadNmapFile(): Promise<NetworkNode[] | null>
      importFromReconDesk(): Promise<NetworkNode[]>
      saveGraph(graph: NetworkGraph): Promise<void>
      loadGraphs(): Promise<GraphSummary[]>
      loadGraph(id: string): Promise<NetworkGraph | null>
      deleteGraph(id: string): Promise<void>
      getVersion(): Promise<string>
    }
  }
}
