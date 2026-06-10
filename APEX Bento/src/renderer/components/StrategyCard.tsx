import { useState } from 'react';
import type { StrategyManifest } from '../../shared/types.js';
import { DetailDrawer } from './DetailDrawer.js';

interface Props {
  manifests: StrategyManifest[];
}

function statusLabel(s: StrategyManifest['status']): string {
  const map: Record<StrategyManifest['status'], string> = {
    active: 'ACTIVE',
    demo:   'DEMO',
    stub:   'STUB',
    sunset: 'SUNSET'
  };
  return map[s];
}

function statusClass(s: StrategyManifest['status']): string {
  const map: Record<StrategyManifest['status'], string> = {
    active: 'text-[var(--state-online)]  bg-[rgba(63,185,80,0.10)]',
    demo:   'text-[var(--info)]           bg-[rgba(74,158,255,0.10)]',
    stub:   'text-[var(--text-muted)]     bg-[rgba(72,79,88,0.12)]',
    sunset: 'text-[var(--danger)]         bg-[rgba(248,81,73,0.10)]'
  };
  return map[s];
}

export function StrategyCard({ manifests }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<StrategyManifest | null>(null);

  function handleRowClick(m: StrategyManifest) {
    setSelected(m);
    setOpen(true);
  }

  return (
    <>
      <div className="bento-card" onClick={() => setOpen(true)}>
        <p className="text-[var(--text-muted)] text-[11px] font-mono uppercase tracking-widest mb-3">
          Strategy Vehicles
        </p>
        <div className="space-y-2">
          {manifests.map(m => (
            <div
              key={m.strategy_id}
              className="flex items-start gap-3 p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              onClick={e => { e.stopPropagation(); handleRowClick(m); }}
            >
              <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium shrink-0 ${statusClass(m.status)}`}>
                {statusLabel(m.status)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[var(--text-primary)] text-[13px] font-medium font-mono truncate">
                  {m.strategy_id}
                </p>
                <p className="text-[var(--text-secondary)] text-[11px] leading-tight mt-0.5">
                  {m.venue} {m.gate ? `· gate: ${m.gate}` : ''}
                </p>
              </div>
              {m.evidence_doc ? (
                <span className="text-[var(--accent)] text-[10px] font-mono shrink-0 mt-0.5">DOC</span>
              ) : (
                <span className="text-[var(--text-muted)] text-[10px] font-mono shrink-0 mt-0.5">—</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <DetailDrawer open={open} onClose={() => setOpen(false)} title="Strategy Vehicles">
        {selected ? (
          <StrategyDetail m={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="space-y-3">
            {manifests.map(m => (
              <div
                key={m.strategy_id}
                className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-2)] cursor-pointer hover:border-[var(--accent-border)] border border-transparent transition-colors"
                onClick={() => setSelected(m)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${statusClass(m.status)}`}>
                    {statusLabel(m.status)}
                  </span>
                  <span className="font-mono text-[13px] text-[var(--text-primary)]">{m.strategy_id}</span>
                </div>
                <p className="text-[var(--text-secondary)] text-[12px] leading-relaxed">{m.description}</p>
              </div>
            ))}
          </div>
        )}
      </DetailDrawer>
    </>
  );
}

function StrategyDetail({ m, onBack }: { m: StrategyManifest; onBack: () => void }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="text-[var(--text-muted)] text-[12px] hover:text-[var(--text-primary)] mb-4 transition-colors"
      >
        ← Back
      </button>
      <h3 className="font-mono text-[15px] text-[var(--text-primary)] mb-4">{m.strategy_id}</h3>
      <dl className="space-y-3">
        {[
          ['Status', m.status.toUpperCase()],
          ['Venue', m.venue],
          ['Gate', m.gate ?? 'none'],
          ['GATE-14 unlock required', m.gate_14_unlock_required ? 'Yes' : 'No'],
          ['Evidence doc', m.evidence_doc ?? 'none (stub)']
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-mono">{k}</dt>
            <dd className="text-[var(--text-primary)] text-[12px] mt-0.5 font-mono break-all">{v}</dd>
          </div>
        ))}
        <div>
          <dt className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-mono">Description</dt>
          <dd className="text-[var(--text-secondary)] text-[12px] mt-0.5 leading-relaxed">{m.description}</dd>
        </div>
      </dl>
    </div>
  );
}
