// NetLab — StatusBar.tsx (polish)

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
    setElapsed(Date.now() - labStartTime)
    const id = setInterval(() => setElapsed(Date.now() - labStartTime), 1000)
    return () => clearInterval(id)
  }, [labStartTime])

  function formatElapsed(ms: number): string {
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
      className="flex items-center px-4 shrink-0 border-t border-border-subtle"
      style={{ height: 26, background: 'var(--surface-0)', gap: 0 }}
    >
      {activeLab ? (
        <>
          <span className="flex items-center gap-1.5 status-metric">
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--accent)', flexShrink: 0 }} />
            <strong>{activeLab.title}</strong>
          </span>
          <span className="status-sep">·</span>
          <span className="status-metric">
            Step <strong>{activeStepIndex + 1}</strong> of {activeLab.steps.length}
          </span>
          {labStartTime && (
            <>
              <span className="status-sep">·</span>
              <span className="status-metric">
                <strong>{formatElapsed(elapsed)}</strong>
              </span>
              <HelpTip
                title="Lab Progress & Timer"
                body="Live timer for the current lab attempt. Your best time per lab is tracked in the Progress view once you finish."
              />
            </>
          )}
        </>
      ) : (
        <span className="status-metric">No active lab — select a lab from the Labs view</span>
      )}
      <div className="flex-1" />
      <span className="status-metric">NetLab</span>
    </div>
  )
}
