import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecondeskStore } from './stores/useRecondeskStore'
import Sidebar from './components/layout/Sidebar'
import TitleBar from './components/layout/TitleBar'
import StatusBar from './components/layout/StatusBar'
import OverviewTab from './components/target/OverviewTab'
import PortsTab from './components/target/PortsTab'
import CredentialsTab from './components/target/CredentialsTab'
import AttackBoardTab from './components/target/AttackBoardTab'
import TimelineTab from './components/target/TimelineTab'
import ExportTab from './components/target/ExportTab'
import SettingsPanel from './components/target/SettingsPanel'
import GlobalSearch from './components/GlobalSearch'
import CalendarView from './components/CalendarView'
import OnboardingModal, { useOnboarding } from './components/OnboardingModal'
import type { ActiveTab } from './stores/useRecondeskStore'

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'overview',     label: 'Overview'      },
  { id: 'ports',        label: 'Ports'         },
  { id: 'credentials',  label: 'Credentials'   },
  { id: 'board',        label: 'Attack Board'  },
  { id: 'timeline',     label: 'Timeline'      },
  { id: 'export',       label: 'Export'        },
  { id: 'calendar',     label: 'Calendar'      },
]

export default function App() {
  const onboarding      = useOnboarding()
  const loadTargets     = useRecondeskStore(s => s.loadTargets)
  const activeTargetId  = useRecondeskStore(s => s.activeTargetId)
  const activeTab       = useRecondeskStore(s => s.activeTab)
  const setActiveTab    = useRecondeskStore(s => s.setActiveTab)
  const isSettingsOpen  = useRecondeskStore(s => s.isSettingsOpen)
  const targets         = useRecondeskStore(s => s.targets)
  const toasts          = useRecondeskStore(s => s.toasts)
  const dismissToast    = useRecondeskStore(s => s.dismissToast)

  useEffect(() => {
    loadTargets()
    window.electronAPI.onConfigUpdated?.((data) => {
      const ctx = (data as any).shared_context
      if (ctx) {
        useRecondeskStore.setState({
          ecosystemContext: {
            activeLab: ctx.activeTarget || null,
            activePlaybook: ctx.activePlaybook || null,
          }
        })
      }
    })
  }, [loadTargets])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface-0)', color: 'var(--text-primary)' }}>
      <TitleBar onHelp={onboarding.open} />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {isSettingsOpen ? (
            <SettingsPanel />
          ) : !activeTargetId ? (
            <EmptyState />
          ) : (
            <>
              {/* Tab bar */}
              <div
                className="flex items-center gap-0.5 px-4 flex-shrink-0 h-9"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className="relative px-3 py-1.5 text-xs transition-colors font-medium"
                    style={{ color: activeTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    {t.label}
                    {activeTab === t.id && (
                      <motion.div
                        layoutId="tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-px"
                        style={{ background: 'var(--accent)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex-1 min-h-0 overflow-hidden flex flex-col"
                >
                  {activeTab === 'overview'    && <OverviewTab targetId={activeTargetId} />}
                  {activeTab === 'ports'       && <PortsTab targetId={activeTargetId} />}
                  {activeTab === 'credentials' && <CredentialsTab targetId={activeTargetId} />}
                  {activeTab === 'board'       && <AttackBoardTab targetId={activeTargetId} />}
                  {activeTab === 'timeline'    && <TimelineTab targetId={activeTargetId} />}
                  {activeTab === 'export'      && <ExportTab targetId={activeTargetId} />}
                  {activeTab === 'calendar'    && <CalendarView />}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      <StatusBar />

      {/* Global Search (Cmd+K) */}
      <GlobalSearch />

      {/* Toast stack */}
      <div className="fixed bottom-8 right-4 z-50 flex flex-col gap-2 items-end">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border shadow-lg text-xs cursor-pointer max-w-xs ${
                toast.type === 'success' ? 'bg-[#3fb950]/10 border-[#3fb950]/25 text-[#3fb950]' :
                toast.type === 'error'   ? 'bg-[#f85149]/10 border-[#f85149]/25 text-[#f85149]' :
                'bg-[#12131a] border-[#2a3347] text-[#e2e8f0]'
              }`}
              onClick={() => dismissToast(toast.id)}
            >
              <span>{toast.message}</span>
              <span className="text-[10px] opacity-50 ml-1">✕</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {onboarding.show && <OnboardingModal onClose={onboarding.close} />}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-5" style={{ filter: 'drop-shadow(0 0 12px rgba(210,153,34,0.25))' }}>
          <svg width="40" height="40" viewBox="0 0 16 16" fill="none" style={{ color: '#d29922', opacity: 0.25, display: 'inline-block' }}>
            <path d="M8 1L14.5 4.75V11.25L8 15L1.5 11.25V4.75L8 1Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
        </div>
        <p className="text-sm font-medium" style={{ color: '#8b949e' }}>Select a target to begin</p>
        <p className="text-xs mt-1" style={{ color: '#484f58' }}>or click + to add a new target</p>
      </div>
    </div>
  )
}
