import { useState, useEffect, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'

function FingerprintIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
      <path d="M17.29 21.02c.12-2.36.05-7.36-1.29-9.02"/>
      <path d="M5 19c.5-4.5.5-9 0-12a7 7 0 0 1 14 0c0 1.25-.16 2.48-.43 3.65"/>
      <path d="M9 19.1a30 30 0 0 1-.15-5.73 5 5 0 0 1 10 0c.15 2.1 0 3.73-.25 5.23"/>
    </svg>
  )
}

interface Props {
  needsSetup: boolean
}

// ─── Password strength scoring ─────────────────────────────────────────────

interface StrengthResult {
  score: number    // 0-4
  label: string
  color: string
  pct: number
}

function scorePassword(pw: string): StrengthResult {
  if (!pw) return { score: 0, label: '', color: 'var(--border)', pct: 0 }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4
  const map: Record<0 | 1 | 2 | 3 | 4, { label: string; color: string; pct: number }> = {
    0: { label: '',       color: 'var(--border)',   pct: 0   },
    1: { label: 'Weak',   color: 'var(--error)',    pct: 25  },
    2: { label: 'Fair',   color: 'var(--warning)',  pct: 50  },
    3: { label: 'Good',   color: 'var(--info)',     pct: 75  },
    4: { label: 'Strong', color: 'var(--success)',  pct: 100 },
  }
  return { score: capped, ...map[capped] }
}

// ─── Password Field with show/hide ────────────────────────────────────────

function PwField({
  value, onChange, placeholder, disabled, label, autoFocus = false
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  label: string
  autoFocus?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          autoFocus={autoFocus}
          style={{ paddingRight: 52 }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          tabIndex={-1}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            color: 'var(--text-muted)',
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  )
}

// ─── Strength Meter ────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const s = scorePassword(password)
  if (!password) return null
  return (
    <div style={{ marginTop: -4 }}>
      <div className="pw-strength-bar">
        <div
          className="pw-strength-fill"
          style={{ width: `${s.pct}%`, backgroundColor: s.color }}
        />
      </div>
      <div style={{ fontSize: 11, color: s.color, marginTop: 4 }}>
        {s.label && `Strength: ${s.label}`}
      </div>
    </div>
  )
}

// ─── Lock Icon SVG ────────────────────────────────────────────────────────

function LockIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: '#f78166' }}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}

// ─── LockScreen ────────────────────────────────────────────────────────────

export default function LockScreen({ needsSetup }: Props) {
  const setUnlocked = useStore(s => s.setUnlocked)
  const setSetup    = useStore(s => s.setSetup)
  const autoLockMs  = useStore(s => s.autoLockMs)

  const [pw, setPw]           = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [shakeKey, setShakeKey]   = useState(0)
  const [touchIdAvailable, setTouchIdAvailable] = useState(false)
  const [touchIdLoading, setTouchIdLoading]     = useState(false)

  useEffect(() => {
    if (!needsSetup) {
      window.electronAPI.touchIdAvailable().then(setTouchIdAvailable).catch(() => {})
    }
  }, [needsSetup])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [countdown])

  function triggerShake() { setShakeKey(k => k + 1) }

  async function handleSetup(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) { setError('Password must be at least 8 characters'); triggerShake(); return }
    if (pw !== confirm) { setError('Passwords do not match'); triggerShake(); return }
    setLoading(true)
    setError('')
    const res = await window.electronAPI.setupVault(pw)
    setLoading(false)
    if (res.ok) {
      setSetup(true)
      setUnlocked(true)
    } else {
      setError(res.error ?? 'Setup failed')
      triggerShake()
    }
  }

  async function handleUnlock(e: FormEvent) {
    e.preventDefault()
    if (!pw) return
    setLoading(true)
    setError('')
    const res = await window.electronAPI.unlockVault(pw, autoLockMs)
    setLoading(false)
    if (res.ok) {
      setUnlocked(true)
    } else {
      if (res.lockoutSeconds) setCountdown(res.lockoutSeconds)
      setError(res.error ?? 'Unlock failed')
      setPw('')
      triggerShake()
    }
  }

  async function handleTouchId() {
    setTouchIdLoading(true)
    setError('')
    try {
      const res = await window.electronAPI.touchIdPrompt()
      if (res.ok) {
        setUnlocked(true)
      } else {
        setError(res.error ?? 'Touch ID failed')
        triggerShake()
      }
    } catch {
      setError('Touch ID unavailable')
    }
    setTouchIdLoading(false)
  }

  const isLocked  = countdown > 0
  const canCreate = needsSetup && pw.length >= 8 && pw === confirm

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow behind the card */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          height: 300,
          background: 'radial-gradient(ellipse, rgba(247,129,102,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="glass-card"
        style={{
          width: 420,
          padding: '40px 44px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(247,129,102,0.08)',
        }}
      >
        {/* Header — logo + title + subtitle */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <motion.div
            key={loading ? 'loading' : 'idle'}
            animate={loading ? { rotate: [0, -5, 5, 0], scale: [1, 0.95, 1] } : {}}
            transition={{ duration: 0.4 }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'rgba(247,129,102,0.08)',
              border: '1px solid rgba(247,129,102,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LockIcon size={28} />
          </motion.div>

          <div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#f78166',
              letterSpacing: '-0.4px',
              lineHeight: 1.2,
            }}>
              CredVault
            </div>
            <div style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 5,
              letterSpacing: '0.02em',
            }}>
              {needsSetup ? 'Create your secure credential vault' : 'Secure credential vault'}
            </div>
          </div>

          {/* State label badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: needsSetup ? 'rgba(63,185,80,0.08)' : 'rgba(247,129,102,0.08)',
            border: `1px solid ${needsSetup ? 'rgba(63,185,80,0.2)' : 'rgba(247,129,102,0.2)'}`,
            color: needsSetup ? 'var(--success)' : 'var(--accent)',
          }}>
            <span style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: needsSetup ? 'var(--success)' : 'var(--accent)',
              display: 'inline-block',
              flexShrink: 0,
            }} />
            {needsSetup ? 'First Time Setup' : 'Vault Locked'}
          </div>
        </div>

        {/* Lockout banner */}
        {isLocked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              background: 'rgba(248,81,73,0.08)',
              border: '1px solid rgba(248,81,73,0.25)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--error)',
              textAlign: 'center',
            }}
          >
            Too many failed attempts. Locked for {countdown}s
          </motion.div>
        )}

        {/* Form */}
        <form
          onSubmit={needsSetup ? handleSetup : handleUnlock}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <motion.div
            key={shakeKey}
            animate={shakeKey > 0 ? { x: [0, -5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <PwField
              label={needsSetup ? 'Master Password' : 'Master Password'}
              value={pw}
              onChange={setPw}
              placeholder={needsSetup ? 'At least 8 characters' : 'Enter your master password'}
              disabled={loading || isLocked}
              autoFocus
            />

            {needsSetup && pw && <PasswordStrength password={pw} />}

            {needsSetup && (
              <PwField
                label="Confirm Password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Re-enter password"
                disabled={loading || isLocked}
              />
            )}
          </motion.div>

          {/* Inline description for setup flow */}
          {needsSetup && (
            <div style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              padding: '8px 12px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
            }}>
              Your master password encrypts all credentials using AES-256-GCM. It is never stored — only you know it.
            </div>
          )}

          {/* Error message */}
          {error && !isLocked && (
            <div style={{
              fontSize: 12,
              color: 'var(--error)',
              padding: '8px 12px',
              borderRadius: 6,
              background: 'rgba(248,81,73,0.06)',
              border: '1px solid rgba(248,81,73,0.2)',
            }}>
              {error}
            </div>
          )}

          {/* Irrecoverability warning */}
          {needsSetup && (
            <div style={{
              fontSize: 11,
              color: 'var(--warning)',
              padding: '8px 12px',
              borderRadius: 6,
              background: 'rgba(210,153,34,0.06)',
              border: '1px solid rgba(210,153,34,0.2)',
              lineHeight: 1.5,
            }}>
              If you forget this password, your credentials cannot be recovered.
            </div>
          )}

          <button
            type="submit"
            className="btn btn-accent"
            style={{ width: '100%', justifyContent: 'center', padding: '9px 16px', fontSize: 14, marginTop: 2 }}
            disabled={loading || isLocked || !pw || (needsSetup && !canCreate)}
          >
            {loading
              ? (needsSetup ? 'Creating vault…' : 'Unlocking…')
              : needsSetup ? 'Create Vault' : 'Unlock Vault'}
          </button>
        </form>

        {!needsSetup && touchIdAvailable && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: -8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>
            <button
              onClick={handleTouchId}
              disabled={touchIdLoading || isLocked}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-dim)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              <FingerprintIcon />
              {touchIdLoading ? 'Verifying…' : 'Use Touch ID'}
            </button>
          </div>
        )}

        {/* Footer hint */}
        {!needsSetup && !isLocked && (
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: -8 }}>
            5 failed attempts triggers a 60-second lockout
          </div>
        )}
      </motion.div>
    </div>
  )
}
