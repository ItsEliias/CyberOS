import { useStore } from '../store';
import { useVaultCoreStore } from '../stores/useVaultCoreStore';
import { useSecretStore } from '../stores/useSecretStore';
import type { ActiveViewVC } from '../stores/useVaultCoreStore';

const NAV_SECTIONS: Array<{ section: string; items: Array<{ id: ActiveViewVC; label: string; icon: string }> }> = [
  {
    section: 'Vault Scraper',
    items: [
      { id: 'dashboard', label: 'Dashboard',     icon: '◈' },
      { id: 'sources',   label: 'Sources',       icon: '◎' },
      { id: 'history',   label: 'Run History',   icon: '▤' },
      { id: 'health',    label: 'Source Health', icon: '◉' },
      { id: 'settings',  label: 'Settings',      icon: '◌' },
    ],
  },
  {
    section: 'Secret Detection',
    items: [
      { id: 'repos',     label: 'Repositories',  icon: '⬡' },
      { id: 'scan',      label: 'Scan Results',  icon: '⬢' },
      { id: 'branches',  label: 'Branch Compare', icon: '⌥' },
      { id: 'conflicts', label: 'Conflicts',      icon: '⚡' },
      { id: 'audit',     label: 'Audit Log',      icon: '▣' },
      { id: 'credvault', label: 'CredVault Sync', icon: '⬛' },
    ],
  },
];

export default function Sidebar() {
  const { sources: legacySources, vaultPath } = useStore();
  const { activeView, setActiveView, runs, sources: vcSources } = useVaultCoreStore();
  const { secrets, repos } = useSecretStore();

  const activeRunCount = runs.filter((r) => r.status === 'running').length;
  const errorCount = vcSources.filter((s) => s.health === 'error').length;
  const sourceCount = Math.max(legacySources.length, vcSources.length);
  const highEntropyCount = secrets.filter(s => s.patternType === 'high_entropy').length;

  function getBadge(id: ActiveViewVC): React.ReactNode {
    if (id === 'dashboard' && activeRunCount > 0)
      return (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full status-dot-pulse"
          style={{ background: '#3fb950', '--pulse-color': 'rgba(63,185,80,0.4)' } as React.CSSProperties}
        />
      );
    if (id === 'sources' && sourceCount > 0)
      return (
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono tabular-nums"
          style={{ background: 'rgba(42,51,71,0.4)', color: 'var(--text-dim)' }}>{sourceCount}</span>
      );
    if (id === 'history' && runs.length > 0)
      return (
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono tabular-nums"
          style={{ background: 'rgba(42,51,71,0.4)', color: 'var(--text-dim)' }}>{runs.length}</span>
      );
    if (id === 'health' && errorCount > 0)
      return (
        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
          style={{ background: 'rgba(248,81,73,0.12)', color: '#f85149', border: '1px solid rgba(248,81,73,0.25)' }}>{errorCount}</span>
      );
    if (id === 'repos' && repos.length > 0)
      return (
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono tabular-nums"
          style={{ background: 'rgba(42,51,71,0.4)', color: 'var(--text-dim)' }}>{repos.length}</span>
      );
    if (id === 'scan' && secrets.length > 0)
      return (
        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
          style={{ background: 'rgba(248,81,73,0.12)', color: '#f85149', border: '1px solid rgba(248,81,73,0.25)' }}>{secrets.length}</span>
      );
    if (id === 'scan' && highEntropyCount > 0)
      return (
        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(210,153,34,0.12)', color: '#d29922' }}>{highEntropyCount}</span>
      );
    return null;
  }

  return (
    <div
      className="flex flex-col border-r h-full overflow-y-auto"
      style={{
        width: 208,
        background: 'var(--surface-0)',
        borderColor: 'rgba(42,51,71,0.4)',
        flexShrink: 0,
        scrollbarWidth: 'none',
      }}
    >
      {/* Logo */}
      <div
        className="px-4 py-4 border-b shrink-0"
        style={{ borderColor: 'rgba(42,51,71,0.4)' }}
      >
        <div className="flex items-center gap-2">
          <div style={{ filter: 'drop-shadow(0 0 6px rgba(63,185,80,0.5))' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#3fb950' }}>
              <path d="M8 1L14.5 4.75V11.25L8 15L1.5 11.25V4.75L8 1Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="8" cy="8" r="2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-widest font-mono" style={{ color: 'rgba(63,185,80,0.6)' }}>
              CYBERTOOLS
            </div>
            <div className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              VAULTCORE
            </div>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 p-2 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.section}>
            <div
              className="text-[9px] uppercase tracking-widest px-2 mb-1.5 font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              {section.section}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left"
                    style={{
                      background  : isActive ? 'rgba(63,185,80,0.10)' : 'transparent',
                      color       : isActive ? '#3fb950' : 'var(--text-muted)',
                      borderLeft  : isActive ? '2px solid #3fb950' : '2px solid transparent',
                      fontFamily  : 'var(--font-display)',
                    }}
                  >
                    <span className="text-[11px] font-mono">{item.icon}</span>
                    <span>{item.label}</span>
                    {getBadge(item.id)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Vault path */}
      <div className="p-3 border-t shrink-0" style={{ borderColor: 'rgba(42,51,71,0.4)' }}>
        <div className="text-[9px] uppercase tracking-wider mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
          Vault
        </div>
        <div
          className="text-[10px] font-mono truncate"
          style={{ color: vaultPath ? 'var(--text-secondary)' : 'var(--text-muted)' }}
        >
          {vaultPath ? vaultPath.split('/').pop() : 'Not configured'}
        </div>
      </div>

      {/* Footer brand */}
      <div className="px-3 py-2 border-t shrink-0" style={{ borderColor: 'rgba(42,51,71,0.4)' }}>
        <div className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
          ItsEliias // VaultCore
        </div>
      </div>
    </div>
  );
}
