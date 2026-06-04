import { useEffect, useState } from 'react';
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

/** Live throughput counter — ticks every second showing items/sec */
function ThroughputCounter({ startedAt, itemsSaved }: { startedAt: string; itemsSaved: number }) {
  const [rate, setRate] = useState<number>(0);

  useEffect(() => {
    const tick = () => {
      const elapsedSec = Math.max(1, (Date.now() - new Date(startedAt).getTime()) / 1000);
      setRate(itemsSaved / elapsedSec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, itemsSaved]);

  return (
    <motion.span
      key={Math.round(rate * 10)}
      initial={{ opacity: 0.5, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="font-mono tabular-nums text-[10px] shrink-0 px-1.5 py-0.5 rounded"
      style={{
        background: 'rgba(63,185,80,0.08)',
        border: '1px solid rgba(63,185,80,0.2)',
        color: '#3fb950',
      }}
    >
      {rate.toFixed(1)}/s
    </motion.span>
  );
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
              className="rounded-xl p-3 border relative overflow-hidden run-card-active"
              style={{
                background: 'linear-gradient(135deg, rgba(63,185,80,0.06) 0%, var(--bg2) 60%)',
                borderColor: 'rgba(63,185,80,0.22)',
                boxShadow: '0 0 16px rgba(63,185,80,0.06)',
              }}
            >
              {/* Subtle top glow line */}
              <div
                className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(63,185,80,0.4), transparent)' }}
              />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full status-dot-pulse shrink-0"
                    style={{ background: '#3fb950', ['--pulse-color' as string]: 'rgba(63,185,80,0.4)' }}
                  />
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {run.sourceName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ThroughputCounter
                    startedAt={run.startedAt}
                    itemsSaved={run.result?.newNotes ?? 0}
                  />
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-dim)' }}>
                    {timeAgo(run.startedAt)} ago
                  </span>
                  <button
                    onClick={() => onCancel(run.id)}
                    className="text-[10px] px-2 py-0.5 rounded-md border transition-all hover:bg-red-500/10"
                    style={{ borderColor: '#f85149', color: '#f85149' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {/* Indeterminate shimmer progress bar */}
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(42,51,71,0.5)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #1a7a30, #3fb950, #70d48a, #3fb950, #1a7a30)',
                    backgroundSize: '200% 100%',
                    width: '45%',
                  }}
                  animate={{ x: ['-10%', '180%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
