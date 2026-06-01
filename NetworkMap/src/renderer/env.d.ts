/// <reference types="vite/client" />

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
  nodes: Array<{
    id: string
    label: string
    ip: string
    ports: Array<{ number: number; protocol: string; service?: string; state: string }>
  }>
  edges: unknown[]
}

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
      pushToReconDesk(node: PushNodePayload): Promise<PushNodeResult>
      generateFromReconDesk(): Promise<ReconDeskGraphResult | null>
    }
  }
}
