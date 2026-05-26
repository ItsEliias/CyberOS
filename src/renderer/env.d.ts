import type { GhostVaultAPI, ElectronAPI } from '../main/preload';

declare global {
  interface Window {
    ghostvault: GhostVaultAPI;
    electronAPI: ElectronAPI;
  }
}
