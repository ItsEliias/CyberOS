// StreakCalendar — GitHub-style 12-week activity grid
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
  // Start 83 days ago
  const dates: string[] = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    dates.push(toISODate(d))
  }
  return dates
}

export default function StreakCalendar({ activityDates, currentStreak }: StreakCalendarProps) {
  const activeSet = new Set(activityDates)
  const grid      = buildDateGrid()   // 84 items, oldest first

  // Pad front so first column starts on Monday
  // grid[0] is 83 days ago; figure out its weekday (0=Sun … 6=Sat → rebase to Mon=0)
  const firstDate  = new Date(grid[0] + 'T00:00:00')
  const dowSun     = firstDate.getDay()           // 0 Sun – 6 Sat
  const dowMon     = (dowSun + 6) % 7             // 0 Mon – 6 Sun
  const padCount   = dowMon                       // empty cells at top of first column
  const totalCells = padCount + grid.length       // may exceed 84 slightly
  const totalCols  = Math.ceil(totalCells / DAYS)

  // Build column-major cells array: index = col*DAYS + row
  const cells: Array<{ date: string | null; active: boolean }> = []
  for (let i = 0; i < padCount; i++) {
    cells.push({ date: null, active: false })
  }
  for (const d of grid) {
    cells.push({ date: d, active: activeSet.has(d) })
  }
  // Pad end to fill last column
  while (cells.length < totalCols * DAYS) {
    cells.push({ date: null, active: false })
  }

  const svgW = totalCols * STEP - GAP + 14  // +14 for day labels
  const svgH = DAYS * STEP - GAP + 16       // +16 for bottom label

  return (
    <div className="flex flex-col gap-2">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        aria-label="Activity streak calendar"
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
            if (!cell) return null
            const x = 14 + col * STEP
            const y = row * STEP

            if (cell.date === null) {
              // padding cell — invisible
              return null
            }

            return (
              <rect
                key={`${col}-${row}`}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx="1.5"
                fill={cell.active ? 'var(--accent)' : 'var(--panel)'}
                stroke={cell.active ? 'none' : 'var(--border)'}
                strokeWidth="0.6"
                opacity={cell.active ? 1 : 0.8}
              />
            )
          })
        )}
      </svg>

      {/* Streak label */}
      <p className="text-[10px] text-text-dim text-center">
        <span className="text-accent font-semibold">{currentStreak}</span>
        <span className="text-muted/70 ml-1">day streak</span>
      </p>
    </div>
  )
}
