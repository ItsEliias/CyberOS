// VaultCore — Tag Engine
// Auto-tags content using keyword rules. Scans full content, not just titles.

import type { TagRule } from '../types/vaultcore';

export const TAG_RULES: TagRule[] = [
  {
    category: 'web-security',
    tag: '#web-security',
    keywords: ['XSS', 'CSRF', 'SQL injection', 'SSRF', 'deserialization', 'path traversal'],
  },
  {
    category: 'network',
    tag: '#network',
    keywords: ['nmap', 'port scan', 'firewall', 'routing', 'TCP', 'UDP', 'packet'],
  },
  {
    category: 'privilege-escalation',
    tag: '#privilege-escalation',
    keywords: ['privesc', 'SUID', 'sudo', 'sudoers', 'cron', 'kernel exploit'],
  },
  {
    category: 'active-directory',
    tag: '#active-directory',
    keywords: ['Active Directory', 'Kerberos', 'LDAP', 'BloodHound', 'DCSync', 'Mimikatz', 'NTLM'],
  },
  {
    category: 'cryptography',
    tag: '#cryptography',
    keywords: ['encryption', 'hash', 'RSA', 'AES', 'cipher', 'JWT', 'certificate'],
  },
  {
    category: 'tools',
    tag: '#tools',
    keywords: ['Metasploit', 'Burp Suite', 'Wireshark', 'John', 'hashcat', 'Hydra', 'gobuster'],
  },
  {
    category: 'cve',
    tag: '#cve',
    keywords: ['CVE-', 'vulnerability', 'patch', 'zero-day', 'exploit'],
  },
  {
    category: 'linux',
    tag: '#linux',
    keywords: ['Linux', 'bash', '/etc/passwd', '/etc/shadow', 'chmod', 'iptables'],
  },
  {
    category: 'windows',
    tag: '#windows',
    keywords: ['Windows', 'registry', 'PowerShell', 'cmd.exe', 'WMI', 'Task Scheduler'],
  },
];

/**
 * Scan content (full text) against all tag rules.
 * Returns matched tags.
 */
export function detectTags(content: string, customRules?: TagRule[]): string[] {
  const rules = customRules ?? TAG_RULES;
  const matched = new Set<string>();

  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (content.includes(kw)) {
        matched.add(rule.tag);
        break;
      }
    }
  }

  return Array.from(matched);
}

/**
 * Build YAML frontmatter string for a note.
 */
export function buildFrontmatter(tags: string[], source: string, scrapedAt: string): string {
  const tagList = tags.map((t) => `  - "${t}"`).join('\n');
  return `---\ntags:\n${tagList}\nsource: "${source}"\nscraped_at: "${scrapedAt}"\n---\n\n`;
}

/**
 * Prepend frontmatter to note content, or replace existing frontmatter.
 */
export function applyFrontmatter(content: string, tags: string[], source: string): string {
  const fm = buildFrontmatter(tags, source, new Date().toISOString());
  if (content.startsWith('---')) {
    const end = content.indexOf('---', 3);
    if (end !== -1) {
      return fm + content.slice(end + 3).trimStart();
    }
  }
  return fm + content;
}
