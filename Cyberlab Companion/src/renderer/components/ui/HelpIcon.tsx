import { useState, useRef, useEffect, useCallback } from 'react';

interface HelpIconProps {
  text: string;
  /** Optional aria label, defaults to "Help". */
  label?: string;
}

/**
 * Small "?" affordance with click-to-toggle tooltip bubble.
 * Positioned via fixed coords so it escapes parent overflow.
 */
export default function HelpIcon({ text, label = 'Help' }: HelpIconProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.top + r.height / 2, left: r.right + 10 });
    setOpen(v => !v);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        onClick={toggle}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16,
          fontSize: 10, fontWeight: 700,
          background: open ? 'var(--accent)' : 'var(--bg4, rgba(42,51,71,0.4))',
          color: open ? '#fff' : 'var(--text-muted)',
          border: '1px solid var(--border, rgba(42,51,71,0.6))',
          borderRadius: '50%',
          cursor: 'help',
          padding: 0, lineHeight: 1,
          transition: 'background 0.12s, color 0.12s',
          flexShrink: 0,
        }}
      >
        ?
      </button>
      {open && (
        <div
          ref={bubbleRef}
          style={{
            position: 'fixed',
            top: pos.top, left: pos.left,
            transform: 'translateY(-50%)',
            zIndex: 9999,
            width: 240,
            background: 'var(--panel, #0d0e18)',
            border: '1px solid var(--accent)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12,
            lineHeight: 1.55,
            color: 'var(--text-dim)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            pointerEvents: 'auto',
          }}
        >
          <div style={{
            position: 'absolute',
            right: '100%', top: '50%',
            transform: 'translateY(-50%)',
            width: 0, height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderRight: '6px solid var(--accent)',
          }} />
          {text}
        </div>
      )}
    </>
  );
}
