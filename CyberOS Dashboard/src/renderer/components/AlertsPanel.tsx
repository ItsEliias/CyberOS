import { motion, AnimatePresence } from 'framer-motion'
import { useStore, type Alert } from '../store'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)    return 'just now'
  if (diff < 3600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

function AlertIcon({ type }: { type: Alert['type'] }) {
  if (type === 'stale') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="#d29922" strokeWidth="1.5" />
        <path d="M8 4.5v4l2.5 1.5" stroke="#d29922" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L14.5 13.5H1.5L8 2Z" stroke="#f85149" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6.5V9.5" stroke="#f85149" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.75" fill="#f85149" />
    </svg>
  )
}

interface AlertItemProps { alert: Alert }

function AlertItem({ alert }: AlertItemProps) {
  const dismiss = useStore(s => s.dismissAlert)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.18 }}
      className="flex items-start gap-2.5 p-3 rounded border border-border/50 bg-bg/40"
    >
      <div className="mt-0.5 flex-shrink-0">
        <AlertIcon type={alert.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-text leading-snug">{alert.message}</p>
        <p className="text-[10px] text-muted/60 mt-0.5">{timeAgo(alert.timestamp)}</p>
      </div>
      <button
        onClick={() => dismiss(alert.id)}
        className="no-drag text-muted/40 hover:text-muted transition-colors flex-shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  )
}

interface AlertsPanelProps {
  onClose: () => void
}

export default function AlertsPanel({ onClose }: AlertsPanelProps) {
  const alerts           = useStore(s => s.alerts)
  const dismissedIds     = useStore(s => s.dismissedAlertIds)
  const visible          = alerts.filter(a => !dismissedIds.has(a.id))

  return (
    <motion.div
      key="alerts-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="absolute top-12 right-4 z-50 w-72 bg-panel border border-border rounded-lg shadow-xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Alerts</span>
        <button
          onClick={onClose}
          className="no-drag text-muted/50 hover:text-muted transition-colors"
          aria-label="Close alerts"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="p-2 flex flex-col gap-2 max-h-80 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="text-[11px] text-muted/60 text-center py-6">No active alerts</p>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map(a => <AlertItem key={a.id} alert={a} />)}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  )
}
