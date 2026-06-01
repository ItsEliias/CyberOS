/// <reference types="vite/client" />

import type { TerminalLinkAPI } from '../main/preload';

declare global {
  interface Window {
    electronAPI: TerminalLinkAPI;
  }
}
