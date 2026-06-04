import { useState } from 'react';
import type { SshProfile } from '../types/terminallink';

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
          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: adding ? 'var(--accent-dim)' : 'var(--bg)', border: `1px solid ${adding ? 'var(--accent)' : 'var(--border)'}`, color: adding ? 'var(--accent)' : 'var(--text-dim)', cursor: 'pointer' }}
        >
          + Add
        </button>
      </div>

      {adding && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 10, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
          <button onClick={handleAdd} style={{ padding: '5px 0', fontSize: 11, borderRadius: 3, background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer' }}>
            Save Profile
          </button>
        </div>
      )}

      {profiles.length === 0 && !adding && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>No SSH profiles yet</div>
      )}

      {profiles.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(42,51,71,0.5)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.username}@{p.host}:{p.port}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => onConnect(buildCmd(p))}
              style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, background: 'var(--accent)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 600 }}
            >
              Connect
            </button>
            <button
              onClick={() => onRemove(p.id)}
              style={{ fontSize: 10, padding: '3px 6px', borderRadius: 3, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--error)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const iStyle: React.CSSProperties = {
  width: '100%', background: 'var(--panel)', border: '1px solid var(--border)',
  borderRadius: 3, padding: '4px 6px', color: 'var(--text)', fontSize: 11,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
