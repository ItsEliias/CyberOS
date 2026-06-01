import type { VaultCoreAPI } from '../main/preload';

declare global {
  interface Window {
    electronAPI: VaultCoreAPI;
  }
}
