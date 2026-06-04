// CyberOS Dashboard — Ecosystem Health Bar

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { buildAppCards } from '../../utils/configParser'
import { timeAgo } from '../../utils/timeAgo'

export default function EcosystemHealthBar() {
  const config = useDashboardStore((s) => s.config)
  const cards = buildAppCards(config)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const activeCount = cards.filter((c) => c.active).length
  const healthPct = cards.length > 0 ? Math.round((activeCount / cards.length) * 100) : 0
  const healthColor = healthPct >= 75 ? '#3fb950' : healthPct >= 40 ? '#d29922' : '#f85149'

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--elevation-1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          Ecosystem Health
        </span>
        <div className="flex items-center gap-2.5">
          {/* Health percentage label */}
          <span
            className="text-[11px] font-bold font-mono tabular-nums"
            style={{
              color: healthColor,
              textShadow: `0 0 8px ${healthColor}66`,
            }}
          >
            {healthPct}%
          </span>
          {/* Health bar — wider, taller, spring-animated */}
          <div
            className="w-32 h-2 rounded-full overflow-hidden"
            style={{ background: 'rgba(42,51,71,0.55)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${healthColor}cc, ${healthColor})`, boxShadow: `0 0 8px ${healthColor}88` }}
              initial={{ width: 0 }}
              animate={{ width: `${healthPct}%` }}
              transition={{ duration: 0.9, type: 'spring', stiffness: 60, damping: 14 }}
            />
          </div>
          <span className="text-[10px] font-mono tabular-nums text-text-muted">
            {activeCount}/{cards.length}
          </span>
        </div>
      </div>

      {/* App dots */}
      <div className="flex items-end justify-between">
        {cards.map((card) => (
          <div
            key={card.id}
            className="relative flex flex-col items-center gap-1 cursor-default"
            onMouseEnter={() => setHoveredId(card.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${card.active ? 'status-dot-pulse' : ''}`}
              style={{
                backgroundColor: card.accentColor,
                opacity: card.active ? 1 : 0.22,
                '--pulse-rgb': '74,158,255',
                boxShadow: card.active ? `0 0 6px ${card.accentColor}99` : 'none',
              } as React.CSSProperties}
            />
            <span
              className="text-[8px] font-medium max-w-[44px] truncate text-center"
              style={{ color: card.active ? 'var(--text-secondary)' : 'var(--text-muted)' }}
            >
              {card.name.length > 6 ? card.name.slice(0, 6) : card.name}
            </span>

            {/* Tooltip */}
            {hoveredId === card.id && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute z-50 whitespace-nowrap"
                style={{
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '6px',
                  background: 'rgba(13,14,24,0.96)',
                  border: '1px solid rgba(42,51,71,0.75)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  boxShadow: 'var(--elevation-3)',
                }}
              >
                <p className="text-[11px] font-semibold" style={{ color: card.accentColor }}>
                  {card.name}
                </p>
                <p className="text-[10px] text-text-secondary">
                  {card.active ? 'Online' : `Last: ${timeAgo(card.lastActive)}`}
                </p>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
