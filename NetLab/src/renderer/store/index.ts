import { create } from 'zustand'
import type { Lab, LabProgress, Topology, CommandSnippet } from '@shared/types'

// ─── Notes-write debouncer ───────────────────────────────────────────────────
// One timer per lab so that switching between labs while typing in another
// flushes the previous one. The latest LabProgress for a given labId always
// wins on flush.
const NOTES_DEBOUNCE_MS = 500
const pendingNotesTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingNotesPayload = new Map<string, LabProgress>()

function scheduleNotesPersist(labId: string, progress: LabProgress): void {
  pendingNotesPayload.set(labId, progress)
  const existing = pendingNotesTimers.get(labId)
  if (existing) clearTimeout(existing)
  pendingNotesTimers.set(labId, setTimeout(() => {
    const payload = pendingNotesPayload.get(labId)
    pendingNotesTimers.delete(labId)
    pendingNotesPayload.delete(labId)
    if (!payload) return
    window.electronAPI.labs.updateProgress(payload).catch(console.error)
  }, NOTES_DEBOUNCE_MS))
}

// Flush any pending notes write on page unload so the user can't lose
// the last <=500ms of typing by closing the window mid-debounce.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    for (const [labId, payload] of pendingNotesPayload.entries()) {
      const timer = pendingNotesTimers.get(labId)
      if (timer) clearTimeout(timer)
      // Best-effort sync IPC — Electron's invoke returns a promise but the
      // process may not stick around to await it. The atomic-write path
      // is fast enough that this usually completes.
      window.electronAPI.labs.updateProgress(payload).catch(() => { /* exiting */ })
    }
    pendingNotesPayload.clear()
    pendingNotesTimers.clear()
  })
}

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
    // Debounce the disk write: this action runs on every textarea keystroke,
    // and the IPC handler does a full atomic tmp+rename of progress.json on
    // each call. Pre-debounce, a 200-character note caused 200 fsync'd disk
    // writes to ~/Library/Application Support/NetLab/progress.json. Wait
    // 500ms after the last keystroke before persisting; intermediate state
    // still lives in zustand so reload-on-tab-switch keeps working.
    scheduleNotesPersist(labId, updated)
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
