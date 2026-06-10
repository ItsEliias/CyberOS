import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'

/** SignalBoard app-icon — 13×13 RSS/signal glyph */
function SignalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M3 13a9.7 9.7 0 0 1 9.7-9.7" />
      <path d="M3 9a5.7 5.7 0 0 1 5.7-5.7" />
      <path d="M3 5a1.7 1.7 0 0 1 1.7-1.7" />
      <circle cx="3" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function Header() {
  const version    = useStore(s => s.version)
  const items      = useStore(s => s.items)
  const context    = useStore(s => s.context)
  const refreshing = useStore(s => s.refreshing)

  const unread = items.filter(i => !i.read).length
  const isMac  = window.electronAPI.platform === 'darwin'

  return (
    <header
      className="drag-region flex items-center justify-between px-4 flex-shrink-0"
      style={{
        height: 44,
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Left: macOS spacer + app identity lockup */}
      <div className="flex items-center gap-3">
        {isMac && <div className="w-[72px]" />}

        {/* App icon + name + subname */}
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--accent)', opacity: 0.85 }}>
            <SignalIcon />
          </span>
          <div className="flex items-baseline gap-1.5 leading-none">
            <span style={{
              fontSize: 'var(--type-body-md)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0.01em',
            }}>
              SignalBoard
            </span>
            <span style={{
              fontSize: 'var(--type-caption)',
              color: 'var(--text-muted)',
            }}>
              ╱ feeds
            </span>
            <span style={{
              fontSize: 'var(--type-caption)',
              color: 'var(--text-muted)',
              opacity: 0.5,
            }}>
              v{version}
            </span>
          </div>
        </div>

        {/* Unread badge */}
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="no-drag inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full tabular-nums leading-none"
              style={{
                fontSize: 'var(--type-caption)',
                fontWeight: 700,
                background: 'var(--accent-tint2)',
                color: 'var(--accent)',
                border: '1px solid var(--accent-border)',
              }}
            >
              {unread > 99 ? '99+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Right: context chips + refresh status — flat metric strip */}
      <div className="no-drag flex items-center" style={{ gap: 0 }}>
        {context.lab && (
          <>
            <span className="status-sep">·</span>
            <span
              className="metric-chip"
              style={{ color: '#b44fff', borderColor: 'rgba(180,79,255,0.20)', background: 'rgba(180,79,255,0.08)' }}
            >
              lab:{context.lab}
            </span>
          </>
        )}
        {context.target && (
          <>
            <span className="status-sep">·</span>
            <span
              className="metric-chip"
              style={{ color: 'var(--sev-medium)', borderColor: 'rgba(210,153,34,0.20)', background: 'rgba(210,153,34,0.07)' }}
            >
              target:{context.target}
            </span>
          </>
        )}
        {refreshing && (
          <>
            <span className="status-sep">·</span>
            <span style={{ fontSize: 'var(--type-caption)', color: 'var(--accent)', animationName: 'none' }}
              className="animate-pulse">Refreshing…</span>
          </>
        )}
      </div>
    </header>
  )
}
