import type { ScrapingSource, ScrapeRun } from '../../types/vaultcore';
import { formatNextRun } from '../../utils/scrapeScheduler';

interface Props {
  source: ScrapingSource;
  runs: ScrapeRun[];
  onEdit: () => void;
  onScrapeNow: () => void;
  onDelete?: () => void;
  scraping: boolean;
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

function HealthBadge({ health }: { health: ScrapingSource['health'] }) {
  const map = {
    healthy: { label: 'Healthy', color: '#3fb950', bg: 'rgba(63,185,80,0.1)' },
    warning: { label: 'Warning', color: '#d29922', bg: 'rgba(210,153,34,0.1)' },
    error:   { label: 'Error',   color: '#f85149', bg: 'rgba(248,81,73,0.1)' },
  };
  const s = map[health];
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full capitalize"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

export default function SourceDetail({ source, runs, onEdit, onScrapeNow, onDelete, scraping }: Props) {
  const sourceRuns = runs.filter((r) => r.sourceId === source.id).slice(0, 5);

  return (
    <div className="flex-1 overflow-auto p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold" style={{ color: 'var(--text)' }}>{source.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
              {source.type}
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
              {source.interval}
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <HealthBadge health={source.health} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 rounded-lg text-xs border transition-all hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Edit
          </button>
          <button
            onClick={onScrapeNow}
            disabled={scraping}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {scraping ? '…' : '▶ Run'}
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 rounded-lg text-xs border transition-all hover:bg-red-500/10"
              style={{ borderColor: 'var(--border)', color: '#f85149' }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Meta */}
      <div
        className="rounded-lg border p-4 space-y-2 text-xs"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="flex gap-2">
          <span style={{ color: 'var(--text-dim)', minWidth: 80 }}>URL</span>
          <span className="font-mono truncate" style={{ color: 'var(--text-muted)' }}>
            {source.url || '—'}
          </span>
        </div>
        <div className="flex gap-2">
          <span style={{ color: 'var(--text-dim)', minWidth: 80 }}>Output</span>
          <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
            {source.outputPath || '—'}
          </span>
        </div>
        <div className="flex gap-2">
          <span style={{ color: 'var(--text-dim)', minWidth: 80 }}>Tags</span>
          <div className="flex flex-wrap gap-1">
            {source.tags.length > 0 ? source.tags.map((t) => (
              <span
                key={t}
                className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
              >
                {t}
              </span>
            )) : (
              <span style={{ color: 'var(--text-dim)' }}>None</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <span style={{ color: 'var(--text-dim)', minWidth: 80 }}>Next run</span>
          <span style={{ color: 'var(--text-muted)' }}>{formatNextRun(source)}</span>
        </div>
      </div>

      {/* Last 5 runs */}
      <div>
        <div
          className="text-[10px] uppercase tracking-widest mb-2"
          style={{ color: 'var(--text-dim)' }}
        >
          Last 5 Runs
        </div>
        {sourceRuns.length === 0 ? (
          <div
            className="rounded-lg border p-4 text-center text-xs"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          >
            No runs yet
          </div>
        ) : (
          <div className="space-y-1.5">
            {sourceRuns.map((run) => {
              const r = run.result;
              const ts = run.completedAt ?? run.startedAt;
              return (
                <div
                  key={run.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border text-[11px]"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background:
                        run.status === 'completed' ? '#3fb950' :
                        run.status === 'failed' ? '#f85149' : '#d29922',
                    }}
                  />
                  <span style={{ color: 'var(--text-dim)' }}>{timeAgo(ts)}</span>
                  {r ? (
                    <span style={{ color: 'var(--text-muted)' }}>
                      {r.newNotes} new · {r.updatedNotes} updated · {r.unchangedNotes} unchanged
                    </span>
                  ) : (
                    <span style={{ color: '#f85149' }}>{run.error ?? 'Failed'}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div>
        <div
          className="text-[10px] uppercase tracking-widest mb-2"
          style={{ color: 'var(--text-dim)' }}
        >
          Stats
        </div>
        <div
          className="rounded-lg border p-4 grid grid-cols-2 gap-3 text-xs"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <div>
            <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Total notes</div>
            <div className="font-mono mt-0.5" style={{ color: 'var(--accent)' }}>
              {source.totalNotesSaved}
            </div>
          </div>
          <div>
            <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Last success</div>
            <div className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {source.lastSuccessAt ? timeAgo(source.lastSuccessAt) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Consecutive failures</div>
            <div
              className="font-mono mt-0.5"
              style={{ color: source.consecutiveFailures > 0 ? '#f85149' : 'var(--text-muted)' }}
            >
              {source.consecutiveFailures}
            </div>
          </div>
          <div>
            <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Status</div>
            <div
              className="mt-0.5 capitalize"
              style={{
                color:
                  source.health === 'healthy' ? '#3fb950' :
                  source.health === 'warning' ? '#d29922' : '#f85149',
              }}
            >
              {source.enabled ? source.health : 'disabled'}
            </div>
          </div>
          {source.lastError && (
            <div className="col-span-2">
              <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Last error</div>
              <div className="mt-0.5 text-[10px] truncate" style={{ color: '#f85149' }}>
                {source.lastError}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
