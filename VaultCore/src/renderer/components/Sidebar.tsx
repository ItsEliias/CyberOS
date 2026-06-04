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
      return <span className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: '#3fb950' }} />;
    if (id === 'sources' && sourceCount > 0)
      return <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: 'var(--bg3)', color: 'var(--text-dim)' }}>{sourceCount}</span>;
    if (id === 'history' && runs.length > 0)
      return <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: 'var(--bg3)', color: 'var(--text-dim)' }}>{runs.length}</span>;
    if (id === 'health' && errorCount > 0)
      return <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149' }}>{errorCount}</span>;
    if (id === 'repos' && repos.length > 0)
      return <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: 'var(--bg3)', color: 'var(--text-dim)' }}>{repos.length}</span>;
    if (id === 'scan' && secrets.length > 0)
      return <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149' }}>{secrets.length}</span>;
    if (id === 'scan' && highEntropyCount > 0)
      return <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(210,153,34,0.15)', color: '#d29922' }}>{highEntropyCount}</span>;
    return null;
  }

  return (
    <div
      className="flex flex-col border-r h-full overflow-y-auto"
      style={{ width: 208, background: 'var(--bg2)', borderColor: 'var(--border)', flexShrink: 0, scrollbarWidth: 'none' }}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--accent)' }}>CYBERTOOLS</div>
        <div className="text-base font-bold mt-0.5" style={{ color: 'var(--text)' }}>VAULTCORE</div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 p-2 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.section}>
            <div className="text-[9px] uppercase tracking-widest px-2 mb-1.5" style={{ color: 'var(--text-dim)' }}>
              {section.section}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left"
                  style={{
                    background: activeView === item.id ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                    color: activeView === item.id ? 'var(--accent)' : 'var(--text-muted)',
                    borderLeft: activeView === item.id ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  <span className="text-[11px] font-mono">{item.icon}</span>
                  <span>{item.label}</span>
                  {getBadge(item.id)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Vault status */}
      <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Vault</div>
        <div className="text-[10px] font-mono truncate" style={{ color: vaultPath ? 'var(--text-muted)' : 'var(--text-dim)' }}>
          {vaultPath ? vaultPath.split('/').pop() : 'Not configured'}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[9px]" style={{ color: 'var(--text-dim)' }}>ItsEliias // VaultCore</div>
      </div>
    </div>
  );
}
