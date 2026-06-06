import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { DuplicateGroup, DeadLink } from '@shared/types';
import HelpTip from './ui/Tooltip';

type HealthTab = 'overview' | 'duplicates' | 'deadlinks' | 'sources';

export default function VaultHealthView() {
  const {
    vaultPath, vaultStats, duplicates, deadLinks, healthProgress, sources,
    setVaultStats, setDuplicates, setDeadLinks, setHealthProgress, addLog,
  } = useStore();

  const [tab, setTab]             = useState<HealthTab>('overview');
  const [runningStats, setRunningStats]   = useState(false);
  const [runningDups, setRunningDups]     = useState(false);
  const [runningLinks, setRunningLinks]   = useState(false);
  const [cleaningMd, setCleaningMd]       = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function refreshStats() {
    setRunningStats(true);
    try {
      const stats = await window.electronAPI.getVaultStats();
      if (stats) setVaultStats(stats);
    } finally { setRunningStats(false); }
  }

  async function runDuplicateCheck() {
    setRunningDups(true);
    setHealthProgress({ percent: 0, message: 'Scanning for duplicates…' });
    try {
      const groups = await window.electronAPI.runDuplicateCheck();
      setDuplicates(groups);
      setTab('duplicates');
      addLog({ type: 'info', message: `Duplicate check done — ${groups.length} group(s) found`, time: new Date().toLocaleTimeString() });
    } finally { setRunningDups(false); setHealthProgress(null); }
  }

  async function runDeadLinkCheck() {
    setRunningLinks(true);
    setHealthProgress({ percent: 0, message: 'Checking links…' });
    try {
      const links = await window.electronAPI.runDeadLinkCheck();
      setDeadLinks(links);
      setTab('deadlinks');
      addLog({ type: 'info', message: `Link check done — ${links.length} dead link(s) found`, time: new Date().toLocaleTimeString() });
    } finally { setRunningLinks(false); setHealthProgress(null); }
  }

  async function cleanMarkdown() {
    setCleaningMd(true);
    try {
      await window.electronAPI.cleanMarkdown({});
      addLog({ type: 'success', message: 'Markdown cleanup complete', time: new Date().toLocaleTimeString() });
    } finally { setCleaningMd(false); }
  }

  async function deleteNote(fp: string, id: string) {
    setDeletingId(id);
    try {
      await window.electronAPI.deleteNote(fp);
      setDuplicates(duplicates.map(g => ({
        ...g, files: g.files.filter(f => f !== fp),
      })).filter(g => g.files.length > 1));
    } finally { setDeletingId(null); }
  }

  const totalDupeFiles = duplicates.reduce((acc, g) => acc + g.files.length - 1, 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Vault Health</div>
            <HelpTip text="Audit your vault: surface duplicate notes, dead links, and per-source health so you can clean up before re-scraping." />
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
            {vaultPath ? vaultPath.split('/').pop() : 'No vault configured'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cleanMarkdown} disabled={cleaningMd || !vaultPath}
            className="px-3 py-1.5 rounded-lg text-xs border transition-all hover:bg-white/5 disabled:opacity-40"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            {cleaningMd ? 'Cleaning…' : 'Clean Markdown'}
          </button>
          <button onClick={refreshStats} disabled={runningStats || !vaultPath}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {runningStats ? 'Loading…' : 'Refresh Stats'}
          </button>
        </div>
      </div>

      {/* Health progress */}
      {healthProgress && (
        <div className="px-5 py-2 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{healthProgress.message}</span>
            <span className="text-[11px] font-mono" style={{ color: 'var(--accent)' }}>{healthProgress.percent}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="progress-bar-fill" style={{ width: `${healthProgress.percent}%` }} />
          </div>
        </div>
      )}

      {/* Stats cards */}
      {vaultStats && (
        <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <StatCard label="Notes"    value={(vaultStats.noteCount ?? 0).toLocaleString()} />
          <StatCard label="Folders"  value={(vaultStats.folderCount ?? 0).toLocaleString()} />
          <StatCard label="Duplicates" value={totalDupeFiles.toString()} highlight={totalDupeFiles > 0} />
          <StatCard label="Dead Links" value={deadLinks.length.toString()} highlight={deadLinks.length > 0} />
        </div>
      )}

      {/* Check buttons */}
      <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button onClick={runDuplicateCheck} disabled={runningDups || !vaultPath}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all disabled:opacity-40 hover:bg-white/5"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          {runningDups ? '⟳ Scanning…' : '⊙ Find Duplicates'}
        </button>
        <button onClick={runDeadLinkCheck} disabled={runningLinks || !vaultPath}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all disabled:opacity-40 hover:bg-white/5"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          {runningLinks ? '⟳ Checking…' : '⛓ Check Dead Links'}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b shrink-0 px-5" style={{ borderColor: 'var(--border)' }}>
        {(['overview', 'sources', 'duplicates', 'deadlinks'] as HealthTab[]).map(t => {
          const errCount = sources.filter(s => s.health?.status === 'error').length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="tab px-3 py-2.5 text-xs capitalize border-b-2 -mb-px"
              style={{
                color       : tab === t ? 'var(--accent)' : 'var(--text-muted)',
                borderColor : tab === t ? 'var(--accent)' : 'transparent',
              }}>
              {t === 'deadlinks' ? 'Dead Links' : t === 'sources' ? 'Source Health' : t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'sources' && errCount > 0 && (
                <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149' }}>
                  {errCount}
                </span>
              )}
              {t === 'duplicates' && duplicates.length > 0 && (
                <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--bg3)', color: 'var(--text-dim)' }}>
                  {duplicates.length}
                </span>
              )}
              {t === 'deadlinks' && deadLinks.length > 0 && (
                <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--bg3)', color: 'var(--text-dim)' }}>
                  {deadLinks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-5">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {tab === 'overview' && (
              <div className="space-y-4">
                {vaultStats?.topFolders && vaultStats.topFolders.length > 0 && (
                  <Section title="Top Folders">
                    <div className="space-y-2">
                      {vaultStats.topFolders.map(f => (
                        <div key={f.name} className="flex items-center gap-3">
                          <span className="text-xs truncate flex-1" style={{ color: 'var(--text-muted)' }}>{f.name}</span>
                          <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{f.count}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
                {vaultStats?.recentNotes && vaultStats.recentNotes.length > 0 && (
                  <Section title="Recent Notes">
                    <div className="space-y-2">
                      {vaultStats.recentNotes.slice(0, 10).map(n => (
                        <div key={n.name} className="flex items-center gap-3">
                          <span className="text-xs truncate flex-1" style={{ color: 'var(--text-muted)' }}>{n.name}</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                            {new Date(n.mtime).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
                {!vaultStats && (
                  <div className="flex flex-col items-center py-20 text-center">
                    <div className="text-3xl mb-3">🏥</div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Click "Refresh Stats" to load vault health data</div>
                  </div>
                )}
              </div>
            )}

            {tab === 'sources' && <SourceHealthTab />}

            {tab === 'duplicates' && (
              <div className="space-y-3">
                {duplicates.length === 0 ? (
                  <EmptyState icon="✅" title="No duplicates found" subtitle={runningDups ? 'Scanning…' : 'Run "Find Duplicates" to check'} />
                ) : duplicates.map(group => (
                  <div key={group.hash} className="card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
                        {group.files.length} copies · {(group.size / 1024).toFixed(1)} KB each
                      </span>
                    </div>
                    {group.files.map((fp, i) => (
                      <div key={fp} className="flex items-center gap-2">
                        <span className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                          {fp.split('/').pop()}
                        </span>
                        {i > 0 && (
                          <button
                            onClick={() => deleteNote(fp, group.hash + i)}
                            disabled={deletingId === group.hash + i}
                            className="text-[10px] px-2 py-0.5 rounded border transition-all hover:bg-red-500/10 disabled:opacity-40"
                            style={{ borderColor: '#f85149', color: '#f85149' }}>
                            Delete
                          </button>
                        )}
                        {i === 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded"
                            style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
                            Keep
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {tab === 'deadlinks' && (
              <div className="space-y-2">
                {deadLinks.length === 0 ? (
                  <EmptyState icon="🔗" title="No dead links found" subtitle={runningLinks ? 'Checking…' : 'Run "Check Dead Links" to scan'} />
                ) : (
                  <>
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => window.electronAPI.exportDeadLinksCsv(deadLinks)}
                        className="text-[10px] px-2.5 py-1 rounded border transition-all hover:bg-white/5"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        Export CSV
                      </button>
                    </div>
                    {deadLinks.map((dl, i) => (
                      <div key={i} className="card p-3 flex items-start gap-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 mt-0.5"
                          style={{
                            background: dl.type === 'wikilink' ? 'rgba(74,158,255,0.1)' : 'rgba(248,81,73,0.1)',
                            color:      dl.type === 'wikilink' ? 'var(--accent)' : '#f85149',
                          }}>
                          {dl.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{dl.link}</div>
                          <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-dim)' }}>
                            in {dl.source.split('/').pop()}
                          </div>
                        </div>
                        {dl.status && (
                          <span className="text-[10px] font-mono shrink-0" style={{ color: '#f85149' }}>{dl.status}</span>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SourceHealthTab() {
  const { sources } = useStore();
  if (sources.length === 0) {
    return <EmptyState icon="📡" title="No sources configured" subtitle="Add sources in the Sources view" />;
  }
  const statusOrder = { error: 0, warning: 1, unknown: 2, healthy: 3 };
  const sorted = [...sources].sort((a, b) => {
    const sa = statusOrder[a.health?.status ?? 'unknown'];
    const sb = statusOrder[b.health?.status ?? 'unknown'];
    return sa - sb;
  });
  const colorMap: Record<string, string> = {
    healthy: '#3fb950', warning: '#d29922', error: '#f85149', unknown: 'var(--text-dim)',
  };
  function fmt(ts?: string) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString();
  }
  return (
    <div className="space-y-2">
      {sorted.map(src => {
        const status = src.health?.status ?? 'unknown';
        const color = colorMap[status];
        const isError = status === 'error';
        return (
          <div key={src.id} className="card p-3"
            style={isError ? { border: '1px solid rgba(248,81,73,0.35)' } : undefined}>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: color, boxShadow: isError ? `0 0 6px ${color}` : undefined }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{src.name}</div>
                {src.url && <div className="text-[10px] font-mono truncate" style={{ color: 'var(--text-dim)' }}>{src.url}</div>}
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: `${color}18`, color }}>{status}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 text-[10px]" style={{ color: 'var(--text-dim)' }}>
              <span>Last success: {fmt(src.health?.lastSuccess)}</span>
              <span>Failures: {src.health?.consecutiveFailures ?? 0}</span>
              {src.health?.lastError && (
                <span className="col-span-2 mt-1 truncate" style={{ color: '#f85149' }}>
                  Error: {src.health.lastError.slice(0, 100)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="stat-chip">
      <div className="text-lg font-bold font-mono" style={{ color: highlight ? '#f85149' : 'var(--accent)' }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-dim)' }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>{title}</div>
      <div className="card p-3">{children}</div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{title}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{subtitle}</div>
    </div>
  );
}
