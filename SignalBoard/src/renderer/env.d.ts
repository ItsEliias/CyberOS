/// <reference types="vite/client" />
import type { FeedItem, FeedSource, FeedState, RelevanceContext, AppSettings } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      getState:        () => Promise<FeedState>
      refresh:         () => Promise<boolean>
      getVersion:      () => Promise<string>
      getContext:      () => Promise<RelevanceContext>
      openUrl:         (url: string) => Promise<void>
      markRead:        (id: string) => Promise<boolean>
      toggleSaved:     (id: string) => Promise<boolean>
      saveToVault:     (id: string) => Promise<{ ok: boolean; error?: string }>
      toggleSource:    (id: string) => Promise<FeedSource[]>
      updateSource:    (id: string, patch: Partial<FeedSource>) => Promise<FeedSource[]>
      addSource:       (src: Omit<FeedSource, 'id' | 'color' | 'itemCount' | 'errorCount'>) => Promise<FeedSource[]>
      deleteSource:    (id: string) => Promise<FeedSource[]>
      testSource:      (url: string) => Promise<{ ok: boolean; count?: number; error?: string }>
      probeFeed:       (url: string) => Promise<{ ok: true; type: 'rss' | 'atom'; title: string; count: number } | { ok: false; error: string }>
      refreshSource:   (id: string) => Promise<boolean>
      rescore:         () => Promise<boolean>
      writeKeywords:   (keywords: string[]) => Promise<boolean>
      getSettings:     () => Promise<AppSettings>
      setSettings:     (patch: Partial<AppSettings>) => Promise<AppSettings>
      getBookmarks:    () => Promise<{ ids: string[]; tags: Record<string, string[]> }>
      saveBookmarks:   (ids: string[], tags: Record<string, string[]>) => Promise<boolean>
      exportBookmarks: (format: 'json' | 'csv', ids: string[], tags: Record<string, string[]>) => Promise<{ ok: boolean; error?: string }>
      reconDeskTarget:  (itemId: string) => Promise<{ ok: boolean; targets?: string[]; error?: string }>
      cveLookup:       (cveId: string) => Promise<{ ok: boolean; data?: { cvss?: number; severity?: string }; error?: string }>
      summarise:       (item: FeedItem, apiKey: string) => Promise<{ ok: boolean; bullets?: string[]; error?: string }>
      onItems:         (cb: (items: FeedItem[]) => void) => () => void
      onRefreshing:    (cb: (v: boolean) => void) => () => void
      onLastRefreshed: (cb: (ts: string) => void) => () => void
      onContext:       (cb: (ctx: RelevanceContext) => void) => () => void
      onSources:       (cb: (sources: FeedSource[]) => void) => () => void
      onBookmarks:     (cb: (bm: { ids: string[]; tags: Record<string, string[]> }) => void) => () => void
      onDigest:        (cb: (items: FeedItem[]) => void) => () => void
      onSelectItem:    (cb: (id: string) => void) => () => void
    }
  }
}
