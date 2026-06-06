// PlaybookStudio — HelpTip.tsx — Small `?` icon button with hover/click popover
// Self-contained per app. Accent: blue #4a9eff.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

export interface HelpTipProps {
  /** Short heading shown bold above the body */
  title?: string
  /** 1–2 sentence explanation */
  body: string
  /** Optional override for popover width (default 240) */
  width?: number
  /** Accent color for the trigger / heading (defaults to PlaybookStudio blue) */
  accent?: string
  /** Extra inline style passed to the trigger button */
  style?: CSSProperties
  /** Visible label inside the button (defaults to ?) */
  label?: string
}

/**
 * Tiny `?` affordance. Renders a 14×14 circular button. Hovering OR clicking
 * opens a small popover above the trigger. Closes on outside click or Esc.
 * Purely additive UI — no behavior side-effects.
 */
export default function HelpTip({
  title,
  body,
  width = 240,
  accent = '#4a9eff',
  style,
  label = '?',
}: HelpTipProps) {
  const [open, setOpen]   = useState(false)
  const [hover, setHover] = useState(false)
  const wrapRef           = useRef<HTMLSpanElement | null>(null)

  // Close on outside click / Esc when sticky-open via click
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const visible = open || hover

  return (
    <span
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-label={title ? `Help: ${title}` : 'Help'}
        aria-expanded={visible}
        onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(o => !o) }}
        style={{
          width: 15, height: 15, borderRadius: 999,
          padding: 0, lineHeight: '13px',
          fontSize: 10, fontWeight: 700,
          fontFamily: 'var(--font-display, system-ui)',
          background: visible ? `${accent}26` : 'transparent',
          border: `1px solid ${visible ? `${accent}80` : 'rgba(139,148,158,0.45)'}`,
          color: visible ? accent : 'rgba(139,148,158,0.85)',
          cursor: 'help',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 120ms ease',
          ...style,
        }}
      >
        {label}
      </button>

      {visible && (
        <div
          role="tooltip"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width,
            maxWidth: '90vw',
            background: '#0d0e18',
            border: `1px solid ${accent}55`,
            borderRadius: 8,
            padding: '8px 10px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)',
            color: 'var(--text-secondary, #c9d1d9)',
            fontSize: 11,
            lineHeight: 1.5,
            zIndex: 9999,
            pointerEvents: 'auto',
            textAlign: 'left',
            fontFamily: 'var(--font-display, system-ui)',
            whiteSpace: 'normal',
          }}
        >
          {title && (
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: accent, marginBottom: 4,
              letterSpacing: '0.01em',
            }}>{title}</div>
          )}
          <div>{body}</div>
          {/* Caret */}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `5px solid ${accent}55`,
          }} />
        </div>
      )}
    </span>
  )
}
