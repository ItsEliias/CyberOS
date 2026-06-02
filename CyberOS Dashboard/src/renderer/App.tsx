import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore, type Alert } from './store'
import Header from './components/Header'
import Footer from './components/Footer'
import AppCard from './components/AppCard'
import ActivityFeed from './components/ActivityFeed'
import AlertsPanel from './components/AlertsPanel'
import OperatorProfile from './components/OperatorProfile'
import Sidebar from './components/Sidebar'
import MetricGauge from './components/MetricGauge'
import EcosystemChart from './components/EcosystemChart'
import type { EcosystemConfig, EcosystemEvent } from '../shared/types'

// ─── App card builder ─────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)    return 'just now'
  if (diff < 3600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

function buildCards(cfg: EcosystemConfig) {
  const cl  = cfg.cyberlab_status
  const vs  = cfg.vaultscraper_status
  const gv  = cfg.ghostvault_status
  const rd  = cfg.recondesk_status
  const sb  = cfg.signalboard_status
  const ag  = cfg.agenticos_status

  return [
    {
      id:          'ghostvault',
      name:        'GhostVault',
      subtitle:    'Note capture & vault workspace',
      accentColor: '#7bb8ff',
      active:      gv?.active ?? false,
      lastActive:  gv?.lastActive,
      execPath:    cfg.ghostvault?.execPath,
      metrics: [
        { label: 'Notes',        value: gv?.noteCount    ?? '—' },
        { label: 'Last capture', value: gv?.lastCapture ? timeAgo(gv.lastCapture) : '—' },
      ],
    },
    {
      id:          'vaultcore',
      name:        'VaultCore',
      subtitle:    'Vault scraping & orchestration',
      accentColor: '#3fb950',
      active:      vs?.active ?? false,
      lastActive:  vs?.lastActive,
      execPath:    cfg.vaultscraper?.execPath,
      metrics: [
        { label: 'Vault notes',   value: vs?.vaultNoteCount ?? '—' },
        { label: 'Sources',       value: vs?.totalSources   ?? '—' },
        { label: 'Active scrape', value: vs?.activeScrape   ?? 'idle' },
        { label: 'Last scrape',   value: vs?.lastScrape ? timeAgo(vs.lastScrape) : '—' },
      ],
    },
    {
      id:          'cyberlab',
      name:        'CyberLab',
      subtitle:    'AI-assisted lab companion',
      accentColor: '#b44fff',
      active:      cl?.active ?? false,
      lastActive:  cl?.lastActive,
      execPath:    cfg.cyberlab?.execPath,
      metrics: [
        { label: 'Current lab', value: cl?.currentLab    ?? '—', highlight: true },
        { label: 'Labs done',   value: cl?.labsDone      ?? '—' },
        { label: 'Streak',      value: cl?.streak != null ? `${cl.streak} days` : '—' },
        { label: 'Findings',    value: cl?.findingsCount ?? '—' },
      ],
    },
    {
      id:          'recondesk',
      name:        'ReconDesk',
      subtitle:    'Target & attack surface tracking',
      accentColor: '#d29922',
      active:      rd?.active ?? false,
      lastActive:  rd?.lastActive,
      execPath:    cfg.recondesk?.execPath,
      metrics: [
        { label: 'Active target', value: rd?.activeTarget ?? '—', highlight: true },
        { label: 'Targets',       value: rd?.targetCount  ?? '—' },
        { label: 'Attack cards',  value: rd?.cardCount    ?? '—' },
      ],
    },
    {
      id:          'signalboard',
      name:        'SignalBoard',
      subtitle:    'Signal monitoring & feed reader',
      accentColor: '#ff6b6b',
      active:      sb?.active ?? false,
      lastActive:  sb?.lastActive,
      execPath:    cfg.signalboard?.execPath,
      metrics: [
        { label: 'Unread items',  value: sb?.unreadCount  ?? '—' },
        { label: 'Last refresh',  value: sb?.lastRefresh ? timeAgo(sb.lastRefresh) : '—' },
        { label: 'Top item',      value: sb?.topItem      ?? '—' },
      ],
    },
    {
      id:          'agenticos',
      name:        'AgenticOS',
      subtitle:    'Autonomous agent orchestration',
      accentColor: '#ff9500',
      active:      ag?.active ?? false,
      lastActive:  ag?.lastActive,
      execPath:    cfg.agenticos?.execPath,
      metrics: [
        { label: 'Active agents',   value: ag?.activeAgentCount    ?? '—' },
        { label: 'Running tasks',   value: ag?.runningTaskCount    ?? '—' },
        { label: 'Completed',       value: ag?.completedTaskCount  ?? '—' },
      ],
    },
  ]
}

// ─── Alert builder ────────────────────────────────────────────────────────────

const OFFLINE_GRACE  = 5 * 60_000   // 5 min
const STALE_GRACE    = 30 * 60_000  // 30 min

function buildAlerts(cards: ReturnType<typeof buildCards>, events: EcosystemEvent[]): Alert[] {
  const now     = Date.now()
  const alerts: Alert[] = []

  for (const card of cards) {
    if (!card.lastActive) continue
    const age = now - new Date(card.lastActive).getTime()
    if (!card.active && age > OFFLINE_GRACE) {
      alerts.push({
        id:        `offline-${card.id}`,
        type:      'offline',
        message:   `${card.name} has been offline for ${Math.floor(age / 60_000)}m`,
        timestamp: new Date().toISOString(),
      })
    }
  }

  const latestEvent = events[0]
  if (latestEvent) {
    const staleAge = now - new Date(latestEvent.timestamp).getTime()
    if (staleAge > STALE_GRACE) {
      alerts.push({
        id:        'stale-feed',
        type:      'stale',
        message:   `No ecosystem events for ${Math.floor(staleAge / 60_000)}m`,
        timestamp: new Date().toISOString(),
      })
    }
  }

  return alerts
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const setConfig      = useStore(s => s.setConfig)
  const setEvents      = useStore(s => s.setEvents)
  const setVersion     = useStore(s => s.setVersion)
  const setEventHistory = useStore(s => s.setEventHistory)
  const setAlerts      = useStore(s => s.setAlerts)
  const config         = useStore(s => s.config)
  const events         = useStore(s => s.events)
  const eventHistory   = useStore(s => s.eventHistory)
  const alerts         = useStore(s => s.alerts)
  const dismissedIds   = useStore(s => s.dismissedAlertIds)

  const [showAlerts, setShowAlerts] = useState(false)

  // Load event history and refresh every 30s
  const refreshHistory = useCallback(async () => {
    const h = await window.electronAPI.getEventHistory()
    setEventHistory(h)
  }, [setEventHistory])

  useEffect(() => {
    window.electronAPI.getState().then(setConfig)
    window.electronAPI.getEvents().then(setEvents)
    window.electronAPI.getVersion().then(setVersion)
    refreshHistory()

    const unsubState  = window.electronAPI.onStateUpdate(setConfig)
    const unsubEvents = window.electronAPI.onEventsUpdate(setEvents)
    const histInterval = setInterval(refreshHistory, 30_000)

    return () => {
      unsubState()
      unsubEvents()
      clearInterval(histInterval)
    }
  }, [setConfig, setEvents, setVersion, refreshHistory])

  // Recompute alerts whenever config / events change
  useEffect(() => {
    const cards = buildCards(config)
    setAlerts(buildAlerts(cards, events))
  }, [config, events, setAlerts])

  const cards = buildCards(config)
  const visibleAlertCount = alerts.filter(a => !dismissedIds.has(a.id)).length

  return (
    <div className="flex flex-col h-full bg-bg text-text relative">
      <Header
        alertCount={visibleAlertCount}
        onBellClick={() => setShowAlerts(v => !v)}
      />

      <AnimatePresence>
        {showAlerts && <AlertsPanel onClose={() => setShowAlerts(false)} />}
      </AnimatePresence>

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <div className="flex flex-1 min-h-0 min-w-0">
          {/* Main content */}
          <div className="flex-1 p-5 overflow-y-auto">

            {/* ── Ecosystem status gauges ── */}
            <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-3">
              Ecosystem Status
            </p>
            <div className="flex gap-2 mb-5">
              {cards.map(card => (
                <MetricGauge
                  key={card.id}
                  label={card.name}
                  value={card.active ? 100 : 0}
                  active={card.active}
                  color={card.accentColor}
                  sublabel={card.metrics[0]?.value?.toString()}
                />
              ))}
            </div>

            {/* ── App cards grid ── */}
            <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-4">
              Applications
            </p>
            <div className="grid grid-cols-3 gap-4">
              {cards.map(card => (
                <AppCard
                  key={card.id}
                  id={card.id}
                  name={card.name}
                  subtitle={card.subtitle}
                  active={card.active}
                  lastActive={card.lastActive}
                  metrics={card.metrics}
                  execPath={card.execPath}
                  accentColor={card.accentColor}
                  eventHistory={eventHistory}
                />
              ))}
            </div>

            {/* ── Activity chart ── */}
            <div className="mt-5">
              <EcosystemChart />
            </div>

            {/* ── Operator profile ── */}
            <OperatorProfile />
          </div>

          <ActivityFeed />
        </div>
      </div>

      <Footer />
    </div>
  )
}
