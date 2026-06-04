import { useState } from 'react';
import { useStore } from '../../store';

interface Tool {
  name: string;
  icon: string;
  type: 'terminal' | 'external';
  command?: string;
  url?: string;
}

const TOOLS: Tool[] = [
  { name: 'nmap',       icon: '🔭', type: 'terminal', command: 'nmap -sC -sV -oA nmap/initial {TARGET}' },
  { name: 'gobuster',   icon: '🌐', type: 'terminal', command: 'gobuster dir -u http://{TARGET} -w /usr/share/wordlists/dirb/common.txt' },
  { name: 'ffuf',       icon: '⚡', type: 'terminal', command: 'ffuf -u http://{TARGET}/FUZZ -w /usr/share/wordlists/dirb/common.txt' },
  { name: 'sqlmap',     icon: '💉', type: 'terminal', command: 'sqlmap -u "http://{TARGET}" --dbs --batch' },
  { name: 'netcat',     icon: '🔌', type: 'terminal', command: 'nc -lvnp 4444' },
  { name: 'john',       icon: '🔑', type: 'terminal', command: 'john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt' },
  { name: 'hashcat',    icon: '#',  type: 'terminal', command: 'hashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt' },
  { name: 'Burp Suite', icon: '🔬', type: 'external', url: '' },
  { name: 'CyberChef',  icon: '🍳', type: 'external', url: 'https://gchq.github.io/CyberChef/' },
];

interface ToolLauncherProps {
  onClose?: () => void;
}

export default function ToolLauncher({ onClose }: ToolLauncherProps) {
  const { tabs, activeTabId } = useStore();
  const tab = tabs.find(t => t.id === activeTabId);
  const session = tab?.session;
  const target = session?.target?.ip || session?.targetIp || '';

  const [copied, setCopied] = useState<string | null>(null);

  async function handleTool(tool: Tool) {
    if (tool.type === 'external') {
      if (tool.url) {
        try { await window.electronAPI.openExternal(tool.url); } catch {}
      }
      return;
    }
    // Terminal tool: emit via ecosystem-bus, also copy command
    const cmd = (tool.command || '').replace(/\{TARGET\}/g, target || 'TARGET');
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {}
    // Emit to TerminalLink via ecosystem-bus
    try {
      await window.electronAPI.ecosystemEmit('CyberLab', 'tool:launch', {
        tool: tool.name,
        command: cmd,
        target,
      });
    } catch {}
    setCopied(tool.name);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
        Tool Launcher
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {TOOLS.map(tool => (
          <button
            key={tool.name}
            className="flex flex-col items-center gap-1 py-2 px-1 rounded text-[10px] transition-colors"
            style={{
              background: copied === tool.name ? 'rgba(63,185,80,0.12)' : 'var(--bg3)',
              border: `1px solid ${copied === tool.name ? '#3fb950' : 'var(--border)'}`,
              color: copied === tool.name ? '#3fb950' : 'var(--text-dim)',
            }}
            onClick={() => handleTool(tool)}
            title={tool.type === 'terminal' ? (tool.command || '').replace(/\{TARGET\}/g, target || 'TARGET') : tool.url}
          >
            <span style={{ fontSize: 13 }}>{tool.icon}</span>
            <span>{copied === tool.name ? 'Copied!' : tool.name}</span>
          </button>
        ))}
      </div>
      {!target && (
        <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
          Set a target IP in session setup to auto-fill commands
        </p>
      )}
    </div>
  );
}
