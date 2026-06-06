// SignalBoard — preload.ts v2.1
// ItsEliias — contextBridge API
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    // State
    getState: () => ipcRenderer.invoke('feeds:get-state'),
    refresh: () => ipcRenderer.invoke('feeds:refresh'),
    getVersion: () => ipcRenderer.invoke('app:version'),
    getContext: () => ipcRenderer.invoke('feeds:context'),
    openUrl: (url) => ipcRenderer.invoke('shell:open', url),
    // Feed item actions
    markRead: (id) => ipcRenderer.invoke('feeds:mark-read', id),
    toggleSaved: (id) => ipcRenderer.invoke('feeds:toggle-saved', id),
    saveToVault: (id) => ipcRenderer.invoke('feeds:save-to-vault', id),
    // Source management
    toggleSource: (id) => ipcRenderer.invoke('feeds:toggle-source', id),
    updateSource: (id, patch) => ipcRenderer.invoke('feeds:update-source', id, patch),
    addSource: (src) => ipcRenderer.invoke('feeds:add-source', src),
    deleteSource: (id) => ipcRenderer.invoke('feeds:delete-source', id),
    testSource: (url) => ipcRenderer.invoke('feeds:test-source', url),
    probeFeed: (url) => ipcRenderer.invoke('feeds:probe-feed', url),
    refreshSource: (id) => ipcRenderer.invoke('feeds:refresh-source', id),
    // Context / keywords
    rescore: () => ipcRenderer.invoke('feeds:rescore'),
    writeKeywords: (keywords) => ipcRenderer.invoke('config:write-keywords', keywords),
    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get'),
    setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
    // Bookmarks
    getBookmarks: () => ipcRenderer.invoke('feeds:get-bookmarks'),
    saveBookmarks: (ids, tags) => ipcRenderer.invoke('feeds:save-bookmarks', ids, tags),
    exportBookmarks: (format, ids, tags) => ipcRenderer.invoke('feeds:export-bookmarks', format, ids, tags),
    // ReconDesk integration
    reconDeskTarget: (itemId) => ipcRenderer.invoke('feeds:recondesk-target', itemId),
    // CVE lookup
    cveLookup: (cveId) => ipcRenderer.invoke('cve:lookup', cveId),
    // AI
    summarise: (item, apiKey) => ipcRenderer.invoke('ai:summarise', item, apiKey),
    // Push events from main
    onItems: (cb) => { ipcRenderer.on('feeds:items', (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:items'); },
    onRefreshing: (cb) => { ipcRenderer.on('feeds:refreshing', (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:refreshing'); },
    onLastRefreshed: (cb) => { ipcRenderer.on('feeds:lastRefreshed', (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:lastRefreshed'); },
    onContext: (cb) => { ipcRenderer.on('feeds:context', (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:context'); },
    onSources: (cb) => { ipcRenderer.on('feeds:sources', (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:sources'); },
    onDigest: (cb) => { ipcRenderer.on('feeds:digest', (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:digest'); },
    onSelectItem: (cb) => { ipcRenderer.on('feeds:select-item', (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners('feeds:select-item'); },
    onBookmarks: (cb) => {
        ipcRenderer.on('feeds:bookmarks', (_e, d) => cb(d));
        return () => ipcRenderer.removeAllListeners('feeds:bookmarks');
    },
});
