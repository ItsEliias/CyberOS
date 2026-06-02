import type { Report, ReportSection, Finding, Severity, ReportTemplate } from '@shared/types';

export function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeDefaultSections(): ReportSection[] {
  const defs = [
    { title: 'Cover',                   content: '' },
    { title: 'Executive Summary',       content: '' },
    { title: 'Scope',                   content: '' },
    { title: 'Methodology',             content: '' },
    { title: 'Findings',                content: '' },
    { title: 'Credentials Discovered',  content: '' },
    { title: 'Recommendations',         content: '' },
    { title: 'Appendix',                content: '' },
  ];
  return defs.map((d, i) => ({
    id     : makeId(),
    title  : d.title,
    content: d.content,
    order  : i,
    visible: true,
  }));
}

export function makeBlankReport(overrides: Partial<Report> = {}): Report {
  const now = new Date().toISOString();
  return {
    id            : makeId(),
    createdAt     : now,
    updatedAt     : now,
    title         : 'Untitled Report',
    targetName    : '',
    targetIP      : '',
    platform      : 'THM',
    assessmentDate: new Date().toISOString().slice(0, 10),
    operator      : '',
    sections      : makeDefaultSections(),
    findings      : [],
    ...overrides,
  };
}

export function makeBlankFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id            : makeId(),
    title         : '',
    severity      : 'medium' as Severity,
    description   : '',
    evidence      : '',
    impact        : '',
    recommendation: '',
    references    : [],
    ...overrides,
  };
}

// ── Template definitions ──────────────────────────────────────────────────────

interface TemplateDef {
  id: ReportTemplate;
  name: string;
  description: string;
  sectionTitles: string[];
}

export const REPORT_TEMPLATES: TemplateDef[] = [
  {
    id         : 'blank',
    name       : 'Blank',
    description: 'Start from scratch with a minimal structure',
    sectionTitles: [
      'Cover', 'Executive Summary', 'Scope', 'Methodology',
      'Findings', 'Credentials Discovered', 'Recommendations', 'Appendix',
    ],
  },
  {
    id         : 'ptes',
    name       : 'PTES',
    description: 'Penetration Testing Execution Standard — professional pentest report',
    sectionTitles: [
      'Executive Summary',
      'Scope and Rules of Engagement',
      'Methodology',
      'Findings',
      'Risk Rating Matrix',
      'Remediation Roadmap',
      'Appendices',
    ],
  },
  {
    id         : 'owasp-web',
    name       : 'OWASP Web',
    description: 'Web application security assessment following OWASP Testing Guide',
    sectionTitles: [
      'Executive Summary',
      'Application Overview',
      'Scope',
      'Methodology',
      'OWASP Top 10 Coverage',
      'Findings',
      'Remediation Summary',
      'Appendices',
    ],
  },
  {
    id         : 'htb-machine',
    name       : 'HTB Machine',
    description: 'HackTheBox machine writeup format',
    sectionTitles: [
      'Machine Overview',
      'Reconnaissance',
      'Foothold',
      'Lateral Movement',
      'Privilege Escalation',
      'Flags',
      'Key Takeaways',
      'Tools Used',
    ],
  },
];

const PTES_CONTENT: Record<string, string> = {
  'Executive Summary':
    'High-level overview for non-technical stakeholders. Business impact, risk summary, key recommendations.',
  'Scope and Rules of Engagement':
    'Systems in scope, testing dates, constraints, authorisation reference.',
  'Methodology':
    'Testing approach following PTES phases: Pre-engagement, Intelligence Gathering, Threat Modelling, Vulnerability Analysis, Exploitation, Post-Exploitation, Reporting.',
  'Risk Rating Matrix':
    'CVSS scoring methodology used. Critical/High/Medium/Low/Informational definitions.',
  'Remediation Roadmap':
    'Prioritised list of fixes with suggested timelines (immediate/30/60/90 days).',
  'Appendices':
    'Tools used, raw output references, methodology notes.',
};

const OWASP_CONTENT: Record<string, string> = {
  'Application Overview':
    'Tech stack, authentication mechanisms, entry points tested.',
  'Scope':
    'URLs, endpoints, and functionality included in scope.',
  'Methodology':
    'OWASP Testing Guide v4 methodology. Automated scanning + manual verification.',
  'OWASP Top 10 Coverage':
    '| Category | Tested | Status |\n|---|---|---|\n| A01 Broken Access Control | | |\n| A02 Cryptographic Failures | | |\n| A03 Injection | | |\n| A04 Insecure Design | | |\n| A05 Security Misconfiguration | | |\n| A06 Vulnerable Components | | |\n| A07 Auth & Session Failures | | |\n| A08 Software & Data Integrity | | |\n| A09 Logging Failures | | |\n| A10 SSRF | | |',
};

const HTB_CONTENT: Record<string, string> = {
  'Machine Overview':
    '| Field | Value |\n|---|---|\n| Name | |\n| OS | |\n| Difficulty | |\n| Release Date | |\n| IP Address | |',
  'Reconnaissance':
    'nmap results, service enumeration summary.',
  'Foothold':
    'Initial access vector, exploit used, proof of execution.',
  'Lateral Movement':
    '(if applicable) Pivoting technique, credentials used.',
  'Privilege Escalation':
    'PrivEsc vector, technique, proof.',
  'Flags':
    '| Flag | Location | Value |\n|---|---|---|\n| User | | |\n| Root | | |',
  'Key Takeaways':
    'What was learned. Techniques practiced. CVEs exploited.',
  'Tools Used':
    'List of tools and commands used throughout.',
};

function contentForTemplate(template: ReportTemplate, title: string): string {
  if (template === 'ptes')      return PTES_CONTENT[title]  ?? '';
  if (template === 'owasp-web') return OWASP_CONTENT[title] ?? '';
  if (template === 'htb-machine') return HTB_CONTENT[title] ?? '';
  return '';
}

export function makeReportFromTemplate(
  template: ReportTemplate,
  overrides: Partial<Report> = {},
): Report {
  const def = REPORT_TEMPLATES.find(t => t.id === template)!;
  const sections: ReportSection[] = def.sectionTitles.map((title, i) => ({
    id     : makeId(),
    title,
    content: contentForTemplate(template, title),
    order  : i,
    visible: true,
  }));
  const now = new Date().toISOString();
  return {
    id            : makeId(),
    createdAt     : now,
    updatedAt     : now,
    title         : 'Untitled Report',
    targetName    : '',
    targetIP      : '',
    platform      : 'THM',
    assessmentDate: now.slice(0, 10),
    operator      : '',
    sections,
    findings      : [],
    ...overrides,
  };
}

export const PLATFORMS = ['THM', 'HTB', 'Client', 'Internal', 'CTF', 'Other'];
export const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

export const SEV_COLORS: Record<Severity, string> = {
  critical: '#ff4444',
  high    : '#ff6b35',
  medium  : '#f0a500',
  low     : '#3fb950',
  info    : '#8b949e',
};
