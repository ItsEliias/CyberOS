// GhostVault — Custom Title Bar
// Matches CyberOS Dashboard TitleBar pattern with GhostVault accent #7bb8ff

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

export default function TitleBar({ onHelp }: TitleBarProps) {
  const { notes, vaultPath, alwaysOnTop, layoutMode, setLayoutMode } = useStore();

  return (
    <div
      className="h-10 border-b flex items-center px-4 drag-region shrink-0"
      style={{ borderColor: 'var(--border)', background: 'rgba(10, 10, 15, 0.9)' }}
    >
      {/* macOS traffic light spacer */}
      <div className="w-[70px] no-drag" />

      {/* App icon + name */}
      <div className="flex items-center gap-2 no-drag">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#7bb8ff' }}>
          <path d="M8 2C5.8 2 4 3.8 4 6c0 2 1.2 3.4 2.4 4.4L8 14l1.6-3.6C10.8 9.4 12 8 12 6c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="8" cy="6" r="1.5" fill="currentColor" />
        </svg>
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary, var(--text-muted))' }}>
          GhostVault
        </span>
        {vaultPath && (
          <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
            — {notes.length} note{notes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Layout mode toggle */}
      <div className="flex items-center gap-1 no-drag mr-3">
        {(['1col', '2col', '3col'] as LayoutMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setLayoutMode(mode)}
            title={`${mode === '1col' ? 'Sidebar only' : mode === '2col' ? 'Sidebar + Editor' : 'Sidebar + Editor + AI'}`}
            className="px-2 py-0.5 rounded text-[10px] font-mono transition-colors"
            style={{
              background: layoutMode === mode ? 'rgba(123,184,255,0.15)' : 'transparent',
              color: layoutMode === mode ? '#7bb8ff' : 'var(--text-dim)',
              border: layoutMode === mode ? '1px solid rgba(123,184,255,0.3)' : '1px solid transparent',
            }}
          >
            {LAYOUT_ICONS[mode]}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 no-drag">
        {/* CYBERTOOLS badge */}
        <span
          className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full mr-1"
          style={{ background: 'rgba(74,158,255,0.08)', color: '#4a5568', border: '1px solid rgba(74,158,255,0.12)' }}
        >
          <span>⬡</span>
          <span>CYBERTOOLS</span>
        </span>

        {alwaysOnTop && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'rgba(123,184,255,0.12)', color: '#7bb8ff', border: '1px solid rgba(123,184,255,0.2)' }}
          >
            ON TOP
          </span>
        )}

        {/* Help button */}
        {onHelp && (
          <button
            onClick={onHelp}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-white/5 no-drag"
            style={{ color: '#4a5568', fontSize: 12, fontWeight: 700, border: '1px solid transparent' }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.color = '#7bb8ff'; el.style.borderColor = 'rgba(123,184,255,0.3)' }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.color = '#4a5568'; el.style.borderColor = 'transparent' }}
            title="Help & onboarding"
          >
            ?
          </button>
        )}

        <button
          onClick={() => window.ghostvault.minimizeWindow()}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-white/5 no-drag"
          title="Minimize"
          style={{ color: 'var(--text-dim)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          onClick={() => window.ghostvault.closeWindow()}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-white/5 no-drag"
          title="Close"
          style={{ color: 'var(--text-dim)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
