interface Command {
  id: string;
  label: string;
  desc: string;
}

const COMMANDS: Command[] = [
  { id: 'summarise', label: '/summarise', desc: 'Summarise this note' },
  { id: 'expand', label: '/expand', desc: 'Expand current paragraph' },
  { id: 'rewrite', label: '/rewrite', desc: 'Rewrite more clearly' },
];

interface Props {
  position: { top: number; left: number };
  hasApiKey: boolean;
  onSelect: (cmd: string) => void;
  onClose: () => void;
}

export default function InlineAICommands({ position, hasApiKey, onSelect, onClose }: Props) {
  return (
    <div
      className="fixed z-50 rounded-lg border shadow-xl py-1"
      style={{
        top: position.top,
        left: position.left,
        minWidth: 220,
        background: 'var(--bg3)',
        borderColor: 'var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div className="px-3 py-1 text-[9px] uppercase tracking-wider font-semibold"
        style={{ color: 'var(--text-dim)' }}>
        AI Commands
      </div>
      {!hasApiKey ? (
        <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-dim)' }}>
          Set API Key in{' '}
          <button onClick={onClose} className="underline" style={{ color: '#7bb8ff' }}>Settings</button>
        </div>
      ) : (
        COMMANDS.map(cmd => (
          <button
            key={cmd.id}
            onMouseDown={e => { e.preventDefault(); onSelect(cmd.id); }}
            className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/10 flex items-center justify-between"
          >
            <span className="font-mono" style={{ color: '#7bb8ff' }}>{cmd.label}</span>
            <span style={{ color: 'var(--text-dim)' }}>{cmd.desc}</span>
          </button>
        ))
      )}
      <button onClick={onClose}
        className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center rounded text-[10px] hover:bg-white/10"
        style={{ color: 'var(--text-dim)' }}>✕</button>
    </div>
  );
}
