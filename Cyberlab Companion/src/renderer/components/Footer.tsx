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

  const vpnColor = vpnStatus.status === 'active' ? '#3fb950' :
                   vpnStatus.status === 'off' ? '#f85149' : '#4a5568';

  const findingsCount = session ? (
    session.findings.ports.length +
    session.findings.flags.length +
    session.findings.credentials.length +
    session.findings.users.length +
    session.findings.cves.length
  ) : 0;

  const hintsCount = session?.hintsUsed || 0;
  const flagsCount = session?.findings?.flags?.length || 0;
  const targetIp = session?.target?.ip || session?.targetIp || '';

  return (
    <div
      className="h-6 border-t flex items-center px-4 text-xs shrink-0"
      style={{
        background: 'rgba(10, 10, 15, 0.92)',
        borderTopColor: 'rgba(42, 51, 71, 0.5)',
        color: '#4a5568',
      }}
    >
      {/* VPN status */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: vpnColor }} />
        <span style={{ color: vpnColor, fontSize: '11px' }}>
          {vpnStatus.status === 'active' ? 'VPN: Connected' : vpnStatus.status === 'off' ? 'VPN: Off' : 'VPN: Unknown'}
        </span>
      </div>

      {targetIp && (
        <>
          <span className="mx-2" style={{ color: '#2a3347' }}>•</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8b949e', fontSize: '11px' }}>
            {targetIp}
          </span>
        </>
      )}

      {flagsCount > 0 && (
        <>
          <span className="mx-2" style={{ color: '#2a3347' }}>•</span>
          <span style={{ color: '#3fb950', fontSize: '11px' }}>
            Flags: {flagsCount}
          </span>
        </>
      )}

      {hintsCount > 0 && (
        <>
          <span className="mx-2" style={{ color: '#2a3347' }}>•</span>
          <span style={{ color: '#d29922', fontSize: '11px' }}>
            Hints: {hintsCount}
          </span>
        </>
      )}

      {findingsCount > 0 && (
        <>
          <span className="mx-2" style={{ color: '#2a3347' }}>•</span>
          <span style={{ color: '#8b949e', fontSize: '11px' }}>
            {findingsCount} finding{findingsCount !== 1 ? 's' : ''}
          </span>
        </>
      )}

      <div className="flex-1" />

      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: '#4a5568',
        }}
      >
        {utcTime}
      </span>

      {version && (
        <>
          <span className="mx-2" style={{ color: '#2a3347' }}>•</span>
          <span style={{ fontSize: '11px' }}>v{version}</span>
        </>
      )}
    </div>
  );
}

function getUTC(): string {
  const now = new Date();
  return now.toUTCString().slice(17, 25) + ' UTC';
}
