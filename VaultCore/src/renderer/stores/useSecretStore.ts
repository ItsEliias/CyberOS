// VaultCore — Secret Detection Zustand Store

import { create } from 'zustand';
import type {
  DetectedSecret, AuditLogEntry, Repository, ScanResult,
} from '../types/vaultcore';

function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface SecretState {
  repos: Repository[];
  activeRepoId: string | null;
  secrets: DetectedSecret[];
  auditLog: AuditLogEntry[];
  scanResults: Record<string, ScanResult>;
  searchQuery: string;
  filterEnv: string | null;
  filterType: string | null;
  currentUser: string;

  // Repo actions
  addRepo: (repo: Omit<Repository, 'id'>) => Repository;
  removeRepo: (id: string) => void;
  setActiveRepo: (id: string | null) => void;
  updateRepo: (id: string, patch: Partial<Repository>) => void;

  // Secret actions
  setSecrets: (repoId: string, secrets: DetectedSecret[]) => void;
  updateSecret: (id: string, patch: Partial<DetectedSecret>) => void;

  // Audit
  addAuditEntry: (entry: Omit<AuditLogEntry, 'id'>) => void;

  // Scan
  setScanResult: (repoId: string, result: ScanResult) => void;

  // Search / filter
  setSearchQuery: (q: string) => void;
  setFilterEnv: (env: string | null) => void;
  setFilterType: (type: string | null) => void;
  setCurrentUser: (user: string) => void;
}

export const useSecretStore = create<SecretState>((set) => ({
  repos: [],
  activeRepoId: null,
  secrets: [],
  auditLog: [],
  scanResults: {},
  searchQuery: '',
  filterEnv: null,
  filterType: null,
  currentUser: 'ItsEliias',

  addRepo: (repo) => {
    const r: Repository = { ...repo, id: genId() };
    set((s) => ({ repos: [...s.repos, r] }));
    return r;
  },

  removeRepo: (id) =>
    set((s) => ({
      repos: s.repos.filter((r) => r.id !== id),
      secrets: s.secrets.filter((sec) => sec.repoId !== id),
      activeRepoId: s.activeRepoId === id ? (s.repos.find((r) => r.id !== id)?.id ?? null) : s.activeRepoId,
    })),

  setActiveRepo: (id) => set({ activeRepoId: id }),

  updateRepo: (id, patch) =>
    set((s) => ({ repos: s.repos.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),

  setSecrets: (repoId, secrets) =>
    set((s) => ({
      secrets: [...s.secrets.filter((sec) => sec.repoId !== repoId), ...secrets],
    })),

  updateSecret: (id, patch) =>
    set((s) => ({
      secrets: s.secrets.map((sec) => (sec.id === id ? { ...sec, ...patch } : sec)),
    })),

  addAuditEntry: (entry) => {
    const full: AuditLogEntry = { ...entry, id: genId() };
    set((s) => ({ auditLog: [full, ...s.auditLog].slice(0, 1000) }));
  },

  setScanResult: (repoId, result) =>
    set((s) => ({ scanResults: { ...s.scanResults, [repoId]: result } })),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterEnv: (env) => set({ filterEnv: env }),
  setFilterType: (type) => set({ filterType: type }),
  setCurrentUser: (user) => set({ currentUser: user }),
}));
