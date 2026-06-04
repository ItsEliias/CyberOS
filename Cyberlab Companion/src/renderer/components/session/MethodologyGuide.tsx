import { useState, useEffect } from 'react';
import { useStore } from '../../store';

interface CheckItem { id: string; label: string; }
interface Phase { name: string; items: CheckItem[]; }

const METHODOLOGIES: Record<string, Phase[]> = {
  'Web': [
    { name: 'Recon', items: [
      { id: 'w1', label: 'Identify technologies (Wappalyzer, headers)' },
      { id: 'w2', label: 'Enumerate subdomains' },
      { id: 'w3', label: 'Directory/file bruteforce (gobuster/ffuf)' },
      { id: 'w4', label: 'Review source code & JS files' },
    ]},
    { name: 'Auth', items: [
      { id: 'w5', label: 'Test default credentials' },
      { id: 'w6', label: 'Check for auth bypass' },
      { id: 'w7', label: 'Test password reset flows' },
    ]},
    { name: 'Injection', items: [
      { id: 'w8', label: 'SQL injection (manual + sqlmap)' },
      { id: 'w9', label: 'XSS (reflected/stored/DOM)' },
      { id: 'w10', label: 'SSTI (Jinja2, Twig, etc.)' },
      { id: 'w11', label: 'Command injection' },
      { id: 'w12', label: 'SSRF / XXE' },
    ]},
    { name: 'Post-Exploit', items: [
      { id: 'w13', label: 'Read sensitive files via LFI' },
      { id: 'w14', label: 'Pivot to internal services' },
    ]},
  ],
  'Pwn': [
    { name: 'Binary Analysis', items: [
      { id: 'p1', label: 'Check protections (checksec)' },
      { id: 'p2', label: 'Identify binary type (ELF/PE/stripped)' },
      { id: 'p3', label: 'Static analysis (Ghidra/IDA)' },
      { id: 'p4', label: 'Identify vulnerable functions' },
    ]},
    { name: 'Dynamic Analysis', items: [
      { id: 'p5', label: 'Run with GDB/pwndbg' },
      { id: 'p6', label: 'Find offset for BOF' },
      { id: 'p7', label: 'Locate gadgets for ROP' },
    ]},
    { name: 'Exploit Dev', items: [
      { id: 'p8', label: 'Write exploit with pwntools' },
      { id: 'p9', label: 'Bypass PIE/ASLR/stack canary' },
      { id: 'p10', label: 'Get shell / read flag' },
    ]},
  ],
  'Crypto': [
    { name: 'Identification', items: [
      { id: 'c1', label: 'Identify cipher/encoding type' },
      { id: 'c2', label: 'Check for common encoding (base64/hex/ROT)' },
      { id: 'c3', label: 'Check for hash type (hashid)' },
    ]},
    { name: 'Attack', items: [
      { id: 'c4', label: 'Crack hash (hashcat/john)' },
      { id: 'c5', label: 'Analyse RSA parameters (n, e, c)' },
      { id: 'c6', label: 'Check for weak IV / padding oracle' },
      { id: 'c7', label: 'Look for patterns / repeated blocks' },
    ]},
  ],
  'Forensics': [
    { name: 'File Analysis', items: [
      { id: 'f1', label: 'Check file type (file, binwalk, strings)' },
      { id: 'f2', label: 'Look for embedded files (binwalk -e)' },
      { id: 'f3', label: 'Check metadata (exiftool)' },
    ]},
    { name: 'Stego', items: [
      { id: 'f4', label: 'Check for LSB steganography' },
      { id: 'f5', label: 'Try steghide / zsteg / stegseek' },
    ]},
    { name: 'Memory / PCAP', items: [
      { id: 'f6', label: 'Analyse memory dump (Volatility)' },
      { id: 'f7', label: 'Extract streams from PCAP (Wireshark)' },
      { id: 'f8', label: 'Look for credentials in traffic' },
    ]},
  ],
  'Rev': [
    { name: 'Static', items: [
      { id: 'r1', label: 'Decompile (Ghidra/IDA/Binary Ninja)' },
      { id: 'r2', label: 'Check strings (strings/floss)' },
      { id: 'r3', label: 'Identify packing/obfuscation' },
    ]},
    { name: 'Dynamic', items: [
      { id: 'r4', label: 'Run in sandbox / trace calls (strace/ltrace)' },
      { id: 'r5', label: 'Set breakpoints in debugger' },
      { id: 'r6', label: 'Patch binary to bypass checks' },
    ]},
  ],
  'OSINT': [
    { name: 'Passive', items: [
      { id: 'o1', label: 'Username search (sherlock/whatsmyname)' },
      { id: 'o2', label: 'Reverse image search' },
      { id: 'o3', label: 'Metadata analysis (exiftool)' },
    ]},
    { name: 'Active', items: [
      { id: 'o4', label: 'WHOIS / DNS lookups' },
      { id: 'o5', label: 'Shodan / Censys scan' },
      { id: 'o6', label: 'Social media analysis' },
    ]},
  ],
};

const DEFAULT_PHASES: Phase[] = [
  { name: 'Recon', items: [{ id: 'd1', label: 'Identify target & scope' }, { id: 'd2', label: 'Gather open-source intel' }]},
  { name: 'Enumeration', items: [{ id: 'd3', label: 'Port scan (nmap)' }, { id: 'd4', label: 'Service version detection' }]},
  { name: 'Exploitation', items: [{ id: 'd5', label: 'Identify vulnerabilities' }, { id: 'd6', label: 'Gain initial access' }]},
  { name: 'Post-Exploitation', items: [{ id: 'd7', label: 'Privilege escalation' }, { id: 'd8', label: 'Capture flag' }]},
];

function getMethodology(labType: string): Phase[] {
  const lt = (labType || '').toLowerCase();
  if (lt.includes('web')) return METHODOLOGIES['Web'];
  if (lt.includes('ctf')) return METHODOLOGIES['Crypto'] || DEFAULT_PHASES;
  if (lt.includes('osint')) return METHODOLOGIES['OSINT'];
  return DEFAULT_PHASES;
}

const STORAGE_KEY = 'cyberlab-methodology-';

export default function MethodologyGuide() {
  const { tabs, activeTabId } = useStore();
  const tab = tabs.find(t => t.id === activeTabId);
  const session = tab?.session;
  const sessionId = session?.id || 'default';

  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY + sessionId);
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY + sessionId, JSON.stringify(Array.from(checked)));
    } catch {}
  }, [checked, sessionId]);

  // Reset when session changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY + sessionId);
      setChecked(raw ? new Set(JSON.parse(raw)) : new Set());
    } catch { setChecked(new Set()); }
  }, [sessionId]);

  const phases = getMethodology(session?.labType || '');
  const allItems = phases.flatMap(p => p.items);
  const pct = allItems.length > 0 ? Math.round((checked.size / allItems.length) * 100) : 0;

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Methodology
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--accent)' }}>{pct}%</span>
      </div>

      {/* Overall progress */}
      <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: 'var(--bg3)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
      </div>

      {/* Phases */}
      <div className="space-y-2">
        {phases.map(phase => {
          const phaseChecked = phase.items.filter(i => checked.has(i.id)).length;
          return (
            <div key={phase.name}>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                {phase.name} ({phaseChecked}/{phase.items.length})
              </div>
              <div className="space-y-1">
                {phase.items.map(item => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2 cursor-pointer text-[11px]"
                    style={{ color: checked.has(item.id) ? 'var(--text-muted)' : 'var(--text-dim)' }}
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(item.id)}
                      onChange={() => toggle(item.id)}
                      style={{ accentColor: 'var(--accent)', marginTop: 2, flexShrink: 0 }}
                    />
                    <span style={{ textDecoration: checked.has(item.id) ? 'line-through' : 'none' }}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
