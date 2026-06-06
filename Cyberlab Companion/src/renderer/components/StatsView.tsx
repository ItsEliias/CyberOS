import { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '../store';
import type { Session } from '@shared/types';
import { usePlatformStats } from '../hooks/usePlatformStats';
import HelpIcon from './ui/HelpIcon';

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

// ── Radar Chart ───────────────────────────────────────────────────────────────

const RADAR_CATS = ['Web', 'Pwn', 'Forensics', 'Rev', 'OSINT'] as const;

function RadarChart({ catStats }: { catStats: Record<string, CategoryStats> }) {
  const [animated, setAnimated] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);

  const SIZE = 180;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 72;
  const N = RADAR_CATS.length;
  const maxVal = Math.max(...RADAR_CATS.map(c => catStats[c]?.flags ?? 0), 1);

  const axes = RADAR_CATS.map((cat, i) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    return { cat, angle, x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  });

  const dataPoints = useMemo(() => RADAR_CATS.map((cat, i) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    const val = catStats[cat]?.flags ?? 0;
    const r = (val / maxVal) * R;
    return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
  }), [catStats, maxVal]);

  const polyPoints = dataPoints.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const pathD = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z';
  const ringLevels = [0.25, 0.5, 0.75, 1.0];

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const pathLen = pathRef.current?.getTotalLength() ?? 360;

  return (
    <div className="card">
      <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>Skill Radar</div>
      <div className="flex items-center justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: 'visible' }}>
          {ringLevels.map(lvl => {
            const pts = RADAR_CATS.map((_, i) => {
              const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
              const r = R * lvl;
              return `${(CX + r * Math.cos(angle)).toFixed(2)},${(CY + r * Math.sin(angle)).toFixed(2)}`;
            }).join(' ');
            return <polygon key={lvl} points={pts} fill="none" stroke="rgba(42,51,71,0.5)" strokeWidth="1" />;
          })}
          {axes.map(ax => (
            <line key={ax.cat} x1={CX} y1={CY} x2={ax.x.toFixed(2)} y2={ax.y.toFixed(2)} stroke="rgba(42,51,71,0.4)" strokeWidth="1" />
          ))}
          <polygon points={polyPoints} fill="rgba(180,79,255,0.12)" stroke="none" />
          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke="#b44fff"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeDasharray={pathLen}
            strokeDashoffset={animated ? 0 : pathLen}
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.2,0.8,0.2,1)' }}
          />
          {dataPoints.map((p, i) => {
            const cat = RADAR_CATS[i];
            return <circle key={cat} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="3" fill={CAT_COLORS[cat] || '#b44fff'} stroke="rgba(7,8,15,0.8)" strokeWidth="1.5" />;
          })}
          {axes.map(ax => {
            const lr = R + 14;
            const lx = CX + lr * Math.cos(ax.angle);
            const ly = CY + lr * Math.sin(ax.angle);
            const anchor = ax.x > CX + 4 ? 'start' : ax.x < CX - 4 ? 'end' : 'middle';
            return (
              <text key={ax.cat} x={lx.toFixed(2)} y={ly.toFixed(2)} textAnchor={anchor} dominantBaseline="middle" fontSize="9" fontFamily="var(--font-display)" fill={CAT_COLORS[ax.cat] || '#8b949e'} style={{ fontWeight: 600 }}>
                {ax.cat}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Live platform stats (HTB + THM) ──────────────────────────────────────────

function PlatformStatsBlock() {
  const { htbConnected, thmConnected, htbStats, thmStats, htbError, thmError, loading, lastSyncAt, refresh } = usePlatformStats();
  if (!htbConnected && !thmConnected) {
    return (
      <div className="card" style={{ borderStyle: 'dashed' }}>
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            No platform connected — add HTB or THM in Settings → API Connections.
          </span>
          <HelpIcon text="Once connected, this block shows live rank, owns, active machines (HTB) and completed/in-progress rooms (THM), refreshed every 5 minutes." label="About platform stats" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
          Platform Activity
        </span>
        <HelpIcon text="Pulled directly from HackTheBox and TryHackMe using your encrypted tokens. Active HTB machines auto-sync to CyberOS shared_context.activeLab so ReconDesk and TermLink can follow along." label="Platform sync details" />
        <button
          className="btn-ghost px-2 py-0.5 text-[10px] ml-auto"
          onClick={refresh}
          disabled={loading}
        >
          {loading ? 'Syncing...' : 'Refresh'}
        </button>
      </div>
      <div className={`grid gap-3 ${htbConnected && thmConnected ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {htbConnected && (
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: '#9fef00' }}>HackTheBox</span>
              {htbStats?.rank && (
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{htbStats.rank}</span>
              )}
            </div>
            {htbStats ? (
              <>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <Metric label="Points"     value={htbStats.points} color="#9fef00" />
                  <Metric label="User Owns"  value={htbStats.userOwns} color="#4a9eff" />
                  <Metric label="Root Owns"  value={htbStats.rootOwns} color="#f85149" />
                </div>
                {htbStats.activeMachines?.[0] && (
                  <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                    Active: <span className="font-mono" style={{ color: 'var(--accent)' }}>{htbStats.activeMachines[0].name}</span>
                    {htbStats.activeMachines[0].difficulty && <span style={{ color: 'var(--text-muted)' }}> · {htbStats.activeMachines[0].difficulty}</span>}
                  </div>
                )}
                {htbStats.recentMachines && htbStats.recentMachines.length > 0 && (
                  <div>
                    <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Recent</div>
                    <div className="flex flex-wrap gap-1">
                      {htbStats.recentMachines.slice(0, 5).map(m => (
                        <span key={m.id || m.name} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: 'rgba(159,239,0,0.08)', color: '#9fef00', border: '1px solid rgba(159,239,0,0.18)' }}>
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-[11px]" style={{ color: htbError ? 'var(--error)' : 'var(--text-muted)' }}>
                {htbError || 'Loading...'}
              </div>
            )}
          </div>
        )}
        {thmConnected && (
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: '#88cc14' }}>TryHackMe</span>
              {thmStats?.username && (
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{thmStats.username}</span>
              )}
            </div>
            {thmStats ? (
              <>
                <div className="grid grid-cols-2 gap-1 text-center">
                  <Metric label="Completed"   value={thmStats.completedRooms} color="#3fb950" />
                  <Metric label="In Progress" value={thmStats.inProgressRooms} color="#d29922" />
                </div>
                {thmStats.recentRooms && thmStats.recentRooms.length > 0 && (
                  <div>
                    <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Recent</div>
                    <div className="flex flex-wrap gap-1">
                      {thmStats.recentRooms.slice(0, 5).map(r => (
                        <span key={r.code || r.title} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: 'rgba(136,204,20,0.08)', color: '#88cc14', border: '1px solid rgba(136,204,20,0.18)' }}>
                          {r.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {thmStats.partial && (
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{thmStats.partial}</div>
                )}
              </>
            ) : (
              <div className="text-[11px]" style={{ color: thmError ? 'var(--error)' : 'var(--text-muted)' }}>
                {thmError || 'Loading...'}
              </div>
            )}
          </div>
        )}
      </div>
      {lastSyncAt && (
        <div className="text-[10px] text-right" style={{ color: 'var(--text-muted)' }}>
          Last sync {new Date(lastSyncAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="py-1 rounded" style={{ background: 'rgba(13,14,24,0.5)', border: '1px solid var(--border)' }}>
      <div className="font-mono font-bold text-sm" style={{ color }}>{value}</div>
      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
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
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Time-to-Solve Analytics</h2>
        <HelpIcon text="Aggregated analytics across all your saved lab sessions: total time, flags, per-category breakdowns, and a personal-record card. Data lives locally in ~/.cyberlab-companion." label="About Stats" />
      </div>

      {/* HTB / THM live integration stats */}
      <PlatformStatsBlock />


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

      {/* Radar chart */}
      <RadarChart catStats={catStats} />

      {sessions.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Complete sessions to see your analytics.
        </div>
      )}
    </div>
  );
}
