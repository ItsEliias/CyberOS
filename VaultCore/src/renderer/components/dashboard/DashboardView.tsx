import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { useVaultCoreStore } from '../../stores/useVaultCoreStore';
import MetricCards from './MetricCards';
import ActiveRunsList from './ActiveRunsList';
import LastRunSummary from './LastRunSummary';
import VaultCompositionChart from './VaultCompositionChart';
import DiffViewer from '../diff/DiffViewer';
import SectionHeader from '../ui/SectionHeader';
import Button from '../ui/Button';
import LiveDot from '../ui/LiveDot';
import type { ScrapeRun, ScrapingSource } from '../../types/vaultcore';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SOURCE_TYPE_COLORS: Record<string, string> = {
  'obsidian-publish': '#4a9eff',
  'website': '#8b949e',
  'github': '#e6edf3',
  'youtube': '#f85149',
  'pdf': '#d29922',
  'reddit': '#ff8c42',
  'twitter': '#4a9eff',
  'notion': '#e6edf3',
  'medium': '#3fb950',
  'cve': '#f85149',
  'rss': '#d29922',
};

function RecentItems({ runs, sources }: { runs: ScrapeRun[]; sources: ScrapingSource[] }) {
  const completed = runs.filter((r) => r.status === 'completed').slice(0, 5);
  if (completed.length === 0) return null;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>
        Recent Items
      </div>
      <div className="space-y-1.5">
        {completed.map((run) => {
          const src = sources.find((s) => s.id === run.sourceId);
          const badgeColor = SOURCE_TYPE_COLORS[src?.type ?? ''] ?? '#8b949e';
          const scrapedAgo = run.completedAt ? timeAgo(run.completedAt) : null;
          return (
            <div
              key={run.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border"
              style={{ background: 'var(--surface-glass)', borderColor: 'var(--border-subtle)' }}
            >
              <span
                className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0"
                style={{
                  background: `${badgeColor}18`,
                  border: `1px solid ${badgeColor}40`,
                  color: badgeColor,
                }}
              >
                {src?.type ?? 'unknown'}
              </span>
              <span
                className="flex-1 text-[11px] truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                {run.sourceName}
              </span>
              {scrapedAgo && (
                <span
                  className="text-[9px] font-mono shrink-0 px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(74,158,255,0.08)',
                    border: '1px solid rgba(74,158,255,0.18)',
                    color: 'rgba(74,158,255,0.7)',
                  }}
                  title={`Scraped at ${run.completedAt}`}
                >
                  scraped {scrapedAgo}
                </span>
              )}
              {run.result?.newNotes !== undefined && (
                <span className="text-[10px] font-mono tabular-nums shrink-0" style={{ color: '#3fb950' }}>
                  +{run.result.newNotes}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardView() {
  const { vaultPath, sources: legacySources, isScraping, addLog } = useStore();

  const {
    sources, runs, vaultStats, activeRunIds,
    isScrapingAll, setIsScrapingAll,
    addRun, updateRun, removeActiveRunId,
    setVaultStats, setSources,
  } = useVaultCoreStore();

  const [diffViewRun, setDiffViewRun] = useState<ScrapeRun | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function loadStats() {
      if (!vaultPath) return;
      try {
        const stats = await window.electronAPI.getVaultStats();
        if (stats) {
          setVaultStats({
            totalNotes: stats.noteCount,
            byFolder: (stats.topFolders ?? []).map((f) => ({ folder: f.name, count: f.count })),
            addedToday: 0,
          });
        }
      } catch { /* ignore */ }
    }
    loadStats();
  }, [vaultPath]);

  useEffect(() => {
    if (sources.length === 0 && legacySources.length > 0) {
      const mapped: ScrapingSource[] = legacySources.map((s) => ({
        id: s.id, name: s.name, type: s.type, url: s.url ?? '',
        enabled: s.schedule?.enabled ?? true, interval: 'daily', outputPath: '',
        consecutiveFailures: s.health?.consecutiveFailures ?? 0,
        health: (s.health?.status === 'healthy' ? 'healthy'
          : s.health?.status === 'warning' ? 'warning'
          : s.health?.status === 'error' ? 'error'
          : 'healthy') as ScrapingSource['health'],
        totalNotesSaved: s.noteCount ?? 0, tags: [],
        lastScrapeAt: s.lastScraped, lastSuccessAt: s.health?.lastSuccess,
        lastError: s.health?.lastError,
      }));
      setSources(mapped);
    }
  }, [legacySources]);

  const lastCompletedRun = runs.find((r) => r.status !== 'running');
  const lastRunAgo = lastCompletedRun?.completedAt ? timeAgo(lastCompletedRun.completedAt) : null;

  async function handleScrapeAll() {
    if (isScrapingAll || !vaultPath) return;
    setIsScrapingAll(true);
    const enabledSources = sources.filter((s) => s.enabled);
    for (const src of enabledSources) {
      const runId = Math.random().toString(36).slice(2);
      addRun({ id: runId, sourceId: src.id, sourceName: src.name, startedAt: new Date().toISOString(), status: 'running' });
      try {
        const res = await window.electronAPI.scrapeSourceNow(src.id);
        const completedAt = new Date().toISOString();
        if (res.success) {
          updateRun(runId, { status: 'completed', completedAt });
          addLog({ type: 'success', message: `Scraped "${src.name}"`, time: new Date().toLocaleTimeString() });
        } else {
          updateRun(runId, { status: 'failed', completedAt, error: res.error ?? 'Unknown error' });
          addLog({ type: 'error', message: `Failed "${src.name}": ${res.error}`, time: new Date().toLocaleTimeString() });
        }
      } catch (e) {
        updateRun(runId, { status: 'failed', completedAt: new Date().toISOString(), error: (e as Error).message });
      }
      removeActiveRunId(runId);
    }
    setIsScrapingAll(false);
    const stats = await window.electronAPI.getVaultStats();
    if (stats) {
      setVaultStats({
        totalNotes: stats.noteCount,
        byFolder: (stats.topFolders ?? []).map((f) => ({ folder: f.name, count: f.count })),
        addedToday: 0,
      });
    }
  }

  async function handleRefreshStats() {
    setRefreshing(true);
    try {
      const stats = await window.electronAPI.getVaultStats();
      if (stats) {
        setVaultStats({
          totalNotes: stats.noteCount,
          byFolder: (stats.topFolders ?? []).map((f) => ({ folder: f.name, count: f.count })),
          addedToday: 0,
        });
      }
    } finally {
      setRefreshing(false);
    }
  }

  function handleCancelRun(runId: string) {
    updateRun(runId, { status: 'failed', completedAt: new Date().toISOString(), error: 'Cancelled by user' });
    removeActiveRunId(runId);
    window.electronAPI.stopScrape();
  }

  const noVault = !vaultPath;

  return (
    <div className="h-full overflow-auto">
      <div className="p-5 space-y-5 max-w-4xl">
        {/* Toolbar */}
        <SectionHeader
          title="Dashboard"
          subtitle={`${sources.length} source${sources.length !== 1 ? 's' : ''} configured`}
          actions={
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-mono tabular-nums px-2 py-1 rounded-lg border"
                style={{
                  background: 'var(--surface-glass)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                4.2 GB on disk
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshStats}
                disabled={refreshing || noVault}
                loading={refreshing}
              >
                {!refreshing && '↺'} Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleScrapeAll}
                disabled={isScrapingAll || isScraping || noVault || sources.filter((s) => s.enabled).length === 0}
              >
                {isScrapingAll ? (
                  <>
                    <LiveDot status="online" size={5} />
                    Scraping…
                  </>
                ) : (
                  '▶ Scrape All'
                )}
              </Button>
            </div>
          }
        />

        {/* No vault prompt */}
        {noVault && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl p-6 text-center border-2 border-dashed flex flex-col items-center gap-3"
            style={{ borderColor: 'rgba(63,185,80,0.25)', background: 'rgba(63,185,80,0.04)' }}
          >
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.6 }}>
              <rect x="6" y="12" width="32" height="24" rx="3" stroke="#3fb950" strokeWidth="1.5" fill="rgba(63,185,80,0.07)"/>
              <path d="M6 18h32" stroke="#3fb950" strokeWidth="1" opacity="0.5"/>
              <rect x="12" y="22" width="8" height="2" rx="1" fill="rgba(63,185,80,0.4)"/>
              <rect x="12" y="26" width="14" height="2" rx="1" fill="rgba(42,51,71,0.5)"/>
              <path d="M32 8L22 12L12 8" stroke="#3fb950" strokeWidth="1.5" strokeLinejoin="round" fill="none" opacity="0.7"/>
            </svg>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                No Obsidian vault configured
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Go to <span style={{ color: 'var(--accent)' }}>Settings</span> to select your vault path
              </div>
            </div>
          </motion.div>
        )}

        {/* Metric cards */}
        <MetricCards
          sources={sources}
          vaultStats={vaultStats ? { totalNotes: vaultStats.totalNotes, addedToday: vaultStats.addedToday } : null}
          lastRunAgo={lastRunAgo}
        />

        {/* Active runs */}
        <ActiveRunsList runs={runs} onCancel={handleCancelRun} />

        {/* Recent Items */}
        <RecentItems runs={runs} sources={sources} />

        {/* Last run + vault chart */}
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3">
            <LastRunSummary runs={runs} onViewDiff={setDiffViewRun} />
          </div>
          {vaultStats && vaultStats.byFolder.length > 0 && (
            <div
              className="col-span-2 rounded-lg border p-4"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}
            >
              <VaultCompositionChart byFolder={vaultStats.byFolder} />
            </div>
          )}
        </div>
      </div>

      {diffViewRun && (
        <DiffViewer run={diffViewRun} onClose={() => setDiffViewRun(null)} />
      )}
    </div>
  );
}
