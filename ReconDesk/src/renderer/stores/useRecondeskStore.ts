// ReconDesk — Zustand store

import { create } from 'zustand'
import type { Target, Port, Credential, AttackCard, AttackStage, CardStatus, TimelineEntry, TimelineEntryType, Engagement, ChecklistItem, Screenshot, Subtask } from '../types/recondesk'
import { uid, parseNmapXml, buildMarkdown, buildEngagementHtml, normalizeTarget, searchTargets } from './store-utils'
import type { SearchResult } from './store-utils'
import type { RecondeskState, Toast, AppNotification } from './store-types'
export { calcHealthScore } from './store-utils'
export type { ActiveTab } from './store-types'

function makeEntry(type: TimelineEntryType, description: string, data?: Record<string, unknown>): TimelineEntry {
  return { id: uid(), timestamp: new Date().toISOString(), type, description, data }
}

const DEFAULT_ENGAGEMENTS: Engagement[] = [
  { id: 'default', name: 'Default', color: '#d29922', createdAt: new Date().toISOString() },
]
const ENGAGEMENT_COLORS = ['#d29922', '#4a9eff', '#3fb950', '#f85149', '#b44fff', '#ff8c42']

// ─── Store ────────────────────────────────────────────────────────────────────

export const useRecondeskStore = create<RecondeskState>((set, get) => ({
  targets: [],
  activeTargetId: null,
  activeTab: 'overview',
  engagements: DEFAULT_ENGAGEMENTS,
  activeEngagementId: null,
  searchQuery: '',
  searchResults: [],
  toasts: [],
  notifications: [],
  ecosystemContext: { activeLab: null, activePlaybook: null },
  isNewTargetModalOpen: false,
  isImportXmlModalOpen: false,
  isAddPortModalOpen: false,
  isAddCredentialModalOpen: false,
  isAddCardModalOpen: false,
  expandedCardId: null,
  isSettingsOpen: false,
  isCsvImportOpen: false,
  settings: {
    defaultPlatform: 'HTB',
    autoWriteSharedContext: true,
    autoTimeline: true,
    showLabContextInHeader: true,
    anthropicApiKey: '',
    globalWordlists: [
      '/usr/share/wordlists/rockyou.txt',
      '/usr/share/wordlists/dirb/common.txt',
      '/usr/share/seclists/Discovery/Web-Content/big.txt',
    ],
  },

  loadTargets: async () => {
    try {
      const data = await window.electronAPI.loadData()
      if (data && Array.isArray(data.targets)) {
        const targets: Target[] = data.targets.map(normalizeTarget)
        set({ targets })
        if (data.activeTargetId && targets.find(t => t.id === data.activeTargetId)) {
          set({ activeTargetId: data.activeTargetId })
        }
        if (data.engagements && Array.isArray(data.engagements)) {
          set({ engagements: data.engagements })
        }
        try {
          const config = await (window.electronAPI as any).readConfig?.()
          if (config?.shared_context) {
            set({
              ecosystemContext: {
                activeLab: config.shared_context.activeTarget || null,
                activePlaybook: config.shared_context.activePlaybook || null,
              }
            })
          }
        } catch { /* no-op */ }
      }
    } catch { /* first launch */ }
  },

  saveTargets: async () => {
    const { targets, activeTargetId, engagements } = get()
    // Strip plaintext passwords before persisting — CredVault owns encrypted storage
    const safeTargets = targets.map(t => ({
      ...t,
      credentials: t.credentials.map(({ password: _pw, ...c }) => c),
    }))
    try {
      await window.electronAPI.saveData({
        targets: safeTargets as any,
        cards: [],
        activeTargetId,
        version: '3.0.0',
        engagements,
      })
    } catch { /* no-op */ }
  },

  addTarget: (t) => {
    const target: Target = {
      ...t, id: uid(), createdAt: new Date().toISOString(),
      ports: [], credentials: [], attackCards: [], checklist: [],
      screenshots: [], linkedCredentialIds: [], wordlists: [],
      engagementId: t.engagementId || 'default',
      timeline: [makeEntry('status_changed', `Target created: ${t.name} (${t.ip})`)],
    }
    set(s => ({ targets: [...s.targets, target] }))
    get().saveTargets()
    get().setActiveTarget(target.id)
    // Trigger DNS enrichment in main process
    ;(window.electronAPI as any).enrichTarget?.(target.ip, target.name).then((result: any) => {
      if (!result) return
      const enrichment = { status: 'done' as const, resolvedHostname: result.hostname, resolvedIPs: result.ips, completedAt: new Date().toISOString() }
      const entries: TimelineEntry[] = []
      if (result.hostname) entries.push(makeEntry('enrichment', `DNS resolved: ${result.hostname}`))
      if (result.country) {
        const geo = { status: 'done' as const, country: result.country, countryCode: result.countryCode, city: result.city, org: result.org, flag: result.flag, cachedAt: new Date().toISOString() }
        set(s => ({ targets: s.targets.map(tgt => tgt.id === target.id ? { ...tgt, enrichment, geo, timeline: [...tgt.timeline, ...entries] } : tgt) }))
      } else {
        set(s => ({ targets: s.targets.map(tgt => tgt.id === target.id ? { ...tgt, enrichment, timeline: [...tgt.timeline, ...entries] } : tgt) }))
      }
      get().saveTargets()
    }).catch(() => {
      set(s => ({ targets: s.targets.map(tgt => tgt.id === target.id ? { ...tgt, enrichment: { status: 'error' as const, error: 'Enrichment failed' } } : tgt) }))
    })
  },

  setActiveTarget: (id) => {
    set({ activeTargetId: id, activeTab: 'overview' })
    get().saveTargets()
    if (get().settings.autoWriteSharedContext) get().writeSharedContext(id)
  },

  updateTarget: (id, patch) => {
    const prev = get().targets.find(t => t.id === id)
    set(s => ({ targets: s.targets.map(t => t.id === id ? { ...t, ...patch } : t) }))
    if (patch.status && prev && patch.status !== prev.status && get().settings.autoTimeline) {
      const entry = makeEntry('status_changed', `Status changed to ${patch.status}`)
      set(s => ({ targets: s.targets.map(t => t.id === id ? { ...t, timeline: [...t.timeline, entry] } : t) }))
    }
    if (patch.notes && prev && patch.notes !== prev.notes && get().settings.autoTimeline) {
      const entry = makeEntry('note_added', 'Notes updated')
      set(s => ({ targets: s.targets.map(t => t.id === id ? { ...t, timeline: [...t.timeline, entry] } : t) }))
    }
    get().saveTargets()
  },

  deleteTarget: (id) => {
    set(s => ({ targets: s.targets.filter(t => t.id !== id), activeTargetId: s.activeTargetId === id ? null : s.activeTargetId }))
    get().saveTargets()
  },

  addPort: (targetId, portData) => {
    const port: Port = { ...portData, id: uid(), addedAt: new Date().toISOString() }
    const entry = makeEntry('port_added', `Port ${port.port}/${port.protocol}${port.service ? ` (${port.service})` : ''} added`)
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, ports: [...t.ports, port], timeline: get().settings.autoTimeline ? [...t.timeline, entry] : t.timeline }
        : t)
    }))
    get().saveTargets()
  },

  importPortsFromNmap: (targetId, xml) => {
    const { ports: parsed, errors } = parseNmapXml(xml)
    if (errors.length > 0 && parsed.length === 0) return { imported: 0, skipped: 0, errors }
    const target = get().targets.find(t => t.id === targetId)
    if (!target) return { imported: 0, skipped: 0, errors: ['Target not found'] }
    const existingKeys = new Set(target.ports.map(p => `${p.port}-${p.protocol}`))
    let imported = 0; let skipped = 0
    const newPorts: Port[] = []; const newEntries: TimelineEntry[] = []
    parsed.forEach(p => {
      const key = `${p.port}-${p.protocol}`
      if (existingKeys.has(key)) { skipped++; return }
      existingKeys.add(key)
      const port: Port = { ...p, id: uid(), addedAt: new Date().toISOString() }
      newPorts.push(port)
      if (get().settings.autoTimeline) {
        newEntries.push(makeEntry('port_added', `Port ${p.port}/${p.protocol}${p.service ? ` (${p.service})` : ''} imported from nmap`))
      }
      imported++
    })
    if (newPorts.length > 0) {
      set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, ports: [...t.ports, ...newPorts], timeline: [...t.timeline, ...newEntries] } : t) }))
      get().saveTargets()
    }
    return { imported, skipped, errors }
  },

  updatePort: (targetId, portId, patch) => {
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, ports: t.ports.map(p => p.id === portId ? { ...p, ...patch } : p) } : t) }))
    get().saveTargets()
  },

  deletePort: (targetId, portId) => {
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, ports: t.ports.filter(p => p.id !== portId) } : t) }))
    get().saveTargets()
  },

  addCredential: (targetId, credData) => {
    const cred: Credential = { ...credData, id: uid(), addedAt: new Date().toISOString() }
    const entry = makeEntry('credential_added', `Credential added: ${cred.username || 'unknown'}${cred.service ? ` @ ${cred.service}` : ''}`)
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, credentials: [...t.credentials, cred], timeline: get().settings.autoTimeline ? [...t.timeline, entry] : t.timeline }
        : t)
    }))
    get().saveTargets()
  },

  updateCredential: (targetId, credId, patch) => {
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, credentials: t.credentials.map(c => c.id === credId ? { ...c, ...patch } : c) } : t) }))
    get().saveTargets()
  },

  deleteCredential: (targetId, credId) => {
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, credentials: t.credentials.filter(c => c.id !== credId) } : t) }))
    get().saveTargets()
  },

  addAttackCard: (targetId, cardData) => {
    const card: AttackCard = { ...cardData, id: uid(), createdAt: new Date().toISOString() }
    const entry = makeEntry('card_created', `Attack card created: "${card.title}" [${card.stage}]`)
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, attackCards: [...t.attackCards, card], timeline: get().settings.autoTimeline ? [...t.timeline, entry] : t.timeline }
        : t)
    }))
    get().saveTargets()
    // CVE alert: notify when a new card references a CVE
    const cveMatch = card.title.match(/CVE-\d{4}-\d+/i) || card.description?.match(/CVE-\d{4}-\d+/i)
    if (cveMatch) {
      const cveId = cveMatch[0].toUpperCase()
      const target = get().targets.find(t => t.id === targetId)
      const body = `New card on ${target?.name ?? targetId}: "${card.title}"`
      get().addNotification({ title: `CVE Detected: ${cveId}`, body, targetId })
      ;(window.electronAPI as any).sendNotification?.(`CVE Detected: ${cveId}`, body).catch(() => {})
    }
  },

  updateAttackCard: (targetId, cardId, patch) => {
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, attackCards: t.attackCards.map(c => c.id === cardId ? { ...c, ...patch } : c) } : t) }))
    get().saveTargets()
  },

  deleteAttackCard: (targetId, cardId) => {
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, attackCards: t.attackCards.filter(c => c.id !== cardId) } : t) }))
    get().saveTargets()
  },

  moveAttackCard: (targetId, cardId, newStage, newStatus) => {
    const target = get().targets.find(t => t.id === targetId)
    const card = target?.attackCards.find(c => c.id === cardId)
    if (!card) return
    const stageChanged = card.stage !== newStage
    const statusChanged = card.status !== newStatus
    const completedAt = newStatus === 'done' && card.status !== 'done' ? new Date().toISOString() : card.completedAt
    const entries: TimelineEntry[] = []
    if (stageChanged && get().settings.autoTimeline) entries.push(makeEntry('card_moved', `"${card.title}" moved to ${newStage}`))
    if (newStatus === 'done' && card.status !== 'done' && get().settings.autoTimeline) {
      entries.push(makeEntry('card_completed', `"${card.title}" marked done`))
    } else if (statusChanged && get().settings.autoTimeline) {
      entries.push(makeEntry('card_moved', `"${card.title}" status → ${newStatus}`))
    }
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? {
            ...t,
            attackCards: t.attackCards.map(c => c.id === cardId ? { ...c, stage: newStage, status: newStatus, completedAt } : c),
            timeline: entries.length > 0 ? [...t.timeline, ...entries] : t.timeline,
          }
        : t)
    }))
    get().saveTargets()
    // CVE alert: notify when a CVE-tagged card changes status
    if (statusChanged) {
      const cveMatch = card.title.match(/CVE-\d{4}-\d+/i)
      if (cveMatch) {
        const cveId = cveMatch[0].toUpperCase()
        const target = get().targets.find(t => t.id === targetId)
        const body = `${cveId} on ${target?.name ?? targetId} → ${newStatus}`
        get().addNotification({ title: `CVE Status: ${cveId}`, body, targetId })
        ;(window.electronAPI as any).sendNotification?.(`CVE Status: ${cveId}`, body).catch(() => {})
      }
    }
  },

  addChecklistItem: (targetId, text, assignee) => {
    const item: ChecklistItem = { id: uid(), text, done: false, assignee, createdAt: new Date().toISOString() }
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, checklist: [...t.checklist, item] } : t) }))
    get().saveTargets()
  },

  toggleChecklistItem: (targetId, itemId) => {
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, checklist: t.checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i) }
        : t)
    }))
    get().saveTargets()
  },

  deleteChecklistItem: (targetId, itemId) => {
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, checklist: t.checklist.filter(i => i.id !== itemId) } : t) }))
    get().saveTargets()
  },

  updateChecklistItem: (targetId, itemId, patch) => {
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, checklist: t.checklist.map(i => i.id === itemId ? { ...i, ...patch } : i) } : t) }))
    get().saveTargets()
  },

  addScreenshot: (targetId, screenshot) => {
    const s2: Screenshot = { ...screenshot, id: uid() }
    const entry = makeEntry('screenshot', `Screenshot captured: ${screenshot.label}`)
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, screenshots: [...t.screenshots, s2], timeline: get().settings.autoTimeline ? [...t.timeline, entry] : t.timeline }
        : t)
    }))
    get().saveTargets()
  },

  deleteScreenshot: (targetId, screenshotId) => {
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, screenshots: t.screenshots.filter(sc => sc.id !== screenshotId) } : t) }))
    get().saveTargets()
  },

  addEngagement: (name) => {
    const color = ENGAGEMENT_COLORS[get().engagements.length % ENGAGEMENT_COLORS.length]
    const eng: Engagement = { id: uid(), name, color, createdAt: new Date().toISOString() }
    set(s => ({ engagements: [...s.engagements, eng] }))
    get().saveTargets()
    return eng
  },

  updateEngagement: (id, patch) => {
    set(s => ({ engagements: s.engagements.map(e => e.id === id ? { ...e, ...patch } : e) }))
    get().saveTargets()
  },

  deleteEngagement: (id) => {
    if (id === 'default') return
    set(s => ({ engagements: s.engagements.filter(e => e.id !== id) }))
    get().saveTargets()
  },

  setActiveEngagement: (id) => set({ activeEngagementId: id }),

  addTimelineEntry: (targetId, type, description) => {
    const entry = makeEntry(type, description)
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, timeline: [...t.timeline, entry] } : t) }))
    get().saveTargets()
  },

  addWordlist: (targetId, path) => {
    set(s => ({
      targets: s.targets.map(t => t.id === targetId && !t.wordlists.includes(path)
        ? { ...t, wordlists: [...t.wordlists, path] } : t)
    }))
    get().saveTargets()
  },

  removeWordlist: (targetId, path) => {
    set(s => ({ targets: s.targets.map(t => t.id === targetId ? { ...t, wordlists: t.wordlists.filter(w => w !== path) } : t) }))
    get().saveTargets()
  },

  addSubtask: (targetId, cardId, title) => {
    const subtask: Subtask = { id: uid(), title, done: false }
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, attackCards: t.attackCards.map(c => c.id === cardId ? { ...c, subtasks: [...(c.subtasks ?? []), subtask] } : c) }
        : t)
    }))
    get().saveTargets()
  },

  toggleSubtask: (targetId, cardId, subtaskId) => {
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, attackCards: t.attackCards.map(c => c.id === cardId
            ? { ...c, subtasks: (c.subtasks ?? []).map(s => s.id === subtaskId ? { ...s, done: !s.done } : s) }
            : c) }
        : t)
    }))
    get().saveTargets()
  },

  deleteSubtask: (targetId, cardId, subtaskId) => {
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, attackCards: t.attackCards.map(c => c.id === cardId
            ? { ...c, subtasks: (c.subtasks ?? []).filter(s => s.id !== subtaskId) }
            : c) }
        : t)
    }))
    get().saveTargets()
  },

  addNotification: (n) => {
    const notif = { ...n, id: uid(), createdAt: new Date().toISOString() }
    set(s => ({ notifications: [notif, ...s.notifications].slice(0, 50) }))
  },

  markNotificationRead: (id) => {
    set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n) }))
  },

  clearNotifications: () => set({ notifications: [] }),

  importCsvTargets: (rows) => {
    const now = new Date().toISOString()
    const newTargets: Target[] = rows.filter(r => r.ip.trim()).map(row => {
      const engName = row.engagement.trim() || 'Default'
      let eng = get().engagements.find(e => e.name.toLowerCase() === engName.toLowerCase())
      if (!eng) eng = get().addEngagement(engName)
      return {
        id: uid(), name: row.hostname.trim() || row.ip.trim(), ip: row.ip.trim(),
        platform: 'Client' as const, os: 'Unknown', tags: [], status: 'active' as const,
        notes: row.description || '', createdAt: now, engagementId: eng.id,
        ports: [], credentials: [], attackCards: [], checklist: [],
        screenshots: [], linkedCredentialIds: [], wordlists: [],
        timeline: [makeEntry('import', `Imported from CSV: ${row.ip}`)],
      }
    })
    if (newTargets.length > 0) {
      set(s => ({ targets: [...s.targets, ...newTargets] }))
      get().saveTargets()
    }
    return newTargets.length
  },

  exportTargetJSON: async (targetId) => {
    const target = get().targets.find(t => t.id === targetId)
    if (!target) return
    const safeName = target.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const date = new Date().toISOString().slice(0, 10)
    try { await window.electronAPI.exportTarget({ json: JSON.stringify(target, null, 2), md: buildMarkdown(target), defaultName: `${safeName}-${date}.json` }) } catch {}
  },

  exportTargetMarkdown: async (targetId) => {
    const target = get().targets.find(t => t.id === targetId)
    if (!target) return
    const safeName = target.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const date = new Date().toISOString().slice(0, 10)
    try { await window.electronAPI.exportTarget({ json: JSON.stringify(target, null, 2), md: buildMarkdown(target), defaultName: `${safeName}-${date}.md` }) } catch {}
  },

  exportEngagementPDF: async (engagementId) => {
    const { targets, engagements } = get()
    const eng = engagements.find(e => e.id === engagementId)
    if (!eng) return
    const engTargets = targets.filter(t => t.engagementId === engagementId)
    const html = buildEngagementHtml(eng.name, engTargets)
    try {
      await (window.electronAPI as any).exportPdf?.({ html, defaultName: `${eng.name.replace(/\s+/g, '-')}-report.pdf` })
      get().showToast('PDF report exported', 'success')
    } catch { get().showToast('PDF export failed', 'error') }
  },

  writeSharedContext: async (targetId) => {
    const target = get().targets.find(t => t.id === targetId)
    if (!target) return
    try {
      await (window.electronAPI as any).writeContext?.({ activeTarget: target.name, activeIP: target.ip })
    } catch { /* no-op */ }
  },

  emitEvent: async (event, data) => {
    try {
      await (window.electronAPI as any).emitEvent?.(event, data)
    } catch { /* no-op */ }
  },

  runSearch: (query) => {
    if (!query.trim()) { set({ searchQuery: query, searchResults: [] }); return }
    set({ searchQuery: query, searchResults: searchTargets(get().targets, query) })
  },

  clearSearch: () => set({ searchQuery: '', searchResults: [] }),

  showToast: (message, type = 'info') => {
    const toast: Toast = { id: uid(), message, type }
    set(s => ({ toasts: [...s.toasts, toast] }))
    setTimeout(() => get().dismissToast(toast.id), 3500)
  },

  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  setNewTargetModal: (open) => set({ isNewTargetModalOpen: open }),
  setImportXmlModal: (open) => set({ isImportXmlModalOpen: open }),
  setAddPortModal: (open) => set({ isAddPortModalOpen: open }),
  setAddCredentialModal: (open) => set({ isAddCredentialModalOpen: open }),
  setAddCardModal: (open) => set({ isAddCardModalOpen: open }),
  setExpandedCard: (id) => set({ expandedCardId: id }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setCsvImportOpen: (open) => set({ isCsvImportOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  updateSettings: (patch) => set(s => ({ settings: { ...s.settings, ...patch } })),
}))

