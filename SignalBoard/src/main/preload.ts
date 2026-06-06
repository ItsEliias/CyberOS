// SignalBoard — preload.ts v2.1
// ItsEliias — contextBridge API

import { contextBridge, ipcRenderer } from 'electron'
import type { FeedItem, FeedSource, FeedState, RelevanceContext, AppSettings } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  // State
  getState:       (): Promise<FeedState>         => ipcRenderer.invoke('feeds:get-state'),
  refresh:        (): Promise<boolean>           => ipcRenderer.invoke('feeds:refresh'),
  getVersion:     (): Promise<string>            => ipcRenderer.invoke('app:version'),
  getContext:     (): Promise<RelevanceContext>  => ipcRenderer.invoke('feeds:context'),
  openUrl:        (url: string): Promise<void>   => ipcRenderer.invoke('shell:open', url),

  // Feed item actions
  markRead:       (id: string): Promise<boolean>                    => ipcRenderer.invoke('feeds:mark-read', id),
  toggleSaved:    (id: string): Promise<boolean>                    => ipcRenderer.invoke('feeds:toggle-saved', id),
  saveToVault:    (id: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('feeds:save-to-vault', id),

  // Source management
  toggleSource:   (id: string): Promise<FeedSource[]>               => ipcRenderer.invoke('feeds:toggle-source', id),
  updateSource:   (id: string, patch: Partial<FeedSource>): Promise<FeedSource[]> => ipcRenderer.invoke('feeds:update-source', id, patch),
  addSource:      (src: Omit<FeedSource, 'id' | 'color' | 'itemCount' | 'errorCount'>): Promise<FeedSource[]> => ipcRenderer.invoke('feeds:add-source', src),
  deleteSource:   (id: string): Promise<FeedSource[]>               => ipcRenderer.invoke('feeds:delete-source', id),
  testSource:     (url: string): Promise<{ ok: boolean; count?: number; error?: string }> => ipcRenderer.invoke('feeds:test-source', url),
  probeFeed:      (url: string): Promise<{ ok: true; type: 'rss' | 'atom'; title: string; count: number } | { ok: false; error: string }> => ipcRenderer.invoke('feeds:probe-feed', url),
  refreshSource:  (id: string): Promise<boolean>                    => ipcRenderer.invoke('feeds:refresh-source', id),

  // Context / keywords
  rescore:        (): Promise<boolean>                              => ipcRenderer.invoke('feeds:rescore'),
  writeKeywords:  (keywords: string[]): Promise<boolean>            => ipcRenderer.invoke('config:write-keywords', keywords),

  // Settings
  getSettings:    (): Promise<AppSettings>                          => ipcRenderer.invoke('settings:get'),
  setSettings:    (patch: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke('settings:set', patch),

  // Bookmarks
  getBookmarks:    (): Promise<{ ids: string[]; tags: Record<string, string[]> }>   => ipcRenderer.invoke('feeds:get-bookmarks'),
  saveBookmarks:   (ids: string[], tags: Record<string, string[]>): Promise<boolean> => ipcRenderer.invoke('feeds:save-bookmarks', ids, tags),
  exportBookmarks: (format: 'json' | 'csv', ids: string[], tags: Record<string, string[]>): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('feeds:export-bookmarks', format, ids, tags),

  // ReconDesk integration
  reconDeskTarget: (itemId: string): Promise<{ ok: boolean; targets?: string[] }> =>
    ipcRenderer.invoke('feeds:recondesk-target', itemId),

  // CVE lookup
  cveLookup:      (cveId: string): Promise<{ ok: boolean; data?: { cvss?: number; severity?: string }; error?: string }> =>
    ipcRenderer.invoke('cve:lookup', cveId),

  // AI
  summarise:      (item: FeedItem, apiKey: string): Promise<{ ok: boolean; bullets?: string[]; error?: string }> =>
    ipcRenderer.invoke('ai:summarise', item, apiKey),

  // Push events from main
  onItems:        (cb: (items: FeedItem[]) => void)     => { ipcRenderer.on('feeds:items',        (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:items') },
  onRefreshing:   (cb: (v: boolean) => void)            => { ipcRenderer.on('feeds:refreshing',   (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:refreshing') },
  onLastRefreshed:(cb: (ts: string) => void)            => { ipcRenderer.on('feeds:lastRefreshed',(_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:lastRefreshed') },
  onContext:      (cb: (ctx: RelevanceContext) => void) => { ipcRenderer.on('feeds:context',      (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:context') },
  onSources:      (cb: (sources: FeedSource[]) => void) => { ipcRenderer.on('feeds:sources',     (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:sources') },
  onDigest:       (cb: (items: FeedItem[]) => void)     => { ipcRenderer.on('feeds:digest',      (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:digest') },
  onSelectItem:   (cb: (id: string) => void)            => { ipcRenderer.on('feeds:select-item', (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:select-item') },
  onBookmarks:    (cb: (bm: { ids: string[]; tags: Record<string, string[]> }) => void) => {
    ipcRenderer.on('feeds:bookmarks', (_e, d) => cb(d))
    return () => ipcRenderer.removeAllListeners('feeds:bookmarks')
  },
})
