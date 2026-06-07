import { contextBridge, ipcRenderer } from 'electron';
import type {
  GhostVaultConfig, NoteFile, NewNoteResult, SaveCaptureResult,
  OllamaStatus, OllamaFormatResult, ThemeConfig, NoteVersion
} from '../shared/types.js';

const ghostvault = {
  // Platform — synchronously available so renderer can adapt layout
  // (e.g. macOS traffic-light spacer) without an IPC round-trip.
  platform: process.platform,

  getConfig      : ()                                    => ipcRenderer.invoke('get-config') as Promise<GhostVaultConfig>,
  saveConfig     : (cfg: Partial<GhostVaultConfig>)      => ipcRenderer.invoke('save-config', cfg) as Promise<boolean>,
  getVersion     : ()                                    => ipcRenderer.invoke('get-version') as Promise<string>,

  setAlwaysOnTop : (v: boolean)                          => ipcRenderer.invoke('set-always-on-top', v) as Promise<boolean>,
  getAlwaysOnTop : ()                                    => ipcRenderer.invoke('get-always-on-top') as Promise<boolean>,
  minimizeWindow : ()                                    => ipcRenderer.invoke('minimize-window') as Promise<void>,
  closeWindow    : ()                                    => ipcRenderer.invoke('close-window') as Promise<void>,

  pickVaultDir   : (opts?: { skipFolderCreate?: boolean }) => ipcRenderer.invoke('pick-vault-dir', opts || {}) as Promise<string | null>,
  loadVault      : (vaultPath: string)                   => ipcRenderer.invoke('load-vault', vaultPath) as Promise<{ notes: NoteFile[]; folders: string[] }>,
  listNotes      : (vaultPath: string)                   => ipcRenderer.invoke('list-notes', vaultPath) as Promise<NoteFile[]>,
  readNote       : (filePath: string)                    => ipcRenderer.invoke('read-note', filePath) as Promise<string>,
  saveNote       : (filePath: string, c: string)         => ipcRenderer.invoke('write-note', filePath, c) as Promise<boolean>,
  writeNote      : (filePath: string, c: string)         => ipcRenderer.invoke('write-note', filePath, c) as Promise<boolean>,
  deleteNote     : (filePath: string)                    => ipcRenderer.invoke('delete-note', filePath) as Promise<boolean>,
  renameNote     : (old: string, nw: string)             => ipcRenderer.invoke('rename-note', old, nw) as Promise<boolean>,
  newNote        : (vp: string, folder: string, t: string) => ipcRenderer.invoke('new-note', vp, folder, t) as Promise<NewNoteResult>,
  createFolder   : (vp: string, name: string)            => ipcRenderer.invoke('create-folder', vp, name) as Promise<boolean>,
  listFolders    : (vp: string)                          => ipcRenderer.invoke('list-folders', vp) as Promise<string[]>,
  revealInFinder : (p: string)                           => ipcRenderer.invoke('reveal-in-finder', p) as Promise<void>,
  openExternal   : (url: string)                         => ipcRenderer.invoke('open-external', url) as Promise<void>,

  toggleCapture  : ()                                    => ipcRenderer.invoke('toggle-capture') as Promise<void>,
  hideCapture    : ()                                    => ipcRenderer.invoke('hide-capture') as Promise<void>,
  minimizeCapture: ()                                    => ipcRenderer.invoke('minimize-capture') as Promise<void>,
  saveCaptureNote: (data: { folder: string; title?: string; text: string }) =>
                                                            ipcRenderer.invoke('save-capture-note', data) as Promise<SaveCaptureResult>,
  getCaptureTheme: ()                                    => ipcRenderer.invoke('get-capture-theme') as Promise<ThemeConfig>,
  saveCaptureTheme: (theme: ThemeConfig)                 => ipcRenderer.invoke('save-capture-theme', theme) as Promise<boolean>,

  getOllamaStatus: ()                                    => ipcRenderer.invoke('ollama-check') as Promise<OllamaStatus>,
  ollamaCheck    : ()                                    => ipcRenderer.invoke('ollama-check') as Promise<OllamaStatus>,
  ollamaFormat   : (data: { text: string; mode: string; ctx: string; model?: string }) =>
                                                            ipcRenderer.invoke('ollama-format', data) as Promise<OllamaFormatResult>,
  closeCapture   : ()                                    => ipcRenderer.invoke('hide-capture') as Promise<void>,

  getCaptureHotkey: ()                                   => ipcRenderer.invoke('get-capture-hotkey') as Promise<string>,
  setCaptureHotkey: (key: string)                        => ipcRenderer.invoke('set-capture-hotkey', key) as Promise<{ ok: boolean; error?: string }>,

  readClipboard  : ()                                    => ipcRenderer.invoke('read-clipboard') as Promise<string>,

  exportNotes    : (payload: { sessionName: string; notes: string }) =>
                                                            ipcRenderer.invoke('ghostvault:export-notes', payload) as Promise<boolean>,

  getSessionContext: ()                                  => ipcRenderer.invoke('get-session-context') as Promise<{ currentLab: string | null; activeTarget: string | null; activeIP: string | null } | null>,

  moveNote       : (srcPath: string, destFolder: string) => ipcRenderer.invoke('move-note', srcPath, destFolder) as Promise<boolean>,

  noteVersionsList: (notePath: string)                  => ipcRenderer.invoke('note:versions:list', notePath) as Promise<NoteVersion[]>,
  noteVersionsSave: (notePath: string, content: string) => ipcRenderer.invoke('note:versions:save', notePath, content) as Promise<void>,

  lockNote       : (notePath: string, password: string) => ipcRenderer.invoke('ghostvault:note:lock', notePath, password) as Promise<{ ok: boolean; error?: string }>,
  unlockNote     : (notePath: string, password: string) => ipcRenderer.invoke('ghostvault:note:unlock', notePath, password) as Promise<{ ok: boolean; content?: string; error?: string }>,

  exportAsHtml   : (html: string, noteName: string)     => ipcRenderer.invoke('note:export:html', html, noteName) as Promise<boolean>,
  exportAsPdf    : (html: string, noteName: string)      => ipcRenderer.invoke('note:export:pdf', html, noteName) as Promise<boolean>,

  onOpenCapture  : (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('quick-capture', listener);
    return () => ipcRenderer.removeListener('quick-capture', listener);
  },
  onNewNote      : (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('new-note-shortcut', listener);
    return () => ipcRenderer.removeListener('new-note-shortcut', listener);
  },
  onThemeChange  : (cb: (t: ThemeConfig) => void) => {
    const listener = (_: Electron.IpcRendererEvent, t: ThemeConfig) => cb(t);
    ipcRenderer.on('theme-change', listener);
    return () => ipcRenderer.removeListener('theme-change', listener);
  },
  onAlwaysOnTopChange: (cb: (v: boolean) => void) => {
    const listener = (_: Electron.IpcRendererEvent, v: boolean) => cb(v);
    ipcRenderer.on('aot-change', listener);
    return () => ipcRenderer.removeListener('aot-change', listener);
  },
  onQuickCapture : (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('quick-capture', listener);
    return () => ipcRenderer.removeListener('quick-capture', listener);
  },
  onCaptureFolders: (cb: (folders: string[]) => void) => {
    const listener = (_: Electron.IpcRendererEvent, folders: string[]) => cb(folders);
    ipcRenderer.on('capture-folders', listener);
    return () => ipcRenderer.removeListener('capture-folders', listener);
  },
  onVaultRefresh : (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('vault-refresh', listener);
    return () => ipcRenderer.removeListener('vault-refresh', listener);
  },
  onPendingAction: (cb: (action: string) => void) => {
    const listener = (_: Electron.IpcRendererEvent, action: string) => cb(action);
    ipcRenderer.on('pending-action', listener);
    return () => ipcRenderer.removeListener('pending-action', listener);
  },

  // SSO soft-lock: ask the main process whether CredVault has an active session.
  getSSO         : (): Promise<{ unlocked: boolean; expiresAt?: string | null }> =>
                     ipcRenderer.invoke('get-sso'),
  openCredVault  : (): Promise<boolean> => ipcRenderer.invoke('open-credvault'),
};

const electronAPI = {
  ecosystemEmit: (appName: string, eventType: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('ecosystem-emit', appName, eventType, data) as Promise<void>,
};

// Spec-canonical channel names (ghostvault:*) exposed as a separate namespace
// so spec-aligned code can use them directly if needed
const ghostvaultSpec = {
  vaultList:      (vaultPath: string)                           => ipcRenderer.invoke('ghostvault:vault:list', vaultPath),
  noteRead:       (filePath: string)                            => ipcRenderer.invoke('ghostvault:note:read', filePath),
  noteWrite:      (filePath: string, content: string)           => ipcRenderer.invoke('ghostvault:note:write', filePath, content),
  noteDelete:     (filePath: string)                            => ipcRenderer.invoke('ghostvault:note:delete', filePath),
  noteSearch:     (vaultPath: string, query: string)            => ipcRenderer.invoke('ghostvault:note:search', vaultPath, query),
  configRead:     ()                                            => ipcRenderer.invoke('ghostvault:config:read'),
  eventEmit:      (event: { appName: string; eventType: string; data: Record<string, unknown> }) =>
                                                                   ipcRenderer.invoke('ghostvault:event:emit', event),
  clipboardRead:  ()                                            => ipcRenderer.invoke('ghostvault:clipboard:read'),
  ollamaModels:   ()                                            => ipcRenderer.invoke('ghostvault:ollama:models'),
  ollamaChat:     (model: string, messages: { role: string; content: string }[]) =>
                                                                   ipcRenderer.invoke('ghostvault:ollama:chat', model, messages),
};

contextBridge.exposeInMainWorld('ghostvault', ghostvault);
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('ghostvaultSpec', ghostvaultSpec);

export type GhostVaultAPI     = typeof ghostvault;
export type ElectronAPI       = typeof electronAPI;
export type GhostVaultSpecAPI = typeof ghostvaultSpec;
