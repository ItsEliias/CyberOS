import { useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Credential } from '@shared/types'

/** Compute human-readable age and display colour from a createdAt ISO string */
function credAge(createdAt: string): { label: string; color: string; stale: boolean } {
  const now   = Date.now()
  const then  = new Date(createdAt).getTime()
  const ms    = now - then
  const hours = ms / 3_600_000
  const days  = ms / 86_400_000

  if (hours < 1)   return { label: 'just now', color: 'var(--text-muted)', stale: false }
  if (hours < 24)  return { label: `${Math.floor(hours)}h ago`, color: 'var(--text-muted)', stale: false }
  if (days < 7)    return { label: `${Math.floor(days)}d ago`, color: 'var(--success)', stale: false }
  if (days < 30)   return { label: `${Math.floor(days)}d ago`, color: 'var(--warning)', stale: false }
  if (days < 90)   return { label: `${Math.floor(days)}d ago`, color: 'var(--error)', stale: false }
  return             { label: `${Math.floor(days)}d ago`, color: 'var(--error)', stale: true }
}

interface Props {
  cred:     Credential
  onEdit:   (c: Credential) => void
  onDelete: (id: string) => void
}

const STATUS_COLORS: Record<Credential['status'], string> = {
  active:  'var(--success)',
  rotated: 'var(--warning)',
  invalid: 'var(--text-muted)',
}

export default function CredentialRow({ cred, onEdit, onDelete }: Props) {
  const [expanded, setExpanded]       = useState(false)
  const [copyMsg, setCopyMsg]         = useState<string | null>(null)
  const [countdown, setCountdown]     = useState(0)
  const [showPw, setShowPw]           = useState(false)

  // Clipboard countdown
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) { setCopyMsg(null); return 0 }
      return c - 1
    }), 1000)
    return () => clearInterval(t)
  }, [countdown])

  async function copyValue(text: string, label: string, secure = false) {
    await window.electronAPI.copySecure(text, secure ? 30_000 : 0)
    setCopyMsg(label)
    if (secure) {
      setCountdown(30)
    } else {
      setTimeout(() => setCopyMsg(null), 1500)
    }
  }

  const hasSecret = cred.password || cred.hash
  const age = credAge(cred.createdAt)

  return (
    <>
      {/* Main row */}
      <tr
        onClick={() => setExpanded(e => !e)}
        style={{
          cursor: 'pointer',
          background: expanded ? 'rgba(247,129,102,0.04)' : undefined,
          transition: 'background 0.15s'
        }}
        className="hover:bg-accent-dim"
      >
        <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text-dim)' }}>{cred.service}</td>
        <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}>
          {cred.username}
        </td>
        <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-muted)' }}>
          {cred.ip ? `${cred.ip}${cred.port ? ':' + cred.port : ''}` : '—'}
        </td>
        <td style={{ padding: '9px 14px' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {cred.tags.slice(0, 3).map(t => <span key={t} className="tag-chip">{t}</span>)}
            {cred.tags.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{cred.tags.length - 3}</span>}
          </div>
        </td>
        <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-muted)' }}>{cred.source}</td>
        <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-muted)' }}>
          {new Date(cred.createdAt).toLocaleDateString()}
        </td>
        <td style={{ padding: '9px 14px' }}>
          <span style={{ fontSize: 11, color: STATUS_COLORS[cred.status] }}>
            {cred.status}
          </span>
          {cred.verified && <span style={{ fontSize: 10, color: 'var(--success)', marginLeft: 5 }}>✓</span>}
        </td>
        {/* Age indicator */}
        <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 10, color: age.color }}>
            {age.label}
          </span>
          {age.stale && (
            <span style={{
              display: 'inline-block',
              marginLeft: 4,
              fontSize: 9,
              color: 'var(--error)',
              opacity: 0.8,
              border: '1px solid var(--error)',
              borderRadius: 3,
              padding: '0 3px',
              lineHeight: '14px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
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
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderTop: 'none',
                  padding: '14px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 12
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
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '2px 7px', fontSize: 11 }}
                          onClick={() => setShowPw(s => !s)}
                        >
                          {showPw ? 'Hide' : 'Show'}
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '2px 7px', fontSize: 11 }}
                          onClick={() => copyValue(cred.password!, 'Password', true)}
                        >
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

                  {cred.ip && (
                    <Field label="IP / Port">
                      <CopyField
                        value={cred.ip + (cred.port ? ':' + cred.port : '')}
                        onCopy={() => copyValue(cred.ip!, 'IP')}
                      />
                    </Field>
                  )}

                  {cred.protocol && <Field label="Protocol">{cred.protocol}</Field>}
                  {cred.labName  && <Field label="Lab">{cred.labName}</Field>}
                  {cred.targetName && <Field label="Target">{cred.targetName}</Field>}

                  {cred.notes && (
                    <Field label="Notes" wide>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>
                        {cred.notes}
                      </span>
                    </Field>
                  )}

                  {/* Copy feedback */}
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

function CopyField({
  value, onCopy, truncate, mono
}: { value: string; onCopy: () => void; truncate?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={{
        fontFamily: mono ? 'monospace' : undefined,
        fontSize: 12,
        flex: 1,
        overflow: 'hidden',
        textOverflow: truncate ? 'ellipsis' : undefined,
        whiteSpace: 'nowrap',
        color: 'var(--text)'
      }}>
        {value}
      </span>
      <button
        className="btn btn-ghost"
        style={{ padding: '2px 7px', fontSize: 11, flexShrink: 0 }}
        onClick={onCopy}
      >
        Copy
      </button>
    </div>
  )
}
