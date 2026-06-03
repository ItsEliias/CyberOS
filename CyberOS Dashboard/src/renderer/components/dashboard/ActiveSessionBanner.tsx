// CyberOS Dashboard — Active Session Banner
// Shows when shared_context.activeLab is set

import { motion } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { timeAgo } from '../../utils/timeAgo'

export default function ActiveSessionBanner() {
  const config = useDashboardStore((s) => s.config)
  const ctx = config.shared_context

  if (!ctx?.activeLab) return null

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="mb-5"
    >
      <div className="glass-card border-l-[3px] border-l-accent px-4 py-3 flex items-center gap-4" style={{ background: 'rgba(74, 158, 255, 0.06)' }}>
        {/* Pulse dot */}
        <span className="w-2.5 h-2.5 rounded-full bg-danger animate-[statusPulse_2s_ease-out_infinite] shrink-0" />

        {/* Lab info */}
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div>
            <span className="text-xs text-text-secondary font-medium">Lab</span>
            <p className="text-sm text-text-primary font-semibold truncate">{ctx.activeLab}</p>
          </div>

          {ctx.activeIP && (
            <div>
              <span className="text-xs text-text-secondary font-medium">Target</span>
              <p className="text-sm text-text-primary font-mono">{ctx.activeIP}</p>
            </div>
          )}

          {ctx.activeTarget && ctx.activeTarget !== ctx.activeLab && (
            <div>
              <span className="text-xs text-text-secondary font-medium">Host</span>
              <p className="text-sm text-text-primary truncate">{ctx.activeTarget}</p>
            </div>
          )}

          {ctx.activePlaybook && (
            <div>
              <span className="text-xs text-text-secondary font-medium">Playbook</span>
              <p className="text-sm text-text-primary truncate">{ctx.activePlaybook}</p>
            </div>
          )}
        </div>

        {/* Last updated */}
        {ctx.lastUpdated && (
          <span className="text-xs text-text-muted shrink-0">
            Updated {timeAgo(ctx.lastUpdated)}
          </span>
        )}
      </div>
    </motion.div>
  )
}
