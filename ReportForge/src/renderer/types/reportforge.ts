// Re-export shared types for renderer-side convenience
export type { Report, ReportSection, Finding, Severity, ReportTemplate, ReconDeskTarget, CyberToolsSharedConfig, ExportResult, WriteupFile } from '@shared/types';

// ─── Renderer-only types ──────────────────────────────────────────────────────

export type AppView = 'library' | 'wizard' | 'editor';

export type PanelView = 'sections' | 'findings';

export type EditorMode = 'edit' | 'split' | 'preview';

export type SortKey = 'recent' | 'title' | 'findings';

export interface ExportOptions {
  format: 'markdown' | 'pdf';
  includeToc: boolean;
  includeFindingsTable: boolean;
  includeCredentials: boolean;
  redactCredentials: boolean;
  includeRawNmap: boolean;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface WizardDraft {
  step: 1 | 2 | 3 | 4;
}

export interface FindingGroup {
  severity: import('@shared/types').Severity;
  count: number;
  findings: import('@shared/types').Finding[];
}
