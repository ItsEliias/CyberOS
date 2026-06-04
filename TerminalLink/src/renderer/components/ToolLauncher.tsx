import { useState, useEffect } from 'react';
import { PENTEST_TOOLS, type PentestTool } from '../types/terminallink';

interface Props {
  onLaunch: (cmd: string) => void;
  onClose: () => void;
  target?: string;
}

export default function ToolLauncher({ onLaunch, onClose, target }: Props) {
  const [available, setAvailable] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function check() {
      const results: Record<string, boolean> = {};
      await Promise.all(PENTEST_TOOLS.map(async t => {
        try {
          results[t.id] = await window.electronAPI.checkBinary(t.binary);
        } catch {
          results[t.id] = false;
        }
      }));
      setAvailable(results);
    }
    check();
  }, []);

  function buildCmd(tool: PentestTool): string {
    const t = target || '$TARGET';
    let args = tool.args || '';
    args = args.replace('{target}', t).replace('{url}', t).replace('{ip}', t);
    return `${tool.binary}${args ? ' ' + args : ''}`;
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 80,
      }}
    >
      <div style={{
        width: 500, background: 'var(--panel)',
        border: '1px solid var(--accent)', borderRadius: 6,
        overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)' }}>
            Tool Launcher
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {target && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 6px' }}>
                TARGET: {target}
              </span>
            )}
            <button onClick={onClose} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {PENTEST_TOOLS.map(tool => {
            const isAvail = available[tool.id] ?? null;
            return (
              <button
                key={tool.id}
                onClick={() => { onLaunch(buildCmd(tool)); onClose(); }}
                disabled={isAvail === false}
                title={isAvail === false ? `${tool.binary} not found in PATH` : buildCmd(tool)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 4, cursor: isAvail === false ? 'not-allowed' : 'pointer',
                  background: 'var(--bg)', border: `1px solid ${isAvail ? 'var(--accent)' : 'var(--border)'}`,
                  opacity: isAvail === false ? 0.4 : 1, textAlign: 'left',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: isAvail === null ? 'var(--text-muted)' : isAvail ? 'var(--accent)' : 'var(--error)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isAvail === false ? 'var(--text-muted)' : 'var(--text)' }}>
                    {tool.name}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tool.description}
                  </div>
                </div>
                {isAvail === false && (
                  <span style={{ fontSize: 9, color: 'var(--error)', flexShrink: 0 }}>missing</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)' }}>
          Grayed out tools are not found in PATH. Click to launch in active terminal.
        </div>
      </div>
    </div>
  );
}
