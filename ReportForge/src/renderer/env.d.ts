import type { ReportForgeAPI, ElectronAPI } from '../main/preload';

declare global {
  interface Window {
    reportforge: ReportForgeAPI;
    electronAPI: ElectronAPI;
  }
}
