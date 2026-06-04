// NetLab — StatusBar.tsx

import { useEffect, useState } from 'react'
import { useNetLabStore } from '../store'

export default function StatusBar() {
  const activeLab       = useNetLabStore(s => s.activeLab)
  const activeStepIndex = useNetLabStore(s => s.activeStepIndex)
  const labStartTime    = useNetLabStore(s => s.labStartTime)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!labStartTime) { setElapsed(0); return }
    const id = setInterval(() => setElapsed(Date.now() - labStartTime), 1000)
    return () => clearInterval(id)
  }, [labStartTime])

  function formatElapsed(ms: number): string {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    if (h > 0) return `${h}h ${m % 60}m`
    if (m > 0) return `${m}m ${s % 60}s`
    return `${s}s`
  }

  return (
    <div
      className="flex items-center gap-4 px-4 h-7 text-2xs shrink-0 border-t border-border-subtle"
      style={{ background: '#0a0a0f', color: '#8b949e' }}
    >
      {activeLab ? (
        <>
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#5ec4ff' }}
            />
            <span style={{ color: '#5ec4ff' }}>{activeLab.title}</span>
          </span>
          <span className="text-border-default">|</span>
          <span>
            Step {activeStepIndex + 1} of {activeLab.steps.length}
          </span>
          {labStartTime && (
            <>
              <span className="text-border-default">|</span>
              <span>Elapsed: {formatElapsed(elapsed)}</span>
            </>
          )}
        </>
      ) : (
        <span>No active lab — select a lab from the Labs view</span>
      )}
      <div className="flex-1" />
      <span>NetLab</span>
    </div>
  )
}
