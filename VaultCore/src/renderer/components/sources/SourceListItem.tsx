import type { ScrapingSource } from '../../types/vaultcore';

interface Props {
  source: ScrapingSource;
  selected: boolean;
  onClick: () => void;
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

function HealthDot({ health }: { health: ScrapingSource['health'] }) {
  const map = {
    healthy: { color: '#3fb950', icon: '●' },
    warning: { color: '#d29922', icon: '⚠' },
    error:   { color: '#f85149', icon: '✕' },
  };
  const s = map[health];
  return (
    <span className="text-[11px] shrink-0" style={{ color: s.color }}>
      {s.icon}
    </span>
  );
}

export default function SourceListItem({ source, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 border-b group"
      style={{
        background: selected
          ? 'color-mix(in srgb, var(--accent) 10%, var(--bg2))'
          : 'var(--bg2)',
        borderColor: 'var(--border)',
        borderLeft: selected ? '2px solid var(--accent)' : '2px solid transparent',
        transition: 'background 200ms var(--ease), border-color 200ms var(--ease)',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(42,51,71,0.25)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLElement).style.background = 'var(--bg2)';
        }
      }}
    >
      <div className="flex items-start gap-2">
        <HealthDot health={source.health} />
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-medium truncate"
            style={{ color: selected ? 'var(--accent)' : 'var(--text)' }}
          >
            {source.name}
          </div>
          <div className="text-[10px] mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-dim)' }}>
            <span>{source.type} · {source.interval}</span>
            {source.lastScrapeAt && (
              <span
                className="px-1 rounded"
                style={{
                  background: 'rgba(63,185,80,0.08)',
                  border: '1px solid rgba(63,185,80,0.18)',
                  color: 'rgba(63,185,80,0.7)',
                  fontSize: 9,
                }}
              >
                {timeAgo(source.lastScrapeAt)}
              </span>
            )}
          </div>
        </div>
        {selected && (
          <span className="shrink-0 mt-1 opacity-70" style={{ color: 'var(--accent)' }}>›</span>
        )}
      </div>
    </button>
  );
}
