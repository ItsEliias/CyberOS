// CyberOS Dashboard — Config Parser Utility
// Builds the 12 app cards from ecosystem config

import type { EcosystemConfig, AppCardData } from '../types/ecosystem'
import { timeAgo } from './timeAgo'

export function buildAppCards(cfg: EcosystemConfig): AppCardData[] {
  const cl = cfg.cyberlab_status
  const rd = cfg.recondesk_status
  const gv = cfg.ghostvault_status
  const vc = cfg.vaultscraper_status
  const sb = cfg.signalboard_status
  const cv = cfg.credvault_status
  const ps = cfg.playbookstudio_status
  const rf = cfg.reportforge_status
  const tl = cfg.terminallink_status
  const nm = cfg.networkmap_status
  const co = cfg.cyberos_status
  const ag = cfg.agenticos_status

  return [
    {
      id: 'cyberos',
      name: 'Launcher',
      subtitle: 'Ecosystem launcher & tray',
      accentColor: '#b44fff',
      active: co?.active ?? false,
      lastActive: co?.lastActive,
      execPath: cfg.cyberos?.execPath,
      metrics: [
        { label: 'Status', value: co?.active ? 'Running' : 'Inactive' },
      ],
    },
    {
      id: 'dashboard',
      name: 'Dashboard',
      subtitle: 'Unified status monitor',
      accentColor: '#4a9eff',
      active: true,
      lastActive: new Date().toISOString(),
      metrics: [
        { label: 'Status', value: 'Running' },
      ],
    },
    {
      id: 'cyberlab',
      name: 'CyberLab',
      subtitle: 'AI-assisted lab companion',
      accentColor: '#b44fff',
      active: cl?.active ?? false,
      lastActive: cl?.lastActive,
      execPath: cfg.cyberlab?.execPath,
      metrics: [
        { label: 'Session', value: cl?.currentLab ?? 'No active session', highlight: true },
        { label: 'Findings', value: cl?.findingsCount ?? 0 },
      ],
    },
    {
      id: 'recondesk',
      name: 'ReconDesk',
      subtitle: 'Target & attack surface tracking',
      accentColor: '#d29922',
      active: rd?.active ?? false,
      lastActive: rd?.lastActive,
      execPath: cfg.recondesk?.execPath,
      metrics: [
        { label: 'Targets', value: rd?.targetCount ?? 0 },
        { label: 'Cards', value: rd?.cardCount ?? 0 },
      ],
    },
    {
      id: 'ghostvault',
      name: 'GhostVault',
      subtitle: 'Note capture & vault workspace',
      accentColor: '#7bb8ff',
      active: gv?.active ?? false,
      lastActive: gv?.lastActive,
      execPath: cfg.ghostvault?.execPath,
      metrics: [
        { label: 'Notes', value: gv?.noteCount ?? 0 },
      ],
    },
    {
      id: 'vaultcore',
      name: 'VaultCore',
      subtitle: 'Vault scraping & orchestration',
      accentColor: '#3fb950',
      active: vc?.active ?? false,
      lastActive: vc?.lastActive,
      execPath: cfg.vaultscraper?.execPath,
      metrics: [
        { label: 'Vault notes', value: vc?.vaultNoteCount ?? 0 },
        { label: 'Sources', value: vc?.totalSources ?? 0 },
      ],
    },
    {
      id: 'signalboard',
      name: 'SignalBoard',
      subtitle: 'Signal monitoring & feed reader',
      accentColor: '#ff6b6b',
      active: sb?.active ?? false,
      lastActive: sb?.lastActive,
      execPath: cfg.signalboard?.execPath,
      metrics: [
        { label: 'Unread', value: sb?.unreadCount ?? 0 },
      ],
    },
    {
      id: 'credvault',
      name: 'CredVault',
      subtitle: 'Credential management',
      accentColor: '#f78166',
      active: cv?.active ?? false,
      lastActive: cv?.lastActive,
      execPath: cfg.credvault?.execPath,
      metrics: [
        { label: 'Credentials', value: cv?.credentialCount ?? 0 },
        { label: 'Lock', value: cv?.locked ? 'Locked' : 'Unlocked' },
      ],
    },
    {
      id: 'playbookstudio',
      name: 'PlaybookStudio',
      subtitle: 'Attack methodology playbooks',
      accentColor: '#4a9eff',
      active: ps?.active ?? false,
      lastActive: ps?.lastActive,
      execPath: cfg.playbookstudio?.execPath,
      metrics: [
        { label: 'Active', value: ps?.activePlaybook ?? 'Idle' },
      ],
    },
    {
      id: 'reportforge',
      name: 'ReportForge',
      subtitle: 'Report generation & export',
      accentColor: '#3fb950',
      active: rf?.active ?? false,
      lastActive: rf?.lastActive,
      execPath: cfg.reportforge?.execPath,
      metrics: [
        { label: 'Reports', value: rf?.reportCount ?? 0 },
      ],
    },
    {
      id: 'terminallink',
      name: 'TerminalLink',
      subtitle: 'Terminal integration & history',
      accentColor: '#00ff41',
      active: tl?.active ?? false,
      lastActive: tl?.lastActive,
      execPath: cfg.terminallink?.execPath,
      metrics: [
        { label: 'Commands', value: tl?.commandCount ?? 0 },
      ],
    },
    {
      id: 'networkmap',
      name: 'NetworkMap',
      subtitle: 'Network topology visualization',
      accentColor: '#d29922',
      active: nm?.active ?? false,
      lastActive: nm?.lastActive,
      execPath: cfg.networkmap?.execPath,
      metrics: [
        { label: 'Graph', value: nm?.currentGraph ?? 'No active graph' },
        { label: 'Nodes', value: nm?.nodeCount ?? 0 },
      ],
    },
  ]
}
