import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { Session } from '@shared/types';

interface CategoryStats {
  category: string;
  flags: number;
  sessions: number;
  avgMins: number;
  bestMins: number | null;
}

const CTF_CATEGORIES = ['Web', 'Pwn', 'Crypto', 'Forensics', 'Rev', 'OSINT', 'Misc'];

const CAT_COLORS: Record<string, string> = {
  Web: '#4a9eff', Pwn: '#f85149', Crypto: '#b44fff',
  Forensics: '#3fb950', Rev: '#d29922', OSINT: '#00ffe0', Misc: '#8b949e',
};

function inferCategory(session: Session): string {
  const lt = (session.labType || '').toLowerCase();
  const ln = (session.labName || '').toLowerCase();
  if (lt.includes('web') || ln.includes('web')) return 'Web';
  if (lt.includes('ctf')) return 'Misc';
  if (lt.includes('osint') || ln.includes('osint')) return 'OSINT';
  return 'Misc';
}

export default function StatsView() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [barWidths, setBarWidths] = useState<Record<string, number>>({});
  const animatedRef = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const list = await window.electronAPI.listSessions() as Session[];
        if (Array.isArray(list)) {
          setSessions(list.filter(s => s?.labName && s.labName !== 'New Session'));
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
        <div className="skeleton-line" style={{ width: '40%', height: 16, borderRadius: 6 }} />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-box" style={{ height: 56, borderRadius: 8 }} />
          ))}
        </div>
        <div className="skeleton-box" style={{ height: 24, borderRadius: 8 }} />
        <div className="skeleton-box" style={{ height: 140, borderRadius: 8 }} />
        <div className="skeleton-box" style={{ height: 120, borderRadius: 8 }} />
      </div>
    );
  }

  // Compute per-category stats
  const catStats: Record<string, CategoryStats> = {};
  for (const cat of CTF_CATEGORIES) {
    catStats[cat] = { category: cat, flags: 0, sessions: 0, avgMins: 0, bestMins: null };
  }

  const sessionDurations: Array<{ name: string; mins: number; date: string }> = [];

  for (const s of sessions) {
    const cat = inferCategory(s);
    if (!catStats[cat]) catStats[cat] = { category: cat, flags: 0, sessions: 0, avgMins: 0, bestMins: null };
    catStats[cat].sessions++;
    catStats[cat].flags += s.findings?.flags?.length ?? 0;
    const mins = Math.round((s.timer?.elapsed ?? 0) / 60);
    if (mins > 0) {
      catStats[cat].avgMins += mins;
      if (catStats[cat].bestMins === null || mins < catStats[cat].bestMins!) {
        catStats[cat].bestMins = mins;
      }
    }
    if (mins > 0) {
      sessionDurations.push({
        name: s.labName,
        mins,
        date: s.createdAt ? s.createdAt.slice(0, 10) : '',
      });
    }
  }

  // Finalise averages
  for (const cs of Object.values(catStats)) {
    if (cs.sessions > 0 && cs.avgMins > 0) cs.avgMins = Math.round(cs.avgMins / cs.sessions);
  }

  const totalFlags = sessions.reduce((a, s) => a + (s.findings?.flags?.length ?? 0), 0);
  const totalMins = sessions.reduce((a, s) => a + Math.round((s.timer?.elapsed ?? 0) / 60), 0);
  const avgMinsAll = sessions.length ? Math.round(totalMins / sessions.length) : 0;
  const fastestSession = sessionDurations.length
    ? sessionDurations.reduce((a, b) => a.mins < b.mins ? a : b)
    : null;

  const maxFlags = Math.max(...Object.values(catStats).map(c => c.flags), 1);

  // Sparkline data: last 10 completed sessions by date
  const recent = [...sessionDurations].sort((a, b) => a.date.localeCompare(b.date)).slice(-10);

  // Animate progress bars in on first render after load
  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    const widths: Record<string, number> = {};
    for (const cat of CTF_CATEGORIES) {
      const cs = catStats[cat];
      widths[`flags-${cat}`] = cs.flags > 0 ? Math.round((cs.flags / maxFlags) * 100) : 0;
      const maxAvg = Math.max(...CTF_CATEGORIES.map(c => catStats[c].avgMins), 1);
      widths[`avg-${cat}`] = cs.avgMins > 0 ? Math.round((cs.avgMins / maxAvg) * 100) : 0;
    }
    // Start at 0, animate to target after a short frame delay
    setBarWidths({});
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarWidths(widths));
    });
  }, [sessions]);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Time-to-Solve Analytics</h2>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Sessions', value: sessions.length, color: 'var(--accent)' },
          { label: 'Total Flags', value: totalFlags, color: '#3fb950' },
          { label: 'Total Hours', value: `${(totalMins / 60).toFixed(1)}h`, color: 'var(--accent)' },
          { label: 'Avg / Session', value: avgMinsAll ? `${avgMinsAll}m` : '—', color: 'var(--text-dim)' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className="text-lg font-bold font-mono tabular-nums" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Personal record */}
      {fastestSession && (
        <div className="card flex items-center gap-3">
          <span style={{ fontSize: 18 }}>⚡</span>
          <div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Personal Record</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {fastestSession.name} — <span className="font-mono" style={{ color: 'var(--accent)' }}>{fastestSession.mins}m</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress bars per CTF category */}
      <div className="card">
        <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>Flags by Category</div>
        <div className="space-y-2.5">
          {CTF_CATEGORIES.map(cat => {
            const cs = catStats[cat];
            const pct = barWidths[`flags-${cat}`] ?? 0;
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs" style={{ color: CAT_COLORS[cat] }}>{cat}</span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {cs.sessions} sessions{cs.bestMins ? ` · best ${cs.bestMins}m` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(42,51,71,0.3)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${CAT_COLORS[cat]}cc, ${CAT_COLORS[cat]})`,
                        boxShadow: pct > 0 ? `0 0 8px ${CAT_COLORS[cat]}55` : 'none',
                        transition: 'width 0.8s cubic-bezier(0.2,0.8,0.2,1)',
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-mono tabular-nums flex-shrink-0 w-12 text-right"
                    style={{ color: cs.flags > 0 ? CAT_COLORS[cat] : 'var(--text-muted)' }}
                  >
                    {cs.flags > 0 ? `${cs.flags}` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Avg time per category */}
      <div className="card">
        <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>Avg Time Per Category</div>
        <div className="space-y-1.5">
          {CTF_CATEGORIES.filter(cat => catStats[cat].sessions > 0).map(cat => {
            const cs = catStats[cat];
            const pct = barWidths[`avg-${cat}`] ?? 0;
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs w-16 flex-shrink-0" style={{ color: CAT_COLORS[cat] }}>{cat}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(42,51,71,0.3)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: CAT_COLORS[cat] + '99',
                      transition: 'width 0.8s cubic-bezier(0.2,0.8,0.2,1)',
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono w-12 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {cs.avgMins > 0 ? `${cs.avgMins}m` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Solve rate sparkline (last 10) */}
      {recent.length > 0 && (
        <div className="card">
          <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>Recent Session Durations</div>
          <div className="flex items-end gap-1.5" style={{ height: 48 }}>
            {recent.map((s, i) => {
              const maxM = Math.max(...recent.map(r => r.mins), 1);
              const h = Math.max(4, Math.round((s.mins / maxM) * 48));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${s.name}: ${s.mins}m`}>
                  <div
                    className="w-full rounded-t"
                    style={{ height: h, background: 'var(--accent)', opacity: 0.6 + (i / recent.length) * 0.4 }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{recent[0]?.date}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{recent[recent.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Complete sessions to see your analytics.
        </div>
      )}
    </div>
  );
}
