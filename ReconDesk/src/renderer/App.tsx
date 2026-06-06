import { useEffect, useState, useCallback } from 'react'
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
import CommandPalette from './components/CommandPalette'
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
  const setNewTargetModal = useRecondeskStore(s => s.setNewTargetModal)

  const activeTarget    = targets.find(t => t.id === activeTargetId)

  const [paletteOpen, setPaletteOpen] = useState(false)
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  // ⌘K → command palette
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Tray-menu actions fired by the CyberTools Launcher.
  useEffect(() => {
    const off = window.electronAPI.onPendingAction?.(action => {
      if (action === 'new-target') {
        setNewTargetModal(true)
      }
    })
    return () => { off?.() }
  }, [setNewTargetModal])

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
                className="flex items-center gap-0.5 px-3 flex-shrink-0 h-10"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(7,8,15,0.4)' }}
              >
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className="relative px-3 py-1.5 text-[11px] font-medium rounded-md"
                    style={{
                      color: activeTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'color 150ms ease',
                    }}
                    onMouseEnter={e => {
                      if (activeTab !== t.id) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                    }}
                    onMouseLeave={e => {
                      if (activeTab !== t.id) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                    }}
                  >
                    {activeTab === t.id && (
                      <motion.div
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-md"
                        style={{
                          background: 'rgba(210,153,34,0.10)',
                          border: '1px solid rgba(210,153,34,0.22)',
                          boxShadow: '0 1px 4px rgba(210,153,34,0.08)',
                        }}
                        transition={{ type: 'spring', stiffness: 480, damping: 40 }}
                      />
                    )}
                    <span className="relative z-10">{t.label}</span>
                  </button>
                ))}
                {/* Target IP badge — shown when a target is active */}
                {activeTarget?.ip && (
                  <div className="ml-auto flex items-center">
                    <span
                      className="font-mono text-[10px] px-2 py-0.5 rounded border tabular-nums"
                      style={{
                        color: 'rgba(210,153,34,0.75)',
                        background: 'rgba(210,153,34,0.06)',
                        borderColor: 'rgba(210,153,34,0.18)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {activeTarget.ip}
                    </span>
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
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

      {/* Global Search (Cmd+Shift+F) */}
      <GlobalSearch />

      {/* Command Palette (Cmd+K) */}
      <CommandPalette open={paletteOpen} onClose={closePalette} />

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
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {/* Illustrated icon with layered glow rings */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, rgba(210,153,34,0.08) 0%, transparent 70%)' }} />
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 0 16px rgba(210,153,34,0.35))' }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" style={{ color: '#d29922', opacity: 0.55 }}>
              <path d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.6" />
              <circle cx="12" cy="12" r="1.2" fill="currentColor" />
              <path d="M12 9V7M12 17v-2M7 12H5M19 12h-2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
            </svg>
          </motion.div>
        </div>

        <p className="text-sm font-semibold mb-1.5" style={{ color: '#e6edf3' }}>No target selected</p>
        <p className="text-xs mb-1" style={{ color: '#8b949e' }}>Select a target from the sidebar to begin</p>
        <p className="text-xs" style={{ color: '#484f58' }}>
          Press <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(42,51,71,0.5)', border: '1px solid rgba(42,51,71,0.8)', color: '#8b949e' }}>+</kbd> to add your first target
        </p>
      </motion.div>
    </div>
  )
}
