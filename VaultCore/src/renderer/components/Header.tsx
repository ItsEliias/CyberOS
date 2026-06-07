import { useStore } from '../store';
import type { CoreTheme, PersonalityTheme } from '@shared/types';
import LiveDot from './ui/LiveDot';

const CORES: CoreTheme[]            = ['stealth', 'graphite', 'frost', 'oled'];
const PERSONALITIES: PersonalityTheme[] = ['neutral', 'cyberpunk', 'terminal', 'threat'];

function applyTheme(core: CoreTheme, personality: PersonalityTheme) {
  document.documentElement.setAttribute('data-core', core);
  document.documentElement.setAttribute('data-personality', personality);
}

interface HeaderProps {
  onHelp?: () => void
}

export default function Header({ onHelp }: HeaderProps) {
  const { isScraping, progress, updateInfo, theme, setTheme, vaultPath } = useStore();
  const isMac = window.electronAPI.platform === 'darwin';

  async function changeCore(core: CoreTheme) {
    const next = { ...theme, core };
    setTheme(next);
    applyTheme(core, theme.personality as PersonalityTheme);
    await window.electronAPI.setTheme(next);
  }

  async function changePersonality(personality: PersonalityTheme) {
    const next = { ...theme, personality };
    setTheme(next);
    applyTheme(theme.core as CoreTheme, personality);
    await window.electronAPI.setTheme(next);
  }

  return (
    <header
      className="flex items-center gap-3 px-4 shrink-0 h-11 drag-region relative"
      style={{
        background: 'rgba(7, 8, 15, 0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Accent underline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(63,185,80,0.18) 35%, rgba(63,185,80,0.18) 65%, transparent 100%)' }}
      />

      {/* macOS traffic-light spacer — hidden on Linux/Windows */}
      {isMac && <div className="w-[70px] no-drag" />}

      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0 no-drag">
        <div style={{ filter: 'drop-shadow(0 0 5px rgba(63,185,80,0.45))' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#3fb950' }}>
            <path d="M8 1L14.5 4.75V11.25L8 15L1.5 11.25V4.75L8 1Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
        </div>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{
            background: 'rgba(63,185,80,0.08)',
            border: '1px solid rgba(63,185,80,0.18)',
            color: '#3fb950',
            letterSpacing: '0.08em',
          }}
        >
          VAULTCORE
        </span>
      </div>

      {/* Vault path */}
      <div className="flex-1 min-w-0 hidden md:block no-drag">
        <span className="text-[10px] font-mono truncate" style={{ color: 'var(--text-dim)' }}>
          {vaultPath ?? 'No vault configured'}
        </span>
      </div>

      {/* Scraping status */}
      {isScraping && (
        <div className="flex items-center gap-1.5 shrink-0 no-drag">
          <LiveDot status="online" size={6} />
          <span className="text-[11px] font-mono" style={{ color: '#3fb950' }}>
            {progress ? `${progress.percent}%` : 'Scraping…'}
          </span>
        </div>
      )}

      {/* Update badge */}
      {updateInfo?.hasUpdate && (
        <div className="text-[10px] px-2 py-0.5 rounded shrink-0 no-drag"
          style={{ background: 'rgba(63,185,80,0.12)', color: 'var(--accent)', border: '1px solid rgba(63,185,80,0.25)' }}>
          v{updateInfo.version}
        </div>
      )}

      {/* Theme pickers */}
      <div className="flex items-center gap-1 shrink-0 no-drag">
        {CORES.map(c => (
          <button key={c}
            onClick={() => changeCore(c)}
            title={c}
            className="text-[9px] px-1.5 py-0.5 rounded capitalize border"
            style={{
              background   : theme.core === c ? 'rgba(63,185,80,0.15)' : 'transparent',
              borderColor  : theme.core === c ? 'rgba(63,185,80,0.4)' : 'rgba(42,51,71,0.6)',
              color        : theme.core === c ? '#3fb950' : 'var(--text-dim)',
            }}>
            {c}
          </button>
        ))}
      </div>

      <div className="w-px h-4 shrink-0" style={{ background: 'rgba(42,51,71,0.6)' }} />

      <div className="flex items-center gap-1 shrink-0 no-drag">
        {PERSONALITIES.map(p => (
          <button key={p}
            onClick={() => changePersonality(p)}
            title={p}
            className="text-[9px] px-1.5 py-0.5 rounded capitalize border"
            style={{
              background   : theme.personality === p ? 'rgba(63,185,80,0.15)' : 'transparent',
              borderColor  : theme.personality === p ? 'rgba(63,185,80,0.4)' : 'rgba(42,51,71,0.6)',
              color        : theme.personality === p ? '#3fb950' : 'var(--text-dim)',
            }}>
            {p}
          </button>
        ))}
      </div>

      {/* Help button */}
      {onHelp && (
        <button
          onClick={onHelp}
          title="Help & onboarding"
          className="w-6 h-6 rounded border flex items-center justify-center text-xs font-bold shrink-0 no-drag"
          style={{ borderColor: 'rgba(42,51,71,0.6)', color: 'var(--text-dim)' }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(63,185,80,0.4)'; el.style.color = '#3fb950'; }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(42,51,71,0.6)'; el.style.color = 'var(--text-dim)'; }}
        >
          ?
        </button>
      )}
    </header>
  );
}
