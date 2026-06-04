import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { load, computeStats, getAchievementStatus, formatDuration, type ProgressStats } from '../lib/progress';
import type { Session } from '@shared/types';

// ── XP System ─────────────────────────────────────────────────────────────────

const XP_THRESHOLDS = [0, 500, 1500, 3000, 5500, 9000, 14000, 21000, 30000, 42000];

function computeLevel(xp: number): { level: number; nextXp: number; currentXp: number; pct: number } {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const base = XP_THRESHOLDS[Math.min(level - 1, XP_THRESHOLDS.length - 1)];
  const next = XP_THRESHOLDS[Math.min(level, XP_THRESHOLDS.length - 1)];
  const pct = next === base ? 100 : Math.round(((xp - base) / (next - base)) * 100);
  return { level, nextXp: next, currentXp: xp, pct };
}

function computeXP(sessions: Session[]): number {
  let xp = 0;
  for (const s of sessions) {
    xp += (s.findings?.flags?.length ?? 0) * 50;
    if (s.complete) xp += 200;
    const elapsed = s.timer?.elapsed ?? 0;
    if (s.complete && elapsed > 0 && elapsed < 1800) xp += 500; // < 30 min
  }
  return xp;
}

interface XpAchievement { id: string; name: string; icon: string; desc: string; }

const XP_ACHIEVEMENTS: XpAchievement[] = [
  { id: 'first-flag',     name: 'First Flag',       icon: '⚑', desc: 'Submit your first flag' },
  { id: 'five-machines',  name: '5 Machines Owned',  icon: '🖥️', desc: 'Complete 5 lab sessions' },
  { id: 'web-master',     name: 'Web Master',        icon: '🌐', desc: '10 web labs completed' },
  { id: 'speed-demon',    name: 'Speed Demon',       icon: '⚡', desc: 'Complete a lab in under 30 min' },
];

function checkXpAchievements(sessions: Session[]): Set<string> {
  const unlocked = new Set<string>();
  const totalFlags = sessions.reduce((a, s) => a + (s.findings?.flags?.length ?? 0), 0);
  const totalComplete = sessions.filter(s => s.complete).length;
  const webLabs = sessions.filter(s => (s.labType || '').toLowerCase().includes('web')).length;
  const speedRuns = sessions.filter(s => s.complete && (s.timer?.elapsed ?? 0) > 0 && (s.timer?.elapsed ?? 0) < 1800).length;

  if (totalFlags >= 1) unlocked.add('first-flag');
  if (totalComplete >= 5) unlocked.add('five-machines');
  if (webLabs >= 10) unlocked.add('web-master');
  if (speedRuns >= 1) unlocked.add('speed-demon');
  return unlocked;
}

// ── HTB Progress ─────────────────────────────────────────────────────────────

interface HtbProfile {
  name: string;
  rank: string;
  points: number;
  owns: { user: number; root: number };
}

// ── Category bars ─────────────────────────────────────────────────────────────

const CTF_CATS = ['Web', 'Pwn', 'Crypto', 'Forensics', 'Rev', 'OSINT', 'Misc'] as const;
const CAT_COLORS: Record<string, string> = {
  Web: '#4a9eff', Pwn: '#f85149', Crypto: '#b44fff',
  Forensics: '#3fb950', Rev: '#d29922', OSINT: '#00ffe0', Misc: '#8b949e',
};

function inferCategory(s: Session): string {
  const lt = (s.labType || '').toLowerCase();
  if (lt.includes('web')) return 'Web';
  if (lt.includes('osint')) return 'OSINT';
  if (lt.includes('ctf')) return 'Misc';
  return 'Misc';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Progress() {
  const { progressData, config } = useStore();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [achievements, setAchievements] = useState<ReturnType<typeof getAchievementStatus>>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'skills' | 'achievements' | 'xp' | 'htb'>('stats');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [htbProfile, setHtbProfile] = useState<HtbProfile | null>(null);
  const [htbLoading, setHtbLoading] = useState(false);
  const [htbError, setHtbError] = useState('');

  useEffect(() => {
    if (progressData) {
      load(progressData);
      setStats(computeStats());
      setAchievements(getAchievementStatus());
    }
  }, [progressData]);

  useEffect(() => {
    async function loadSessions() {
      try {
        const list = await window.electronAPI.listSessions() as Session[];
        if (Array.isArray(list)) setSessions(list.filter(s => s?.labName && s.labName !== 'New Session'));
      } catch {}
    }
    loadSessions();
  }, []);

  async function loadHtbProfile() {
    const key = config?.htbApiKey;
    if (!key) { setHtbError('No HTB API key configured. Add it in Settings.'); return; }
    setHtbLoading(true);
    setHtbError('');
    try {
      const res = await window.electronAPI.syncHTB(key) as { success: boolean; labs?: unknown[]; error?: string; partialMsg?: string };
      if (!res.success) { setHtbError(res.error || 'Failed to fetch HTB profile'); return; }
      setHtbProfile({
        name: config?.operatorName || 'Operator',
        rank: 'Hacker',
        points: (res.labs?.length ?? 0) * 20,
        owns: { user: res.labs?.length ?? 0, root: Math.floor((res.labs?.length ?? 0) * 0.7) },
      });
    } catch (e: unknown) {
      setHtbError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setHtbLoading(false);
    }
  }

  // XP
  const totalXP = computeXP(sessions);
  const levelInfo = computeLevel(totalXP);
  const xpAchievements = checkXpAchievements(sessions);

  // Category bars
  const catFlags: Record<string, number> = {};
  const catSessions: Record<string, number> = {};
  for (const s of sessions) {
    const cat = inferCategory(s);
    catFlags[cat] = (catFlags[cat] || 0) + (s.findings?.flags?.length ?? 0);
    catSessions[cat] = (catSessions[cat] || 0) + 1;
  }
  const maxFlags = Math.max(...Object.values(catFlags), 1);

  if (!stats && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        Complete sessions to track your progress.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <h2 className="text-sm font-semibold text-[var(--text)]">Progress</h2>
        <div className="flex gap-1 flex-wrap">
          {(['stats', 'skills', 'achievements', 'xp', 'htb'] as const).map(t => (
            <button
              key={t}
              className={`px-3 py-1 text-xs rounded capitalize ${activeTab === t ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-dim)]' : 'btn-ghost'}`}
              onClick={() => { setActiveTab(t); if (t === 'htb' && !htbProfile) loadHtbProfile(); }}
            >
              {t === 'htb' ? 'HTB' : t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Sessions', value: stats.totalSessions },
              { label: 'Completed', value: stats.totalCompleted },
              { label: 'Flags', value: stats.totalFlags },
              { label: 'Streak', value: `${stats.currentStreak}d` },
              { label: 'Total Time', value: formatDuration(stats.totalTimeMinutes) },
              { label: 'Tools Used', value: stats.uniqueToolsUsed },
              { label: 'Nodes Unlocked', value: stats.unlockedNodes },
              { label: 'Platforms', value: stats.platformsUsed },
            ].map(s => (
              <div key={s.label} className="card text-center">
                <div className="text-lg font-bold text-[var(--accent)]">{s.value}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Category progress bars */}
          <div className="card">
            <div className="text-xs font-semibold text-[var(--text-dim)] mb-3">CTF Category Progress</div>
            <div className="space-y-2">
              {CTF_CATS.map(cat => {
                const flags = catFlags[cat] || 0;
                const sess = catSessions[cat] || 0;
                const pct = flags > 0 ? Math.round((flags / maxFlags) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs" style={{ color: CAT_COLORS[cat] }}>{cat}</span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {flags} flags · {sess} sessions
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CAT_COLORS[cat] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <div className="text-xs font-semibold text-[var(--text-dim)] mb-2">Difficulty Breakdown</div>
              {Object.entries(stats.difficultyBreakdown).map(([d, count]) => count > 0 && (
                <div key={d} className="flex items-center gap-2 mb-1">
                  <span className={`text-xs w-14 diff-${d.toLowerCase()}`}>{d}</span>
                  <div className="flex-1 progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(100, (count / stats.totalSessions) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-[var(--text-muted)] w-4">{count}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="text-xs font-semibold text-[var(--text-dim)] mb-2">Platform Breakdown</div>
              {Object.entries(stats.platformCounts).map(([p, count]) => (
                <div key={p} className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-[var(--accent)] w-14">{p}</span>
                  <div className="flex-1 progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(100, (count / stats.totalSessions) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-[var(--text-muted)] w-4">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Skills ── */}
      {activeTab === 'skills' && stats && (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(stats.skillCoverage).map(([domain, coverage]) => (
            <div key={domain} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{coverage.icon}</span>
                  <span className="text-xs font-semibold text-[var(--text)]">{coverage.label}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded badge">{coverage.level}</span>
              </div>
              <div className="progress-bar mb-2">
                <div className="progress-fill" style={{ width: `${coverage.percentage}%` }} />
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {coverage.unlocked.length}/{coverage.nodes.length} nodes · {coverage.percentage}%
              </div>
              {coverage.unlocked.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {coverage.unlocked.map(n => <span key={n} className="text-[10px] badge">{n}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Achievements ── */}
      {activeTab === 'achievements' && (
        <div className="grid grid-cols-2 gap-3">
          {achievements.map(ach => (
            <div key={ach.id} className={`card transition-opacity ${ach.unlocked ? '' : 'opacity-40'}`}>
              <div className="flex items-start gap-2">
                <span className="text-xl">{ach.icon}</span>
                <div>
                  <div className="text-xs font-semibold text-[var(--text)]">{ach.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{ach.description}</div>
                  {ach.unlocked && ach.unlockedAt && (
                    <div className="text-[10px] text-[var(--success)] mt-0.5">
                      Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── XP / Gamification ── */}
      {activeTab === 'xp' && (
        <div className="space-y-4">
          {/* Level card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '2px solid var(--accent)' }}
              >
                {levelInfo.level}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Level {levelInfo.level}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {levelInfo.currentXp} XP
                  {levelInfo.level < XP_THRESHOLDS.length && ` / ${levelInfo.nextXp} XP`}
                </div>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${levelInfo.pct}%`, background: 'var(--accent)' }}
              />
            </div>
            <div className="text-[10px] mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{levelInfo.pct}% to next level</div>
          </div>

          {/* XP breakdown */}
          <div className="card">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-dim)' }}>XP Breakdown</div>
            <div className="space-y-1 text-xs">
              {[
                { label: 'Flags submitted', value: sessions.reduce((a, s) => a + (s.findings?.flags?.length ?? 0), 0), xp: 50 },
                { label: 'Labs completed',  value: sessions.filter(s => s.complete).length, xp: 200 },
                { label: 'Speed runs (<30m)', value: sessions.filter(s => s.complete && (s.timer?.elapsed ?? 0) > 0 && (s.timer?.elapsed ?? 0) < 1800).length, xp: 500 },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-dim)' }}>{row.label}</span>
                  <span className="font-mono" style={{ color: 'var(--accent)' }}>
                    {row.value} × {row.xp} = +{row.value * row.xp} XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* XP achievements */}
          <div className="card">
            <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>Achievements</div>
            <div className="grid grid-cols-2 gap-2">
              {XP_ACHIEVEMENTS.map(ach => {
                const unlocked = xpAchievements.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    className="flex items-start gap-2 p-2 rounded transition-opacity"
                    style={{
                      background: unlocked ? 'var(--accent-dim)' : 'var(--bg3)',
                      border: `1px solid ${unlocked ? 'var(--accent)' : 'var(--border)'}`,
                      opacity: unlocked ? 1 : 0.45,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{ach.icon}</span>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: unlocked ? 'var(--accent)' : 'var(--text)' }}>{ach.name}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ach.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── HTB Progress ── */}
      {activeTab === 'htb' && (
        <div className="space-y-4">
          {!config?.htbApiKey && (
            <div className="card text-center py-6">
              <div className="text-2xl mb-2">🔗</div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Connect HTB Account</div>
              <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Add your HTB API key in Settings to sync your progress
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Settings → AI Provider → HTB API Key
              </div>
            </div>
          )}

          {config?.htbApiKey && !htbProfile && !htbLoading && (
            <div className="card text-center py-6">
              {htbError && (
                <div className="text-xs mb-3" style={{ color: 'var(--error)' }}>{htbError}</div>
              )}
              <button className="btn-accent px-4 py-2 text-xs" onClick={loadHtbProfile}>
                Sync HTB Profile
              </button>
            </div>
          )}

          {htbLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 rounded-full spinner" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          )}

          {htbProfile && (
            <>
              <div className="card">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: 'rgba(159,239,0,0.12)', border: '2px solid #9fef00' }}
                  >
                    🟢
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#9fef00' }}>{htbProfile.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{htbProfile.rank}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Points', value: htbProfile.points, color: '#9fef00' },
                    { label: 'User Owns', value: htbProfile.owns.user, color: '#4a9eff' },
                    { label: 'Root Owns', value: htbProfile.owns.root, color: '#f85149' },
                  ].map(s => (
                    <div key={s.label} className="text-center py-2 rounded" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                      <div className="text-base font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn-ghost text-xs w-full py-2" onClick={loadHtbProfile}>Refresh</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
