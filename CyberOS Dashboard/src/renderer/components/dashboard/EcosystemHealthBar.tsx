// CyberOS Dashboard — Ecosystem Health Bar
// Horizontal strip showing one colored dot per app (12 total)
// Each dot uses its app accent color, active dots pulse, inactive at 30% opacity

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

  return (
    <div className="glass-card px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          Ecosystem Health
        </p>
        <span className="text-[10px] font-mono text-text-muted">
          <span className="text-success">{activeCount}</span>/{cards.length} online
        </span>
      </div>
      <div className="flex items-start justify-between">
        {cards.map((card) => (
          <div
            key={card.id}
            className="relative flex flex-col items-center gap-1.5 cursor-default"
            onMouseEnter={() => setHoveredId(card.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Dot — colored in accent, pulse if active, dim if inactive */}
            <span
              className={`w-3 h-3 rounded-full ${card.active ? 'status-dot-pulse' : ''}`}
              style={{
                backgroundColor: card.accentColor,
                opacity: card.active ? 1 : 0.3,
                '--pulse-color': `${card.accentColor}66`,
                boxShadow: card.active ? `0 0 6px ${card.accentColor}88` : 'none',
              } as React.CSSProperties}
            />
            {/* App name label */}
            <span className={`text-[8px] font-medium truncate max-w-[52px] ${
              card.active ? 'text-text-secondary' : 'text-text-muted'
            }`}>
              {card.name.length > 7 ? card.name.slice(0, 7) : card.name}
            </span>

            {/* Tooltip */}
            {hoveredId === card.id && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute -top-14 left-1/2 -translate-x-1/2 glass-card px-2.5 py-1.5 z-50 whitespace-nowrap shadow-lg"
              >
                <p className="text-xs font-medium" style={{ color: card.accentColor }}>{card.name}</p>
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
