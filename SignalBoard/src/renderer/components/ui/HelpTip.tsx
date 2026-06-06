// HelpTip — small "?" affordance that opens a one-line popover explanation.
// Used next to major feature blocks (Feed, Sources, Filters, Bookmarks, Custom Feeds).
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface HelpTipProps {
  text: string
  title?: string
  /** Anchor side relative to the trigger; popover positions accordingly. Default: 'bottom-right'. */
  side?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  className?: string
}

export default function HelpTip({ text, title, side = 'bottom-right', className = '' }: HelpTipProps) {
  const [open, setOpen]   = useState(false)
  const wrapperRef        = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
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

  const posClass = {
    'bottom-right': 'top-full mt-1 left-0',
    'bottom-left':  'top-full mt-1 right-0',
    'top-right':    'bottom-full mb-1 left-0',
    'top-left':     'bottom-full mb-1 right-0',
  }[side]

  return (
    <div ref={wrapperRef} className={`relative inline-flex no-drag ${className}`}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold leading-none transition-colors"
        style={{
          background: open ? 'rgba(255,107,107,0.15)' : 'rgba(42,51,71,0.4)',
          border: `1px solid ${open ? 'rgba(255,107,107,0.4)' : 'rgba(42,51,71,0.7)'}`,
          color: open ? '#ff6b6b' : '#8b949e',
        }}
        aria-label={title ? `Help: ${title}` : 'Help'}
        title={title ?? 'Help'}
      >
        ?
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-50 w-64 p-3 rounded-md shadow-glow ${posClass}`}
            style={{
              background: 'rgba(17,19,32,0.98)',
              border: '1px solid rgba(255,107,107,0.25)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,107,107,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {title && (
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#ff6b6b' }}>
                {title}
              </p>
            )}
            <p className="text-[11px] leading-relaxed" style={{ color: '#c9d1d9' }}>{text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
