/**
 * SessionsView — TerminalLink
 * Lists terminal sessions, SSH profiles, and recorded sessions with export.
 */
import { useState } from 'react';
import type { TerminalSession, SshProfile, RecordedSession } from '../types/terminallink';
import SshManager from './SshManager';

interface Props {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  sshProfiles?: SshProfile[];
  onAddSsh?: (p: Omit<SshProfile, 'id'>) => void;
  onRemoveSsh?: (id: string) => void;
  onSshConnect?: (cmd: string) => void;
  recordedSessions?: RecordedSession[];
  onExportSession?: (s: RecordedSession, fmt: 'cast' | 'txt') => void;
}

type Tab = 'sessions' | 'ssh' | 'recordings';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function formatDuration(start: string, end?: string): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const s  = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function SessionsView({
  sessions, activeSessionId, onSelectSession, onNewSession,
  sshProfiles = [], onAddSsh, onRemoveSsh, onSshConnect,
  recordedSessions = [], onExportSession,
}: Props) {
  const [tab, setTab] = useState<Tab>('sessions');
  const sorted = [...sessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)' }}>
            Sessions
          </span>
          <button
            onClick={onNewSession}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 3, background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + New Session
          </button>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['sessions', 'ssh', 'recordings'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontSize: 10, padding: '4px 10px', background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions tab */}
      {tab === 'sessions' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {sorted.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No sessions yet. Start typing in the terminal.
            </div>
          )}
          {sorted.map(session => {
            const isActive = session.id === activeSessionId;
            const color = session.color ?? 'var(--accent)';
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--border)',
                  borderLeft: `3px solid ${isActive ? color : 'transparent'}`,
                  cursor: 'pointer', background: isActive ? 'rgba(0,255,65,0.03)' : 'transparent',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: isActive ? color : 'var(--text)', fontWeight: isActive ? 600 : 400 }}>
                      {session.name}
                    </span>
                  </div>
                  {isActive && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 2, background: 'rgba(0,255,65,0.15)', color: 'var(--accent)' }}>
                      active
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>{formatTime(session.startedAt)}</span>
                  <span>·</span>
                  <span>{session.commandCount} cmd{session.commandCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SSH tab */}
      {tab === 'ssh' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <SshManager
            profiles={sshProfiles}
            onConnect={cmd => onSshConnect?.(cmd)}
            onAdd={p => onAddSsh?.(p)}
            onRemove={id => onRemoveSsh?.(id)}
          />
        </div>
      )}

      {/* Recordings tab */}
      {tab === 'recordings' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {recordedSessions.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No recorded sessions yet. Sessions are recorded automatically.
            </div>
          )}
          {recordedSessions.map(rec => (
            <div
              key={rec.id}
              style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text)' }}>{rec.sessionName}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => onExportSession?.(rec, 'cast')}
                    style={{ fontSize: 9, padding: '2px 6px', borderRadius: 2, background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer' }}
                  >
                    .cast
                  </button>
                  <button
                    onClick={() => onExportSession?.(rec, 'txt')}
                    style={{ fontSize: 9, padding: '2px 6px', borderRadius: 2, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer' }}
                  >
                    .txt
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                <span>{formatTime(rec.startedAt)}</span>
                <span>·</span>
                <span>{formatDuration(rec.startedAt, rec.endedAt)}</span>
                <span>·</span>
                <span>{rec.events.length} events</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
