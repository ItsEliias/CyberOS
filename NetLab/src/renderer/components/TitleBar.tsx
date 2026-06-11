// NetLab — TitleBar.tsx (polish)

import { useNetLabStore } from '../store'

interface Props {
  onOpenSearch: () => void
}

/* 13×13 lab/beaker glyph — network experiment domain identity */
function LabGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2v4L2 10h9L8 6V2" />
      <line x1="4" y1="2" x2="9" y2="2" />
      <circle cx="5.5" cy="8.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function TitleBar({ onOpenSearch }: Props) {
  const activeLab  = useNetLabStore(s => s.activeLab)
  const activeView = useNetLabStore(s => s.activeView)

  return (
    <div
      className="titlebar-drag flex items-center px-4 border-b border-border-subtle shrink-0"
      style={{ height: 32, background: 'var(--surface-0)' }}
    >
      {/* Traffic lights space */}
      <div className="w-16 shrink-0" />

      {/* Lockup: glyph + app-name ╱ sub-name */}
      <div className="no-drag flex items-center gap-2">
        <span style={{ color: 'var(--accent)', opacity: 0.9 }}>
          <LabGlyph />
        </span>
        <span style={{ fontSize: 'var(--type-body)', fontWeight: 600, color: 'var(--text-primary)' }}>
          NetLab
        </span>
        <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>╱</span>
        <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>
          Network Labs
        </span>
      </div>

      {/* Flat metric strip */}
      {activeLab && activeView === 'labs' && (
        <div className="no-drag flex items-center ml-4"
          style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 10 }}>
          <span className="status-metric">
            <strong>{activeLab.title}</strong>
          </span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* CYBERTOOLS plain text badge */}
      <span style={{
        fontSize: 'var(--type-caption)', letterSpacing: '0.08em',
        color: 'var(--text-muted)', marginRight: 10,
      }}>
        CYBERTOOLS
      </span>

      {/* Search trigger */}
      <button
        onClick={onOpenSearch}
        className="no-drag flex items-center gap-2 px-2.5 rounded"
        style={{
          height: 24, fontSize: 'var(--type-caption)',
          background: 'var(--surface-1)', color: 'var(--text-muted)',
          border: '1px solid var(--border-default)',
          transition: 'border-color var(--motion-fast) var(--ease), color var(--motion-fast) var(--ease)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <span>Search</span>
        <kbd style={{
          fontSize: 'var(--type-caption)', padding: '1px 4px', borderRadius: 3,
          background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
        }}>
          ⌘K
        </kbd>
      </button>
    </div>
  )
}
