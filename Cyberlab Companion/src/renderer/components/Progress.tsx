import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { load, computeStats, getAchievementStatus, formatDuration, SKILL_TREE, type ProgressStats } from '../lib/progress';

export default function Progress() {
  const { progressData } = useStore();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [achievements, setAchievements] = useState<ReturnType<typeof getAchievementStatus>>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'skills' | 'achievements'>('stats');

  useEffect(() => {
    if (progressData) {
      load(progressData);
      setStats(computeStats());
      setAchievements(getAchievementStatus());
    }
  }, [progressData]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        Complete sessions to track your progress.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Progress</h2>
        <div className="flex gap-1">
          {(['stats','skills','achievements'] as const).map(t => (
            <button
              key={t}
              className={`px-3 py-1 text-xs rounded capitalize ${activeTab === t ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-dim)]' : 'btn-ghost'}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'stats' && (
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

      {activeTab === 'skills' && (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(stats.skillCoverage).map(([domain, coverage]) => (
            <div key={domain} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{coverage.icon}</span>
                  <span className="text-xs font-semibold text-[var(--text)]">{coverage.label}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded badge`}>{coverage.level}</span>
              </div>
              <div className="progress-bar mb-2">
                <div className="progress-fill" style={{ width: `${coverage.percentage}%` }} />
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {coverage.unlocked.length}/{coverage.nodes.length} nodes • {coverage.percentage}%
              </div>
              {coverage.unlocked.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {coverage.unlocked.map(n => (
                    <span key={n} className="text-[10px] badge">{n}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
