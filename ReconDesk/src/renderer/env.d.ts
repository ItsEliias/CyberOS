/// <reference types="vite/client" />

import type { ReconDeskData, CveResult } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      loadData:      () => Promise<ReconDeskData>
      saveData:      (data: ReconDeskData) => Promise<boolean>
      getVersion:    () => Promise<string>
      openUrl:       (url: string) => Promise<void>
      exportTarget:  (payload: { json: string; md: string; defaultName: string }) => Promise<{ ok: boolean; filePath?: string }>
      cveLookup:     (service: string, version: string) => Promise<CveResult[]>
      flagCaptured:  () => Promise<void>
      // Ecosystem context writes
      writeContext:  (ctx: { activeTarget: string; activeIP: string }) => Promise<void>
      // Ecosystem event emitter
      emitEvent:     (event: string, data?: Record<string, unknown>) => Promise<void>
      // Read cybertools-config.json
      readConfig:    () => Promise<Record<string, unknown>>
      // fs.watch IPC bus
      onConfigUpdated?: (cb: (data: Record<string, unknown>) => void) => void
    }
  }
}
