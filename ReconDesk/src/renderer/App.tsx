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
import SSOLockScreen from './components/SSOLockScreen'
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
  const loadTargets          = useRecondeskStore(s => s.loadTargets)
  const mergeExternalTargets = useRecondeskStore(s => s.mergeExternalTargets)
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
  const [ssoUnlocked, setSsoUnlocked] = useState<boolean | null>(null)
  const [requireSSO,  setRequireSSO]  = useState(false)

  useEffect(() => {
    try { setRequireSSO(localStorage.getItem('rd:requireCredVaultSession') === '1') } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const r = await window.electronAPI.getSSO()
        if (!cancelled) setSsoUnlocked(!!r.unlocked)
      } catch { if (!cancelled) setSsoUnlocked(true) }
    }
    void check()
    const t = setInterval(check, 5000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // ⌘K → command palette, ⌘N → new target modal
  // Both disabled while the SSO soft-lock is active so the requirement toggle
  // can't be flipped from the locked screen and modal flows can't bypass it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (requireSSO && ssoUnlocked === false) return
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey) return
      if (e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      } else if (e.key === 'n') {
        // ⌘N → open the New Target modal. Same affordance as the tray-menu
        // pending action 'new-target' so muscle memory translates cleanly.
        e.preventDefault()
        setNewTargetModal(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requireSSO, ssoUnlocked, setNewTargetModal])

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
    // Refetch when SignalBoard / NetworkMap push targets into our data.json
    // from outside this process. The watcher in main suppresses our own
    // writes, so this only fires on real external changes. We merge (rather
    // than wholesale-replace) so an external push can't clobber an in-progress
    // user edit on a target the renderer already has in memory.
    const unwatch = window.electronAPI.onDataUpdated?.(() => { void mergeExternalTargets() })
    return () => { unwatch?.() }
  }, [loadTargets, mergeExternalTargets])

  const ssoBlocked = requireSSO && ssoUnlocked === false

  return (
    <div className="flex flex-col h-full bg-surface-0 text-text-primary relative">
      {ssoBlocked && (
        <SSOLockScreen onCheck={async () => {
          const r = await window.electronAPI.getSSO()
          setSsoUnlocked(!!r.unlocked)
        }} />
      )}
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

      {/* Command Palette (Cmd+K) — closed while soft-locked. */}
      <CommandPalette open={paletteOpen && !ssoBlocked} onClose={closePalette} />

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
        className="empty-state content-stream-in"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="empty-glyph">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4.5" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <line x1="12" y1="1" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="1" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="23" y2="12" />
          </svg>
        </div>
        <p className="empty-title">No target selected</p>
        <p className="empty-sub">
          Select a target from the sidebar to begin, or press{' '}
          <kbd className="px-1 py-0.5 rounded font-mono"
            style={{ fontSize: 'var(--type-caption, 10px)', background: 'rgba(42,51,71,0.5)', border: '1px solid rgba(42,51,71,0.8)', color: 'var(--text-secondary, #8b949e)' }}>
            +
          </kbd>
          {' '}to add your first target
        </p>
      </motion.div>
    </div>
  )
}
