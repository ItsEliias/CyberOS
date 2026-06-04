// CredVault — Status Bar
// Bottom bar: vault status, credential count, auto-lock countdown ring, expiry warnings, UTC time

import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'

const RADIUS = 6
const CIRC   = 2 * Math.PI * RADIUS

function getUTC(): string {
  const now = new Date()
  return now.toUTCString().slice(17, 25) + ' UTC'
}

interface CountdownRingProps {
  totalMs: number
  onReset: () => void
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
      className="flex items-center gap-1 transition-opacity hover:opacity-75"
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', gap: 5 }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
        <circle
          cx="8" cy="8" r={RADIUS}
          fill="none" stroke={ringColor} strokeWidth="2"
          strokeDasharray={CIRC} strokeDashoffset={dashOff}
          strokeLinecap="round" transform="rotate(-90 8 8)"
          style={{ transition: 'stroke 0.5s' }}
        />
      </svg>
      {/* Draining bar visualization */}
      <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(42,51,71,0.5)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${frac * 100}%`,
          background: ringColor,
          transition: 'width 1s linear, background 0.5s',
        }} />
      </div>
      <span className="tabular-nums" style={{ fontSize: 10, color: ringColor }}>{label}</span>
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
    if (autoLockMs > 0) { window.electronAPI.resetIdleTimer(autoLockMs); setRingKey(k => k + 1) }
  }, [autoLockMs])

  const activeCount = credentials.filter(c => c.status === 'active').length
  const totalCount  = credentials.length
  const now         = Date.now()

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
      className="h-6 flex items-center px-4 shrink-0"
      style={{ background: 'rgba(7,8,15,0.98)', borderTop: '1px solid rgba(255,255,255,0.04)', gap: 0 }}
    >
      {/* Vault unlocked status */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full status-dot-pulse"
          style={{
            backgroundColor: '#f78166',
            '--pulse-color': 'rgba(247,129,102,0.4)',
            '--pulse-color-fade': 'rgba(247,129,102,0)',
          } as React.CSSProperties}
        />
        <span className="text-[10px]" style={{ color: '#8b949e' }}>Unlocked</span>
      </div>

      <span className="mx-3 text-[10px]" style={{ color: '#484f58' }}>·</span>

      {/* Credential count */}
      <span className="text-[10px]" style={{ color: '#8b949e' }}>
        <span className="tabular-nums font-medium" style={{ color: '#f78166' }}>{totalCount}</span>
        {' '}cred{totalCount !== 1 ? 's' : ''}
        {totalCount > 0 && (
          <span className="ml-1" style={{ color: '#484f58' }}>({activeCount} active)</span>
        )}
      </span>

      {/* Expiry warnings */}
      {(expiringCount > 0 || expiredCount > 0) && (
        <>
          <span className="mx-3 text-[10px]" style={{ color: '#484f58' }}>·</span>
          {expiredCount > 0 && (
            <span className="text-[10px] font-semibold" style={{ color: '#f85149' }}>
              {expiredCount} expired
            </span>
          )}
          {expiringCount > 0 && (
            <span className="text-[10px]" style={{ color: '#d29922', marginLeft: expiredCount > 0 ? 6 : 0 }}>
              {expiringCount} expiring soon
            </span>
          )}
        </>
      )}

      <span className="mx-3 text-[10px]" style={{ color: '#484f58' }}>·</span>

      {/* Auto-lock ring or label */}
      {autoLockMs > 0 ? (
        <CountdownRing key={ringKey} totalMs={autoLockMs} onReset={handleResetTimer} />
      ) : (
        <span className="text-[10px]" style={{ color: '#484f58' }}>Auto-lock: off</span>
      )}

      <div className="flex-1" />

      {/* UTC clock */}
      <span className="text-[10px] font-mono tabular-nums" style={{ color: '#484f58' }}>{utcTime}</span>
    </div>
  )
}
