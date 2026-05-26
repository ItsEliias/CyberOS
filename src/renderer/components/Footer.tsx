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
      style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
      <span className="text-[9px] uppercase tracking-widest font-semibold"
        style={{ color: 'var(--text-dim)' }}>
        ItsEliias
      </span>

      <div className="flex items-center gap-2">
        {/* Core chips */}
        <div className="flex gap-1">
          {CORES.map(c => (
            <button key={c}
              onClick={() => onCoreChange(c)}
              title={c}
              className="w-3 h-3 rounded-sm transition-all"
              style={{
                background: core === c ? 'var(--accent)' : 'var(--border)',
                opacity   : core === c ? 1 : 0.5
              }} />
          ))}
        </div>

        <div className="w-px h-3" style={{ background: 'var(--border)' }} />

        {/* Personality chips */}
        <div className="flex gap-1">
          {PERSONALITIES.map(p => (
            <button key={p}
              onClick={() => onPersonalityChange(p)}
              title={p}
              className="text-[8px] px-1 rounded transition-all"
              style={{
                background: personality === p ? 'var(--accent)' : 'var(--bg3)',
                color     : personality === p ? '#fff' : 'var(--text-dim)',
                opacity   : personality === p ? 1 : 0.6
              }}>
              {p[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
