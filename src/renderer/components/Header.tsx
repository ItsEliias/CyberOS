import { useLauncherStore } from '../store';

interface Props {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: Props) {
  const vpn     = useLauncherStore(s => s.vpn);
  const version = useLauncherStore(s => s.version);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b"
      style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--accent)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8L8 2L14 8L8 14L2 8Z" fill="white" fillOpacity="0.9"/>
            <path d="M5 8L8 5L11 8L8 11L5 8Z" fill="white"/>
          </svg>
        </div>
        <div>
          <div className="text-xs font-bold tracking-widest uppercase leading-none"
            style={{ color: 'var(--accent)' }}>
            CYBERTOOLS
          </div>
          <div className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--text-dim)' }}>
            v{version}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* VPN indicator */}
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${vpn.active ? 'bg-green-400' : 'bg-red-500'}`}
            style={vpn.active ? { boxShadow: '0 0 6px #3fb950' } : {}} />
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
            {vpn.active ? 'VPN ON' : 'VPN OFF'}
          </span>
        </div>

        {/* Settings button */}
        <button
          onClick={onSettingsClick}
          className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 1v1M7 12v1M1 7h1M12 7h1M2.93 2.93l.71.71M10.36 10.36l.71.71M2.93 11.07l.71-.71M10.36 3.64l.71-.71"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
