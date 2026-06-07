// CredVault — Security section: 2FA setup + Recovery key generation.
// Renders inside SettingsView; uses the security IPC handlers added in
// `src/main/security.ts` + `src/main/ipc/credvault.ts`.

import { useEffect, useState } from 'react'
import { Card, SettingRow } from './SettingsViewParts'
import HelpTip from './ui/HelpTip'

export default function SecuritySection() {
  // ── 2FA state ───────────────────────────────────────────────────────────
  const [twoFA, setTwoFA]                 = useState<{ enabled: boolean }>({ enabled: false })
  const [setupSecret, setSetupSecret]     = useState<string | null>(null)
  const [setupUri, setSetupUri]           = useState<string | null>(null)
  const [setupCode, setSetupCode]         = useState('')
  const [setupErr, setSetupErr]           = useState<string | null>(null)
  const [setupBusy, setSetupBusy]         = useState(false)
  const [disableCode, setDisableCode]     = useState('')
  const [disableErr, setDisableErr]       = useState<string | null>(null)

  // ── Recovery key state ─────────────────────────────────────────────────
  const [rec, setRec]                     = useState<{ configured: boolean }>({ configured: false })
  const [showRecovery, setShowRecovery]   = useState(false)
  const [recovery, setRecovery]           = useState<string | null>(null)
  const [recoveryCopied, setRecoveryCopied] = useState(false)
  const [recBusy, setRecBusy]             = useState(false)

  // ── Touch ID state ─────────────────────────────────────────────────────
  const [touchIdSupported, setTouchIdSupported] = useState(false)
  const [touchIdEnabled,   setTouchIdEnabled]   = useState(false)
  const [touchPw,          setTouchPw]          = useState('')
  const [touchErr,         setTouchErr]         = useState<string | null>(null)
  const [touchBusy,        setTouchBusy]        = useState(false)

  useEffect(() => {
    window.electronAPI.totpStatus().then(setTwoFA).catch(() => {})
    window.electronAPI.recoveryStatus().then(setRec).catch(() => {})
    window.electronAPI.touchIdAvailable().then(setTouchIdSupported).catch(() => {})
    window.electronAPI.touchIdEnabled().then(setTouchIdEnabled).catch(() => {})
  }, [])

  async function enableTouchId() {
    setTouchErr(null); setTouchBusy(true)
    try {
      const r = await window.electronAPI.touchIdEnable(touchPw)
      if (r.ok) { setTouchIdEnabled(true); setTouchPw(''); }
      else setTouchErr(r.error || 'Could not enable')
    } finally { setTouchBusy(false) }
  }
  async function disableTouchId() {
    await window.electronAPI.touchIdDisable()
    setTouchIdEnabled(false)
  }

  async function startTotpSetup() {
    setSetupErr(null)
    const r = await window.electronAPI.totpSetup()
    setSetupSecret(r.secret)
    setSetupUri(r.otpauthUri)
    setSetupCode('')
  }

  async function confirmTotp() {
    if (!setupSecret) return
    setSetupBusy(true); setSetupErr(null)
    try {
      const r = await window.electronAPI.totpConfirm(setupSecret, setupCode)
      if (!r.ok) { setSetupErr(r.error || 'Could not confirm code'); return }
      setSetupSecret(null); setSetupUri(null); setSetupCode('')
      setTwoFA({ enabled: true })
    } finally { setSetupBusy(false) }
  }

  function cancelTotpSetup() {
    setSetupSecret(null); setSetupUri(null); setSetupCode(''); setSetupErr(null)
  }

  async function disableTotp() {
    setDisableErr(null)
    const r = await window.electronAPI.totpDisable(disableCode)
    if (!r.ok) { setDisableErr(r.error || 'Could not disable'); return }
    setDisableCode('')
    setTwoFA({ enabled: false })
  }

  async function generateRecovery() {
    setRecBusy(true)
    try {
      const r = await window.electronAPI.recoveryGenerate()
      setRecovery(r.display)
      setShowRecovery(true)
      setRec({ configured: true })
    } finally { setRecBusy(false) }
  }

  async function downloadRecovery() {
    if (!recovery) return
    const blob = new Blob(
      [`CredVault Recovery Key\n` +
       `Generated: ${new Date().toISOString()}\n\n` +
       `${recovery}\n\n` +
       `Keep this safe. Without it AND your master password, your vault cannot be recovered.\n`],
      { type: 'text/plain' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `credvault-recovery-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copyRecovery() {
    if (!recovery) return
    try {
      await navigator.clipboard.writeText(recovery)
      // A recovery key the user thinks they copied but didn't is a
      // lost-access scenario; only flash the confirmation on actual
      // clipboard-write success.
      setRecoveryCopied(true)
      setTimeout(() => setRecoveryCopied(false), 2500)
    } catch { /* ignore — leave button in non-confirmed state */ }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Card
        title="Two-Factor Authentication"
        help={<HelpTip title="Two-factor authentication" body="Pair the vault with a TOTP authenticator app (Authy, 1Password, Google Authenticator). Once enabled, unlocking will require both your master password and a fresh 6-digit code." />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {!twoFA.enabled && !setupSecret && (
            <>
              <p style={{ fontSize: 12, color: '#8b949e', marginBottom: 0, lineHeight: 1.55 }}>
                Add a TOTP code from your authenticator app (1Password, Authy, Google Authenticator,
                Microsoft Authenticator) on top of your master password. Strongly recommended.
              </p>
              <button onClick={startTotpSetup} className="btn btn-accent" style={{ alignSelf: 'flex-start', fontSize: 12 }}>
                Set up authenticator app
              </button>
            </>
          )}

          {setupSecret && setupUri && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, color: '#8b949e', marginBottom: 0, lineHeight: 1.55 }}>
                Add this secret to your authenticator app, then enter the 6-digit code it generates
                to confirm.
              </p>
              <div style={{
                padding: '10px 12px', borderRadius: 6,
                background: 'rgba(13,14,24,0.7)', border: '1px solid rgba(42,51,71,0.6)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div>
                  <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Secret (base32)
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#e6edf3', wordBreak: 'break-all', userSelect: 'all' }}>
                    {setupSecret}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Or paste this otpauth:// URI
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#8b949e', wordBreak: 'break-all', userSelect: 'all' }}>
                    {setupUri}
                  </div>
                </div>
              </div>
              <SettingRow label="6-digit code" description="From your authenticator app">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={setupCode}
                  onChange={e => setSetupCode(e.target.value.replace(/\D/g, ''))}
                  style={{ width: 110, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, letterSpacing: '0.15em', textAlign: 'center' }}
                />
              </SettingRow>
              {setupErr && <p style={{ fontSize: 12, color: 'var(--error)' }}>{setupErr}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmTotp} className="btn btn-accent" style={{ fontSize: 12 }}
                  disabled={setupCode.length !== 6 || setupBusy}>
                  {setupBusy ? 'Verifying…' : 'Confirm + enable'}
                </button>
                <button onClick={cancelTotpSetup} className="btn btn-ghost" style={{ fontSize: 12 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {twoFA.enabled && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6,
                            background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.25)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: '#3fb950' }} />
                <span style={{ fontSize: 12, color: '#3fb950', fontWeight: 600 }}>2FA active</span>
                <span style={{ fontSize: 11, color: '#8b949e' }}>
                  · A code from your authenticator is required on unlock.
                </span>
              </div>
              <SettingRow label="Disable 2FA" description="Enter a current authenticator code to turn off">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={disableCode}
                    onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))}
                    style={{ width: 110, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, letterSpacing: '0.15em', textAlign: 'center' }}
                  />
                  <button onClick={disableTotp} className="btn btn-ghost" style={{ fontSize: 12 }}
                    disabled={disableCode.length !== 6}>
                    Disable
                  </button>
                </div>
              </SettingRow>
              {disableErr && <p style={{ fontSize: 12, color: 'var(--error)' }}>{disableErr}</p>}
            </>
          )}
        </div>
      </Card>

      <Card
        title="Recovery Key"
        help={<HelpTip title="Recovery key" body="A 48-character one-time key that lets you reset your master password if you forget it. Save it offline — without both the key and your password, the vault is unrecoverable." />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {!rec.configured && !showRecovery && (
            <>
              <p style={{ fontSize: 12, color: '#8b949e', marginBottom: 0, lineHeight: 1.55 }}>
                Generate a 48-character one-time recovery key. Store it somewhere safe (1Password,
                paper, USB key) — you can use it to reset your master password if you ever forget it.
                Without it AND your password, the vault is unrecoverable.
              </p>
              <button onClick={generateRecovery} className="btn btn-accent" style={{ alignSelf: 'flex-start', fontSize: 12 }}
                disabled={recBusy}>
                {recBusy ? 'Generating…' : 'Generate recovery key'}
              </button>
            </>
          )}

          {rec.configured && !showRecovery && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6,
                            background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.25)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: '#3fb950' }} />
                <span style={{ fontSize: 12, color: '#3fb950', fontWeight: 600 }}>Recovery key configured</span>
              </div>
              <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 0, lineHeight: 1.55 }}>
                Generating a new key will invalidate the old one.
              </p>
              <button onClick={generateRecovery} className="btn btn-ghost" style={{ alignSelf: 'flex-start', fontSize: 12 }}
                disabled={recBusy}>
                {recBusy ? 'Generating…' : 'Regenerate recovery key'}
              </button>
            </>
          )}

          {showRecovery && recovery && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, color: '#f78166', marginBottom: 0, lineHeight: 1.55, fontWeight: 600 }}>
                ⚠ This is your only chance to record this key. Save it now.
              </p>
              <div style={{
                padding: '14px 16px', borderRadius: 8,
                background: 'rgba(13,14,24,0.85)', border: '1px solid rgba(247,129,102,0.35)',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#e6edf3',
                letterSpacing: '0.04em', textAlign: 'center', userSelect: 'all', wordBreak: 'break-all',
              }}>
                {recovery}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copyRecovery} className="btn btn-ghost" style={{ fontSize: 12, color: recoveryCopied ? '#3fb950' : undefined }}>
                  {recoveryCopied ? 'Copied ✓' : 'Copy'}
                </button>
                <button onClick={downloadRecovery} className="btn btn-ghost" style={{ fontSize: 12 }}>
                  Download .txt
                </button>
                <button onClick={() => { setShowRecovery(false); setRecovery(null) }}
                  className="btn btn-accent" style={{ fontSize: 12 }}>
                  I've saved it
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {touchIdSupported && (
        <Card title="Touch ID">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!touchIdEnabled ? (
              <>
                <p style={{ fontSize: 12, color: '#8b949e', marginBottom: 0, lineHeight: 1.55 }}>
                  Unlock CredVault with your fingerprint. Your master password is stored encrypted
                  in the macOS Keychain via Electron safeStorage; only this app — running as you,
                  on this Mac — can read it.
                </p>
                <SettingRow label="Confirm password" description="One-time, used to verify before storing">
                  <input
                    type="password"
                    placeholder="Master password"
                    value={touchPw}
                    onChange={e => setTouchPw(e.target.value)}
                    style={{ width: 220 }}
                  />
                </SettingRow>
                {touchErr && <p style={{ fontSize: 12, color: 'var(--error)' }}>{touchErr}</p>}
                <button
                  onClick={enableTouchId}
                  className="btn btn-accent"
                  style={{ alignSelf: 'flex-start', fontSize: 12 }}
                  disabled={!touchPw || touchBusy}
                >
                  {touchBusy ? 'Verifying…' : 'Enable Touch ID'}
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6,
                              background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.25)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: '#3fb950' }} />
                  <span style={{ fontSize: 12, color: '#3fb950', fontWeight: 600 }}>Touch ID active</span>
                  <span style={{ fontSize: 11, color: '#8b949e' }}>
                    · Tap the fingerprint icon on the lock screen.
                  </span>
                </div>
                <button onClick={disableTouchId} className="btn btn-ghost" style={{ alignSelf: 'flex-start', fontSize: 12 }}>
                  Disable Touch ID
                </button>
              </>
            )}
          </div>
        </Card>
      )}
    </>
  )
}
