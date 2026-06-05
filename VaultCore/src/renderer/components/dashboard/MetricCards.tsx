import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import type { ScrapingSource } from '../../types/vaultcore';

/** Returns ▲ or ▼ arrow with green/red color when value changed from previous render */
function TrendArrow({ value, accent }: { value: number; accent?: boolean }) {
  const prevRef = useRef<number | null>(null);
  const prev = prevRef.current;
  prevRef.current = value;

  if (prev === null || prev === value) return null;

  const up = value > prev;
  return (
    <span
      className="text-[11px] font-bold"
      style={{ color: up ? '#3fb950' : '#f85149', lineHeight: 1 }}
    >
      {up ? '▲' : '▼'}
    </span>
  );
}

// Mock 7-day trend data per card (units vary per metric)
const MOCK_TRENDS: Record<string, number[]> = {
  sources:  [3, 3, 4, 4, 5, 5, 5],
  lastRun:  [1, 2, 1, 3, 2, 1, 2],
  notes:    [120, 135, 148, 162, 170, 175, 180],
  added:    [2, 5, 3, 8, 4, 6, 7],
};

function Sparkline({ data, accent = false }: { data: number[]; accent?: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 56; const H = 20;
  const step = W / (data.length - 1);
  const pts = data
    .map((v, i) => `${i * step},${H - ((v - min) / range) * (H - 2) - 1}`)
    .join(' ');
  const color = accent ? '#3fb950' : 'rgba(139,148,158,0.6)';
  return (
    <svg width={W} height={H} className="shrink-0" style={{ overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.8}
      />
      {/* last-point dot */}
      <circle
        cx={(data.length - 1) * step}
        cy={H - ((data[data.length - 1] - min) / range) * (H - 2) - 1}
        r="2"
        fill={color}
      />
    </svg>
  );
}

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
  const prevValue = useRef<number | null>(null);

  useEffect(() => {
    const from = prevValue.current ?? 0;
    prevValue.current = value;
    const ctrl = animate(count, value, {
      from,
      duration: 0.8,
      ease: [0.2, 0.8, 0.2, 1],
    });
    return ctrl.stop;
  }, [value, count]);

  useEffect(() =>
    rounded.on('change', v => { if (ref.current) ref.current.textContent = v.toLocaleString(); }),
  [rounded]);

  return <span ref={ref} className="tabular-nums">{value.toLocaleString()}</span>;
}

function MetricCard({
  label, value, sub, accent = false, index, trendKey,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  index: number;
  trendKey?: string;
}) {
  const numericValue = typeof value === 'number' ? value : null;
  const trendData = trendKey ? MOCK_TRENDS[trendKey] : undefined;

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
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <div
            className="text-2xl font-bold font-mono tabular-nums"
            style={{
              color: accent ? 'var(--accent)' : 'var(--text)',
              textShadow: accent ? '0 0 20px rgba(63,185,80,0.35)' : undefined,
            }}
          >
            {numericValue !== null
              ? <AnimatedNumber value={numericValue} />
              : <span className="tabular-nums">{value}</span>}
          </div>
          {numericValue !== null && <TrendArrow value={numericValue} accent={accent} />}
        </div>
        {trendData && (
          <div className="mt-1">
            <Sparkline data={trendData} accent={accent} />
          </div>
        )}
      </div>
      <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-dim)' }}>
        {label}
      </div>
      {sub && (
        <div className="text-[10px] mt-0.5 tabular-nums" style={{ color: 'var(--text-dim)' }}>
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
        trendKey="sources"
      />
      <MetricCard
        index={1}
        label="Last Run"
        value={lastRunAgo ?? '—'}
        sub="most recent scrape"
        trendKey="lastRun"
      />
      <MetricCard
        index={2}
        label="Vault Notes"
        value={vaultStats?.totalNotes?.toLocaleString() ?? '—'}
        sub="markdown files"
        trendKey="notes"
      />
      <MetricCard
        index={3}
        label="Added Today"
        value={vaultStats?.addedToday ?? '—'}
        sub="new notes"
        accent={!!(vaultStats && vaultStats.addedToday > 0)}
        trendKey="added"
      />
    </div>
  );
}
