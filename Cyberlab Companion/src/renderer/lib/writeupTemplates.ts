export const WRITEUP_TEMPLATES: Record<string, string> = {
  'HTB/THM Linux': `## Recon
### Port Scan
\`\`\`bash
nmap -sC -sV -oA nmap/initial {TARGET}
\`\`\`

## Enumeration
### Service Enumeration


### Web Enumeration


## Exploitation


## Post-Exploitation


## Privilege Escalation


## Flags
| Flag | Value |
|------|-------|
| User | |
| Root | |

## Lessons Learned

`,
  'HTB/THM Windows': `## Recon
### Port Scan
\`\`\`bash
nmap -sC -sV -oA nmap/initial {TARGET}
\`\`\`

## Enumeration
### SMB Enumeration


### Active Directory Recon


## Exploitation


## Lateral Movement


## Privilege Escalation


## Flags
| Flag | Value |
|------|-------|
| User | |
| Root | |

## Lessons Learned

`,
  'Web App': `## Recon
### Technology Stack


## Enumeration
### Directory Fuzzing
\`\`\`bash
gobuster dir -u http://{TARGET} -w /usr/share/wordlists/dirb/common.txt
\`\`\`

### Parameter Discovery


## Exploitation
### Vulnerability


### Proof of Concept


## Post-Exploitation


## Flags
| Flag | Value |
|------|-------|

## Lessons Learned

`,
  CTF: `## Challenge Info
**Category:**
**Points:**

## Analysis


## Solution
\`\`\`

\`\`\`

## Flag
\`\`\`

\`\`\`

## Approach


`,
  'OSINT/CTF': `## Target
**Subject:**
**Initial Info:**

## Passive Recon
### Username Lookup


### Metadata Analysis


## Active Recon


## Findings


## Flag / Answer


## Methodology Notes

`,
  'Cisco/Networking': `## Topology


## Enumeration
### Port Scan


### Protocol Analysis


## Vulnerability


## Exploitation


## Flags / Objectives


## Lessons Learned

`,
  Other: `## Recon


## Enumeration


## Exploitation


## Flags


## Lessons Learned

`,
};

export function getTemplate(labType: string, labName: string, platform: string, difficulty: string): string {
  const base = WRITEUP_TEMPLATES[labType] || WRITEUP_TEMPLATES['Other'];
  const date = new Date().toISOString().slice(0, 10);
  const header = `# ${labName} — ${platform} (${difficulty})\n**Date:** ${date}\n\n---\n\n`;
  return header + base.replace(/\{TARGET\}/g, '').trim() + '\n';
}
