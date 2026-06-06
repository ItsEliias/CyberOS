import { contextBridge, ipcRenderer } from 'electron';
const api = {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
    getOutputDir: () => ipcRenderer.invoke('get-output-dir'),
    saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
    testApiKey: (key) => ipcRenderer.invoke('test-api-key', key),
    hasApiKey: () => ipcRenderer.invoke('has-api-key'),
    claudeChat: (payload) => ipcRenderer.invoke('claude-chat', payload),
    ollamaChat: (payload) => ipcRenderer.invoke('ollama-chat', payload),
    ollamaListModels: (endpoint) => ipcRenderer.invoke('ollama-list-models', endpoint),
    takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
    saveScreenshot: (data) => ipcRenderer.invoke('save-screenshot', data),
    pushToReconDesk: (data) => ipcRenderer.invoke('push-to-recondesk', data),
    getReconDeskTarget: (data) => ipcRenderer.invoke('get-recondesk-target', data),
    saveSession: (data) => ipcRenderer.invoke('save-session', data),
    loadSession: (id) => ipcRenderer.invoke('load-session', id),
    listSessions: () => ipcRenderer.invoke('list-sessions'),
    deleteSession: (id) => ipcRenderer.invoke('delete-session', id),
    saveWriteup: (data) => ipcRenderer.invoke('save-writeup', data),
    exportPDF: (data) => ipcRenderer.invoke('export-pdf', data),
    scanVault: (vaultPath) => ipcRenderer.invoke('scan-vault', vaultPath),
    pickFolder: () => ipcRenderer.invoke('pick-folder'),
    checkVPN: () => ipcRenderer.invoke('check-vpn'),
    checkUpdate: () => ipcRenderer.invoke('check-update'),
    syncHTB: (apiKey) => ipcRenderer.invoke('sync-htb', apiKey),
    syncTHM: (username) => ipcRenderer.invoke('sync-thm', username),
    // HTB token (encrypted) + stats
    saveHtbToken: (token) => ipcRenderer.invoke('save-htb-token', token),
    testHtbToken: (token) => ipcRenderer.invoke('test-htb-token', token),
    clearHtbToken: () => ipcRenderer.invoke('clear-htb-token'),
    hasHtbToken: () => ipcRenderer.invoke('has-htb-token'),
    fetchHtbStats: () => ipcRenderer.invoke('fetch-htb-stats'),
    // THM token (encrypted) + stats
    saveThmToken: (payload) => ipcRenderer.invoke('save-thm-token', payload),
    testThmToken: (payload) => ipcRenderer.invoke('test-thm-token', payload),
    clearThmToken: () => ipcRenderer.invoke('clear-thm-token'),
    hasThmToken: () => ipcRenderer.invoke('has-thm-token'),
    fetchThmStats: () => ipcRenderer.invoke('fetch-thm-stats'),
    setActiveLab: (payload) => ipcRenderer.invoke('set-active-lab', payload),
    updateLauncherStatus: (status) => ipcRenderer.invoke('update-launcher-status', status),
    saveProgress: (data) => ipcRenderer.invoke('save-progress', data),
    loadProgress: () => ipcRenderer.invoke('load-progress'),
    saveLabTracker: (data) => ipcRenderer.invoke('save-lab-tracker', data),
    loadLabTracker: () => ipcRenderer.invoke('load-lab-tracker'),
    saveSnippets: (data) => ipcRenderer.invoke('save-snippets', data),
    loadSnippets: () => ipcRenderer.invoke('load-snippets'),
    saveAnnotatedScreenshot: (data) => ipcRenderer.invoke('save-annotated-screenshot', data),
    saveKnowledgeBase: (data) => ipcRenderer.invoke('save-knowledge-base', data),
    loadKnowledgeBase: () => ipcRenderer.invoke('load-knowledge-base'),
    saveLabReviews: (data) => ipcRenderer.invoke('save-lab-reviews', data),
    loadLabReviews: () => ipcRenderer.invoke('load-lab-reviews'),
    exportHtml: (data) => ipcRenderer.invoke('export-html', data),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    getVersion: () => ipcRenderer.invoke('get-version'),
    getPlatform: () => ipcRenderer.invoke('get-platform'),
    onUpdateAvailable: (cb) => {
        ipcRenderer.on('update-available', (_, data) => cb(data));
    },
    onFocusWindow: (cb) => {
        ipcRenderer.on('focus-window', () => cb());
    },
    onAutosaveTick: (cb) => {
        const listener = () => cb();
        ipcRenderer.on('autosave-tick', listener);
        return () => ipcRenderer.removeListener('autosave-tick', listener);
    },
    onVpnStatus: (cb) => {
        const listener = (_, data) => cb(data);
        ipcRenderer.on('vpn-status', listener);
        return () => ipcRenderer.removeListener('vpn-status', listener);
    },
    onPendingAction: (cb) => {
        const listener = (_, action) => cb(action);
        ipcRenderer.on('pending-action', listener);
        return () => ipcRenderer.removeListener('pending-action', listener);
    },
    ecosystemEmit: (appName, eventType, data) => ipcRenderer.invoke('ecosystem-emit', appName, eventType, data),
    incrementFlags: (count) => ipcRenderer.invoke('increment-flags', count),
    updateOperatorProfile: (updates) => ipcRenderer.invoke('update-operator-profile', updates),
    completeLab: (opts) => ipcRenderer.invoke('complete-lab', opts),
    startLab: (opts) => ipcRenderer.invoke('lab:start', opts),
    updateLabFindings: (opts) => ipcRenderer.invoke('lab:update-findings', opts),
    endLab: () => ipcRenderer.invoke('lab:end'),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
};
contextBridge.exposeInMainWorld('electronAPI', api);
