import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'

export default function Header() {
  const version      = useStore(s => s.version)
  const items        = useStore(s => s.items)
  const context      = useStore(s => s.context)
  const refreshing   = useStore(s => s.refreshing)

  const unread = items.filter(i => !i.read).length

  const isMac = window.electronAPI.platform === 'darwin'
  return (
    <header className="drag-region h-12 flex items-center justify-between px-5 border-b border-[var(--border-default)] flex-shrink-0">
      <div className="flex items-center gap-3">
        {isMac && <div className="w-[72px]" /> /* macOS traffic-light spacer */}
        <span className="text-sm font-semibold tracking-wide text-text-primary">SIGNALBOARD</span>
        {/* Total unread badge — uses accent token vars, no hardcoded hex */}
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[9px] font-bold tabular-nums leading-none no-drag"
              style={{
                background: 'var(--accent-tint2)',
                color: 'var(--accent)',
                border: '1px solid var(--accent-border)',
              }}
            >
              {unread > 99 ? '99+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="text-xs text-text-muted font-light">// ItsEliias</span>
        <span className="text-[10px] text-text-muted/50 ml-1">v{version}</span>
      </div>

      <div className="no-drag flex items-center gap-4">
        {/* Active context pills — token-bridged, no Tailwind default palette */}
        {context.lab && (
          <span
            className="text-[10px] px-2 py-0.5 rounded font-mono"
            style={{
              background: 'rgba(180,79,255,0.10)',
              border: '1px solid rgba(180,79,255,0.20)',
              color: '#b44fff',
            }}
          >
            lab: {context.lab}
          </span>
        )}
        {context.target && (
          <span
            className="text-[10px] px-2 py-0.5 rounded font-mono"
            style={{
              background: 'var(--sev-medium-bg)',
              border: '1px solid rgba(210,153,34,0.20)',
              color: 'var(--sev-medium)',
            }}
          >
            target: {context.target}
          </span>
        )}
        {refreshing && (
          <span className="text-[11px] animate-pulse" style={{ color: 'var(--accent)' }}>Refreshing…</span>
        )}
      </div>
    </header>
  )
}
