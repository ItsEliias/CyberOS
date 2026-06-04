import type { GhostVaultAPI, ElectronAPI, GhostVaultSpecAPI } from '../main/preload';

declare global {
  interface Window {
    ghostvault:     GhostVaultAPI;
    electronAPI:    ElectronAPI;
    ghostvaultSpec: GhostVaultSpecAPI;
  }
}
