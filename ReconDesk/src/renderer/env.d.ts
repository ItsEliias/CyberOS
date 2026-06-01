/// <reference types="vite/client" />

import type { ReconDeskData } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      loadData:   () => Promise<ReconDeskData>
      saveData:   (data: ReconDeskData) => Promise<boolean>
      getVersion: () => Promise<string>
      openUrl:    (url: string) => Promise<void>
    }
  }
}
