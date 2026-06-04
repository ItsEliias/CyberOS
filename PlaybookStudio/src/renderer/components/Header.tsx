import { useStore, type View } from '../store'

const TABS: { id: View; label: string }[] = [
  { id: 'library',  label: 'Library' },
  { id: 'history',  label: 'Run History' },
  { id: 'settings', label: 'Settings' },
]

export default function Header() {
  const view       = useStore(s => s.view)
  const setView    = useStore(s => s.setView)
  const activeRun  = useStore(s => s.activeRun)

  function nav(v: View) {
    setView(v)
  }

  return (
    <div
      className="drag-region flex items-center justify-between px-4 flex-shrink-0"
      style={{ height: 52, borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}
    >
      {/* Left: spacer for traffic lights */}
      <div className="w-20" />

      {/* Center: tabs */}
      <div className="no-drag flex items-center gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => nav(tab.id)}
            className="px-3 py-1 rounded text-sm font-medium transition-colors"
            style={{
              color:      view === tab.id ? 'var(--accent)' : 'var(--text-dim)',
              background: view === tab.id ? 'var(--accent-dim)' : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
        {activeRun && (
          <button
            onClick={() => nav('run')}
            className="px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
            style={{
              color:      view === 'run' ? 'var(--success)' : 'var(--text-dim)',
              background: view === 'run' ? 'rgba(63,185,80,0.15)' : 'transparent',
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: 'var(--success)' }}
            />
            Active Run
          </button>
        )}
      </div>

      {/* Right: app name */}
      <div className="w-20 flex justify-end">
        <span className="text-xs font-semibold" style={{ color: 'var(--accent)', letterSpacing: '0.05em' }}>
          PLAYBOOK
        </span>
      </div>
    </div>
  )
}
