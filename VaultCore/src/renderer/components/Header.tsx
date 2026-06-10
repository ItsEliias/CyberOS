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
      className="flex items-center gap-3 px-4 shrink-0 drag-region"
      style={{
        height: 44,
        background: 'var(--surface-0)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* macOS traffic-light spacer — hidden on Linux/Windows */}
      {isMac && <div className="w-[70px] no-drag" />}

      {/* App identity lockup: vault glyph + name + subname */}
      <div className="flex items-center gap-2 shrink-0 no-drag">
        {/* Vault/key glyph — 13×13px stroke SVG */}
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"
          stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: 0.85 }}
        >
          <rect x="2.5" y="6" width="10" height="7.5" rx="1" />
          <path d="M5 6V4.5a2.5 2.5 0 0 1 5 0V6" />
          <circle cx="7.5" cy="9.5" r="1" fill="var(--accent)" stroke="none" />
        </svg>
        <div className="flex items-baseline gap-1.5 leading-none">
          <span style={{
            fontSize: 'var(--type-body-md)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.01em',
          }}>
            VaultCore
          </span>
          <span style={{
            fontSize: 'var(--type-caption)',
            color: 'var(--text-muted)',
          }}>
            ╱ vault scraper
          </span>
        </div>
      </div>

      {/* Vault path — flat, muted, truncated */}
      <div className="flex-1 min-w-0 hidden md:block no-drag">
        <span
          className="font-mono truncate"
          style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}
        >
          {vaultPath ? `· ${vaultPath.split('/').slice(-2).join('/')}` : '· no vault configured'}
        </span>
      </div>

      {/* Scraping status — flat chip */}
      {isScraping && (
        <div className="flex items-center gap-1.5 shrink-0 no-drag">
          <LiveDot status="online" size={5} />
          <span className="font-mono" style={{ fontSize: 'var(--type-caption)', color: 'var(--accent)' }}>
            {progress ? `${progress.percent}%` : 'Scraping…'}
          </span>
        </div>
      )}

      {/* Update badge */}
      {updateInfo?.hasUpdate && (
        <div
          className="shrink-0 no-drag"
          style={{
            fontSize: 'var(--type-caption)',
            padding: '1px 7px',
            borderRadius: 3,
            background: 'var(--accent-tint)',
            color: 'var(--accent)',
            border: '1px solid var(--accent-border)',
          }}
        >
          v{updateInfo.version}
        </div>
      )}

      {/* Theme pickers — compact, token-driven */}
      <div className="flex items-center gap-1 shrink-0 no-drag">
        {CORES.map(c => (
          <button key={c}
            onClick={() => changeCore(c)}
            title={c}
            style={{
              fontSize: 'var(--type-caption)',
              padding: '1px 6px',
              borderRadius: 3,
              textTransform: 'capitalize',
              background  : theme.core === c ? 'var(--accent-tint)' : 'transparent',
              border      : `1px solid ${theme.core === c ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              color       : theme.core === c ? 'var(--accent)' : 'var(--text-muted)',
            }}>
            {c}
          </button>
        ))}
      </div>

      <div className="w-px h-4 shrink-0" style={{ background: 'var(--border-subtle)' }} />

      <div className="flex items-center gap-1 shrink-0 no-drag">
        {PERSONALITIES.map(p => (
          <button key={p}
            onClick={() => changePersonality(p)}
            title={p}
            style={{
              fontSize: 'var(--type-caption)',
              padding: '1px 6px',
              borderRadius: 3,
              textTransform: 'capitalize',
              background  : theme.personality === p ? 'var(--accent-tint)' : 'transparent',
              border      : `1px solid ${theme.personality === p ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              color       : theme.personality === p ? 'var(--accent)' : 'var(--text-muted)',
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
          className="w-6 h-6 rounded flex items-center justify-center font-bold shrink-0 no-drag"
          style={{
            fontSize: 'var(--type-label)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          ?
        </button>
      )}
    </header>
  );
}
