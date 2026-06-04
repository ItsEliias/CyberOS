import { useEffect, useState } from 'react';
import { formatElapsed } from '../../lib/session';
import type { Session } from '@shared/types';

type SortField = 'name' | 'platform' | 'date' | 'duration' | 'flags' | 'hints';
type SortDir   = 'asc' | 'desc';

const DIFF_COLORS: Record<string, string> = {
  Easy:   '#3fb950',
  Medium: '#d29922',
  Hard:   '#ff7a00',
  Insane: '#f85149',
};

const PLATFORM_COLORS: Record<string, string> = {
  HTB:    '#9fef00',
  THM:    '#ff4040',
  CTF:    '#b44fff',
  Client: '#4a9eff',
  Other:  '#8b949e',
};

export default function LabHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      try {
        const list = await window.electronAPI.listSessions() as Session[];
        if (Array.isArray(list)) {
          // Only show completed or sessions that have a real lab name
          const valid = list.filter(s =>
            s && s.labName && s.labName !== 'New Session' && s.labName !== 'new-session'
          );
          setSessions(valid);
        }
      } catch (e) {
        console.error('LabHistory load error:', e);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  const filtered = sessions.filter(s =>
    !filter || s.labName.toLowerCase().includes(filter.toLowerCase())
             || s.platform.toLowerCase().includes(filter.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let valA: string | number, valB: string | number;
    switch (sortField) {
      case 'name':     valA = a.labName; valB = b.labName; break;
      case 'platform': valA = a.platform; valB = b.platform; break;
      case 'date':     valA = a.startTime; valB = b.startTime; break;
      case 'duration': valA = a.timer?.elapsed ?? 0; valB = b.timer?.elapsed ?? 0; break;
      case 'flags':    valA = a.findings?.flags?.length ?? 0; valB = b.findings?.flags?.length ?? 0; break;
      case 'hints':    valA = a.hintsUsed ?? 0; valB = b.hintsUsed ?? 0; break;
      default:         valA = a.startTime; valB = b.startTime;
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });

  // Stats
  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((acc, s) => acc + (s.timer?.elapsed ?? 0), 0);
  const avgDuration = totalSessions > 0 ? Math.floor(totalDuration / totalSessions) : 0;

  function SortHeader({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field;
    return (
      <button
        className="flex items-center gap-1 text-left"
        style={{
          border: 'none',
          background: 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: 0,
          cursor: 'pointer',
        }}
        onClick={() => handleSort(field)}
      >
        {label}
        {active && <span style={{ opacity: 0.7 }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)' }}>
        <div className="w-5 h-5 border-2 rounded-full spinner" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary stats */}
      <div
        className="grid grid-cols-3 gap-px flex-shrink-0"
        style={{ background: 'var(--border)' }}
      >
        {[
          { label: 'Total Sessions', value: totalSessions },
          { label: 'Total Duration',  value: formatElapsed(totalDuration) || '0:00:00' },
          { label: 'Avg Duration',    value: formatElapsed(avgDuration) || '—' },
        ].map(s => (
          <div
            key={s.label}
            className="text-center py-3"
            style={{ background: 'var(--bg2)' }}
          >
            <div className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>{s.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}
      >
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by name or platform..."
          className="flex-1 text-xs"
        />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} session{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {filter ? 'No sessions match your filter.' : 'No sessions yet. Start a session to build your history.'}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Column headers */}
          <div
            className="grid px-4 py-2 sticky top-0 z-10"
            style={{
              gridTemplateColumns: '2fr 0.7fr 0.7fr 1fr 0.5fr 0.5fr 0.5fr',
              background: 'var(--bg2)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <SortHeader field="name"     label="Name" />
            <SortHeader field="platform" label="Platform" />
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Difficulty</div>
            <SortHeader field="date"     label="Date" />
            <SortHeader field="duration" label="Duration" />
            <SortHeader field="flags"    label="Flags" />
            <SortHeader field="hints"    label="Hints" />
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {sorted.map(session => {
              const isExpanded = expanded === session.id;
              const elapsed = session.timer?.elapsed ?? 0;
              const flagCount = session.findings?.flags?.length ?? 0;
              const portCount = session.findings?.ports?.length ?? 0;
              const credCount = session.findings?.credentials?.length ?? 0;
              const date = session.createdAt
                ? new Date(session.createdAt).toLocaleDateString()
                : session.startTime
                ? new Date(session.startTime).toLocaleDateString()
                : '—';

              return (
                <div key={session.id}>
                  <div
                    className="grid px-4 py-2.5 text-xs cursor-pointer transition-colors"
                    style={{
                      gridTemplateColumns: '2fr 0.7fr 0.7fr 1fr 0.5fr 0.5fr 0.5fr',
                      background: isExpanded ? 'var(--bg3)' : 'transparent',
                    }}
                    onClick={() => setExpanded(isExpanded ? null : session.id)}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: session.complete ? '#3fb950' : 'var(--text-muted)' }}
                      />
                      <span className="font-medium truncate" style={{ color: 'var(--text)' }}>
                        {session.labName}
                      </span>
                    </div>

                    {/* Platform */}
                    <div>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: (PLATFORM_COLORS[session.platform] || '#8b949e') + '22',
                          color: PLATFORM_COLORS[session.platform] || '#8b949e',
                        }}
                      >
                        {session.platform}
                      </span>
                    </div>

                    {/* Difficulty */}
                    <div>
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: DIFF_COLORS[session.difficulty || ''] || 'var(--text-muted)' }}
                      >
                        {session.difficulty || '—'}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="font-mono" style={{ color: 'var(--text-muted)' }}>
                      {date}
                    </div>

                    {/* Duration */}
                    <div className="font-mono" style={{ color: 'var(--accent)' }}>
                      {elapsed > 0 ? formatElapsed(elapsed) : '—'}
                    </div>

                    {/* Flags */}
                    <div style={{ color: flagCount > 0 ? '#3fb950' : 'var(--text-muted)' }}>
                      {flagCount}
                    </div>

                    {/* Hints */}
                    <div style={{ color: (session.hintsUsed || 0) > 0 ? '#d29922' : 'var(--text-muted)' }}>
                      {session.hintsUsed || 0}
                    </div>
                  </div>

                  {/* Expanded row */}
                  {isExpanded && (
                    <div
                      className="px-6 py-3 text-xs"
                      style={{ background: 'var(--bg3)', borderTop: '1px solid var(--border)' }}
                    >
                      <div className="grid grid-cols-4 gap-3 mb-2">
                        {[
                          { label: 'Ports',       value: portCount,  color: '#4a9eff' },
                          { label: 'Credentials', value: credCount,  color: '#f85149' },
                          { label: 'Flags',       value: flagCount,  color: '#3fb950' },
                          { label: 'Hints',       value: session.hintsUsed || 0, color: '#d29922' },
                        ].map(s => (
                          <div
                            key={s.label}
                            className="text-center py-2 rounded"
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                          >
                            <div className="font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {session.findings?.flags?.length > 0 && (
                        <div className="mt-2">
                          <span style={{ color: 'var(--text-muted)' }}>Flags: </span>
                          {session.findings.flags.map(f => (
                            <code key={f.id} className="mr-2 font-mono text-[10px]" style={{ color: '#3fb950' }}>
                              {f.value}
                            </code>
                          ))}
                        </div>
                      )}

                      {session.notes && (
                        <div className="mt-2" style={{ color: 'var(--text-dim)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Notes: </span>
                          {session.notes.slice(0, 120)}{session.notes.length > 120 ? '...' : ''}
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded"
                          style={{
                            background: session.complete ? 'rgba(63,185,80,0.15)' : 'rgba(139,148,158,0.12)',
                            color: session.complete ? '#3fb950' : '#8b949e',
                          }}
                        >
                          {session.complete ? 'Completed' : 'Abandoned'}
                        </span>
                        {session.labType && (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {session.labType}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
