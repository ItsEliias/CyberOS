import { useState } from 'react';
import { useStore } from '../store';
import type { ThemeId } from '@shared/types';
import { THEMES } from '../lib/themes';
import { formatElapsed } from '../lib/session';

const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export default function Header() {
  const { theme, setTheme, vpnStatus, tabs, activeTabId } = useStore();
  const [showThemes, setShowThemes] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  const vpnColor = vpnStatus.status === 'active' ? 'var(--success)' :
                   vpnStatus.status === 'off' ? 'var(--danger)' : 'var(--text-muted)';

  return (
    <div className="flex items-center justify-between px-4 h-11 border-b border-[var(--border)] bg-[var(--bg2)] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <span className="font-mono font-bold text-sm tracking-widest text-[var(--accent)]">CYBERLAB</span>
        <span className="text-[var(--text-muted)] text-xs">// ItsEliias</span>
      </div>

      {/* Session info */}
      {session && (
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="text-[var(--text)]">{session.labName || 'No Lab'}</span>
          {session.platform && <span className="text-[var(--accent)]">{session.platform}</span>}
          {session.difficulty && (
            <span className={`diff-${session.difficulty.toLowerCase()}`}>{session.difficulty}</span>
          )}
          {session.target.ip && <span className="font-mono">{session.target.ip}</span>}
        </div>
      )}

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* VPN status */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: vpnColor }} />
          <span style={{ color: vpnColor }}>
            {vpnStatus.status === 'active' ? (vpnStatus.ip || 'VPN') : vpnStatus.status === 'off' ? 'No VPN' : 'VPN?'}
          </span>
        </div>

        {/* Theme picker */}
        <div className="relative">
          <button
            className="flex items-center gap-1.5 btn-ghost px-2.5 py-1 text-xs"
            onClick={() => setShowThemes(!showThemes)}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: THEMES[theme]?.dot }} />
            <span>{THEMES[theme]?.name || theme}</span>
          </button>

          {showThemes && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowThemes(false)} />
              <div className="absolute right-0 top-8 z-20 panel p-1.5 flex flex-col gap-0.5 min-w-[120px]">
                {THEME_IDS.map(t => (
                  <button
                    key={t}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs text-left w-full transition-colors hover:bg-[var(--bg3)] ${theme === t ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}`}
                    onClick={() => { setTheme(t); setShowThemes(false); }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: THEMES[t].dot }} />
                    {THEMES[t].name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
