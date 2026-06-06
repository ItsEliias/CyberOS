import { useEffect, useRef, useState } from 'react'

interface HelpTipProps {
  body: string
  title?: string
  size?: number
  className?: string
  align?: 'left' | 'right' | 'center'
}

/**
 * Small "?" help button. Hover or click to open a popover with a short explanation.
 * Closes on outside click / Esc. Inherits subtle text color.
 */
export default function HelpTip({
  body,
  title,
  size = 14,
  className = '',
  align = 'left',
}: HelpTipProps) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const rootRef = useRef<HTMLSpanElement | null>(null)

  const visible = open || hovered

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const popoverPos =
    align === 'right'
      ? 'right-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'left-0'

  return (
    <span
      ref={rootRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={title ? `Help: ${title}` : 'Help'}
        aria-expanded={visible}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-text-muted hover:text-[#f78166] hover:border-[#f78166]/40 hover:bg-[#f78166]/10 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-[#f78166]/50"
        style={{ width: size, height: size, fontSize: size - 4, lineHeight: 1 }}
      >
        <span className="font-semibold select-none" style={{ marginTop: -1 }}>?</span>
      </button>

      {visible && (
        <div
          role="tooltip"
          className={`absolute bottom-full mb-2 ${popoverPos} z-50 w-[240px] rounded-md border border-border-default/80 bg-surface-3 shadow-elevation-3 p-2.5 text-left animate-in fade-in duration-100`}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="text-[11px] font-semibold text-text-primary mb-1 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[#f78166]" />
              {title}
            </div>
          )}
          <p className="text-[11px] leading-relaxed text-text-secondary">{body}</p>
        </div>
      )}
    </span>
  )
}
