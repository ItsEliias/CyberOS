import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { useVaultCoreStore } from '../../stores/useVaultCoreStore';
import MetricCards from './MetricCards';
import ActiveRunsList from './ActiveRunsList';
import LastRunSummary from './LastRunSummary';
import VaultCompositionChart from './VaultCompositionChart';
import DiffViewer from '../diff/DiffViewer';
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

  // Derive vault stats from main store if available (fallback to IPC call)
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
      } catch {
        // ignore
      }
    }
    loadStats();
  }, [vaultPath]);

  // Seed sources from legacy store if VaultCore store is empty
  useEffect(() => {
    if (sources.length === 0 && legacySources.length > 0) {
      const mapped: ScrapingSource[] = legacySources.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        url: s.url ?? '',
        enabled: s.schedule?.enabled ?? true,
        interval: 'daily',
        outputPath: '',
        consecutiveFailures: s.health?.consecutiveFailures ?? 0,
        health: (s.health?.status === 'healthy' ? 'healthy'
          : s.health?.status === 'warning' ? 'warning'
          : s.health?.status === 'error' ? 'error'
          : 'healthy') as ScrapingSource['health'],
        totalNotesSaved: s.noteCount ?? 0,
        tags: [],
        lastScrapeAt: s.lastScraped,
        lastSuccessAt: s.health?.lastSuccess,
        lastError: s.health?.lastError,
      }));
      setSources(mapped);
    }
  }, [legacySources]);

  const lastCompletedRun = runs.find((r) => r.status !== 'running');
  const lastRunAgo = lastCompletedRun?.completedAt
    ? timeAgo(lastCompletedRun.completedAt)
    : null;

  async function handleScrapeAll() {
    if (isScrapingAll || !vaultPath) return;
    setIsScrapingAll(true);
    const enabledSources = sources.filter((s) => s.enabled);
    for (const src of enabledSources) {
      const runId = Math.random().toString(36).slice(2);
      addRun({
        id: runId,
        sourceId: src.id,
        sourceName: src.name,
        startedAt: new Date().toISOString(),
        status: 'running',
      });
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
    // Refresh stats after all done
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
      <div className="p-5 space-y-6 max-w-4xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Dashboard</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
              {sources.length} source{sources.length !== 1 ? 's' : ''} configured
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshStats}
              disabled={refreshing || noVault}
              className="px-3 py-1.5 rounded-lg text-xs border transition-all hover:bg-white/5 disabled:opacity-40"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {refreshing ? '↺ Refreshing…' : '↺ Refresh'}
            </button>
            <button
              onClick={handleScrapeAll}
              disabled={isScrapingAll || isScraping || noVault || sources.filter((s) => s.enabled).length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {isScrapingAll ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#fff' }} />
                  Scraping…
                </>
              ) : (
                '▶ Scrape All'
              )}
            </button>
          </div>
        </div>

        {/* No vault prompt */}
        {noVault && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg p-6 text-center border-2 border-dashed"
            style={{ borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 4%, transparent)' }}
          >
            <div className="text-2xl mb-2">🗂</div>
            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              No Obsidian vault configured
            </div>
            <div className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>
              Go to Settings to select your vault path
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
        <ActiveRunsList
          runs={runs}
          onCancel={handleCancelRun}
        />

        {/* Last run summary + vault chart side by side */}
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3">
            <LastRunSummary runs={runs} onViewDiff={setDiffViewRun} />
          </div>
          {vaultStats && vaultStats.byFolder.length > 0 && (
            <div className="col-span-2 rounded-lg border p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <VaultCompositionChart byFolder={vaultStats.byFolder} />
            </div>
          )}
        </div>
      </div>

      {/* Diff Viewer Modal */}
      {diffViewRun && (
        <DiffViewer run={diffViewRun} onClose={() => setDiffViewRun(null)} />
      )}
    </div>
  );
}
