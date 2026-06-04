import type { ScrapingSource } from '../../types/vaultcore';

interface Props {
  source: ScrapingSource;
  selected: boolean;
  onClick: () => void;
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
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
            {source.type} · {source.interval}
          </div>
        </div>
        {selected && (
          <span className="shrink-0 mt-1 opacity-70" style={{ color: 'var(--accent)' }}>›</span>
        )}
      </div>
    </button>
  );
}
