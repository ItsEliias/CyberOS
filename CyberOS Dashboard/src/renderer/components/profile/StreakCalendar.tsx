// CyberOS Dashboard — Streak Calendar Component
// GitHub contribution graph style heatmap (52 weeks × 7 days)

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'

export default function StreakCalendar() {
  const config = useDashboardStore((s) => s.config)
  const activityDates = config.operator_profile?.activityDates ?? []

  // Build a map of date -> event count
  const dateCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const date of activityDates) {
      const key = date.slice(0, 10)
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [activityDates])

  // Generate 52 weeks × 7 days grid
  const cells = useMemo(() => {
    const today = new Date()
    const cells: { date: string; count: number; isToday: boolean }[] = []

    // Start from 52 weeks ago, aligned to Sunday
    const start = new Date(today)
    start.setDate(start.getDate() - 364 - start.getDay())

    for (let i = 0; i < 371; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      const isToday = key === today.toISOString().slice(0, 10)
      cells.push({ date: key, count: dateCountMap[key] ?? 0, isToday })
    }

    return cells
  }, [dateCountMap])

  // Color scale
  const getColor = (count: number): string => {
    if (count === 0) return 'rgba(42, 51, 71, 0.3)'
    if (count <= 2) return 'rgba(74, 158, 255, 0.2)'
    if (count <= 5) return 'rgba(74, 158, 255, 0.5)'
    return 'rgba(74, 158, 255, 1)'
  }

  const CELL_SIZE = 10
  const GAP = 2
  const COLS = 53
  const ROWS = 7

  return (
    <div className="glass-card p-4">
      <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest mb-3">
        Activity Calendar
      </p>

      <div className="overflow-x-auto">
        <svg
          width={COLS * (CELL_SIZE + GAP)}
          height={ROWS * (CELL_SIZE + GAP)}
          className="mx-auto"
        >
          {cells.map((cell, i) => {
            const col = Math.floor(i / 7)
            const row = i % 7
            const x = col * (CELL_SIZE + GAP)
            const y = row * (CELL_SIZE + GAP)

            return (
              <motion.rect
                key={cell.date}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                fill={getColor(cell.count)}
                stroke={cell.isToday ? '#4a9eff' : 'none'}
                strokeWidth={cell.isToday ? 1 : 0}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: row * 0.01, duration: 0.2 }}
              >
                <title>{`${cell.date}: ${cell.count} event${cell.count !== 1 ? 's' : ''}`}</title>
              </motion.rect>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-3">
        <span className="text-[10px] text-text-muted mr-1">Less</span>
        {[0, 1, 3, 6].map((count) => (
          <span
            key={count}
            className="w-[10px] h-[10px] rounded-sm"
            style={{ backgroundColor: getColor(count) }}
          />
        ))}
        <span className="text-[10px] text-text-muted ml-1">More</span>
      </div>
    </div>
  )
}
