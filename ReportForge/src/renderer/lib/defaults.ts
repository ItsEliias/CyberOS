import type { Report, ReportSection, Finding, Severity } from '@shared/types';

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

export const PLATFORMS = ['THM', 'HTB', 'Client', 'Internal', 'CTF', 'Other'];
export const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

export const SEV_COLORS: Record<Severity, string> = {
  critical: '#ff4444',
  high    : '#ff6b35',
  medium  : '#f0a500',
  low     : '#3fb950',
  info    : '#8b949e',
};
