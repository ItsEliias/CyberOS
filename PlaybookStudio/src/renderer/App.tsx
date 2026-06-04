import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useStore, type View } from './store'
import TitleBar from './components/layout/TitleBar'
import StatusBar from './components/layout/StatusBar'
import LibraryView from './components/LibraryView'
import EditorView from './components/EditorView'
import RunView from './components/RunView'
import HistoryView from './components/HistoryView'
import SettingsView from './components/SettingsView'
import OnboardingModal, { useOnboarding } from './components/OnboardingModal'

// ─── Sidebar ───────────────────────────────────────────────────────────────────

interface NavItem {
  id: View
  label: string
  icon: React.ReactNode
  requiresRun?: boolean
}

function SidebarIcon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d={d} />
    </svg>
  )
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'library',
    label: 'Library',
    icon: <SidebarIcon d="M2 3h12M2 6h12M2 9h8M2 12h10" />,
  },
  {
    id: 'run',
    label: 'Active Run',
    icon: <SidebarIcon d="M4 8l2.5 2.5L12 5" />,
    requiresRun: true,
  },
  {
    id: 'history',
    label: 'History',
    icon: <SidebarIcon d="M8 4v4l2.5 2M8 2a6 6 0 100 12A6 6 0 008 2z" />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SidebarIcon d="M8 5a3 3 0 100 6 3 3 0 000-6zm0-3v1m0 10v1M5 8H4m8 0h-1M5.636 5.636l-.707-.707m4.142 4.142l.707.707M5.636 10.364l-.707.707m4.142-4.142l.707-.707" />,
  },
]

function Sidebar() {
  const view      = useStore(s => s.view)
  const setView   = useStore(s => s.setView)
  const activeRun = useStore(s => s.activeRun)
  const playbooks = useStore(s => s.playbooks)

  const builtInCount = playbooks.filter(p => p.isBuiltIn).length
  const customCount  = playbooks.filter(p => !p.isBuiltIn).length

  return (
    <div
      className="flex flex-col flex-shrink-0 h-full"
      style={{ width: 180, background: 'var(--panel)', borderRight: '1px solid var(--border)' }}
    >
      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1 no-drag">
        {NAV_ITEMS.map(item => {
          if (item.requiresRun && !activeRun) return null
          const isActive = view === item.id
          return (
            <div key={item.id} className="relative">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded"
                  style={{ background: 'rgba(45,212,191,0.10)', borderLeft: '2px solid #2dd4bf' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <button
                onClick={() => setView(item.id)}
                className="relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium transition-all"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  paddingLeft: isActive ? 14 : 10,
                  textShadow: isActive ? '0 0 8px rgba(45,212,191,0.35)' : 'none',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === 'run' && activeRun && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full status-dot-pulse flex-shrink-0"
                    style={{
                      background: '#3fb950',
                      '--pulse-color': 'rgba(63,185,80,0.4)',
                      '--pulse-color-fade': 'rgba(63,185,80,0)',
                    } as React.CSSProperties}
                  />
                )}
              </button>
            </div>
          )
        })}
      </nav>

      {/* Footer info */}
      <div className="p-3 flex flex-col gap-0.5" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {builtInCount} built-in
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {customCount} custom
        </span>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const onboarding   = useOnboarding()
  const view         = useStore(s => s.view)
  const setPlaybooks = useStore(s => s.setPlaybooks)
  const setRuns      = useStore(s => s.setRuns)
  const setContext   = useStore(s => s.setContext)
  const setActiveRun = useStore(s => s.setActiveRun)
  const activeRun    = useStore(s => s.activeRun)

  useEffect(() => {
    window.electronAPI.getState().then(state => {
      setPlaybooks(state.playbooks)
      setRuns(state.runs)
      setContext(state.sharedContext)

      // Restore active run from previous session
      const runningRun = state.runs
        .filter(r => r.status === 'running')
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]
      if (runningRun) {
        setActiveRun(runningRun)
      }
    })

    const unCtx = window.electronAPI.onContextUpdated(setContext)
    return () => { unCtx() }
  }, [setPlaybooks, setRuns, setContext, setActiveRun])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <TitleBar activeRunName={activeRun?.playbookName ?? null} onHelp={onboarding.open} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 overflow-hidden">
          {view === 'library'  && <LibraryView />}
          {view === 'editor'   && <EditorView />}
          {view === 'run'      && <RunView />}
          {view === 'history'  && <HistoryView />}
          {view === 'settings' && <SettingsView />}
        </div>
      </div>
      <StatusBar />
      {onboarding.show && <OnboardingModal onClose={onboarding.close} />}
    </div>
  )
}
