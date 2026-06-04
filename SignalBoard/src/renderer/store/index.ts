import { create } from 'zustand'
import type { FeedItem, FeedSource, RelevanceContext, ActiveView, ActiveFilter, AppSettings, AlertRule } from '../../shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  refreshInterval:       15,
  maxItemsPerSource:     30,
  autoClearDays:         30,
  notificationsEnabled:  true,
  notificationThreshold: 40,
  aiProvider:            'claude',
  claudeApiKey:          '',
  aiAutoSummarise:       false,
  alertRules:            [],
  readerLightMode:       false,
}

interface Store {
  // Data
  items:          FeedItem[]
  sources:        FeedSource[]
  selectedId:     string | null
  refreshing:     boolean
  lastRefreshed:  string | null
  context:        RelevanceContext
  version:        string
  settings:       AppSettings
  bookmarks:      string[]
  bookmarkTags:   Record<string, string[]>

  // Navigation
  activeView:     ActiveView
  activeFilter:   ActiveFilter

  // Search
  searchQuery:    string
  searchOpen:     boolean

  // Timeline/view mode
  timelineMode:   boolean

  // Setters
  setItems:           (items: FeedItem[]) => void
  setSources:         (sources: FeedSource[]) => void
  setSelectedId:      (id: string | null) => void
  setRefreshing:      (v: boolean) => void
  setLastRefreshed:   (ts: string) => void
  setContext:         (ctx: RelevanceContext) => void
  setVersion:         (v: string) => void
  setSettings:        (s: AppSettings) => void
  setActiveView:      (view: ActiveView) => void
  setActiveFilter:    (filter: ActiveFilter) => void
  patchItem:          (id: string, patch: Partial<FeedItem>) => void
  setBookmarks:       (ids: string[]) => void
  setBookmarkTags:    (tags: Record<string, string[]>) => void
  toggleBookmark:     (id: string) => void
  setItemBookmarkTags:(id: string, tags: string[]) => void
  setSearchQuery:     (q: string) => void
  setSearchOpen:      (v: boolean) => void
  setTimelineMode:    (v: boolean) => void
  setAlertRules:      (rules: AlertRule[]) => void
}

export const useStore = create<Store>(set => ({
  items:          [],
  sources:        [],
  selectedId:     null,
  refreshing:     false,
  lastRefreshed:  null,
  context:        {},
  version:        '2.0.0',
  settings:       DEFAULT_SETTINGS,
  bookmarks:      [],
  bookmarkTags:   {},
  activeView:     'feed',
  activeFilter:   'all',
  searchQuery:    '',
  searchOpen:     false,
  timelineMode:   false,

  setItems:           items   => set({ items }),
  setSources:         sources => set({ sources }),
  setSelectedId:      id      => set({ selectedId: id }),
  setRefreshing:      v       => set({ refreshing: v }),
  setLastRefreshed:   ts      => set({ lastRefreshed: ts }),
  setContext:         ctx     => set({ context: ctx }),
  setVersion:         v       => set({ version: v }),
  setSettings:        s       => set({ settings: s }),
  setActiveView:      view    => set({ activeView: view }),
  setActiveFilter:    filter  => set({ activeFilter: filter }),
  patchItem: (id, patch) =>
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, ...patch } : i) })),
  setBookmarks: ids => set({ bookmarks: ids }),
  setBookmarkTags: tags => set({ bookmarkTags: tags }),
  toggleBookmark: id =>
    set(s => {
      const exists = s.bookmarks.includes(id)
      return { bookmarks: exists ? s.bookmarks.filter(b => b !== id) : [...s.bookmarks, id] }
    }),
  setItemBookmarkTags: (id, tags) =>
    set(s => ({ bookmarkTags: { ...s.bookmarkTags, [id]: tags } })),
  setSearchQuery:  q => set({ searchQuery: q }),
  setSearchOpen:   v => set({ searchOpen: v }),
  setTimelineMode: v => set({ timelineMode: v }),
  setAlertRules:   rules => set(s => ({ settings: { ...s.settings, alertRules: rules } })),
}))
