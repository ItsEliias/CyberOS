/**
 * SessionsView — TerminalLink
 * Lists terminal sessions, SSH profiles, and recorded sessions with export.
 */
import { useState, useEffect } from 'react';
import type { TerminalSession, SshProfile, RecordedSession } from '../types/terminallink';
import SshManager from './SshManager';

/* ── Skeleton loader ── */
function SkeletonRow() {
  return (
    <div style={{
      padding: '10px 16px',
      borderBottom: '1px solid rgba(0,255,65,0.06)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{
        height: 10, borderRadius: 4, width: '55%',
        background: 'linear-gradient(90deg, rgba(0,255,65,0.06) 0%, rgba(0,255,65,0.12) 50%, rgba(0,255,65,0.06) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
      }} />
      <div style={{
        height: 8, borderRadius: 4, width: '35%',
        background: 'linear-gradient(90deg, rgba(0,255,65,0.04) 0%, rgba(0,255,65,0.09) 50%, rgba(0,255,65,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.4s ease-in-out 0.2s infinite',
      }} />
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 24px', gap: 16,
    }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.25 }}>
        <rect x="4" y="8" width="32" height="24" rx="3" stroke="#00ff41" strokeWidth="1.5" />
        <path d="M10 16l5 4-5 4" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="18" y1="24" x2="28" y2="24" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(0,255,65,0.5)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 6 }}>
          No sessions yet
        </p>
        <p style={{ fontSize: 10, color: 'rgba(0,255,65,0.25)', lineHeight: 1.6 }}>
          Start a new session to open a terminal.
        </p>
      </div>
      <button
        onClick={onNew}
        style={{
          marginTop: 4, fontSize: 10, padding: '6px 16px', borderRadius: 8,
          background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.35)',
          color: '#00ff41', cursor: 'pointer', fontFamily: 'var(--font-mono)',
          letterSpacing: '0.05em', fontWeight: 600,
          transition: 'all 0.15s cubic-bezier(0.2,0.8,0.2,1)',
          boxShadow: '0 0 0 rgba(0,255,65,0)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(0,255,65,0.18)';
          e.currentTarget.style.boxShadow = '0 0 12px rgba(0,255,65,0.2)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(0,255,65,0.1)';
          e.currentTarget.style.boxShadow = '0 0 0 rgba(0,255,65,0)';
        }}
      >
        + New Session
      </button>
    </div>
  );
}

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
  const [loading, setLoading] = useState(true);
  const sorted = [...sessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

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
              fontSize: 10, padding: '4px 12px', borderRadius: 8,
              background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.35)',
              color: '#00ff41', cursor: 'pointer', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em', fontWeight: 600,
              transition: 'all 0.15s cubic-bezier(0.2,0.8,0.2,1)',
              boxShadow: '0 0 0 rgba(0,255,65,0)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,255,65,0.18)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0,255,65,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(0,255,65,0.1)';
              e.currentTarget.style.boxShadow = '0 0 0 rgba(0,255,65,0)';
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : sorted.length === 0 ? (
            <EmptyState onNew={onNewSession} />
          ) : sorted.map(session => {
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
                  background: isActive ? `rgba(0,255,65,0.06)` : 'transparent',
                  transition: 'background 0.15s cubic-bezier(0.2,0.8,0.2,1), border-left-color 0.15s ease',
                  boxShadow: isActive ? `inset 2px 0 8px rgba(0,255,65,0.08)` : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(0,255,65,0.03)';
                    e.currentTarget.style.borderLeftColor = `rgba(0,255,65,0.3)`;
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: color, flexShrink: 0,
                      boxShadow: isActive ? `0 0 8px ${color}, 0 0 3px ${color}` : 'none',
                      transition: 'box-shadow 0.2s ease',
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
                      fontSize: 8, padding: '1px 6px', borderRadius: 4,
                      background: 'rgba(0,255,65,0.12)', color: '#00ff41',
                      border: '1px solid rgba(0,255,65,0.3)',
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
