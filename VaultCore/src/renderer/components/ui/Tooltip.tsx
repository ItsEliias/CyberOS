import { useState, useRef, useEffect } from 'react';

interface HelpTipProps {
  text: string;
  /** Where the bubble appears relative to the icon. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Optional pixel offset from the icon. */
  className?: string;
}

/**
 * A tiny "?" affordance with a hover/focus tooltip. Used to attach
 * 1–2 sentence inline help to dashboards, modals, and settings sections.
 */
export default function HelpTip({ text, side = 'bottom', className = '' }: HelpTipProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close on outside click (improves accessibility when toggled via keyboard)
  useEffect(() => {
    if (!show) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [show]);

  const posStyles: Record<NonNullable<HelpTipProps['side']>, React.CSSProperties> = {
    top:    { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    right:  { left: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
    bottom: { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    left:   { right: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
  };

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button
        type="button"
        aria-label="Help"
        onClick={(e) => { e.stopPropagation(); setShow(v => !v); }}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold cursor-help select-none"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-muted)',
          lineHeight: 1,
        }}
      >
        ?
      </button>
      {show && (
        <div
          role="tooltip"
          className="absolute z-50 w-56 rounded-lg p-2.5 text-[10px] leading-snug pointer-events-none"
          style={{
            ...posStyles[side],
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
