import { useState, FormEvent, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Credential, CredentialCategory, CredentialType } from '@shared/types'
import { scorePassword } from '../utils/passwordStrength'

// ─── Password generator ───────────────────────────────────────────────────────

interface GenOptions {
  length:    number
  upper:     boolean
  lower:     boolean
  numbers:   boolean
  symbols:   boolean
  noAmbig:   boolean
}

function generatePassword(opts: GenOptions): string {
  let chars = ''
  if (opts.upper)   chars += opts.noAmbig ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (opts.lower)   chars += opts.noAmbig ? 'abcdefghjkmnpqrstuvwxyz'  : 'abcdefghijklmnopqrstuvwxyz'
  if (opts.numbers) chars += opts.noAmbig ? '23456789' : '0123456789'
  if (opts.symbols) chars += '!@#$%^&*()-_=+'
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz'
  const arr = new Uint8Array(opts.length)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => chars[b % chars.length]).join('')
}

// ─── Strength bar ─────────────────────────────────────────────────────────────

function StrengthBar({ password }: { password: string }) {
  if (!password) return null
  const s = scorePassword(password)
  const SEG_COLORS = ['#f85149', '#d29922', '#4a9eff', '#3fb950']
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: s.level >= i ? SEG_COLORS[i - 1] : 'var(--border)',
              transition: 'background 0.25s',
            }}
          />
        ))}
      </div>
      {s.label && (
        <span style={{ fontSize: 10, color: s.color, marginTop: 3, display: 'block' }}>
          {s.label}
        </span>
      )}
    </div>
  )
}

// ─── Tag chip input ───────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')

  function addTag(raw: string) {
    const t = raw.trim().replace(/,/g, '')
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === ',' || e.key === 'Enter') { e.preventDefault(); addTag(input) }
    if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
      border: '1px solid var(--border)', borderRadius: 5, padding: '4px 8px',
      background: 'var(--input-bg, rgba(0,0,0,0.3))', minHeight: 34,
    }}>
      {tags.map(t => (
        <span key={t} style={{
          display: 'flex', alignItems: 'center', gap: 3,
          fontSize: 11, padding: '1px 7px', borderRadius: 10,
          background: 'rgba(247,129,102,0.12)', border: '1px solid rgba(247,129,102,0.3)',
          color: '#f78166',
        }}>
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1, fontSize: 12 }}>
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length ? '' : 'Add tags…'}
        style={{ flex: 1, minWidth: 60, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)', padding: 0 }}
      />
    </div>
  )
}

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

const CATEGORIES: CredentialCategory[] = ['SSH', 'API Key', 'Web', 'Database', 'Certificate', 'Token', 'Other']
const SERVICE_OPTS  = ['Web Panel', 'SSH', 'FTP', 'Windows Login', 'SMB', 'Database', 'RDP', 'VPN', 'API', 'Other']
const HASH_TYPES    = ['ntlm', 'sha256', 'md5', 'bcrypt', 'sha1', 'lm', 'other']
const SOURCE_OPTS   = ['Manual', 'ReconDesk import', 'CyberLab session']
const STATUS_OPTS: Credential['status'][] = ['active', 'rotated', 'invalid']

// ─── Self-hosted service templates ────────────────────────────────────────────

interface ServiceTemplate {
  label:    string
  service:  string
  username: string
  category: CredentialCategory
  tags:     string[]
  notes:    string
}

const SERVICE_TEMPLATES: ServiceTemplate[] = [
  { label: 'Gitea',         service: 'Web Panel', username: 'admin', category: 'Web',      tags: ['self-hosted', 'git'],          notes: 'Gitea admin — also fill in URL and API token' },
  { label: 'Nextcloud',     service: 'Web Panel', username: 'admin', category: 'Web',      tags: ['self-hosted', 'cloud'],        notes: 'Nextcloud admin panel' },
  { label: 'Vaultwarden',   service: 'Web Panel', username: 'admin', category: 'Web',      tags: ['self-hosted', 'vault'],        notes: 'Vaultwarden bitwarden-compatible server' },
  { label: 'Grafana',       service: 'Web Panel', username: 'admin', category: 'Web',      tags: ['self-hosted', 'monitoring'],   notes: 'Grafana dashboard — default user: admin' },
  { label: 'Portainer',     service: 'Web Panel', username: 'admin', category: 'Web',      tags: ['self-hosted', 'docker'],       notes: 'Portainer Docker management UI' },
  { label: 'Jellyfin',      service: 'Web Panel', username: 'admin', category: 'Web',      tags: ['self-hosted', 'media'],        notes: 'Jellyfin media server admin' },
  { label: 'Home Assistant',service: 'Web Panel', username: 'admin', category: 'Token',    tags: ['self-hosted', 'automation'],   notes: 'Home Assistant — store long-lived token in password field' },
  { label: 'Pi-hole',       service: 'Web Panel', username: 'admin', category: 'Web',      tags: ['self-hosted', 'dns'],          notes: 'Pi-hole admin panel — web password in password field' },
  { label: 'Proxmox',       service: 'Web Panel', username: 'root',  category: 'Web',      tags: ['self-hosted', 'hypervisor'],   notes: 'Proxmox VE — realm: pam' },
  { label: 'Traefik',       service: 'Web Panel', username: 'admin', category: 'Web',      tags: ['self-hosted', 'proxy'],        notes: 'Traefik dashboard — basic auth credentials' },
  { label: 'Authentik',     service: 'Web Panel', username: 'akadmin', category: 'Web',    tags: ['self-hosted', 'auth'],         notes: 'Authentik SSO — default superuser' },
  { label: 'MinIO',         service: 'API',       username: 'minioadmin', category: 'API Key', tags: ['self-hosted', 's3'],       notes: 'MinIO — access key in username, secret key in password' },
]

interface Props {
  initial?: Partial<Credential>
  onSave:  (data: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>) => void
  onClose: () => void
}

function parsePort(v: string): number | undefined {
  const n = parseInt(v, 10)
  return isNaN(n) ? undefined : n
}

export default function CredentialModal({ initial, onSave, onClose }: Props) {
  const credType    = (initial?.type ?? 'credential') as CredentialType

  const [type, setType]           = useState<CredentialType>(credType)
  const [username, setUsername]   = useState(initial?.username ?? '')
  const [password, setPassword]   = useState(initial?.password ?? '')
  const [hash, setHash]           = useState(initial?.hash ?? '')
  const [hashType, setHashType]   = useState(initial?.hashType ?? '')
  const [service, setService]     = useState(initial?.service ?? 'Web Panel')
  const [ip, setIp]               = useState(initial?.ip ?? '')
  const [port, setPort]           = useState(initial?.port?.toString() ?? '')
  const [protocol, setProtocol]   = useState(initial?.protocol ?? '')
  const [source, setSource]       = useState(initial?.source ?? 'Manual')
  const [labName, setLabName]     = useState(initial?.labName ?? '')
  const [targetName, setTargetName] = useState(initial?.targetName ?? '')
  const [tags, setTags]           = useState<string[]>(initial?.tags ?? [])
  const [notes, setNotes]         = useState(initial?.notes ?? '')
  const [verified, setVerified]   = useState(initial?.verified ?? false)
  const [status, setStatus]       = useState<Credential['status']>(initial?.status ?? 'active')
  const [category, setCategory]   = useState<CredentialCategory | ''>(initial?.category ?? '')
  const [folder, setFolder]       = useState(initial?.folder ?? '')
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt ? initial.expiresAt.slice(0, 10) : '')
  const [totpSecret, setTotpSecret] = useState(initial?.totpSecret ?? '')
  const [showPw, setShowPw]         = useState(false)
  const [showGen, setShowGen]       = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [error, setError]           = useState('')

  // Password generator state
  const [genLen, setGenLen]       = useState(20)
  const [genUpper, setGenUpper]   = useState(true)
  const [genLower, setGenLower]   = useState(true)
  const [genNumbers, setGenNumbers] = useState(true)
  const [genSymbols, setGenSymbols] = useState(true)
  const [genNoAmbig, setGenNoAmbig] = useState(false)

  function applyGenerated() {
    const pw = generatePassword({ length: genLen, upper: genUpper, lower: genLower, numbers: genNumbers, symbols: genSymbols, noAmbig: genNoAmbig })
    setPassword(pw)
  }

  function applyTemplate(tpl: ServiceTemplate) {
    setService(tpl.service)
    setUsername(tpl.username)
    setCategory(tpl.category)
    setTags(tpl.tags)
    setNotes(tpl.notes)
    setShowTemplates(false)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (type === 'credential' && !username.trim()) { setError('Username is required'); return }
    if (!service.trim())                           { setError('Service/title is required'); return }

    const tagArr = tags
    onSave({
      type,
      username:   username.trim() || '—',
      password:   type === 'credential' ? (password || undefined) : undefined,
      hash:       type === 'credential' ? (hash || undefined)     : undefined,
      hashType:   type === 'credential' ? (hashType || undefined) : undefined,
      service:    service.trim(),
      ip:         ip || undefined,
      port:       parsePort(port),
      protocol:   protocol || undefined,
      source:     source.trim(),
      labName:    labName || undefined,
      targetName: targetName || undefined,
      tags:       tagArr,
      notes:      notes || undefined,
      verified,
      status,
      category:   category || undefined,
      folder:     folder || undefined,
      expiresAt:  expiresAt ? new Date(expiresAt).toISOString() : undefined,
      totpSecret: totpSecret || undefined,
    })
  }

  // improvement #7: framer-motion animated modal entry
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(7,8,15,0.8)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        style={{
          background: 'rgba(13,14,24,0.95)',
          border: '1px solid rgba(247,129,102,0.12)',
          borderRadius: 12,
          width: 540,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(247,129,102,0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {initial ? 'Edit' : 'Add'} {type === 'note' ? 'Secure Note' : 'Credential'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {!initial && type === 'credential' && (
              <button
                type="button"
                onClick={() => setShowTemplates(s => !s)}
                style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 4,
                  border: `1px solid ${showTemplates ? 'var(--accent)' : 'var(--border)'}`,
                  background: showTemplates ? 'var(--accent-dim)' : 'transparent',
                  color: showTemplates ? 'var(--accent)' : 'var(--text-dim)', cursor: 'pointer',
                }}
                title="Pre-fill from a self-hosted service template"
              >
                From Template
              </button>
            )}
            <button
              type="button"
              onClick={() => setType(t => t === 'note' ? 'credential' : 'note')}
              style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 4,
                border: '1px solid var(--border)', background: 'transparent',
                color: type === 'note' ? '#f78166' : 'var(--text-dim)', cursor: 'pointer',
              }}
              title="Toggle credential / secure note"
            >
              {type === 'note' ? 'Note' : 'Credential'}
            </button>
            <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>

        {/* Template picker */}
        {showTemplates && (
          <div style={{
            border: '1px solid var(--accent-border)', borderRadius: 6,
            background: 'rgba(247,129,102,0.04)', padding: '10px 12px',
            display: 'flex', flexWrap: 'wrap', gap: 6,
          }}>
            {SERVICE_TEMPLATES.map(tpl => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => applyTemplate(tpl)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-dim)', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = '#f78166'; (e.target as HTMLButtonElement).style.color = '#f78166' }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.target as HTMLButtonElement).style.color = 'var(--text-dim)' }}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Category + Folder row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Row label="Category">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(category === cat ? '' : cat)}
                    style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10,
                      border: `1px solid ${category === cat ? CATEGORY_COLORS[cat] : 'var(--border)'}`,
                      background: category === cat ? `${CATEGORY_COLORS[cat]}20` : 'transparent',
                      color: category === cat ? CATEGORY_COLORS[cat] : 'var(--text-muted)',
                      cursor: 'pointer', fontWeight: category === cat ? 600 : 400,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Folder">
              <input value={folder} onChange={e => setFolder(e.target.value)} placeholder="e.g. HTB / Work" />
            </Row>
          </div>

          {/* Identity */}
          <SectionLabel>Identity</SectionLabel>

          {type === 'credential' ? (
            <>
              <Row label="Username *">
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoFocus />
              </Row>

              {/* Password with strength meter + generator */}
              <Row label="Password">
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Cleartext password"
                      style={{ width: '100%', paddingRight: 44 }}
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPw(s => !s)}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 10, color: 'var(--text-muted)',
                      }}
                    >
                      {showPw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <button type="button" className="btn btn-ghost"
                    style={{ fontSize: 11, padding: '4px 9px', flexShrink: 0 }}
                    onClick={() => setShowGen(s => !s)}
                    title="Toggle password generator"
                  >
                    Gen
                  </button>
                </div>
                <StrengthBar password={password} />
              </Row>

              {/* Inline generator panel */}
              {showGen && (
                <div style={{
                  border: '1px solid var(--border)', borderRadius: 6,
                  padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
                  background: 'rgba(0,0,0,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', minWidth: 50 }}>Length: {genLen}</span>
                    <input type="range" min={8} max={64} value={genLen} onChange={e => setGenLen(+e.target.value)} style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {([
                      ['A-Z', genUpper,   setGenUpper],
                      ['a-z', genLower,   setGenLower],
                      ['0-9', genNumbers, setGenNumbers],
                      ['!@#', genSymbols, setGenSymbols],
                      ['No ambig', genNoAmbig, setGenNoAmbig],
                    ] as [string, boolean, (v: boolean) => void][]).map(([label, val, setter]) => (
                      <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} style={{ width: 12, height: 12 }} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <button type="button" className="btn btn-accent"
                    style={{ alignSelf: 'flex-start', fontSize: 11, padding: '5px 12px' }}
                    onClick={applyGenerated}
                  >
                    Generate &amp; Fill
                  </button>
                </div>
              )}

              <Row label="Hash">
                <input value={hash} onChange={e => setHash(e.target.value)} placeholder="NTLM / SHA256 / MD5…" style={{ fontFamily: 'monospace', fontSize: 12 }} />
              </Row>
              <Row label="Hash Type">
                <select value={hashType} onChange={e => setHashType(e.target.value)}>
                  <option value="">— none —</option>
                  {HASH_TYPES.map(h => <option key={h} value={h}>{h.toUpperCase()}</option>)}
                </select>
              </Row>

              <Row label="TOTP Secret">
                <input
                  value={totpSecret}
                  onChange={e => setTotpSecret(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="Base32 TOTP secret (optional)"
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </Row>
            </>
          ) : (
            <Row label="Title *">
              <input value={service} onChange={e => setService(e.target.value)} placeholder="Note title" autoFocus />
            </Row>
          )}

          {/* Context — only for credentials */}
          {type === 'credential' && (
            <>
              <SectionLabel>Context</SectionLabel>
              <Row label="Service *">
                <select value={service} onChange={e => setService(e.target.value)}>
                  {SERVICE_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Row>
              <Row label="URL">
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#484f58', display: 'flex', alignItems: 'center' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </span>
                  <input
                    value={notes.startsWith('http') ? notes.split('\n')[0] : ''}
                    onChange={e => {
                      const url = e.target.value
                      const rest = notes.split('\n').slice(1).join('\n')
                      setNotes(url ? (rest ? url + '\n' + rest : url) : rest)
                    }}
                    placeholder="https://..."
                    style={{ paddingLeft: 28 }}
                  />
                </div>
              </Row>
              <div style={{
                margin: '2px 0',
                padding: '10px 12px',
                borderRadius: 6,
                background: 'rgba(42,51,71,0.12)',
                border: '1px solid rgba(42,51,71,0.3)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Network
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Row label="IP">
                    <input value={ip} onChange={e => setIp(e.target.value)} placeholder="10.10.10.1" />
                  </Row>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Row label="Port">
                      <input type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="80" min={1} max={65535} />
                    </Row>
                    <Row label="Protocol">
                      <input value={protocol} onChange={e => setProtocol(e.target.value)} placeholder="tcp" />
                    </Row>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Origin */}
          <SectionLabel>Origin</SectionLabel>
          <Row label="Source">
            <select value={source} onChange={e => setSource(e.target.value)}>
              {SOURCE_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Row>
          {type === 'credential' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Row label="Lab Name">
                <input value={labName} onChange={e => setLabName(e.target.value)} placeholder="Pickle Rick" />
              </Row>
              <Row label="Target Name">
                <input value={targetName} onChange={e => setTargetName(e.target.value)} placeholder="Web server" />
              </Row>
            </div>
          )}

          {/* Metadata */}
          <SectionLabel>Metadata</SectionLabel>
          <Row label="Tags">
            <TagInput tags={tags} onChange={setTags} />
          </Row>
          <Row label="Notes">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={type === 'note' ? 'Secure note content (encrypted at rest)…' : 'Additional context…'}
              style={{ resize: 'vertical', minHeight: type === 'note' ? 100 : 56 }}
            />
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
            <Row label="Status">
              <select value={status} onChange={e => setStatus(e.target.value as Credential['status'])}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Row>
            <Row label="Expires">
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </Row>
          </div>
          {type === 'credential' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="verified-cb"
                checked={verified}
                onChange={e => setVerified(e.target.checked)}
                style={{ width: 14, height: 14, cursor: 'pointer' }}
              />
              <label htmlFor="verified-cb" style={{ fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer' }}>
                Verified (successfully used)
              </label>
            </div>
          )}

          {error && <div style={{ fontSize: 12, color: 'var(--error)' }}>{error}</div>}

          <button type="submit" className="btn btn-accent" style={{ alignSelf: 'flex-end', marginTop: 4, borderRadius: 8, padding: '7px 16px', fontSize: 13 }}>
            {initial ? 'Save Changes' : type === 'note' ? 'Add Note' : 'Add Credential'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--text-muted)',
      paddingTop: 4, borderTop: '1px solid var(--border)',
    }}>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</label>
      {children}
    </div>
  )
}
