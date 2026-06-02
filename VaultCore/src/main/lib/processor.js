'use strict';
// processor.js — Auto-tagging, auto-wikilinks, index generation, canvas, code extraction, frontmatter
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Cybersecurity Keyword Taxonomy (200+ keywords → tags) ────────────────────
const KEYWORD_TAXONOMY = {
  // Network Recon & Scanning
  'nmap': '#nmap', 'masscan': '#masscan', 'zmap': '#zmap', 'shodan': '#shodan',
  'censys': '#censys', 'netcat': '#netcat', 'nc': '#netcat', 'wireshark': '#wireshark',
  'tcpdump': '#tcpdump', 'tshark': '#tshark', 'arp-scan': '#arp-scan',
  'port scan': '#port-scanning', 'network scan': '#network-scanning',
  'banner grabbing': '#banner-grabbing', 'service enumeration': '#service-enumeration',
  'fingerprinting': '#fingerprinting', 'dns enumeration': '#dns-enumeration',
  'subdomain': '#subdomain-enumeration', 'vhost': '#vhost-enumeration',

  // Web Application Security
  'sql injection': '#sql-injection', 'sqli': '#sql-injection', 'sqlmap': '#sqlmap',
  'xss': '#xss', 'cross-site scripting': '#xss', 'stored xss': '#xss',
  'reflected xss': '#xss', 'dom xss': '#xss',
  'csrf': '#csrf', 'cross-site request forgery': '#csrf',
  'ssrf': '#ssrf', 'server-side request forgery': '#ssrf',
  'xxe': '#xxe', 'xml external entity': '#xxe',
  'open redirect': '#open-redirect', 'lfi': '#lfi', 'local file inclusion': '#lfi',
  'rfi': '#rfi', 'remote file inclusion': '#rfi',
  'path traversal': '#path-traversal', 'directory traversal': '#path-traversal',
  'file upload': '#file-upload', 'unrestricted upload': '#file-upload',
  'insecure deserialization': '#deserialization', 'deserialization': '#deserialization',
  'jwt': '#jwt', 'json web token': '#jwt', 'oauth': '#oauth',
  'cors': '#cors', 'idor': '#idor', 'broken access control': '#access-control',
  'authentication bypass': '#auth-bypass', 'session fixation': '#session-fixation',
  'clickjacking': '#clickjacking', 'ssti': '#ssti', 'template injection': '#ssti',
  'command injection': '#command-injection', 'rce': '#rce',
  'remote code execution': '#rce', 'code execution': '#rce',
  'burpsuite': '#burpsuite', 'burp suite': '#burpsuite',
  'nikto': '#nikto', 'dirb': '#dirb', 'gobuster': '#gobuster',
  'wfuzz': '#wfuzz', 'ffuf': '#ffuf', 'feroxbuster': '#feroxbuster',
  'nuclei': '#nuclei', 'owasp': '#owasp',
  'web application firewall': '#waf', 'waf bypass': '#waf-bypass',
  'subdomain takeover': '#subdomain-takeover', 'csp bypass': '#csp-bypass',

  // Active Directory
  'active directory': '#active-directory', 'kerberos': '#kerberos',
  'kerberoasting': '#kerberoasting', 'as-rep roasting': '#asreproasting',
  'asreproasting': '#asreproasting', 'pass the hash': '#pass-the-hash',
  'pth': '#pass-the-hash', 'pass the ticket': '#pass-the-ticket',
  'golden ticket': '#golden-ticket', 'silver ticket': '#silver-ticket',
  'dcsync': '#dcsync', 'dc sync': '#dcsync',
  'ntlm': '#ntlm', 'ntlm relay': '#ntlm-relay', 'responder': '#responder',
  'impacket': '#impacket', 'crackmapexec': '#crackmapexec', 'cme': '#crackmapexec',
  'bloodhound': '#bloodhound', 'sharphound': '#sharphound',
  'mimikatz': '#mimikatz', 'ldap': '#ldap', 'ldap injection': '#ldap-injection',
  'domain controller': '#domain-controller', 'smb': '#smb', 'smbclient': '#smb',
  'evil-winrm': '#evil-winrm', 'winrm': '#winrm',
  'group policy': '#group-policy', 'gpo': '#group-policy',
  'acl abuse': '#acl-abuse', 'delegation': '#kerberos-delegation',
  'unconstrained delegation': '#kerberos-delegation',
  'constrained delegation': '#kerberos-delegation',

  // Privilege Escalation
  'privilege escalation': '#privilege-escalation', 'privesc': '#privilege-escalation',
  'sudo': '#sudo-abuse', 'suid': '#suid', 'sgid': '#sgid',
  'capabilities': '#linux-capabilities', 'cron': '#cron-abuse',
  'crontab': '#cron-abuse', 'path hijacking': '#path-hijacking',
  'dll injection': '#dll-injection', 'dll hijacking': '#dll-hijacking',
  'token impersonation': '#token-impersonation', 'potato': '#potato-exploits',
  'juicy potato': '#potato-exploits', 'sweet potato': '#potato-exploits',
  'rogue potato': '#potato-exploits', 'printspoofer': '#printspoofer',
  'unquoted service path': '#unquoted-service-path',
  'weak service permissions': '#weak-service-permissions',
  'always install elevated': '#windows-privesc', 'seimpersonateprivilege': '#token-impersonation',

  // Exploitation & Shellcode
  'buffer overflow': '#buffer-overflow', 'bof': '#buffer-overflow',
  'stack overflow': '#buffer-overflow', 'heap overflow': '#heap-overflow',
  'format string': '#format-string', 'use after free': '#use-after-free',
  'uaf': '#use-after-free', 'heap spray': '#heap-spray',
  'rop': '#rop', 'rop chain': '#rop', 'ret2libc': '#ret2libc',
  'shellcode': '#shellcode', 'aslr': '#aslr', 'nx': '#nx',
  'dep': '#dep', 'pie': '#pie', 'stack canary': '#stack-canary',
  'metasploit': '#metasploit', 'msfvenom': '#msfvenom', 'msfconsole': '#metasploit',
  'pwntools': '#pwntools', 'gdb': '#gdb', 'peda': '#gdb',
  'ghidra': '#ghidra', 'ida pro': '#ida-pro', 'ida': '#ida-pro',
  'radare2': '#radare2', 'r2': '#radare2', 'binary ninja': '#binary-ninja',
  'reverse engineering': '#reverse-engineering', 'reversing': '#reverse-engineering',

  // Password Attacks
  'password cracking': '#password-cracking', 'hashcat': '#hashcat',
  'john': '#john-the-ripper', 'john the ripper': '#john-the-ripper',
  'hydra': '#hydra', 'medusa': '#medusa', 'brute force': '#bruteforce',
  'bruteforce': '#bruteforce', 'dictionary attack': '#dictionary-attack',
  'rainbow table': '#rainbow-table', 'hash': '#hashing',
  'password spray': '#password-spraying', 'credential stuffing': '#credential-stuffing',

  // Network Attacks
  'man in the middle': '#mitm', 'mitm': '#mitm',
  'arp spoofing': '#arp-spoofing', 'arp poisoning': '#arp-poisoning',
  'dns spoofing': '#dns-spoofing', 'ssl stripping': '#ssl-strip',
  'dhcp starvation': '#dhcp-attack', 'vlan hopping': '#vlan-hopping',
  'dos': '#denial-of-service', 'ddos': '#ddos',
  'syn flood': '#syn-flood', 'sniffing': '#packet-sniffing',

  // Malware & C2
  'malware': '#malware', 'ransomware': '#ransomware', 'trojan': '#trojan',
  'backdoor': '#backdoor', 'rootkit': '#rootkit', 'keylogger': '#keylogger',
  'spyware': '#spyware', 'adware': '#adware', 'botnet': '#botnet',
  'c2': '#c2', 'command and control': '#c2', 'cobalt strike': '#cobalt-strike',
  'meterpreter': '#meterpreter', 'payload': '#payload',
  'obfuscation': '#obfuscation', 'evasion': '#av-evasion',
  'antivirus bypass': '#av-evasion', 'amsi bypass': '#amsi-bypass',

  // Cryptography
  'aes': '#aes', 'rsa': '#rsa', 'ecc': '#ecc',
  'diffie-hellman': '#diffie-hellman', 'md5': '#md5',
  'sha': '#sha', 'bcrypt': '#bcrypt', 'cipher': '#cipher',
  'encryption': '#encryption', 'decryption': '#decryption',
  'cryptography': '#cryptography', 'padding oracle': '#padding-oracle',
  'ecb': '#ecb-mode', 'cbc': '#cbc-mode',

  // OSINT
  'osint': '#osint', 'maltego': '#maltego', 'recon-ng': '#recon-ng',
  'theharvester': '#theharvester', 'google dork': '#google-dorking',
  'dorking': '#google-dorking', 'linkedin': '#osint-linkedin',
  'social engineering': '#social-engineering', 'phishing': '#phishing',
  'spear phishing': '#spear-phishing', 'vishing': '#vishing',
  'smishing': '#smishing', 'pretexting': '#pretexting',

  // Forensics
  'volatility': '#volatility', 'autopsy': '#autopsy',
  'sleuth kit': '#sleuth-kit', 'memory forensics': '#memory-forensics',
  'disk forensics': '#disk-forensics', 'log analysis': '#log-analysis',
  'forensics': '#digital-forensics', 'incident response': '#incident-response',
  'ioc': '#indicators-of-compromise', 'timeline analysis': '#timeline-analysis',

  // CTF / Platforms
  'hackthebox': '#hackthebox', 'hack the box': '#hackthebox', 'htb': '#hackthebox',
  'tryhackme': '#tryhackme', 'thm': '#tryhackme',
  'ctf': '#ctf', 'picoctf': '#picoctf', 'pwn': '#pwn',
  'capture the flag': '#ctf', 'writeup': '#writeup',

  // Cloud & Infrastructure
  'aws': '#aws', 'azure': '#azure', 'gcp': '#gcp', 'cloud': '#cloud-security',
  'iam': '#iam', 'ec2': '#aws', 's3': '#aws-s3', 'lambda': '#serverless',
  'kubernetes': '#kubernetes', 'k8s': '#kubernetes', 'docker': '#docker',
  'container escape': '#container-escape', 'terraform': '#terraform',

  // Notable Vulnerabilities
  'log4shell': '#log4shell', 'log4j': '#log4shell',
  'heartbleed': '#heartbleed', 'shellshock': '#shellshock',
  'eternal blue': '#eternalblue', 'eternalblue': '#eternalblue',
  'zerologon': '#zerologon', 'printnightmare': '#printnightmare',
  'proxylogon': '#proxylogon', 'proxyshell': '#proxyshell',
  'spectre': '#spectre-meltdown', 'meltdown': '#spectre-meltdown',
  'dirty cow': '#dirtycow', 'dirtypipe': '#dirtypipe',

  // Frameworks & Methodologies
  'mitre att&ck': '#mitre-attack', 'mitre': '#mitre-attack',
  'kill chain': '#kill-chain', 'red team': '#red-team',
  'blue team': '#blue-team', 'purple team': '#purple-team',
  'penetration testing': '#pentest', 'pentest': '#pentest',
  'vulnerability assessment': '#vulnerability-assessment',
  'threat modeling': '#threat-modeling', 'attack surface': '#attack-surface',

  // Tools misc
  'subfinder': '#subfinder', 'amass': '#amass', 'assetfinder': '#assetfinder',
  'dirsearch': '#dirsearch', 'curl': '#curl', 'wget': '#wget',
  'ssh': '#ssh', 'ftp': '#ftp', 'telnet': '#telnet', 'snmp': '#snmp',
  'rpcclient': '#rpc', 'enum4linux': '#enum4linux', 'smbmap': '#smbmap',
  'ldapsearch': '#ldap', 'netstat': '#network-tools', 'ps aux': '#linux-commands'
};

// ─── Frontmatter Injection ────────────────────────────────────────────────────

function injectFrontmatter(page, config, plugins = []) {
  const now = new Date().toISOString();
  const title = page.title || 'Untitled';

  // Build tags array
  const tags = buildTags(page, config);

  // Build frontmatter
  const fm = {
    title,
    source_url: page.url || '',
    source_type: page.sourceType || config.sourceType || 'website',
    scraped_at: now,
    last_updated: now,
    tags,
    author: 'ItsEliias',
    vault_scraper_version: '1.0'
  };

  // CVE-specific fields
  if (page.meta) {
    Object.assign(fm, page.meta);
  }

  // Dataview compatibility
  if (plugins.includes('dataview')) {
    fm.type = page.sourceType || 'reference';
    fm.status = 'imported';
  }

  // Sort keys alphabetically
  const sorted = {};
  Object.keys(fm).sort().forEach(k => { sorted[k] = fm[k]; });

  const yamlLines = ['---'];
  for (const [k, v] of Object.entries(sorted)) {
    if (Array.isArray(v)) {
      if (v.length === 0) {
        yamlLines.push(`${k}: []`);
      } else {
        yamlLines.push(`${k}:`);
        for (const item of v) yamlLines.push(`  - ${item}`);
      }
    } else if (v === null || v === undefined) {
      yamlLines.push(`${k}: null`);
    } else if (typeof v === 'string' && (v.includes(':') || v.includes('#') || v.includes('"'))) {
      yamlLines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
    } else {
      yamlLines.push(`${k}: ${v}`);
    }
  }
  yamlLines.push('---');
  yamlLines.push('');

  return yamlLines.join('\n') + `# ${title}\n\n` + (page.content || '');
}

function buildTags(page, config) {
  const tags = [];

  // Source type tag
  const sourceTagMap = {
    'obsidian-publish': 'obsidian-publish',
    'website': 'web-reference',
    'github': 'github',
    'youtube': 'youtube',
    'pdf': 'pdf',
    'reddit': 'reddit-thread',
    'twitter': 'twitter-thread',
    'notion': 'notion',
    'medium': 'article',
    'cve': 'cve',
    'rss': 'rss'
  };

  const sourceType = page.sourceType || config.sourceType || 'website';
  if (sourceTagMap[sourceType]) tags.push(sourceTagMap[sourceType]);

  // CVE severity tag
  if (page.meta && page.meta.severity) {
    tags.push(`severity-${page.meta.severity.toLowerCase()}`);
    tags.push('cve');
    const affectedSoftware = page.meta.affected || [];
    for (const a of affectedSoftware.slice(0, 3)) {
      const safe = a.split('/')[1] || a;
      tags.push(safe.replace(/[^a-z0-9-]/gi, '-').toLowerCase());
    }
  }

  return [...new Set(tags)];
}

// ─── Tag Suggestion (for UI pre-save review) ─────────────────────────────────

const TAG_RULES = {
  '#web-security': ['xss', 'sql injection', 'csrf', 'ssrf', 'rce', 'lfi', 'rfi', 'path traversal'],
  '#network': ['nmap', 'port scan', 'firewall', 'proxy', 'vpn', 'dns', 'tcp', 'udp'],
  '#privilege-escalation': ['privesc', 'sudo', 'suid', 'cron', 'path hijacking', 'kernel exploit'],
  '#active-directory': ['kerberos', 'ldap', 'smb', 'pass the hash', 'mimikatz', 'bloodhound', 'dc'],
  '#cryptography': ['cipher', 'hash', 'rsa', 'aes', 'base64', 'jwt', 'ssl', 'tls'],
  '#tools': ['metasploit', 'burp suite', 'wireshark', 'gobuster', 'ffuf', 'hydra', 'john'],
  '#cve': ['cve-', 'vulnerability', 'exploit', 'patch', 'advisory'],
  '#linux': ['linux', 'bash', 'chmod', 'systemd', 'cron', '/etc/passwd'],
  '#windows': ['windows', 'powershell', 'registry', 'active directory', 'ntlm'],
};

function getSuggestedTags(rawContent) {
  const lower = (rawContent || '').toLowerCase();
  const matched = [];
  for (const [tag, keywords] of Object.entries(TAG_RULES)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        matched.push(tag);
        break;
      }
    }
  }
  return matched;
}

// ─── Auto-Tagging ─────────────────────────────────────────────────────────────

function autoTag(content, page) {
  // Extract existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return content;

  const fmContent = fmMatch[1];
  const body = content.slice(fmMatch[0].length);

  // Find all matching keywords in body
  const foundTags = new Set();
  const bodyLower = body.toLowerCase();

  for (const [keyword, tag] of Object.entries(KEYWORD_TAXONOMY)) {
    if (bodyLower.includes(keyword.toLowerCase())) {
      foundTags.add(tag);
    }
  }

  if (foundTags.size === 0) return content;

  // Parse existing tags
  const tagsMatch = fmContent.match(/^tags:\n((?:  - .*\n?)*)/m);
  const existingTags = new Set();

  if (tagsMatch) {
    const tagLines = tagsMatch[1].match(/  - (.+)/g) || [];
    for (const tl of tagLines) existingTags.add(tl.replace('  - ', '').trim());
  }

  // Merge and rebuild
  const allTags = [...existingTags, ...foundTags].filter((t, i, a) => a.indexOf(t) === i);

  let newFm = fmContent;
  if (tagsMatch) {
    const newTagsBlock = 'tags:\n' + allTags.map(t => `  - ${t}`).join('\n');
    newFm = newFm.replace(/^tags:\n(?:  - .*\n?)*/m, newTagsBlock + '\n');
  } else {
    newFm += '\ntags:\n' + allTags.map(t => `  - ${t}`).join('\n');
  }

  return `---\n${newFm}\n---\n` + body;
}

// ─── Auto-Wikilinks ───────────────────────────────────────────────────────────

async function autoWikilinks(vaultPath, outputFolder) {
  // Build index of all note titles in vault
  const noteIndex = buildNoteIndex(vaultPath);
  if (noteIndex.size === 0) return;

  // Process all markdown files in output folder
  function processFolder(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) processFolder(fullPath);
        else if (e.name.endsWith('.md')) {
          applyWikilinks(fullPath, noteIndex);
        }
      }
    } catch (_) {}
  }

  processFolder(outputFolder);
}

function buildNoteIndex(vaultPath) {
  const index = new Map(); // title (lowercase) → note title (display)
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) walk(fullPath);
        else if (e.name.endsWith('.md')) {
          const title = e.name.replace(/\.md$/, '');
          index.set(title.toLowerCase(), title);
        }
      }
    } catch (_) {}
  }
  walk(vaultPath);
  return index;
}

function applyWikilinks(filePath, noteIndex) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Split out frontmatter and code blocks — don't touch those
    const fmMatch = content.match(/^---[\s\S]*?---\n/);
    const frontmatter = fmMatch ? fmMatch[0] : '';
    let body = fmMatch ? content.slice(frontmatter.length) : content;

    // Replace mentions with wikilinks — protect code blocks
    const codeBlocks = [];
    body = body.replace(/```[\s\S]*?```/g, (match) => {
      const placeholder = `__CODEBLOCK_${codeBlocks.length}__`;
      codeBlocks.push(match);
      return placeholder;
    });

    // Also protect existing wikilinks
    const wikilinks = [];
    body = body.replace(/\[\[.*?\]\]/g, (match) => {
      const placeholder = `__WIKILINK_${wikilinks.length}__`;
      wikilinks.push(match);
      return placeholder;
    });

    // Apply wikilinks — only for notes with 3+ char titles to avoid false positives
    for (const [lowerTitle, displayTitle] of noteIndex.entries()) {
      if (displayTitle.length < 3) continue;
      if (displayTitle === path.basename(filePath, '.md')) continue; // Skip self

      // Word-boundary match (not inside existing links/wikilinks)
      const escapedTitle = displayTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![\\[|#])\\b(${escapedTitle})\\b(?![\\]|])`, 'gi');
      body = body.replace(regex, (match) => `[[${displayTitle}]]`);
    }

    // Restore code blocks and wikilinks
    codeBlocks.forEach((block, i) => { body = body.replace(`__CODEBLOCK_${i}__`, block); });
    wikilinks.forEach((wl, i) => { body = body.replace(`__WIKILINK_${i}__`, wl); });

    const newContent = frontmatter + body;
    if (newContent !== originalContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
    }
  } catch (e) {
    console.error('[processor] autoWikilinks error:', e.message);
  }
}

// ─── Index Note Generation ────────────────────────────────────────────────────

function generateIndexNote(outputFolder, config, stats) {
  const folderName = path.basename(outputFolder);
  const now = new Date().toISOString();

  // Collect all notes
  const sections = {};

  function collectNotes(dir, rel) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === '000 Index.md') continue;
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) {
          collectNotes(fullPath, path.join(rel, e.name));
        } else if (e.name.endsWith('.md')) {
          const section = rel || 'Root';
          if (!sections[section]) sections[section] = [];
          sections[section].push(e.name.replace(/\.md$/, ''));
        }
      }
    } catch (_) {}
  }

  collectNotes(outputFolder, '');

  const totalNotes = Object.values(sections).reduce((sum, arr) => sum + arr.length, 0);

  const lines = [
    `---`,
    `title: "000 Index — ${folderName}"`,
    `source_url: "${config.url || ''}"`,
    `source_type: "${config.sourceType || 'website'}"`,
    `last_updated: "${now}"`,
    `tags:`,
    `  - index`,
    `  - auto-generated`,
    `author: ItsEliias`,
    `vault_scraper_version: "1.0"`,
    `---`,
    ``,
    `# ${folderName} — Index`,
    ``,
    `> **Total notes:** ${totalNotes} | **Last updated:** ${new Date().toLocaleDateString()} | **Source:** ${config.url || 'N/A'}`,
    ``
  ];

  for (const [section, notes] of Object.entries(sections).sort()) {
    const displaySection = section === 'Root' ? folderName : section;
    lines.push(`## ${displaySection}`);
    lines.push('');
    for (const note of notes.sort()) {
      lines.push(`- [[${note}]]`);
    }
    lines.push('');
  }

  const indexPath = path.join(outputFolder, '000 Index.md');
  try {
    fs.mkdirSync(outputFolder, { recursive: true });
    fs.writeFileSync(indexPath, lines.join('\n'), 'utf8');
  } catch (e) {
    console.error('[processor] Index generation error:', e.message);
  }
}

// ─── Code Snippet Extraction ──────────────────────────────────────────────────

function extractCodeSnippets(outputFolder) {
  const snippetsFolder = path.join(outputFolder, 'Snippets');

  function processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const codeBlocks = [...content.matchAll(/```(\w*)\n([\s\S]*?)```/g)];

      if (codeBlocks.length === 0) return;

      const noteName = path.basename(filePath, '.md');
      const snippetPath = path.join(snippetsFolder, `${noteName} — Snippets.md`);

      const snippetLines = [
        `---`,
        `title: "${noteName} — Snippets"`,
        `source_note: "[[${noteName}]]"`,
        `tags:`,
        `  - snippets`,
        `  - code`,
        `---`,
        ``,
        `# ${noteName} — Code Snippets`,
        ``,
        `*Auto-extracted from [[${noteName}]]*`,
        ``
      ];

      codeBlocks.forEach(([, lang, code], idx) => {
        snippetLines.push(`## Snippet ${idx + 1}${lang ? ` (${lang})` : ''}`);
        snippetLines.push('');
        snippetLines.push(`\`\`\`${lang || ''}`);
        snippetLines.push(code.trim());
        snippetLines.push('```');
        snippetLines.push('');
      });

      fs.mkdirSync(snippetsFolder, { recursive: true });
      fs.writeFileSync(snippetPath, snippetLines.join('\n'), 'utf8');

      // Add snippets link to source note
      const sourceRef = `\n\n> See also: [[${noteName} — Snippets]]`;
      if (!content.includes(`${noteName} — Snippets`)) {
        fs.appendFileSync(filePath, sourceRef, 'utf8');
      }
    } catch (e) {
      console.error('[processor] Code extraction error:', e.message);
    }
  }

  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'Snippets') continue;
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) walk(fullPath);
        else if (e.name.endsWith('.md') && !e.name.endsWith('— Snippets.md')) {
          processFile(fullPath);
        }
      }
    } catch (_) {}
  }

  walk(outputFolder);
}

// ─── Canvas Generation ────────────────────────────────────────────────────────

async function generateCanvas(sourceName, outputFolder, vaultPath) {
  try {
    const notes = [];
    const noteIndex = {};
    let id = 1;

    function collectNotes(dir, subfolder) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name.startsWith('.')) continue;
          const fullPath = path.join(dir, e.name);
          if (e.isDirectory()) collectNotes(fullPath, e.name);
          else if (e.name.endsWith('.md') && !e.name.startsWith('000 Index')) {
            const title = e.name.replace(/\.md$/, '');
            const nodeId = `node_${id++}`;
            noteIndex[title.toLowerCase()] = nodeId;
            notes.push({
              id: nodeId,
              title,
              filePath: path.relative(vaultPath, fullPath),
              subfolder: subfolder || ''
            });
          }
        }
      } catch (_) {}
    }

    collectNotes(outputFolder, '');

    if (notes.length === 0) return false;

    // Layout: arrange by subfolder clusters
    const subfolders = [...new Set(notes.map(n => n.subfolder))];
    const subfolderOffsets = {};
    subfolders.forEach((sf, idx) => {
      subfolderOffsets[sf] = { x: idx * 700, y: 0 };
    });

    const nodes = notes.map((note, i) => {
      const sf = note.subfolder;
      const sfNotes = notes.filter(n => n.subfolder === sf);
      const sfIdx = sfNotes.indexOf(note);
      const cols = Math.ceil(Math.sqrt(sfNotes.length));
      const col = sfIdx % cols;
      const row = Math.floor(sfIdx / cols);
      const baseX = (subfolderOffsets[sf] || { x: 0 }).x;

      return {
        id: note.id,
        type: 'file',
        file: note.filePath.replace(/\\/g, '/'),
        x: baseX + col * 310,
        y: row * 200,
        width: 280,
        height: 150
      };
    });

    // Build edges from wikilinks
    const edges = [];
    let edgeId = 1;

    for (const note of notes) {
      try {
        const filePath = path.join(vaultPath, note.filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const wikilinks = [...content.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)];

        for (const [, target] of wikilinks) {
          const targetId = noteIndex[target.toLowerCase()];
          if (targetId && targetId !== note.id) {
            edges.push({
              id: `edge_${edgeId++}`,
              fromNode: note.id,
              fromSide: 'right',
              toNode: targetId,
              toSide: 'left'
            });
          }
        }
      } catch (_) {}
    }

    const canvas = { nodes, edges };
    const canvasPath = path.join(outputFolder, `${sanitizeFileName(sourceName)} Canvas.canvas`);
    fs.writeFileSync(canvasPath, JSON.stringify(canvas, null, 2), 'utf8');

    return true;
  } catch (e) {
    console.error('[processor] Canvas generation error:', e.message);
    return false;
  }
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 200) || 'Canvas';
}

module.exports = {
  injectFrontmatter,
  autoTag,
  getSuggestedTags,
  autoWikilinks,
  generateIndexNote,
  extractCodeSnippets,
  generateCanvas,
  KEYWORD_TAXONOMY
};
