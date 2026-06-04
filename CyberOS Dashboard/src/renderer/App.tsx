// CyberOS Dashboard — App.tsx
// Root layout with sidebar navigation and multi-screen views
// ItsEliias // v2.0

import { AnimatePresence, motion } from 'framer-motion'
import { useState, useEffect } from 'react'
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

// Design system reference (Phase A sign-off)
import StyleReferenceView from './views/StyleReferenceView'

// ─── Last Updated Chip ───────────────────────────────────────────────────────

function LastUpdatedChip() {
  const [elapsed, setElapsed] = useState(0)
  const [mountTime] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - mountTime) / 1000)), 1000)
    return () => clearInterval(id)
  }, [mountTime])

  const fmt = (s: number) => {
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    return `${Math.floor(s / 3600)}h ago`
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[9px] font-mono px-2 py-0.5 rounded-full"
      style={{
        background: 'rgba(74,158,255,0.07)',
        border: '1px solid rgba(74,158,255,0.18)',
        color: 'var(--text-muted)',
      }}
    >
      <span className="w-1 h-1 rounded-full bg-accent animate-pulse" style={{ background: 'var(--accent)' }} />
      Updated {fmt(elapsed)}
    </span>
  )
}

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

                {/* Last-updated chip */}
                <div className="flex justify-end mb-2">
                  <LastUpdatedChip />
                </div>

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

          {activeView === 'design-system' && (
            <motion.div
              key="design-system"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex-1 flex min-h-0"
            >
              <StyleReferenceView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <StatusBar />
    </div>
  )
}

// ─── Profile View ────────────────────────────────────────────────────────────

function getRank(flags: number): { label: string; color: string } {
  if (flags >= 200) return { label: 'Elite', color: '#f85149' }
  if (flags >= 100) return { label: 'Expert', color: '#3fb950' }
  if (flags >= 50)  return { label: 'Advanced', color: '#4a9eff' }
  if (flags >= 20)  return { label: 'Intermediate', color: '#d29922' }
  return { label: 'Beginner', color: '#8b949e' }
}

function ProfileView() {
  const config = useDashboardStore((s) => s.config)
  const profile = config.operator_profile
  const rank = getRank(profile?.totalFlags ?? 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile header */}
      <div
        className="rounded-2xl px-6 py-5 flex items-center gap-5"
        style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--elevation-2)',
        }}
      >
        {/* Avatar with gradient ring */}
        <div
          className="shrink-0 p-[2px] rounded-full"
          style={{
            background: `conic-gradient(${rank.color}, rgba(74,158,255,0.5), ${rank.color})`,
            boxShadow: `0 0 20px ${rank.color}44`,
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-1)' }}
          >
            <span className="text-lg font-bold" style={{ color: rank.color }}>
              {(profile?.operatorName ?? 'OP').slice(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-text-primary leading-none">
              {profile?.operatorName ?? 'Operator'}
            </h1>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
              style={{
                color: rank.color,
                background: `${rank.color}18`,
                border: `1px solid ${rank.color}35`,
                boxShadow: `0 0 8px ${rank.color}22`,
              }}
            >
              {rank.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full status-dot-pulse"
              style={{ background: 'var(--state-online)', '--pulse-rgb': '63,185,80' } as React.CSSProperties}
            />
            <span className="text-xs text-text-secondary">Active Operator</span>
            {(profile?.currentStreak ?? 0) > 0 && (
              <span className="text-[10px] text-text-muted font-mono">
                · <span className="text-[#d29922]">{profile?.currentStreak}d streak</span>
              </span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 shrink-0">
          {[
            { label: 'Labs', value: profile?.totalLabsCompleted ?? 0, color: 'var(--accent)' },
            { label: 'Flags', value: profile?.totalFlags ?? 0, color: '#3fb950' },
            { label: 'Creds', value: profile?.totalCredentials ?? 0, color: '#f78166' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <div className="text-lg font-bold tabular-nums leading-none" style={{ color, textShadow: `0 0 10px ${color}44` }}>
                {value}
              </div>
              <div className="text-[9px] text-text-muted uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
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
  const config = useDashboardStore((s) => s.config)
  const events = useDashboardStore((s) => s.events)

  // Compute live stats inline (UI-only, display purpose)
  const appKeys = Object.keys(config).filter(
    (k) => k !== 'operator_profile' && k !== 'shared_context' && typeof (config as Record<string, unknown>)[k] === 'object'
  )
  const totalApps = appKeys.length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with stats chips */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Ecosystem Status</h1>
        <div className="flex items-center gap-2">
          {[
            { label: 'Apps', value: totalApps, color: 'var(--accent)' },
            { label: 'Events', value: events.length, color: 'var(--state-online)' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]"
              style={{
                background: `${color === 'var(--accent)' ? 'rgba(74,158,255,0.08)' : 'rgba(63,185,80,0.08)'}`,
                border: `1px solid ${color === 'var(--accent)' ? 'rgba(74,158,255,0.2)' : 'rgba(63,185,80,0.2)'}`,
              }}
            >
              <span className="font-bold font-mono tabular-nums" style={{ color }}>{value}</span>
              <span className="text-text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ConfigInspector />
        <SharedContextInspector />
      </div>

      <AppStatusTable />
      <EventLog />
    </div>
  )
}
