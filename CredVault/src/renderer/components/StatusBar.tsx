// CredVault — Status Bar
// Bottom bar: vault status, credential count, auto-lock countdown ring, expiry warnings, UTC time

import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'

const RADIUS = 7
const CIRC   = 2 * Math.PI * RADIUS

function getUTC(): string {
  const now = new Date()
  return now.toUTCString().slice(17, 25) + ' UTC'
}

interface CountdownRingProps {
  totalMs:   number
  onReset:   () => void
}

function CountdownRing({ totalMs, onReset }: CountdownRingProps) {
  const [remainMs, setRemainMs] = useState(totalMs)
  const startRef  = useRef(Date.now())
  const frameRef  = useRef<number | null>(null)

  useEffect(() => {
    startRef.current = Date.now()
    setRemainMs(totalMs)

    function tick() {
      const elapsed = Date.now() - startRef.current
      const left    = Math.max(0, totalMs - elapsed)
      setRemainMs(left)
      if (left > 0) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [totalMs])

  const frac      = totalMs > 0 ? remainMs / totalMs : 1
  const dashOff   = CIRC * (1 - frac)
  const secLeft   = Math.ceil(remainMs / 1000)
  const minLeft   = Math.floor(secLeft / 60)
  const label     = secLeft > 60 ? `${minLeft}m` : `${secLeft}s`
  const ringColor = frac > 0.5 ? '#3fb950' : frac > 0.2 ? '#d29922' : '#f85149'

  return (
    <button
      onClick={onReset}
      title={`Auto-locks in ${label} — click to reset`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 2px',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle cx="9" cy="9" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
        <circle
          cx="9" cy="9" r={RADIUS}
          fill="none"
          stroke={ringColor}
          strokeWidth="2"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOff}
          strokeLinecap="round"
          transform="rotate(-90 9 9)"
          style={{ transition: 'stroke 0.5s' }}
        />
      </svg>
      <span style={{ fontSize: 10, color: ringColor, fontVariantNumeric: 'tabular-nums' }}>{label}</span>
    </button>
  )
}

export default function StatusBar() {
  const credentials = useStore(s => s.credentials)
  const autoLockMs  = useStore(s => s.autoLockMs)
  const [utcTime, setUtcTime] = useState(getUTC())
  const [ringKey, setRingKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setUtcTime(getUTC()), 1000)
    return () => clearInterval(interval)
  }, [])

  const handleResetTimer = useCallback(() => {
    if (autoLockMs > 0) {
      window.electronAPI.resetIdleTimer(autoLockMs)
      setRingKey(k => k + 1)
    }
  }, [autoLockMs])

  const activeCount  = credentials.filter(c => c.status === 'active').length
  const totalCount   = credentials.length

  // Expiry counts — credentials expiring within 7 days
  const now          = Date.now()
  const expiringCount = credentials.filter(c => {
    if (!c.expiresAt) return false
    const diff = new Date(c.expiresAt).getTime() - now
    return diff >= 0 && diff < 7 * 86_400_000
  }).length
  const expiredCount = credentials.filter(c => {
    if (!c.expiresAt) return false
    return new Date(c.expiresAt).getTime() < now
  }).length

  return (
    <div
      className="h-6 border-t border-border-subtle/50 flex items-center px-4 text-xs shrink-0"
      style={{ background: 'rgba(10, 10, 15, 0.9)', gap: 0 }}
    >
      {/* Vault status */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full status-dot-pulse"
          style={{
            backgroundColor: '#f78166',
            '--pulse-color': 'rgba(247,129,102,0.4)',
            '--pulse-color-fade': 'rgba(247,129,102,0)',
          } as React.CSSProperties}
        />
        <span className="text-text-secondary">Unlocked</span>
      </div>

      <span className="mx-3 text-text-muted">•</span>

      {/* Credential count */}
      <span className="text-text-secondary">
        <span className="text-accent font-medium tabular-nums">{totalCount}</span>
        {' '}cred{totalCount !== 1 ? 's' : ''}
        {totalCount > 0 && (
          <span className="text-text-muted ml-1">({activeCount} active)</span>
        )}
      </span>

      {/* Expiry warnings */}
      {(expiringCount > 0 || expiredCount > 0) && (
        <>
          <span className="mx-3 text-text-muted">•</span>
          {expiredCount > 0 && (
            <span style={{ fontSize: 10, color: '#f85149', fontWeight: 600 }}>
              {expiredCount} expired
            </span>
          )}
          {expiringCount > 0 && (
            <span style={{ fontSize: 10, color: '#d29922', marginLeft: expiredCount > 0 ? 6 : 0 }}>
              {expiringCount} expiring soon
            </span>
          )}
        </>
      )}

      <span className="mx-3 text-text-muted">•</span>

      {/* Auto-lock ring or label */}
      {autoLockMs > 0 ? (
        <CountdownRing key={ringKey} totalMs={autoLockMs} onReset={handleResetTimer} />
      ) : (
        <span className="text-text-muted">Auto-lock: off</span>
      )}

      <div className="flex-1" />

      {/* UTC time */}
      <span className="text-text-muted font-mono">{utcTime}</span>
    </div>
  )
}
