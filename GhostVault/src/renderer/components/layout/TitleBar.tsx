// GhostVault — Title Bar (polish)
// Header identity: ghost glyph lockup + app-name (600) + subname (muted, caption).
// Separators: ╱. Flat metric strip with · separators + left border.

import { useStore } from '../../store';
import type { LayoutMode } from '../../store';

interface TitleBarProps {
  onHelp?: () => void
}

/** Ghost/notebook domain glyph — 13×13 */
function GhostIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2C5.8 2 4 3.8 4 6c0 2 1.2 3.4 2.4 4.4L8 14l1.6-3.6C10.8 9.4 12 8 12 6c0-2.2-1.8-4-4-4z" />
      <circle cx="8" cy="6" r="1.5" fill="currentColor" />
    </svg>
  )
}

/** Minimize icon */
function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

/** Close icon */
function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const LAYOUT_LABELS: Record<LayoutMode, string> = {
  '1col': 'Sidebar only',
  '2col': 'Sidebar + Editor',
  '3col': 'Sidebar + Editor + AI',
};

export default function TitleBar({ onHelp }: TitleBarProps) {
  const { notes, vaultPath, alwaysOnTop, layoutMode, setLayoutMode } = useStore();
  const isMac = window.ghostvault.platform === 'darwin';

  return (
    <div
      className="flex items-center px-3 drag-region shrink-0"
      style={{ height: 32, borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-0)' }}
    >
      {isMac && <div className="w-[70px] shrink-0 no-drag" />}

      {/* Brand lockup */}
      <div className="flex items-center gap-2 no-drag" style={{ color: 'var(--accent)' }}>
        <GhostIcon />
        <div className="flex items-baseline gap-1.5">
          <span style={{ fontSize: 'var(--type-body)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            GhostVault
          </span>
          <span style={{ color: 'var(--border-default)', userSelect: 'none' }}>╱</span>
          <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            Notes
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Metric strip */}
      {vaultPath && (
        <div
          className="flex items-center no-drag mr-3"
          style={{
            fontSize: 'var(--type-caption)', color: 'var(--text-muted)',
            borderLeft: '1px solid var(--border-subtle)', paddingLeft: 8,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>{notes.length}</span>
          <span style={{ margin: '0 4px', color: 'var(--border-default)' }}>·</span>
          <span>{notes.length === 1 ? 'note' : 'notes'}</span>
        </div>
      )}

      {/* Layout toggle — compact SVG-only buttons */}
      <div className="flex items-center gap-0.5 no-drag mr-2">
        {(['1col', '2col', '3col'] as LayoutMode[]).map(mode => {
          const isActive = layoutMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setLayoutMode(mode)}
              title={LAYOUT_LABELS[mode]}
              className="px-1.5 py-0.5 rounded transition-all"
              style={{
                background: isActive ? 'var(--accent-tint)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
                fontSize: 'var(--type-caption)', fontFamily: 'var(--font-mono)',
              }}
            >
              {mode === '1col' ? '▐' : mode === '2col' ? '▐▌' : '▐▌▌'}
            </button>
          );
        })}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 no-drag">
        {/* CYBERTOOLS text badge */}
        <span
          className="no-drag mr-1"
          style={{
            fontSize: 'var(--type-caption)', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          CYBERTOOLS
        </span>

        {alwaysOnTop && (
          <span
            className="px-1.5 py-0.5 rounded"
            style={{
              fontSize: 'var(--type-caption)', fontWeight: 600,
              background: 'var(--accent-tint)', color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
            }}
          >
            ON TOP
          </span>
        )}

        {onHelp && (
          <button
            onClick={onHelp}
            title="Help"
            className="w-6 h-6 flex items-center justify-center rounded transition-all"
            style={{ color: 'var(--text-muted)', fontSize: 'var(--type-caption)', fontWeight: 700 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-tint)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            ?
          </button>
        )}

        <button
          onClick={() => window.ghostvault.minimizeWindow()}
          title="Minimize"
          className="w-6 h-6 flex items-center justify-center rounded transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <MinimizeIcon />
        </button>

        <button
          onClick={() => window.ghostvault.closeWindow()}
          title="Close"
          className="w-6 h-6 flex items-center justify-center rounded transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,81,73,0.12)'; e.currentTarget.style.color = '#f85149'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
