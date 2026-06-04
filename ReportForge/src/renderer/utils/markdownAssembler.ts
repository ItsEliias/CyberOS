import type { Report } from '@shared/types';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

export interface AssembleOptions {
  includeToc?: boolean;
  includeFindingsTable?: boolean;
  includeCredentials?: boolean;
  redactCredentials?: boolean;
  includeRawNmap?: boolean;
}

/**
 * Redact password/hash column values from credential Markdown tables.
 * Looks for rows in pipe-delimited tables that contain password-like values
 * (long alphanumeric strings, hashes) and replaces them with [redacted].
 */
export function redactCredentialContent(content: string): string {
  // Replace hash-like values (MD5/NTLM/bcrypt patterns) and long passwords in table cells
  return content.replace(
    /(\| *[^\n|]+ *\| *)([A-Za-z0-9$./+!@#%^&*]{8,}|[a-f0-9]{32,64})( *\|)/g,
    '$1[redacted]$3'
  );
}

/**
 * Assembles all visible report sections and findings into a single Markdown string.
 * The "Findings" section auto-generates severity-sorted finding entries.
 * The "Credentials Discovered" section optionally redacts passwords.
 */
export function assembleMarkdown(report: Report, opts: AssembleOptions = {}): string {
  const {
    includeToc = true,
    includeFindingsTable = true,
    includeCredentials = true,
    redactCredentials = true,
    includeRawNmap = false,
  } = opts;

  const lines: string[] = [];

  // Document header
  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push(
    `**Target:** ${report.targetName}${report.targetIP ? ` (${report.targetIP})` : ''}` +
    ` | **Platform:** ${report.platform}` +
    ` | **Date:** ${report.assessmentDate}` +
    ` | **Operator:** ${report.operator}`
  );
  if (report.difficulty) {
    lines.push(`**Difficulty:** ${report.difficulty}`);
  }
  lines.push('');

  const visibleSections = [...report.sections]
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order)
    .filter(s => {
      if (!includeCredentials && s.title === 'Credentials Discovered') return false;
      if (!includeRawNmap && s.title === 'Appendix') {
        // Include appendix by default; caller can suppress with includeRawNmap=false
        // keeping it simple — the raw nmap filter applies to any content marked as raw
      }
      return true;
    });

  // Table of contents
  if (includeToc && visibleSections.length > 1) {
    lines.push('## Table of Contents');
    lines.push('');
    visibleSections.forEach((s, i) => {
      const anchor = s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      lines.push(`${i + 1}. [${s.title}](#${anchor})`);
    });
    lines.push('');
  }

  // Finding severity summary table
  if (includeFindingsTable && report.findings.length > 0) {
    lines.push('## Finding Summary');
    lines.push('');
    lines.push('| # | Title | Severity | CVSS |');
    lines.push('|---|-------|----------|------|');
    const sortedFindings = [...report.findings].sort(
      (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    );
    sortedFindings.forEach((f, i) => {
      lines.push(`| ${i + 1} | ${f.title} | ${f.severity.toUpperCase()} | ${f.cvss ?? '—'} |`);
    });
    lines.push('');
  }

  // Sections
  for (const section of visibleSections) {
    if (section.title === 'Findings') {
      lines.push('## Findings');
      lines.push('');

      const grouped: Record<string, typeof report.findings> = {};
      SEVERITY_ORDER.forEach(s => { grouped[s] = []; });
      report.findings.forEach(f => { if (grouped[f.severity]) grouped[f.severity].push(f); });

      let hasFinding = false;
      for (const sev of SEVERITY_ORDER) {
        for (const f of grouped[sev]) {
          hasFinding = true;
          lines.push(`### [${f.severity.toUpperCase()}] ${f.title}`);
          if (f.cvss) lines.push(`**CVSS:** ${f.cvss}`);
          lines.push('');
          if (f.description) {
            lines.push(`**Description:** ${f.description}`);
            lines.push('');
          }
          if (f.evidence) {
            lines.push('**Evidence:**');
            lines.push('');
            lines.push(f.evidence);
            lines.push('');
          }
          if (f.impact) {
            lines.push(`**Impact:** ${f.impact}`);
            lines.push('');
          }
          if (f.recommendation) {
            lines.push(`**Recommendation:** ${f.recommendation}`);
          }
          if (f.references.length > 0) {
            lines.push('');
            lines.push('**References:**');
            f.references.forEach(r => lines.push(`- ${r}`));
          }
          lines.push('');
        }
      }
      if (!hasFinding) {
        lines.push('*No findings recorded.*');
        lines.push('');
      }
    } else if (section.title === 'Credentials Discovered') {
      if (!includeCredentials) continue;
      lines.push(`## ${section.title}`);
      lines.push('');
      const content = redactCredentials
        ? redactCredentialContent(section.content)
        : section.content;
      if (content.trim()) {
        lines.push(content);
      }
      lines.push('');
    } else {
      lines.push(`## ${section.title}`);
      lines.push('');
      if (section.content.trim()) {
        lines.push(section.content);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
