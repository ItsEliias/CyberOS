import { useState } from 'react';
import type { GateEntry } from '../../shared/types.js';
import { DetailDrawer } from './DetailDrawer.js';
import { formatLocalDateShort } from '../lib/datetime.js';

interface Props {
  gates: GateEntry[];
}

function stateClass(s: GateEntry['state']): string {
  const map: Record<GateEntry['state'], string> = {
    PENDING:  'gate-pending',
    PASS:     'gate-pass',
    FAIL:     'gate-fail',
    RESOLVED: 'gate-resolved',
    BLOCKED:  'gate-blocked',
    DEFERRED: 'gate-deferred'
  };
  return map[s] ?? 'gate-pending';
}

function stateIcon(s: GateEntry['state']): string {
  const map: Record<GateEntry['state'], string> = {
    PENDING:  '○',
    PASS:     '✓',
    FAIL:     '✗',
    RESOLVED: '●',
    BLOCKED:  '⊗',
    DEFERRED: '—'
  };
  return map[s] ?? '○';
}

export function GateCard({ gates }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<GateEntry | null>(null);

  function handleRowClick(g: GateEntry) {
    setSelected(g);
    setOpen(true);
  }

  return (
    <>
      <div className="bento-card" onClick={() => setOpen(true)}>
        <p className="text-[var(--text-muted)] text-[11px] font-mono uppercase tracking-widest mb-3">
          Gate Status
        </p>
        <div className="space-y-1.5">
          {gates.map(g => (
            <div
              key={g.id}
              className="flex items-center gap-2.5 p-1.5 rounded-[var(--radius-xs)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              onClick={e => { e.stopPropagation(); handleRowClick(g); }}
            >
              <span className={`text-[11px] font-mono w-4 text-center ${stateClass(g.state)}`}>
                {stateIcon(g.state)}
              </span>
              <span className="text-[var(--text-secondary)] text-[11px] font-mono w-20 shrink-0">{g.id}</span>
              <span className="text-[var(--text-primary)] text-[12px] truncate flex-1">{g.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium shrink-0 ${stateClass(g.state)}`}>
                {g.state}
              </span>
            </div>
          ))}
        </div>
      </div>

      <DetailDrawer open={open} onClose={() => setOpen(false)} title="Operator Gates">
        {selected ? (
          <GateDetail g={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="space-y-2">
            {gates.map(g => (
              <div
                key={g.id}
                className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-2)] cursor-pointer hover:border-[var(--accent-border)] border border-transparent transition-colors"
                onClick={() => setSelected(g)}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium ${stateClass(g.state)}`}>
                    {g.state}
                  </span>
                  <span className="font-mono text-[12px] text-[var(--text-primary)]">{g.id}</span>
                  <span className="text-[var(--text-secondary)] text-[12px] ml-1">{g.label}</span>
                </div>
                <p className="text-[var(--text-muted)] text-[11px] leading-relaxed line-clamp-2">{g.detail}</p>
              </div>
            ))}
          </div>
        )}
      </DetailDrawer>
    </>
  );
}

function GateDetail({ g, onBack }: { g: GateEntry; onBack: () => void }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="text-[var(--text-muted)] text-[12px] hover:text-[var(--text-primary)] mb-4 transition-colors"
      >
        ← Back
      </button>
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-1 rounded text-[10px] font-mono font-medium ${stateClass(g.state)}`}>
          {g.state}
        </span>
        <h3 className="font-mono text-[15px] text-[var(--text-primary)]">{g.id}</h3>
      </div>
      <p className="text-[var(--text-secondary)] text-[13px] mb-4">{g.label}</p>
      <div className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border-subtle)]">
        <p className="text-[var(--text-primary)] text-[12px] leading-relaxed">{g.detail}</p>
      </div>
      {g.resolved_at && (
        <p className="text-[var(--text-muted)] text-[11px] mt-3 font-mono">
          Resolved: {formatLocalDateShort(g.resolved_at)}
        </p>
      )}
    </div>
  );
}
