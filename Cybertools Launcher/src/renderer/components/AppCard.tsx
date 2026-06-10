// AppCard — single <AppStatusCard> component replacing 6 near-duplicate variants.
// Migration: 391 LOC of if (appKey==='...') repetition → one component with
// per-app status parsers. Token-driven via tokens.css — no hardcoded hex values.
// Anti-slop: emoji icons replaced with SVG accent marks; no var(--bg3) parallel
// palette tokens; all colors resolve through tokens.css.

import { motion } from 'framer-motion';
import { parseCyberlabStatus, parseVaultscraperStatus, formatRelativeTime, formatFutureTime } from '../lib/utils';
import type { CyberToolsConfig } from '@shared/types';

interface Props {
  appKey: 'cyberlab' | 'vaultscraper' | 'ghostvault' | 'recondesk' | 'signalboard' | 'cyberos';
  config: CyberToolsConfig;
  onLaunch: (key: string) => void;
  onUpdateNow?: () => void;
}

// App display names — no emoji (anti-slop). Monochrome SVG identification
// is handled by the status dot accent color.
const APP_INFO: Record<Props['appKey'], { name: string; abbr: string }> = {
  cyberlab    : { name: 'CyberLab Companion', abbr: 'CL' },
  vaultscraper: { name: 'VaultCore',          abbr: 'VC' },
  ghostvault  : { name: 'GhostVault',         abbr: 'GV' },
  recondesk   : { name: 'ReconDesk',          abbr: 'RD' },
  signalboard : { name: 'SignalBoard',         abbr: 'SB' },
  cyberos     : { name: 'CyberOS Dashboard',  abbr: 'OS' },
};

// Status computation per app — isolated parser functions keep the card clean.
interface AppStatus {
  dotColor:   string;
  dotGlow?:   string;
  statusLine: string;
  metrics?:   { label: string; value: string }[];
  isActive?:  boolean; // triggers accent border
  canOpen:    boolean;
  extraAction?: { label: string; onClick: () => void };
}

function getCyberlabStatus(config: CyberToolsConfig, onUpdateNow?: () => void): AppStatus {
  const raw    = config.cyberlab_status;
  const status = parseCyberlabStatus(raw);
  const cfg    = config.cyberlab;
  const canOpen = !!cfg?.execPath;

  if (!canOpen)
    return { dotColor: 'var(--state-offline)', statusLine: 'Not configured', canOpen };
  if (!status.connected || status.isStale)
    return { dotColor: 'var(--state-offline)', statusLine: 'Offline', canOpen };
  if (status.sessionActive) {
    const line = status.currentLab
      ? `Active: ${status.currentLab}${status.sessionTime ? ` · ${status.sessionTime}` : ''}`
      : 'Session active';
    return {
      dotColor: 'var(--state-online)', dotGlow: 'rgba(63,185,80,.5)',
      statusLine: line, isActive: true, canOpen,
      metrics: [
        { label: 'Streak', value: status.streak   > 0 ? `${status.streak}d`  : '—' },
        { label: 'Labs',   value: status.labsDone  > 0 ? `${status.labsDone}` : '—' },
        { label: 'Flags',  value: status.findingsCount > 0 ? `${status.findingsCount}` : '—' },
      ],
    };
  }
  return {
    dotColor: 'var(--info)', dotGlow: 'rgba(74,158,255,.3)',
    statusLine: status.currentLab ? `Idle · ${status.currentLab}` : 'Connected · idle',
    canOpen,
    metrics: [
      { label: 'Streak', value: status.streak   > 0 ? `${status.streak}d`  : '—' },
      { label: 'Labs',   value: status.labsDone  > 0 ? `${status.labsDone}` : '—' },
      { label: 'Flags',  value: status.findingsCount > 0 ? `${status.findingsCount}` : '—' },
    ],
    extraAction: onUpdateNow ? { label: '↻', onClick: onUpdateNow } : undefined,
  };
}

function getVaultscraperStatus(config: CyberToolsConfig, onUpdateNow?: () => void): AppStatus {
  const raw    = config.vaultscraper_status;
  const status = parseVaultscraperStatus(raw);
  const cfg    = config.vaultscraper;
  const canOpen = !!cfg?.execPath;

  if (!canOpen)
    return { dotColor: 'var(--state-offline)', statusLine: 'Not configured', canOpen };
  if (!status.connected || status.isStale)
    return { dotColor: 'var(--state-offline)', statusLine: 'Offline', canOpen };
  if (status.hasError)
    return { dotColor: 'var(--state-blocked)', statusLine: 'Error', canOpen };
  if (status.activeScrape) {
    return {
      dotColor: 'var(--state-pending)', dotGlow: 'rgba(210,153,34,.4)',
      statusLine: `Scraping: ${status.activeScrape.name} · ${status.progress}%`,
      canOpen,
      metrics: [
        { label: 'Notes',   value: status.vaultNoteCount > 0 ? `${status.vaultNoteCount}` : '—' },
        { label: 'Sources', value: status.totalSources   > 0 ? `${status.totalSources}` : '—' },
        { label: 'Next',    value: formatFutureTime(status.nextScheduled) || '—' },
      ],
      extraAction: onUpdateNow ? { label: '↻', onClick: onUpdateNow } : undefined,
    };
  }
  const rel = formatRelativeTime(status.lastScrape);
  return {
    dotColor: 'var(--info)', dotGlow: 'rgba(74,158,255,.3)',
    statusLine: rel ? `Last scrape: ${rel}` : 'Idle',
    canOpen,
    metrics: [
      { label: 'Notes',   value: status.vaultNoteCount > 0 ? `${status.vaultNoteCount}` : '—' },
      { label: 'Sources', value: status.totalSources   > 0 ? `${status.totalSources}` : '—' },
      { label: 'Next',    value: formatFutureTime(status.nextScheduled) || '—' },
    ],
    extraAction: onUpdateNow ? { label: '↻', onClick: onUpdateNow } : undefined,
  };
}

function getSimpleStatus(
  cfg: { execPath?: string } | undefined,
  statusObj: { error?: unknown; activeTarget?: string; lastRefresh?: string; feedCount?: number } | null | undefined,
  activeLabel?: string,
): AppStatus {
  const canOpen = !!cfg?.execPath;
  if (!canOpen)
    return { dotColor: 'var(--state-offline)', statusLine: 'Not configured', canOpen };
  if (statusObj?.error)
    return { dotColor: 'var(--state-blocked)', statusLine: 'Error', canOpen };
  if (statusObj?.activeTarget)
    return {
      dotColor: 'var(--state-pending)', dotGlow: 'rgba(210,153,34,.4)',
      statusLine: activeLabel ? `${activeLabel}: ${statusObj.activeTarget}` : statusObj.activeTarget,
      canOpen,
    };
  if (statusObj)
    return { dotColor: 'var(--info)', dotGlow: 'rgba(74,158,255,.3)', statusLine: 'Connected', canOpen };
  return { dotColor: 'var(--info)', dotGlow: 'rgba(74,158,255,.3)', statusLine: 'Ready', canOpen };
}

function getAppStatus(appKey: Props['appKey'], config: CyberToolsConfig, onUpdateNow?: () => void): AppStatus {
  switch (appKey) {
    case 'cyberlab':     return getCyberlabStatus(config, onUpdateNow);
    case 'vaultscraper': return getVaultscraperStatus(config, onUpdateNow);
    case 'ghostvault': {
      const cfg = config.ghostvault;
      const canOpen = !!cfg?.execPath;
      return {
        dotColor: canOpen ? 'var(--info)' : 'var(--state-offline)',
        dotGlow:  canOpen ? 'rgba(74,158,255,.3)' : undefined,
        statusLine: canOpen ? 'Ready' : 'Not configured',
        canOpen,
      };
    }
    case 'recondesk': {
      const rdStatus     = config.recondesk_status as { error?: unknown; activeTarget?: string; targetCount?: number } | null | undefined;
      const s = getSimpleStatus(config.recondesk, rdStatus, 'Active');
      if (rdStatus && s.canOpen) {
        s.metrics = [
          { label: 'Targets', value: rdStatus.targetCount != null ? `${rdStatus.targetCount}` : '—' },
          { label: 'Active',  value: rdStatus.activeTarget ? rdStatus.activeTarget.split(' ')[0] : '—' },
        ];
      }
      return s;
    }
    case 'signalboard': {
      const sbStatus = config.signalboard_status as { error?: unknown; feedCount?: number; lastRefresh?: string } | null | undefined;
      const s = getSimpleStatus(config.signalboard, sbStatus as { error?: unknown; activeTarget?: string } | undefined);
      if (sbStatus && s.canOpen) {
        s.metrics = [
          { label: 'Feeds',     value: sbStatus.feedCount != null ? `${sbStatus.feedCount}` : '—' },
          { label: 'Refreshed', value: sbStatus.lastRefresh ? (formatRelativeTime(sbStatus.lastRefresh) || '—') : '—' },
        ];
      }
      return s;
    }
    case 'cyberos': {
      const osCfg    = config.cyberos;
      const osStatus = config.cyberos_status as { error?: unknown } | null | undefined;
      const canOpen = !!osCfg?.execPath;
      return {
        dotColor: !canOpen ? 'var(--state-offline)' : osStatus?.error ? 'var(--state-blocked)' : 'var(--info)',
        dotGlow:  canOpen && !osStatus?.error ? 'rgba(74,158,255,.3)' : undefined,
        statusLine: !canOpen ? 'Not configured' : osStatus?.error ? 'Error' : osStatus ? 'Connected' : 'Ready',
        canOpen,
      };
    }
  }
}

// ── AppStatusCard — the single unified card ──────────────────────────────────

export default function AppCard({ appKey, config, onLaunch, onUpdateNow }: Props) {
  const info   = APP_INFO[appKey];
  const status = getAppStatus(appKey, config, onUpdateNow);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="rounded-lg p-3 border cursor-default"
      style={{
        background  : 'var(--surface-1)',
        borderColor : status.isActive ? 'var(--state-online)' : 'var(--border-default)',
        boxShadow   : status.isActive ? '0 0 12px rgba(63,185,80,.2)' : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Status dot + name + status line */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: status.dotColor, boxShadow: status.dotGlow ? `0 0 6px ${status.dotGlow}` : undefined }}
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate text-text-primary">
              {info.name}
            </div>
            <div className="text-[11px] truncate mt-0.5 text-text-secondary">
              {status.statusLine}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 flex-shrink-0">
          {status.extraAction && (
            <button
              onClick={status.extraAction.onClick}
              className="text-[11px] px-2 py-1 rounded font-medium transition-colors"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
              title="Run update now"
            >
              {status.extraAction.label}
            </button>
          )}
          <button
            onClick={() => onLaunch(appKey)}
            disabled={!status.canOpen}
            className="text-[11px] px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            Open
          </button>
        </div>
      </div>

      {/* Optional metrics mini-grid — uses StatChip-style token vars */}
      {status.metrics && status.metrics.length > 0 && (
        <div className={`mt-2.5 grid gap-2`} style={{ gridTemplateColumns: `repeat(${status.metrics.length}, 1fr)` }}>
          {status.metrics.map(m => (
            <div
              key={m.label}
              className="text-center py-1.5 rounded"
              style={{ background: 'var(--surface-2)' }}
            >
              <div
                className="text-[11px] font-bold font-mono truncate px-1 tabular-nums"
                style={{ color: 'var(--accent)' }}
              >
                {m.value}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-text-muted">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
