import { create } from 'zustand'
import type { Lab, LabProgress, Topology, CommandSnippet } from '@shared/types'

export type ActiveView = 'labs' | 'reference' | 'topology' | 'snippets' | 'progress' | 'settings'

interface NetLabState {
  // Data
  labs: Lab[]
  progress: Record<string, LabProgress>
  topologies: Topology[]
  snippets: CommandSnippet[]

  // Active selections
  activeLab: Lab | null
  activeStepIndex: number
  activeTopology: Topology | null
  activeView: ActiveView
  searchQuery: string

  // Lab timer
  labStartTime: number | null

  // Actions
  setLabs: (labs: Lab[]) => void
  setProgress: (progress: Record<string, LabProgress>) => void
  setActiveLab: (lab: Lab | null) => void
  setActiveStepIndex: (index: number) => void
  setActiveTopology: (t: Topology | null) => void
  setActiveView: (view: ActiveView) => void
  setSearchQuery: (q: string) => void
  setTopologies: (topologies: Topology[]) => void
  setSnippets: (snippets: CommandSnippet[]) => void
  startLabTimer: () => void
  clearLabTimer: () => void

  updateStepResult: (labId: string, stepId: string, passed: boolean, actualOutput?: string) => void
  updateLabNotes: (labId: string, notes: string) => void
  saveTopology: (t: Topology) => void
  addSnippet: (s: CommandSnippet) => void
}

export const useNetLabStore = create<NetLabState>((set, get) => ({
  labs: [],
  progress: {},
  topologies: [],
  snippets: [],
  activeLab: null,
  activeStepIndex: 0,
  activeTopology: null,
  activeView: 'labs',
  searchQuery: '',
  labStartTime: null,

  setLabs: (labs) => set({ labs }),
  setProgress: (progress) => set({ progress }),
  setActiveLab: (lab) => set({ activeLab: lab, activeStepIndex: 0 }),
  setActiveStepIndex: (index) => set({ activeStepIndex: index }),
  setActiveTopology: (t) => set({ activeTopology: t }),
  setActiveView: (activeView) => set({ activeView }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTopologies: (topologies) => set({ topologies }),
  setSnippets: (snippets) => set({ snippets }),
  startLabTimer: () => set({ labStartTime: Date.now() }),
  clearLabTimer: () => set({ labStartTime: null }),

  updateStepResult: (labId, stepId, passed, actualOutput) => {
    const { progress } = get()
    const existing = progress[labId] ?? {
      labId,
      startedAt: new Date().toISOString(),
      stepResults: {},
      notes: '',
    }
    const updated: LabProgress = {
      ...existing,
      stepResults: {
        ...existing.stepResults,
        [stepId]: { passed, actualOutput, attemptedAt: new Date().toISOString() },
      },
    }
    set({ progress: { ...progress, [labId]: updated } })
    window.electronAPI.labs.updateProgress(updated).catch(console.error)
  },

  updateLabNotes: (labId, notes) => {
    const { progress } = get()
    const existing = progress[labId] ?? {
      labId,
      startedAt: new Date().toISOString(),
      stepResults: {},
      notes: '',
    }
    const updated: LabProgress = { ...existing, notes }
    set({ progress: { ...progress, [labId]: updated } })
    window.electronAPI.labs.updateProgress(updated).catch(console.error)
  },

  saveTopology: (t) => {
    const { topologies } = get()
    const idx = topologies.findIndex(x => x.id === t.id)
    const next = idx >= 0
      ? topologies.map((x, i) => i === idx ? t : x)
      : [...topologies, t]
    set({ topologies: next, activeTopology: t })
  },

  addSnippet: (s) => {
    set(state => ({ snippets: [...state.snippets, s] }))
  },
}))
