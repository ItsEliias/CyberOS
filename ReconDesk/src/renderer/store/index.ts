import { create } from 'zustand'
import type {
  Target, AttackCard, AttackStage, CardStatus, Port, Credential,
  PortState, CredType, TimelineEvent
} from '../../shared/types'

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function makeEvent(type: TimelineEvent['type'], description: string): TimelineEvent {
  return { id: uid(), timestamp: new Date().toISOString(), type, description }
}

interface Store {
  targets: Target[]
  cards: AttackCard[]
  activeTargetId: string | null
  version: string

  // Target actions
  setActiveTarget: (id: string | null) => void
  addTarget: (t: Omit<Target, 'id' | 'createdAt' | 'updatedAt' | 'ports' | 'credentials' | 'timeline'>) => void
  updateTarget: (id: string, patch: Partial<Target>) => void
  removeTarget: (id: string) => void

  // Port actions
  addPort: (targetId: string, p: Omit<Port, 'id'>) => void
  removePort: (targetId: string, portId: string) => void

  // Credential actions
  addCredential: (targetId: string, c: Omit<Credential, 'id'>) => void
  removeCredential: (targetId: string, credId: string) => void

  // Card actions
  addCard: (c: Omit<AttackCard, 'id' | 'createdAt' | 'updatedAt' | 'findings' | 'linkedAssets'>) => void
  updateCard: (id: string, patch: Partial<AttackCard>) => void
  moveCard: (id: string, stage: AttackStage, status: CardStatus) => void
  removeCard: (id: string) => void

  // Timeline
  addTimelineEvent: (targetId: string, event: TimelineEvent) => void

  hydrate: (data: { targets: Target[]; cards: AttackCard[]; activeTargetId: string | null; version: string }) => void
  persist: () => void
}

export type { PortState, CredType }

export const useStore = create<Store>((set, get) => ({
  targets: [],
  cards: [],
  activeTargetId: null,
  version: '1.0.0',

  setActiveTarget: (id) => set({ activeTargetId: id }),

  addTarget: (t) => {
    const now = new Date().toISOString()
    const event = makeEvent('status', `Target created: ${t.name} (${t.ip})`)
    const target: Target = {
      ...t, id: uid(), ports: [], credentials: [],
      timeline: [event], createdAt: now, updatedAt: now
    }
    set(s => ({ targets: [...s.targets, target] }))
    get().persist()
  },

  updateTarget: (id, patch) => {
    set(s => ({
      targets: s.targets.map(t => t.id === id
        ? { ...t, ...patch, updatedAt: new Date().toISOString() }
        : t)
    }))
    get().persist()
  },

  addPort: (targetId, p) => {
    const port: Port = { ...p, id: uid() }
    const event = makeEvent('asset', `Port added: ${p.number}/${p.protocol.toUpperCase()}${p.service ? ` (${p.service})` : ''}`)
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? {
            ...t,
            ports: [...t.ports, port],
            timeline: [...(t.timeline ?? []), event],
            updatedAt: new Date().toISOString()
          }
        : t)
    }))
    get().persist()
  },

  removePort: (targetId, portId) => {
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, ports: t.ports.filter(p => p.id !== portId), updatedAt: new Date().toISOString() }
        : t)
    }))
    get().persist()
  },

  addCredential: (targetId, c) => {
    const cred: Credential = { ...c, id: uid() }
    const label = c.username ? c.username : 'credential'
    const event = makeEvent('asset', `Credential added: ${label}${c.service ? ` @ ${c.service}` : ''}`)
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? {
            ...t,
            credentials: [...t.credentials, cred],
            timeline: [...(t.timeline ?? []), event],
            updatedAt: new Date().toISOString()
          }
        : t)
    }))
    get().persist()
  },

  removeCredential: (targetId, credId) => {
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, credentials: t.credentials.filter(c => c.id !== credId), updatedAt: new Date().toISOString() }
        : t)
    }))
    get().persist()
  },

  removeTarget: (id) => {
    set(s => ({
      targets: s.targets.filter(t => t.id !== id),
      cards:   s.cards.filter(c => c.targetId !== id),
      activeTargetId: s.activeTargetId === id ? null : s.activeTargetId
    }))
    get().persist()
  },

  addCard: (c) => {
    const now = new Date().toISOString()
    const card: AttackCard = { ...c, id: uid(), findings: [], linkedAssets: [], createdAt: now, updatedAt: now }
    const event = makeEvent('card', `Card created: "${c.title}" in ${c.stage}`)
    set(s => ({
      cards: [...s.cards, card],
      targets: s.targets.map(t => t.id === c.targetId
        ? { ...t, timeline: [...(t.timeline ?? []), event] }
        : t)
    }))
    get().persist()
  },

  updateCard: (id, patch) => {
    set(s => ({
      cards: s.cards.map(c => c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)
    }))
    get().persist()
  },

  moveCard: (id, stage, status) => {
    const existing = get().cards.find(c => c.id === id)
    const statusChanged = existing && existing.status !== status
    const stageChanged  = existing && existing.stage !== stage

    set(s => {
      const updatedCards = s.cards.map(c =>
        c.id === id ? { ...c, stage, status, updatedAt: new Date().toISOString() } : c
      )
      if (!existing) return { cards: updatedCards }

      const events: TimelineEvent[] = []
      if (statusChanged) events.push(makeEvent('card', `"${existing.title}" status → ${status}`))
      if (stageChanged)  events.push(makeEvent('card', `"${existing.title}" moved to ${stage}`))

      const updatedTargets = events.length > 0
        ? s.targets.map(t => t.id === existing.targetId
            ? { ...t, timeline: [...(t.timeline ?? []), ...events] }
            : t)
        : s.targets

      return { cards: updatedCards, targets: updatedTargets }
    })
    get().persist()
  },

  removeCard: (id) => {
    set(s => ({ cards: s.cards.filter(c => c.id !== id) }))
    get().persist()
  },

  addTimelineEvent: (targetId, event) => {
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, timeline: [...(t.timeline ?? []), event] }
        : t)
    }))
    get().persist()
  },

  hydrate: (data) => {
    // Backfill timeline for older data that doesn't have it
    const targets = data.targets.map(t => ({
      ...t,
      timeline: t.timeline ?? []
    }))
    set({ ...data, targets })
  },

  persist: () => {
    const { targets, cards, activeTargetId, version } = get()
    window.electronAPI.saveData({ targets, cards, activeTargetId, version })
  }
}))
