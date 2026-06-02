// StreakCalendar — GitHub-style 12-week activity heatmap
// ItsEliias // CyberOS

const WEEKS   = 12
const DAYS    = 7        // Mon–Sun
const CELL    = 9        // px per cell
const GAP     = 2        // px gap
const STEP    = CELL + GAP

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface StreakCalendarProps {
  activityDates: string[]
  currentStreak: number
}

/** Return YYYY-MM-DD for a Date in local time */
function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Build an ordered array of 84 date strings ending today (Mon-aligned grid) */
function buildDateGrid(): string[] {
  const today = new Date()
  const dates: string[] = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    dates.push(toISODate(d))
  }
  return dates
}

/** Map a count of events to an SVG fill and opacity */
function intensityStyle(count: number): { fill: string; opacity: number; stroke: string; strokeWidth: number } {
  if (count === 0) return { fill: 'var(--panel)', opacity: 0.8, stroke: 'var(--border)', strokeWidth: 0.6 }
  if (count === 1) return { fill: 'var(--accent)', opacity: 0.25, stroke: 'none', strokeWidth: 0 }
  if (count === 2) return { fill: 'var(--accent)', opacity: 0.50, stroke: 'none', strokeWidth: 0 }
  if (count === 3) return { fill: 'var(--accent)', opacity: 0.75, stroke: 'none', strokeWidth: 0 }
  return             { fill: 'var(--accent)', opacity: 1.00, stroke: 'none', strokeWidth: 0 }
}

const LEGEND_LEVELS = [0, 1, 2, 3, 4] as const

export default function StreakCalendar({ activityDates, currentStreak }: StreakCalendarProps) {
  // Count occurrences per date — multiple entries on the same date = higher intensity
  const countMap = new Map<string, number>()
  for (const d of activityDates) {
    // Normalise to YYYY-MM-DD in case full ISO timestamps are passed
    const key = d.slice(0, 10)
    countMap.set(key, (countMap.get(key) ?? 0) + 1)
  }

  const grid = buildDateGrid()   // 84 items, oldest first

  // Pad front so first column starts on Monday
  const firstDate  = new Date(grid[0] + 'T00:00:00')
  const dowSun     = firstDate.getDay()           // 0 Sun – 6 Sat
  const dowMon     = (dowSun + 6) % 7             // 0 Mon – 6 Sun
  const padCount   = dowMon
  const totalCells = padCount + grid.length
  const totalCols  = Math.ceil(totalCells / DAYS)

  // Build column-major cells array: index = col*DAYS + row
  const cells: Array<{ date: string | null; count: number }> = []
  for (let i = 0; i < padCount; i++) {
    cells.push({ date: null, count: 0 })
  }
  for (const d of grid) {
    cells.push({ date: d, count: countMap.get(d) ?? 0 })
  }
  while (cells.length < totalCols * DAYS) {
    cells.push({ date: null, count: 0 })
  }

  const svgW = totalCols * STEP - GAP + 14  // +14 for day labels
  const svgH = DAYS * STEP - GAP + 16       // +16 for bottom label

  return (
    <div className="flex flex-col gap-2">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        aria-label="Activity streak heatmap"
      >
        {/* Day-of-week labels (left) */}
        {DAY_LABELS.map((lbl, row) => (
          <text
            key={row}
            x="6"
            y={row * STEP + CELL / 2 + 1}
            fontSize="6"
            fill="var(--text-muted)"
            dominantBaseline="middle"
            textAnchor="middle"
          >
            {lbl}
          </text>
        ))}

        {/* Day squares */}
        {Array.from({ length: totalCols }, (_, col) =>
          Array.from({ length: DAYS }, (_, row) => {
            const idx  = col * DAYS + row
            const cell = cells[idx]
            if (!cell || cell.date === null) return null

            const x = 14 + col * STEP
            const y = row * STEP
            const { fill, opacity, stroke, strokeWidth } = intensityStyle(cell.count)

            return (
              <rect
                key={`${col}-${row}`}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx="1.5"
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={opacity}
              >
                <title>{cell.date}: {cell.count} event{cell.count !== 1 ? 's' : ''}</title>
              </rect>
            )
          })
        )}
      </svg>

      {/* Streak label */}
      <p className="text-[10px] text-text-dim text-center">
        <span className="text-accent font-semibold">{currentStreak}</span>
        <span className="text-muted/70 ml-1">day streak</span>
      </p>

      {/* Intensity legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Less</span>
        {LEGEND_LEVELS.map(level => {
          const { fill, opacity, stroke, strokeWidth } = intensityStyle(level)
          return (
            <svg key={level} width={CELL} height={CELL} style={{ flexShrink: 0 }}>
              <rect
                x={0}
                y={0}
                width={CELL}
                height={CELL}
                rx="1.5"
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
            </svg>
          )
        })}
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>More</span>
      </div>
    </div>
  )
}
