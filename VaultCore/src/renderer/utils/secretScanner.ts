// VaultCore — Secret Scanner Utilities (renderer-side helpers)

import type { SecretPatternType, SecretType, SecretEnv } from '../types/vaultcore';

export interface PatternDef {
  type: SecretPatternType;
  label: string;
  pattern: RegExp;
}

export const SECRET_PATTERNS: PatternDef[] = [
  { type: 'aws_key',        label: 'AWS Access Key',   pattern: /AKIA[0-9A-Z]{16}/g },
  { type: 'private_key',    label: 'Private Key',      pattern: /-----BEGIN\s[\w\s]*PRIVATE KEY-----/g },
  { type: 'jwt',            label: 'JWT Token',        pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+/g },
  { type: 'generic_api_key',label: 'Generic API Key',  pattern: /[a-zA-Z0-9_]{32,64}/g },
];

/** Shannon entropy in bits/char */
export function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
  const len = s.length;
  return -Object.values(freq).reduce((acc, n) => {
    const p = n / len;
    return acc + p * Math.log2(p);
  }, 0);
}

export function maskValue(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••••••' + value.slice(-4);
}

export function inferSecretType(patternType: SecretPatternType, filePath: string): SecretType {
  if (patternType === 'private_key') return 'private_key';
  if (patternType === 'aws_key') return 'api_key';
  if (patternType === 'jwt') return 'token';
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  if (['pem', 'crt', 'key', 'cert'].includes(ext)) return 'certificate';
  return 'api_key';
}

export function inferEnvironment(filePath: string): SecretEnv {
  const lower = filePath.toLowerCase();
  if (lower.includes('prod') || lower.includes('production')) return 'production';
  if (lower.includes('staging') || lower.includes('stage')) return 'staging';
  if (lower.includes('dev') || lower.includes('development') || lower.includes('local')) return 'development';
  return 'unknown';
}

export function fileTypeIcon(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    env: '🟡', json: '🔵', yaml: '🟠', yml: '🟠',
    pem: '⚫', key: '⚫', crt: '⚫', cert: '⚫',
    sh: '🔴', bash: '🔴', txt: '⚪',
  };
  return map[ext] ?? '⬛';
}

export function expiryStatus(expiresAt: string): 'ok' | 'warn' | 'danger' | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = ms / 86400000;
  if (days < 0) return 'danger';
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warn';
  return 'ok';
}

export function expiryDays(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}
