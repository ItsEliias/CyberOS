import { useEffect, useState } from 'react';
import { useStore } from '../store';

export default function Footer() {
  const { tabs, activeTabId, vpnStatus } = useStore();
  const [utcTime, setUtcTime] = useState(getUTC());
  const [version, setVersion] = useState('');

  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  useEffect(() => {
    window.electronAPI.getVersion().then(setVersion).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setUtcTime(getUTC()), 1000);
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

  return (
    <div
      className="h-6 flex items-center px-4 shrink-0 gap-3"
      style={{
        background: 'rgba(7,8,15,0.98)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        color: '#484f58',
        fontSize: '11px',
      }}
    >
      {/* VPN status */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: vpnColor,
            boxShadow: vpnOnline ? `0 0 3px ${vpnColor}88` : 'none',
          }}
        />
        <span style={{ color: vpnColor }}>
          {vpnOnline ? 'VPN: Connected' : vpnOff ? 'VPN: Off' : 'VPN: Unknown'}
        </span>
      </div>

      {targetIp && (
        <>
          <span style={{ color: 'rgba(42,51,71,0.6)' }}>·</span>
          <span className="font-mono" style={{ color: '#8b949e' }}>{targetIp}</span>
        </>
      )}

      {flagsCount > 0 && (
        <>
          <span style={{ color: 'rgba(42,51,71,0.6)' }}>·</span>
          <span style={{ color: '#3fb950' }}>{flagsCount} flag{flagsCount !== 1 ? 's' : ''}</span>
        </>
      )}

      {hintsCount > 0 && (
        <>
          <span style={{ color: 'rgba(42,51,71,0.6)' }}>·</span>
          <span style={{ color: '#d29922' }}>{hintsCount} hint{hintsCount !== 1 ? 's' : ''}</span>
        </>
      )}

      {findingsCount > 0 && (
        <>
          <span style={{ color: 'rgba(42,51,71,0.6)' }}>·</span>
          <span style={{ color: '#484f58' }}>
            {findingsCount} finding{findingsCount !== 1 ? 's' : ''}
          </span>
        </>
      )}

      <div className="flex-1" />

      <span className="font-mono tabular-nums" style={{ color: '#484f58' }}>{utcTime}</span>

      {version && (
        <>
          <span style={{ color: 'rgba(42,51,71,0.6)' }}>·</span>
          <span style={{ color: '#484f58' }}>v{version}</span>
        </>
      )}
    </div>
  );
}

function getUTC(): string {
  const now = new Date();
  return now.toUTCString().slice(17, 25) + ' UTC';
}
