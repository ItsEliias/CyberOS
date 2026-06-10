import { useEffect, useState } from 'react';
import { useStore } from '../store';

const APP_START = Date.now();

function formatSessionActive(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Footer() {
  const { tabs, activeTabId, vpnStatus } = useStore();
  const [utcTime, setUtcTime] = useState(getUTC());
  const [version, setVersion] = useState('');
  const [appElapsed, setAppElapsed] = useState(Date.now() - APP_START);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  useEffect(() => {
    window.electronAPI.getVersion().then(setVersion).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setUtcTime(getUTC());
      setAppElapsed(Date.now() - APP_START);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const vpnOnline = vpnStatus.status === 'active';
  const vpnOff    = vpnStatus.status === 'off';
  const vpnColor  = vpnOnline ? '#3fb950' : vpnOff ? '#f85149' : '#484f58';

  const findingsCount = session ? (
    session.findings.ports.length +
    session.findings.flags.length +
    session.findings.credentials.length +
    session.findings.users.length +
    session.findings.cves.length
  ) : 0;

  const hintsCount = session?.hintsUsed || 0;
  const flagsCount = session?.findings?.flags?.length || 0;
  const targetIp   = session?.target?.ip || session?.targetIp || '';

  const sep = <span style={{ color: 'var(--border-default)', fontSize: 8, lineHeight: 1 }}>·</span>;

  return (
    <div
      className="h-5 flex items-center px-3 shrink-0 gap-2 font-mono tabular-nums"
      style={{
        background: 'var(--surface-0)',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: 'var(--type-caption)',
        color: 'var(--text-muted)',
      }}
    >
      {/* VPN indicator */}
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: vpnColor, boxShadow: vpnOnline ? `0 0 3px ${vpnColor}66` : 'none', flexShrink: 0 }}
        />
        <span style={{ color: vpnColor }}>
          {vpnOnline ? 'vpn' : vpnOff ? 'no-vpn' : 'vpn?'}
        </span>
      </div>

      {targetIp && <>{sep}<span style={{ color: 'var(--text-muted)' }}>{targetIp}</span></>}
      {flagsCount > 0 && <>{sep}<span style={{ color: '#3fb950' }}>{flagsCount}f</span></>}
      {hintsCount > 0 && <>{sep}<span style={{ color: '#d29922' }}>{hintsCount}h</span></>}
      {findingsCount > 0 && <>{sep}<span>{findingsCount} findings</span></>}

      <div className="flex-1" />

      <span>{formatSessionActive(appElapsed)}</span>
      {sep}
      <span>{utcTime}</span>
      {version && <>{sep}<span>v{version}</span></>}
    </div>
  );
}

function getUTC(): string {
  const now = new Date();
  return now.toUTCString().slice(17, 25) + ' UTC';
}
