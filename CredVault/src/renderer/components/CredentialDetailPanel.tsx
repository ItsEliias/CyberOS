// CredVault — CredentialDetailPanel
// Right-panel credential detail view with glass-card style per design spec.

import { useState, useEffect, useRef } from 'react'
import * as OTPAuth from 'otpauth'
import type { Credential, BreachCheckResult } from '@shared/types'
import { useStore } from '../store'
import { PasswordStrengthBar, ExpiryBadge } from './ui/CredentialBits'
import { playTotpExpiring } from '../utils/audioNotify'

const TOTP_PERIOD = 30

function TotpLive({ secret }: { secret: string }) {
  const [code, setCode]       = useState('')
  const [secLeft, setSecLeft] = useState(0)
  const warnedRef   = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function tick() {
      try {
        const totp  = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: TOTP_PERIOD })
        const epoch = Math.floor(Date.now() / 1000)
        const left  = TOTP_PERIOD - (epoch % TOTP_PERIOD)
        setCode(totp.generate()); setSecLeft(left)
        if (left === 5 && !warnedRef.current) { warnedRef.current = true; playTotpExpiring() }
        else if (left > 10) warnedRef.current = false
      } catch { setCode('ERROR') }
    }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [secret])

  const frac = secLeft / TOTP_PERIOD
  const circ = 2 * Math.PI * 5
  const ringColor = frac > 0.5 ? '#3fb950' : frac > 0.2 ? '#d29922' : '#f85149'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
        <circle cx="7" cy="7" r="5" fill="none" stroke={ringColor} strokeWidth="2"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)}
          strokeLinecap="round" transform="rotate(-90 7 7)" style={{ transition: 'stroke 0.5s' }} />
      </svg>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, letterSpacing: '0.12em', color: '#e2e8f0', fontWeight: 600 }}>
        {code}
      </span>
      <span style={{ fontSize: 10, color: ringColor }}>{secLeft}s</span>
    </div>
  )
}

// ─── Masked password field ─────────────────────────────────────────────────────

function PasswordField({ password, onCopy }: { password: string; onCopy: () => void }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
        color: '#e2e8f0', background: 'rgba(10,10,15,0.8)',
        borderRadius: 5, padding: '5px 9px', border: '1px solid rgba(42,51,71,0.5)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        letterSpacing: revealed ? '0.04em' : '0.2em',
      }}>
        {revealed ? password : '••••••••'}
      </span>
      <button
        className="btn btn-ghost"
        style={{ fontSize: 11, padding: '4px 9px', flexShrink: 0 }}
        onClick={() => setRevealed(r => !r)}
        title={revealed ? 'Hide password' : 'Reveal password'}
      >
        {revealed ? 'Hide' : 'Show'}
      </button>
      <button
        className="btn btn-ghost"
        style={{ fontSize: 11, padding: '4px 9px', flexShrink: 0 }}
        onClick={onCopy}
        title="Copy password"
      >
        Copy
      </button>
    </div>
  )
}

// ─── Copy field ────────────────────────────────────────────────────────────────

function CopyRow({ label, value, onCopy, mono }: { label: string; value: string; onCopy: () => void; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          flex: 1, fontSize: 13, color: '#e2e8f0',
          fontFamily: mono ? 'JetBrains Mono, monospace' : undefined,
          background: 'rgba(10,10,15,0.8)', borderRadius: 5, padding: '5px 9px',
          border: '1px solid rgba(42,51,71,0.5)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value}
        </span>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 9px', flexShrink: 0 }} onClick={onCopy}>
          Copy
        </button>
      </div>
    </div>
  )
}

// ─── Status dot ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<Credential['status'], string> = {
  active:  '#3fb950',
  rotated: '#d29922',
  invalid: '#4a5568',
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  cred:         Credential
  breachResult?: BreachCheckResult
  onEdit:       (c: Credential) => void
  onDelete:     (id: string) => void
  onRotate:     (id: string) => void
}

export default function CredentialDetailPanel({ cred, breachResult, onEdit, onDelete, onRotate }: Props) {
  const clipboardClearMs = useStore(s => s.clipboardClearMs)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { setCopyMsg(null); return 0 } return c - 1 }), 1000)
    return () => clearInterval(t)
  }, [countdown])

  async function copyValue(text: string, label: string, secure = false) {
    const clearMs = secure && clipboardClearMs > 0 ? clipboardClearMs : 0
    await window.electronAPI.copySecure(text, clearMs)
    await window.electronAPI.recordUsage(cred.id)
    setCopyMsg(`${label} copied${secure && clearMs > 0 ? '' : ''}`)
    if (secure && clearMs > 0) setCountdown(Math.round(clearMs / 1000))
    else setTimeout(() => setCopyMsg(null), 1500)
  }

  const breached = breachResult?.ok && (breachResult.breachCount ?? 0) > 0

  return (
    <div style={{
      background: 'rgba(22,27,39,0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(42,51,71,0.6)',
      borderRadius: 8,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cred.service}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#8b949e', fontFamily: 'JetBrains Mono, monospace' }}>{cred.username}</span>
            {cred.category && (
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 6,
                border: '1px solid rgba(247,129,102,0.4)', background: 'rgba(247,129,102,0.1)',
                color: '#f78166', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {cred.category}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[cred.status], display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: STATUS_COLORS[cred.status] }}>{cred.status}</span>
            </span>
            {cred.expiresAt && <ExpiryBadge expiresAt={cred.expiresAt} />}
            {breached && (
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 6, border: '1px solid rgba(248,81,73,0.4)', background: 'rgba(248,81,73,0.12)', color: '#f85149', fontWeight: 600 }}>
                BREACH
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => onEdit(cred)}>
            Edit
          </button>
          <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => onDelete(cred.id)}>
            Delete
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(42,51,71,0.4)' }} />

      {/* Username */}
      <CopyRow label="Username" value={cred.username} onCopy={() => copyValue(cred.username, 'Username')} mono />

      {/* Password */}
      {cred.password && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Password</span>
          <PasswordField password={cred.password} onCopy={() => copyValue(cred.password!, 'Password', true)} />
          <PasswordStrengthBar password={cred.password} />
          {copyMsg && countdown > 0 && (
            <span style={{ fontSize: 10, color: '#8b949e' }}>Clipboard clears in {countdown}s</span>
          )}
        </div>
      )}

      {/* Hash */}
      {cred.hash && (
        <CopyRow
          label={`Hash${cred.hashType ? ` (${cred.hashType.toUpperCase()})` : ''}`}
          value={cred.hash}
          onCopy={() => copyValue(cred.hash!, 'Hash')}
          mono
        />
      )}

      {/* TOTP */}
      {cred.totpSecret && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.07em' }}>TOTP</span>
          <TotpLive secret={cred.totpSecret} />
        </div>
      )}

      {/* Copy toast */}
      {copyMsg && (
        <div style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.2)', color: '#3fb950', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          {copyMsg}
        </div>
      )}

      {/* Secondary fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {cred.ip && (
          <CopyRow label="IP / Port" value={`${cred.ip}${cred.port ? ':' + cred.port : ''}`} onCopy={() => copyValue(cred.ip!, 'IP')} mono />
        )}
        {cred.protocol && <InfoField label="Protocol" value={cred.protocol} />}
        {cred.labName  && <InfoField label="Lab" value={cred.labName} />}
        {cred.targetName && <InfoField label="Target" value={cred.targetName} />}
        {cred.folder   && <InfoField label="Folder" value={cred.folder} />}
        {cred.source   && <InfoField label="Source" value={cred.source} />}
        {cred.lastUsed && <InfoField label="Last Used" value={new Date(cred.lastUsed).toLocaleDateString()} />}
        <InfoField label="Created" value={new Date(cred.createdAt).toLocaleDateString()} />
      </div>

      {/* Tags */}
      {cred.tags && cred.tags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tags</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {cred.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
          </div>
        </div>
      )}

      {/* Notes */}
      {cred.notes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {cred.type === 'note' ? 'Content' : 'Notes'}
          </span>
          <p style={{ fontSize: 12, color: '#8b949e', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>
            {cred.notes}
          </p>
        </div>
      )}

      {/* Footer actions */}
      {cred.status !== 'rotated' && (
        <button
          className="btn btn-ghost"
          style={{ alignSelf: 'flex-start', fontSize: 11, padding: '4px 10px', borderColor: 'rgba(210,153,34,0.35)', color: '#d29922' }}
          onClick={() => onRotate(cred.id)}
          title="Mark this credential as rotated (no longer active)"
        >
          Mark Rotated
        </button>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#8b949e' }}>{value}</span>
    </div>
  )
}
