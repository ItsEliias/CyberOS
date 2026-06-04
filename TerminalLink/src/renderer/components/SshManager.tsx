import { useState, useCallback } from 'react';
import type { SshProfile } from '../types/terminallink';

type TestState = 'idle' | 'pinging' | 'ok' | 'fail';

/** Per-profile connection test button with mock 1.5s latency */
function TestButton({ profileId }: { profileId: string }) {
  const [state, setState] = useState<TestState>('idle');

  const handleTest = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === 'pinging') return;
    setState('pinging');
    setTimeout(() => {
      // Mock: profile ids ending in even digit succeed, odd fail — purely visual
      const lastChar = profileId.slice(-1);
      const succeed = !['1', '3', '5', '7', '9'].includes(lastChar);
      setState(succeed ? 'ok' : 'fail');
      setTimeout(() => setState('idle'), 2500);
    }, 1500);
  }, [state, profileId]);

  const label =
    state === 'pinging' ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span className="ssh-test-spinner" style={{
          width: 8, height: 8, borderRadius: '50%',
          border: '1.5px solid rgba(74,158,255,0.3)',
          borderTopColor: '#4a9eff',
          display: 'inline-block',
          animation: 'spin 0.7s linear infinite',
        }} />
        ping…
      </span>
    ) : state === 'ok' ? (
      <span style={{ color: '#00ff41' }}>✓ ok</span>
    ) : state === 'fail' ? (
      <span style={{ color: '#f85149' }}>✕ fail</span>
    ) : (
      'Test'
    );

  const bg =
    state === 'ok'   ? 'rgba(0,255,65,0.1)' :
    state === 'fail' ? 'rgba(248,81,73,0.08)' :
    'rgba(74,158,255,0.08)';
  const border =
    state === 'ok'   ? '1px solid rgba(0,255,65,0.35)' :
    state === 'fail' ? '1px solid rgba(248,81,73,0.3)' :
    '1px solid rgba(74,158,255,0.3)';
  const color =
    state === 'ok'   ? '#00ff41' :
    state === 'fail' ? '#f85149' :
    '#4a9eff';

  return (
    <button
      onClick={handleTest}
      disabled={state === 'pinging'}
      title="Test connection (mock)"
      style={{
        fontSize: 10, padding: '4px 8px', borderRadius: 8,
        background: bg, border, color,
        cursor: state === 'pinging' ? 'default' : 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        opacity: state === 'pinging' ? 0.9 : 1,
      }}
    >
      {label}
    </button>
  );
}

interface Props {
  profiles: SshProfile[];
  onConnect: (cmd: string) => void;
  onAdd: (p: SshProfile) => void;
  onRemove: (id: string) => void;
}

const EMPTY: Omit<SshProfile, 'id'> = { name: '', host: '', port: 22, username: '', identityFile: '', options: '' };

export default function SshManager({ profiles, onConnect, onAdd, onRemove }: Props) {
  const [form,    setForm]    = useState(EMPTY);
  const [adding,  setAdding]  = useState(false);

  function buildCmd(p: SshProfile): string {
    const parts = ['ssh'];
    if (p.identityFile) parts.push('-i', p.identityFile);
    if (p.port && p.port !== 22) parts.push('-p', String(p.port));
    if (p.options) parts.push(p.options);
    parts.push(`${p.username}@${p.host}`);
    return parts.join(' ');
  }

  function handleAdd() {
    if (!form.name.trim() || !form.host.trim() || !form.username.trim()) return;
    onAdd({ ...form, id: `ssh-${Date.now()}` });
    setForm(EMPTY);
    setAdding(false);
  }

  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent)' }}>
          SSH Profiles
        </span>
        <button
          onClick={() => setAdding(a => !a)}
          style={{
            fontSize: 10, padding: '3px 10px', borderRadius: 8,
            background: adding ? 'var(--accent-dim)' : 'var(--bg)',
            border: `1px solid ${adding ? 'var(--accent)' : 'var(--border)'}`,
            color: adding ? 'var(--accent)' : 'var(--text-dim)', cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: adding ? '0 0 8px rgba(0,255,65,0.15)' : 'none',
          }}
        >
          + Add
        </button>
      </div>

      {adding && (
        <div style={{
          background: 'var(--bg)', border: '1px solid rgba(0,255,65,0.2)', borderRadius: 8,
          padding: 10, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {(['name', 'host', 'username', 'identityFile', 'options'] as const).map(k => (
            <input
              key={k}
              value={String(form[k] ?? '')}
              onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
              placeholder={k === 'identityFile' ? 'Identity file (optional)' : k === 'options' ? 'Extra options (optional)' : k}
              style={iStyle}
            />
          ))}
          <input
            type="number"
            value={form.port}
            onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
            placeholder="Port"
            style={iStyle}
          />
          <button
            onClick={handleAdd}
            style={{
              padding: '6px 0', fontSize: 11, borderRadius: 8,
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              color: 'var(--accent)', cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit', fontWeight: 600,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,255,65,0.2)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0,255,65,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--accent-dim)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Save Profile
          </button>
        </div>
      )}

      {profiles.length === 0 && !adding && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 18, marginBottom: 6, opacity: 0.3 }}>⇄</div>
          No SSH profiles yet
        </div>
      )}

      {profiles.map((p, idx) => {
        // Mock last-connected: alternate between "online" and "offline" per index for visual demo
        const isOnline = idx % 2 === 0;
        // Mock timestamp — in a real implementation this would come from profile metadata
        const mockLastConnected = idx === 0
          ? '2m ago'
          : idx === 1
          ? '1h ago'
          : `${idx + 1}d ago`;
        return (
        <div
          key={p.id}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            padding: '8px 0', borderBottom: '1px solid rgba(0,255,65,0.07)',
            transition: 'background 0.15s ease',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Status dot */}
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: isOnline ? '#00ff41' : 'rgba(0,255,65,0.2)',
                boxShadow: isOnline ? '0 0 5px rgba(0,255,65,0.6)' : 'none',
              }} />
              <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{p.name}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
              {p.username}@{p.host}:{p.port}
              <span style={{ marginLeft: 6, color: 'rgba(0,255,65,0.25)' }}>· last {mockLastConnected}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <TestButton profileId={p.id} />
            <button
              onClick={() => onConnect(buildCmd(p))}
              style={{
                fontSize: 10, padding: '4px 10px', borderRadius: 8,
                background: 'rgba(0,255,65,0.12)',
                border: '1px solid rgba(0,255,65,0.4)',
                color: '#00ff41', cursor: 'pointer', fontWeight: 600,
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0,255,65,0.22)';
                e.currentTarget.style.boxShadow = '0 0 10px rgba(0,255,65,0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0,255,65,0.12)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Connect
            </button>
            <button
              onClick={() => onRemove(p.id)}
              style={{
                fontSize: 10, padding: '4px 8px', borderRadius: 8,
                background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.25)',
                color: 'var(--error)', cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(248,81,73,0.15)';
                e.currentTarget.style.boxShadow = '0 0 8px rgba(248,81,73,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(248,81,73,0.06)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              ✕
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}

const iStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(5,10,4,0.8)', border: '1px solid rgba(0,255,65,0.18)',
  borderRadius: 6, padding: '5px 8px', color: 'var(--text)', fontSize: 11,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};
