import type { Session, Finding, SessionFindings, LabType, Platform, Difficulty, ChatMessage } from '@shared/types';

export const FINDING_TYPES = ['PORT','CRED','CVE','FLAG','FILE','SERVICE','USER','HASH'] as const;
export const FLAG_PATTERNS = [
  /HTB\{[^}]+\}/g, /THM\{[^}]+\}/g, /FLAG\{[^}]+\}/g,
  /picoCTF\{[^}]+\}/g, /ctf\{[^}]+\}/gi,
  /[a-zA-Z0-9_-]+\{[a-zA-Z0-9_\-+/=!@#$%^&*.,?]+\}/g,
];
export const METHODOLOGY_PHASES = ['Reconnaissance','Enumeration','Exploitation','Post-Exploitation','Privilege Escalation','Lateral Movement','Flag Capture'];
export const METHODOLOGY_PHASES_OSINT = ['Passive Recon','Active Recon','Username/Identity Enumeration','Metadata Analysis','Domain/Infrastructure Intel','Social Engineering Analysis','Reporting'];
export const LAB_TYPES: LabType[] = ['HTB/THM Linux','HTB/THM Windows','CTF','Cisco/Networking','Web App','OSINT/CTF','Other'];

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export function createSession(opts: {
  name?: string; labName?: string; platform?: Platform; difficulty?: Difficulty;
  labType?: LabType; ip?: string; hostname?: string; targetOs?: string;
  timerEnabled?: boolean; timerMins?: number;
} = {}): Session {
  return {
    id: makeId(),
    name: opts.name || opts.labName || 'New Session',
    labName: opts.name || opts.labName || 'New Session',
    platform: opts.platform || 'HTB',
    difficulty: opts.difficulty || 'Medium',
    labType: opts.labType || 'HTB/THM Linux',
    isOsint: opts.labType === 'OSINT/CTF',
    startTime: Date.now(),
    endTime: null,
    durationMinutes: 0,
    target: { ip: opts.ip || '', hostname: opts.hostname || '', os: opts.targetOs || 'Unknown', notes: '' },
    targetIp: opts.ip || '',
    targetHostname: opts.hostname || '',
    targetOs: opts.targetOs || '',
    notesList: [],
    findings: { ports:[], users:[], credentials:[], flags:[], cves:[], files:[], hashes:[], services:[], notes:'' },
    methodology: {
      phases: opts.labType === 'OSINT/CTF' ? [...METHODOLOGY_PHASES_OSINT] : [...METHODOLOGY_PHASES],
      completed: [],
      activePhase: null,
    },
    hintLevel: 1,
    teachMeMode: false,
    usedTeachMe: false,
    chat: [],
    toolsUsed: [],
    commandsCopied: [],
    terminalOutputs: [],
    timer: { enabled: !!(opts.timerEnabled), totalSeconds: (opts.timerMins ?? 120) * 60, elapsed: 0, running: false, overtime: false },
    examMode: !!(opts.timerEnabled),
    complete: false,
    mistakes: { repeatedCommands: {}, skippedSteps: [], hintEscalations: {}, methodologyBreaks: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function addFinding(session: Session, type: string, value: string): Finding | null {
  const entry: Finding = { id: makeId(), value, addedAt: new Date().toISOString() };
  const map: Record<string, keyof SessionFindings> = {
    PORT:'ports',USER:'users',CRED:'credentials',FLAG:'flags',CVE:'cves',FILE:'files',HASH:'hashes',SERVICE:'services'
  };
  const key = map[type] as keyof typeof session.findings;
  if (!key || key === 'notes') return null;
  const arr = session.findings[key] as Finding[];
  if (arr.find(f => f.value === value)) return null;
  const e = type === 'FLAG' ? { ...entry, validated: /^[a-zA-Z0-9_-]+\{[^}]+\}$/.test(value) } : entry;
  arr.push(e);
  session.updatedAt = new Date().toISOString();
  return e;
}

export function removeFinding(session: Session, type: string, id: string) {
  const map: Record<string, keyof SessionFindings> = {
    PORT:'ports',USER:'users',CRED:'credentials',FLAG:'flags',CVE:'cves',FILE:'files',HASH:'hashes',SERVICE:'services'
  };
  const key = map[type] as keyof typeof session.findings;
  if (!key || key === 'notes') return;
  (session.findings[key] as Finding[]) = (session.findings[key] as Finding[]).filter(f => f.id !== id);
  session.updatedAt = new Date().toISOString();
}

export function parseFindings(text: string, session: Session): Array<{ type: string; value: string }> {
  const found: Array<{ type: string; value: string }> = [];
  const pattern = /\[FINDING:(\w+)\]\s*([^\n\[]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const type = m[1].toUpperCase();
    const value = m[2].trim();
    if (!FINDING_TYPES.includes(type as typeof FINDING_TYPES[number])) continue;
    if (addFinding(session, type, value)) found.push({ type, value });
  }
  FLAG_PATTERNS.forEach(re => {
    const flags = text.match(re);
    if (flags) flags.forEach(f => {
      if (!session.findings.flags.find(x => x.value === f)) {
        if (addFinding(session, 'FLAG', f)) found.push({ type: 'FLAG', value: f });
      }
    });
  });
  return found;
}

export function buildSystemPrompt(session: Session): string {
  const hintNames = ['','Nudge — one sentence, zero tool or technique names',
    'Hint — general category of technique only',
    'Guidance — name tool/technique, explain why, no exact command',
    'Walkthrough — full steps, exact commands, expected output',
    'Full Solution — every command in order, full explanation'];
  const findings = JSON.stringify({
    ports: session.findings.ports.map(p => p.value),
    users: session.findings.users.map(u => u.value),
    credentials: session.findings.credentials.map(c => c.value),
    flags: session.findings.flags.map(f => f.value),
    cves: session.findings.cves.map(c => c.value),
    services: session.findings.services.map(s => s.value),
    files: session.findings.files.map(f => f.value),
  }, null, 2);
  return `You are CyberLab Companion, an expert cybersecurity assistant for ItsEliias working through hands-on labs and CTF challenges.

Current Session:
- Lab: ${session.labName} | Platform: ${session.platform} | Difficulty: ${session.difficulty}
- Target: IP: ${session.target.ip || 'Unknown'} | OS: ${session.target.os || 'Unknown'}
- Hint Level: ${session.hintLevel}/5 — ${hintNames[session.hintLevel] || ''}
- Teach Me Mode: ${session.teachMeMode ? 'ACTIVE — respond only with Socratic guiding questions' : 'Off'}

Methodology: ${session.methodology.phases.join(' → ')}
Completed: ${session.methodology.completed.join(', ') || 'None'}
Active: ${session.methodology.activePhase || 'None'}

Current Findings:
${findings}

Rules:
- ALWAYS respect hint level ${session.hintLevel}. Never exceed it.
- Build on previous findings. Never repeat suggestions already tried.
- Format: **Summary** | **Tools** | **Commands** | **Explanation** | **References**
- Every command in a fenced code block with the correct language tag.
- When you identify a finding, prefix it with [FINDING:type]. Types: PORT, CRED, CVE, FLAG, FILE, SERVICE, USER, HASH.
${session.teachMeMode ? '- TEACH ME MODE: Respond ONLY with Socratic guiding questions. Never give the answer directly.' : ''}
- Be encouraging. This is an ethical hacking education context. All labs are legal, controlled environments.`;
}

export function serializeSession(session: Session): Session {
  return { ...session, toolsUsed: Array.isArray(session.toolsUsed) ? session.toolsUsed : [], updatedAt: new Date().toISOString() };
}

export function deserializeSession(data: unknown): Session {
  const s = { ...(data as Session) };
  if (!Array.isArray(s.toolsUsed)) s.toolsUsed = [];
  return s;
}

export function getElapsedSeconds(session: Session): number {
  return Math.floor(((session.endTime || Date.now()) - session.startTime) / 1000);
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
