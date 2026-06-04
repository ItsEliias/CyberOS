// CyberOS Dashboard — App.tsx
// Root layout with sidebar navigation and multi-screen views
// ItsEliias // v2.0

import { AnimatePresence, motion } from 'framer-motion'
import { useDashboardStore } from './stores/useDashboardStore'
import { useConfigWatcher } from './hooks/useConfigWatcher'
import { useEventFeed } from './hooks/useEventFeed'
import { useLiveStats } from './hooks/useLiveStats'

// Layout
import TitleBar from './components/layout/TitleBar'
import Sidebar from './components/layout/Sidebar'
import StatusBar from './components/layout/StatusBar'

// Dashboard screen
import ActiveSessionBanner from './components/dashboard/ActiveSessionBanner'
import OperatorProfileCard from './components/dashboard/OperatorProfileCard'
import EcosystemHealthBar from './components/dashboard/EcosystemHealthBar'
import AppStatusGrid from './components/dashboard/AppStatusGrid'
import ActivityFeed from './components/dashboard/ActivityFeed'

// Profile screen
import StatsRow from './components/profile/StatsRow'
import StreakCalendar from './components/profile/StreakCalendar'
import SkillRadarLarge from './components/profile/SkillRadarLarge'
import LabHistoryTable from './components/profile/LabHistoryTable'

// Ecosystem screen
import ConfigInspector from './components/ecosystem/ConfigInspector'
import AppStatusTable from './components/ecosystem/AppStatusTable'
import EventLog from './components/ecosystem/EventLog'
import SharedContextInspector from './components/ecosystem/SharedContextInspector'

// Settings screen
import SettingsView from './views/SettingsView'

// Apps screen
import AppTabsView from './views/AppTabsView'

// ─── Transition variants ─────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const activeView = useDashboardStore((s) => s.activeView)
  const isLoading = useDashboardStore((s) => s.isLoading)
  const error = useDashboardStore((s) => s.error)

  // Initialize data watchers
  useConfigWatcher()
  useEventFeed()
  useLiveStats()

  // Error state
  if (error && !isLoading) {
    return (
      <div className="flex flex-col h-full bg-bg-base text-text-primary">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-bg-elevated border border-danger/30 rounded-lg p-6 max-w-md text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger mx-auto mb-3">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <h2 className="text-lg font-bold text-text-primary mb-2">Configuration Error</h2>
            <p className="text-sm text-text-secondary mb-4">{error}</p>
            <p className="text-xs text-text-muted">
              Ensure <code className="font-mono bg-bg-interactive px-1 rounded">~/cybertools-config.json</code> exists and contains valid JSON.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-bg-base text-text-primary">
      <TitleBar />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        {/* Main content area */}
        <AnimatePresence mode="wait">
          {activeView === 'dashboard' && (
            <motion.div
              key="dashboard"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex flex-1 min-h-0"
            >
              {/* Center pane */}
              <div className="flex-1 p-4 overflow-y-auto">
                <ActiveSessionBanner />

                <div className="grid grid-cols-[1fr_2fr] gap-4 mb-4">
                  <OperatorProfileCard />
                  <div className="space-y-3">
                    <EcosystemHealthBar />
                    <AppStatusGrid />
                  </div>
                </div>
              </div>

              {/* Activity feed (right) */}
              <ActivityFeed />
            </motion.div>
          )}

          {activeView === 'profile' && (
            <motion.div
              key="profile"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex-1 p-6 overflow-y-auto"
            >
              <ProfileView />
            </motion.div>
          )}

          {activeView === 'ecosystem' && (
            <motion.div
              key="ecosystem"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex-1 p-6 overflow-y-auto"
            >
              <EcosystemView />
            </motion.div>
          )}

          {activeView === 'settings' && (
            <motion.div
              key="settings"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex-1 p-6 overflow-y-auto"
            >
              <SettingsView />
            </motion.div>
          )}

          {activeView === 'apps' && (
            <motion.div
              key="apps"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex-1 overflow-y-auto"
            >
              <AppTabsView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <StatusBar />
    </div>
  )
}

// ─── Profile View ────────────────────────────────────────────────────────────

function ProfileView() {
  const config = useDashboardStore((s) => s.config)
  const profile = config.operator_profile

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center">
          <span className="text-lg font-bold text-accent">
            {(profile?.operatorName ?? 'OP').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{profile?.operatorName ?? 'Operator'}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-success animate-[statusPulse_2s_ease-out_infinite]" />
            <span className="text-xs text-text-secondary">Active</span>
          </div>
        </div>
      </div>

      <StatsRow />
      <StreakCalendar />

      <div className="grid grid-cols-2 gap-6">
        <SkillRadarLarge />
        <LabHistoryTable />
      </div>
    </div>
  )
}

// ─── Ecosystem View ──────────────────────────────────────────────────────────

function EcosystemView() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Ecosystem Status</h1>

      <div className="grid grid-cols-2 gap-6">
        <ConfigInspector />
        <SharedContextInspector />
      </div>

      <AppStatusTable />
      <EventLog />
    </div>
  )
}
