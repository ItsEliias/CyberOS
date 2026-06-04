import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ScrapeRun } from '../../types/vaultcore';

interface Props {
  runs: ScrapeRun[];
  onViewDiff: (run: ScrapeRun) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RunCard({ run, onViewDiff }: { run: ScrapeRun; onViewDiff: (r: ScrapeRun) => void }) {
  const [expanded, setExpanded] = useState(false);
  const r = run.result;
  const hasChanges = r && (r.newNotes > 0 || r.updatedNotes > 0);

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        background: 'var(--bg2)',
        borderColor: run.status === 'failed' ? 'rgba(248,81,73,0.3)' : 'var(--border)',
      }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
                style={{
                  background:
                    run.status === 'completed' ? '#3fb950' :
                    run.status === 'failed' ? '#f85149' : '#d29922',
                }}
              />
              <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                {run.sourceName}
              </span>
            </div>
            <div className="text-[10px] mt-0.5 ml-3.5" style={{ color: 'var(--text-dim)' }}>
              {run.completedAt ? timeAgo(run.completedAt) : timeAgo(run.startedAt)}
            </div>
          </div>
          {run.status === 'failed' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149' }}>
              Error
            </span>
          )}
        </div>

        {r && (
          <div className="flex items-center gap-3 mt-2 ml-3.5 text-[11px]">
            <span style={{ color: '#3fb950' }}>{r.newNotes} new</span>
            <span style={{ color: '#7bb8ff' }}>{r.updatedNotes} updated</span>
            <span style={{ color: 'var(--text-dim)' }}>{r.unchangedNotes} unchanged</span>
          </div>
        )}

        {run.status === 'failed' && run.error && (
          <div className="mt-2 ml-3.5 text-[10px] truncate" style={{ color: '#f85149' }}>
            {run.error}
          </div>
        )}

        {r && hasChanges && (
          <div className="mt-2 ml-3.5 flex gap-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[10px] transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              {expanded ? '▲ Hide diff' : '▼ View diff'}
            </button>
            <button
              onClick={() => onViewDiff(run)}
              className="text-[10px] transition-colors"
              style={{ color: 'var(--text-dim)' }}
            >
              Open full diff
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && r && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="px-3 py-2 space-y-1">
              {r.diffs.filter((d) => d.type === 'new').slice(0, 5).map((d) => (
                <div key={d.path} className="text-[10px] font-mono flex items-center gap-1.5">
                  <span style={{ color: '#3fb950' }}>+</span>
                  <span className="truncate" style={{ color: 'var(--text-muted)' }}>{d.path}</span>
                </div>
              ))}
              {r.diffs.filter((d) => d.type === 'updated').slice(0, 3).map((d) => (
                <div key={d.path} className="text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: '#7bb8ff' }}>~</span>
                    <span className="truncate" style={{ color: 'var(--text-muted)' }}>{d.path}</span>
                  </div>
                  {d.oldFirstLine && (
                    <div className="ml-3 truncate" style={{ color: '#f85149' }}>− {d.oldFirstLine}</div>
                  )}
                  {d.newFirstLine && (
                    <div className="ml-3 truncate" style={{ color: '#3fb950' }}>+ {d.newFirstLine}</div>
                  )}
                </div>
              ))}
              {r.suggestedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                  {r.suggestedTags.map((t) => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LastRunSummary({ runs, onViewDiff }: Props) {
  const recentRuns = runs
    .filter((r) => r.status !== 'running')
    .slice(0, 5);

  if (recentRuns.length === 0) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>
          Last Run Summary
        </div>
        <div
          className="rounded-xl border p-6 text-center flex flex-col items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, var(--surface-glass), rgba(13,14,24,0.5))',
            borderColor: 'var(--border-glass)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Illustrated SVG — data pipeline icon */}
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.5 }}>
            <rect x="4" y="12" width="12" height="8" rx="2" stroke="#3fb950" strokeWidth="1.5" fill="rgba(63,185,80,0.06)"/>
            <rect x="4" y="28" width="12" height="8" rx="2" stroke="#8b949e" strokeWidth="1.5" fill="none"/>
            <path d="M16 16h8M16 32h8" stroke="#484f58" strokeWidth="1.5" strokeDasharray="2 2"/>
            <rect x="24" y="20" width="12" height="8" rx="2" stroke="#3fb950" strokeWidth="1.5" fill="rgba(63,185,80,0.08)"/>
            <path d="M36 24h5" stroke="#3fb950" strokeWidth="1.5"/>
            <circle cx="44" cy="24" r="2" fill="#3fb950" style={{ opacity: 0.6 }}/>
            <path d="M16 16c0 0 4-4 8 0" stroke="#3fb950" strokeWidth="1" strokeDasharray="2 2" fill="none" opacity="0.4"/>
          </svg>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No scrape runs yet</div>
            <div className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>
              Hit <span style={{ color: 'var(--accent)' }}>▶ Scrape All</span> to populate your vault
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>
        Last Run Summary
      </div>
      <div className="space-y-2">
        {recentRuns.map((run) => (
          <RunCard key={run.id} run={run} onViewDiff={onViewDiff} />
        ))}
      </div>
    </div>
  );
}
