// PlaybookStudio — StatusBar Component (teal accent redesign)

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
        background: 'rgba(7,8,15,0.98)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Live dot + app name */}
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full status-dot-pulse"
          style={{
            '--pulse-rgb': '45,212,191',
            backgroundColor: '#2dd4bf',
          } as React.CSSProperties}
        />
        <span style={{ color: '#8b949e' }}>PlaybookStudio</span>
      </div>

      <span className="mx-2.5" style={{ color: '#2d3548' }}>·</span>

      <span style={{ color: '#484f58' }}>
        {builtIn} built-in
      </span>
      <span className="mx-1.5" style={{ color: '#2d3548' }}>·</span>
      <span style={{ color: '#484f58' }}>
        {custom} custom
      </span>

      {activeRun && (
        <>
          <span className="mx-2.5" style={{ color: '#2d3548' }}>·</span>
          <span
            className="flex items-center gap-1.5"
            style={{ color: '#2dd4bf', fontWeight: 500 }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#3fb950' }}
            />
            {activeRun.playbookName}
          </span>
          {(() => {
            const done      = activeRun.steps.filter(s => s.status === 'done' || s.status === 'skipped').length
            const total     = activeRun.steps.length
            const remaining = total - done
            return (
              <>
                <span className="ml-1.5" style={{ color: '#484f58' }}>
                  ({done}/{total})
                </span>
                {remaining > 0 && (
                  <>
                    <span className="mx-1.5" style={{ color: '#2d3548' }}>·</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(210,153,34,0.10)', color: '#d29922', border: '1px solid rgba(210,153,34,0.20)' }}
                    >
                      {remaining} step{remaining !== 1 ? 's' : ''} remaining
                    </span>
                  </>
                )}
              </>
            )
          })()}
        </>
      )}

      {!activeRun && (
        <>
          <span className="mx-2.5" style={{ color: '#2d3548' }}>·</span>
          <span style={{ color: '#2d3548' }}>No active run</span>
        </>
      )}

      {context.activeLab && (
        <>
          <span className="mx-2.5" style={{ color: '#2d3548' }}>·</span>
          <span style={{ color: '#8b949e' }}>
            Lab: <span style={{ color: '#c9d1d9' }}>{context.activeLab}</span>
          </span>
          {context.activeIP && (
            <span className="ml-2 font-mono" style={{ color: '#484f58' }}>{context.activeIP}</span>
          )}
        </>
      )}

      <div className="flex-1" />

      <span className="font-mono tabular-nums" style={{ color: '#484f58' }}>{utcTime}</span>
    </div>
  )
}
