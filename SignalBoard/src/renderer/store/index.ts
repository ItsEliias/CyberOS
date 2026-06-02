import { create } from 'zustand'
import type { FeedItem, FeedSource, RelevanceContext } from '../../shared/types'

export type TabId = 'all' | 'unread' | 'saved' | 'relevant'

interface Store {
  items:               FeedItem[]
  sources:             FeedSource[]
  selectedId:          string | null
  activeSourceId:      string | null
  activeTab:           TabId
  search:              string
  refreshing:          boolean
  lastRefreshed:       string | null
  context:             RelevanceContext
  version:             string
  relevanceThreshold:  number

  setItems:                 (items: FeedItem[]) => void
  setSources:               (sources: FeedSource[]) => void
  setSelectedId:            (id: string | null) => void
  setActiveSourceId:        (id: string | null) => void
  setActiveTab:             (tab: TabId) => void
  setSearch:                (q: string) => void
  setRefreshing:            (v: boolean) => void
  setLastRefreshed:         (ts: string) => void
  setContext:               (ctx: RelevanceContext) => void
  setVersion:               (v: string) => void
  setRelevanceThreshold:    (n: number) => void
  patchItem:                (id: string, patch: Partial<FeedItem>) => void
}

export const useStore = create<Store>(set => ({
  items:              [],
  sources:            [],
  selectedId:         null,
  activeSourceId:     null,
  activeTab:          'all',
  search:             '',
  refreshing:         false,
  lastRefreshed:      null,
  context:            {},
  version:            '1.0.0',
  relevanceThreshold: 20,

  setItems:               items   => set({ items }),
  setSources:             sources => set({ sources }),
  setSelectedId:          id      => set({ selectedId: id }),
  setActiveSourceId:      id      => set({ activeSourceId: id }),
  setActiveTab:           tab     => set({ activeTab: tab }),
  setSearch:              q       => set({ search: q }),
  setRefreshing:          v       => set({ refreshing: v }),
  setLastRefreshed:       ts      => set({ lastRefreshed: ts }),
  setContext:             ctx     => set({ context: ctx }),
  setVersion:             v       => set({ version: v }),
  setRelevanceThreshold:  n       => set({ relevanceThreshold: n }),
  patchItem: (id, patch) =>
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, ...patch } : i) })),
}))
