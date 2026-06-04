/**
 * useAiParser — parses AI response text for ports, credentials, CVEs, flags.
 * Returns structured chips that can be saved to ReconDesk.
 */
import { useMemo } from 'react';

export interface ParsedPort {
  port: string;
  protocol: string;
  service?: string;
  raw: string;
}

export interface ParsedCred {
  username: string;
  password?: string;
  hash?: string;
  raw: string;
}

export interface ParsedCVE {
  id: string;
  raw: string;
}

export interface ParsedFlag {
  value: string;
  raw: string;
}

export interface AiParseResult {
  ports: ParsedPort[];
  credentials: ParsedCred[];
  cves: ParsedCVE[];
  flags: ParsedFlag[];
  hasAny: boolean;
}

// ── Patterns ──────────────────────────────────────────────────────────────────

const PORT_PATTERN_NMAP = /\b(\d{1,5})\/(tcp|udp)\s+(?:open\s+)?([a-zA-Z0-9\-_.]+)?/gi;
const PORT_PATTERN_PROSE = /\bport[s]?\s+(\d{1,5})(?:\s+(?:is\s+)?(?:open|running|listening|up))?/gi;
const CRED_PATTERN_SLASH  = /\bcredential[s]?[:\s]+([^\s/\n]+)\/([^\s,.\n]+)/gi;
const CRED_PATTERN_COLON  = /\busername[:\s]+([^\s\n]+).*?password[:\s]+([^\s\n,]+)/gis;
const CRED_USER_ONLY      = /\bUsername[:\s]+([^\s\n]+)/gi;
const HASH_PATTERN        = /\b([a-fA-F0-9]{32}(?:[a-fA-F0-9]{8})?(?:[a-fA-F0-9]{24})?(?:[a-fA-F0-9]{16})?)\b/g;
const CVE_PATTERN         = /\b(CVE-\d{4}-\d{4,7})\b/gi;
const FLAG_PATTERNS = [
  /HTB\{[^}]{1,200}\}/g,
  /THM\{[^}]{1,200}\}/g,
  /FLAG\{[^}]{1,200}\}/g,
  /picoCTF\{[^}]{1,200}\}/g,
  /ctf\{[^}]{1,200}\}/gi,
  /[a-zA-Z0-9_-]{2,10}\{[a-zA-Z0-9_\-+/=!@#$%^&*.,?]{4,200}\}/g,
];

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parsePorts(text: string): ParsedPort[] {
  const results: ParsedPort[] = [];

  // nmap-style: 80/tcp open http
  const nmapRe = new RegExp(PORT_PATTERN_NMAP.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = nmapRe.exec(text)) !== null) {
    const portNum = parseInt(m[1], 10);
    if (portNum < 1 || portNum > 65535) continue;
    results.push({
      port: m[1],
      protocol: m[2]?.toLowerCase() || 'tcp',
      service: m[3]?.toLowerCase() || undefined,
      raw: m[0],
    });
  }

  // prose: "port 22 is open"
  const proseRe = new RegExp(PORT_PATTERN_PROSE.source, 'gi');
  while ((m = proseRe.exec(text)) !== null) {
    const portNum = parseInt(m[1], 10);
    if (portNum < 1 || portNum > 65535) continue;
    results.push({ port: m[1], protocol: 'tcp', raw: m[0] });
  }

  return unique(results, r => r.port + r.protocol);
}

function parseCredentials(text: string): ParsedCred[] {
  const results: ParsedCred[] = [];

  const re1 = new RegExp(CRED_PATTERN_SLASH.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re1.exec(text)) !== null) {
    results.push({ username: m[1], password: m[2], raw: m[0] });
  }

  const re2 = new RegExp(CRED_PATTERN_COLON.source, 'gis');
  while ((m = re2.exec(text)) !== null) {
    results.push({ username: m[1], password: m[2], raw: m[0] });
  }

  const re3 = new RegExp(CRED_USER_ONLY.source, 'gi');
  while ((m = re3.exec(text)) !== null) {
    // Only add if not already captured by above
    if (!results.find(r => r.username === m![1])) {
      results.push({ username: m[1], raw: m[0] });
    }
  }

  return unique(results, r => r.username + (r.password || ''));
}

function parseCVEs(text: string): ParsedCVE[] {
  const results: ParsedCVE[] = [];
  const re = new RegExp(CVE_PATTERN.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push({ id: m[1].toUpperCase(), raw: m[0] });
  }
  return unique(results, r => r.id);
}

function parseFlags(text: string): ParsedFlag[] {
  const results: ParsedFlag[] = [];
  for (const pattern of FLAG_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(re);
    if (matches) {
      for (const match of matches) {
        results.push({ value: match, raw: match });
      }
    }
  }
  return unique(results, r => r.value);
}

export function parseAiResponse(text: string): AiParseResult {
  const ports = parsePorts(text);
  const credentials = parseCredentials(text);
  const cves = parseCVEs(text);
  const flags = parseFlags(text);
  return {
    ports,
    credentials,
    cves,
    flags,
    hasAny: ports.length > 0 || credentials.length > 0 || cves.length > 0 || flags.length > 0,
  };
}

export function useAiParser(text: string): AiParseResult {
  return useMemo(() => parseAiResponse(text), [text]);
}
