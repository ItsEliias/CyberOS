import { contextBridge, ipcRenderer } from 'electron';
import type {
  CommandEntry, SessionContext, CapturePayload, CaptureResult,
  ExternalHookStatus, ExternalShellId,
} from '../shared/types.js';

const api = {
  // ── PTY ───────────────────────────────────────────────────────────────────
  ptyCreate: (id: string, cols: number, rows: number): Promise<{ success?: boolean; error?: string }> =>
    ipcRenderer.invoke('pty-create', { id, cols, rows }),

  ptyWrite: (id: string, data: string): void =>
    ipcRenderer.send('pty-write', { id, data }),

  ptyResize: (id: string, cols: number, rows: number): void =>
    ipcRenderer.send('pty-resize', { id, cols, rows }),

  ptyKill: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('pty-kill', { id }),

  // ── PTY Events ────────────────────────────────────────────────────────────
  onPtyData: (cb: (payload: { id: string; data: string }) => void): (() => void) => {
    const fn = (_: Electron.IpcRendererEvent, p: { id: string; data: string }) => cb(p);
    ipcRenderer.on('pty-data', fn);
    return () => ipcRenderer.removeListener('pty-data', fn);
  },

  onPtyExit: (cb: (payload: { id: string; code: number }) => void): (() => void) => {
    const fn = (_: Electron.IpcRendererEvent, p: { id: string; code: number }) => cb(p);
    ipcRenderer.on('pty-exit', fn);
    return () => ipcRenderer.removeListener('pty-exit', fn);
  },

  // ── Session ───────────────────────────────────────────────────────────────
  getSessionContext: (): Promise<SessionContext> =>
    ipcRenderer.invoke('get-session-context'),

  logCommands: (commands: CommandEntry[]): Promise<{ success?: boolean; error?: string }> =>
    ipcRenderer.invoke('log-commands', { commands }),

  getVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-version'),

  saveCapture: (payload: CapturePayload): Promise<CaptureResult> =>
    ipcRenderer.invoke('capture:save', payload),

  onPasteCommand: (cb: (payload: { command: string; stepTitle: string; playbookTitle: string; source: string; queuedAt: string }) => void): (() => void) => {
    const fn = (_: Electron.IpcRendererEvent, p: { command: string; stepTitle: string; playbookTitle: string; source: string; queuedAt: string }) => cb(p);
    ipcRenderer.on('terminal:paste-command', fn);
    return () => ipcRenderer.removeListener('terminal:paste-command', fn);
  },

  exportHistory: (content: string): Promise<{ success: boolean; path?: string; reason?: string }> =>
    ipcRenderer.invoke('terminallink:export:dialog', content),

  emitEvent: (event: string, data?: Record<string, unknown>): Promise<boolean> =>
    ipcRenderer.invoke('terminallink:event:emit', event, data ?? {}),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('open-external', url),

  // ── Session recording ─────────────────────────────────────────────────────
  saveRecording: (sessionId: string, data: unknown): Promise<{ success: boolean; path?: string }> =>
    ipcRenderer.invoke('terminallink:recording:save', { sessionId, data }),

  loadRecordings: (): Promise<unknown[]> =>
    ipcRenderer.invoke('terminallink:recording:list'),

  // ── Preferences ───────────────────────────────────────────────────────────
  savePrefs: (prefs: Record<string, unknown>): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('terminallink:prefs:save', prefs),

  loadPrefs: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('terminallink:prefs:load'),

  // ── Export session ────────────────────────────────────────────────────────
  exportSession: (opts: { content: string; defaultName: string; ext: string }): Promise<{ success: boolean; path?: string }> =>
    ipcRenderer.invoke('terminallink:session:export', opts),

  // ── GhostVault text note ──────────────────────────────────────────────────
  saveTextToVault: (payload: { title: string; content: string; folder: string }): Promise<{ success: boolean; path?: string }> =>
    ipcRenderer.invoke('terminallink:vault:save-text', payload),

  // Alias used by GhostVaultModal
  saveToGhostVault: (title: string, content: string, folder?: string): Promise<{ ok: boolean; path: string }> =>
    ipcRenderer.invoke('terminallink:vault:save-text', { title, content, folder: folder ?? '' })
      .then((r: { success: boolean; path?: string }) => ({ ok: r.success, path: r.path ?? '' })),

  // Check binary exists in PATH
  checkBinary: (bin: string): Promise<boolean> =>
    ipcRenderer.invoke('terminallink:binary:check', bin),

  // ── External Shell Hook ─────────────────────────────────────────────────
  externalShellInstall: (
    shells: ExternalShellId[],
  ): Promise<{ success: boolean; results: Array<{ shell: ExternalShellId; rcPath: string; changed: boolean; error?: string }>; status: ExternalHookStatus }> =>
    ipcRenderer.invoke('terminallink:externalshell:install', shells),

  externalShellUninstall: (
    shells?: ExternalShellId[],
  ): Promise<{ success: boolean; results: Array<{ shell: ExternalShellId; rcPath: string; changed: boolean; error?: string }>; status: ExternalHookStatus }> =>
    ipcRenderer.invoke('terminallink:externalshell:uninstall', shells),

  externalShellStatus: (): Promise<ExternalHookStatus> =>
    ipcRenderer.invoke('terminallink:externalshell:status'),

  externalShellStartTail: (): Promise<ExternalHookStatus> =>
    ipcRenderer.invoke('terminallink:externalshell:start-tail'),

  externalShellStopTail: (): Promise<ExternalHookStatus> =>
    ipcRenderer.invoke('terminallink:externalshell:stop-tail'),

  onExternalShellCommand: (cb: (entry: CommandEntry) => void): (() => void) => {
    const fn = (_: Electron.IpcRendererEvent, p: CommandEntry) => cb(p);
    ipcRenderer.on('externalshell:command', fn);
    return () => ipcRenderer.removeListener('externalshell:command', fn);
  },

  // ── Tray pending actions (from CyberTools Launcher) ───────────────────────
  onPendingAction: (cb: (action: string) => void): (() => void) => {
    const fn = (_: Electron.IpcRendererEvent, action: string) => cb(action);
    ipcRenderer.on('pending-action', fn);
    return () => ipcRenderer.removeListener('pending-action', fn);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type TerminalLinkAPI = typeof api;
