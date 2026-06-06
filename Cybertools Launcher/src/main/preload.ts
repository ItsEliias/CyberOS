import { contextBridge, ipcRenderer } from 'electron';
import type {
  CyberToolsConfig, VpnStatus, UpdateInfo,
  ActivityEntry, CustomSlot, EcosystemEvent, SearchResult
} from '../shared/types.js';

const api = {
  getConfig      : ()                                           => ipcRenderer.invoke('get-config') as Promise<CyberToolsConfig>,
  saveConfig     : (updates: Partial<CyberToolsConfig>)        => ipcRenderer.invoke('save-config', updates) as Promise<boolean>,
  saveConfigDeep : (updates: Record<string, unknown>)          => ipcRenderer.invoke('save-config-deep', updates) as Promise<boolean>,
  launchApp      : (appKey: string)                            => ipcRenderer.invoke('launch-app', appKey) as Promise<boolean>,
  updateNow      : ()                                          => ipcRenderer.invoke('update-now') as Promise<boolean>,
  hidePanel      : ()                                          => ipcRenderer.invoke('hide-panel') as Promise<void>,
  getVpnStatus   : ()                                          => ipcRenderer.invoke('get-vpn-status') as Promise<VpnStatus>,
  openFilePicker : (opts?: { filters?: Electron.FileFilter[] }) => ipcRenderer.invoke('open-file-picker', opts) as Promise<string | null>,
  openFolderPicker: ()                                         => ipcRenderer.invoke('open-folder-picker') as Promise<string | null>,
  checkFileExists : (filePath: string)                         => ipcRenderer.invoke('check-file-exists', filePath) as Promise<boolean>,
  clearActivity  : ()                                          => ipcRenderer.invoke('clear-activity') as Promise<void>,
  addActivity    : (entry: Partial<ActivityEntry>)             => ipcRenderer.invoke('add-activity', entry) as Promise<void>,
  getVersion     : ()                                          => ipcRenderer.invoke('get-version') as Promise<string>,
  addCustomSlot  : (slot: CustomSlot)                          => ipcRenderer.invoke('add-custom-slot', slot) as Promise<boolean>,
  removeCustomSlot: (index: number)                            => ipcRenderer.invoke('remove-custom-slot', index) as Promise<boolean>,
  updateCustomSlot: (index: number, slot: CustomSlot)          => ipcRenderer.invoke('update-custom-slot', { index, slot }) as Promise<boolean>,
  openExternal   : (url: string)                               => ipcRenderer.invoke('open-external', url) as Promise<void>,
  ecosystemReadEvents: ()                                      => ipcRenderer.invoke('ecosystem-read-events') as Promise<EcosystemEvent[]>,
  ecosystemEmit  : (appName: string, eventType: string, data: Record<string, unknown>) =>
                                                                  ipcRenderer.invoke('ecosystem-emit', appName, eventType, data) as Promise<void>,

  signalHideAfterSplash: () => ipcRenderer.send('hide-after-splash'),

  onConfigUpdate      : (cb: (config: CyberToolsConfig) => void)  => {
    const listener = (_e: Electron.IpcRendererEvent, config: CyberToolsConfig) => cb(config);
    ipcRenderer.on('config-update', listener);
    return () => ipcRenderer.removeListener('config-update', listener);
  },
  onVpnUpdate         : (cb: (status: VpnStatus) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, status: VpnStatus) => cb(status);
    ipcRenderer.on('vpn-update', listener);
    return () => ipcRenderer.removeListener('vpn-update', listener);
  },
  onUpdateAvailable   : (cb: (info: UpdateInfo) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, info: UpdateInfo) => cb(info);
    ipcRenderer.on('update-available',  listener);
    ipcRenderer.on('update:available',  listener);
    return () => {
      ipcRenderer.removeListener('update-available', listener);
      ipcRenderer.removeListener('update:available', listener);
    };
  },
  checkForUpdates     : () => ipcRenderer.invoke('update:check-now'),
  onSplashComplete    : (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('splash-complete', listener);
    return () => ipcRenderer.removeListener('splash-complete', listener);
  },
  onPanelShown        : (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('panel-shown', listener);
    return () => ipcRenderer.removeListener('panel-shown', listener);
  },
  onOpenSettings      : (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('open-settings', listener);
    return () => ipcRenderer.removeListener('open-settings', listener);
  },
  onCommandPalette    : (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('command-palette:toggle', listener);
    return () => ipcRenderer.removeListener('command-palette:toggle', listener);
  },

  // Backup
  backupSnapshot      : (password?: string): Promise<{ ok: boolean; file?: string; error?: string; count?: number; encrypted?: boolean }> =>
                          ipcRenderer.invoke('backup-snapshot', password),
  backupImport        : (password?: string): Promise<{ ok: boolean; count?: number; error?: string; encrypted?: boolean }> =>
                          ipcRenderer.invoke('backup-import', password),
  backupSavePassword  : (password: string): Promise<boolean> =>
                          ipcRenderer.invoke('backup-save-password', password),
  backupHasSavedPassword : (): Promise<boolean> =>
                          ipcRenderer.invoke('backup-has-saved-password'),
  backupClearPassword : (): Promise<boolean> =>
                          ipcRenderer.invoke('backup-clear-password'),

  // Lock the whole ecosystem (used by the ⌘K palette).
  lockEcosystem       : (): Promise<boolean> => ipcRenderer.invoke('lock-ecosystem'),

  onEcosystemUpdated  : (cb: (events: EcosystemEvent[]) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, events: EcosystemEvent[]) => cb(events);
    ipcRenderer.on('ecosystem-events-updated', listener);
    return () => ipcRenderer.removeListener('ecosystem-events-updated', listener);
  },

  appManager: {
    getStatus : () => ipcRenderer.invoke('app-manager:get-status') as Promise<import('../shared/types.js').AppStatus[]>,
    install   : (id: string) => ipcRenderer.invoke('app-manager:install', { id }) as Promise<{ success: boolean; error?: string }>,
    uninstall : (id: string, productName: string) => ipcRenderer.invoke('app-manager:uninstall', { id, productName }) as Promise<{ success: boolean; error?: string }>,
    open      : (productName: string) => ipcRenderer.invoke('app-manager:open', { productName }) as Promise<{ success: boolean; error?: string }>,
    onProgress: (cb: (data: { id: string; message: string }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, data: { id: string; message: string }) => cb(data);
      ipcRenderer.on('app-manager:progress', listener);
      return () => ipcRenderer.removeAllListeners('app-manager:progress');
    },
  },
};

contextBridge.exposeInMainWorld('api', api);

// ─── Search window bridge ─────────────────────────────────────────────────────

const searchApi = {
  query: (q: string) => ipcRenderer.invoke('search:query', q) as Promise<SearchResult[]>,
  close: ()         => ipcRenderer.invoke('search:close') as Promise<void>,
};

contextBridge.exposeInMainWorld('searchApi', searchApi);

export type ElectronAPI   = typeof api;
export type SearchAPI     = typeof searchApi;
