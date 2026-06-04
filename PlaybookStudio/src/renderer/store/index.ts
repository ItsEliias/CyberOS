import { create } from 'zustand'
import type { Playbook, PlaybookRun, SharedContext } from '@shared/types'

export type View = 'library' | 'editor' | 'run' | 'history' | 'settings'

interface Store {
  // Data
  playbooks:     Playbook[]
  runs:          PlaybookRun[]
  context:       SharedContext

  // UI state
  view:          View
  activePlaybook: Playbook | null
  activeRun:     PlaybookRun | null
  categoryFilter: string

  // Setters
  setPlaybooks:      (pbs: Playbook[]) => void
  setRuns:           (runs: PlaybookRun[]) => void
  setContext:        (ctx: SharedContext) => void
  setView:           (v: View) => void
  setActivePlaybook: (pb: Playbook | null) => void
  setActiveRun:      (run: PlaybookRun | null) => void
  setCategoryFilter: (cat: string) => void

  // Run updater
  updateRun: (run: PlaybookRun) => void
}

export const useStore = create<Store>(set => ({
  playbooks:      [],
  runs:           [],
  context:        {},
  view:           'library',
  activePlaybook: null,
  activeRun:      null,
  categoryFilter: 'all',

  setPlaybooks:      playbooks  => set({ playbooks }),
  setRuns:           runs       => set({ runs }),
  setContext:        context    => set({ context }),
  setView:           view       => set({ view }),
  setActivePlaybook: activePlaybook => set({ activePlaybook }),
  setActiveRun:      activeRun  => set({ activeRun }),
  setCategoryFilter: categoryFilter => set({ categoryFilter }),

  updateRun: run => set(s => ({
    runs:      s.runs.map(r => r.id === run.id ? run : r),
    activeRun: s.activeRun?.id === run.id ? run : s.activeRun,
  })),
}))
