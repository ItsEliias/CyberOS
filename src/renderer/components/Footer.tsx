import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { formatElapsed, getElapsedSeconds } from '../lib/session';

export default function Footer() {
  const { tabs, activeTabId } = useStore();
  const [, setTick] = useState(0);
  const [version, setVersion] = useState('');

  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  useEffect(() => {
    window.electronAPI.getVersion().then(setVersion).catch(() => {});
  }, []);

  // Tick for timer display
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const timerEl = session?.timer.enabled ? (() => {
    const elapsed = session.timer.elapsed;
    const total = session.timer.totalSeconds;
    const remaining = total - elapsed;
    const overtime = remaining < 0;
    const display = formatElapsed(Math.abs(remaining));
    const color = overtime ? 'var(--danger)' : remaining < 300 ? 'var(--warning)' : 'var(--text-muted)';
    return (
      <span className="font-mono text-xs" style={{ color }}>
        {overtime ? '+' : ''}{display}
      </span>
    );
  })() : null;

  const findings = session ? (
    session.findings.ports.length +
    session.findings.flags.length +
    session.findings.credentials.length +
    session.findings.users.length
  ) : 0;

  return (
    <div className="flex items-center justify-between px-4 h-7 border-t border-[var(--border)] bg-[var(--bg2)] flex-shrink-0 text-xs text-[var(--text-muted)]">
      <span className="font-mono">ItsEliias // CyberLab Companion {version ? `v${version}` : ''}</span>
      <div className="flex items-center gap-4">
        {session && findings > 0 && (
          <span>{findings} finding{findings !== 1 ? 's' : ''}</span>
        )}
        {timerEl}
        <span>{tabs.length} session{tabs.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
