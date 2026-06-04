import { create } from 'zustand'
import type { Credential, VaultStats, ImportHistoryEntry } from '@shared/types'

export type View = 'vault' | 'import' | 'settings'
export type SortOrder = 'lastUsed' | 'alpha' | 'newest' | 'strength' | null

export interface Store {
  // Auth state
  isSetup:    boolean
  isUnlocked: boolean
  autoLockMs: number

  // Data
  credentials:   Credential[]
  stats:         VaultStats | null
  importHistory: ImportHistoryEntry[]
  version:       string

  // Live Queue
  pendingCount: number

  // Settings
  clipboardClearMs: number   // 0 = never, 30000, 60000

  // UI state
  activeView:      View
  searchQuery:     string
  filterTag:       string | null
  filterStatus:    string | null
  filterSource:    string | null
  filterCategory:  string | null
  filterFolder:    string | null
  activeTags:      string[]   // multi-tag filter (AND logic)
  sortOrder:       SortOrder

  // Clipboard toast
  clipboardToast: { label: string; clearsAt: number } | null

  // Actions
  setSetup:            (v: boolean) => void
  setUnlocked:         (v: boolean) => void
  setAutoLockMs:       (ms: number) => void
  setClipboardClearMs: (ms: number) => void
  setCredentials:      (c: Credential[]) => void
  setStats:            (s: VaultStats | null) => void
  addImportHistory:    (entry: ImportHistoryEntry) => void
  setVersion:          (v: string) => void
  setPendingCount:     (n: number) => void
  setView:             (v: View) => void
  setSearch:           (q: string) => void
  setFilterTag:        (t: string | null) => void
  setFilterStatus:     (s: string | null) => void
  setFilterSource:     (s: string | null) => void
  setFilterCategory:   (c: string | null) => void
  setFilterFolder:     (f: string | null) => void
  toggleActiveTag:     (tag: string) => void
  clearActiveTags:     () => void
  setSortOrder:        (s: SortOrder) => void
  resetFilters:        () => void
  setClipboardToast:   (toast: { label: string; clearsAt: number } | null) => void
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
  clipboardClearMs: 30_000,

  activeView:     'vault',
  searchQuery:    '',
  filterTag:      null,
  filterStatus:   null,
  filterSource:   null,
  filterCategory: null,
  filterFolder:   null,
  activeTags:     [],
  sortOrder:      null,
  clipboardToast: null,

  setSetup:            (v)    => set({ isSetup: v }),
  setUnlocked:         (v)    => set({ isUnlocked: v }),
  setAutoLockMs:       (ms)   => set({ autoLockMs: ms }),
  setClipboardClearMs: (ms)   => set({ clipboardClearMs: ms }),
  setCredentials:      (c)    => set({ credentials: c }),
  setStats:            (s)    => set({ stats: s }),
  addImportHistory:    (entry)=> set(s => ({ importHistory: [entry, ...s.importHistory].slice(0, 20) })),
  setVersion:          (v)    => set({ version: v }),
  setPendingCount:     (n)    => set({ pendingCount: n }),
  setView:             (v)    => set({ activeView: v }),
  setSearch:           (q)    => set({ searchQuery: q }),
  setFilterTag:        (t)    => set({ filterTag: t }),
  setFilterStatus:     (s)    => set({ filterStatus: s }),
  setFilterSource:     (s)    => set({ filterSource: s }),
  setFilterCategory:   (c)    => set({ filterCategory: c }),
  setFilterFolder:     (f)    => set({ filterFolder: f }),
  toggleActiveTag:     (tag)  => set(s => ({
    activeTags: s.activeTags.includes(tag)
      ? s.activeTags.filter(t => t !== tag)
      : [...s.activeTags, tag]
  })),
  clearActiveTags:     ()     => set({ activeTags: [] }),
  setSortOrder:        (s)    => set({ sortOrder: s }),
  resetFilters:        ()     => set({
    searchQuery: '', filterTag: null, filterStatus: null,
    filterSource: null, filterCategory: null, filterFolder: null,
    activeTags: []
  }),
  setClipboardToast:   (t)    => set({ clipboardToast: t }),
}))
