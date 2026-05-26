/// <reference types="vite/client" />
import type { CyberLabAPI } from '../main/preload';

declare global {
  interface Window {
    electronAPI: CyberLabAPI;
  }
}
