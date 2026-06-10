// PlaybookStudio — TitleBar (polish: 32px, lockup, flat metric, CYBERTOOLS text)

import { useStore } from '../../store'

interface TitleBarProps {
  activeRunName?: string | null
  onHelp?: () => void
}

const PlaybookIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ color: 'var(--accent)' }}>
    <rect x="2" y="2" width="12" height="13" rx="2" />
    <path d="M5 6h6M5 9h4M5 12h5" />
  </svg>
)

const PlusIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="6" y1="1" x2="6" y2="11" />
    <line x1="1" y1="6" x2="11" y2="6" />
  </svg>
)

export default function TitleBar({ activeRunName, onHelp }: TitleBarProps) {
  const view      = useStore(s => s.view)
  const setView   = useStore(s => s.setView)
  const activeRun = useStore(s => s.activeRun)
  const playbooks = useStore(s => s.playbooks)

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
      className="flex items-center px-3 drag-region shrink-0"
      style={{
        height: 32,
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* macOS traffic-light spacer */}
      <div className="w-[70px] no-drag" />

      {/* Brand lockup */}
      <div className="flex items-center gap-2 no-drag">
        <PlaybookIcon />
        <span style={{ fontSize: 'var(--type-body)', fontWeight: 600, color: 'var(--text-primary)' }}>
          PlaybookStudio
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--type-caption)' }}>╱</span>
        <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>Runbooks</span>
      </div>

      {/* Flat metric strip */}
      {playbooks.length > 0 && (
        <div className="flex items-center no-drag" style={{
          marginLeft: 10,
          paddingLeft: 10,
          borderLeft: '1px solid var(--border-subtle)',
          gap: 4,
        }}>
          <span className="status-metric">
            <strong>{playbooks.length}</strong> {playbooks.length === 1 ? 'playbook' : 'playbooks'}
          </span>
          {activeRunName && (
            <>
              <span className="status-sep">·</span>
              <span className="status-metric" style={{ color: 'var(--state-online)' }}>{activeRunName}</span>
            </>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* CYBERTOOLS plain text badge */}
      <span
        className="no-drag"
        style={{
          fontSize: 'var(--type-caption)',
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 500,
          marginRight: 8,
          opacity: 0.6,
        }}
      >
        CYBERTOOLS
      </span>

      {/* Action buttons */}
      <div className="flex items-center gap-1 no-drag">
        {view === 'run' && activeRun ? (
          <button
            onClick={() => setView('run')}
            className="flex items-center gap-1.5 px-2.5 rounded text-xs font-medium transition-colors"
            style={{
              height: 24, background: 'rgba(248,81,73,0.10)',
              color: '#f85149', border: '1px solid rgba(248,81,73,0.22)',
              fontSize: 'var(--type-label)',
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
            className="flex items-center gap-1.5 px-2.5 rounded font-medium transition-colors"
            style={{
              height: 24, background: 'var(--accent-tint)',
              color: 'var(--text-secondary)', border: '1px solid var(--accent-border)',
              fontSize: 'var(--type-label)',
            }}
          >
            <PlusIcon />
            New Playbook
          </button>
        )}

        {onHelp && (
          <button
            onClick={onHelp}
            className="flex items-center justify-center rounded transition-colors"
            style={{
              width: 24, height: 24, background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)', fontSize: 11, fontWeight: 700,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'var(--accent)'
              el.style.borderColor = 'var(--accent-border)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'var(--text-muted)'
              el.style.borderColor = 'var(--border-subtle)'
            }}
            title="Help & onboarding"
          >?</button>
        )}
      </div>
    </div>
  )
}
