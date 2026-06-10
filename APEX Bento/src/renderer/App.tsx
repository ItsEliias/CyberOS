import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  StrategyManifest, GateEntry, KillSwitchStatus,
  ModeFlags, AuditEvent, JbeckerRow
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
  jbecker: JbeckerRow[];
}

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
    jbecker: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const refreshingRef = useRef(false);

  // Re-fetchable IPC pull. Initial mount sets `loading` (blocks the grid);
  // subsequent refreshes set `refreshing` (the button busy-state, grid stays).
  // Per React docs, updater functions keep this callback dependency-free
  // (https://react.dev/reference/react/useCallback).
  const refresh = useCallback((isInitial: boolean) => {
    const apex = window.apex;
    if (!apex) { setLoading(false); return; }
    if (refreshingRef.current) return; // de-dupe concurrent refreshes
    refreshingRef.current = true;
    if (!isInitial) setRefreshing(true);

    Promise.all([
      apex.getManifests(),
      apex.getGates(),
      apex.getKillSwitch(),
      apex.getModeFlags(),
      apex.getAuditEvents(),
      apex.getJbeckerFixture()
    ]).then(([manifests, gates, killSwitch, modeFlags, auditEvents, jbecker]) => {
      setState({ manifests, gates, killSwitch, modeFlags, auditEvents, jbecker });
      setLastRefresh(new Date());
    }).catch(console.error).finally(() => {
      refreshingRef.current = false;
      if (isInitial) setLoading(false); else setRefreshing(false);
    });
  }, []);

  useEffect(() => {
    refresh(true);
  }, [refresh]);

  // Cmd/Ctrl+R re-fetches without reloading the renderer. Prevents the default
  // browser reload which would wipe component state + drawer open state.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        refresh(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [refresh]);

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

        {/* Right: Refresh control + Kill-switch state pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <RefreshButton
            refreshing={refreshing}
            lastRefresh={lastRefresh}
            onRefresh={() => refresh(false)}
          />
          <KillSwitchPill state={ks.state} />
        </div>
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
            <EdgeReplicationCard rows={state.jbecker} />
          </div>
        )}
      </main>
    </div>
  );
}

interface RefreshButtonProps {
  refreshing: boolean;
  lastRefresh: Date | null;
  onRefresh: () => void;
}

function RefreshButton({ refreshing, lastRefresh, onRefresh }: RefreshButtonProps) {
  // ARIA semantics per W3C button APG (https://www.w3.org/WAI/ARIA/apg/patterns/button/):
  // explicit aria-label since the glyph alone isn't an accessible name.
  // aria-busy="true" while a refresh is in flight, per MDN aria-busy guidance
  // (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy).
  const timeLabel = lastRefresh
    ? lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap'
      }}>
        last refresh {timeLabel}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label={refreshing ? 'Refreshing APEX state' : `Refresh APEX state. Last refresh ${timeLabel}. Cmd or Ctrl + R.`}
        aria-busy={refreshing}
        title="Refresh (Cmd/Ctrl+R)"
        className="apex-refresh-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)',
          cursor: refreshing ? 'wait' : 'pointer',
          opacity: refreshing ? 0.7 : 1,
          fontSize: 14,
          lineHeight: 1,
          transition: 'border-color 150ms ease, color 150ms ease'
        }}
      >
        <span
          aria-hidden="true"
          className={refreshing ? 'apex-spin' : ''}
          style={{ display: 'inline-block' }}
        >
          ⟳
        </span>
      </button>
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
