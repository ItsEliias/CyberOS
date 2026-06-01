import { contextBridge, ipcRenderer } from 'electron';
import type { CommandEntry, SessionContext, CapturePayload, CaptureResult } from '../shared/types.js';

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
    const fn = (_: Electron.IpcRendererEvent, payload: { id: string; data: string }) => cb(payload);
    ipcRenderer.on('pty-data', fn);
    return () => ipcRenderer.removeListener('pty-data', fn);
  },

  onPtyExit: (cb: (payload: { id: string; code: number }) => void): (() => void) => {
    const fn = (_: Electron.IpcRendererEvent, payload: { id: string; code: number }) => cb(payload);
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
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type TerminalLinkAPI = typeof api;
