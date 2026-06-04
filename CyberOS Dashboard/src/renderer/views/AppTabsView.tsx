// CyberOS Dashboard — App Tabs View
// Tab navigation with one page per CyberOS app
// ItsEliias // v2.0

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AppTabPage, { type AppTabDef } from '../components/apps/AppTabPage'
import type { EcosystemConfig } from '../types/ecosystem'

// ─── App Definitions ─────────────────────────────────────────────────────────

const APP_TABS: AppTabDef[] = [
  {
    key: 'credvault',
    name: 'CredVault',
    subtitle: 'Credential management & vault security',
    accentColor: '#f78166',
    getMetrics: (cfg: EcosystemConfig) => {
      const s = cfg.credvault_status
      return [
        { label: 'Credentials Stored', value: s?.credentialCount ?? '—' },
        { label: 'Vault Status', value: s ? (s.locked ? 'Locked' : 'Unlocked') : '—' },
        { label: 'Last Unlock', value: s?.lastActive ? formatRelative(s.lastActive) : '—' },
      ]
    },
    getConnectionStatus: (cfg: EcosystemConfig) => cfg.credvault_status?.active ?? false,
  },
  {
    key: 'ghostvault',
    name: 'GhostVault',
    subtitle: 'Note capture & Obsidian vault workspace',
    accentColor: '#7bb8ff',
    getMetrics: (cfg: EcosystemConfig) => {
      const s = cfg.ghostvault_status
      return [
        { label: 'Notes in Vault', value: s?.noteCount ?? '—' },
        { label: 'Vault Path Set', value: cfg.obsidianVaultPath ? 'Yes' : 'No' },
        { label: 'Last Capture', value: s?.lastCapture ? formatRelative(s.lastCapture) : '—' },
      ]
    },
    getConnectionStatus: (cfg: EcosystemConfig) => cfg.ghostvault_status?.active ?? false,
  },
  {
    key: 'networkmap',
    name: 'NetworkMap',
    subtitle: 'Network topology visualization & scanning',
    accentColor: '#d29922',
    getMetrics: (cfg: EcosystemConfig) => {
      const s = cfg.networkmap_status
      return [
        { label: 'Nodes', value: (s as any)?.nodeCount ?? '—' },
        { label: 'Edges', value: (s as any)?.edgeCount ?? '—' },
        { label: 'Last Scan', value: (s as any)?.updatedAt ? formatRelative((s as any).updatedAt) : '—' },
      ]
    },
    getConnectionStatus: (cfg: EcosystemConfig) => {
      const s = cfg.networkmap_status as any
      return s?.running ?? s?.active ?? false
    },
  },
  {
    key: 'playbookstudio',
    name: 'PlaybookStudio',
    subtitle: 'Attack methodology playbook management',
    accentColor: '#4a9eff',
    getMetrics: (cfg: EcosystemConfig) => {
      const s = cfg.playbookstudio_status
      return [
        { label: 'Active Playbook', value: s?.activePlaybook ?? '—' },
        { label: 'Progress', value: (s as any)?.activePlaybookProgress ?? '—' },
        { label: 'Last Active', value: s?.lastActive ? formatRelative(s.lastActive) : '—' },
      ]
    },
    getConnectionStatus: (cfg: EcosystemConfig) => cfg.playbookstudio_status?.active ?? false,
  },
  {
    key: 'recondesk',
    name: 'ReconDesk',
    subtitle: 'Target & attack surface reconnaissance',
    accentColor: '#d29922',
    getMetrics: (cfg: EcosystemConfig) => {
      const s = cfg.recondesk_status
      return [
        { label: 'Target Count', value: s?.targetCount ?? '—' },
        { label: 'Active Target', value: s?.activeTarget ?? '—' },
        { label: 'Cards', value: s?.cardCount ?? '—' },
      ]
    },
    getConnectionStatus: (cfg: EcosystemConfig) => cfg.recondesk_status?.active ?? false,
  },
  {
    key: 'reportforge',
    name: 'ReportForge',
    subtitle: 'Penetration test report generation',
    accentColor: '#3fb950',
    getMetrics: (cfg: EcosystemConfig) => {
      const s = cfg.reportforge_status
      return [
        { label: 'Reports', value: s?.reportCount ?? '—' },
        { label: 'Last Export', value: s?.lastActive ? formatRelative(s.lastActive) : '—' },
        { label: 'Status', value: s?.active ? 'Active' : 'Idle' },
      ]
    },
    getConnectionStatus: (cfg: EcosystemConfig) => cfg.reportforge_status?.active ?? false,
  },
  {
    key: 'signalboard',
    name: 'SignalBoard',
    subtitle: 'Signal monitoring & security feed reader',
    accentColor: '#ff6b6b',
    getMetrics: (cfg: EcosystemConfig) => {
      const s = cfg.signalboard_status
      return [
        { label: 'Unread Items', value: s?.unreadCount ?? '—' },
        { label: 'Last Refresh', value: s?.lastRefresh ? formatRelative(s.lastRefresh) : '—' },
        { label: 'Top Item', value: s?.topItem ? truncate(s.topItem, 40) : '—' },
      ]
    },
    getConnectionStatus: (cfg: EcosystemConfig) => cfg.signalboard_status?.active ?? false,
  },
  {
    key: 'terminallink',
    name: 'TerminalLink',
    subtitle: 'Terminal integration & command history',
    accentColor: '#00ff41',
    getMetrics: (cfg: EcosystemConfig) => {
      const s = cfg.terminallink_status
      return [
        { label: 'Commands Logged', value: s?.commandCount ?? '—' },
        { label: 'Linked Session', value: s?.linkedSession ?? '—' },
        { label: 'Status', value: s?.active ? 'Active' : 'Inactive' },
      ]
    },
    getConnectionStatus: (cfg: EcosystemConfig) => cfg.terminallink_status?.active ?? false,
  },
  {
    key: 'vaultcore',
    name: 'VaultCore',
    subtitle: 'Vault scraping & knowledge orchestration',
    accentColor: '#3fb950',
    getMetrics: (cfg: EcosystemConfig) => {
      const s = cfg.vaultscraper_status
      return [
        { label: 'Vault Notes', value: s?.vaultNoteCount ?? '—' },
        { label: 'Sources', value: s?.totalSources ?? '—' },
        { label: 'Last Scrape', value: s?.lastScrape ? formatRelative(s.lastScrape) : '—' },
      ]
    },
    getConnectionStatus: (cfg: EcosystemConfig) => cfg.vaultscraper_status?.active ?? false,
  },
  {
    key: 'cyberlab',
    name: 'Cyberlab Companion',
    subtitle: 'AI-assisted lab companion & session tracker',
    accentColor: '#b44fff',
    getMetrics: (cfg: EcosystemConfig) => {
      const s = cfg.cyberlab_status
      return [
        { label: 'Session', value: s?.currentLab ?? '—' },
        { label: 'Findings', value: s?.findingsCount ?? '—' },
        { label: 'Labs Done', value: cfg.operator_profile?.totalLabsCompleted ?? '—' },
      ]
    },
    getConnectionStatus: (cfg: EcosystemConfig) => cfg.cyberlab_status?.active ?? false,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ─── Page variants ────────────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
}

// ─── AppTabsView ──────────────────────────────────────────────────────────────

export default function AppTabsView() {
  const [activeTab, setActiveTab] = useState(APP_TABS[0].key)
  const currentDef = APP_TABS.find((t) => t.key === activeTab) ?? APP_TABS[0]

  return (
    <div className="flex flex-col h-full">
      {/* Tab strip */}
      <div
        className="flex items-end gap-0 px-6 pt-5 border-b border-border-subtle/50 shrink-0 overflow-x-auto"
        style={{ background: 'rgba(18, 19, 26, 0.5)' }}
      >
        {APP_TABS.map((tab) => {
          const isActive = tab.key === activeTab
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                isActive
                  ? 'text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="app-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                  style={{ background: tab.accentColor }}
                  transition={{ type: 'tween', duration: 0.15 }}
                />
              )}
              <span
                className="flex items-center gap-1.5"
                style={isActive ? { color: tab.accentColor } : undefined}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: tab.accentColor, opacity: isActive ? 1 : 0.4 }}
                />
                {tab.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.12, ease: 'easeOut' }}
            >
              <AppTabPage def={currentDef} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
