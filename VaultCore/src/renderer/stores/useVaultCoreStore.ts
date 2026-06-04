// VaultCore — Spec-aligned Zustand store
// Manages ScrapingSource[], ScrapeRun[], vaultStats, tagReview, activeRunIds

import { create } from 'zustand';
import type {
  ScrapingSource, ScrapeRun, ScrapeResultData, NoteDiff, VaultStats as VaultCoreStats,
  TagReviewPending, VaultCoreSettings, TagRule,
} from '../types/vaultcore';
import { TAG_RULES } from '../utils/tagEngine';

export type ActiveViewVC =
  | 'dashboard'
  | 'sources'
  | 'history'
  | 'health'
  | 'settings'
  | 'scan'
  | 'repos'
  | 'audit'
  | 'branches'
  | 'conflicts'
  | 'credvault';

interface VaultCoreState {
  sources: ScrapingSource[];
  runs: ScrapeRun[];
  activeSourceId: string | null;
  activeView: ActiveViewVC;

  isScrapingAll: boolean;
  activeRunIds: string[];

  tagReviewPending: TagReviewPending | null;

  vaultStats: VaultCoreStats | null;

  settings: VaultCoreSettings;

  // Actions
  setSources: (sources: ScrapingSource[]) => void;
  addSource: (source: Omit<ScrapingSource, 'id'>) => void;
  updateSource: (id: string, patch: Partial<ScrapingSource>) => void;
  deleteSource: (id: string) => void;
  setActiveSourceId: (id: string | null) => void;
  setActiveView: (view: ActiveViewVC) => void;

  addRun: (run: ScrapeRun) => void;
  updateRun: (id: string, patch: Partial<ScrapeRun>) => void;
  clearRuns: () => void;

  addActiveRunId: (id: string) => void;
  removeActiveRunId: (id: string) => void;
  setIsScrapingAll: (v: boolean) => void;

  setTagReviewPending: (pending: TagReviewPending | null) => void;

  setVaultStats: (stats: VaultCoreStats | null) => void;

  updateSettings: (patch: Partial<VaultCoreSettings>) => void;
  addTagRule: (rule: TagRule) => void;
  removeTagRule: (category: string) => void;
}

const DEFAULT_SETTINGS: VaultCoreSettings = {
  vaultPath: '',
  autoCreateDirs: true,
  schedulingEnabled: true,
  defaultInterval: 'daily',
  failureThreshold: 3,
  autoDisableAfterFailures: false,
  autoTagEnabled: true,
  tagRules: TAG_RULES,
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const useVaultCoreStore = create<VaultCoreState>((set) => ({
  sources: [],
  runs: [],
  activeSourceId: null,
  activeView: 'dashboard',
  isScrapingAll: false,
  activeRunIds: [],
  tagReviewPending: null,
  vaultStats: null,
  settings: DEFAULT_SETTINGS,

  setSources: (sources) => set({ sources }),

  addSource: (source) =>
    set((s) => ({
      sources: [...s.sources, { ...source, id: generateId() }],
    })),

  updateSource: (id, patch) =>
    set((s) => ({
      sources: s.sources.map((src) => (src.id === id ? { ...src, ...patch } : src)),
    })),

  deleteSource: (id) =>
    set((s) => ({ sources: s.sources.filter((src) => src.id !== id) })),

  setActiveSourceId: (id) => set({ activeSourceId: id }),
  setActiveView: (view) => set({ activeView: view }),

  addRun: (run) => set((s) => ({ runs: [run, ...s.runs].slice(0, 200) })),

  updateRun: (id, patch) =>
    set((s) => ({
      runs: s.runs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),

  clearRuns: () => set({ runs: [] }),

  addActiveRunId: (id) => set((s) => ({ activeRunIds: [...s.activeRunIds, id] })),
  removeActiveRunId: (id) => set((s) => ({ activeRunIds: s.activeRunIds.filter((x) => x !== id) })),
  setIsScrapingAll: (v) => set({ isScrapingAll: v }),

  setTagReviewPending: (pending) => set({ tagReviewPending: pending }),

  setVaultStats: (stats) => set({ vaultStats: stats }),

  updateSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),

  addTagRule: (rule) =>
    set((s) => ({ settings: { ...s.settings, tagRules: [...s.settings.tagRules, rule] } })),

  removeTagRule: (category) =>
    set((s) => ({
      settings: {
        ...s.settings,
        tagRules: s.settings.tagRules.filter((r) => r.category !== category),
      },
    })),
}));

// Re-export types for convenience
export type { ScrapingSource, ScrapeRun, ScrapeResultData, NoteDiff, VaultCoreStats, TagReviewPending };
