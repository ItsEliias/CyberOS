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
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'rgba(5,10,4,0.98)', fontFamily: 'var(--font-mono)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px 0',
        borderBottom: '1px solid rgba(0,255,65,0.1)',
        flexShrink: 0,
        background: 'rgba(7,12,5,0.8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 2, height: 16, background: '#00ff41', borderRadius: 1, boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#00ff41' }}>
              Sessions
            </span>
          </div>
          <button
            onClick={onNewSession}
            style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 3,
              background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.35)',
              color: '#00ff41', cursor: 'pointer', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em', fontWeight: 600,
            }}
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
                fontSize: 10, padding: '5px 12px', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-mono)',
                color: tab === t ? '#00ff41' : 'rgba(0,255,65,0.35)',
                borderBottom: tab === t ? '2px solid #00ff41' : '2px solid transparent',
                textTransform: 'capitalize', letterSpacing: '0.05em',
                fontWeight: tab === t ? 600 : 400,
                transition: 'color 0.1s ease',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions tab */}
      {tab === 'sessions' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {sorted.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'rgba(0,255,65,0.25)', fontSize: 11 }}>
              No sessions yet.
            </div>
          )}
          {sorted.map(session => {
            const isActive = session.id === activeSessionId;
            const color = session.color ?? '#00ff41';
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(0,255,65,0.06)',
                  borderLeft: `2px solid ${isActive ? color : 'transparent'}`,
                  cursor: 'pointer',
                  background: isActive ? 'rgba(0,255,65,0.04)' : 'transparent',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,255,65,0.02)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: color, flexShrink: 0,
                      boxShadow: isActive ? `0 0 5px ${color}` : 'none',
                    }} />
                    <span style={{
                      fontSize: 11, color: isActive ? color : '#7abf7a',
                      fontWeight: isActive ? 600 : 400, letterSpacing: '0.03em',
                    }}>
                      {session.name}
                    </span>
                  </div>
                  {isActive && (
                    <span style={{
                      fontSize: 8, padding: '1px 6px', borderRadius: 2,
                      background: 'rgba(0,255,65,0.12)', color: '#00ff41',
                      textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
                    }}>
                      active
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: 'rgba(0,255,65,0.3)' }}>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {recordedSessions.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'rgba(0,255,65,0.25)', fontSize: 11 }}>
              No recorded sessions yet.
            </div>
          )}
          {recordedSessions.map(rec => (
            <div
              key={rec.id}
              style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,255,65,0.06)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#7abf7a', letterSpacing: '0.03em' }}>
                  {rec.sessionName}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => onExportSession?.(rec, 'cast')}
                    style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 2,
                      background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.3)',
                      color: '#00ff41', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 600,
                    }}
                  >
                    .cast
                  </button>
                  <button
                    onClick={() => onExportSession?.(rec, 'txt')}
                    style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 2,
                      background: 'rgba(0,255,65,0.04)', border: '1px solid rgba(0,255,65,0.12)',
                      color: 'rgba(0,255,65,0.5)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                    }}
                  >
                    .txt
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(0,255,65,0.3)', display: 'flex', gap: 8 }}>
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
