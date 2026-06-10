import { useEffect, useState } from 'react';
import type {
  StrategyManifest, GateEntry, KillSwitchStatus,
  ModeFlags, AuditEvent, JbeckerFixtureResult
} from '../shared/types.js';
import { StrategyCard } from './components/StrategyCard.js';
import { GateCard } from './components/GateCard.js';
import { KillSwitchCard } from './components/KillSwitchCard.js';
import { ModeFlagsCard } from './components/ModeFlagsCard.js';
import { AuditFeedCard } from './components/AuditFeedCard.js';
import { EdgeReplicationCard } from './components/EdgeReplicationCard.js';

interface AppState {
  manifests: StrategyManifest[];
  gates: GateEntry[];
  killSwitch: KillSwitchStatus | null;
  modeFlags: ModeFlags | null;
  auditEvents: AuditEvent[];
  jbecker: JbeckerFixtureResult;
}

const DEFAULT_JBECKER: JbeckerFixtureResult = {
  ok: false,
  reason: 'not_found',
  resolved_path: '',
  source: 'default',
  message: 'Fixture not yet loaded'
};

const DEFAULT_KILL_SWITCH: KillSwitchStatus = {
  state: 'running',
  since: new Date('2026-06-10T00:00:00Z').toISOString()
};

const DEFAULT_MODE_FLAGS: ModeFlags = {
  sim_mode: true,
  demo_mode: false,
  live_mode: false,
  automated_live: false
};

export default function App() {
  const [state, setState] = useState<AppState>({
    manifests: [],
    gates: [],
    killSwitch: null,
    modeFlags: null,
    auditEvents: [],
    jbecker: DEFAULT_JBECKER
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apex = window.apex;
    if (!apex) { setLoading(false); return; }

    Promise.all([
      apex.getManifests(),
      apex.getGates(),
      apex.getKillSwitch(),
      apex.getModeFlags(),
      apex.getAuditEvents(),
      apex.getJbeckerFixture()
    ]).then(([manifests, gates, killSwitch, modeFlags, auditEvents, jbecker]) => {
      setState({ manifests, gates, killSwitch, modeFlags, auditEvents, jbecker });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const ks = state.killSwitch ?? DEFAULT_KILL_SWITCH;
  const flags = state.modeFlags ?? DEFAULT_MODE_FLAGS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-0)' }}>
      {/* Title bar drag region */}
      <div className="titlebar" />

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border-default)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: 'var(--surface-1)'
      }}>
        {/* Left: APEX logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-tint)',
            border: '1px solid var(--accent-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
              A
            </span>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              APEX
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2 }}>
              Bento — Read-Only Observability
            </p>
          </div>
        </div>

        {/* Center: Operator directive banner */}
        <div style={{
          flex: 1,
          margin: '0 20px',
          padding: '6px 12px',
          background: 'var(--accent-tint)',
          border: '1px solid var(--accent-border)',
          borderRadius: 'var(--radius-sm)',
          textAlign: 'center'
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', lineHeight: 1.4 }}>
            Path D only — Betfair AU, SIM_MODE, GATE-12 required before capital
          </p>
        </div>

        {/* Right: Kill-switch state pill */}
        <KillSwitchPill state={ks.state} />
      </header>

      {/* Bento grid */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px 20px'
      }}>
        {loading ? (
          <LoadingState />
        ) : (
          <div className="bento-grid">
            <StrategyCard manifests={state.manifests} />
            <GateCard gates={state.gates} />
            <KillSwitchCard status={ks} />
            <ModeFlagsCard flags={flags} />
            <AuditFeedCard events={state.auditEvents} />
            <EdgeReplicationCard fixture={state.jbecker} />
          </div>
        )}
      </main>
    </div>
  );
}

function KillSwitchPill({ state }: { state: KillSwitchStatus['state'] }) {
  const map: Record<string, { cls: string; label: string }> = {
    running:            { cls: 'ks-running',          label: 'RUNNING' },
    paused:             { cls: 'ks-paused',            label: 'PAUSED' },
    liquidate:          { cls: 'ks-liquidate',         label: 'LIQUIDATE' },
    'emergency-flatten':{ cls: 'ks-emergency-flatten', label: 'EMERGENCY' },
    sunset:             { cls: 'ks-sunset',            label: 'SUNSET' }
  };
  const { cls, label } = map[state] ?? map['paused'];

  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-medium ${cls}`}>
      {label}
    </span>
  );
}

function LoadingState() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12
    }}>
      Loading APEX state...
    </div>
  );
}
