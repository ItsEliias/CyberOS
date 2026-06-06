import { useLauncherStore } from '../store';

interface Props {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: Props) {
  const vpn     = useLauncherStore(s => s.vpn);
  const version = useLauncherStore(s => s.version);

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
