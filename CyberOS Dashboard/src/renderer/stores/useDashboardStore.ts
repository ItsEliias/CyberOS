// CyberOS Dashboard — Zustand Store
// ItsEliias // Primary state management

import { create } from 'zustand'
import type {
  EcosystemConfig,
  EcosystemEvent,
  Alert,
  ViewId,
  DashboardSettings,
  SharedContext,
  OperatorProfile,
} from '../types/ecosystem'

interface DashboardState {
  // Data
  config: EcosystemConfig
  events: EcosystemEvent[]
  alerts: Alert[]

  // UI State
  activeView: ViewId
  isFullscreen: boolean
  isLoading: boolean
  error: string | null
  showAlerts: boolean
  feedFilter: string | null
  feedSearchQuery: string

  // Ecosystem context (derived from config)
  ecosystemContext: {
    activeLab: string | null
    activeTarget: string | null
    activeIP: string | null
    activePlaybook: string | null
  }

  // Settings
  settings: DashboardSettings

  // Dismissed alerts
  dismissedAlertIds: Set<string>

  // Actions
  setConfig: (cfg: EcosystemConfig) => void
  setEvents: (events: EcosystemEvent[]) => void
  setAlerts: (alerts: Alert[]) => void
  setActiveView: (view: ViewId) => void
  setFullscreen: (v: boolean) => void
  setLoading: (v: boolean) => void
  setError: (err: string | null) => void
  setShowAlerts: (v: boolean) => void
  setFeedFilter: (app: string | null) => void
  setFeedSearchQuery: (q: string) => void
  dismissAlert: (id: string) => void
  clearDismissedAlerts: () => void
  updateSettings: (s: Partial<DashboardSettings>) => void
  updateEcosystemContext: (ctx: Partial<DashboardState['ecosystemContext']>) => void
}

const DEFAULT_SETTINGS: DashboardSettings = {
  operatorName: 'ItsEliias',
  refreshInterval: 5000,
  defaultView: 'dashboard',
  notifications: true,
  alertSound: false,
  fullscreen: false,
  feedMaxItems: 50,
}

export const useDashboardStore = create<DashboardState>((set) => ({
  // Initial state
  config: {},
  events: [],
  alerts: [],
  activeView: 'dashboard',
  isFullscreen: false,
  isLoading: true,
  error: null,
  showAlerts: false,
  feedFilter: null,
  feedSearchQuery: '',
  ecosystemContext: {
    activeLab: null,
    activeTarget: null,
    activeIP: null,
    activePlaybook: null,
  },
  settings: DEFAULT_SETTINGS,
  dismissedAlertIds: new Set(),

  // Actions
  setConfig: (cfg) =>
    set({
      config: cfg,
      ecosystemContext: {
        activeLab: cfg.shared_context?.activeLab ?? null,
        activeTarget: cfg.shared_context?.activeTarget ?? null,
        activeIP: cfg.shared_context?.activeIP ?? null,
        activePlaybook: cfg.shared_context?.activePlaybook ?? null,
      },
      isLoading: false,
      error: null,
    }),

  setEvents: (events) => set({ events }),
  setAlerts: (alerts) => set({ alerts }),
  setActiveView: (view) => set({ activeView: view }),
  setFullscreen: (v) => set({ isFullscreen: v }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (err) => set({ error: err, isLoading: false }),
  setShowAlerts: (v) => set({ showAlerts: v }),
  setFeedFilter: (app) => set({ feedFilter: app }),
  setFeedSearchQuery: (q) => set({ feedSearchQuery: q }),

  dismissAlert: (id) =>
    set((s) => ({
      dismissedAlertIds: new Set([...s.dismissedAlertIds, id]),
    })),

  clearDismissedAlerts: () => set({ dismissedAlertIds: new Set() }),

  updateSettings: (s) =>
    set((state) => ({
      settings: { ...state.settings, ...s },
    })),

  updateEcosystemContext: (ctx) =>
    set((state) => ({
      ecosystemContext: { ...state.ecosystemContext, ...ctx },
    })),
}))
