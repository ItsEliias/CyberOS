import { contextBridge, ipcRenderer } from 'electron';

const api = {
  getConfig:   ()           => ipcRenderer.invoke('get-config'),
  saveConfig:  (cfg: unknown) => ipcRenderer.invoke('save-config', cfg),
  getOutputDir:()           => ipcRenderer.invoke('get-output-dir'),

  saveApiKey:  (key: string) => ipcRenderer.invoke('save-api-key', key),
  testApiKey:  (key: string) => ipcRenderer.invoke('test-api-key', key),
  hasApiKey:   ()           => ipcRenderer.invoke('has-api-key'),

  claudeChat:  (payload: unknown) => ipcRenderer.invoke('claude-chat', payload),
  ollamaChat:  (payload: unknown) => ipcRenderer.invoke('ollama-chat', payload),
  ollamaListModels: (endpoint?: string) => ipcRenderer.invoke('ollama-list-models', endpoint),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  saveScreenshot: (data: unknown) => ipcRenderer.invoke('save-screenshot', data),
  pushToReconDesk: (data: unknown) => ipcRenderer.invoke('push-to-recondesk', data),
  getReconDeskTarget: (data: unknown) => ipcRenderer.invoke('get-recondesk-target', data),

  saveSession: (data: unknown) => ipcRenderer.invoke('save-session', data),
  loadSession: (id: string)    => ipcRenderer.invoke('load-session', id),
  listSessions:()              => ipcRenderer.invoke('list-sessions'),
  deleteSession:(id: string)   => ipcRenderer.invoke('delete-session', id),

  saveWriteup: (data: unknown) => ipcRenderer.invoke('save-writeup', data),
  exportPDF:   (data: unknown) => ipcRenderer.invoke('export-pdf', data),

  scanVault:   (vaultPath: string) => ipcRenderer.invoke('scan-vault', vaultPath),
  pickFolder:  ()                  => ipcRenderer.invoke('pick-folder'),

  checkVPN:    ()            => ipcRenderer.invoke('check-vpn'),
  checkUpdate: ()            => ipcRenderer.invoke('check-update'),

  syncHTB:     (apiKey: string) => ipcRenderer.invoke('sync-htb', apiKey),
  syncTHM:     (username: string) => ipcRenderer.invoke('sync-thm', username),

  // HTB token (encrypted) + stats
  saveHtbToken:  (token: string) => ipcRenderer.invoke('save-htb-token', token),
  testHtbToken:  (token?: string) => ipcRenderer.invoke('test-htb-token', token),
  clearHtbToken: () => ipcRenderer.invoke('clear-htb-token'),
  hasHtbToken:   () => ipcRenderer.invoke('has-htb-token'),
  fetchHtbStats: () => ipcRenderer.invoke('fetch-htb-stats'),

  // THM token (encrypted) + stats
  saveThmToken:  (payload: { token: string; username?: string }) => ipcRenderer.invoke('save-thm-token', payload),
  testThmToken:  (payload?: { token?: string; username?: string }) => ipcRenderer.invoke('test-thm-token', payload),
  clearThmToken: () => ipcRenderer.invoke('clear-thm-token'),
  hasThmToken:   () => ipcRenderer.invoke('has-thm-token'),
  fetchThmStats: () => ipcRenderer.invoke('fetch-thm-stats'),

  setActiveLab: (payload: { name: string | null; platform: string; ip?: string }) =>
    ipcRenderer.invoke('set-active-lab', payload),

  updateLauncherStatus: (status: unknown) => ipcRenderer.invoke('update-launcher-status', status),

  saveProgress: (data: unknown) => ipcRenderer.invoke('save-progress', data),
  loadProgress: ()              => ipcRenderer.invoke('load-progress'),

  saveLabTracker: (data: unknown) => ipcRenderer.invoke('save-lab-tracker', data),
  loadLabTracker: ()              => ipcRenderer.invoke('load-lab-tracker'),

  saveSnippets: (data: unknown) => ipcRenderer.invoke('save-snippets', data),
  loadSnippets: ()              => ipcRenderer.invoke('load-snippets'),

  saveAnnotatedScreenshot: (data: unknown) => ipcRenderer.invoke('save-annotated-screenshot', data),
  saveKnowledgeBase: (data: unknown) => ipcRenderer.invoke('save-knowledge-base', data),
  loadKnowledgeBase: () => ipcRenderer.invoke('load-knowledge-base'),
  saveLabReviews: (data: unknown) => ipcRenderer.invoke('save-lab-reviews', data),
  loadLabReviews: () => ipcRenderer.invoke('load-lab-reviews'),
  exportHtml: (data: unknown) => ipcRenderer.invoke('export-html', data),

  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getVersion:   ()            => ipcRenderer.invoke('get-version'),
  getPlatform:  ()            => ipcRenderer.invoke('get-platform'),

  onUpdateAvailable: (cb: (data: unknown) => void) => {
    ipcRenderer.on('update-available', (_, data) => cb(data));
  },
  onFocusWindow: (cb: () => void) => {
    ipcRenderer.on('focus-window', () => cb());
  },
  onAutosaveTick: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('autosave-tick', listener);
    return () => ipcRenderer.removeListener('autosave-tick', listener);
  },
  onVpnStatus: (cb: (data: unknown) => void) => {
    const listener = (_: unknown, data: unknown) => cb(data);
    ipcRenderer.on('vpn-status', listener);
    return () => ipcRenderer.removeListener('vpn-status', listener);
  },
  onPendingAction: (cb: (action: string) => void) => {
    const listener = (_: unknown, action: string) => cb(action);
    ipcRenderer.on('pending-action', listener);
    return () => ipcRenderer.removeListener('pending-action', listener);
  },

  ecosystemEmit: (appName: string, eventType: string, data: unknown) =>
    ipcRenderer.invoke('ecosystem-emit', appName, eventType, data),

  incrementFlags: (count?: number) => ipcRenderer.invoke('increment-flags', count),
  updateOperatorProfile: (updates: object) => ipcRenderer.invoke('update-operator-profile', updates),
  completeLab: (opts: { platform: string; labType: string }) => ipcRenderer.invoke('complete-lab', opts),

  startLab: (opts: { name: string; platform: string; targetIP?: string; findingsCount?: number }) =>
    ipcRenderer.invoke('lab:start', opts),
  updateLabFindings: (opts: { findingsCount: number }) =>
    ipcRenderer.invoke('lab:update-findings', opts),
  endLab: () => ipcRenderer.invoke('lab:end'),

  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type CyberLabAPI = typeof api;
