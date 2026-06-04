// ReconDesk — Engagement Calendar View (Feature 11)
import { useState } from 'react'
import { useRecondeskStore } from '../stores/useRecondeskStore'
import type { Target } from '../types/recondesk'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isNearDeadline(dateStr: string): boolean {
  const d    = new Date(dateStr)
  const now  = new Date()
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 3
}

export default function CalendarView() {
  const targets       = useRecondeskStore(s => s.targets)
  const setActiveTarget = useRecondeskStore(s => s.setActiveTarget)
  const now           = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<Date | null>(null)

  const totalDays  = daysInMonth(year, month)
  const firstDay   = firstDayOfMonth(year, month)
  const today      = new Date()

  // Map date string -> targets due on that day
  function targetsOnDay(day: number): Target[] {
    const d = new Date(year, month, day)
    return targets.filter(t => {
      const date = t.scheduledDate || t.dueDate
      if (!date) return false
      return isSameDay(new Date(date), d)
    })
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const selectedTargets = selected ? targets.filter(t => {
    const date = t.scheduledDate || t.dueDate
    if (!date) return false
    return isSameDay(new Date(date), selected)
  }) : []

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#e2e8f0]">
            {MONTHS[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center text-[#8b949e] hover:text-[#e2e8f0] hover:bg-[#2a3347] rounded transition-colors text-sm">‹</button>
            <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }} className="px-2 py-1 text-[10px] text-[#4a5568] hover:text-[#d29922] transition-colors">Today</button>
            <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center text-[#8b949e] hover:text-[#e2e8f0] hover:bg-[#2a3347] rounded transition-colors text-sm">›</button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[9px] font-semibold uppercase tracking-widest text-[#4a5568] py-1.5">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-[#2a3347] rounded-lg overflow-hidden border border-[#2a3347]">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="bg-[#0a0a0f] h-16" />
            const dayTargets  = targetsOnDay(day)
            const isToday     = isSameDay(new Date(year, month, day), today)
            const isSelected  = selected && isSameDay(new Date(year, month, day), selected)
            const hasDue      = dayTargets.some(t => (t.scheduledDate || t.dueDate) && isNearDeadline((t.scheduledDate || t.dueDate)!))

            return (
              <button
                key={day}
                onClick={() => setSelected(new Date(year, month, day))}
                className={`relative h-16 flex flex-col items-start p-1.5 transition-colors text-left ${
                  isSelected ? 'bg-[#d29922]/10 border border-[#d29922]/30' :
                  isToday    ? 'bg-[#2a3347]/60' : 'bg-[#0a0a0f] hover:bg-[#2a3347]/20'
                }`}
              >
                <span className={`text-[10px] font-mono mb-1 rounded w-5 h-5 flex items-center justify-center ${
                  isToday ? 'bg-[#d29922] text-black font-bold' : isSelected ? 'text-[#d29922]' : 'text-[#8b949e]'
                }`}>
                  {day}
                </span>
                <div className="flex flex-wrap gap-0.5">
                  {dayTargets.slice(0, 3).map(t => (
                    <span
                      key={t.id}
                      className={`text-[8px] px-1 py-0.5 rounded truncate max-w-[52px] ${
                        (t.scheduledDate || t.dueDate) && isNearDeadline((t.scheduledDate || t.dueDate)!)
                          ? 'bg-[#f85149]/15 text-[#f85149] border border-[#f85149]/25'
                          : 'bg-[#d29922]/10 text-[#d29922]/70 border border-[#d29922]/20'
                      }`}
                    >
                      {t.name}
                    </span>
                  ))}
                  {dayTargets.length > 3 && (
                    <span className="text-[8px] text-[#4a5568]">+{dayTargets.length - 3}</span>
                  )}
                </div>
                {hasDue && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#f85149]" />}
              </button>
            )
          })}
        </div>

        {/* Selected day detail */}
        {selected && selectedTargets.length > 0 && (
          <div className="mt-4 bg-[#12131a] border border-[#2a3347] rounded-lg p-3.5">
            <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-2.5">
              {selected.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div className="flex flex-col gap-2">
              {selectedTargets.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTarget(t.id)}
                  className="flex items-center gap-3 text-left px-3 py-2 rounded bg-[#0d0d14] border border-[#2a3347] hover:border-[#d29922]/30 transition-colors group"
                >
                  <span className="font-mono text-xs text-[#d29922]/70">{t.ip}</span>
                  <span className="text-xs text-[#e2e8f0] flex-1 group-hover:text-white">{t.name}</span>
                  {(t.scheduledDate || t.dueDate) && isNearDeadline((t.scheduledDate || t.dueDate)!) && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#f85149]/15 text-[#f85149] border border-[#f85149]/25">Due soon</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
