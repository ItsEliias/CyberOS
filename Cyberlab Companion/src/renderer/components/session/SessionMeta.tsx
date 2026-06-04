import { useState } from 'react';
import type { Session } from '@shared/types';

const PLATFORM_COLORS: Record<string, string> = {
  HTB:    '#9fef00',
  THM:    '#ff4040',
  CTF:    '#b44fff',
  Other:  '#8b949e',
};

const DIFF_COLORS: Record<string, string> = {
  Easy:   '#3fb950',
  Medium: '#d29922',
  Hard:   '#ff7a00',
  Insane: '#f85149',
};

interface SessionMetaProps {
  session: Session;
}

export default function SessionMeta({ session }: SessionMetaProps) {
  const [copied, setCopied] = useState(false);

  const ip = session.target?.ip || session.targetIp || '';
  const started = session.createdAt
    ? new Date(session.createdAt)
    : new Date(session.startTime);

  const elapsedMs = Date.now() - started.getTime();
  const hours = Math.floor(elapsedMs / 3600000);
  const minutes = Math.floor((elapsedMs % 3600000) / 60000);
  const startedLabel = hours > 0 ? `${hours}h ${minutes}m ago` : `${minutes}m ago`;

  async function copyIp() {
    if (!ip) return;
    await navigator.clipboard.writeText(ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-2">
      {/* Target IP */}
      {ip && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Target</span>
          <button
            className="font-mono text-xs px-2 py-0.5 rounded transition-colors"
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              color: copied ? 'var(--success)' : 'var(--text)',
              flex: 1,
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            onClick={copyIp}
            title="Click to copy IP"
          >
            {copied ? 'Copied!' : ip}
          </button>
        </div>
      )}

      {/* Platform + Difficulty badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[10px] px-2 py-0.5 rounded font-medium"
          style={{
            background: (PLATFORM_COLORS[session.platform] || '#8b949e') + '22',
            color: PLATFORM_COLORS[session.platform] || '#8b949e',
            border: `1px solid ${(PLATFORM_COLORS[session.platform] || '#8b949e')}44`,
          }}
        >
          {session.platform}
        </span>
        {session.difficulty && (
          <span
            className="text-[10px] font-medium"
            style={{ color: DIFF_COLORS[session.difficulty] || 'var(--text-muted)' }}
          >
            {session.difficulty}
          </span>
        )}
        {session.labType && (
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {session.labType}
          </span>
        )}
      </div>

      {/* Started */}
      <div className="flex items-center gap-2">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Started {startedLabel}
        </span>
      </div>
    </div>
  );
}
