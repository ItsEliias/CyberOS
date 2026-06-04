import type { ReportVariables } from '@shared/types';

const VAR_RE = /\{\{(\w+)\}\}/g;

export function applyVariables(content: string, vars: ReportVariables | undefined): string {
  if (!vars) return content;
  return content.replace(VAR_RE, (_, key) => {
    const val = (vars as Record<string, string>)[key];
    return val !== undefined && val !== '' ? val : `{{${key}}}`;
  });
}

export function highlightVariables(content: string): string {
  return content.replace(
    VAR_RE,
    (match) =>
      `<span style="background:rgba(63,185,80,0.15);color:#3fb950;border-radius:3px;padding:0 3px;font-weight:600">${match}</span>`,
  );
}

export const KNOWN_VARS: Array<keyof ReportVariables> = [
  'client_name', 'test_date', 'tester_name', 'scope', 'engagement_type',
];
