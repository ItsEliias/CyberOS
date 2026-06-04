// CyberOS Dashboard — Streak Calendar (GitHub-style heatmap)

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'

export default function StreakCalendar() {
  const config = useDashboardStore((s) => s.config)
  const activityDates = config.operator_profile?.activityDates ?? []

  const dateCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const date of activityDates) {
      const key = date.slice(0, 10)
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [activityDates])

  const cells = useMemo(() => {
    const today = new Date()
    const result: { date: string; count: number; isToday: boolean }[] = []
    const start = new Date(today)
    start.setDate(start.getDate() - 364 - start.getDay())
    for (let i = 0; i < 371; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      result.push({ date: key, count: dateCountMap[key] ?? 0, isToday: key === today.toISOString().slice(0, 10) })
    }
    return result
  }, [dateCountMap])

  const totalActive = Object.values(dateCountMap).filter((v) => v > 0).length

  const getColor = (count: number): string => {
    if (count === 0) return 'rgba(42, 51, 71, 0.28)'
    if (count <= 2) return 'rgba(74, 158, 255, 0.22)'
    if (count <= 5) return 'rgba(74, 158, 255, 0.55)'
    return '#4a9eff'
  }

  const CELL_SIZE = 10
  const GAP = 2
  const COLS = 53
  const ROWS = 7

  return (
    <div
      className="rounded-xl p-4"
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
          Activity Calendar
        </span>
        <span className="text-[10px] font-mono text-text-secondary">
          <span className="text-accent">{totalActive}</span> active days
        </span>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <svg
          width={COLS * (CELL_SIZE + GAP)}
          height={ROWS * (CELL_SIZE + GAP)}
          className="mx-auto"
        >
          {cells.map((cell, i) => {
            const col = Math.floor(i / 7)
            const row = i % 7
            return (
              <motion.rect
                key={cell.date}
                x={col * (CELL_SIZE + GAP)}
                y={row * (CELL_SIZE + GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                fill={getColor(cell.count)}
                stroke={cell.isToday ? '#4a9eff' : 'none'}
                strokeWidth={cell.isToday ? 1.5 : 0}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: row * 0.008, duration: 0.18 }}
                style={{ filter: cell.count > 5 ? 'drop-shadow(0 0 3px rgba(74,158,255,0.5))' : 'none' }}
              >
                <title>{`${cell.date}: ${cell.count} event${cell.count !== 1 ? 's' : ''}`}</title>
              </motion.rect>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[9px] text-text-muted mr-0.5">Less</span>
        {[0, 1, 3, 6].map((count) => (
          <span
            key={count}
            className="w-[9px] h-[9px] rounded-sm"
            style={{ backgroundColor: getColor(count) }}
          />
        ))}
        <span className="text-[9px] text-text-muted ml-0.5">More</span>
      </div>
    </div>
  )
}
