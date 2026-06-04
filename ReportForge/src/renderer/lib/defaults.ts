import type { Report, ReportSection, Finding, Severity, ReportTemplate, ReportVariables } from '@shared/types';

export function makeId(): string {
  // RFC 4122 UUID v4
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
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

export function makeDefaultVariables(): ReportVariables {
  return {
    client_name    : '',
    test_date      : new Date().toISOString().slice(0, 10),
    tester_name    : '',
    scope          : '',
    engagement_type: '',
  };
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
    status        : 'draft',
    sections      : makeDefaultSections(),
    findings      : [],
    variables     : makeDefaultVariables(),
    versions      : [],
    watermark     : 'none',
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
  {
    id         : 'network-pentest',
    name       : 'Network Pentest',
    description: 'Internal/external network penetration test report',
    sectionTitles: [
      'Executive Summary',
      'Scope and Objectives',
      'Network Architecture',
      'Methodology',
      'Findings',
      'Vulnerability Summary',
      'Remediation Plan',
      'Appendix',
    ],
  },
  {
    id         : 'active-directory',
    name       : 'Active Directory',
    description: 'Active Directory / domain compromise assessment',
    sectionTitles: [
      'Executive Summary',
      'Domain Overview',
      'Scope',
      'Attack Path',
      'Findings',
      'Credentials Discovered',
      'Domain Hardening Recommendations',
      'Appendix',
    ],
  },
  {
    id         : 'api-security',
    name       : 'API Security',
    description: 'REST/GraphQL API security assessment report',
    sectionTitles: [
      'Executive Summary',
      'API Inventory',
      'Scope',
      'Methodology',
      'OWASP API Top 10 Coverage',
      'Findings',
      'Remediation Summary',
      'Appendix',
    ],
  },
  {
    id         : 'mobile-app',
    name       : 'Mobile App',
    description: 'iOS/Android mobile application security assessment',
    sectionTitles: [
      'Executive Summary',
      'Application Overview',
      'Scope',
      'Static Analysis',
      'Dynamic Analysis',
      'Findings',
      'Remediation Summary',
      'Appendix',
    ],
  },
  {
    id         : 'executive-summary',
    name       : 'Executive Summary Only',
    description: 'Concise management-level summary report',
    sectionTitles: [
      'Executive Summary',
      'Risk Overview',
      'Key Findings',
      'Recommendations',
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

const NETWORK_PENTEST_CONTENT: Record<string, string> = {
  'Executive Summary':
    'Prepared for {{client_name}} by {{tester_name}}.\n\nEngagement type: {{engagement_type}}\nTest date: {{test_date}}\nScope: {{scope}}\n\nHigh-level assessment overview for management.',
  'Network Architecture':
    'Diagram description and network topology overview.',
  'Scope and Objectives':
    'IP ranges, excluded systems, test objectives, and rules of engagement.',
  'Methodology':
    'PTES phases applied: Reconnaissance, Enumeration, Exploitation, Post-Exploitation, Reporting.',
  'Vulnerability Summary':
    '| Severity | Count |\n|---|---|\n| Critical | 0 |\n| High | 0 |\n| Medium | 0 |\n| Low | 0 |',
  'Remediation Plan':
    'Prioritised remediation steps with 30/60/90-day timelines.',
};

const AD_CONTENT: Record<string, string> = {
  'Executive Summary':
    'Active Directory assessment for {{client_name}}.\n\nTest date: {{test_date}}, Tester: {{tester_name}}.',
  'Domain Overview':
    '| Field | Value |\n|---|---|\n| Domain | |\n| DCs | |\n| Users | |\n| Computers | |',
  'Attack Path':
    'Describe the attack chain used to achieve domain compromise.',
  'Domain Hardening Recommendations':
    '- Implement tiered administration model\n- Enable Protected Users security group\n- Audit Kerberoastable accounts\n- Enforce SMB signing across all systems',
};

const API_CONTENT: Record<string, string> = {
  'API Inventory':
    '| Endpoint | Method | Auth Required | Tested |\n|---|---|---|---|\n| /api/v1/users | GET | Yes | |\n| /api/v1/auth | POST | No | |',
  'OWASP API Top 10 Coverage':
    '| Category | Tested | Result |\n|---|---|---|\n| API1 Broken Object Level Authorization | | |\n| API2 Broken Authentication | | |\n| API3 Broken Object Property Level Auth | | |\n| API4 Unrestricted Resource Consumption | | |\n| API5 Broken Function Level Authorization | | |\n| API6 Unrestricted Access to Sensitive Business Flows | | |\n| API7 Server Side Request Forgery | | |\n| API8 Security Misconfiguration | | |\n| API9 Improper Inventory Management | | |\n| API10 Unsafe Consumption of APIs | | |',
};

const MOBILE_CONTENT: Record<string, string> = {
  'Application Overview':
    '| Field | Value |\n|---|---|\n| App Name | |\n| Platform | iOS / Android |\n| Version | |\n| Build | |\n| Bundle ID | |',
  'Static Analysis':
    'Findings from decompilation, permission review, hardcoded secrets scan.',
  'Dynamic Analysis':
    'Runtime testing: traffic interception, session management, API calls.',
};

const EXEC_CONTENT: Record<string, string> = {
  'Risk Overview':
    'Overall risk rating: **High / Medium / Low**\n\nSummary of risk posture and business impact.',
  'Key Findings':
    'Top 5 findings and their business implications.',
};

function contentForTemplate(template: ReportTemplate, title: string): string {
  if (template === 'ptes')            return PTES_CONTENT[title]           ?? '';
  if (template === 'owasp-web')       return OWASP_CONTENT[title]          ?? '';
  if (template === 'htb-machine')     return HTB_CONTENT[title]            ?? '';
  if (template === 'network-pentest') return NETWORK_PENTEST_CONTENT[title] ?? '';
  if (template === 'active-directory') return AD_CONTENT[title]            ?? '';
  if (template === 'api-security')    return API_CONTENT[title]            ?? '';
  if (template === 'mobile-app')      return MOBILE_CONTENT[title]         ?? '';
  if (template === 'executive-summary') return EXEC_CONTENT[title]         ?? '';
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
    type   : 'body' as const,
    comments: [],
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
    status        : 'draft',
    sections,
    findings      : [],
    variables     : makeDefaultVariables(),
    versions      : [],
    watermark     : 'none',
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
