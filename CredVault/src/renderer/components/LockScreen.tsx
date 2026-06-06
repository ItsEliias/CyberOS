import { useState, useEffect, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'

// ─── Password strength scoring ─────────────────────────────────────────────

interface StrengthResult { score: number; label: string; color: string; pct: number }

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
    0: { label: '',       color: 'rgba(42,51,71,0.5)',  pct: 0   },
    1: { label: 'Weak',   color: '#f85149',             pct: 25  },
    2: { label: 'Fair',   color: '#d29922',             pct: 50  },
    3: { label: 'Good',   color: '#4a9eff',             pct: 75  },
    4: { label: 'Strong', color: '#3fb950',             pct: 100 },
  }
  return { score: capped, ...map[capped] }
}

// ─── Password field with show/hide ────────────────────────────────────────

function PwField({
  value, onChange, placeholder, disabled, label, autoFocus = false,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string
  disabled?: boolean; label: string; autoFocus?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: '#8b949e', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
            color: '#484f58', fontSize: 11, fontWeight: 500, lineHeight: 1,
          }}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  )
}

// ─── Strength meter ────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const s = scorePassword(password)
  if (!password) return null
  return (
    <div style={{ marginTop: -4 }}>
      <div className="pw-strength-bar">
        <div className="pw-strength-fill" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
      </div>
      <div style={{ fontSize: 11, color: s.color, marginTop: 4 }}>
        {s.label && `Strength: ${s.label}`}
      </div>
    </div>
  )
}

// ─── Fingerprint icon ─────────────────────────────────────────────────────

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

// ─── LockScreen ────────────────────────────────────────────────────────────

interface Props { needsSetup: boolean }

export default function LockScreen({ needsSetup }: Props) {
  const setUnlocked = useStore(s => s.setUnlocked)
  const setSetup    = useStore(s => s.setSetup)
  const autoLockMs  = useStore(s => s.autoLockMs)

  const [pw, setPw]           = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [unlocked, setUnlockedAnim] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [shakeKey, setShakeKey]   = useState(0)
  const [inputPulseKey, setInputPulseKey] = useState(0)
  const [touchIdAvailable, setTouchIdAvailable] = useState(false)
  const [touchIdLoading, setTouchIdLoading]     = useState(false)
  const [showHint, setShowHint]   = useState(false)
  // Visual-only attempt counter — counts up on each password failure
  const [failCount, setFailCount] = useState(0)
  const MAX_ATTEMPTS = 5

  // 2FA second-step state
  const [twoFAOpen, setTwoFAOpen] = useState(false)
  const [otpCode, setOtpCode]     = useState('')
  const [twoFABusy, setTwoFABusy] = useState(false)

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

  function handlePwChange(v: string) {
    setPw(v)
    if (v.length > 0) setInputPulseKey(k => k + 1)
  }

  async function handleSetup(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) { setError('Password must be at least 8 characters'); triggerShake(); return }
    if (pw !== confirm) { setError('Passwords do not match'); triggerShake(); return }
    setLoading(true); setError('')
    const res = await window.electronAPI.setupVault(pw)
    setLoading(false)
    if (res.ok) { setUnlockedAnim(true); setTimeout(() => { setSetup(true); setUnlocked(true) }, 600) }
    else { setError(res.error ?? 'Setup failed'); triggerShake() }
  }

  async function handleUnlock(e: FormEvent) {
    e.preventDefault()
    if (!pw) return
    setLoading(true); setError('')
    const res = await window.electronAPI.unlockVault(pw, autoLockMs)
    setLoading(false)
    if (res.ok) {
      if (res.twoFactorRequired) {
        setTwoFAOpen(true)
        setOtpCode('')
      } else {
        setUnlockedAnim(true); setTimeout(() => setUnlocked(true), 600)
      }
    } else {
      if (res.lockoutSeconds) setCountdown(res.lockoutSeconds)
      setError(res.error ?? 'Unlock failed')
      setPw('')
      setFailCount(c => c + 1)
      triggerShake()
    }
  }

  async function handleTwoFA(e: FormEvent) {
    e.preventDefault()
    if (otpCode.length !== 6) return
    setTwoFABusy(true); setError('')
    const res = await window.electronAPI.totpVerify(otpCode, autoLockMs)
    setTwoFABusy(false)
    if (res.ok) {
      setTwoFAOpen(false)
      setUnlockedAnim(true)
      setTimeout(() => setUnlocked(true), 600)
    } else {
      setError(res.error ?? 'Code did not verify')
      setOtpCode('')
      triggerShake()
    }
  }

  async function handleTouchId() {
    setTouchIdLoading(true); setError('')
    try {
      const res = await window.electronAPI.touchIdPrompt()
      if (res.ok) { setUnlockedAnim(true); setTimeout(() => setUnlocked(true), 600) }
      else { setError(res.error ?? 'Touch ID failed'); triggerShake() }
    } catch { setError('Touch ID unavailable') }
    setTouchIdLoading(false)
  }

  const isLocked  = countdown > 0
  const canCreate = needsSetup && pw.length >= 8 && pw === confirm

  // Derive shimmer rotation speed: slower when idle, faster near unlock
  const shimmerClass = unlocked ? 'keyhole-shimmer-unlock' : 'keyhole-shimmer-idle'

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', position: 'relative', overflow: 'hidden', background: '#07080f' }}>
      {/* Pass 3: animated shifting multi-radial background */}
      <div className="lock-bg-gradient" />
      {/* Deep ambient glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, rgba(247,129,102,0.07) 0%, transparent 60%)', pointerEvents: 'none' }} />
      {/* Corner accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(247,129,102,0.15) 50%, transparent 100%)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 420,
          padding: '44px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          position: 'relative',
          zIndex: 1,
          background: 'rgba(13,14,24,0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(247,129,102,0.1)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(247,129,102,0.06), 0 0 48px rgba(247,129,102,0.05)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          {/* Lock icon with glow ring — shimmer when idle, scale+fade on unlock */}
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            {/* Rotating shimmer ring — idle animation */}
            {!unlocked && (
              <span
                className={shimmerClass}
                style={{
                  position: 'absolute', inset: -3, borderRadius: 22,
                  pointerEvents: 'none',
                  background: 'conic-gradient(from 0deg, transparent 60%, rgba(247,129,102,0.35) 80%, transparent 100%)',
                }}
              />
            )}
          <motion.div
            key={loading ? 'loading' : unlocked ? 'unlocked' : `idle-${inputPulseKey}`}
            animate={
              unlocked
                ? { rotate: [0, -15, 5, 0], scale: [1, 1.15, 1.08, 0], opacity: [1, 1, 1, 0], borderColor: ['rgba(247,129,102,0.25)', 'rgba(63,185,80,0.6)', 'rgba(63,185,80,0.3)'] }
                : loading
                  ? { rotate: [0, -5, 5, 0], scale: [1, 0.95, 1] }
                  : inputPulseKey > 0
                    ? { scale: [1, 1.06, 0.97, 1], rotate: [0, -4, 4, 0] }
                    : {}
            }
            transition={{ duration: unlocked ? 0.55 : inputPulseKey > 0 ? 0.32 : 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              width: 72, height: 72, borderRadius: 18,
              background: unlocked
                ? 'radial-gradient(circle at 50% 40%, rgba(63,185,80,0.18) 0%, rgba(63,185,80,0.06) 100%)'
                : 'radial-gradient(circle at 50% 40%, rgba(247,129,102,0.14) 0%, rgba(247,129,102,0.04) 100%)',
              border: '1px solid rgba(247,129,102,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: unlocked
                ? '0 0 32px rgba(63,185,80,0.25), inset 0 1px 0 rgba(255,255,255,0.05)'
                : '0 0 24px rgba(247,129,102,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
              transition: 'background 0.5s, box-shadow 0.5s',
            }}
          >
            {unlocked ? (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                <circle cx="12" cy="16" r="1" fill="#3fb950" />
              </svg>
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f78166" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1" fill="#f78166" />
              </svg>
            )}
          </motion.div>
          </div>

          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#e6edf3', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              CredVault
            </div>
            <div style={{ fontSize: 12, color: '#484f58', marginTop: 5, letterSpacing: '0.02em' }}>
              {needsSetup ? 'Create your secure credential vault' : 'Secure credential vault'}
            </div>
          </div>

          {/* State badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 600,
            letterSpacing: '0.07em', textTransform: 'uppercase',
            background: needsSetup ? 'rgba(63,185,80,0.08)' : 'rgba(247,129,102,0.08)',
            border: `1px solid ${needsSetup ? 'rgba(63,185,80,0.22)' : 'rgba(247,129,102,0.22)'}`,
            color: needsSetup ? '#3fb950' : '#f78166',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: needsSetup ? '#3fb950' : '#f78166', display: 'inline-block', flexShrink: 0 }} />
            {needsSetup ? 'First Time Setup' : 'Vault Locked'}
          </div>
        </div>

        {/* Lockout banner */}
        {isLocked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#f85149', textAlign: 'center' }}
          >
            Too many failed attempts. Locked for {countdown}s
          </motion.div>
        )}

        {/* 2FA step — replaces the password form once the password verifies */}
        {twoFAOpen ? (
          <form onSubmit={handleTwoFA} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Two-factor code
              </span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                Enter the 6-digit code from your authenticator app.
              </span>
            </div>
            <motion.div
              key={shakeKey}
              animate={shakeKey > 0 ? { x: [0, -5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                disabled={twoFABusy}
                style={{
                  width: '100%', textAlign: 'center', fontSize: 24,
                  letterSpacing: '0.25em', fontFamily: 'JetBrains Mono, monospace',
                  padding: '14px 12px',
                }}
              />
            </motion.div>
            {error && <p style={{ fontSize: 12, color: 'var(--error)', textAlign: 'center' }}>{error}</p>}
            <button type="submit" className="btn btn-accent" disabled={otpCode.length !== 6 || twoFABusy}
              style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 600 }}>
              {twoFABusy ? 'Verifying…' : 'Unlock'}
            </button>
            <button type="button" onClick={() => { setTwoFAOpen(false); setOtpCode(''); setError('') }}
              style={{ background: 'transparent', border: 'none', color: '#6b7280', fontSize: 11, cursor: 'pointer' }}>
              Use a different password
            </button>
          </form>
        ) : (
        /* Form */
        <form onSubmit={needsSetup ? handleSetup : handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <motion.div
            key={shakeKey}
            animate={shakeKey > 0 ? { x: [0, -5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <PwField
              label="Master Password"
              value={pw}
              onChange={handlePwChange}
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

          {needsSetup && (
            <div style={{ fontSize: 11, color: '#484f58', lineHeight: 1.6, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(42,51,71,0.4)' }}>
              Your master password encrypts all credentials using AES-256-GCM. It is never stored — only you know it.
            </div>
          )}

          {error && !isLocked && (
            <div style={{ fontSize: 12, color: '#f85149', padding: '8px 12px', borderRadius: 8, background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)' }}>
              {error}
            </div>
          )}

          {/* Visual-only attempt counter — shown after first failure */}
          {!needsSetup && failCount > 0 && !isLocked && (
            <div style={{
              fontSize: 11, textAlign: 'center',
              color: failCount >= MAX_ATTEMPTS - 1 ? '#f85149' : '#d29922',
            }}>
              {Math.max(0, MAX_ATTEMPTS - failCount)} attempt{Math.max(0, MAX_ATTEMPTS - failCount) !== 1 ? 's' : ''} remaining
            </div>
          )}

          {needsSetup && (
            <div style={{ fontSize: 11, color: '#d29922', padding: '8px 12px', borderRadius: 8, background: 'rgba(210,153,34,0.06)', border: '1px solid rgba(210,153,34,0.2)', lineHeight: 1.5 }}>
              If you forget this password, your credentials cannot be recovered.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLocked || !pw || (needsSetup && !canCreate)}
            style={{
              width: '100%', justifyContent: 'center', padding: '11px 16px',
              fontSize: 14, fontWeight: 600, marginTop: 2,
              background: loading || isLocked || !pw || (needsSetup && !canCreate)
                ? 'rgba(247,129,102,0.25)' : '#f78166',
              color: '#07080f', border: 'none', borderRadius: 8,
              cursor: loading || isLocked ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s, background 0.15s',
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'inherit',
              opacity: loading || isLocked || !pw || (needsSetup && !canCreate) ? 0.55 : 1,
            }}
          >
            {loading && (
              <span style={{ width: 14, height: 14, border: '2px solid rgba(7,8,15,0.4)', borderTopColor: '#07080f', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            )}
            {loading
              ? (needsSetup ? 'Creating vault…' : 'Unlocking…')
              : needsSetup ? 'Create Vault' : 'Unlock Vault'}
          </button>
        </form>
        )}

        {!needsSetup && touchIdAvailable && !twoFAOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: -8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(42,51,71,0.4)' }} />
              <span style={{ fontSize: 11, color: '#484f58' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(42,51,71,0.4)' }} />
            </div>
            <button
              onClick={handleTouchId}
              disabled={touchIdLoading || isLocked}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '9px 16px', fontSize: 13, fontWeight: 500,
                color: '#8b949e', background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(42,51,71,0.6)', borderRadius: 8,
                cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s', fontFamily: 'inherit',
              }}
            >
              <FingerprintIcon />
              {touchIdLoading ? 'Verifying…' : 'Use Touch ID'}
            </button>
          </div>
        )}

        {!needsSetup && !isLocked && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: -8 }}>
            <div style={{ fontSize: 11, color: '#484f58' }}>
              5 failed attempts triggers a 60-second lockout
            </div>
            <button
              type="button"
              onClick={() => setShowHint(h => !h)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#484f58', textDecoration: 'underline', textDecorationStyle: 'dotted', padding: 0 }}
            >
              Forgot password?
            </button>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: 11, color: '#d29922', padding: '8px 12px', borderRadius: 8, background: 'rgba(210,153,34,0.07)', border: '1px solid rgba(210,153,34,0.2)', textAlign: 'center', lineHeight: 1.5, maxWidth: 320 }}
              >
                Recovery hint: CredVault uses AES-256-GCM encryption. Your master password cannot be recovered. Restore from an encrypted backup if you have one.
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes keyholeShimmer { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes keyholeUnlock { 0%{opacity:1;transform:scale(1) rotate(0deg);} 50%{opacity:1;transform:scale(1.2) rotate(15deg);} 100%{opacity:0;transform:scale(1.5) rotate(30deg);} }
        .keyhole-shimmer-idle {
          animation: keyholeShimmer 3s linear infinite;
        }
        .keyhole-shimmer-unlock {
          animation: keyholeUnlock 0.55s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
