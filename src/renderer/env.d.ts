/// <reference types="vite/client" />
import type { FeedItem, FeedSource, FeedState, RelevanceContext } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      getState:       () => Promise<FeedState>
      refresh:        () => Promise<boolean>
      getVersion:     () => Promise<string>
      getContext:     () => Promise<RelevanceContext>
      openUrl:        (url: string) => Promise<void>
      markRead:       (id: string) => Promise<boolean>
      toggleSaved:    (id: string) => Promise<boolean>
      saveToVault:    (id: string) => Promise<{ ok: boolean; error?: string }>
      toggleSource:   (id: string) => Promise<FeedSource[]>
      addSource:      (src: Omit<FeedSource, 'id' | 'color'>) => Promise<FeedSource[]>
      onItems:        (cb: (items: FeedItem[]) => void) => () => void
      onRefreshing:   (cb: (v: boolean) => void) => () => void
      onLastRefreshed:(cb: (ts: string) => void) => () => void
    }
  }
}
