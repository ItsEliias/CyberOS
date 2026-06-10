import { contextBridge, ipcRenderer } from 'electron';
import type {
  StrategyManifest,
  GateEntry,
  KillSwitchStatus,
  ModeFlags,
  AuditEvent,
  JbeckerFixtureResult,
  ApexBridge
} from '../shared/types.js';

const apex: ApexBridge = {
  getManifests:     () => ipcRenderer.invoke('apex:get-manifests') as Promise<StrategyManifest[]>,
  getGates:         () => ipcRenderer.invoke('apex:get-gates') as Promise<GateEntry[]>,
  getKillSwitch:    () => ipcRenderer.invoke('apex:get-kill-switch') as Promise<KillSwitchStatus>,
  getModeFlags:     () => ipcRenderer.invoke('apex:get-mode-flags') as Promise<ModeFlags>,
  getAuditEvents:   () => ipcRenderer.invoke('apex:get-audit-events') as Promise<AuditEvent[]>,
  getJbeckerFixture:() => ipcRenderer.invoke('apex:get-jbecker-fixture') as Promise<JbeckerFixtureResult>
};

contextBridge.exposeInMainWorld('apex', apex);

export type { ApexBridge };
