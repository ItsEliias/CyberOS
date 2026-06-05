const CORES         = ['stealth', 'graphite', 'frost', 'oled'] as const;
const PERSONALITIES = ['neutral', 'cyberpunk', 'terminal', 'threat'] as const;

interface Props {
  core: string;
  personality: string;
  onCoreChange: (c: string) => void;
  onPersonalityChange: (p: string) => void;
}

export default function Footer({ core, personality, onCoreChange, onPersonalityChange }: Props) {
  return (
    <div className="border-t px-3 py-2 flex items-center justify-between"
      style={{
        borderColor  : 'rgba(42,51,71,0.6)',
        background   : 'rgba(10,12,20,0.95)',
      }}>

      <span className="text-[9px] uppercase tracking-[0.2em] font-mono"
        style={{ color: '#4a5568' }}>
        CyberOS Ecosystem
      </span>

      <div className="flex items-center gap-2">
        {/* Core chips */}
        <div className="flex gap-1">
          {CORES.map(c => (
            <button key={c}
              onClick={() => onCoreChange(c)}
              title={c}
              className="w-3 h-3 rounded-sm transition-all hover:opacity-80"
              style={{
                background: core === c ? '#d29922' : 'rgba(42,51,71,0.6)',
                opacity   : core === c ? 1 : 0.4,
              }} />
          ))}
        </div>

        <div className="w-px h-3" style={{ background: 'rgba(42,51,71,0.6)' }} />

        {/* Personality chips */}
        <div className="flex gap-1">
          {PERSONALITIES.map(p => (
            <button key={p}
              onClick={() => onPersonalityChange(p)}
              title={p}
              className="text-[8px] px-1 rounded transition-all hover:opacity-80 font-mono"
              style={{
                background: personality === p ? 'rgba(210,153,34,0.2)' : 'rgba(22,27,39,0.6)',
                color     : personality === p ? '#d29922' : '#4a5568',
                border    : `1px solid ${personality === p ? 'rgba(210,153,34,0.3)' : 'rgba(42,51,71,0.4)'}`,
              }}>
              {p[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
