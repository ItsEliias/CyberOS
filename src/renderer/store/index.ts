import { create } from 'zustand'
import type { Target, AttackCard, AttackStage, CardStatus, Port, Credential, PortState, CredType } from '../../shared/types'

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

interface Store {
  targets: Target[]
  cards: AttackCard[]
  activeTargetId: string | null
  version: string

  // Target actions
  setActiveTarget: (id: string | null) => void
  addTarget: (t: Omit<Target, 'id' | 'createdAt' | 'updatedAt' | 'ports' | 'credentials'>) => void
  updateTarget: (id: string, patch: Partial<Target>) => void
  removeTarget: (id: string) => void

  // Port actions
  addPort: (targetId: string, p: Omit<Port, 'id'>) => void
  removePort: (targetId: string, portId: string) => void

  // Credential actions
  addCredential: (targetId: string, c: Omit<Credential, 'id'>) => void
  removeCredential: (targetId: string, credId: string) => void

  // Card actions
  addCard: (c: Omit<AttackCard, 'id' | 'createdAt' | 'updatedAt' | 'findings'>) => void
  updateCard: (id: string, patch: Partial<AttackCard>) => void
  moveCard: (id: string, stage: AttackStage, status: CardStatus) => void
  removeCard: (id: string) => void

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
    const target: Target = { ...t, id: uid(), ports: [], credentials: [], createdAt: now, updatedAt: now }
    set(s => ({ targets: [...s.targets, target] }))
    get().persist()
  },

  updateTarget: (id, patch) => {
    set(s => ({
      targets: s.targets.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)
    }))
    get().persist()
  },

  addPort: (targetId, p) => {
    const port: Port = { ...p, id: uid() }
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, ports: [...t.ports, port], updatedAt: new Date().toISOString() }
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
    set(s => ({
      targets: s.targets.map(t => t.id === targetId
        ? { ...t, credentials: [...t.credentials, cred], updatedAt: new Date().toISOString() }
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
    const card: AttackCard = { ...c, id: uid(), findings: [], createdAt: now, updatedAt: now }
    set(s => ({ cards: [...s.cards, card] }))
    get().persist()
  },

  updateCard: (id, patch) => {
    set(s => ({
      cards: s.cards.map(c => c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)
    }))
    get().persist()
  },

  moveCard: (id, stage, status) => {
    set(s => ({
      cards: s.cards.map(c => c.id === id ? { ...c, stage, status, updatedAt: new Date().toISOString() } : c)
    }))
    get().persist()
  },

  removeCard: (id) => {
    set(s => ({ cards: s.cards.filter(c => c.id !== id) }))
    get().persist()
  },

  hydrate: (data) => set(data),

  persist: () => {
    const { targets, cards, activeTargetId, version } = get()
    window.electronAPI.saveData({ targets, cards, activeTargetId, version })
  }
}))
