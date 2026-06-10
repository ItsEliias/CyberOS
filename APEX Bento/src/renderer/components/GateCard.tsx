import { useState } from 'react';
import type { GateEntry } from '../../shared/types.js';
import { DetailDrawer } from './DetailDrawer.js';

interface Props {
  gates: GateEntry[];
}

// Operator runbook references — for each gate that has a one-pager / research
// note on disk, surface the path here so the operator can jump straight from
// "see gate state" to "consult the runbook" without leaving the app.
// These paths are READ-ONLY references — we never write to them.
// Source files (verified to exist at write-time):
//   APEX/build/gate-12-operator-instructions.md (5.4 KB, 2026-06-10)
//   APEX/build/gate-12-b-betfair-research.md   (25 KB,  2026-06-10)
//   APEX/build/04-operator-runbook.md           (26 KB,  2026-06-10)
interface RunbookRef {
  label: string;
  path: string;
  summary: string;
}
const GATE_RUNBOOK_REFS: Record<string, RunbookRef> = {
  'GATE-12': {
    label: 'Operator instructions',
    path:   'APEX/build/gate-12-operator-instructions.md',
    summary: 'Pre-flight checklist + dataset download + fee-quote capture + runner command. Single source of truth for executing GATE-12 once the jbecker dataset is on the laptop.'
  },
  'GATE-12-B': {
    label: 'Research note',
    path:   'APEX/build/gate-12-b-betfair-research.md',
    summary: 'GATE-12-B (Betfair AU venue research) — venue feasibility, fee model, access path. Path D candidate. Read before any GATE-12-B PASS decision.'
  },
  'GATE-14-UNLOCK': {
    label: 'Runbook',
    path:   'APEX/build/04-operator-runbook.md',
    summary: 'Full operator runbook. Find the GATE-14-UNLOCK section for the per-trade-approval ramp protocol (100-300 trades) and the marker syntax required to flip AUTOMATED_LIVE.'
  }
};

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
  const runbook = GATE_RUNBOOK_REFS[g.id];

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
          Resolved: {new Date(g.resolved_at).toLocaleDateString()}
        </p>
      )}
      {runbook && <RunbookRefPanel ref_={runbook} />}
    </div>
  );
}

function RunbookRefPanel({ ref_ }: { ref_: RunbookRef }) {
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle');

  async function handleCopy() {
    try {
      // Electron renderer runs in a secure context; navigator.clipboard is
      // available. We only gate the success feedback on the actual resolve.
      // Reference: MDN navigator.clipboard.writeText.
      await navigator.clipboard.writeText(ref_.path);
      setCopyState('ok');
    } catch {
      setCopyState('err');
    }
    window.setTimeout(() => setCopyState('idle'), 1500);
  }

  return (
    <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-[var(--accent-tint)] border border-[var(--accent-border)]">
      <p className="text-[var(--accent)] text-[10px] uppercase tracking-widest font-mono mb-1.5">
        {ref_.label}
      </p>
      <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed mb-2">
        {ref_.summary}
      </p>
      <div className="flex items-center gap-2">
        <code
          className="flex-1 px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--surface-2)] text-[var(--text-primary)] text-[10px] font-mono break-all"
          aria-label="Runbook file path"
        >
          {ref_.path}
        </code>
        <button
          onClick={handleCopy}
          aria-label={`Copy runbook path ${ref_.path} to clipboard`}
          className="drawer-close-btn px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] text-[10px] font-mono shrink-0 transition-colors"
        >
          {copyState === 'ok' ? 'copied' : copyState === 'err' ? 'failed' : 'copy'}
        </button>
      </div>
    </div>
  );
}
