import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVaultCoreStore } from '../../stores/useVaultCoreStore';
import DiffViewer from '../diff/DiffViewer';
import type { ScrapeRun } from '../../types/vaultcore';

type StatusFilter = 'all' | 'completed' | 'failed';

function formatDate(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function StatusBadge({ status }: { status: ScrapeRun['status'] }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    completed: { label: '✓', color: '#3fb950', bg: 'rgba(63,185,80,0.1)' },
    failed: { label: '✕ Error', color: '#f85149', bg: 'rgba(248,81,73,0.1)' },
    running: { label: '●', color: '#d29922', bg: 'rgba(210,153,34,0.1)' },
  };
  const s = map[status] ?? map.running;
  return (
    <span
      className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function ExpandedRow({ run }: { run: ScrapeRun }) {
  const [showDiff, setShowDiff] = useState(false);
  const r = run.result;
  const hasDiff = r && r.diffs.some((d) => d.type !== 'unchanged');

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <td colSpan={7} className="px-4 pb-3">
        <div
          className="rounded-lg p-3 text-[11px] space-y-2"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
        >
          {run.status === 'failed' && run.error && (
            <div style={{ color: '#f85149' }}>Error: {run.error}</div>
          )}
          {r && hasDiff && (
            <>
              {r.diffs.filter((d) => d.type === 'updated').slice(0, 3).map((d) => (
                <div key={d.path} className="font-mono space-y-0.5">
                  <div className="truncate" style={{ color: 'var(--text-muted)' }}>
                    ~ {d.path} {d.changePercent != null && <span style={{ color: 'var(--text-dim)' }}>({d.changePercent}%)</span>}
                  </div>
                  {d.oldFirstLine && (
                    <div className="ml-2 truncate" style={{ color: '#f85149' }}>− {d.oldFirstLine}</div>
                  )}
                  {d.newFirstLine && (
                    <div className="ml-2 truncate" style={{ color: '#3fb950' }}>+ {d.newFirstLine}</div>
                  )}
                </div>
              ))}
              <button
                onClick={() => setShowDiff(true)}
                className="text-[10px] mt-1 transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                Open full diff →
              </button>
            </>
          )}
          {r && !hasDiff && (
            <div style={{ color: 'var(--text-dim)' }}>No content changes in this run</div>
          )}
        </div>
        {showDiff && <DiffViewer run={run} onClose={() => setShowDiff(false)} />}
      </td>
    </motion.tr>
  );
}

export default function RunHistoryTable() {
  const { runs, clearRuns, sources } = useVaultCoreStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const uniqueSources = useMemo(() => {
    const names = new Set(runs.map((r) => r.sourceName));
    return Array.from(names);
  }, [runs]);

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && r.sourceName !== sourceFilter) return false;
      return true;
    });
  }, [runs, statusFilter, sourceFilter]);

  /** Longest run duration among filtered runs — used as 100% baseline for progress bars */
  const maxDuration = useMemo(() => {
    let max = 0;
    for (const r of filtered) {
      const d = r.duration != null
        ? r.duration
        : r.completedAt
        ? new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()
        : 0;
      if (d > max) max = d;
    }
    return max || 1;
  }, [filtered]);

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearRuns();
    setConfirmClear(false);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Run History</div>
          <div className="text-[11px] tabular-nums" style={{ color: 'var(--text-dim)' }}>
            {filtered.length} of {runs.length} run{runs.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-xs border outline-none"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <option value="all">All sources</option>
            {uniqueSources.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          {/* Status filter pills */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {(['all', 'completed', 'failed'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-2.5 py-1.5 text-xs capitalize"
                style={{
                  background: statusFilter === s ? 'var(--accent)' : 'var(--bg3)',
                  color: statusFilter === s ? '#fff' : 'var(--text-muted)',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={handleClear}
            disabled={runs.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs border transition-all disabled:opacity-40 hover:bg-red-500/10"
            style={{
              borderColor: confirmClear ? '#f85149' : 'var(--border)',
              color: confirmClear ? '#f85149' : 'var(--text-muted)',
            }}
          >
            {confirmClear ? 'Confirm clear' : 'Clear history'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center gap-3">
            {/* Illustrated table/log SVG */}
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ opacity: 0.4 }}>
              <rect x="4" y="8" width="44" height="36" rx="4" stroke="#8b949e" strokeWidth="1.5" fill="none"/>
              <line x1="4" y1="18" x2="48" y2="18" stroke="#484f58" strokeWidth="1"/>
              <line x1="4" y1="28" x2="48" y2="28" stroke="#484f58" strokeWidth="1"/>
              <line x1="4" y1="38" x2="48" y2="38" stroke="#484f58" strokeWidth="1"/>
              <line x1="18" y1="18" x2="18" y2="44" stroke="#484f58" strokeWidth="1"/>
              <rect x="8" y="21" width="6" height="4" rx="1" fill="rgba(63,185,80,0.3)" stroke="#3fb950" strokeWidth="0.5"/>
              <rect x="22" y="21" width="14" height="4" rx="1" fill="rgba(42,51,71,0.4)"/>
              <rect x="22" y="31" width="10" height="4" rx="1" fill="rgba(42,51,71,0.3)"/>
            </svg>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {runs.length === 0 ? 'No runs yet' : 'No runs match filters'}
              </div>
              {runs.length === 0 && (
                <div className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>
                  Run a scrape to populate this log
                </div>
              )}
            </div>
          </div>
        ) : (
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="sticky top-0 z-10" style={{ background: 'var(--bg2)' }}>
                {['Source', 'Started', 'Duration', 'Status', 'New', 'Updated', 'Unchanged'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left font-medium border-b"
                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((run) => {
                  const isExpanded = expandedId === run.id;
                  const r = run.result;
                  return (
                    <>
                      <motion.tr
                        key={run.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setExpandedId(isExpanded ? null : run.id)}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isExpanded ? 'color-mix(in srgb, var(--accent) 4%, transparent)' : 'transparent',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isExpanded ? 'color-mix(in srgb, var(--accent) 4%, transparent)' : 'transparent'; }}
                      >
                        <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text)' }}>
                          {run.sourceName}
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(run.startedAt)}
                        </td>
                        <td className="px-4 py-2.5" style={{ minWidth: 100 }}>
                          {(() => {
                            const durationMs = run.duration != null
                              ? run.duration
                              : run.completedAt
                              ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
                              : null;
                            if (durationMs == null) return <span style={{ color: 'var(--text-dim)' }}>—</span>;
                            const pct = Math.max(4, Math.round((durationMs / maxDuration) * 100));
                            return (
                              <div className="flex items-center gap-2">
                                <span
                                  className="font-mono tabular-nums text-[11px] shrink-0 w-10 text-right"
                                  style={{ color: 'var(--text-dim)' }}
                                >
                                  {formatDuration(durationMs)}
                                </span>
                                <div
                                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                                  style={{ background: 'rgba(42,51,71,0.45)', minWidth: 40 }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${pct}%`,
                                      background: run.status === 'failed'
                                        ? 'rgba(248,81,73,0.55)'
                                        : 'rgba(63,185,80,0.55)',
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={run.status} />
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums" style={{ color: r ? '#3fb950' : 'var(--text-dim)' }}>
                          {r ? r.newNotes : '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums" style={{ color: r ? '#7bb8ff' : 'var(--text-dim)' }}>
                          {r ? r.updatedNotes : '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums" style={{ color: 'var(--text-dim)' }}>
                          {r ? r.unchangedNotes : '—'}
                        </td>
                      </motion.tr>
                      <AnimatePresence>
                        {isExpanded && <ExpandedRow key={`${run.id}-expanded`} run={run} />}
                      </AnimatePresence>
                    </>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
