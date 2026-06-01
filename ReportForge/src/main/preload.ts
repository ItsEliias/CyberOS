import { contextBridge, ipcRenderer } from 'electron';
import type { Report, ExportResult, WriteupFile, ReconDeskTarget, CyberToolsSharedConfig } from '../shared/types.js';

const reportforge = {
  getVersion     : ()                         => ipcRenderer.invoke('get-version') as Promise<string>,
  minimizeWindow : ()                         => ipcRenderer.invoke('minimize-window') as Promise<void>,
  closeWindow    : ()                         => ipcRenderer.invoke('close-window') as Promise<void>,

  loadReports    : ()                         => ipcRenderer.invoke('load-reports') as Promise<Report[]>,
  saveReport     : (r: Report)                => ipcRenderer.invoke('save-report', r) as Promise<boolean>,
  deleteReport   : (id: string)               => ipcRenderer.invoke('delete-report', id) as Promise<boolean>,
  duplicateReport: (id: string)               => ipcRenderer.invoke('duplicate-report', id) as Promise<Report | null>,

  getSharedConfig    : ()                     => ipcRenderer.invoke('get-shared-config') as Promise<CyberToolsSharedConfig>,
  listReconTargets   : ()                     => ipcRenderer.invoke('list-recon-targets') as Promise<ReconDeskTarget[]>,
  listWriteupFiles   : ()                     => ipcRenderer.invoke('list-writeup-files') as Promise<WriteupFile[]>,
  readWriteupFile    : (p: string)            => ipcRenderer.invoke('read-writeup-file', p) as Promise<string>,

  exportMarkdown : (r: Report)                => ipcRenderer.invoke('export-markdown', r) as Promise<ExportResult>,
  exportPDF      : (r: Report)                => ipcRenderer.invoke('export-pdf', r) as Promise<ExportResult>,
  signalPrintReady: ()                        => ipcRenderer.invoke('signal-print-ready') as Promise<boolean>,

  openExternal   : (url: string)              => ipcRenderer.invoke('open-external', url) as Promise<void>,

  onTriggerPrintView: (cb: (report: Report) => void) => {
    const listener = (_: Electron.IpcRendererEvent, r: Report) => cb(r);
    ipcRenderer.on('trigger-print-view', listener);
    return () => ipcRenderer.removeListener('trigger-print-view', listener);
  },
  onPrintDone: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('print-done', listener);
    return () => ipcRenderer.removeListener('print-done', listener);
  },
};

const electronAPI = {
  ecosystemEmit: (appName: string, event: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('ecosystem-emit', appName, event, data) as Promise<void>,
};

contextBridge.exposeInMainWorld('reportforge', reportforge);
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ReportForgeAPI = typeof reportforge;
export type ElectronAPI    = typeof electronAPI;
