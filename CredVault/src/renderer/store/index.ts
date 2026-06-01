import { create } from 'zustand'
import type { Credential, VaultStats, ImportHistoryEntry } from '@shared/types'

export type View = 'vault' | 'import' | 'settings'

interface Store {
  // Auth state
  isSetup:   boolean
  isUnlocked: boolean
  autoLockMs: number

  // Data
  credentials:   Credential[]
  stats:         VaultStats | null
  importHistory: ImportHistoryEntry[]
  version:       string

  // Live Queue
  pendingCount: number

  // UI state
  activeView:    View
  searchQuery:   string
  filterTag:     string | null
  filterStatus:  string | null
  filterSource:  string | null

  // Actions
  setSetup:        (v: boolean) => void
  setUnlocked:     (v: boolean) => void
  setAutoLockMs:   (ms: number) => void
  setCredentials:  (c: Credential[]) => void
  setStats:        (s: VaultStats | null) => void
  addImportHistory:(entry: ImportHistoryEntry) => void
  setVersion:      (v: string) => void
  setPendingCount: (n: number) => void
  setView:         (v: View) => void
  setSearch:       (q: string) => void
  setFilterTag:    (t: string | null) => void
  setFilterStatus: (s: string | null) => void
  setFilterSource: (s: string | null) => void
  resetFilters:    () => void
}

export const useStore = create<Store>((set) => ({
  isSetup:      true,
  isUnlocked:   false,
  autoLockMs:   0,
  credentials:  [],
  stats:        null,
  importHistory:[],
  version:      '1.0.0',
  pendingCount: 0,

  activeView:   'vault',
  searchQuery:  '',
  filterTag:    null,
  filterStatus: null,
  filterSource: null,

  setSetup:        (v)  => set({ isSetup: v }),
  setUnlocked:     (v)  => set({ isUnlocked: v }),
  setAutoLockMs:   (ms) => set({ autoLockMs: ms }),
  setCredentials:  (c)  => set({ credentials: c }),
  setStats:        (s)  => set({ stats: s }),
  addImportHistory:(entry) => set(s => ({ importHistory: [entry, ...s.importHistory].slice(0, 20) })),
  setVersion:      (v)  => set({ version: v }),
  setPendingCount: (n)  => set({ pendingCount: n }),
  setView:         (v)  => set({ activeView: v }),
  setSearch:       (q)  => set({ searchQuery: q }),
  setFilterTag:    (t)  => set({ filterTag: t }),
  setFilterStatus: (s)  => set({ filterStatus: s }),
  setFilterSource: (s)  => set({ filterSource: s }),
  resetFilters:    ()   => set({ searchQuery: '', filterTag: null, filterStatus: null, filterSource: null }),
}))
