// SignalBoard — preload.ts
// ItsEliias — contextBridge API

import { contextBridge, ipcRenderer } from 'electron'
import type { FeedItem, FeedSource, FeedState, RelevanceContext } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  getState:      (): Promise<FeedState>     => ipcRenderer.invoke('feeds:get-state'),
  refresh:       (): Promise<boolean>       => ipcRenderer.invoke('feeds:refresh'),
  getVersion:    (): Promise<string>        => ipcRenderer.invoke('app:version'),
  getContext:    (): Promise<RelevanceContext> => ipcRenderer.invoke('feeds:context'),
  openUrl:       (url: string): Promise<void> => ipcRenderer.invoke('shell:open', url),

  markRead:      (id: string): Promise<boolean>         => ipcRenderer.invoke('feeds:mark-read', id),
  toggleSaved:   (id: string): Promise<boolean>         => ipcRenderer.invoke('feeds:toggle-saved', id),
  saveToVault:   (id: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('feeds:save-to-vault', id),
  toggleSource:  (id: string): Promise<FeedSource[]>    => ipcRenderer.invoke('feeds:toggle-source', id),
  addSource:     (src: Omit<FeedSource, 'id' | 'color'>): Promise<FeedSource[]> => ipcRenderer.invoke('feeds:add-source', src),

  // Push events from main
  onItems:        (cb: (items: FeedItem[]) => void)   => { ipcRenderer.on('feeds:items',        (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:items') },
  onRefreshing:   (cb: (v: boolean) => void)          => { ipcRenderer.on('feeds:refreshing',   (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:refreshing') },
  onLastRefreshed:(cb: (ts: string) => void)          => { ipcRenderer.on('feeds:lastRefreshed',(_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:lastRefreshed') },
})
