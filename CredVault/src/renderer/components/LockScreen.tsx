import { useState, useEffect, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'

interface Props {
  needsSetup: boolean
}

export default function LockScreen({ needsSetup }: Props) {
  const setUnlocked = useStore(s => s.setUnlocked)
  const setSetup    = useStore(s => s.setSetup)
  const autoLockMs  = useStore(s => s.autoLockMs)

  const [pw, setPw]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Lockout countdown
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [countdown])

  async function handleSetup(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) { setError('Password must be at least 8 characters'); return }
    if (pw !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    const res = await window.electronAPI.setupVault(pw)
    setLoading(false)
    if (res.ok) { setSetup(true); setUnlocked(true) }
    else        setError(res.error ?? 'Setup failed')
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
    }
  }

  const isLocked = countdown > 0

  return (
    <div
      className="flex items-center justify-center h-full"
      style={{ background: 'var(--bg)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '36px 40px',
          width: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}
      >
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-0.3px' }}>
            CredVault
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {needsSetup ? 'Create your master password to get started' : 'Enter your master password to unlock'}
          </div>
        </div>

        {isLocked && (
          <div style={{
            background: 'rgba(248,81,73,0.1)',
            border: '1px solid rgba(248,81,73,0.3)',
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 12,
            color: 'var(--error)',
            textAlign: 'center'
          }}>
            Too many failed attempts. Locked for {countdown}s
          </div>
        )}

        <form onSubmit={needsSetup ? handleSetup : handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 5 }}>
              {needsSetup ? 'Master Password' : 'Password'}
            </label>
            <input
              type="password"
              placeholder={needsSetup ? 'At least 8 characters' : 'Enter master password'}
              value={pw}
              onChange={e => setPw(e.target.value)}
              disabled={loading || isLocked}
              autoFocus
            />
          </div>

          {needsSetup && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 5 }}>
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                disabled={loading || isLocked}
              />
            </div>
          )}

          {error && !isLocked && (
            <div style={{ fontSize: 12, color: 'var(--error)' }}>{error}</div>
          )}

          <button
            type="submit"
            className="btn btn-accent"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            disabled={loading || isLocked || !pw}
          >
            {loading ? 'Working…' : needsSetup ? 'Create Vault' : 'Unlock Vault'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
