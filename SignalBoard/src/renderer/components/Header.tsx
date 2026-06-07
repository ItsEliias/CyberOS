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
    <header className="drag-region h-12 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
      <div className="flex items-center gap-3">
        {isMac && <div className="w-[72px]" /> /* macOS traffic-light spacer */}
        <span className="text-sm font-semibold tracking-wide text-text">SIGNALBOARD</span>
        {/* Total unread badge */}
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
                background: 'rgba(255,107,107,0.18)',
                color: '#ff6b6b',
                border: '1px solid rgba(255,107,107,0.3)',
              }}
            >
              {unread > 99 ? '99+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="text-xs text-muted font-light">// ItsEliias</span>
        <span className="text-[10px] text-muted/50 ml-1">v{version}</span>
      </div>

      <div className="no-drag flex items-center gap-4">
        {/* Active context pills */}
        {context.lab && (
          <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded font-mono">
            lab: {context.lab}
          </span>
        )}
        {context.target && (
          <span className="text-[10px] px-2 py-0.5 bg-warning/10 border border-warning/20 text-warning rounded font-mono">
            target: {context.target}
          </span>
        )}
        {refreshing && (
          <span className="text-[11px] text-accent animate-pulse">Refreshing…</span>
        )}
      </div>
    </header>
  )
}
