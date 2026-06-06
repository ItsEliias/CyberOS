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
        className="inline-flex items-center justify-center rounded-full focus:outline-none transition-colors duration-150"
        style={{
          width: size,
          height: size,
          fontSize: size - 4,
          lineHeight: 1,
          color: visible ? '#d29922' : '#8b949e',
          border: `1px solid ${visible ? 'rgba(210,153,34,0.5)' : 'rgba(255,255,255,0.15)'}`,
          background: visible ? 'rgba(210,153,34,0.12)' : 'rgba(255,255,255,0.04)',
        }}
      >
        <span className="font-semibold select-none" style={{ marginTop: -1 }}>?</span>
      </button>

      {visible && (
        <div
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-full mb-2 ${popoverPos} z-50`}
          style={{
            width: 240,
            borderRadius: 8,
            border: '1px solid rgba(42,51,71,0.7)',
            background: 'rgba(13,14,24,0.98)',
            padding: '10px 12px',
            textAlign: 'left',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
          }}
        >
          {title && (
            <div
              className="flex items-center gap-1.5"
              style={{ fontSize: 11, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}
            >
              <span style={{ width: 4, height: 4, borderRadius: 99, background: '#d29922' }} />
              {title}
            </div>
          )}
          <p style={{ fontSize: 11, lineHeight: 1.55, color: '#8b949e', margin: 0 }}>{body}</p>
        </div>
      )}
    </span>
  )
}
