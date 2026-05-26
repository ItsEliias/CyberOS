// ═══════════════════════════════════════════════════════════
//   GHOSTVAULT — templates.js
//   ItsEliias // v1.0 — General-purpose note templates
// ═══════════════════════════════════════════════════════════

'use strict';

const TEMPLATES = {

  customer: (ts) => `# Customer Call — [Name]

**Date:** ${ts}
**Contact Name:**
**Phone:**
**Email:**
**Company / Account:**

---

## Issue / Request

*What did they contact us about?*

---

## Details

*Notes from the conversation…*

---

## Actions Required

- [ ]

---

## Internal Notes

*Follow-up notes, context for the team, anything not to share with the customer.*

---

## Next Steps

**Follow up by:**
**Assigned to:**
`,

  meeting: (ts) => `# Meeting — [Topic]

**Date:** ${ts}
**Attendees:**
**Facilitator:**
**Location / Link:**

---

## Agenda

1.
2.
3.

---

## Notes

### Item 1



### Item 2



---

## Decisions Made

-

---

## Action Items

| Task | Owner | Due |
|------|-------|-----|
|      |       |     |

---

## Next Meeting

**Date:**
**Topics:**
`,

  project: (ts) => `# Project Update — [Project Name]

**Date:** ${ts}
**Status:** 🟢 On Track / 🟡 At Risk / 🔴 Blocked
**Owner:**
**Deadline:**

---

## Summary

*One paragraph overview of where things stand.*

---

## Progress This Week

-

---

## Blockers

-

---

## Next Steps

- [ ]
- [ ]
- [ ]

---

## Notes

`,

  study: (ts) => `# Study Notes — [Topic]

**Date:** ${ts}
**Source / Course:**
**Chapter / Section:**

---

## Key Concepts

-

---

## Notes

*Main content…*

---

## Examples

\`\`\`
// code or worked example here
\`\`\`

---

## Questions / Unclear Points

-

---

## Summary

*Summarise in your own words — what did you learn?*

---

## To Review

- [ ]
`,

  tasks: (ts) => `# Task List — ${ts}

---

## 🔴 Urgent / Today

- [ ]
- [ ]

---

## 🟡 This Week

- [ ]
- [ ]
- [ ]

---

## 🟢 Backlog

- [ ]
- [ ]

---

## ✅ Done

-

---

## Notes

`,

  quickthought: (ts) => `# Quick Thought — ${ts}

---

`,

  weekly: (ts) => `# Weekly Review — ${ts}

---

## What went well

-

---

## What could be better

-

---

## Key learnings

-

---

## Next week priorities

- [ ]
- [ ]
- [ ]

---

## Notes

`

};

// ─── CYBER TEMPLATES ─────────────────────────────────────────────────────────

TEMPLATES.htb = (ts) => `# HTB — Machine Name

> **IP:** \`10.10.x.x\` | **OS:** Linux/Windows | **Difficulty:** Easy/Medium/Hard | **Date:** ${ts}

---

## Enumeration

### Nmap

\`\`\`bash
nmap -sV -sC -oN nmap/initial 10.10.x.x
nmap -p- --min-rate 5000 -oN nmap/allports 10.10.x.x
\`\`\`

**Open Ports:**

| Port | Service | Version |
|------|---------|---------|
| 22   | SSH     |         |
| 80   | HTTP    |         |

---

## Credentials

| Username | Password | Service |
|----------|----------|---------|
|          |          |         |

---

## Exploitation

\`\`\`bash

\`\`\`

---

## Privilege Escalation

\`\`\`bash

\`\`\`

---

## Flags

- **User:** \`\`
- **Root:** \`\`

---

## Next Steps

- [ ] Initial recon
- [ ] Foothold
- [ ] User flag
- [ ] Root flag
`;

TEMPLATES.webapp = (ts) => `# Web App Recon — Target

> **URL:** \`https://\` | **Date:** ${ts} | **Scope:** Full / Limited

---

## Reconnaissance

\`\`\`bash
# Directory brute force
ffuf -u https://target/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-large-directories.txt

# Subdomain enum
subfinder -d target.com | tee subdomains.txt
\`\`\`

---

## Attack Surface

| Endpoint | Method | Parameters | Notes |
|----------|--------|------------|-------|
|          |        |            |       |

---

## Findings

### [Finding 1 — Severity: HIGH]

**Description:**

**PoC:**
\`\`\`bash

\`\`\`

**Impact:**

---

## Next Steps

- [ ] Authentication testing
- [ ] Authorization bypass
- [ ] Input validation
`;

TEMPLATES.privesc = (ts) => `# Privilege Escalation — ${ts}

> **Shell:** \`user@hostname\` | **OS:** Linux

---

## Checklist

\`\`\`bash
# SUID binaries
find / -perm -u=s -type f 2>/dev/null

# Sudo permissions
sudo -l

# Cron jobs
cat /etc/crontab; ls -la /etc/cron*

# Writable files
find / -writable -type f 2>/dev/null | grep -v /proc

# LinPEAS
curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh
\`\`\`

---

## Vector Found

**Method:**

\`\`\`bash

\`\`\`

---

## Next Steps

- [ ] Run LinPEAS
- [ ] Check SUID binaries
- [ ] Check sudo -l
- [ ] Check cron jobs
`;

TEMPLATES.enum = (ts) => `# Enumeration Notes — ${ts}

---

## Hosts / Ports

| IP | Port | Service | Version | Notes |
|----|------|---------|---------|-------|
|    |      |         |         |       |

---

## Credentials Found

| Username | Password / Hash | Service |
|----------|----------------|---------|
|          |                |         |

---

## Interesting Files

\`\`\`bash

\`\`\`

---

## Notes

-

---

## Next Steps

- [ ]
`;

TEMPLATES.exploit = (ts) => `# Exploit Notes — ${ts}

---

## Vulnerability

**CVE / Type:**
**Target:**
**Version:**

---

## Exploit

\`\`\`bash

\`\`\`

---

## Payload

\`\`\`bash

\`\`\`

---

## Output

\`\`\`

\`\`\`

---

## Notes

-
`;

TEMPLATES.recon = (ts) => `# Recon Report — Target

> **Target:** \`\` | **Date:** ${ts}

---

## Summary

*High-level findings.*

---

## Hosts Discovered

| IP | Hostname | OS | Ports | Notes |
|----|----------|----|-------|-------|
|    |          |    |       |       |

---

## DNS / Subdomains

\`\`\`

\`\`\`

---

## Web Assets

| URL | Tech Stack | Notes |
|-----|-----------|-------|
|     |           |       |

---

## Recommendations

1.
2.
`;

TEMPLATES.lab = (ts) => `# Lab Writeup — ${ts}

**Platform:**
**Lab / Room:**
**Difficulty:**

---

## Objective

---

## Steps Taken

### 1.

### 2.

### 3.

---

## Key Learnings

-

---

## Tools Used

-

---

## Flags / Proof

- **Flag:**
`;

// ─── PERSONAL TEMPLATES ───────────────────────────────────────────────────────

TEMPLATES.journal = (ts) => `# Journal — ${ts}

---

*How am I feeling today?*

---

## What happened

---

## Grateful for

-

---

## Reflection

---

## Plans / intentions

-
`;

TEMPLATES.braindump = (ts) => `# Brain Dump — ${ts}

---

`;

TEMPLATES.reminder = (ts) => `# Reminder — ${ts}

**When:**
**For:**

---

## Details

---

## Action needed

- [ ]
`;

TEMPLATES.shopping = (ts) => `# Shopping List — ${ts}

---

## Groceries

- [ ]

## Household

- [ ]

## Other

- [ ]
`;

TEMPLATES.idea = (ts) => `# Idea — ${ts}

---

## What is it?

---

## Why does it matter?

---

## How could it work?

---

## Next step

- [ ]
`;

TEMPLATES.studynotes = (ts) => `# Study Notes — ${ts}

**Topic:**
**Source:**

---

## Key Concepts

-

---

## Notes

---

## Examples

---

## Questions

-

---

## Summary

*In my own words...*
`;

TEMPLATES.general = (ts) => `# Note — ${ts}

---

`;

// ─── MODE INDEX ───────────────────────────────────────────────────────────────

const TEMPLATES_BY_MODE = {
  work:     ['customer', 'meeting', 'project', 'tasks', 'quickthought', 'weekly'],
  cyber:    ['htb', 'webapp', 'privesc', 'enum', 'exploit', 'recon', 'lab'],
  personal: ['journal', 'braindump', 'reminder', 'shopping', 'idea', 'studynotes', 'general'],
};

const TEMPLATE_LABELS = {
  // Work
  customer:    '📞 Customer Call',
  meeting:     '👥 Meeting Notes',
  project:     '📊 Project Update',
  tasks:       '✅ Task List',
  quickthought:'💭 Quick Thought',
  weekly:      '📅 Weekly Review',
  // Cyber
  htb:         '🎯 HTB Machine',
  webapp:      '🌐 Web App Recon',
  privesc:     '⬆️  PrivEsc Checklist',
  enum:        '🔍 Enumeration',
  exploit:     '💉 Exploit Notes',
  recon:       '🔭 Recon Report',
  lab:         '🧪 Lab Writeup',
  // Personal
  journal:     '📓 Journal Entry',
  braindump:   '🧠 Brain Dump',
  reminder:    '🔔 Reminder',
  shopping:    '🛒 Shopping List',
  idea:        '💡 Idea',
  studynotes:  '📚 Study Notes',
  general:     '📝 General Note',
};

// Export for use in renderer
if (typeof module !== 'undefined') module.exports = { TEMPLATES, TEMPLATES_BY_MODE, TEMPLATE_LABELS };
