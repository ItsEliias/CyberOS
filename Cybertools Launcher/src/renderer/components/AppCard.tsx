import { motion } from 'framer-motion';
import { parseCyberlabStatus, parseVaultscraperStatus, formatRelativeTime, formatFutureTime } from '../lib/utils';
import type { CyberToolsConfig } from '@shared/types';

interface Props {
  appKey: 'cyberlab' | 'vaultscraper' | 'ghostvault' | 'recondesk' | 'signalboard' | 'cyberos';
  config: CyberToolsConfig;
  onLaunch: (key: string) => void;
  onUpdateNow?: () => void;
}

const APP_INFO = {
  cyberlab    : { name: 'CyberLab Companion',  icon: '🧪', abbr: 'CL' },
  vaultscraper: { name: 'VaultCore',           icon: '🗄', abbr: 'VC' },
  ghostvault  : { name: 'GhostVault',          icon: '👻', abbr: 'GV' },
  recondesk   : { name: 'ReconDesk',           icon: '🎯', abbr: 'RD' },
  signalboard : { name: 'SignalBoard',          icon: '📡', abbr: 'SB' },
  cyberos     : { name: 'CyberOS Dashboard',   icon: '🖥', abbr: 'OS' },
} as const;

function DotStatus({ color, glow }: { color: string; glow?: string }) {
  return (
    <div className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color, boxShadow: glow ? `0 0 6px ${glow}` : undefined }} />
  );
}

export default function AppCard({ appKey, config, onLaunch, onUpdateNow }: Props) {
  const info = APP_INFO[appKey];

  // ─── CyberLab ───────────────────────────────────────────────────────────────
  if (appKey === 'cyberlab') {
    const raw    = config.cyberlab_status;
    const status = parseCyberlabStatus(raw);
    const cfg    = config.cyberlab;
    const isConfigured = !!cfg?.execPath;

    let dotColor = '#6b7a99';
    let dotGlow: string | undefined;
    let statusLine = 'Not connected';

    if (!isConfigured) {
      dotColor  = '#6b7a99';
      statusLine = 'Not configured';
    } else if (!status.connected || status.isStale) {
      dotColor  = '#6b7a99';
      statusLine = 'Offline';
    } else if (status.sessionActive) {
      dotColor  = '#3fb950'; dotGlow = 'rgba(63,185,80,.5)';
      statusLine = status.currentLab
        ? `Active: ${status.currentLab}${status.sessionTime ? ` · ${status.sessionTime}` : ''}`
        : 'Session active';
    } else {
      dotColor  = '#4a9eff'; dotGlow = 'rgba(74,158,255,.3)';
      statusLine = status.currentLab ? `Idle · ${status.currentLab}` : 'Connected · idle';
    }

    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="rounded-lg p-3 border cursor-default"
        style={{ background: 'var(--card-bg)', borderColor: status.sessionActive ? 'var(--active-card-border)' : 'var(--border)',
          boxShadow: status.sessionActive ? '0 0 12px var(--active-card-glow)' : undefined }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DotStatus color={dotColor} glow={dotGlow} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {info.name}
              </div>
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {statusLine}
              </div>
            </div>
          </div>
          <button
            onClick={() => onLaunch(appKey)}
            className="text-[11px] px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Open
          </button>
        </div>

        {status.connected && !status.isStale && (
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[
              { label: 'Streak', value: status.streak > 0 ? `${status.streak}d` : '—' },
              { label: 'Labs',   value: status.labsDone > 0 ? `${status.labsDone}` : '—' },
              { label: 'Flags',  value: status.findingsCount > 0 ? `${status.findingsCount}` : '—' },
            ].map(m => (
              <div key={m.label} className="text-center py-1.5 rounded"
                style={{ background: 'var(--bg3)' }}>
                <div className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>
                  {m.value}
                </div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // ─── VaultCore ──────────────────────────────────────────────────────────────
  if (appKey === 'vaultscraper') {
    const raw    = config.vaultscraper_status;
    const status = parseVaultscraperStatus(raw);
    const cfg    = config.vaultscraper;
    const isConfigured = !!cfg?.execPath;

    let dotColor = '#6b7a99';
    let dotGlow: string | undefined;
    let statusLine = 'Not connected';

    if (!isConfigured) {
      statusLine = 'Not configured';
    } else if (!status.connected || status.isStale) {
      statusLine = 'Offline';
    } else if (status.hasError) {
      dotColor  = '#f85149'; statusLine = 'Error';
    } else if (status.activeScrape) {
      dotColor  = '#d29922'; dotGlow = 'rgba(210,153,34,.4)';
      statusLine = `Scraping: ${status.activeScrape.name} · ${status.progress}%`;
    } else {
      dotColor  = '#4a9eff'; dotGlow = 'rgba(74,158,255,.3)';
      const rel = formatRelativeTime(status.lastScrape);
      statusLine = rel ? `Last scrape: ${rel}` : 'Idle';
    }

    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="rounded-lg p-3 border"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DotStatus color={dotColor} glow={dotGlow} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {info.name}
              </div>
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {statusLine}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {isConfigured && onUpdateNow && (
              <button
                onClick={onUpdateNow}
                className="text-[11px] px-2 py-1 rounded font-medium transition-colors"
                style={{ background: 'var(--bg3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                title="Run update now"
              >
                ↻
              </button>
            )}
            <button
              onClick={() => onLaunch(appKey)}
              className="text-[11px] px-2.5 py-1 rounded font-medium transition-colors"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Open
            </button>
          </div>
        </div>

        {status.connected && !status.isStale && (
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[
              { label: 'Notes',   value: status.vaultNoteCount > 0 ? `${status.vaultNoteCount}` : '—' },
              { label: 'Sources', value: status.totalSources   > 0 ? `${status.totalSources}` : '—' },
              { label: 'Next',    value: formatFutureTime(status.nextScheduled) || '—' },
            ].map(m => (
              <div key={m.label} className="text-center py-1.5 rounded"
                style={{ background: 'var(--bg3)' }}>
                <div className="text-[11px] font-bold font-mono truncate px-1" style={{ color: 'var(--accent)' }}>
                  {m.value}
                </div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // ─── GhostVault ─────────────────────────────────────────────────────────────
  if (appKey === 'ghostvault') {
    const gvCfg        = config.ghostvault;
    const isConfigured = !!gvCfg?.execPath;
    const dotColor     = isConfigured ? '#4a9eff' : '#6b7a99';
    const dotGlow      = isConfigured ? 'rgba(74,158,255,.3)' : undefined;
    const statusLine   = isConfigured ? 'Ready' : 'Not configured';

    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="rounded-lg p-3 border"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DotStatus color={dotColor} glow={dotGlow} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {info.name}
              </div>
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {statusLine}
              </div>
            </div>
          </div>
          <button
            onClick={() => onLaunch(appKey)}
            disabled={!isConfigured}
            className="text-[11px] px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Open
          </button>
        </div>
      </motion.div>
    );
  }

  // ─── ReconDesk ──────────────────────────────────────────────────────────────
  if (appKey === 'recondesk') {
    const rdStatus     = config.recondesk_status;
    const isConfigured = !!config.recondesk?.execPath;
    const hasError     = !!rdStatus?.error;
    const dotColor     = !isConfigured ? '#6b7a99' : hasError ? '#f85149' : rdStatus?.activeTarget ? '#d29922' : '#4a9eff';
    const dotGlow      = !isConfigured ? undefined : rdStatus?.activeTarget ? 'rgba(210,153,34,.4)' : 'rgba(74,158,255,.3)';
    const statusLine   = !isConfigured ? 'Not configured' : hasError ? 'Error' : rdStatus?.activeTarget ? `Active: ${rdStatus.activeTarget}` : rdStatus ? 'Connected · idle' : 'Offline';

    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="rounded-lg p-3 border"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DotStatus color={dotColor} glow={dotGlow} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {info.name}
              </div>
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {statusLine}
              </div>
            </div>
          </div>
          <button
            onClick={() => onLaunch(appKey)}
            disabled={!isConfigured}
            className="text-[11px] px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Open
          </button>
        </div>

        {rdStatus && isConfigured && (
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {[
              { label: 'Targets', value: rdStatus.targetCount != null ? `${rdStatus.targetCount}` : '—' },
              { label: 'Active',  value: rdStatus.activeTarget ? rdStatus.activeTarget.split(' ')[0] : '—' },
            ].map(m => (
              <div key={m.label} className="text-center py-1.5 rounded"
                style={{ background: 'var(--bg3)' }}>
                <div className="text-[11px] font-bold font-mono truncate px-1" style={{ color: 'var(--accent)' }}>
                  {m.value}
                </div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // ─── SignalBoard ─────────────────────────────────────────────────────────────
  if (appKey === 'signalboard') {
    const sbStatus     = config.signalboard_status;
    const isConfigured = !!config.signalboard?.execPath;
    const hasError     = !!sbStatus?.error;
    const dotColor     = !isConfigured ? '#6b7a99' : hasError ? '#f85149' : sbStatus ? '#4a9eff' : '#6b7a99';
    const dotGlow      = isConfigured && sbStatus && !hasError ? 'rgba(74,158,255,.3)' : undefined;
    const statusLine   = !isConfigured ? 'Not configured' : hasError ? 'Error' : sbStatus ? 'Connected' : 'Offline';

    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="rounded-lg p-3 border"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DotStatus color={dotColor} glow={dotGlow} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {info.name}
              </div>
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {statusLine}
              </div>
            </div>
          </div>
          <button
            onClick={() => onLaunch(appKey)}
            disabled={!isConfigured}
            className="text-[11px] px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Open
          </button>
        </div>

        {sbStatus && isConfigured && (
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {[
              { label: 'Feeds',      value: sbStatus.feedCount != null ? `${sbStatus.feedCount}` : '—' },
              { label: 'Refreshed',  value: sbStatus.lastRefresh ? formatRelativeTime(sbStatus.lastRefresh) || '—' : '—' },
            ].map(m => (
              <div key={m.label} className="text-center py-1.5 rounded"
                style={{ background: 'var(--bg3)' }}>
                <div className="text-[11px] font-bold font-mono truncate px-1" style={{ color: 'var(--accent)' }}>
                  {m.value}
                </div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // ─── CyberOS Dashboard ───────────────────────────────────────────────────────
  const osCfg        = config.cyberos;
  const isConfigured = !!osCfg?.execPath;
  const osStatus     = config.cyberos_status;
  const dotColor     = !isConfigured ? '#6b7a99' : osStatus?.error ? '#f85149' : '#4a9eff';
  const dotGlow      = isConfigured && !osStatus?.error ? 'rgba(74,158,255,.3)' : undefined;
  const statusLine   = !isConfigured ? 'Not configured' : osStatus?.error ? 'Error' : osStatus ? 'Connected' : 'Ready';

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="rounded-lg p-3 border"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <DotStatus color={dotColor} glow={dotGlow} />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
              {info.name}
            </div>
            <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {statusLine}
            </div>
          </div>
        </div>
        <button
          onClick={() => onLaunch(appKey)}
          disabled={!isConfigured}
          className="text-[11px] px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Open
        </button>
      </div>
    </motion.div>
  );
}
