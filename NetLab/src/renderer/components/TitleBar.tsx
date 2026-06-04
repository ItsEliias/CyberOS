// NetLab — TitleBar.tsx

import { useNetLabStore } from '../store'

interface Props {
  onOpenSearch: () => void
}

export default function TitleBar({ onOpenSearch }: Props) {
  const activeLab  = useNetLabStore(s => s.activeLab)
  const activeView = useNetLabStore(s => s.activeView)

  return (
    <div
      className="titlebar-drag flex items-center h-11 px-4 border-b border-border-subtle"
      style={{ background: '#0a0a0f', WebkitUserSelect: 'none' }}
    >
      {/* Traffic lights space */}
      <div className="w-16 shrink-0" />

      {/* App name */}
      <div className="flex items-center gap-2 select-none">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: '#5ec4ff', boxShadow: '0 0 6px rgba(94,196,255,0.6)' }}
        />
        <span className="text-sm font-semibold tracking-wide" style={{ color: '#5ec4ff' }}>
          NetLab
        </span>
        <span className="text-2xs px-1.5 py-0.5 rounded text-text-muted"
          style={{ background: '#161b27', border: '1px solid #2a3347', letterSpacing: '0.08em' }}>
          CYBERTOOLS
        </span>
      </div>

      {/* Active lab badge */}
      {activeLab && activeView === 'labs' && (
        <div className="no-drag ml-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs border border-border-default"
          style={{ background: 'rgba(94,196,255,0.08)', color: '#5ec4ff' }}
        >
          <span>{activeLab.title}</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search trigger */}
      <button
        onClick={onOpenSearch}
        className="no-drag flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors"
        style={{ background: '#0f1117', color: '#8b949e', border: '1px solid #2a3347' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#5ec4ff'; e.currentTarget.style.color = '#5ec4ff' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a3347'; e.currentTarget.style.color = '#8b949e' }}
      >
        <span>Search</span>
        <kbd className="text-2xs px-1 py-0.5 rounded" style={{ background: '#161b27', border: '1px solid #2a3347' }}>
          ⌘K
        </kbd>
      </button>
    </div>
  )
}
