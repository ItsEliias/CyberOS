import { create } from 'zustand'
import type { EcosystemConfig, EcosystemEvent } from '../../shared/types'

export interface Alert {
  id: string
  type: 'offline' | 'stale'
  message: string
  timestamp: string
}

interface Store {
  config: EcosystemConfig
  events: EcosystemEvent[]
  version: string
  isFullscreen: boolean
  eventHistory: EcosystemEvent[]
  alerts: Alert[]
  dismissedAlertIds: Set<string>
  setConfig: (cfg: EcosystemConfig) => void
  setEvents: (events: EcosystemEvent[]) => void
  setVersion: (v: string) => void
  setFullscreen: (v: boolean) => void
  setEventHistory: (events: EcosystemEvent[]) => void
  setAlerts: (alerts: Alert[]) => void
  dismissAlert: (id: string) => void
}

export const useStore = create<Store>(set => ({
  config:             {},
  events:             [],
  version:            '1.0.0',
  isFullscreen:       false,
  eventHistory:       [],
  alerts:             [],
  dismissedAlertIds:  new Set(),
  setConfig:          cfg    => set({ config: cfg }),
  setEvents:          events => set({ events }),
  setVersion:         v      => set({ version: v }),
  setFullscreen:      v      => set({ isFullscreen: v }),
  setEventHistory:    events => set({ eventHistory: events }),
  setAlerts:          alerts => set({ alerts }),
  dismissAlert:       id     => set(s => ({
    dismissedAlertIds: new Set([...s.dismissedAlertIds, id]),
  })),
}))
