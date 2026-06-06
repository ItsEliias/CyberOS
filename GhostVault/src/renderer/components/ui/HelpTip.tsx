import { useEffect, useRef, useState } from 'react'

interface HelpTipProps {
  title?: string
  body: string
  size?: number
  className?: string
  ariaLabel?: string
}

const ACCENT = '#7bb8ff'

/**
 * Tiny inline `?` help affordance. Hover or click to reveal a small popover
 * that explains a feature in 1–2 sentences. Closes on outside click or Esc.
 */
export default function HelpTip({
  title,
  body,
  size = 14,
  className = '',
  ariaLabel,
}: HelpTipProps) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const rootRef = useRef<HTMLSpanElement | null>(null)

  const visible = open || hovered

  useEffect(() => {
    if (!visible) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setHovered(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setHovered(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [visible])

  return (
    <span
      ref={rootRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={ariaLabel || title || 'Help'}
        aria-expanded={visible}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[10px] font-semibold leading-none text-text-muted/80 transition-colors hover:text-[color:var(--ht-accent)] hover:border-[color:var(--ht-accent)]/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ht-accent)]/60"
        style={
          {
            width: size,
            height: size,
            // expose accent via CSS var so tailwind arbitrary values can read it
            ['--ht-accent' as any]: ACCENT,
          } as React.CSSProperties
        }
      >
        ?
      </button>

      {visible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-md border border-white/10 bg-[rgba(13,14,24,0.96)] px-3 py-2 text-2xs leading-snug text-text-secondary shadow-elevation-3 backdrop-blur-md"
          style={{
            width: 260,
            boxShadow: `0 0 0 1px ${ACCENT}1a, 0 8px 24px rgba(0,0,0,0.45)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div
              className="mb-1 text-xs font-semibold"
              style={{ color: ACCENT }}
            >
              {title}
            </div>
          )}
          <div className="text-text-secondary/90">{body}</div>
        </div>
      )}
    </span>
  )
}
