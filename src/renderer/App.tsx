import { useEffect } from 'react'
import { useStore } from './store'
import Header from './components/Header'
import Footer from './components/Footer'
import AppCard from './components/AppCard'
import ActivityFeed from './components/ActivityFeed'
import type { EcosystemConfig } from '../shared/types'

function buildCards(cfg: EcosystemConfig) {
  const cl  = cfg.cyberlab_status
  const vs  = cfg.vaultscraper_status
  const gv  = cfg.ghostvault_status
  const rd  = cfg.recondesk_status

  return [
    {
      id:          'ghostvault',
      name:        'GhostVault',
      subtitle:    'Note capture & vault workspace',
      accentColor: '#7bb8ff',
      active:      gv?.active ?? false,
      lastActive:  gv?.lastActive,
      execPath:    undefined as string | undefined,
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
        { label: 'Vault notes',    value: vs?.vaultNoteCount ?? '—' },
        { label: 'Sources',        value: vs?.totalSources   ?? '—' },
        { label: 'Active scrape',  value: vs?.activeScrape   ?? 'idle' },
        { label: 'Last scrape',    value: vs?.lastScrape ? timeAgo(vs.lastScrape) : '—' },
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
      execPath:    undefined as string | undefined,
      metrics: [
        { label: 'Active target', value: rd?.activeTarget ?? '—', highlight: true },
        { label: 'Targets',       value: rd?.targetCount  ?? '—' },
        { label: 'Attack cards',  value: rd?.cardCount    ?? '—' },
      ],
    },
  ]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)    return 'just now'
  if (diff < 3600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

export default function App() {
  const setConfig  = useStore(s => s.setConfig)
  const setEvents  = useStore(s => s.setEvents)
  const setVersion = useStore(s => s.setVersion)
  const config     = useStore(s => s.config)

  useEffect(() => {
    // Initial load
    window.electronAPI.getState().then(setConfig)
    window.electronAPI.getEvents().then(setEvents)
    window.electronAPI.getVersion().then(setVersion)

    // Subscribe to live pushes from main process
    const unsubState  = window.electronAPI.onStateUpdate(setConfig)
    const unsubEvents = window.electronAPI.onEventsUpdate(setEvents)
    return () => { unsubState(); unsubEvents() }
  }, [setConfig, setEvents, setVersion])

  const cards = buildCards(config)

  return (
    <div className="flex flex-col h-full bg-bg text-text">
      <Header />

      <div className="flex flex-1 min-h-0">
        {/* App cards grid */}
        <div className="flex-1 p-5 overflow-y-auto">
          {/* Section label */}
          <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-4">
            Ecosystem Applications
          </p>

          <div className="grid grid-cols-2 gap-4">
            {cards.map(card => (
              <AppCard
                key={card.id}
                name={card.name}
                subtitle={card.subtitle}
                active={card.active}
                lastActive={card.lastActive}
                metrics={card.metrics}
                execPath={card.execPath}
                accentColor={card.accentColor}
              />
            ))}
          </div>

          {/* Ecosystem health bar */}
          <div className="mt-6 bg-panel border border-border rounded-lg p-4">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-3">
              Ecosystem Health
            </p>
            <div className="flex gap-3">
              {cards.map(card => (
                <div key={card.id} className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted">{card.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${card.active ? 'bg-success' : 'bg-border'}`} />
                  </div>
                  <div className="h-0.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: card.active ? '100%' : '0%', background: card.accentColor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <ActivityFeed />
      </div>

      <Footer />
    </div>
  )
}
