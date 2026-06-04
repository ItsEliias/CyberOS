// PlaybookStudio — TitleBar Component (teal accent redesign)

import { useStore } from '../../store'

interface TitleBarProps {
  activeRunName?: string | null
  onHelp?: () => void
}

export default function TitleBar({ activeRunName, onHelp }: TitleBarProps) {
  const view      = useStore(s => s.view)
  const setView   = useStore(s => s.setView)
  const activeRun = useStore(s => s.activeRun)

  function handleNewPlaybook() {
    const now = new Date().toISOString()
    useStore.getState().setActivePlaybook({
      id: `custom-${Date.now()}`,
      name: 'New Playbook',
      description: '',
      category: 'custom',
      tags: [],
      version: '1.0',
      createdAt: now,
      updatedAt: now,
      steps: [],
      isBuiltIn: false,
    })
    setView('editor')
  }

  return (
    <div
      className="h-10 flex items-center px-4 drag-region shrink-0 relative"
      style={{
        background: 'rgba(7,8,15,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Teal accent underline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(45,212,191,0.22) 40%, rgba(45,212,191,0.22) 60%, transparent 100%)',
        }}
      />

      {/* Traffic light spacer (macOS) */}
      <div className="w-[70px] no-drag" />

      {/* Brand */}
      <div className="flex items-center gap-2 no-drag">
        <div style={{ filter: 'drop-shadow(0 0 5px rgba(45,212,191,0.5))' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ color: '#2dd4bf' }}>
            <path d="M2 4h12M2 6.5h8M2 9h10M2 11.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold tracking-wide" style={{ color: '#8b949e' }}>
          PlaybookStudio
        </span>
        {activeRunName && (
          <span className="text-[12px] font-normal" style={{ color: '#484f58' }}>
            — {activeRunName}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* CYBERTOOLS badge */}
      <span
        className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full no-drag mr-2"
        style={{
          background: 'rgba(45,212,191,0.06)',
          color: '#484f58',
          border: '1px solid rgba(45,212,191,0.14)',
        }}
      >
        <span>⬡</span>
        <span>CYBERTOOLS</span>
      </span>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 no-drag">
        {view === 'run' && activeRun ? (
          <button
            onClick={() => setView('run')}
            className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium transition-colors"
            style={{
              background: 'rgba(248,81,73,0.10)',
              color: '#f85149',
              border: '1px solid rgba(248,81,73,0.22)',
            }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
              <rect width="9" height="9" rx="1.5" />
            </svg>
            End Run
          </button>
        ) : (
          <button
            onClick={handleNewPlaybook}
            className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium transition-colors"
            style={{
              background: 'rgba(45,212,191,0.10)',
              color: '#2dd4bf',
              border: '1px solid rgba(45,212,191,0.25)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="6" y1="1" x2="6" y2="11" />
              <line x1="1" y1="6" x2="11" y2="6" />
            </svg>
            New Playbook
          </button>
        )}

        {onHelp && (
          <button
            onClick={onHelp}
            className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors"
            style={{ border: '1px solid rgba(42,51,71,0.6)', color: '#484f58', background: 'transparent' }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(45,212,191,0.35)'; el.style.color = '#2dd4bf' }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(42,51,71,0.6)'; el.style.color = '#484f58' }}
            title="Help & onboarding"
          >
            ?
          </button>
        )}
      </div>
    </div>
  )
}
