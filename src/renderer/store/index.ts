import { create } from 'zustand'
import type { EcosystemConfig, EcosystemEvent } from '../../shared/types'

interface Store {
  config: EcosystemConfig
  events: EcosystemEvent[]
  version: string
  setConfig: (cfg: EcosystemConfig) => void
  setEvents: (events: EcosystemEvent[]) => void
  setVersion: (v: string) => void
}

export const useStore = create<Store>(set => ({
  config:  {},
  events:  [],
  version: '1.0.0',
  setConfig:  cfg    => set({ config: cfg }),
  setEvents:  events => set({ events }),
  setVersion: v      => set({ version: v }),
}))
