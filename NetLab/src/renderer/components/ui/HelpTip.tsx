// NetLab — HelpTip.tsx
// Small "?" affordance that reveals a brief explanation on hover or click.

import { useEffect, useRef, useState } from 'react'

const ACCENT = '#a78bfa'

interface HelpTipProps {
  /** Optional title shown above the body. */
  title?: string
  /** 1–2 sentence explanation of the feature. */
  body: string
  /** Override popover width (default ~260px). */
  width?: number
  /** Extra inline style for the trigger button. */
  style?: React.CSSProperties
  /** Accessible label for the trigger. */
  ariaLabel?: string
}

/**
 * Renders a tiny "?" button. Opens a small popover above the trigger on
 * hover OR click. Closes on outside click, Esc, or pointer leave (when
 * opened via hover only).
 */
export default function HelpTip({
  title,
  body,
  width = 260,
  style,
  ariaLabel,
}: HelpTipProps) {
  const [open, setOpen]       = useState(false)
  const [hoverOpen, setHover] = useState(false)
  const ref                   = useRef<HTMLSpanElement | null>(null)

  const visible = open || hoverOpen

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-label={ariaLabel ?? title ?? 'Help'}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        style={{
          width: 16, height: 16,
          padding: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%',
          background: visible ? 'rgba(167,139,250,0.18)' : 'rgba(167,139,250,0.08)',
          color: visible ? ACCENT : '#8b949e',
          border: `1px solid ${visible ? 'rgba(167,139,250,0.45)' : 'rgba(167,139,250,0.22)'}`,
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'help',
          transition: 'color 0.15s, background 0.15s, border-color 0.15s',
          ...style,
        }}
      >
        ?
      </button>

      {visible && (
        <span
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width,
            maxWidth: '80vw',
            padding: '10px 12px',
            borderRadius: 6,
            background: 'rgba(15,17,23,0.98)',
            border: `1px solid ${ACCENT}55`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.55), 0 0 0 1px rgba(167,139,250,0.08)',
            color: '#e6edf3',
            fontSize: 11.5,
            lineHeight: 1.5,
            fontWeight: 400,
            textAlign: 'left',
            zIndex: 9999,
            pointerEvents: 'auto',
            whiteSpace: 'normal',
          }}
        >
          {title && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: ACCENT,
                marginBottom: 4,
              }}
            >
              {title}
            </div>
          )}
          <div>{body}</div>
        </span>
      )}
    </span>
  )
}
