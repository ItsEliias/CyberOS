import { useState, useEffect, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as OTPAuth from 'otpauth'
import type { Credential, CredentialCategory } from '@shared/types'
import { useStore } from '../store'
import { fuzzyMatch, highlightSegments } from '../utils/fuzzySearch'
import { playTotpExpiring } from '../utils/audioNotify'

// ─── Category pill colors ──────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<CredentialCategory, string> = {
  'SSH':         '#4a9eff',
  'API Key':     '#a78bfa',
  'Web':         '#3fb950',
  'Database':    '#f78166',
  'Certificate': '#d29922',
  'Token':       '#e879f9',
  'Other':       '#8b949e',
}

function CategoryPill({ cat }: { cat: CredentialCategory }) {
  const color = CATEGORY_COLORS[cat]
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
      border: `1px solid ${color}40`, background: `${color}18`, color,
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {cat}
    </span>
  )
}

// ─── Expiry badge ──────────────────────────────────────────────────────────────

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const now   = Date.now()
  const exp   = new Date(expiresAt).getTime()
  const diff  = exp - now
  const days  = Math.ceil(diff / 86_400_000)
  let color   = '#3fb950'
  let label   = `${days}d`
  if (diff < 0)          { color = '#f85149'; label = 'Expired' }
  else if (days <= 7)    { color = '#f85149'; label = `${days}d` }
  else if (days <= 30)   { color = '#d29922'; label = `${days}d` }
  return (
    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 6, border: `1px solid ${color}40`, background: `${color}18`, color }}>
      {label}
    </span>
  )
}

// ─── TOTP live code ───────────────────────────────────────────────────────────

const TOTP_PERIOD = 30

function TotpCode({ secret }: { secret: string }) {
  const [code, setCode]       = useState('')
  const [secLeft, setSecLeft] = useState(0)
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const warnedRef    = useRef(false)

  useEffect(() => {
    function generate() {
      try {
        const totp  = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: TOTP_PERIOD })
        const token = totp.generate()
        const epoch = Math.floor(Date.now() / 1000)
        const left  = TOTP_PERIOD - (epoch % TOTP_PERIOD)
        setCode(token)
        setSecLeft(left)
        // Play warning when 5 seconds remain (once per period)
        if (left === 5 && !warnedRef.current) {
          warnedRef.current = true
          playTotpExpiring()
        } else if (left > 10) {
          warnedRef.current = false
        }
      } catch {
        setCode('ERROR')
      }
    }
    generate()
    intervalRef.current = setInterval(generate, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [secret])

  const frac       = secLeft / TOTP_PERIOD
  const circ       = 2 * Math.PI * 5
  const dashOff    = circ * (1 - frac)
  const ringColor  = frac > 0.5 ? '#3fb950' : frac > 0.2 ? '#d29922' : '#f85149'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
        <circle cx="7" cy="7" r="5" fill="none" stroke={ringColor} strokeWidth="2"
          strokeDasharray={circ} strokeDashoffset={dashOff} strokeLinecap="round"
          transform="rotate(-90 7 7)" style={{ transition: 'stroke 0.5s' }} />
      </svg>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '0.1em', color: '#e6edf3', fontWeight: 600 }}>
        {code}
      </span>
    </div>
  )
}

// ─── Highlight span ────────────────────────────────────────────────────────────

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const { matched, indices } = fuzzyMatch(query, text)
  if (!matched || !indices.length) return <>{text}</>
  const segs = highlightSegments(text, indices)
  return (
    <>
      {segs.map((s, i) =>
        s.highlight
          ? <span key={i} style={{ color: '#f78166', fontWeight: 600 }}>{s.text}</span>
          : <span key={i}>{s.text}</span>
      )}
    </>
  )
}

// ─── Credential age ────────────────────────────────────────────────────────────

function credAge(createdAt: string): { label: string; color: string; stale: boolean } {
  const ms   = Date.now() - new Date(createdAt).getTime()
  const h    = ms / 3_600_000
  const d    = ms / 86_400_000
  if (h < 1)  return { label: 'just now', color: 'var(--text-muted)', stale: false }
  if (h < 24) return { label: `${Math.floor(h)}h ago`,  color: 'var(--text-muted)', stale: false }
  if (d < 7)  return { label: `${Math.floor(d)}d ago`,  color: 'var(--success)',    stale: false }
  if (d < 30) return { label: `${Math.floor(d)}d ago`,  color: 'var(--warning)',    stale: false }
  if (d < 90) return { label: `${Math.floor(d)}d ago`,  color: 'var(--error)',      stale: false }
  return       { label: `${Math.floor(d)}d ago`,  color: 'var(--error)',      stale: true  }
}

const STATUS_COLORS: Record<Credential['status'], string> = {
  active:  'var(--success)',
  rotated: 'var(--warning)',
  invalid: 'var(--text-muted)',
}

interface Props {
  cred:          Credential
  searchQuery?:  string
  breached?:     boolean
  onEdit:        (c: Credential) => void
  onDelete:      (id: string) => void
  onRotate?:     (id: string) => void
}

export default function CredentialRow({ cred, searchQuery = '', breached, onEdit, onDelete, onRotate }: Props) {
  const clipboardClearMs = useStore(s => s.clipboardClearMs)
  const [expanded, setExpanded]     = useState(false)
  const [copyMsg, setCopyMsg]       = useState<string | null>(null)
  const [countdown, setCountdown]   = useState(0)
  const [showPw, setShowPw]         = useState(false)
  const [rowHovered, setRowHovered] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) { setCopyMsg(null); return 0 }
      return c - 1
    }), 1000)
    return () => clearInterval(t)
  }, [countdown])

  async function copyValue(text: string, label: string, secure = false) {
    const clearMs = secure && clipboardClearMs > 0 ? clipboardClearMs : 0
    await window.electronAPI.copySecure(text, clearMs)
    await window.electronAPI.recordUsage(cred.id)
    setCopyMsg(label)
    if (secure && clearMs > 0) {
      setCountdown(Math.round(clearMs / 1000))
    } else {
      setTimeout(() => setCopyMsg(null), 1500)
    }
  }

  async function handleExpand() {
    const next = !expanded
    setExpanded(next)
    if (next) await window.electronAPI.recordUsage(cred.id)
  }

  const hasSecret = cred.password || cred.hash
  const age       = credAge(cred.createdAt)
  const isNote    = cred.type === 'note'

  return (
    <>
      <tr
        onClick={handleExpand}
        onMouseEnter={() => setRowHovered(true)}
        onMouseLeave={() => setRowHovered(false)}
        style={{
          cursor: 'pointer',
          background: expanded ? 'rgba(247,129,102,0.04)' : undefined,
          transition: 'background 0.15s',
        }}
        className="hover:bg-accent-dim"
      >
        {/* Service */}
        <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <HighlightText text={cred.service} query={searchQuery} />
            {cred.category && <CategoryPill cat={cred.category} />}
            {breached && (
              <span title="Found in HIBP breach database" style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 6,
                border: '1px solid rgba(248,81,73,0.4)', background: 'rgba(248,81,73,0.12)',
                color: '#f85149', fontWeight: 600,
              }}>
                BREACH
              </span>
            )}
            {isNote && (
              <span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 6,
                border: '1px solid rgba(161,139,250,0.4)', background: 'rgba(161,139,250,0.12)',
                color: '#a78bfa', fontWeight: 600,
              }}>
                NOTE
              </span>
            )}
          </div>
        </td>

        {/* Username */}
        <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HighlightText text={cred.username} query={searchQuery} />
            {rowHovered && (
              <button
                onClick={e => { e.stopPropagation(); copyValue(cred.username, 'Username') }}
                style={{ padding: '1px 5px', fontSize: 10, borderRadius: 3, background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                copy
              </button>
            )}
          </div>
        </td>

        {/* IP / Port */}
        <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-muted)' }}>
          {cred.ip ? `${cred.ip}${cred.port ? ':' + cred.port : ''}` : '—'}
        </td>

        {/* Tags */}
        <td style={{ padding: '9px 14px' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {cred.tags.slice(0, 3).map(t => <span key={t} className="tag-chip">{t}</span>)}
            {cred.tags.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{cred.tags.length - 3}</span>}
          </div>
        </td>

        {/* Source */}
        <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-muted)' }}>{cred.source}</td>

        {/* Date */}
        <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-muted)' }}>
          {new Date(cred.createdAt).toLocaleDateString()}
        </td>

        {/* Status */}
        <td style={{ padding: '9px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: STATUS_COLORS[cred.status] }}>{cred.status}</span>
            {cred.verified && <span style={{ fontSize: 10, color: 'var(--success)' }}>✓</span>}
            {cred.expiresAt && <ExpiryBadge expiresAt={cred.expiresAt} />}
          </div>
        </td>

        {/* Age */}
        <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 10, color: age.color }}>{age.label}</span>
          {age.stale && (
            <span style={{ display: 'inline-block', marginLeft: 4, fontSize: 9, color: 'var(--error)', opacity: 0.8, border: '1px solid var(--error)', borderRadius: 3, padding: '0 3px', lineHeight: '14px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              stale
            </span>
          )}
        </td>
      </tr>

      {/* Expanded detail row */}
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={8} style={{ padding: 0 }}>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  background: 'var(--panel)', border: '1px solid var(--border)', borderTop: 'none',
                  padding: '14px 16px',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12,
                }}>
                  <Field label="Username">
                    <CopyField value={cred.username} onCopy={() => copyValue(cred.username, 'Username')} />
                  </Field>

                  {cred.password && (
                    <Field label="Password">
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, flex: 1 }}>
                          {showPw ? cred.password : '••••••••'}
                        </span>
                        <button className="btn btn-ghost" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => setShowPw(s => !s)}>
                          {showPw ? 'Hide' : 'Show'}
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => copyValue(cred.password!, 'Password', true)}>
                          Copy
                        </button>
                      </div>
                    </Field>
                  )}

                  {cred.hash && (
                    <Field label={`Hash${cred.hashType ? ` (${cred.hashType.toUpperCase()})` : ''}`}>
                      <CopyField value={cred.hash} truncate onCopy={() => copyValue(cred.hash!, 'Hash')} mono />
                    </Field>
                  )}

                  {cred.totpSecret && (
                    <Field label="TOTP">
                      <TotpCode secret={cred.totpSecret} />
                    </Field>
                  )}

                  {cred.ip && (
                    <Field label="IP / Port">
                      <CopyField value={cred.ip + (cred.port ? ':' + cred.port : '')} onCopy={() => copyValue(cred.ip!, 'IP')} />
                    </Field>
                  )}

                  {cred.protocol  && <Field label="Protocol">{cred.protocol}</Field>}
                  {cred.labName   && <Field label="Lab">{cred.labName}</Field>}
                  {cred.targetName && <Field label="Target">{cred.targetName}</Field>}
                  {cred.folder    && <Field label="Folder">{cred.folder}</Field>}
                  {cred.expiresAt && (
                    <Field label="Expires">
                      <span style={{ fontSize: 12 }}>{new Date(cred.expiresAt).toLocaleDateString()}</span>
                    </Field>
                  )}
                  {cred.lastUsed && (
                    <Field label="Last Used">
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        {new Date(cred.lastUsed).toLocaleString()} ({cred.useCount ?? 1}x)
                      </span>
                    </Field>
                  )}

                  {cred.notes && (
                    <Field label={cred.type === 'note' ? 'Content' : 'Notes'} wide>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>{cred.notes}</span>
                    </Field>
                  )}

                  {/* Copy feedback + clipboard countdown */}
                  {copyMsg && (
                    <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--success)' }}>
                      {copyMsg} copied{hasSecret && countdown > 0 ? ` — clipboard clears in ${countdown}s` : ''}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => onEdit(cred)}>
                      Edit
                    </button>
                    <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => onDelete(cred.id)}>
                      Delete
                    </button>
                    {cred.status !== 'rotated' && onRotate && (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: '4px 10px', borderColor: 'rgba(210,153,34,0.35)', color: 'var(--warning)' }}
                        onClick={() => onRotate(cred.id)}
                        title="Mark this credential as rotated (no longer active)"
                      >
                        Mark Rotated
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div>{children}</div>
    </div>
  )
}

function CopyField({ value, onCopy, truncate, mono }: { value: string; onCopy: () => void; truncate?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={{ fontFamily: mono ? 'monospace' : undefined, fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: truncate ? 'ellipsis' : undefined, whiteSpace: 'nowrap', color: 'var(--text)' }}>
        {value}
      </span>
      <button className="btn btn-ghost" style={{ padding: '2px 7px', fontSize: 11, flexShrink: 0 }} onClick={onCopy}>
        Copy
      </button>
    </div>
  )
}
