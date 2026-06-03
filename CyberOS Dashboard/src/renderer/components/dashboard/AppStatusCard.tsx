// CyberOS Dashboard — App Status Card
// Individual card in the 3×4 app grid

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { AppCardData } from '../../types/ecosystem'
import { timeAgo } from '../../utils/timeAgo'
import StatusBadge from '../shared/StatusBadge'

interface AppStatusCardProps {
  card: AppCardData
  index: number
}

export default function AppStatusCard({ card, index }: AppStatusCardProps) {
  const [hovered, setHovered] = useState(false)

  const handleLaunch = () => {
    if (card.execPath) {
      window.electronAPI.launchApp(card.execPath)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-bg-elevated/75 backdrop-blur-sm border border-border-default/60 rounded-lg p-3.5 relative overflow-hidden transition-colors hover:bg-bg-interactive/50 cursor-default"
    >
      {/* Accent top line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: card.active ? card.accentColor : 'transparent' }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* App accent dot */}
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: card.accentColor }}
          />
          <span className="text-sm font-semibold text-text-primary">{card.name}</span>
        </div>
        <StatusBadge status={card.active ? 'active' : 'inactive'} />
      </div>

      {/* Metrics */}
      <div className="space-y-1.5 mb-2">
        {card.metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">{metric.label}</span>
            <span
              className={`text-xs font-mono tabular-nums ${
                metric.highlight ? 'text-accent font-medium' : 'text-text-primary'
              }`}
            >
              {metric.value}
            </span>
          </div>
        ))}
      </div>

      {/* Footer: last active */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-muted">
          {card.lastActive ? timeAgo(card.lastActive) : '—'}
        </span>

        {/* Open button on hover */}
        {hovered && card.execPath && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.1 }}
            onClick={handleLaunch}
            className="text-[10px] font-medium text-accent hover:text-accent-emphasis px-2 py-0.5 rounded bg-accent/10 transition-colors"
          >
            Open
          </motion.button>
        )}

        {hovered && !card.execPath && card.id !== 'dashboard' && (
          <span className="text-[10px] text-text-muted italic">Not configured</span>
        )}
      </div>
    </motion.div>
  )
}
