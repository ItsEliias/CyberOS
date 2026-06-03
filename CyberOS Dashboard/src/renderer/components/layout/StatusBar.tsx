// CyberOS Dashboard — Status Bar Component
// Bottom status bar showing ecosystem status, VPN, and UTC time

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
    <div className="h-6 border-t border-border-subtle/50 flex items-center px-4 text-xs shrink-0" style={{ background: 'rgba(10, 10, 15, 0.9)' }}>
      {/* Ecosystem status */}
      <div className="flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full ${hasWarnings ? 'bg-warning' : 'bg-success'}`}
        />
        <span className="text-text-secondary">
          {hasWarnings ? `${activeAlerts.length} alert${activeAlerts.length > 1 ? 's' : ''}` : 'Ecosystem OK'}
        </span>
      </div>

      <span className="mx-3 text-text-muted">•</span>

      {/* VPN status */}
      <div className="flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="text-text-secondary">VPN: Connected</span>
      </div>

      <div className="flex-1" />

      {/* UTC time */}
      <span className="text-text-muted font-mono">{utcTime}</span>
    </div>
  )
}

function getUTC(): string {
  const now = new Date()
  return now.toUTCString().slice(17, 25) + ' UTC'
}
