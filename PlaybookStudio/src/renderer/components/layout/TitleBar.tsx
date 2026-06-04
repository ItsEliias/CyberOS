// PlaybookStudio — TitleBar Component
// CyberOS Design Bible: frameless titlebar with traffic light spacer

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
      className="h-10 flex items-center px-4 drag-region shrink-0"
      style={{
        background: 'rgba(10, 10, 15, 0.95)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Traffic light spacer (macOS) */}
      <div className="w-[70px] no-drag" />

      {/* App icon + name */}
      <div className="flex items-center gap-2 no-drag">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ color: '#4a9eff' }}>
          <path d="M2 4h12M2 6.5h8M2 9h10M2 11.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
        <span className="text-sm font-medium" style={{ color: '#8b949e' }}>
          PlaybookStudio
          {activeRunName && (
            <span style={{ color: '#4a5568', fontWeight: 400 }}> — {activeRunName}</span>
          )}
        </span>
      </div>

      <div className="flex-1" />

      {/* CYBERTOOLS badge */}
      <span
        className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full no-drag mr-2"
        style={{ background: 'rgba(74,158,255,0.08)', color: '#4a5568', border: '1px solid rgba(74,158,255,0.12)' }}
      >
        <span>⬡</span>
        <span>CYBERTOOLS</span>
      </span>

      {/* Right actions */}
      <div className="flex items-center gap-2 no-drag">
        {view === 'run' && activeRun ? (
          <button
            onClick={() => setView('run')}
            className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium transition-colors"
            style={{
              background: 'rgba(248,81,73,0.1)',
              color: '#f85149',
              border: '1px solid rgba(248,81,73,0.2)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect width="10" height="10" rx="1.5" />
            </svg>
            End Run
          </button>
        ) : (
          <button
            onClick={handleNewPlaybook}
            className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium transition-colors"
            style={{
              background: 'rgba(74,158,255,0.1)',
              color: '#4a9eff',
              border: '1px solid rgba(74,158,255,0.2)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="6" y1="1" x2="6" y2="11" />
              <line x1="1" y1="6" x2="11" y2="6" />
            </svg>
            New Playbook
          </button>
        )}

        {/* Help button */}
        {onHelp && (
          <button
            onClick={onHelp}
            className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors"
            style={{
              border: '1px solid rgba(42,51,71,0.6)',
              color: '#4a5568',
              background: 'transparent',
            }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(74,158,255,0.4)'; el.style.color = '#4a9eff' }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(42,51,71,0.6)'; el.style.color = '#4a5568' }}
            title="Help & onboarding"
          >
            ?
          </button>
        )}
      </div>
    </div>
  )
}
