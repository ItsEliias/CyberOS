import { create } from 'zustand';
import type { Report, Finding, ReportSection } from '@shared/types';

type View = 'library' | 'editor' | 'wizard';

interface AppState {
  view: View;
  reports: Report[];
  activeReport: Report | null;
  activeSectionId: string | null;
  activeFindingId: string | null;
  dirty: boolean;

  setView: (v: View) => void;
  setReports: (r: Report[]) => void;
  setActiveReport: (r: Report | null) => void;
  setActiveSectionId: (id: string | null) => void;
  setActiveFindingId: (id: string | null) => void;
  setDirty: (d: boolean) => void;

  upsertReport: (r: Report) => void;
  removeReport: (id: string) => void;
  updateSection: (sectionId: string, patch: Partial<ReportSection>) => void;
  upsertFinding: (f: Finding) => void;
  removeFinding: (id: string) => void;
  reorderSections: (sections: ReportSection[]) => void;
  patchReportMeta: (patch: Partial<Report>) => void;
}

export const useStore = create<AppState>((set, get) => ({
  view          : 'library',
  reports       : [],
  activeReport  : null,
  activeSectionId: null,
  activeFindingId: null,
  dirty         : false,

  setView            : (v) => set({ view: v }),
  setReports         : (r) => set({ reports: r }),
  setActiveReport    : (r) => set({ activeReport: r, activeSectionId: r?.sections[0]?.id ?? null, activeFindingId: null, dirty: false }),
  setActiveSectionId : (id) => set({ activeSectionId: id }),
  setActiveFindingId : (id) => set({ activeFindingId: id }),
  setDirty           : (d) => set({ dirty: d }),

  upsertReport: (r) => {
    set(s => {
      const idx = s.reports.findIndex(x => x.id === r.id);
      const next = idx >= 0
        ? s.reports.map(x => x.id === r.id ? r : x)
        : [r, ...s.reports];
      return { reports: next };
    });
  },

  removeReport: (id) => {
    set(s => ({
      reports: s.reports.filter(r => r.id !== id),
      activeReport: s.activeReport?.id === id ? null : s.activeReport,
    }));
  },

  updateSection: (sectionId, patch) => {
    const { activeReport } = get();
    if (!activeReport) return;
    const sections = activeReport.sections.map(s =>
      s.id === sectionId ? { ...s, ...patch } : s
    );
    const updated = { ...activeReport, sections };
    set({ activeReport: updated, dirty: true });
  },

  upsertFinding: (f) => {
    const { activeReport } = get();
    if (!activeReport) return;
    const idx = activeReport.findings.findIndex(x => x.id === f.id);
    const findings = idx >= 0
      ? activeReport.findings.map(x => x.id === f.id ? f : x)
      : [...activeReport.findings, f];
    set({ activeReport: { ...activeReport, findings }, dirty: true });
  },

  removeFinding: (id) => {
    const { activeReport } = get();
    if (!activeReport) return;
    const findings = activeReport.findings.filter(f => f.id !== id);
    set({ activeReport: { ...activeReport, findings }, dirty: true, activeFindingId: null });
  },

  reorderSections: (sections) => {
    const { activeReport } = get();
    if (!activeReport) return;
    set({ activeReport: { ...activeReport, sections }, dirty: true });
  },

  patchReportMeta: (patch) => {
    const { activeReport } = get();
    if (!activeReport) return;
    set({ activeReport: { ...activeReport, ...patch }, dirty: true });
  },
}));
