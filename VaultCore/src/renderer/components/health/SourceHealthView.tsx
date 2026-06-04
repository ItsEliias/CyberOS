// VaultCore — Source Health View (Screen 4)
// Errors first, warnings second, healthy last.
// Error/warning cards show last error message + Retry/Disable buttons.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useVaultCoreStore } from '../../stores/useVaultCoreStore';
import { useStore } from '../../store';
import type { ScrapingSource } from '../../types/vaultcore';

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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function ErrorCard({ source, onRetry, onDisable, retrying }: {
  source: ScrapingSource;
  onRetry: () => void;
  onDisable: () => void;
  retrying: boolean;
}) {
  const score = healthScore(source);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border p-4 space-y-2"
      style={{
        background: 'var(--bg2)',
        borderColor: 'rgba(248,81,73,0.35)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <HealthRing score={score} size={30} />
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{source.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRetry}
            disabled={retrying}
            className="px-3 py-1 rounded-lg text-xs border transition-all disabled:opacity-40"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            {retrying ? '…' : 'Retry'}
          </button>
          <button
            onClick={onDisable}
            className="px-3 py-1 rounded-lg text-xs border transition-all hover:bg-red-500/10"
            style={{ borderColor: 'var(--border)', color: '#f85149' }}
          >
            Disable
          </button>
        </div>
      </div>
      <div className="text-[11px]" style={{ color: '#f85149' }}>
        {source.consecutiveFailures} consecutive failure{source.consecutiveFailures !== 1 ? 's' : ''}
        {source.lastError && ` · "${source.lastError}"`}
      </div>
      {source.lastSuccessAt && (
        <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
          Last success: {formatDateTime(source.lastSuccessAt)}
        </div>
      )}
    </motion.div>
  );
}

function WarningCard({ source, onRetry, retrying }: {
  source: ScrapingSource;
  onRetry: () => void;
  retrying: boolean;
}) {
  const score = healthScore(source);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border p-4 space-y-2"
      style={{
        background: 'var(--bg2)',
        borderColor: 'rgba(210,153,34,0.3)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <HealthRing score={score} size={30} />
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{source.name}</span>
        </div>
        <button
          onClick={onRetry}
          disabled={retrying}
          className="px-3 py-1 rounded-lg text-xs border transition-all disabled:opacity-40 shrink-0"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          {retrying ? '…' : 'Retry'}
        </button>
      </div>
      <div className="text-[11px]" style={{ color: '#d29922' }}>
        {source.consecutiveFailures} consecutive failure{source.consecutiveFailures !== 1 ? 's' : ''}
        {source.lastError && ` · "${source.lastError}"`}
      </div>
      {source.lastSuccessAt && (
        <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
          Last success: {formatDateTime(source.lastSuccessAt)}
        </div>
      )}
    </motion.div>
  );
}

function healthScore(source: ScrapingSource): number {
  if (source.health === 'error') return Math.max(0, 30 - source.consecutiveFailures * 10);
  if (source.health === 'warning') return Math.max(40, 70 - source.consecutiveFailures * 8);
  return 100;
}

function HealthRing({ score, size = 32 }: { score: number; size?: number }) {
  const r = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const gap = circ - dash;
  const color = score >= 80 ? '#3fb950' : score >= 50 ? '#d29922' : '#f85149';
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        className="health-ring-track"
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        className="health-ring-fill"
        stroke={color}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={0}
        style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
      />
      <text
        x={size / 2} y={size / 2 + 3}
        textAnchor="middle"
        style={{ fontSize: 8, fontFamily: 'var(--font-mono)', fill: color, fontWeight: 600 }}
      >
        {score}
      </text>
    </svg>
  );
}

function HealthyRow({ source }: { source: ScrapingSource }) {
  const score = healthScore(source);
  return (
    <div
      className="flex items-center gap-4 px-4 py-2.5 rounded-lg border"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <HealthRing score={score} />
      <span className="text-sm flex-1 truncate" style={{ color: 'var(--text)' }}>{source.name}</span>
      <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-dim)' }}>
        {source.lastSuccessAt ? `Last: ${timeAgo(source.lastSuccessAt)}` : 'Never run'}
      </span>
      <span className="text-[10px] font-mono w-16 text-right shrink-0" style={{ color: 'var(--text-dim)' }}>
        {source.totalNotesSaved} notes
      </span>
      <span className="text-[10px] shrink-0" style={{ color: '#3fb950' }}>✓</span>
    </div>
  );
}

export default function SourceHealthView() {
  const { sources, updateSource, addRun, updateRun, removeActiveRunId } = useVaultCoreStore();
  const { addLog } = useStore();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const errorSources  = sources.filter((s) => s.health === 'error');
  const warnSources   = sources.filter((s) => s.health === 'warning');
  const healthySources = sources.filter((s) => s.health === 'healthy');

  async function handleRetry(source: ScrapingSource) {
    setRetryingId(source.id);
    const runId = Math.random().toString(36).slice(2);
    addRun({ id: runId, sourceId: source.id, sourceName: source.name, startedAt: new Date().toISOString(), status: 'running' });
    try {
      const res = await window.electronAPI.scrapeSourceNow(source.id);
      const completedAt = new Date().toISOString();
      if (res.success) {
        updateRun(runId, { status: 'completed', completedAt });
        updateSource(source.id, {
          consecutiveFailures: 0,
          health: 'healthy',
          lastSuccessAt: completedAt,
          lastScrapeAt: completedAt,
        });
        addLog({ type: 'success', message: `Retry "${source.name}" succeeded`, time: new Date().toLocaleTimeString() });
      } else {
        updateRun(runId, { status: 'failed', completedAt, error: res.error ?? 'Unknown' });
        addLog({ type: 'error', message: `Retry "${source.name}" failed: ${res.error}`, time: new Date().toLocaleTimeString() });
      }
    } catch (e) {
      const completedAt = new Date().toISOString();
      updateRun(runId, { status: 'failed', completedAt, error: (e as Error).message });
    } finally {
      setRetryingId(null);
      removeActiveRunId(runId);
    }
  }

  function handleDisable(id: string) {
    updateSource(id, { enabled: false });
  }

  async function handleRefreshAll() {
    setRefreshing(true);
    try {
      const updated = await window.electronAPI.getSources();
      // Merge health data from main process
      for (const src of updated) {
        const existing = sources.find((s) => s.id === src.id);
        if (existing) {
          const failures = (src as Record<string, unknown>)['health']
            ? ((src as Record<string, unknown>)['health'] as Record<string, unknown>)['consecutiveFailures'] as number ?? 0
            : existing.consecutiveFailures;
          updateSource(src.id, {
            consecutiveFailures: failures,
            health: failures >= 3 ? 'error' : failures >= 1 ? 'warning' : 'healthy',
          });
        }
      }
    } catch {
      // Ignore IPC errors
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Source Health Monitor
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
            {sources.length} source{sources.length !== 1 ? 's' : ''} ·{' '}
            {errorSources.length > 0 && (
              <span style={{ color: '#f85149' }}>{errorSources.length} error · </span>
            )}
            {warnSources.length > 0 && (
              <span style={{ color: '#d29922' }}>{warnSources.length} warning · </span>
            )}
            <span style={{ color: '#3fb950' }}>{healthySources.length} healthy</span>
          </div>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={refreshing}
          className="px-3 py-1.5 rounded-lg text-xs border transition-all hover:bg-white/5 disabled:opacity-40"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          {refreshing ? '↺ Refreshing…' : 'Refresh All ↺'}
        </button>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-auto p-5 space-y-6"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
      >
        {sources.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center gap-4">
            {/* Illustrated health/monitor SVG */}
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" style={{ opacity: 0.45 }}>
              <rect x="6" y="10" width="48" height="32" rx="4" stroke="#8b949e" strokeWidth="1.5" fill="rgba(13,14,24,0.8)"/>
              <polyline points="10,30 18,20 24,28 32,16 40,26 48,22" stroke="#3fb950" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
              <line x1="18" y1="42" x2="42" y2="42" stroke="#8b949e" strokeWidth="1.5"/>
              <line x1="30" y1="42" x2="30" y2="50" stroke="#8b949e" strokeWidth="1.5"/>
              <line x1="22" y1="50" x2="38" y2="50" stroke="#8b949e" strokeWidth="1.5"/>
              <circle cx="32" cy="16" r="2" fill="rgba(63,185,80,0.3)" stroke="#3fb950" strokeWidth="1"/>
            </svg>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No sources configured</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>
                Add sources in the <span style={{ color: 'var(--accent)' }}>Sources</span> view to monitor their health
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
        {errorSources.length > 0 && (
          <section>
            <div
              className="text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: '#f85149' }}
            >
              <span>Errors ({errorSources.length})</span>
            </div>
            <div className="space-y-2">
              {errorSources.map((src) => (
                <ErrorCard
                  key={src.id}
                  source={src}
                  onRetry={() => handleRetry(src)}
                  onDisable={() => handleDisable(src.id)}
                  retrying={retryingId === src.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Warnings */}
        {warnSources.length > 0 && (
          <section>
            <div
              className="text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: '#d29922' }}
            >
              <span>Warnings ({warnSources.length})</span>
            </div>
            <div className="space-y-2">
              {warnSources.map((src) => (
                <WarningCard
                  key={src.id}
                  source={src}
                  onRetry={() => handleRetry(src)}
                  retrying={retryingId === src.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Healthy */}
        {healthySources.length > 0 && (
          <section>
            <div
              className="text-[10px] uppercase tracking-widest mb-3"
              style={{ color: '#3fb950' }}
            >
              Healthy ({healthySources.length})
            </div>
            <div className="space-y-1.5">
              {healthySources.map((src) => (
                <HealthyRow key={src.id} source={src} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
