import { useEffect, useState } from 'react';
import { useLauncherStore } from '../store';
import HelpTip from './ui/HelpTip';

interface Props {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: Props) {
  const vpn     = useLauncherStore(s => s.vpn);
  const version = useLauncherStore(s => s.version);
  const [ssoUnlocked, setSsoUnlocked] = useState<boolean | null>(null);
  const [ssoExpiresAt, setSsoExpiresAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Poll the shared SSO state every 5 s so the indicator stays accurate
  // even when CredVault is updated outside the Launcher.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const r = await window.api.getSSO();
        if (!cancelled) {
          setSsoUnlocked(!!r.unlocked);
          setSsoExpiresAt(r.expiresAt ?? null);
        }
      } catch { if (!cancelled) setSsoUnlocked(null); }
    }
    void check();
    const t = setInterval(check, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Tick once a second so the countdown stays current between polls.
  useEffect(() => {
    if (!ssoUnlocked || !ssoExpiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ssoUnlocked, ssoExpiresAt]);

  const ssoCountdown = (() => {
    if (!ssoUnlocked || !ssoExpiresAt) return null;
    const ms = new Date(ssoExpiresAt).getTime() - now;
    if (ms <= 0) return null;
    const totalSec = Math.floor(ms / 1000);
    if (totalSec >= 60) return `${Math.floor(totalSec / 60)}m`;
    return `${totalSec}s`;
  })();
  const ssoExpiringSoon = ssoUnlocked && ssoExpiresAt
    ? new Date(ssoExpiresAt).getTime() - now < 120_000
    : false;
  const ssoDotColor   = !ssoUnlocked ? '#f85149'
                       : ssoExpiringSoon ? '#d29922' : '#3fb950';
  const ssoTextColor  = !ssoUnlocked ? '#8b949e'
                       : ssoExpiringSoon ? '#d29922' : '#3fb950';

  async function onSSOClick() {
    if (ssoUnlocked) {
      // Currently unlocked → lock everything.
      try { await window.api.lockEcosystem(); setSsoUnlocked(false); } catch { /* ignore */ }
    } else {
      // Currently locked → bounce to CredVault so the user can unlock.
      try { await window.api.launchApp('credvault'); } catch { /* ignore */ }
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b"
      style={{
        borderColor    : 'rgba(42,51,71,0.6)',
        background     : 'rgba(10,12,20,0.95)',
        backdropFilter : 'blur(12px)',
        WebkitAppRegion: 'drag',
        cursor         : 'grab',
      } as React.CSSProperties}>

      {/* Logo */}
      <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(210,153,34,0.15)', border: '1px solid rgba(210,153,34,0.3)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z"
              stroke="#d29922" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
            <path d="M7 4L10 6V8.5L7 10.5L4 8.5V6L7 4Z"
              fill="#d29922" fillOpacity="0.6"/>
          </svg>
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase leading-none font-mono"
            style={{ color: '#d29922' }}>
            CyberOS
          </div>
          <div className="text-[9px] leading-none mt-0.5 font-mono" style={{ color: '#4a5568' }}>
            Launcher
          </div>
        </div>
      </div>

      {/* Right: VPN status + settings */}
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* SSO session lock indicator */}
        <button onClick={onSSOClick}
          className="flex items-center gap-1.5 px-2 py-1 rounded transition-all hover:bg-white/5"
          style={{
            background: 'rgba(22,27,39,0.6)',
            border: '1px solid rgba(42,51,71,0.6)',
            cursor: 'pointer',
          }}
          title={ssoUnlocked === null
            ? 'CredVault session state unknown'
            : ssoUnlocked
              ? 'CredVault session active — click to lock'
              : 'CredVault locked — click to open CredVault'}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke={ssoDotColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            {ssoUnlocked
              ? <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              : <path d="M7 11V7a5 5 0 0 1 10 0v4" />}
          </svg>
          <span className="text-[9px] font-mono tracking-wider"
            style={{ color: ssoTextColor }}>
            {ssoUnlocked
              ? (ssoCountdown ? `SSO ${ssoCountdown}` : 'SSO')
              : 'LOCKED'}
          </span>
        </button>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded"
          style={{ background: 'rgba(22,27,39,0.6)', border: '1px solid rgba(42,51,71,0.6)' }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: vpn.active ? '#3fb950' : '#f85149',
              boxShadow : vpn.active ? '0 0 6px rgba(63,185,80,0.6)' : undefined,
            }} />
          <span className="text-[9px] font-mono tracking-wider"
            style={{ color: vpn.active ? '#3fb950' : '#8b949e' }}>
            {vpn.active ? 'VPN' : 'NO VPN'}
          </span>
          <HelpTip
            title="VPN indicator"
            body="Reflects whether a VPN tunnel is currently detected on this machine. Green means traffic is routed through the tunnel — red means it isn't."
            align="right"
          />
        </div>

        <div className="text-[9px] font-mono" style={{ color: '#4a5568' }}>
          v{version}
        </div>

        <button
          onClick={onSettingsClick}
          className="w-6 h-6 rounded flex items-center justify-center transition-all hover:bg-white/5"
          style={{ color: '#4a5568' }}
          title="Settings"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 1v1M7 12v1M1 7h1M12 7h1M2.93 2.93l.71.71M10.36 10.36l.71.71M2.93 11.07l.71-.71M10.36 3.64l.71-.71"
              stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
        </button>

        <button
          onClick={() => window.api.hidePanel()}
          className="w-6 h-6 rounded flex items-center justify-center transition-all hover:bg-white/5"
          style={{ color: '#4a5568' }}
          title="Minimise (re-open from tray icon)"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <line x1="3" y1="10.5" x2="11" y2="10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
