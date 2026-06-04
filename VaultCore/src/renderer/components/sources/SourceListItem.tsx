import type { ScrapingSource, SourceType } from '../../types/vaultcore';

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

/** Inline SVG icon per source type — 14×14 */
function SourceTypeIcon({ type }: { type: SourceType }) {
  const color = 'var(--text-dim)';
  switch (type) {
    case 'rss':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-label="RSS">
          <circle cx="3" cy="11" r="1.5" fill={color}/>
          <path d="M2 7.5C4.5 7.5 6.5 9.5 6.5 12" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          <path d="M2 4C6.4 4 10 7.6 10 12" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
        </svg>
      );
    case 'github':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-label="GitHub">
          <path d="M7 1.5A5.5 5.5 0 001.5 7c0 2.43 1.57 4.49 3.75 5.22.27.05.37-.12.37-.26V11c-1.52.33-1.84-.74-1.84-.74-.25-.63-.61-.8-.61-.8-.5-.34.04-.33.04-.33.55.04.84.56.84.56.49.84 1.28.6 1.59.46.05-.36.19-.6.35-.74-1.21-.14-2.48-.61-2.48-2.7 0-.6.21-1.08.56-1.46-.06-.14-.24-.69.05-1.44 0 0 .46-.15 1.5.56A5.2 5.2 0 017 4.8c.46 0 .93.06 1.37.18 1.04-.71 1.5-.56 1.5-.56.29.75.11 1.3.05 1.44.35.38.56.87.56 1.46 0 2.1-1.28 2.56-2.5 2.7.2.17.37.5.37 1.02V12c0 .14.1.31.37.26A5.5 5.5 0 0012.5 7 5.5 5.5 0 007 1.5z" fill={color}/>
        </svg>
      );
    case 'youtube':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-label="YouTube">
          <rect x="1" y="3.5" width="12" height="7" rx="2" stroke={color} strokeWidth="1.1" fill="none"/>
          <path d="M5.5 5.5l3.5 1.5-3.5 1.5V5.5z" fill={color}/>
        </svg>
      );
    case 'reddit':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-label="Reddit">
          <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.1" fill="none"/>
          <circle cx="5" cy="7" r="0.8" fill={color}/>
          <circle cx="9" cy="7" r="0.8" fill={color}/>
          <path d="M4.5 9c.7.8 4.3.8 5 0" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none"/>
          <circle cx="10" cy="4" r="0.7" fill={color}/>
          <path d="M7 3.5l2.5.5" stroke={color} strokeWidth="0.9" strokeLinecap="round"/>
        </svg>
      );
    case 'twitter':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-label="Twitter/X">
          <path d="M2 2l10 10M12 2L2 12" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      );
    case 'notion':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-label="Notion">
          <rect x="2.5" y="1.5" width="9" height="11" rx="1.5" stroke={color} strokeWidth="1.1" fill="none"/>
          <line x1="5" y1="5" x2="9" y2="5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
          <line x1="5" y1="7.5" x2="9" y2="7.5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
          <line x1="5" y1="10" x2="7.5" y2="10" stroke={color} strokeWidth="1" strokeLinecap="round"/>
        </svg>
      );
    case 'medium':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-label="Medium">
          <ellipse cx="5" cy="7" rx="3.5" ry="4" stroke={color} strokeWidth="1.1" fill="none"/>
          <ellipse cx="10" cy="7" rx="1.5" ry="3.5" stroke={color} strokeWidth="1.1" fill="none"/>
          <line x1="13" y1="4" x2="13" y2="10" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      );
    case 'cve':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-label="CVE">
          <path d="M7 1.5L12.5 4.5v5L7 12.5 1.5 9.5v-5L7 1.5z" stroke={color} strokeWidth="1.1" fill="none"/>
          <line x1="7" y1="4.5" x2="7" y2="7.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="7" cy="9.5" r="0.7" fill={color}/>
        </svg>
      );
    case 'pdf':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-label="PDF">
          <path d="M3 1.5h5.5L11 4v8.5H3V1.5z" stroke={color} strokeWidth="1.1" fill="none"/>
          <path d="M8.5 1.5V4H11" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none"/>
          <line x1="5" y1="6.5" x2="9" y2="6.5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
          <line x1="5" y1="8.5" x2="9" y2="8.5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
        </svg>
      );
    case 'website':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-label="Website">
          <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.1" fill="none"/>
          <ellipse cx="7" cy="7" rx="2.5" ry="5.5" stroke={color} strokeWidth="0.9" fill="none"/>
          <line x1="1.5" y1="7" x2="12.5" y2="7" stroke={color} strokeWidth="0.9"/>
        </svg>
      );
    case 'obsidian-publish':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-label="Obsidian">
          <polygon points="7,1.5 12,5 12,9 7,12.5 2,9 2,5" stroke={color} strokeWidth="1.1" fill="none"/>
          <polygon points="7,4 10,6.5 7,11 4,6.5" stroke={color} strokeWidth="0.8" fill="none" opacity="0.6"/>
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
          <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.1" fill="none"/>
          <circle cx="7" cy="7" r="1.5" fill={color}/>
        </svg>
      );
  }
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
            <SourceTypeIcon type={source.type} />
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
