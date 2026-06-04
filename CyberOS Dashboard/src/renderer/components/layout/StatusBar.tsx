// CyberOS Dashboard — Status Bar

import { useState, useEffect } from 'react'
import { useDashboardStore } from '../../stores/useDashboardStore'

export default function StatusBar() {
  const alerts = useDashboardStore((s) => s.alerts)
  const dismissedIds = useDashboardStore((s) => s.dismissedAlertIds)
  const [utcTime, setUtcTime] = useState(getUTC())

  useEffect(() => {
    const interval = setInterval(() => setUtcTime(getUTC()), 1000)
    return () => clearInterval(interval)
  }, [])

  const activeAlerts = alerts.filter((a) => !dismissedIds.has(a.id))
  const hasWarnings = activeAlerts.length > 0

  return (
    <div
      className="h-6 flex items-center px-4 shrink-0 text-[11px]"
      style={{ background: 'rgba(7, 8, 15, 0.98)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Ecosystem status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${hasWarnings ? 'bg-warning animate-pulse' : 'bg-success'}`}
        />
        <span className={hasWarnings ? 'text-warning' : 'text-text-muted'}>
          {hasWarnings
            ? `${activeAlerts.length} alert${activeAlerts.length > 1 ? 's' : ''}`
            : 'Ecosystem OK'}
        </span>
      </div>

      <span className="mx-2.5 text-text-muted/30 select-none">|</span>

      {/* VPN */}
      <div className="flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="text-text-muted">VPN</span>
      </div>

      <div className="flex-1" />

      {/* UTC clock */}
      <span className="font-mono text-text-muted tabular-nums">{utcTime}</span>
    </div>
  )
}

function getUTC(): string {
  const now = new Date()
  return now.toUTCString().slice(17, 25) + ' UTC'
}
