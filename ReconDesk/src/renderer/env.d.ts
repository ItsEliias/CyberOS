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
    }
  }
}
