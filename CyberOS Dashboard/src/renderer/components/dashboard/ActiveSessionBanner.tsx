// CyberOS Dashboard — Active Session Banner

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
      className="mb-4 overflow-hidden"
    >
      <div
        className="rounded-lg px-4 py-2.5 flex items-center gap-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, rgba(248,81,73,0.07) 0%, rgba(13,14,24,0.6) 100%)',
          border: '1px solid rgba(248,81,73,0.2)',
          borderLeft: '3px solid var(--sev-critical)',
        }}
      >
        {/* Scan-line overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(248,81,73,1) 2px, rgba(248,81,73,1) 3px)',
          }}
        />

        {/* LIVE badge */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          <span
            className="w-2 h-2 rounded-full bg-danger status-dot-pulse"
            style={{ '--pulse-rgb': '248,81,73' } as React.CSSProperties}
          />
          <span className="text-[9px] font-bold text-danger tracking-[0.15em] uppercase">Live</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border-subtle/60 shrink-0" />

        {/* Info groups */}
        <div className="flex items-center gap-6 flex-1 min-w-0 relative">
          <InfoField label="Lab" value={ctx.activeLab} mono />
          {ctx.activeIP && <InfoField label="IP" value={ctx.activeIP} mono accent />}
          {ctx.activeTarget && ctx.activeTarget !== ctx.activeLab && (
            <InfoField label="Host" value={ctx.activeTarget} />
          )}
          {ctx.activePlaybook && <InfoField label="Playbook" value={ctx.activePlaybook} />}
        </div>

        {/* Timestamp */}
        {ctx.lastUpdated && (
          <span className="text-[10px] text-text-muted font-mono shrink-0 relative">
            {timeAgo(ctx.lastUpdated)}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function InfoField({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string
  value: string
  mono?: boolean
  accent?: boolean
}) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div
        className={`text-xs font-semibold truncate ${mono ? 'font-mono' : ''}`}
        style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)' }}
      >
        {value}
      </div>
    </div>
  )
}
