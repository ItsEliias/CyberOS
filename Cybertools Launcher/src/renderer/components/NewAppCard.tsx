import { motion } from 'framer-motion';
import { formatRelativeTime } from '../lib/utils';
import type { CyberToolsConfig } from '@shared/types';

export type NewAppKey = 'credvault' | 'playbookstudio' | 'reportforge' | 'terminallink' | 'networkmap';

interface Props {
  appKey: NewAppKey;
  config: CyberToolsConfig;
  onLaunch: (key: string) => void;
}

const APP_META: Record<NewAppKey, { name: string; subtitle: string; accent: string }> = {
  credvault     : { name: 'CredVault',       subtitle: 'Encrypted credential manager', accent: '#f78166' },
  playbookstudio: { name: 'PlaybookStudio',  subtitle: 'Methodology playbooks',        accent: '#4a9eff' },
  reportforge   : { name: 'ReportForge',     subtitle: 'Assessment report builder',    accent: '#3fb950' },
  terminallink  : { name: 'TerminalLink',    subtitle: 'Session-linked terminal',      accent: '#00ff41' },
  networkmap    : { name: 'NetworkMap',      subtitle: 'Network topology mapper',      accent: '#d29922' },
};

function DotStatus({ color, glow }: { color: string; glow?: string }) {
  return (
    <div className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color, boxShadow: glow ? `0 0 6px ${glow}` : undefined }} />
  );
}

function MetricCell({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="text-center py-1.5 rounded" style={{ background: 'var(--bg3)' }}>
      <div className="text-[11px] font-bold font-mono truncate px-1" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
        {label}
      </div>
    </div>
  );
}

export default function NewAppCard({ appKey, config, onLaunch }: Props) {
  const meta         = APP_META[appKey];
  const isConfigured = !!(config as Record<string, { execPath?: string } | undefined>)[appKey]?.execPath;

  // ─── CredVault ───────────────────────────────────────────────────────────────
  if (appKey === 'credvault') {
    const status     = config.credvault_status;
    const isActive   = !!status?.active;
    const dotColor   = !isConfigured ? '#6b7a99' : isActive ? meta.accent : '#4a9eff';
    const dotGlow    = isConfigured ? `${meta.accent}55` : undefined;
    const statusLine = !isConfigured ? 'Not configured'
      : isActive ? 'Active'
      : status?.lastActive ? `Last active: ${formatRelativeTime(status.lastActive) || '—'}`
      : 'Ready';
    const credCount  = status?.credentialCount;

    return (
      <motion.div whileHover={{ scale: 1.01 }} className="rounded-lg p-3 border"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DotStatus color={dotColor} glow={dotGlow} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {meta.name}
              </div>
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {statusLine}
              </div>
            </div>
          </div>
          <button onClick={() => onLaunch(appKey)} disabled={!isConfigured}
            className="text-[11px] px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors disabled:opacity-40"
            style={{ background: meta.accent, color: '#fff' }}>
            Open
          </button>
        </div>
        {isConfigured && credCount != null && (
          <div className="mt-2.5 grid grid-cols-1 gap-2">
            <MetricCell label="Credentials" value={`${credCount}`} accent={meta.accent} />
          </div>
        )}
      </motion.div>
    );
  }

  // ─── PlaybookStudio ──────────────────────────────────────────────────────────
  if (appKey === 'playbookstudio') {
    const status      = config.playbookstudio_status;
    const isActive    = !!status?.active;
    const dotColor    = !isConfigured ? '#6b7a99' : isActive ? meta.accent : '#4a9eff';
    const dotGlow     = isConfigured ? `${meta.accent}55` : undefined;
    const statusLine  = !isConfigured ? 'Not configured'
      : isActive ? 'Active'
      : status?.lastActive ? `Last active: ${formatRelativeTime(status.lastActive) || '—'}`
      : 'Ready';
    const playbook    = status?.activePlaybook ?? 'None';

    return (
      <motion.div whileHover={{ scale: 1.01 }} className="rounded-lg p-3 border"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DotStatus color={dotColor} glow={dotGlow} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {meta.name}
              </div>
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {statusLine}
              </div>
            </div>
          </div>
          <button onClick={() => onLaunch(appKey)} disabled={!isConfigured}
            className="text-[11px] px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors disabled:opacity-40"
            style={{ background: meta.accent, color: '#fff' }}>
            Open
          </button>
        </div>
        {isConfigured && (
          <div className="mt-2.5 grid grid-cols-1 gap-2">
            <MetricCell label="Active Playbook" value={playbook} accent={meta.accent} />
          </div>
        )}
      </motion.div>
    );
  }

  // ─── ReportForge ─────────────────────────────────────────────────────────────
  if (appKey === 'reportforge') {
    const status      = config.reportforge_status;
    const isActive    = !!status?.active;
    const dotColor    = !isConfigured ? '#6b7a99' : isActive ? meta.accent : '#4a9eff';
    const dotGlow     = isConfigured ? `${meta.accent}55` : undefined;
    const statusLine  = !isConfigured ? 'Not configured'
      : isActive ? 'Active'
      : status?.lastActive ? `Last active: ${formatRelativeTime(status.lastActive) || '—'}`
      : 'Ready';
    const reportCount = status?.reportCount;

    return (
      <motion.div whileHover={{ scale: 1.01 }} className="rounded-lg p-3 border"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DotStatus color={dotColor} glow={dotGlow} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {meta.name}
              </div>
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {statusLine}
              </div>
            </div>
          </div>
          <button onClick={() => onLaunch(appKey)} disabled={!isConfigured}
            className="text-[11px] px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors disabled:opacity-40"
            style={{ background: meta.accent, color: '#fff' }}>
            Open
          </button>
        </div>
        {isConfigured && reportCount != null && (
          <div className="mt-2.5 grid grid-cols-1 gap-2">
            <MetricCell label="Reports" value={`${reportCount}`} accent={meta.accent} />
          </div>
        )}
      </motion.div>
    );
  }

  // ─── TerminalLink ─────────────────────────────────────────────────────────────
  if (appKey === 'terminallink') {
    const status      = config.terminallink_status;
    const isActive    = !!status?.active;
    const dotColor    = !isConfigured ? '#6b7a99' : isActive ? meta.accent : '#4a9eff';
    const dotGlow     = isConfigured ? `${meta.accent}55` : undefined;
    const statusLine  = !isConfigured ? 'Not configured'
      : isActive ? 'Active'
      : status?.lastActive ? `Last active: ${formatRelativeTime(status.lastActive) || '—'}`
      : 'Ready';
    const cmdCount    = status?.commandCount;

    return (
      <motion.div whileHover={{ scale: 1.01 }} className="rounded-lg p-3 border"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DotStatus color={dotColor} glow={dotGlow} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {meta.name}
              </div>
              <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {statusLine}
              </div>
            </div>
          </div>
          <button onClick={() => onLaunch(appKey)} disabled={!isConfigured}
            className="text-[11px] px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors disabled:opacity-40"
            style={{ background: meta.accent, color: '#fff' }}>
            Open
          </button>
        </div>
        {isConfigured && cmdCount != null && (
          <div className="mt-2.5 grid grid-cols-1 gap-2">
            <MetricCell label="Commands" value={`${cmdCount}`} accent={meta.accent} />
          </div>
        )}
      </motion.div>
    );
  }

  // ─── NetworkMap ──────────────────────────────────────────────────────────────
  const status      = config.networkmap_status;
  const isActive    = !!status?.active;
  const dotColor    = !isConfigured ? '#6b7a99' : isActive ? meta.accent : '#4a9eff';
  const dotGlow     = isConfigured ? `${meta.accent}55` : undefined;
  const statusLine  = !isConfigured ? 'Not configured'
    : isActive ? 'Active'
    : status?.lastActive ? `Last active: ${formatRelativeTime(status.lastActive) || '—'}`
    : 'Ready';
  const graphName   = status?.currentGraph;

  return (
    <motion.div whileHover={{ scale: 1.01 }} className="rounded-lg p-3 border"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <DotStatus color={dotColor} glow={dotGlow} />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
              {meta.name}
            </div>
            <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {statusLine}
            </div>
          </div>
        </div>
        <button onClick={() => onLaunch(appKey)} disabled={!isConfigured}
          className="text-[11px] px-2.5 py-1 rounded font-medium flex-shrink-0 transition-colors disabled:opacity-40"
          style={{ background: meta.accent, color: '#fff' }}>
          Open
        </button>
      </div>
      {isConfigured && graphName && (
        <div className="mt-2.5 grid grid-cols-1 gap-2">
          <MetricCell label="Active Graph" value={graphName} accent={meta.accent} />
        </div>
      )}
    </motion.div>
  );
}
