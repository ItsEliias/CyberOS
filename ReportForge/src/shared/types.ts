export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ReportTemplate = 'blank' | 'ptes' | 'owasp-web' | 'htb-machine';

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  evidence: string;
  impact: string;
  recommendation: string;
  cvss?: string;
  linkedCardId?: string;
  references: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  visible: boolean;
}

export interface Report {
  id: string;
  createdAt: string;
  updatedAt: string;
  // Metadata
  title: string;
  targetName: string;
  targetIP: string;
  platform: string;
  assessmentDate: string;
  operator: string;
  difficulty?: string;
  // Content
  sections: ReportSection[];
  findings: Finding[];
  // Source refs
  reconDeskTargetId?: string;
  cyberLabSessionId?: string;
}

export interface ReconDeskTarget {
  id: string;
  name: string;
  ip?: string;
  credentials?: Array<{ username: string; password: string; service?: string }>;
  [key: string]: unknown;
}

export interface CyberToolsSharedConfig {
  reportforge_status?: Record<string, unknown>;
  recondesk_status?: {
    activeTarget?: string;
    activeIP?: string;
    targets?: ReconDeskTarget[];
  };
  cyberlab?: {
    obsidianVault?: string;
  };
  obsidianVaultPath?: string;
  [key: string]: unknown;
}

export interface ExportResult {
  ok: boolean;
  path?: string;
  error?: string;
}

export interface WriteupFile {
  name: string;
  path: string;
  mtime: number;
}
