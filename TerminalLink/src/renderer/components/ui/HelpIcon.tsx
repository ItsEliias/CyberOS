/**
 * HelpIcon — a small "?" affordance with a hover/focus tooltip.
 *
 * Used to add quick 1-2 sentence explanations next to features like Sessions,
 * Split-pane mode, Snippets, Command Palette, and the External Shell Hook
 * setting. Pure CSS tooltip (no external lib).
 */
import { useId, useState } from 'react';

interface Props {
  /** Tooltip text. Keep to 1-2 short sentences. */
  text: string;
  /** Optional aria label override (defaults to "Help"). */
  label?: string;
  /** Optional inline style overrides for the trigger. */
  style?: React.CSSProperties;
}

export default function HelpIcon({ text, label = 'Help', style }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(o => !o);
        }}
        style={{
          width: 14, height: 14, borderRadius: '50%',
          background: 'rgba(0,255,65,0.08)',
          border: '1px solid rgba(0,255,65,0.3)',
          color: 'rgba(0,255,65,0.85)',
          fontSize: 9, fontWeight: 700, lineHeight: '12px',
          fontFamily: 'var(--font-mono)',
          cursor: 'help', padding: 0, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ?
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 10001,
            top: '120%',
            left: 0,
            minWidth: 180,
            maxWidth: 260,
            padding: '6px 8px',
            fontSize: 10,
            lineHeight: 1.4,
            color: 'var(--text)',
            background: 'rgba(13,18,8,0.97)',
            border: '1px solid rgba(0,255,65,0.35)',
            borderRadius: 4,
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            whiteSpace: 'normal',
            textAlign: 'left',
            fontFamily: 'inherit',
            fontWeight: 400,
            letterSpacing: 'normal',
            textTransform: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
