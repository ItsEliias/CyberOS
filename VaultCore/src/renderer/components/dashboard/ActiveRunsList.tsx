import { AnimatePresence, motion } from 'framer-motion';
import type { ScrapeRun } from '../../types/vaultcore';

interface Props {
  runs: ScrapeRun[];
  onCancel: (runId: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function ActiveRunsList({ runs, onCancel }: Props) {
  const activeRuns = runs.filter((r) => r.status === 'running');

  if (activeRuns.length === 0) return null;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>
        Active Runs
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {activeRuns.map((run) => (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-lg p-3 border"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full status-dot-pulse shrink-0"
                    style={{ background: '#3fb950', ['--pulse-color' as string]: 'rgba(63,185,80,0.4)' }}
                  />
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {run.sourceName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                    {timeAgo(run.startedAt)} ago
                  </span>
                  <button
                    onClick={() => onCancel(run.id)}
                    className="text-[10px] px-2 py-0.5 rounded border transition-all hover:bg-red-500/10"
                    style={{ borderColor: '#f85149', color: '#f85149' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {/* Indeterminate progress bar */}
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--border)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: '#3fb950', width: '40%' }}
                  animate={{ x: ['0%', '160%', '0%'] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
