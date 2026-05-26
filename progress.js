// progress.js — Stats aggregation, achievement logic, skill tree, streak tracking

'use strict';

// ─── SKILL TREE ────────────────────────────────────────────────────────────────
const SKILL_TREE = {
  webSecurity: {
    label: 'Web Security',
    icon: '🌐',
    nodes: ['SQL Injection', 'XSS', 'SSRF', 'File Upload', 'Auth Bypass', 'API Hacking', 'IDOR', 'SSTI'],
    keywords: ['sql','xss','ssrf','file upload','upload','auth bypass','api','idor','ssti','web','http','burp','gobuster','ffuf','feroxbuster','nikto','sqlmap','wpscan']
  },
  network: {
    label: 'Network',
    icon: '📡',
    nodes: ['Port Scanning', 'Packet Analysis', 'MITM', 'Firewall Bypass', 'VPN/Tunnelling', 'Cisco/Networking', 'Protocol Analysis'],
    keywords: ['nmap','masscan','rustscan','pcap','wireshark','tcpdump','mitm','firewall','vpn','tunnel','cisco','port scan','network','snmp','dhcp']
  },
  activeDirectory: {
    label: 'Active Directory',
    icon: '🏰',
    nodes: ['Kerberoasting', 'AS-REP Roasting', 'Pass the Hash', 'BloodHound', 'GPO Abuse', 'DCSync', 'Silver/Golden Ticket'],
    keywords: ['kerberoast','asrep','pass the hash','bloodhound','gpo','dcsync','golden ticket','silver ticket','active directory','ldap','kerberos','mimikatz','impacket','crackmapexec']
  },
  privilegeEscalation: {
    label: 'Privilege Escalation',
    icon: '⬆️',
    nodes: ['SUID/SGID', 'Sudo Misconfig', 'Cron Jobs', 'PATH Hijacking', 'Kernel Exploits', 'Token Impersonation', 'DLL Hijacking'],
    keywords: ['suid','sgid','sudo','cron','path hijack','kernel exploit','token impersonation','dll hijack','linpeas','winpeas','privilege escalation','privesc','gtfobins']
  },
  cryptography: {
    label: 'Cryptography',
    icon: '🔐',
    nodes: ['Hash Cracking', 'Encoding/Decoding', 'RSA', 'AES', 'Classic Ciphers', 'JWT'],
    keywords: ['hash','crack','hashcat','john','base64','encode','decode','rsa','aes','cipher','jwt','crypto','md5','sha']
  },
  forensics: {
    label: 'Forensics',
    icon: '🔍',
    nodes: ['File Carving', 'Steganography', 'Memory Analysis', 'Log Analysis', 'PCAP Analysis'],
    keywords: ['forensic','stego','steganography','volatility','memory','log','pcap','binwalk','strings','file carv','autopsy','wireshark']
  },
  reverseEngineering: {
    label: 'Reverse Engineering',
    icon: '⚙️',
    nodes: ['Static Analysis', 'Dynamic Analysis', 'Buffer Overflow', 'ROP Chains', 'Debugging'],
    keywords: ['reverse','binary','elf','ghidra','ida','gdb','pwndbg','buffer overflow','bof','rop','objdump','strings','radare','pwn']
  },
  osint: {
    label: 'OSINT',
    icon: '🕵️',
    nodes: ['Username Recon', 'Metadata', 'Google Dorking', 'Social Engineering', 'Domain Intel'],
    keywords: ['osint','recon','sherlock','theharvester','exiftool','metadata','dork','social engineering','whois','shodan','censys','maltego']
  }
};

// ─── ACHIEVEMENTS ──────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  {
    id: 'first-blood',
    name: 'First Blood',
    icon: '🩸',
    description: 'Complete your first lab',
    check: (stats) => stats.totalCompleted >= 1
  },
  {
    id: 'script-kiddie',
    name: 'Script Kiddie No More',
    icon: '🛠️',
    description: 'Use 10 different tools across sessions',
    check: (stats) => stats.uniqueToolsUsed >= 10
  },
  {
    id: 'root-hunter',
    name: 'Root Hunter',
    icon: '👑',
    description: 'Root your first HTB machine',
    check: (stats) => stats.htbRooted >= 1
  },
  {
    id: 'speed-runner',
    name: 'Speed Runner',
    icon: '⚡',
    description: 'Complete a Medium box under 2 hours',
    check: (stats) => stats.fastestMedium !== null && stats.fastestMedium <= 120
  },
  {
    id: 'persistence-7',
    name: 'Persistence',
    icon: '🔥',
    description: '7 day streak',
    check: (stats) => stats.currentStreak >= 7
  },
  {
    id: 'on-a-roll',
    name: 'On a Roll',
    icon: '🎯',
    description: '30 day streak',
    check: (stats) => stats.currentStreak >= 30
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    icon: '🚀',
    description: '90 day streak',
    check: (stats) => stats.currentStreak >= 90
  },
  {
    id: 'web-warrior',
    name: 'Web Warrior',
    icon: '🌐',
    description: 'Complete 5 web-focused labs',
    check: (stats) => stats.webLabsCompleted >= 5
  },
  {
    id: 'ad-destroyer',
    name: 'AD Destroyer',
    icon: '🏰',
    description: 'Complete 3 Active Directory labs',
    check: (stats) => stats.adLabsCompleted >= 3
  },
  {
    id: 'flag-collector',
    name: 'Flag Collector',
    icon: '🚩',
    description: 'Capture 25 total flags',
    check: (stats) => stats.totalFlags >= 25
  },
  {
    id: 'polyglot',
    name: 'Polyglot',
    icon: '🌍',
    description: 'Complete labs on 3 different platforms',
    check: (stats) => stats.platformsUsed >= 3
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    icon: '🦉',
    description: 'Complete a lab between midnight and 5am',
    check: (stats) => stats.nightOwlCount >= 1
  },
  {
    id: 'no-hints',
    name: 'No Hints Needed',
    icon: '🧠',
    description: 'Complete a full lab at hint level 1 throughout',
    check: (stats) => stats.noHintCompletions >= 1
  },
  {
    id: 'teach-yourself',
    name: 'Teach Yourself',
    icon: '📚',
    description: 'Use Teach Me Mode for an entire session',
    check: (stats) => stats.teachMeSessions >= 1
  },
  {
    id: 'clean-methodology',
    name: 'Clean Methodology',
    icon: '✅',
    description: 'Complete a lab with all methodology phases ticked in order',
    check: (stats) => stats.cleanMethodologyCount >= 1
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    icon: '💨',
    description: 'Complete an Easy box under 30 minutes',
    check: (stats) => stats.fastestEasy !== null && stats.fastestEasy <= 30
  },
  {
    id: 'encyclopaedia',
    name: 'Encyclopaedia',
    icon: '📖',
    description: 'Unlock 15 skill tree nodes',
    check: (stats) => stats.unlockedNodes >= 15
  },
  {
    id: 'veteran',
    name: 'Veteran',
    icon: '🎖️',
    description: 'Complete 50 labs total',
    check: (stats) => stats.totalCompleted >= 50
  },
];

// ─── STATE ─────────────────────────────────────────────────────────────────────
let progressData = {
  sessions: [],
  achievements: {},
  streak: { current: 0, longest: 0, lastDate: null },
  skillNodes: {},
};

function load(data) {
  if (data && typeof data === 'object') {
    progressData = {
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      achievements: data.achievements || {},
      streak: data.streak || { current: 0, longest: 0, lastDate: null },
      skillNodes: data.skillNodes || {},
    };
  }
}

function addSession(session) {
  if (!session || !session.id) return;
  const existing = progressData.sessions.findIndex(s => s.id === session.id);
  const summary = {
    id: session.id,
    labName: session.labName,
    platform: session.platform,
    difficulty: session.difficulty,
    duration: session.duration,
    durationMinutes: session.durationMinutes,
    flagsCaptured: session.flagsCaptured || 0,
    toolsUsed: session.toolsUsed || [],
    commandsCopied: session.commandsCopied || 0,
    methodologyCompleted: session.methodologyCompleted || [],
    maxHintLevel: session.maxHintLevel || 1,
    usedTeachMe: session.usedTeachMe || false,
    completedAt: session.completedAt || new Date().toISOString(),
    techniques: session.techniques || [],
    patternCount: session.patternCount || 0,
    cleanMethodology: session.cleanMethodology || false,
    completedHour: new Date(session.completedAt || Date.now()).getHours(),
  };
  if (existing >= 0) {
    progressData.sessions[existing] = summary;
  } else {
    progressData.sessions.push(summary);
  }
  updateStreak();
  updateSkillNodes(summary);
}

function updateStreak() {
  const today = new Date().toDateString();
  const lastDate = progressData.streak.lastDate;

  if (!lastDate) {
    progressData.streak.current = 1;
    progressData.streak.lastDate = today;
  } else if (lastDate === today) {
    // Same day — no change
  } else {
    const last = new Date(lastDate);
    const now = new Date();
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      progressData.streak.current++;
    } else if (diffDays > 1) {
      progressData.streak.current = 1;
    }
    progressData.streak.lastDate = today;
  }
  if (progressData.streak.current > progressData.streak.longest) {
    progressData.streak.longest = progressData.streak.current;
  }
}

function updateSkillNodes(session) {
  const text = [
    session.labName,
    session.platform,
    ...(session.toolsUsed || []),
    ...(session.techniques || []),
  ].join(' ').toLowerCase();

  Object.entries(SKILL_TREE).forEach(([domain, cfg]) => {
    const matches = cfg.keywords.some(kw => text.includes(kw));
    if (matches) {
      if (!progressData.skillNodes[domain]) progressData.skillNodes[domain] = new Set();
      // Award relevant sub-nodes
      cfg.nodes.forEach(node => {
        const nodeKw = node.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (text.includes(node.toLowerCase()) || text.includes(nodeKw)) {
          if (!progressData.skillNodes[domain]) progressData.skillNodes[domain] = new Set();
          progressData.skillNodes[domain].add(node);
        }
      });
      // Award at least 1 node for domain-level match
      if (!progressData.skillNodes[domain].size) {
        progressData.skillNodes[domain].add(cfg.nodes[0]);
      }
    }
  });

  // Serialize sets to arrays for storage
  Object.keys(progressData.skillNodes).forEach(k => {
    if (progressData.skillNodes[k] instanceof Set) {
      progressData.skillNodes[k] = Array.from(progressData.skillNodes[k]);
    }
  });
}

function computeStats() {
  const sessions = progressData.sessions;
  const completed = sessions.filter(s => s.flagsCaptured > 0 || s.methodologyCompleted.includes('Flag Capture'));

  const uniqueTools = new Set(sessions.flatMap(s => s.toolsUsed || []));
  const platforms = new Set(sessions.map(s => s.platform).filter(Boolean));

  const htbRooted = sessions.filter(s =>
    s.platform === 'HTB' && (s.flagsCaptured >= 2 || s.methodologyCompleted.includes('Flag Capture'))
  ).length;

  const mediumTimes = sessions
    .filter(s => s.difficulty === 'Medium' && s.durationMinutes)
    .map(s => s.durationMinutes);
  const easyTimes = sessions
    .filter(s => s.difficulty === 'Easy' && s.durationMinutes)
    .map(s => s.durationMinutes);

  const allNodes = Object.values(progressData.skillNodes).flat();
  const uniqueNodes = new Set(allNodes);

  const platformCounts = {};
  sessions.forEach(s => { if (s.platform) platformCounts[s.platform] = (platformCounts[s.platform] || 0) + 1; });
  const favPlatform = Object.entries(platformCounts).sort((a,b) => b[1]-a[1])[0];

  const hardestByDiff = { Easy: 0, Medium: 0, Hard: 0, Insane: 0 };
  sessions.forEach(s => { if (s.difficulty) hardestByDiff[s.difficulty]++; });
  const hardest = ['Insane','Hard','Medium','Easy'].find(d => hardestByDiff[d] > 0) || null;

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  return {
    totalCompleted: completed.length,
    totalSessions: sessions.length,
    currentStreak: progressData.streak.current,
    longestStreak: progressData.streak.longest,
    totalTimeMinutes: totalMinutes,
    favouritePlatform: favPlatform ? favPlatform[0] : 'N/A',
    hardestCompleted: hardest || 'N/A',
    totalFlags: sessions.reduce((sum, s) => sum + (s.flagsCaptured || 0), 0),
    fastestMedium: mediumTimes.length ? Math.min(...mediumTimes) : null,
    fastestEasy: easyTimes.length ? Math.min(...easyTimes) : null,
    uniqueToolsUsed: uniqueTools.size,
    htbRooted,
    webLabsCompleted: sessions.filter(s => s.techniques && s.techniques.some(t => ['sql','xss','ssrf','web'].some(k => t.toLowerCase().includes(k)))).length,
    adLabsCompleted: sessions.filter(s => s.techniques && s.techniques.some(t => ['active directory','ad','kerberos','bloodhound'].some(k => t.toLowerCase().includes(k)))).length,
    platformsUsed: platforms.size,
    nightOwlCount: sessions.filter(s => s.completedHour >= 0 && s.completedHour < 5).length,
    noHintCompletions: sessions.filter(s => s.maxHintLevel <= 1 && s.flagsCaptured > 0).length,
    teachMeSessions: sessions.filter(s => s.usedTeachMe).length,
    cleanMethodologyCount: sessions.filter(s => s.cleanMethodology).length,
    unlockedNodes: uniqueNodes.size,
    platformCounts,
    difficultyBreakdown: hardestByDiff,
    timeSeriesData: buildTimeSeriesData(sessions),
    monthlyData: buildMonthlyData(sessions),
    skillCoverage: buildSkillCoverage(),
  };
}

function buildTimeSeriesData(sessions) {
  const byDiff = {};
  sessions.filter(s => s.durationMinutes).forEach(s => {
    const d = s.difficulty || 'Unknown';
    if (!byDiff[d]) byDiff[d] = [];
    byDiff[d].push({
      date: s.completedAt ? s.completedAt.slice(0, 10) : '',
      minutes: s.durationMinutes,
      name: s.labName,
    });
  });
  return byDiff;
}

function buildMonthlyData(sessions) {
  const monthly = {};
  sessions.forEach(s => {
    const month = s.completedAt ? s.completedAt.slice(0, 7) : 'Unknown';
    monthly[month] = (monthly[month] || 0) + 1;
  });
  return Object.entries(monthly)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));
}

function buildSkillCoverage() {
  const coverage = {};
  Object.entries(SKILL_TREE).forEach(([domain, cfg]) => {
    const unlocked = progressData.skillNodes[domain] || [];
    const pct = cfg.nodes.length ? Math.round((unlocked.length / cfg.nodes.length) * 100) : 0;
    coverage[domain] = {
      label: cfg.label,
      icon: cfg.icon,
      nodes: cfg.nodes,
      unlocked: Array.isArray(unlocked) ? unlocked : [],
      percentage: pct,
      level: pct < 30 ? 'Beginner' : pct < 70 ? 'Intermediate' : 'Advanced',
    };
  });
  return coverage;
}

function checkAchievements(stats) {
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach(ach => {
    if (!progressData.achievements[ach.id] && ach.check(stats)) {
      progressData.achievements[ach.id] = {
        unlockedAt: new Date().toISOString(),
      };
      newlyUnlocked.push(ach);
    }
  });
  return newlyUnlocked;
}

function getAchievementStatus() {
  return ACHIEVEMENTS.map(ach => ({
    ...ach,
    unlocked: !!progressData.achievements[ach.id],
    unlockedAt: progressData.achievements[ach.id]?.unlockedAt || null,
  }));
}

function formatDuration(minutes) {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function serialize() {
  // Ensure skillNodes are serializable arrays
  const skillNodes = {};
  Object.entries(progressData.skillNodes).forEach(([k, v]) => {
    skillNodes[k] = Array.isArray(v) ? v : Array.from(v);
  });
  return { ...progressData, skillNodes };
}

module.exports = {
  SKILL_TREE, ACHIEVEMENTS,
  load, addSession, updateStreak, computeStats,
  checkAchievements, getAchievementStatus,
  formatDuration, serialize
};
