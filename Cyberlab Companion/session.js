// session.js — Session state, autosave, [FINDING:type] parser, mistake tracker, writeup/summary export

'use strict';

const FINDING_TYPES = ['PORT', 'CRED', 'CVE', 'FLAG', 'FILE', 'SERVICE', 'USER', 'HASH'];

const FLAG_PATTERNS = [
  /HTB\{[^}]+\}/g,
  /THM\{[^}]+\}/g,
  /FLAG\{[^}]+\}/g,
  /picoCTF\{[^}]+\}/g,
  /ctf\{[^}]+\}/gi,
  /[a-zA-Z0-9_-]+\{[a-zA-Z0-9_\-+/=!@#$%^&*.,?]+\}/g,
];

const METHODOLOGY_PHASES = [
  'Reconnaissance',
  'Enumeration',
  'Exploitation',
  'Post-Exploitation',
  'Privilege Escalation',
  'Lateral Movement',
  'Flag Capture',
];

const METHODOLOGY_PHASES_OSINT = [
  'Passive Recon',
  'Active Recon',
  'Username/Identity Enumeration',
  'Metadata Analysis',
  'Domain/Infrastructure Intel',
  'Social Engineering Analysis',
  'Reporting',
];

const LAB_TYPES = ['HTB/THM Linux', 'HTB/THM Windows', 'CTF', 'Cisco/Networking', 'Web App', 'OSINT/CTF', 'Other'];

function createSession(opts = {}) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    labName: opts.labName || 'Unnamed Lab',
    platform: opts.platform || 'HTB',
    difficulty: opts.difficulty || 'Medium',
    labType: opts.labType || 'HTB/THM Linux',
    isOsint: opts.labType === 'OSINT/CTF',
    startTime: Date.now(),
    endTime: null,
    durationMinutes: 0,

    target: {
      ip: opts.ip || '',
      hostname: opts.hostname || '',
      os: opts.os || 'Unknown',
      notes: opts.notes || '',
    },

    findings: {
      ports: [],
      users: [],
      credentials: [],
      flags: [],
      cves: [],
      files: [],
      hashes: [],
      services: [],
      notes: '',
    },

    methodology: {
      phases: opts.labType === 'OSINT/CTF' ? [...METHODOLOGY_PHASES_OSINT] : [...METHODOLOGY_PHASES],
      completed: [],
      activePhase: null,
    },

    hintLevel: 1,
    teachMeMode: false,
    usedTeachMe: false,

    chat: [],
    toolsUsed: new Set(),
    commandsCopied: [],
    terminalOutputs: [],

    timer: {
      enabled: false,
      totalSeconds: 7200,
      elapsed: 0,
      running: false,
      overtime: false,
    },

    examMode: false,
    complete: false,

    mistakes: {
      repeatedCommands: {},
      skippedSteps: [],
      hintEscalations: {},
      methodologyBreaks: [],
    },

    autosavePath: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── FINDING PARSER ────────────────────────────────────────────────────────────
function parseFindings(text, session) {
  const found = [];
  const pattern = /\[FINDING:(\w+)\]\s*([^\n\[]+)/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const type = match[1].toUpperCase();
    const value = match[2].trim();
    if (!FINDING_TYPES.includes(type)) continue;
    found.push({ type, value });
    addFinding(session, type, value);
  }

  // Auto-detect flags
  FLAG_PATTERNS.forEach(re => {
    const flags = text.match(re);
    if (flags) {
      flags.forEach(f => {
        if (!session.findings.flags.find(existing => existing.value === f)) {
          addFinding(session, 'FLAG', f);
          found.push({ type: 'FLAG', value: f });
        }
      });
    }
  });

  return found;
}

function addFinding(session, type, value) {
  const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), value, addedAt: new Date().toISOString() };
  switch (type) {
    case 'PORT':    if (!session.findings.ports.find(f => f.value === value))       session.findings.ports.push(entry); break;
    case 'USER':    if (!session.findings.users.find(f => f.value === value))       session.findings.users.push(entry); break;
    case 'CRED':    if (!session.findings.credentials.find(f => f.value === value)) session.findings.credentials.push(entry); break;
    case 'FLAG':    if (!session.findings.flags.find(f => f.value === value))       session.findings.flags.push({ ...entry, validated: validateFlag(value) }); break;
    case 'CVE':     if (!session.findings.cves.find(f => f.value === value))        session.findings.cves.push(entry); break;
    case 'FILE':    if (!session.findings.files.find(f => f.value === value))       session.findings.files.push(entry); break;
    case 'HASH':    if (!session.findings.hashes.find(f => f.value === value))      session.findings.hashes.push(entry); break;
    case 'SERVICE': if (!session.findings.services.find(f => f.value === value))    session.findings.services.push(entry); break;
  }
  session.updatedAt = new Date().toISOString();
}

function removeFinding(session, type, id) {
  const key = { PORT:'ports', USER:'users', CRED:'credentials', FLAG:'flags', CVE:'cves', FILE:'files', HASH:'hashes', SERVICE:'services' }[type];
  if (!key) return;
  session.findings[key] = session.findings[key].filter(f => f.id !== id);
  session.updatedAt = new Date().toISOString();
}

function validateFlag(value) {
  return /^[a-zA-Z0-9_-]+\{[^\}]+\}$/.test(value);
}

// ─── MISTAKE TRACKER ───────────────────────────────────────────────────────────
function trackMistakes(session, event) {
  switch (event.type) {
    case 'command-copied': {
      const cmd = event.command.trim().toLowerCase();
      session.mistakes.repeatedCommands[cmd] = (session.mistakes.repeatedCommands[cmd] || 0) + 1;
      break;
    }
    case 'hint-escalated': {
      const topic = event.topic || 'general';
      session.mistakes.hintEscalations[topic] = (session.mistakes.hintEscalations[topic] || 0) + 1;
      break;
    }
    case 'phase-completed': {
      const phase = event.phase;
      const phaseIdx = session.methodology.phases.indexOf(phase);
      const completedBefore = session.methodology.completed;
      // Check if a later phase was completed before this one
      const laterCompleted = completedBefore.filter(p => session.methodology.phases.indexOf(p) > phaseIdx);
      if (laterCompleted.length > 0) {
        session.mistakes.methodologyBreaks.push({ phase, laterPhases: laterCompleted, at: new Date().toISOString() });
      }
      break;
    }
  }
}

function getMistakePatterns(session) {
  const patterns = [];

  // Repeated commands (>1 without different params)
  Object.entries(session.mistakes.repeatedCommands).forEach(([cmd, count]) => {
    if (count > 1) {
      patterns.push(`Ran the same command ${count} times: "${cmd.slice(0, 50)}..."`);
    }
  });

  // High hint escalations
  Object.entries(session.mistakes.hintEscalations).forEach(([topic, count]) => {
    if (count >= 2) {
      patterns.push(`Hint level escalated ${count}× on: ${topic}`);
    }
  });

  // Methodology order breaks
  session.mistakes.methodologyBreaks.forEach(b => {
    patterns.push(`Completed "${b.phase}" after already completing: ${b.laterPhases.join(', ')}`);
  });

  // Check for robots.txt skip (web boxes)
  const checkRobots = session.commandsCopied.some(c => c.command.includes('robots.txt'));
  const hasWebEnum = session.commandsCopied.some(c =>
    ['gobuster','ffuf','feroxbuster','dirb','nikto'].some(t => c.command.includes(t))
  );
  if (hasWebEnum && !checkRobots) {
    patterns.push('Web enumeration done but robots.txt was not explicitly checked');
  }

  return patterns;
}

function getElapsed(session) {
  const now = session.endTime || Date.now();
  return Math.floor((now - session.startTime) / 1000);
}

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─── SESSION SUMMARY ───────────────────────────────────────────────────────────
function buildSummary(session, weaknessNotes = '') {
  const elapsed = getElapsed(session);
  const minutes = Math.floor(elapsed / 60);

  return {
    id: session.id,
    labName: session.labName,
    platform: session.platform,
    difficulty: session.difficulty,
    duration: formatElapsed(elapsed),
    durationMinutes: minutes,
    startTime: new Date(session.startTime).toISOString(),
    completedAt: new Date().toISOString(),
    flagsCaptured: session.findings.flags.length,
    portsFound: session.findings.ports.length,
    credentialsFound: session.findings.credentials.length,
    toolsUsed: Array.from(session.toolsUsed),
    commandsCopied: session.commandsCopied.length,
    methodologyCompleted: session.methodology.completed,
    patterns: getMistakePatterns(session),
    maxHintLevel: session.hintLevel,
    usedTeachMe: session.usedTeachMe,
    weaknessNotes,
    cleanMethodology: session.methodology.completed.length === session.methodology.phases.length &&
      session.mistakes.methodologyBreaks.length === 0,
    techniques: inferTechniques(session),
  };
}

function inferTechniques(session) {
  const techniques = new Set();
  const text = session.chat.map(m => m.content || '').join(' ').toLowerCase();
  const techKeywords = {
    'SQL Injection': ['sqlmap', 'sql injection', 'sql inject', 'union select'],
    'XSS': ['xss', 'cross-site script'],
    'LFI/RFI': ['lfi', 'rfi', 'local file inclusion', 'remote file inclusion'],
    'SSRF': ['ssrf', 'server-side request'],
    'Privilege Escalation': ['linpeas', 'winpeas', 'privesc', 'privilege escalation', 'suid', 'sudo'],
    'Active Directory': ['bloodhound', 'kerberoast', 'impacket', 'crackmapexec', 'active directory'],
    'Hash Cracking': ['hashcat', 'john the ripper', 'hash crack'],
    'Reverse Shell': ['reverse shell', 'revshell', '/bin/bash', 'nc -lvnp'],
    'Port Scanning': ['nmap', 'masscan', 'rustscan'],
    'Web Enumeration': ['gobuster', 'ffuf', 'feroxbuster', 'dirb'],
    'SMB': ['smbclient', 'enum4linux', 'smb'],
    'Buffer Overflow': ['buffer overflow', 'bof', 'exploit'],
  };
  Object.entries(techKeywords).forEach(([tech, kws]) => {
    if (kws.some(kw => text.includes(kw))) techniques.add(tech);
  });
  return Array.from(techniques);
}

// ─── WRITEUP GENERATION ────────────────────────────────────────────────────────
function buildWriteupContext(session, summary) {
  const flags = session.findings.flags.map(f => f.value).join(', ') || 'Not captured';
  const commands = session.commandsCopied.map(c => c.command).join('\n');
  const findings = JSON.stringify({
    ports: session.findings.ports.map(p => p.value),
    users: session.findings.users.map(u => u.value),
    credentials: session.findings.credentials.map(c => c.value),
    cves: session.findings.cves.map(c => c.value),
    flags: session.findings.flags.map(f => f.value),
    services: session.findings.services.map(s => s.value),
    files: session.findings.files.map(f => f.value),
  }, null, 2);

  const chatContext = session.chat
    .filter(m => m.role === 'assistant')
    .map(m => `[AI Response]: ${(m.content || '').slice(0, 500)}`)
    .join('\n\n');

  return {
    labName: session.labName,
    platform: session.platform,
    difficulty: session.difficulty,
    labType: session.labType,
    targetIP: session.target.ip,
    targetOS: session.target.os,
    duration: summary.duration,
    completionDate: new Date().toISOString().slice(0, 10),
    methodologyCompleted: summary.methodologyCompleted.join(', '),
    techniques: summary.techniques.join(', '),
    flags,
    findings,
    commands,
    chatContext,
  };
}

function getWriteupSystemPrompt() {
  return `You are a technical writer producing a cybersecurity lab writeup for ItsEliias. Using only the successful findings, commands, and methodology phases from the session state provided, write a clean technical writeup in neutral voice.

Rules:
- Write only what succeeded — omit all failed attempts and hints received
- Never reference any AI, assistant, or hint system
- Write as if ItsEliias worked through this methodically and independently
- Infer logical thought process between steps for narrative coherence
- Every command in a fenced code block with correct language tag (bash, powershell, python, etc.)
- Include actual output snippets where session data contains them
- Be technical and precise — this is a reference document
- Write sections in exactly the order specified in the prompt
- Neutral voice throughout: "nmap revealed...", "directory enumeration uncovered...", "the service was vulnerable to..."

Writeup sections order:
1. YAML Frontmatter (title, date, platform, difficulty, author: ItsEliias, tags, completed: true, ip, time_to_complete)
2. Overview (2-3 sentences: box type, OS, key vulnerability theme)
3. Reconnaissance (initial scans, exact commands, what was found)
4. Enumeration (deeper service enumeration, key discoveries)
5. Exploitation (vulnerability, exact exploit, how initial access gained)
6. Post-Exploitation / Privilege Escalation (how root/admin achieved)
7. Flags (user flag and root flag, values and paths)
8. If I Did This Again (2-3 sentences on efficiency improvements)
9. Lessons Learned (3-5 bullet points of technical takeaways)

For CTF labs use: Overview, Challenge Description, Solution, Flag, Techniques Used, Lessons Learned
For Cisco/Networking: Overview, Topology, Configuration Steps, Verification Commands, Lessons Learned
For Web App labs: Overview, Reconnaissance, Vulnerability Discovery, Exploitation, Impact, Remediation Notes, Lessons Learned`;
}

// ─── AUTO-WIKILINK ─────────────────────────────────────────────────────────────
function applyWikilinks(writeupText, vaultNoteNames) {
  if (!vaultNoteNames || !vaultNoteNames.length) return writeupText;

  let result = writeupText;
  // Sort by length descending to match longer names first
  const sorted = [...vaultNoteNames].sort((a, b) => b.length - a.length);

  sorted.forEach(noteName => {
    // Don't double-wikilink, don't link inside code blocks
    const escaped = noteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match outside code blocks
    result = result.replace(
      new RegExp(`(?<!\\[\\[)(?<!\`[^\`]*)\\b(${escaped})\\b(?!\\]\\])`, 'gi'),
      (match) => `[[${noteName}]]`
    );
  });

  return result;
}

// ─── SERIALIZATION ─────────────────────────────────────────────────────────────
function serialize(session) {
  return {
    ...session,
    toolsUsed: Array.from(session.toolsUsed || []),
    updatedAt: new Date().toISOString(),
  };
}

function deserialize(data) {
  const session = { ...data };
  session.toolsUsed = new Set(Array.isArray(data.toolsUsed) ? data.toolsUsed : []);
  return session;
}

module.exports = {
  FINDING_TYPES, FLAG_PATTERNS, METHODOLOGY_PHASES, METHODOLOGY_PHASES_OSINT, LAB_TYPES,
  createSession, parseFindings, addFinding, removeFinding, validateFlag,
  trackMistakes, getMistakePatterns,
  getElapsed, formatElapsed,
  buildSummary, inferTechniques,
  buildWriteupContext, getWriteupSystemPrompt,
  applyWikilinks,
  serialize, deserialize,
};
