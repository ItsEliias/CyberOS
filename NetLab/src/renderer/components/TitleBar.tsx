// NetLab — TitleBar.tsx

import { useNetLabStore } from '../store'

export default function TitleBar() {
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
    </div>
  )
}
