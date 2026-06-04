import { motion } from 'framer-motion';
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

function MetricCard({
  label, value, sub, accent = false, index,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="rounded-lg p-4 border"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div
        className="text-2xl font-bold font-mono tabular-nums"
        style={{ color: accent ? 'var(--accent)' : 'var(--text)' }}
      >
        {value}
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
