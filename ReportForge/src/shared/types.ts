export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ReportTemplate =
  | 'blank' | 'ptes' | 'owasp-web' | 'htb-machine'
  | 'network-pentest' | 'active-directory' | 'api-security'
  | 'mobile-app' | 'executive-summary';

export type SectionType =
  | 'body' | 'cover' | 'toc' | 'findings' | 'risk-matrix' | 'signature';

export type WatermarkLabel = 'none' | 'CONFIDENTIAL' | 'DRAFT' | 'FOR REVIEW';

export type ClassificationLabel = 'Confidential' | 'Internal' | 'Public';

export interface SectionComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

export interface ReportVersion {
  id: string;
  label: string;
  createdAt: string;
  sectionCount: number;
}

export interface ReportVariables {
  client_name: string;
  test_date: string;
  tester_name: string;
  scope: string;
  engagement_type: string;
}

export interface CoverData {
  title: string;
  clientName: string;
  testerName: string;
  date: string;
  classification: ClassificationLabel;
  logoBase64?: string;
}

export interface SignatureBlock {
  preparedBy: string;
  role: string;
  date: string;
  signatureData?: string;
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  evidence: string;
  impact: string;
  recommendation: string;
  cvss?: string;
  likelihood?: number;
  impactScore?: number;
  linkedCardId?: string;
  references: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  visible: boolean;
  type?: SectionType;
  comments?: SectionComment[];
  coverData?: CoverData;
  signatureBlock?: SignatureBlock;
}

export interface Report {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  targetName: string;
  targetIP: string;
  platform: string;
  assessmentDate: string;
  operator: string;
  difficulty?: string;
  status: 'draft' | 'complete';
  sections: ReportSection[];
  findings: Finding[];
  reconDeskTargetId?: string;
  cyberLabSessionId?: string;
  variables?: ReportVariables;
  versions?: ReportVersion[];
  watermark?: WatermarkLabel;
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
