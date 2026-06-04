// CyberOS Dashboard — Status Bar

import { useState, useEffect, useRef } from 'react'
import { useDashboardStore } from '../../stores/useDashboardStore'

/** Simulate latency: drifts around a base value with small random variation */
function simulateLatency(base: number): number {
  return Math.round(base + (Math.random() - 0.5) * base * 0.4)
}

function latencyColor(ms: number): string {
  if (ms < 40) return '#3fb950'
  if (ms < 100) return '#d29922'
  return '#f85149'
}

export default function StatusBar() {
  const alerts = useDashboardStore((s) => s.alerts)
  const dismissedIds = useDashboardStore((s) => s.dismissedAlertIds)
  const events = useDashboardStore((s) => s.events)
  const [utcTime, setUtcTime] = useState(getUTC())
  const [newEventFlash, setNewEventFlash] = useState(false)
  const [latencyMs, setLatencyMs] = useState(() => simulateLatency(28))
  const prevEventCountRef = useRef(events.length)

  useEffect(() => {
    const interval = setInterval(() => setUtcTime(getUTC()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Update mock latency every 3 seconds
  useEffect(() => {
    const id = setInterval(() => setLatencyMs(simulateLatency(28)), 3000)
    return () => clearInterval(id)
  }, [])

  // Flash indicator on new event
  useEffect(() => {
    if (events.length > prevEventCountRef.current) {
      setNewEventFlash(true)
      const t = setTimeout(() => setNewEventFlash(false), 1200)
      prevEventCountRef.current = events.length
      return () => clearTimeout(t)
    }
    prevEventCountRef.current = events.length
  }, [events.length])

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
          className={`w-1.5 h-1.5 rounded-full ${hasWarnings ? 'animate-pulse' : ''}`}
          style={{ background: hasWarnings ? 'var(--sev-medium)' : 'var(--state-online)' }}
        />
        <span style={{ color: hasWarnings ? 'var(--sev-medium)' : 'var(--text-muted)' }}>
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

      <span className="mx-2.5 text-text-muted/30 select-none">|</span>

      {/* Live event indicator */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex items-center justify-center w-2 h-2">
          {newEventFlash && (
            <span
              className="absolute inset-0 rounded-full new-event-ping"
              style={{ background: 'var(--accent)' }}
            />
          )}
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: newEventFlash ? 'var(--accent)' : 'rgba(74,158,255,0.35)',
              transition: 'background 300ms',
            }}
          />
        </span>
        <span className="text-text-muted tabular-nums font-mono">
          {events.length} events
        </span>
      </div>

      <div className="flex-1" />

      {/* Network latency */}
      <div className="flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ color: latencyColor(latencyMs) }}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <span
          className="font-mono tabular-nums"
          style={{ color: latencyColor(latencyMs) }}
        >
          {latencyMs}ms
        </span>
      </div>

      <span className="mx-2.5 text-text-muted/30 select-none">|</span>

      {/* UTC clock */}
      <span className="font-mono text-text-muted tabular-nums">{utcTime}</span>
    </div>
  )
}

function getUTC(): string {
  const now = new Date()
  return now.toUTCString().slice(17, 25) + ' UTC'
}
