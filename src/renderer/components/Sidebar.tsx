import { useStore } from '../store';
import type { ViewId } from '@shared/types';

const NAV: Array<{ id: ViewId; label: string; icon: string }> = [
  { id: 'scrape',   label: 'Scrape',       icon: '⚡' },
  { id: 'sources',  label: 'Sources',      icon: '📚' },
  { id: 'health',   label: 'Vault Health', icon: '🏥' },
  { id: 'settings', label: 'Settings',     icon: '⚙️' },
];

export default function Sidebar() {
  const { activeView, setActiveView, isScraping, sources, vaultPath } = useStore();

  return (
    <div className="flex flex-col w-[200px] border-r h-full"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)', flexShrink: 0 }}>
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent)' }}>CYBERTOOLS</div>
        <div className="text-base font-bold mt-0.5" style={{ color: 'var(--text)' }}>VAULTCORE</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left"
            style={{
              background  : activeView === item.id ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
              color       : activeView === item.id ? 'var(--accent)' : 'var(--text-muted)',
              borderLeft  : activeView === item.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'scrape' && isScraping && (
              <span className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: '#3fb950' }} />
            )}
            {item.id === 'sources' && sources.length > 0 && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                style={{ background: 'var(--bg3)', color: 'var(--text-dim)' }}>{sources.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Vault status */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Vault</div>
        <div className="text-[10px] font-mono truncate" style={{ color: vaultPath ? 'var(--text-muted)' : 'var(--text-dim)' }}>
          {vaultPath ? vaultPath.split('/').pop() : 'Not configured'}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[9px]" style={{ color: 'var(--text-dim)' }}>ItsEliias // VaultCore</div>
      </div>
    </div>
  );
}
