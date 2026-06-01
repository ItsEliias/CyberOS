import { contextBridge, ipcRenderer } from 'electron';

const api = {
  getConfig:   ()           => ipcRenderer.invoke('get-config'),
  saveConfig:  (cfg: unknown) => ipcRenderer.invoke('save-config', cfg),
  getOutputDir:()           => ipcRenderer.invoke('get-output-dir'),

  saveApiKey:  (key: string) => ipcRenderer.invoke('save-api-key', key),
  testApiKey:  (key: string) => ipcRenderer.invoke('test-api-key', key),
  hasApiKey:   ()           => ipcRenderer.invoke('has-api-key'),

  claudeChat:  (payload: unknown) => ipcRenderer.invoke('claude-chat', payload),

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

  updateLauncherStatus: (status: unknown) => ipcRenderer.invoke('update-launcher-status', status),

  saveProgress: (data: unknown) => ipcRenderer.invoke('save-progress', data),
  loadProgress: ()              => ipcRenderer.invoke('load-progress'),

  saveLabTracker: (data: unknown) => ipcRenderer.invoke('save-lab-tracker', data),
  loadLabTracker: ()              => ipcRenderer.invoke('load-lab-tracker'),

  saveSnippets: (data: unknown) => ipcRenderer.invoke('save-snippets', data),
  loadSnippets: ()              => ipcRenderer.invoke('load-snippets'),

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
    ipcRenderer.on('autosave-tick', () => cb());
  },
  onVpnStatus: (cb: (data: unknown) => void) => {
    ipcRenderer.on('vpn-status', (_, data) => cb(data));
  },

  ecosystemEmit: (appName: string, eventType: string, data: unknown) =>
    ipcRenderer.invoke('ecosystem-emit', appName, eventType, data),

  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type CyberLabAPI = typeof api;
