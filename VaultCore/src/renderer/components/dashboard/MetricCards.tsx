import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import type { ScrapingSource } from '../../types/vaultcore';

interface VaultStatsCompact {
  totalNotes: number;
  addedToday: number;
}

interface Props {
  sources: ScrapingSource[];
  vaultStats: VaultStatsCompact | null;
  lastRunAgo: string | null;
}

function AnimatedNumber({ value }: { value: number }) {
  const count   = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v));
  const ref     = useRef<HTMLSpanElement>(null);
  const once    = useRef(false);

  useEffect(() => {
    if (!once.current) {
      const ctrl = animate(count, value, { duration: 0.8, ease: [0.2, 0.8, 0.2, 1] });
      once.current = true;
      return ctrl.stop;
    } else {
      count.set(value);
    }
  }, [value, count]);

  useEffect(() =>
    rounded.on('change', v => { if (ref.current) ref.current.textContent = v.toLocaleString(); }),
  [rounded]);

  return <span ref={ref}>{value.toLocaleString()}</span>;
}

function MetricCard({
  label, value, sub, accent = false, index,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  index: number;
}) {
  const numericValue = typeof value === 'number' ? value : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className="rounded-xl p-4 border relative overflow-hidden"
      style={{
        background: accent
          ? 'linear-gradient(135deg, rgba(63,185,80,0.08) 0%, rgba(13,14,24,0.9) 100%)'
          : 'var(--surface-glass)',
        borderColor: accent ? 'rgba(63,185,80,0.25)' : 'var(--border-glass)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: accent
          ? '0 4px 16px rgba(63,185,80,0.10), var(--elevation-1)'
          : 'var(--elevation-1)',
      }}
    >
      {/* Top accent bar */}
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(63,185,80,0.5), transparent)' }}
        />
      )}
      <div
        className="text-2xl font-bold font-mono tabular-nums"
        style={{
          color: accent ? 'var(--accent)' : 'var(--text)',
          textShadow: accent ? '0 0 20px rgba(63,185,80,0.35)' : undefined,
        }}
      >
        {numericValue !== null ? <AnimatedNumber value={numericValue} /> : value}
      </div>
      <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-dim)' }}>
        {label}
      </div>
      {sub && (
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
          {sub}
        </div>
      )}
    </motion.div>
  );
}

export default function MetricCards({ sources, vaultStats, lastRunAgo }: Props) {
  const activeSources = sources.filter((s) => s.enabled).length;
  const healthySources = sources.filter((s) => s.health === 'healthy').length;
  const errorSources = sources.filter((s) => s.health === 'error').length;

  return (
    <div className="grid grid-cols-4 gap-3">
      <MetricCard
        index={0}
        label="Active Sources"
        value={activeSources}
        sub={`${healthySources} healthy${errorSources > 0 ? ` · ${errorSources} error` : ''}`}
        accent
      />
      <MetricCard
        index={1}
        label="Last Run"
        value={lastRunAgo ?? '—'}
        sub="most recent scrape"
      />
      <MetricCard
        index={2}
        label="Vault Notes"
        value={vaultStats?.totalNotes.toLocaleString() ?? '—'}
        sub="markdown files"
      />
      <MetricCard
        index={3}
        label="Added Today"
        value={vaultStats?.addedToday ?? '—'}
        sub="new notes"
        accent={!!(vaultStats && vaultStats.addedToday > 0)}
      />
    </div>
  );
}
