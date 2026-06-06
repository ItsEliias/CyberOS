// NetLab — StatusBar.tsx

import { useEffect, useState } from 'react'
import { useNetLabStore } from '../store'
import HelpTip from './ui/HelpTip'

export default function StatusBar() {
  const activeLab       = useNetLabStore(s => s.activeLab)
  const activeStepIndex = useNetLabStore(s => s.activeStepIndex)
  const labStartTime    = useNetLabStore(s => s.labStartTime)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!labStartTime) { setElapsed(0); return }
    // Sync immediately so the bar doesn't display '0s' for the first
    // second after a lab starts (or after resuming with a non-zero
    // existing elapsed). Then tick every second.
    setElapsed(Date.now() - labStartTime)
    const id = setInterval(() => setElapsed(Date.now() - labStartTime), 1000)
    return () => clearInterval(id)
  }, [labStartTime])

  function formatElapsed(ms: number): string {
    // Clamp: a backward clock jump between labStartTime and Date.now()
    // would otherwise produce negative seconds and render '-3s' in the
    // status bar.
    const safe = Number.isFinite(ms) && ms > 0 ? ms : 0
    const s = Math.floor(safe / 1000)
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
              <HelpTip
                title="Lab Progress & Timer"
                body="Live timer for the current lab attempt. Your best time per lab is tracked in the Progress view once you finish."
              />
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
