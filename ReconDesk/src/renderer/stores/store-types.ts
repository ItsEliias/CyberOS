// ReconDesk — Zustand store type definitions
import type {
  Target, Port, Credential, AttackCard, AttackStage, CardStatus,
  TimelineEntryType, Engagement, ChecklistItem, Screenshot, Subtask,
} from '../types/recondesk'
import type { SearchResult } from './store-utils'
export type { SearchResult }

export type ActiveTab = 'overview' | 'ports' | 'credentials' | 'board' | 'timeline' | 'export' | 'calendar'

export interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'error'
}

export interface AppNotification {
  id: string
  title: string
  body: string
  targetId?: string
  readAt?: string
  createdAt: string
}

export interface RecondeskState {
  targets: Target[]
  activeTargetId: string | null
  activeTab: ActiveTab
  engagements: Engagement[]
  activeEngagementId: string | null
  searchQuery: string
  searchResults: SearchResult[]
  toasts: Toast[]
  notifications: AppNotification[]
  ecosystemContext: { activeLab: string | null; activePlaybook: string | null }
  isNewTargetModalOpen: boolean
  isImportXmlModalOpen: boolean
  isAddPortModalOpen: boolean
  isAddCredentialModalOpen: boolean
  isAddCardModalOpen: boolean
  expandedCardId: string | null
  isSettingsOpen: boolean
  isCsvImportOpen: boolean
  settings: {
    defaultPlatform: Target['platform']
    autoWriteSharedContext: boolean
    autoTimeline: boolean
    showLabContextInHeader: boolean
    anthropicApiKey: string
    globalWordlists: string[]
  }

  loadTargets: () => Promise<void>
  saveTargets: () => Promise<void>
  addTarget: (t: Omit<Target, 'id' | 'createdAt' | 'ports' | 'credentials' | 'attackCards' | 'timeline' | 'checklist' | 'screenshots' | 'linkedCredentialIds' | 'wordlists'>) => void
  setActiveTarget: (id: string) => void
  updateTarget: (id: string, patch: Partial<Target>) => void
  deleteTarget: (id: string) => void

  addPort: (targetId: string, port: Omit<Port, 'id' | 'addedAt'>) => void
  importPortsFromNmap: (targetId: string, xml: string) => { imported: number; skipped: number; errors: string[] }
  updatePort: (targetId: string, portId: string, patch: Partial<Port>) => void
  deletePort: (targetId: string, portId: string) => void

  addCredential: (targetId: string, cred: Omit<Credential, 'id' | 'addedAt'>) => void
  updateCredential: (targetId: string, credId: string, patch: Partial<Credential>) => void
  deleteCredential: (targetId: string, credId: string) => void

  addAttackCard: (targetId: string, card: Omit<AttackCard, 'id' | 'createdAt'>) => void
  updateAttackCard: (targetId: string, cardId: string, patch: Partial<AttackCard>) => void
  deleteAttackCard: (targetId: string, cardId: string) => void
  moveAttackCard: (targetId: string, cardId: string, newStage: AttackStage, newStatus: CardStatus) => void

  addChecklistItem: (targetId: string, text: string, assignee?: string) => void
  toggleChecklistItem: (targetId: string, itemId: string) => void
  deleteChecklistItem: (targetId: string, itemId: string) => void
  updateChecklistItem: (targetId: string, itemId: string, patch: Partial<ChecklistItem>) => void

  addScreenshot: (targetId: string, screenshot: Omit<Screenshot, 'id'>) => void
  deleteScreenshot: (targetId: string, screenshotId: string) => void

  addEngagement: (name: string) => Engagement
  updateEngagement: (id: string, patch: Partial<Engagement>) => void
  deleteEngagement: (id: string) => void
  setActiveEngagement: (id: string | null) => void

  addTimelineEntry: (targetId: string, type: TimelineEntryType, description: string) => void

  addWordlist: (targetId: string, path: string) => void
  removeWordlist: (targetId: string, path: string) => void

  addSubtask: (targetId: string, cardId: string, title: string) => void
  toggleSubtask: (targetId: string, cardId: string, subtaskId: string) => void
  deleteSubtask: (targetId: string, cardId: string, subtaskId: string) => void

  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt'>) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void

  importCsvTargets: (rows: Array<{ ip: string; hostname: string; description: string; engagement: string }>) => number

  exportTargetJSON: (targetId: string) => Promise<void>
  exportTargetMarkdown: (targetId: string) => Promise<void>
  exportEngagementPDF: (engagementId: string) => Promise<void>

  writeSharedContext: (targetId: string) => Promise<void>
  emitEvent: (event: string, data?: Record<string, unknown>) => Promise<void>

  runSearch: (query: string) => void
  clearSearch: () => void

  showToast: (message: string, type?: Toast['type']) => void
  dismissToast: (id: string) => void

  setNewTargetModal: (open: boolean) => void
  setImportXmlModal: (open: boolean) => void
  setAddPortModal: (open: boolean) => void
  setAddCredentialModal: (open: boolean) => void
  setAddCardModal: (open: boolean) => void
  setExpandedCard: (id: string | null) => void
  setSettingsOpen: (open: boolean) => void
  setCsvImportOpen: (open: boolean) => void
  setActiveTab: (tab: ActiveTab) => void
  updateSettings: (patch: Partial<RecondeskState['settings']>) => void
}
