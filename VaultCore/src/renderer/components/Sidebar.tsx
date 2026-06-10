import { useStore } from '../store';
import { useVaultCoreStore } from '../stores/useVaultCoreStore';
import { useSecretStore } from '../stores/useSecretStore';
import type { ActiveViewVC } from '../stores/useVaultCoreStore';

// 13×13px stroke SVG icons, strokeWidth=1.5
const ICONS: Record<ActiveViewVC, React.ReactNode> = {
  dashboard: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="0.75" />
      <rect x="7" y="1.5" width="4.5" height="4.5" rx="0.75" />
      <rect x="1.5" y="7" width="4.5" height="4.5" rx="0.75" />
      <rect x="7" y="7" width="4.5" height="4.5" rx="0.75" />
    </svg>
  ),
  sources: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="4.5" cy="4.5" r="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M6 5.5l1.5 2" />
    </svg>
  ),
  history: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="6.5" r="5" />
      <path d="M6.5 4v2.5l1.5 1.5" />
    </svg>
  ),
  health: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6.5h2l1.5-3 2 5.5 1.5-5 1.5 2.5H12" />
    </svg>
  ),
  settings: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="6.5" r="1.5" />
      <path d="M6.5 1.5v1.2M6.5 10.3v1.2M11.5 6.5h-1.2M2.2 6.5H1M9.7 3.3l-.85.85M4.15 8.85 3.3 9.7M9.7 9.7l-.85-.85M4.15 4.15 3.3 3.3" />
    </svg>
  ),
  repos: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2" width="10" height="9" rx="1" />
      <path d="M5 2v9M1.5 5.5h3.5" />
    </svg>
  ),
  scan: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="6.5" r="4.5" strokeDasharray="3 2" />
      <circle cx="6.5" cy="6.5" r="1.5" />
      <path d="M6.5 2V1M6.5 12v-1M11 6.5h1M1 6.5H2" />
    </svg>
  ),
  branches: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 2v9M3.5 5c2.5 0 6-1.5 6-3" />
      <circle cx="3.5" cy="2" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="2" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  conflicts: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 2v4M6.5 9v.5M3 4.5L1.5 6.5 3 8.5M10 4.5l1.5 2-1.5 2" />
      <circle cx="6.5" cy="11" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  ),
  audit: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="1.5" width="8" height="10" rx="1" />
      <path d="M5 5h3M5 7h3M5 9h1.5" />
    </svg>
  ),
  credvault: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="5.5" width="10" height="7" rx="1" />
      <path d="M4.5 5.5V4a2 2 0 0 1 4 0v1.5" />
      <circle cx="6.5" cy="9" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
};

const NAV_SECTIONS: Array<{ section: string; items: Array<{ id: ActiveViewVC; label: string }> }> = [
  {
    section: 'Vault Scraper',
    items: [
      { id: 'dashboard', label: 'Dashboard'     },
      { id: 'sources',   label: 'Sources'       },
      { id: 'history',   label: 'Run History'   },
      { id: 'health',    label: 'Source Health' },
      { id: 'settings',  label: 'Settings'      },
    ],
  },
  {
    section: 'Secret Detection',
    items: [
      { id: 'repos',     label: 'Repositories'  },
      { id: 'scan',      label: 'Scan Results'  },
      { id: 'branches',  label: 'Branch Compare'},
      { id: 'conflicts', label: 'Conflicts'     },
      { id: 'audit',     label: 'Audit Log'     },
      { id: 'credvault', label: 'CredVault Sync'},
    ],
  },
];

export default function Sidebar() {
  const { sources: legacySources, vaultPath } = useStore();
  const { activeView, setActiveView, runs, sources: vcSources } = useVaultCoreStore();
  const { secrets, repos } = useSecretStore();

  const activeRunCount     = runs.filter((r) => r.status === 'running').length;
  const errorCount         = vcSources.filter((s) => s.health === 'error').length;
  const sourceCount        = Math.max(legacySources.length, vcSources.length);
  const highEntropyCount   = secrets.filter(s => s.patternType === 'high_entropy').length;

  function getBadge(id: ActiveViewVC): React.ReactNode {
    if (id === 'dashboard' && activeRunCount > 0)
      return (
        <span className="ml-auto w-1.5 h-1.5 rounded-full status-dot-pulse"
          style={{ background: 'var(--accent)' }} />
      );
    const countMap: Partial<Record<ActiveViewVC, number>> = {
      sources:  sourceCount,
      history:  runs.length,
      repos:    repos.length,
      scan:     secrets.length || highEntropyCount,
    };
    const cnt = countMap[id];
    if (cnt && cnt > 0)
      return (
        <span className="ml-auto tabular-nums"
          style={{
            fontSize: 'var(--type-caption)',
            padding: '0 4px',
            borderRadius: 3,
            background: 'rgba(42,51,71,0.4)',
            color: 'var(--text-muted)',
          }}
        >{cnt}</span>
      );
    if (id === 'health' && errorCount > 0)
      return (
        <span className="ml-auto tabular-nums"
          style={{
            fontSize: 'var(--type-caption)',
            padding: '0 4px',
            borderRadius: 3,
            background: 'rgba(248,81,73,0.12)',
            color: '#f85149',
            border: '1px solid rgba(248,81,73,0.25)',
          }}
        >{errorCount}</span>
      );
    return null;
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        width: 192,
        background: 'var(--surface-0)',
        borderRight: '1px solid var(--border-subtle)',
        flexShrink: 0,
        scrollbarWidth: 'none',
      }}
    >
      {/* Logo / identity lockup */}
      <div className="px-4 py-3 shrink-0 section-sep">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
            stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
          >
            <rect x="1.5" y="5.5" width="11" height="7.5" rx="1" />
            <path d="M4.5 5.5V3.75a2.5 2.5 0 0 1 5 0V5.5" />
            <circle cx="7" cy="9.5" r="1" fill="var(--accent)" stroke="none" />
          </svg>
          <div>
            <div style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              VaultCore
            </div>
            <div style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)', opacity: 0.6 }}>
              {vaultPath ? vaultPath.split('/').pop() : 'No vault'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 p-1.5 space-y-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.section}>
            <div
              className="px-2 mb-1"
              style={{
                fontSize: 'var(--type-caption)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              {section.section}
            </div>
            <div className="space-y-px">
              {section.items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`nav-item w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm text-left${isActive ? ' active' : ''}`}
                    style={{
                      borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    <span style={{ opacity: isActive ? 1 : 0.55, flexShrink: 0 }}>
                      {ICONS[item.id]}
                    </span>
                    <span style={{ fontSize: 'var(--type-body)' }}>
                      {item.label}
                    </span>
                    {getBadge(item.id)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer brand */}
      <div className="px-3 py-2 shrink-0 section-sep">
        <div style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
          ItsEliias ╱ VaultCore
        </div>
      </div>
    </div>
  );
}
