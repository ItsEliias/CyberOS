export type StrategyStatus = 'active' | 'demo' | 'stub' | 'sunset';
export type VenueId = 'betfair_au' | 'sim';
export type KillSwitchState = 'running' | 'paused' | 'liquidate' | 'emergency-flatten' | 'sunset';
export type GateState = 'PENDING' | 'PASS' | 'FAIL' | 'RESOLVED' | 'BLOCKED' | 'DEFERRED';

export interface StrategyManifest {
  strategy_id: string;
  status: StrategyStatus;
  gate: string | null;
  venue: VenueId;
  evidence_doc: string | null;
  gate_14_unlock_required: boolean;
  description: string;
}

export interface GateEntry {
  id: string;
  label: string;
  state: GateState;
  detail: string;
  resolved_at?: string;
}

export interface KillSwitchStatus {
  state: KillSwitchState;
  since: string;
}

export interface ModeFlags {
  sim_mode: boolean;
  demo_mode: boolean;
  live_mode: boolean;
  automated_live: boolean;
}

export interface AuditEvent {
  ts: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  module: string;
  message: string;
}

export interface JbeckerRow {
  contract_id: string;
  pre_commission_price_cents: number;
  commission_bps: number;
  realised_return: number;
  side: 'maker' | 'taker';
}

export interface ApexBridge {
  getManifests: () => Promise<StrategyManifest[]>;
  getGates: () => Promise<GateEntry[]>;
  getKillSwitch: () => Promise<KillSwitchStatus>;
  getModeFlags: () => Promise<ModeFlags>;
  getAuditEvents: () => Promise<AuditEvent[]>;
  getJbeckerFixture: () => Promise<JbeckerRow[]>;
}

declare global {
  interface Window {
    apex: ApexBridge;
  }
}
