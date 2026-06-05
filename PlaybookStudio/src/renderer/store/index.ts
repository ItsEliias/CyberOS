import { create } from 'zustand'
import type { Playbook, PlaybookRun, SharedContext } from '@shared/types'

export type View = 'library' | 'editor' | 'run' | 'history' | 'settings'

export interface AppTheme {
  accentColor: string
  bgColor: string
  textColor: string
}

const THEME_STORAGE_KEY = 'playbookstudio_theme'

const DEFAULT_THEME: AppTheme = {
  accentColor: '#4a9eff',
  bgColor: '#0a0a0f',
  textColor: '#e2e8f0',
}

function loadTheme(): AppTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_THEME
}

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement
  root.style.setProperty('--app-accent', theme.accentColor)
  root.style.setProperty('--app-bg', theme.bgColor)
  root.style.setProperty('--app-text', theme.textColor)
  root.style.setProperty('--accent', theme.accentColor)
  root.style.setProperty('--bg', theme.bgColor)
  root.style.setProperty('--text', theme.textColor)
  root.style.setProperty('--accent-dim', `${theme.accentColor}22`)
  document.body.style.background = theme.bgColor
}

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

  // Theme
  theme: AppTheme

  // Setters
  setPlaybooks:      (pbs: Playbook[]) => void
  setRuns:           (runs: PlaybookRun[]) => void
  setContext:        (ctx: SharedContext) => void
  setView:           (v: View) => void
  setActivePlaybook: (pb: Playbook | null) => void
  setActiveRun:      (run: PlaybookRun | null) => void
  setCategoryFilter: (cat: string) => void
  setTheme:          (t: AppTheme) => void

  // Run updater
  updateRun: (run: PlaybookRun) => void
}

export const useStore = create<Store>(set => {
  const initialTheme = loadTheme()
  // Apply on first load
  if (typeof document !== 'undefined') {
    setTimeout(() => applyTheme(initialTheme), 0)
  }

  return {
    playbooks:      [],
    runs:           [],
    context:        {},
    view:           'library',
    activePlaybook: null,
    activeRun:      null,
    categoryFilter: 'all',
    theme:          initialTheme,

    setPlaybooks:      playbooks  => set({ playbooks }),
    setRuns:           runs       => set({ runs }),
    setContext:        context    => set({ context }),
    setView:           view       => set({ view }),
    setActivePlaybook: activePlaybook => set({ activePlaybook }),
    setActiveRun:      activeRun  => set({ activeRun }),
    setCategoryFilter: categoryFilter => set({ categoryFilter }),
    setTheme: theme => {
      try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme)) } catch { /* ignore */ }
      applyTheme(theme)
      set({ theme })
    },

    updateRun: run => set(s => ({
      runs:      s.runs.map(r => r.id === run.id ? run : r),
      activeRun: s.activeRun?.id === run.id ? run : s.activeRun,
    })),
  }
})

export { DEFAULT_THEME }
