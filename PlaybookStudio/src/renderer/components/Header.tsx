// PlaybookStudio — Header / Nav Component (polish: CSS token vars, .nav-item)

import { useStore, type View } from '../store'

const TABS: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: 'library',
    label: 'Library',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="4" height="4" rx="1" />
        <rect x="7" y="1" width="4" height="4" rx="1" />
        <rect x="1" y="7" width="4" height="4" rx="1" />
        <rect x="7" y="7" width="4" height="4" rx="1" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'Run History',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="5" />
        <path d="M6 3v3l2 2" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="6" cy="6" r="1.5" />
        <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.6 2.6l1.06 1.06M8.34 8.34l1.06 1.06M2.6 9.4l1.06-1.06M8.34 3.66l1.06-1.06" />
      </svg>
    ),
  },
]

export default function Header() {
  const view      = useStore(s => s.view)
  const setView   = useStore(s => s.setView)
  const activeRun = useStore(s => s.activeRun)
  const isMac     = window.electronAPI.platform === 'darwin'

  return (
    <div
      className="drag-region flex items-center px-4 flex-shrink-0 relative"
      style={{
        height: 40,
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {isMac && <div className="w-20" />}

      {/* Center nav tabs */}
      <div className="no-drag flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
        {TABS.map(tab => {
          const isActive = view === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`nav-item flex items-center gap-1.5 px-3 py-1 rounded${isActive ? ' active' : ''}`}
              style={{
                fontSize: 'var(--type-label)',
                fontWeight: isActive ? 500 : 400,
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: isActive ? 'var(--accent-tint)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--accent-border)' : 'transparent'}`,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}

        {activeRun && (
          <button
            onClick={() => setView('run')}
            className={`nav-item flex items-center gap-1.5 px-3 py-1 rounded${view === 'run' ? ' active' : ''}`}
            style={{
              fontSize: 'var(--type-label)',
              color: view === 'run' ? 'var(--state-online)' : 'var(--text-muted)',
              background: view === 'run' ? 'rgba(63,185,80,0.08)' : 'transparent',
              border: `1px solid ${view === 'run' ? 'rgba(63,185,80,0.22)' : 'transparent'}`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full status-dot-pulse"
              style={{ '--pulse-rgb': '63,185,80', backgroundColor: 'var(--state-online)' } as React.CSSProperties}
            />
            Active Run
          </button>
        )}
      </div>

      {/* Right: version text */}
      <div className="flex-1 flex justify-end no-drag">
        <span className="status-metric" style={{ fontFamily: 'var(--font-mono)' }}>v1</span>
      </div>
    </div>
  )
}
