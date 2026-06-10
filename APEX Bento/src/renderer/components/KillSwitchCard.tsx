import { useState } from 'react';
import type { KillSwitchStatus } from '../../shared/types.js';
import { DetailDrawer } from './DetailDrawer.js';

interface Props {
  status: KillSwitchStatus;
}

type StateStyle = { pill: string; dot: string; label: string; description: string };

const STATE_STYLES: Record<string, StateStyle> = {
  running: {
    pill:        'ks-running',
    dot:         'bg-[var(--state-online)]',
    label:       'RUNNING',
    description: 'System operational in SIM_MODE. No capital at risk.'
  },
  paused: {
    pill:        'ks-paused',
    dot:         'bg-[var(--warning)]',
    label:       'PAUSED',
    description: 'Market-making halted. Positions held. Awaiting operator resume.'
  },
  liquidate: {
    pill:        'ks-liquidate',
    dot:         'bg-[var(--danger)]',
    label:       'LIQUIDATE',
    description: 'Orderly liquidation in progress. New quotes halted.'
  },
  'emergency-flatten': {
    pill:        'ks-emergency-flatten',
    dot:         'bg-[var(--sev-critical)]',
    label:       'EMERGENCY FLATTEN',
    description: 'Emergency flatten active. Market orders against all open positions.'
  },
  sunset: {
    pill:        'ks-sunset',
    dot:         'bg-[var(--text-muted)]',
    label:       'SUNSET',
    description: 'System decommissioned. No further activity.'
  }
};

export function KillSwitchCard({ status }: Props) {
  const [open, setOpen] = useState(false);
  const style = STATE_STYLES[status.state] ?? STATE_STYLES['paused'];
  const since = new Date(status.since);

  return (
    <>
      <div className="bento-card" onClick={() => setOpen(true)}>
        <p className="text-[var(--text-muted)] text-[11px] font-mono uppercase tracking-widest mb-3">
          Kill Switch
        </p>
        <div className="flex items-center gap-3 mb-3">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot} ${status.state === 'running' ? 'status-dot-pulse' : ''}`}
            style={{ '--pulse-rgb': status.state === 'running' ? '63,185,80' : '' } as React.CSSProperties}
          />
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${style.pill}`}>
            {style.label}
          </span>
        </div>
        <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed mb-2">
          {style.description}
        </p>
        <p className="text-[var(--text-muted)] text-[10px] font-mono">
          Since {since.toLocaleDateString()} {since.toLocaleTimeString()}
        </p>
      </div>

      <DetailDrawer open={open} onClose={() => setOpen(false)} title="Kill Switch State Machine">
        <div className="space-y-4">
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border-default)]">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${style.pill}`}>
                {style.label}
              </span>
            </div>
            <p className="text-[var(--text-primary)] text-[12px] leading-relaxed">{style.description}</p>
            <p className="text-[var(--text-muted)] text-[11px] font-mono mt-2">
              Last transition: {since.toISOString()}
            </p>
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-mono mb-2">State Machine</p>
            <div className="space-y-1.5">
              {Object.entries(STATE_STYLES).map(([s, st]) => (
                <div
                  key={s}
                  className={`flex items-center gap-2 p-2 rounded-[var(--radius-xs)] ${s === status.state ? 'bg-[var(--accent-tint)] border border-[var(--accent-border)]' : 'opacity-50'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                  <span className={`text-[10px] font-mono ${s === status.state ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                    {st.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border-subtle)]">
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-mono mb-1">Note</p>
            <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
              Default: SIM_MODE=true. Kill switch state machine operates as configured in apex/kill_switch.py. Auto-triggers: daily drawdown, staleness, heartbeat loss, equity floor breach.
            </p>
          </div>
        </div>
      </DetailDrawer>
    </>
  );
}
