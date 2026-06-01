const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

const TEMPLATES: Record<string, (ts: string) => string> = {
  customer: (ts) => `# Customer Call — [Name]\n\n**Date:** ${ts}\n**Contact Name:**\n**Phone:**\n**Email:**\n**Company / Account:**\n\n---\n\n## Issue / Request\n\n*What did they contact us about?*\n\n---\n\n## Details\n\n*Notes from the conversation…*\n\n---\n\n## Actions Required\n\n- [ ]\n\n---\n\n## Internal Notes\n\n---\n\n## Next Steps\n\n**Follow up by:**\n**Assigned to:**\n`,
  meeting: (ts) => `# Meeting — [Topic]\n\n**Date:** ${ts}\n**Attendees:**\n**Facilitator:**\n**Location / Link:**\n\n---\n\n## Agenda\n\n1.\n2.\n3.\n\n---\n\n## Notes\n\n---\n\n## Decisions Made\n\n-\n\n---\n\n## Action Items\n\n| Task | Owner | Due |\n|------|-------|-----|\n|      |       |     |\n\n---\n\n## Next Meeting\n\n**Date:**\n**Topics:**\n`,
  project: (ts) => `# Project Update — [Project Name]\n\n**Date:** ${ts}\n**Status:** 🟢 On Track / 🟡 At Risk / 🔴 Blocked\n**Owner:**\n**Deadline:**\n\n---\n\n## Summary\n\n---\n\n## Progress This Week\n\n-\n\n---\n\n## Blockers\n\n-\n\n---\n\n## Next Steps\n\n- [ ]\n- [ ]\n- [ ]\n`,
  tasks: (ts) => `# Task List — ${ts}\n\n---\n\n## 🔴 Urgent / Today\n\n- [ ]\n- [ ]\n\n---\n\n## 🟡 This Week\n\n- [ ]\n- [ ]\n- [ ]\n\n---\n\n## 🟢 Backlog\n\n- [ ]\n- [ ]\n\n---\n\n## ✅ Done\n\n-\n`,
  quickthought: (ts) => `# Quick Thought — ${ts}\n\n---\n\n`,
  weekly: (ts) => `# Weekly Review — ${ts}\n\n---\n\n## What went well\n\n-\n\n---\n\n## What could be better\n\n-\n\n---\n\n## Key learnings\n\n-\n\n---\n\n## Next week priorities\n\n- [ ]\n- [ ]\n- [ ]\n`,
  htb: (ts) => `# HTB — Machine Name\n\n> **IP:** \`10.10.x.x\` | **OS:** Linux/Windows | **Difficulty:** Easy/Medium/Hard | **Date:** ${ts}\n\n---\n\n## Enumeration\n\n### Nmap\n\n\`\`\`bash\nnmap -sV -sC -oN nmap/initial 10.10.x.x\n\`\`\`\n\n**Open Ports:**\n\n| Port | Service | Version |\n|------|---------|----------|\n| 22   | SSH     |         |\n| 80   | HTTP    |         |\n\n---\n\n## Credentials\n\n| Username | Password | Service |\n|----------|----------|---------|\n|          |          |         |\n\n---\n\n## Exploitation\n\n\`\`\`bash\n\n\`\`\`\n\n---\n\n## Privilege Escalation\n\n\`\`\`bash\n\n\`\`\`\n\n---\n\n## Flags\n\n- **User:** \`\`\n- **Root:** \`\`\n`,
  webapp: (ts) => `# Web App Recon — Target\n\n> **URL:** \`https://\` | **Date:** ${ts} | **Scope:** Full / Limited\n\n---\n\n## Reconnaissance\n\n\`\`\`bash\n# Directory brute force\nffuf -u https://target/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-large-directories.txt\n\`\`\`\n\n---\n\n## Attack Surface\n\n| Endpoint | Method | Parameters | Notes |\n|----------|--------|------------|-------|\n|          |        |            |       |\n\n---\n\n## Findings\n\n### [Finding 1 — Severity: HIGH]\n\n**Description:**\n\n**PoC:**\n\`\`\`bash\n\n\`\`\`\n\n**Impact:**\n`,
  privesc: (ts) => `# Privilege Escalation — ${ts}\n\n> **Shell:** \`user@hostname\` | **OS:** Linux\n\n---\n\n## Checklist\n\n\`\`\`bash\n# SUID binaries\nfind / -perm -u=s -type f 2>/dev/null\n\n# Sudo permissions\nsudo -l\n\n# Cron jobs\ncat /etc/crontab\n\`\`\`\n\n---\n\n## Vector Found\n\n**Method:**\n\n\`\`\`bash\n\n\`\`\`\n`,
  enum: (ts) => `# Enumeration Notes — ${ts}\n\n---\n\n## Hosts / Ports\n\n| IP | Port | Service | Version | Notes |\n|----|------|---------|---------|-------|\n|    |      |         |         |       |\n\n---\n\n## Credentials Found\n\n| Username | Password / Hash | Service |\n|----------|----------------|---------|\n|          |                |         |\n\n---\n\n## Interesting Files\n\n\`\`\`bash\n\n\`\`\`\n\n---\n\n## Next Steps\n\n- [ ]\n`,
  exploit: (ts) => `# Exploit Notes — ${ts}\n\n---\n\n## Vulnerability\n\n**CVE / Type:**\n**Target:**\n**Version:**\n\n---\n\n## Exploit\n\n\`\`\`bash\n\n\`\`\`\n\n---\n\n## Payload\n\n\`\`\`bash\n\n\`\`\`\n\n---\n\n## Output\n\n\`\`\`\n\n\`\`\`\n`,
  recon: (ts) => `# Recon Report — Target\n\n> **Target:** \`\` | **Date:** ${ts}\n\n---\n\n## Summary\n\n---\n\n## Hosts Discovered\n\n| IP | Hostname | OS | Ports | Notes |\n|----|----------|----|-------|-------|\n|    |          |    |       |       |\n\n---\n\n## DNS / Subdomains\n\n\`\`\`\n\n\`\`\`\n`,
  lab: (ts) => `# Lab Writeup — ${ts}\n\n**Platform:**\n**Lab / Room:**\n**Difficulty:**\n\n---\n\n## Objective\n\n---\n\n## Steps Taken\n\n### 1.\n\n### 2.\n\n---\n\n## Key Learnings\n\n-\n\n---\n\n## Flags / Proof\n\n- **Flag:**\n`,
  journal: (ts) => `# Journal — ${ts}\n\n---\n\n*How am I feeling today?*\n\n---\n\n## What happened\n\n---\n\n## Grateful for\n\n-\n\n---\n\n## Reflection\n\n---\n\n## Plans / intentions\n\n-\n`,
  braindump: (ts) => `# Brain Dump — ${ts}\n\n---\n\n`,
  reminder: (ts) => `# Reminder — ${ts}\n\n**When:**\n**For:**\n\n---\n\n## Details\n\n---\n\n## Action needed\n\n- [ ]\n`,
  idea: (ts) => `# Idea — ${ts}\n\n---\n\n## What is it?\n\n---\n\n## Why does it matter?\n\n---\n\n## How could it work?\n\n---\n\n## Next step\n\n- [ ]\n`,
  studynotes: (ts) => `# Study Notes — ${ts}\n\n**Topic:**\n**Source:**\n\n---\n\n## Key Concepts\n\n-\n\n---\n\n## Notes\n\n---\n\n## Examples\n\n---\n\n## Questions\n\n-\n\n---\n\n## Summary\n\n*In my own words...*\n`,
  general: (ts) => `# Note — ${ts}\n\n---\n\n`,
};

export const TEMPLATES_BY_MODE: Record<string, string[]> = {
  work    : ['customer', 'meeting', 'project', 'tasks', 'quickthought', 'weekly'],
  cyber   : ['htb', 'webapp', 'privesc', 'enum', 'exploit', 'recon', 'lab'],
  personal: ['journal', 'braindump', 'reminder', 'idea', 'studynotes', 'general'],
};

export const TEMPLATE_LABELS: Record<string, string> = {
  customer    : '📞 Customer Call',
  meeting     : '👥 Meeting Notes',
  project     : '📊 Project Update',
  tasks       : '✅ Task List',
  quickthought: '💭 Quick Thought',
  weekly      : '📅 Weekly Review',
  htb         : '🎯 HTB Machine',
  webapp      : '🌐 Web App Recon',
  privesc     : '⬆️ PrivEsc Checklist',
  enum        : '🔍 Enumeration',
  exploit     : '💉 Exploit Notes',
  recon       : '🔭 Recon Report',
  lab         : '🧪 Lab Writeup',
  journal     : '📓 Journal Entry',
  braindump   : '🧠 Brain Dump',
  reminder    : '🔔 Reminder',
  idea        : '💡 Idea',
  studynotes  : '📚 Study Notes',
  general     : '📝 General Note',
};

export function getTemplate(key: string): string {
  const fn = TEMPLATES[key];
  return fn ? fn(ts()) : `# Note — ${ts()}\n\n---\n\n`;
}
