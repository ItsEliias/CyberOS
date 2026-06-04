/**
 * SessionsView — TerminalLink
 * Lists terminal sessions, SSH profiles, and recorded sessions with export.
 */
import { useState, useEffect, useMemo } from 'react';
import type { TerminalSession, SshProfile, RecordedSession } from '../types/terminallink';
import SshManager from './SshManager';

/* ── Recent hosts derived from session names ─────────────────────────────── */
const KNOWN_RECENT_HOSTS = [
  { host: '10.10.11.2',   label: 'HTB Linux',   icon: '🐧' },
  { host: '10.10.11.50',  label: 'HTB Win',     icon: '🪟' },
  { host: '192.168.1.1',  label: 'Router',      icon: '📡' },
  { host: 'kali.local',   label: 'Kali',        icon: '💀' },
];

/* ── ANSI-like output snippet colorizer ──────────────────────────────────── */
function ColoredSnippet({ text }: { text: string }) {
  // Classify the snippet for color treatment
  const lower = text.toLowerCase();
  const isError   = /error|fail|denied|not found|exception|fatal/i.test(lower);
  const isSuccess = /ok|success|done|complete|connected|200/i.test(lower);
  const isPath    = /^\/|~\/|\.\//i.test(text.trimStart());
  const isWarn    = /warn|timeout|retry|skip/i.test(lower);

  const cls = isError ? 'ansi-error' : isSuccess ? 'ansi-success' : isPath ? 'ansi-path' : isWarn ? 'ansi-warn' : 'ansi-muted';

  return (
    <span className={cls} style={{
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130,
      fontStyle: 'italic', display: 'block',
    }}>
      {text}
    </span>
  );
}

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
  onQuickConnect?: (cmd: string) => void;
  sshProfiles?: SshProfile[];
  onAddSsh?: (p: Omit<SshProfile, 'id'>) => void;
  onRemoveSsh?: (id: string) => void;
  onSshConnect?: (cmd: string) => void;
  recordedSessions?: RecordedSession[];
  onExportSession?: (s: RecordedSession, fmt: 'cast' | 'txt') => void;
  /** Map of sessionId → last command string */
  lastCommands?: Record<string, string>;
}

type Tab = 'sessions' | 'ssh' | 'recordings';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

/** Detect session type from the session name / command */
function detectSessionType(name: string): 'SSH' | 'Telnet' | 'Serial' | 'Local' {
  const lc = name.toLowerCase();
  if (lc.includes('ssh') || lc.startsWith('ssh ')) return 'SSH';
  if (lc.includes('telnet')) return 'Telnet';
  if (lc.includes('/dev/') || lc.includes('serial') || lc.includes('com')) return 'Serial';
  return 'Local';
}

const SESSION_TYPE_COLORS: Record<string, string> = {
  SSH:    '#4a9eff',
  Telnet: '#d29922',
  Serial: '#b44fff',
  Local:  '#00ff41',
}

function SessionRow({ session, isActive, lastCmd, onSelect }: {
  session: TerminalSession;
  isActive: boolean;
  lastCmd?: string;
  onSelect: (id: string) => void;
}) {
  const color = session.color ?? '#00ff41';
  const sessionType = detectSessionType(session.name);
  const typeColor = SESSION_TYPE_COLORS[sessionType];
  const MOCK_CMDS: Record<string, string> = {
    SSH: 'ls -la /home', Telnet: 'show version', Serial: 'AT+CGMI', Local: 'pwd',
  };
  const previewCmd = lastCmd || MOCK_CMDS[sessionType] || 'ls -la';
  return (
    <div
      onClick={() => onSelect(session.id)}
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
          <span style={{ fontSize: 11, color: isActive ? color : '#7abf7a', fontWeight: isActive ? 600 : 400, letterSpacing: '0.03em' }}>
            {session.name}
          </span>
          <span style={{
            fontSize: 8, padding: '1px 5px', borderRadius: 3,
            background: `${typeColor}18`, color: typeColor,
            border: `1px solid ${typeColor}40`,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, flexShrink: 0,
          }}>
            {sessionType}
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
        <span>·</span>
        <ColoredSnippet text={`$ ${previewCmd}`} />
      </div>
    </div>
  );
}

function formatDuration(start: string, end?: string): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const s  = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function SessionsView({
  sessions, activeSessionId, onSelectSession, onNewSession,
  onQuickConnect,
  sshProfiles = [], onAddSsh, onRemoveSsh, onSshConnect,
  recordedSessions = [], onExportSession,
  lastCommands = {},
}: Props) {
  const [tab, setTab] = useState<Tab>('sessions');
  const [loading, setLoading] = useState(true);
  const [quickConnectVal, setQuickConnectVal] = useState('');
  const sorted = [...sessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  // Derive recent hosts: SSH profiles + hardcoded known hosts, deduplicated
  const recentHosts = useMemo(() => {
    const fromProfiles = sshProfiles.slice(0, 3).map(p => ({
      host: p.host, label: p.name, icon: '⇄',
    }));
    const merged = [...fromProfiles];
    for (const kh of KNOWN_RECENT_HOSTS) {
      if (!merged.some(h => h.host === kh.host)) merged.push(kh);
      if (merged.length >= 5) break;
    }
    return merged.slice(0, 5);
  }, [sshProfiles]);

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
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Quick Connect row */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid rgba(0,255,65,0.08)',
            background: 'rgba(0,255,65,0.02)',
            display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: 'rgba(0,255,65,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>ssh/cmd</span>
              <input
                value={quickConnectVal}
                onChange={e => setQuickConnectVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && quickConnectVal.trim()) {
                    onQuickConnect?.(quickConnectVal.trim());
                    setQuickConnectVal('');
                  }
                }}
                placeholder="Quick connect…"
                style={{
                  flex: 1, background: 'rgba(0,255,65,0.04)', border: '1px solid rgba(0,255,65,0.15)',
                  borderRadius: 6, padding: '4px 8px', color: '#c8ffc8',
                  fontSize: 10, fontFamily: 'var(--font-mono)', outline: 'none',
                }}
              />
              <button
                onClick={() => { if (quickConnectVal.trim()) { onQuickConnect?.(quickConnectVal.trim()); setQuickConnectVal(''); } }}
                style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 6,
                  background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.3)',
                  color: '#00ff41', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 600, flexShrink: 0,
                }}
              >
                ↵
              </button>
            </div>
            {/* Recent host chips */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', paddingBottom: 2 }}>
              {recentHosts.map(h => (
                <button
                  key={h.host}
                  className="recent-host-chip"
                  title={`ssh ${h.host}`}
                  onClick={() => {
                    const cmd = `ssh ${h.host}`;
                    onQuickConnect?.(cmd);
                  }}
                  style={{ fontFamily: 'var(--font-mono)', border: 'none', background: 'rgba(0,255,65,0.05)', color: 'rgba(0,255,65,0.6)' }}
                >
                  <span style={{ fontSize: 10 }}>{h.icon}</span>
                  <span>{h.label}</span>
                  <span style={{ opacity: 0.5, fontSize: 8 }}>{h.host}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : sorted.length === 0 ? (
              <EmptyState onNew={onNewSession} />
            ) : (
              <>
                {sorted.map(session => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSessionId}
                    lastCmd={lastCommands[session.id]}
                    onSelect={onSelectSession}
                  />
                ))}
              </>
            )}
          </div>
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
