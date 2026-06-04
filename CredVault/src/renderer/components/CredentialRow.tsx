import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as OTPAuth from 'otpauth'
import type { Credential } from '@shared/types'
import { useStore } from '../store'
import { fuzzyMatch, highlightSegments } from '../utils/fuzzySearch'
import { playTotpExpiring } from '../utils/audioNotify'
import { CategoryPill, CredTypeIcon, PasswordStrengthBar, ExpiryBadge, Field, CopyField } from './ui/CredentialBits'

// ─── TOTP live code ───────────────────────────────────────────────────────────

const TOTP_PERIOD = 30

function TotpCode({ secret }: { secret: string }) {
  const [code, setCode]       = useState('')
  const [secLeft, setSecLeft] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const warnedRef   = useRef(false)

  useEffect(() => {
    function generate() {
      try {
        const totp  = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: TOTP_PERIOD })
        const token = totp.generate()
        const epoch = Math.floor(Date.now() / 1000)
        const left  = TOTP_PERIOD - (epoch % TOTP_PERIOD)
        setCode(token); setSecLeft(left)
        if (left === 5 && !warnedRef.current) { warnedRef.current = true; playTotpExpiring() }
        else if (left > 10) { warnedRef.current = false }
      } catch { setCode('ERROR') }
    }
    generate()
    intervalRef.current = setInterval(generate, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [secret])

  const frac      = secLeft / TOTP_PERIOD
  const circ      = 2 * Math.PI * 5
  const dashOff   = circ * (1 - frac)
  const ringColor = frac > 0.5 ? '#3fb950' : frac > 0.2 ? '#d29922' : '#f85149'

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

// ─── Highlight text ───────────────────────────────────────────────────────────

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
  const ms = Date.now() - new Date(createdAt).getTime()
  const h  = ms / 3_600_000
  const d  = ms / 86_400_000
  if (h < 1)  return { label: 'just now',             color: '#484f58', stale: false }
  if (h < 24) return { label: `${Math.floor(h)}h ago`, color: '#484f58', stale: false }
  if (d < 7)  return { label: `${Math.floor(d)}d ago`, color: '#3fb950', stale: false }
  if (d < 30) return { label: `${Math.floor(d)}d ago`, color: '#d29922', stale: false }
  if (d < 90) return { label: `${Math.floor(d)}d ago`, color: '#f85149', stale: false }
  return       { label: `${Math.floor(d)}d ago`,        color: '#f85149', stale: true  }
}

// ─── Breach shield icon ───────────────────────────────────────────────────────

type BreachStatus = 'clean' | 'breached' | 'unchecked'

function BreachShield({ status }: { status: BreachStatus }) {
  const color = status === 'clean' ? '#3fb950' : status === 'breached' ? '#f85149' : '#484f58'
  const title = status === 'clean' ? 'No breach found' : status === 'breached' ? 'Password found in breach database' : 'Not checked'
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        {status === 'clean' && <polyline points="9 12 11 14 15 10" />}
        {status === 'breached' && <><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></>}
      </svg>
    </span>
  )
}

// ─── Last-used badge ──────────────────────────────────────────────────────────

function lastUsedLabel(lastUsed?: string): string | null {
  if (!lastUsed) return null
  const ms = Date.now() - new Date(lastUsed).getTime()
  const d  = Math.floor(ms / 86_400_000)
  const h  = Math.floor(ms / 3_600_000)
  if (h < 1)  return 'used just now'
  if (h < 24) return `used ${h}h ago`
  return `used ${d}d ago`
}

// ─── Username cell with masking for long values ───────────────────────────────

const MAX_USERNAME_DISPLAY = 12

function UsernameCell({ username, searchQuery, rowHovered, onCopy }: {
  username: string; searchQuery: string; rowHovered: boolean; onCopy: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLong = username.length > MAX_USERNAME_DISPLAY
  const display = isLong && !expanded ? username.slice(0, MAX_USERNAME_DISPLAY) : username
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <HighlightText text={display} query={searchQuery} />
      {isLong && !expanded && (
        <button
          onClick={e => { e.stopPropagation(); setExpanded(true) }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 10, color: '#484f58', lineHeight: 1,
          }}
          title="Show full username"
        >
          …
        </button>
      )}
      {isLong && expanded && (
        <button
          onClick={e => { e.stopPropagation(); setExpanded(false) }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 10, color: '#484f58', lineHeight: 1,
          }}
          title="Collapse"
        >
          ‹
        </button>
      )}
      {rowHovered && (
        <button
          onClick={e => { e.stopPropagation(); onCopy() }}
          style={{ padding: '1px 5px', fontSize: 10, borderRadius: 3, background: 'rgba(13,14,24,0.9)', border: '1px solid rgba(42,51,71,0.6)', color: '#484f58', cursor: 'pointer' }}
        >
          copy
        </button>
      )}
    </div>
  )
}

const STATUS_COLORS: Record<Credential['status'], string> = {
  active:  '#3fb950',
  rotated: '#d29922',
  invalid: '#484f58',
}

interface Props {
  cred:         Credential
  searchQuery?: string
  breached?:    boolean
  breachCount?: number
  staggerIndex?: number
  colVis?:      Record<string, boolean>
  onEdit:       (c: Credential) => void
  onDelete:     (id: string) => void
  onRotate?:    (id: string) => void
  mockBreachStatus?: BreachStatus
}

export default function CredentialRow({ cred, searchQuery = '', breached, staggerIndex = 0, colVis, onEdit, onDelete, onRotate, mockBreachStatus }: Props) {
  // Derive a stable mock breach status for demo purposes (randomly assigned on mount)
  const derivedBreachStatus = useMemo<BreachStatus>(() => {
    if (mockBreachStatus) return mockBreachStatus
    if (breached) return 'breached'
    // Use credential id as deterministic seed for demo
    const seed = cred.id.charCodeAt(0) + cred.id.charCodeAt(cred.id.length - 1)
    if (seed % 7 === 0) return 'breached'
    if (seed % 3 === 0) return 'unchecked'
    return 'clean'
  }, [cred.id, breached, mockBreachStatus])
  const col = (key: string) => colVis == null || colVis[key] !== false
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
    if (secure && clearMs > 0) { setCountdown(Math.round(clearMs / 1000)) }
    else { setTimeout(() => setCopyMsg(null), 1500) }
  }

  async function handleExpand() {
    const next = !expanded
    setExpanded(next)
    if (next) await window.electronAPI.recordUsage(cred.id)
  }

  const hasSecret = cred.password || cred.hash
  const age       = credAge(cred.createdAt)
  const isNote    = cred.type === 'note'

  const rowBg = expanded
    ? 'rgba(247,129,102,0.05)'
    : rowHovered ? 'rgba(247,129,102,0.03)' : 'transparent'

  return (
    <>
      {/* improvement #4: cred-row class adds translateY lift on hover; pass 3: stagger entry */}
      <tr
        className="cred-row cred-row-stagger"
        onClick={handleExpand}
        onMouseEnter={() => setRowHovered(true)}
        onMouseLeave={() => setRowHovered(false)}
        style={{ cursor: 'pointer', background: rowBg, animationDelay: `${Math.min(staggerIndex, 12) * 40}ms` }}
      >
        {/* Service — always visible */}
        <td style={{ padding: '9px 14px', fontSize: 12, color: '#8b949e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <CredTypeIcon category={cred.category} />
            <span style={{ color: expanded ? '#e6edf3' : '#c9d1d9' }}>
              <HighlightText text={cred.service} query={searchQuery} />
            </span>
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
                border: '1px solid rgba(167,139,250,0.4)', background: 'rgba(167,139,250,0.12)',
                color: '#a78bfa', fontWeight: 600,
              }}>
                NOTE
              </span>
            )}
          </div>
        </td>

        {col('Category') && (
          <td style={{ padding: '9px 14px' }}>
            {cred.category ? (
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 8,
                border: `1px solid ${CATEGORY_COLORS[cred.category]}40`,
                background: `${CATEGORY_COLORS[cred.category]}14`,
                color: CATEGORY_COLORS[cred.category],
                letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>
                {cred.category}
              </span>
            ) : (
              <span style={{ color: '#484f58', fontSize: 11 }}>—</span>
            )}
          </td>
        )}

        {col('Username') && (
          <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#c9d1d9' }}>
            <UsernameCell username={cred.username} searchQuery={searchQuery} rowHovered={rowHovered} onCopy={() => copyValue(cred.username, 'Username')} />
            {lastUsedLabel(cred.lastUsed) && (
              <div style={{ fontSize: 9, color: '#484f58', marginTop: 2, fontFamily: 'inherit', letterSpacing: '0.02em' }}>
                {lastUsedLabel(cred.lastUsed)}
              </div>
            )}
          </td>
        )}

        {col('IP / Port') && (
          <td style={{ padding: '9px 14px', fontSize: 11, color: '#484f58', fontFamily: 'JetBrains Mono, monospace' }}>
            {cred.ip ? `${cred.ip}${cred.port ? ':' + cred.port : ''}` : '—'}
          </td>
        )}

        {col('Tags') && (
          <td style={{ padding: '9px 14px' }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {cred.tags.slice(0, 3).map(t => <span key={t} className="tag-chip">{t}</span>)}
              {cred.tags.length > 3 && <span style={{ fontSize: 10, color: '#484f58' }}>+{cred.tags.length - 3}</span>}
            </div>
          </td>
        )}

        {col('Source') && (
          <td style={{ padding: '9px 14px', fontSize: 11, color: '#484f58' }}>{cred.source}</td>
        )}

        {col('Date') && (
          <td style={{ padding: '9px 14px', fontSize: 11, color: '#484f58', fontFamily: 'JetBrains Mono, monospace' }}>
            {new Date(cred.createdAt).toLocaleDateString()}
          </td>
        )}

        {col('Status') && (
          <td style={{ padding: '9px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[cred.status], flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: STATUS_COLORS[cred.status] }}>{cred.status}</span>
              {cred.verified && <span style={{ fontSize: 10, color: '#3fb950' }}>✓</span>}
              {cred.expiresAt && <ExpiryBadge expiresAt={cred.expiresAt} />}
            </div>
          </td>
        )}

        {col('Age') && (
          <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 10, color: age.color, fontFamily: 'JetBrains Mono, monospace' }}>{age.label}</span>
            {age.stale && (
              <span style={{ display: 'inline-block', marginLeft: 4, fontSize: 9, color: '#f85149', opacity: 0.8, border: '1px solid rgba(248,81,73,0.4)', borderRadius: 3, padding: '0 3px', lineHeight: '14px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                stale
              </span>
            )}
          </td>
        )}

        {col('Breach') && (
          <td style={{ padding: '9px 14px', textAlign: 'center' }}>
            <BreachShield status={derivedBreachStatus} />
          </td>
        )}
      </tr>

      {/* Expanded detail row */}
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={colVis ? Object.values(colVis).filter(Boolean).length + 1 : 9} style={{ padding: 0 }}>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  background: 'rgba(13,14,24,0.8)',
                  borderTop: '1px solid rgba(247,129,102,0.12)',
                  borderBottom: '1px solid rgba(42,51,71,0.4)',
                  padding: '14px 16px',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12,
                }}>
                  <Field label="Username">
                    <CopyField value={cred.username} onCopy={() => copyValue(cred.username, 'Username')} />
                  </Field>

                  {cred.password && (
                    <Field label="Password">
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, flex: 1 }}>
                          {showPw ? cred.password : '••••••••'}
                        </span>
                        <button className="btn btn-ghost" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => setShowPw(s => !s)}>
                          {showPw ? 'Hide' : 'Show'}
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => copyValue(cred.password!, 'Password', true)}>
                          Copy
                        </button>
                      </div>
                      <PasswordStrengthBar password={cred.password} />
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

                  {cred.protocol   && <Field label="Protocol">{cred.protocol}</Field>}
                  {cred.labName    && <Field label="Lab">{cred.labName}</Field>}
                  {cred.targetName && <Field label="Target">{cred.targetName}</Field>}
                  {cred.folder     && <Field label="Folder">{cred.folder}</Field>}
                  {cred.expiresAt  && (
                    <Field label="Expires">
                      <span style={{ fontSize: 12 }}>{new Date(cred.expiresAt).toLocaleDateString()}</span>
                    </Field>
                  )}
                  {cred.lastUsed && (
                    <Field label="Last Used">
                      <span style={{ fontSize: 12, color: '#8b949e' }}>
                        {new Date(cred.lastUsed).toLocaleString()} ({cred.useCount ?? 1}x)
                      </span>
                    </Field>
                  )}
                  {cred.notes && (
                    <Field label={cred.type === 'note' ? 'Content' : 'Notes'} wide>
                      <span style={{ fontSize: 12, color: '#8b949e', whiteSpace: 'pre-wrap' }}>{cred.notes}</span>
                    </Field>
                  )}

                  {/* improvement #10: animated copy toast */}
                  <AnimatePresence>
                    {copyMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="copy-toast"
                        style={{
                          gridColumn: '1 / -1', fontSize: 11,
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '5px 10px', borderRadius: 6,
                          background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.2)',
                          color: '#3fb950',
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        {copyMsg} copied{hasSecret && countdown > 0 ? ` — clipboard clears in ${countdown}s` : ''}
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                        style={{ fontSize: 11, padding: '4px 10px', borderColor: 'rgba(210,153,34,0.35)', color: '#d29922' }}
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

// Field and CopyField are imported from ./ui/CredentialBits
