/// <reference types="vite/client" />

import type { ApexBridge } from '../shared/types.js';

declare global {
  interface Window {
    apex: ApexBridge;
  }
}
