import { useStore } from '../store';
import type { CoreTheme, PersonalityTheme } from '@shared/types';

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
    <header className="flex items-center gap-4 px-4 border-b shrink-0 h-11"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>

      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(74,158,255,0.08)', color: '#4a5568', border: '1px solid rgba(74,158,255,0.12)' }}
        >
          <span>⬡</span>
          <span>CYBERTOOLS</span>
        </span>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>VAULTCORE</span>
        <span className="hidden sm:inline text-[10px]" style={{ color: 'var(--text-dim)' }}>// ItsEliias</span>
      </div>

      {/* Vault path */}
      <div className="flex-1 min-w-0 hidden md:block">
        <span className="text-[10px] font-mono truncate" style={{ color: 'var(--text-dim)' }}>
          {vaultPath ?? 'No vault configured'}
        </span>
      </div>

      {/* Scraping status */}
      {isScraping && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#3fb950' }} />
          <span className="text-[11px]" style={{ color: '#3fb950' }}>
            {progress ? `${progress.percent}%` : 'Scraping…'}
          </span>
        </div>
      )}

      {/* Update badge */}
      {updateInfo?.hasUpdate && (
        <div className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
          Update v{updateInfo.version}
        </div>
      )}

      {/* Core picker */}
      <div className="flex items-center gap-1 shrink-0">
        {CORES.map(c => (
          <button key={c}
            onClick={() => changeCore(c)}
            title={c}
            className="text-[9px] px-1.5 py-0.5 rounded capitalize transition-all border"
            style={{
              background    : theme.core === c ? 'var(--accent)' : 'transparent',
              borderColor   : theme.core === c ? 'var(--accent)' : 'var(--border)',
              color         : theme.core === c ? '#fff' : 'var(--text-dim)',
            }}>
            {c}
          </button>
        ))}
      </div>

      <div className="w-px h-4 shrink-0" style={{ background: 'var(--border)' }} />

      {/* Personality picker */}
      <div className="flex items-center gap-1 shrink-0">
        {PERSONALITIES.map(p => (
          <button key={p}
            onClick={() => changePersonality(p)}
            title={p}
            className="text-[9px] px-1.5 py-0.5 rounded capitalize transition-all border"
            style={{
              background    : theme.personality === p ? 'var(--accent)' : 'transparent',
              borderColor   : theme.personality === p ? 'var(--accent)' : 'var(--border)',
              color         : theme.personality === p ? '#fff' : 'var(--text-dim)',
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
          className="text-[9px] px-1.5 py-0.5 rounded capitalize transition-all border shrink-0"
          style={{
            background: 'transparent',
            borderColor: 'var(--border)',
            color: 'var(--text-dim)',
            fontSize: 12,
            fontWeight: 700,
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--accent)' }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-dim)' }}
        >
          ?
        </button>
      )}
    </header>
  );
}
