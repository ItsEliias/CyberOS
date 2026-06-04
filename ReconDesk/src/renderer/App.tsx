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
    <div className="flex flex-col h-full bg-[#0a0a0f] text-[#e2e8f0]">
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
              <div className="flex items-center gap-0.5 px-4 border-b border-[#2a3347] flex-shrink-0 h-9">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className="relative px-3 py-1.5 text-xs transition-colors"
                    style={{ color: activeTab === t.id ? '#e2e8f0' : '#8b949e' }}
                  >
                    {t.label}
                    {activeTab === t.id && (
                      <motion.div
                        layoutId="tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-px bg-[#d29922]"
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
        <div className="text-4xl mb-4 opacity-20">⬡</div>
        <p className="text-sm text-[#8b949e]">Select a target to begin</p>
        <p className="text-xs text-[#4a5568] mt-1">or click + to add a new target</p>
      </div>
    </div>
  )
}
