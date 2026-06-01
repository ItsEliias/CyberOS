/// <reference types="vite/client" />
import type { EcosystemConfig, EcosystemEvent } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      getState:       () => Promise<EcosystemConfig>
      getEvents:      () => Promise<EcosystemEvent[]>
      getVersion:     () => Promise<string>
      launchApp:      (execPath: string) => Promise<{ ok: boolean; error?: string }>
      openUrl:        (url: string) => Promise<void>
      onStateUpdate:  (cb: (cfg: EcosystemConfig) => void) => () => void
      onEventsUpdate: (cb: (events: EcosystemEvent[]) => void) => () => void
    }
  }
}
