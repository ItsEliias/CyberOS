// GhostVault — Editor toolbar primitives
// ToolBtn, ToolDivider, and shared editor helpers

// Small toolbar icon button with tooltip
export function ToolBtn({ onClick, title, active, children, disabled }: {
  onClick?: () => void; title: string; active?: boolean;
  children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className="relative group w-7 h-7 rounded flex items-center justify-center text-sm transition-colors"
      style={{
        color: active ? '#7bb8ff' : 'rgba(72,79,88,0.75)',
        background: active ? 'rgba(123,184,255,0.1)' : 'transparent',
        border: active ? '1px solid rgba(123,184,255,0.2)' : '1px solid transparent',
        opacity: disabled ? 0.3 : 1,
      }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50"
        style={{ background: 'rgba(10,11,20,0.95)', border: '1px solid rgba(42,51,71,0.7)', color: 'rgba(201,209,217,0.9)', fontFamily: 'var(--font-display)' }}>
        {title}
      </span>
    </button>
  );
}

export const ToolDivider = () => (
  <span className="w-px h-4 mx-0.5 flex-shrink-0" style={{ background: 'rgba(42,51,71,0.5)' }} />
);

export const TABLE_TEMPLATE = '\n| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n|       |       |       |\n|       |       |       |\n|       |       |       |\n';

export function formatRelTime(mtime: number): string {
  const diff = Date.now() - mtime;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7)   return `${days}d ago`;
  return new Date(mtime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function tagHue(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return hash % 8;
}
