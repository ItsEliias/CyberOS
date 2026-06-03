// CyberOS Dashboard — Ecosystem Health Bar
// Horizontal strip showing one colored dot per app (12 total)

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { buildAppCards } from '../../utils/configParser'
import { timeAgo } from '../../utils/timeAgo'

export default function EcosystemHealthBar() {
  const config = useDashboardStore((s) => s.config)
  const cards = buildAppCards(config)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="bg-bg-elevated/75 backdrop-blur-sm border border-border-default/60 rounded-lg px-4 py-3">
      <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest mb-3">
        Ecosystem Health
      </p>
      <div className="flex items-center gap-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className="relative flex flex-col items-center gap-1"
            onMouseEnter={() => setHoveredId(card.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <motion.span
              className={`w-3 h-3 rounded-full border ${
                card.active
                  ? 'border-transparent'
                  : 'border-border-default bg-bg-interactive'
              }`}
              style={card.active ? { backgroundColor: card.accentColor } : {}}
              animate={card.active ? {
                boxShadow: [
                  `0 0 0px ${card.accentColor}00`,
                  `0 0 6px ${card.accentColor}88`,
                  `0 0 0px ${card.accentColor}00`,
                ],
              } : {}}
              transition={card.active ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
            />
            <span className="text-[8px] text-text-muted truncate max-w-[50px]">
              {card.name.slice(0, 6)}
            </span>

            {/* Tooltip */}
            {hoveredId === card.id && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 bg-bg-elevated border border-border-default rounded-md px-2 py-1 z-50 whitespace-nowrap shadow-lg"
              >
                <p className="text-xs text-text-primary font-medium">{card.name}</p>
                <p className="text-[10px] text-text-secondary">
                  {card.active ? 'Active' : `Last: ${timeAgo(card.lastActive)}`}
                </p>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
