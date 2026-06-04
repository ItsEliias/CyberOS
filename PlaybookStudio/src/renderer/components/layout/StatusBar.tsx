// PlaybookStudio — StatusBar Component

import { useState, useEffect } from 'react'
import { useStore } from '../../store'

function getUTC(): string {
  const now = new Date()
  return now.toUTCString().slice(17, 25) + ' UTC'
}

export default function StatusBar() {
  const [utcTime, setUtcTime] = useState(getUTC())
  const playbooks = useStore(s => s.playbooks)
  const activeRun = useStore(s => s.activeRun)
  const context   = useStore(s => s.context)

  useEffect(() => {
    const interval = setInterval(() => setUtcTime(getUTC()), 1000)
    return () => clearInterval(interval)
  }, [])

  const builtIn = playbooks.filter(p => p.isBuiltIn).length
  const custom  = playbooks.filter(p => !p.isBuiltIn).length

  return (
    <div
      className="h-6 flex items-center px-4 text-xs shrink-0"
      style={{
        background: 'rgba(10, 10, 15, 0.95)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* Pulse dot + app name */}
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full status-dot-pulse"
          style={{
            '--pulse-color': 'rgba(74,158,255,0.4)',
            '--pulse-color-fade': 'rgba(74,158,255,0)',
            backgroundColor: '#4a9eff',
          } as React.CSSProperties}
        />
        <span style={{ color: '#8b949e' }}>PlaybookStudio</span>
      </div>

      <span className="mx-3" style={{ color: '#4a5568' }}>•</span>

      <span style={{ color: '#8b949e' }}>
        {builtIn} built-in · {custom} custom
      </span>

      {activeRun && (
        <>
          <span className="mx-3" style={{ color: '#4a5568' }}>•</span>
          <span style={{ color: '#4a9eff', fontWeight: 500 }}>
            Active: {activeRun.playbookName}
          </span>
          {(() => {
            const done  = activeRun.steps.filter(s => s.status === 'done' || s.status === 'skipped').length
            const total = activeRun.steps.length
            return (
              <span className="ml-1.5" style={{ color: '#4a5568' }}>
                ({done}/{total} steps)
              </span>
            )
          })()}
        </>
      )}

      {!activeRun && (
        <>
          <span className="mx-3" style={{ color: '#4a5568' }}>•</span>
          <span style={{ color: '#4a5568' }}>No active run</span>
        </>
      )}

      {context.activeLab && (
        <>
          <span className="mx-3" style={{ color: '#4a5568' }}>•</span>
          <span style={{ color: '#8b949e' }}>
            Lab: <span style={{ color: '#c9d1d9' }}>{context.activeLab}</span>
          </span>
          {context.activeIP && (
            <span className="ml-2 font-mono" style={{ color: '#4a5568' }}>{context.activeIP}</span>
          )}
        </>
      )}

      <div className="flex-1" />

      <span className="font-mono" style={{ color: '#4a5568' }}>{utcTime}</span>
    </div>
  )
}
