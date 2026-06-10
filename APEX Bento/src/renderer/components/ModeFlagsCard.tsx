import { useState } from 'react';
import type { ModeFlags } from '../../shared/types.js';
import { DetailDrawer } from './DetailDrawer.js';

interface Props {
  flags: ModeFlags;
}

interface FlagRow {
  key: keyof ModeFlags;
  label: string;
  description: string;
  gateRequired: string | null;
}

const FLAG_ROWS: FlagRow[] = [
  {
    key: 'sim_mode',
    label: 'SIM_MODE',
    description: 'All orders route to SimVenueAdapter. No capital, no venue actions.',
    gateRequired: null
  },
  {
    key: 'demo_mode',
    label: 'DEMO_MODE',
    description: 'Paper trading against real venue APIs. Requires GATE-3 (demo account) + GATE-12 PASS.',
    gateRequired: 'GATE-3 + GATE-12'
  },
  {
    key: 'live_mode',
    label: 'LIVE_MODE',
    description: 'Real capital. Requires GATE-12 PASS + GATE-12-B PASS + per-trade approval first 100-300 trades.',
    gateRequired: 'GATE-12 + GATE-12-B + GATE-13'
  },
  {
    key: 'automated_live',
    label: 'AUTOMATED_LIVE',
    description: 'Autonomous live trading. Requires GATE-14-UNLOCK operator marker in runbook.',
    gateRequired: 'GATE-14-UNLOCK'
  }
];

export function ModeFlagsCard({ flags }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="bento-card"
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Mode Flags — open detail"
        onClick={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
      >
        <p className="text-[var(--text-muted)] text-[11px] font-mono uppercase tracking-widest mb-3">
          Mode Flags
        </p>
        <div className="space-y-2">
          {FLAG_ROWS.map(row => {
            const active = flags[row.key];
            return (
              <div key={row.key} className="flex items-center justify-between">
                <span className="font-mono text-[12px] text-[var(--text-secondary)]">{row.label}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                  active
                    ? 'text-[var(--state-online)] bg-[rgba(63,185,80,0.10)]'
                    : 'text-[var(--text-muted)] bg-[rgba(72,79,88,0.10)]'
                }`}>
                  {active ? 'true' : 'false'}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[var(--text-muted)] text-[10px] mt-3">
          Default config: SIM_MODE only. Capital-bearing modes require operator gates.
        </p>
      </div>

      <DetailDrawer open={open} onClose={() => setOpen(false)} title="Mode Flags">
        <div className="space-y-3">
          {FLAG_ROWS.map(row => {
            const active = flags[row.key];
            return (
              <div
                key={row.key}
                className={`p-3 rounded-[var(--radius-md)] border ${
                  active
                    ? 'bg-[rgba(63,185,80,0.06)] border-[rgba(63,185,80,0.20)]'
                    : 'bg-[var(--surface-2)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                    active
                      ? 'text-[var(--state-online)] bg-[rgba(63,185,80,0.10)]'
                      : 'text-[var(--text-muted)] bg-[rgba(72,79,88,0.12)]'
                  }`}>
                    {active ? 'true' : 'false'}
                  </span>
                  <span className="font-mono text-[13px] text-[var(--text-primary)]">{row.label}</span>
                </div>
                <p className="text-[var(--text-secondary)] text-[12px] leading-relaxed">{row.description}</p>
                {row.gateRequired && !active && (
                  <p className="text-[var(--text-muted)] text-[10px] mt-1.5 font-mono">
                    Gate: {row.gateRequired}
                  </p>
                )}
              </div>
            );
          })}
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--accent-tint)] border border-[var(--accent-border)]">
            <p className="text-[var(--accent)] text-[11px] font-mono font-medium mb-1">
              Operator directive 2026-06-08
            </p>
            <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
              Keep SIM_MODE. No capital, entity, or access-path decision before GATE-12 PASS. Path D (Betfair AU) sole live candidate.
            </p>
          </div>
        </div>
      </DetailDrawer>
    </>
  );
}
