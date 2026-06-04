// GhostVault — Title Bar (redesigned with Geist Sans + soft blue accent glow)

import { useStore } from '../../store';
import type { LayoutMode } from '../../store';

interface TitleBarProps {
  onHelp?: () => void
}

const LAYOUT_ICONS: Record<LayoutMode, string> = {
  '1col': '▐',
  '2col': '▐▌',
  '3col': '▐▌▌',
};

const LAYOUT_LABELS: Record<LayoutMode, string> = {
  '1col': 'Sidebar only',
  '2col': 'Sidebar + Editor',
  '3col': 'Sidebar + Editor + AI',
};

export default function TitleBar({ onHelp }: TitleBarProps) {
  const { notes, vaultPath, alwaysOnTop, layoutMode, setLayoutMode } = useStore();

  return (
    <div
      className="h-10 flex items-center px-3 drag-region shrink-0"
      style={{
        borderBottom: '1px solid rgba(42,51,71,0.45)',
        background: 'rgba(7,8,15,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* macOS traffic light spacer */}
      <div className="w-[70px] shrink-0 no-drag" />

      {/* Brand */}
      <div className="flex items-center gap-2 no-drag">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ color: '#7bb8ff', filter: 'drop-shadow(0 0 4px rgba(123,184,255,0.5))' }}>
          <path d="M8 2C5.8 2 4 3.8 4 6c0 2 1.2 3.4 2.4 4.4L8 14l1.6-3.6C10.8 9.4 12 8 12 6c0-2.2-1.8-4-4-4z"
            stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="8" cy="6" r="1.5" fill="currentColor" />
        </svg>
        <span
          className="text-xs font-semibold tracking-wide"
          style={{ color: '#e6edf3', fontFamily: 'var(--font-display)' }}
        >
          GhostVault
        </span>
        {vaultPath && (
          <span
            className="text-[10px] font-mono"
            style={{ color: 'rgba(139,148,158,0.6)' }}
          >
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Layout toggle */}
      <div className="flex items-center gap-0.5 no-drag mr-2">
        {(['1col', '2col', '3col'] as LayoutMode[]).map(mode => {
          const isActive = layoutMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setLayoutMode(mode)}
              title={LAYOUT_LABELS[mode]}
              className="px-2 py-0.5 rounded text-[10px] font-mono transition-all"
              style={{
                background: isActive ? 'rgba(123,184,255,0.12)' : 'transparent',
                color: isActive ? '#7bb8ff' : 'rgba(72,79,88,0.8)',
                border: isActive ? '1px solid rgba(123,184,255,0.28)' : '1px solid transparent',
                boxShadow: isActive ? '0 0 6px rgba(123,184,255,0.15)' : 'none',
              }}
            >
              {LAYOUT_ICONS[mode]}
            </button>
          );
        })}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 no-drag">
        {/* CYBERTOOLS badge */}
        <span
          className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{
            background: 'rgba(123,184,255,0.06)',
            color: 'rgba(72,79,88,0.7)',
            border: '1px solid rgba(123,184,255,0.1)',
          }}
        >
          <span style={{ opacity: 0.6 }}>⬡</span>
          <span>CYBERTOOLS</span>
        </span>

        {alwaysOnTop && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-wider"
            style={{
              background: 'rgba(123,184,255,0.1)',
              color: '#7bb8ff',
              border: '1px solid rgba(123,184,255,0.25)',
            }}
          >
            ON TOP
          </span>
        )}

        {onHelp && (
          <button
            onClick={onHelp}
            title="Help & onboarding"
            className="w-7 h-7 flex items-center justify-center rounded transition-colors no-drag"
            style={{ color: 'rgba(72,79,88,0.8)', fontSize: 11, fontWeight: 700 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#7bb8ff'; e.currentTarget.style.background = 'rgba(123,184,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(72,79,88,0.8)'; e.currentTarget.style.background = 'transparent'; }}
          >
            ?
          </button>
        )}

        <button
          onClick={() => window.ghostvault.minimizeWindow()}
          title="Minimize"
          className="w-7 h-7 flex items-center justify-center rounded transition-colors no-drag"
          style={{ color: 'rgba(72,79,88,0.7)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <button
          onClick={() => window.ghostvault.closeWindow()}
          title="Close"
          className="w-7 h-7 flex items-center justify-center rounded transition-colors no-drag"
          style={{ color: 'rgba(72,79,88,0.7)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,81,73,0.12)'; e.currentTarget.style.color = '#f85149'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(72,79,88,0.7)'; }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
