import { useState, useMemo, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Credential, CredentialCategory, CredentialType } from '@shared/types'
import {
  StrengthBar, TagInput, PasswordGeneratorPanel, TemplatesPicker,
  CATEGORY_COLORS, CATEGORIES, SERVICE_OPTS, HASH_TYPES, SOURCE_OPTS,
  ValidationIcon, ValidatedInput, SectionLabel, Row,
  type ServiceTemplate,
} from './CredentialModalParts'

const STATUS_OPTS: Credential['status'][] = ['active', 'rotated', 'invalid']

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
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // pass 5: tabbed detail — Details / History / Notes
  type ModalTab = 'details' | 'history' | 'notes'
  const [activeTab, setActiveTab] = useState<ModalTab>('details')
  const [extraNotes, setExtraNotes] = useState(initial?.notes ?? '')

  // Mock access log for History tab
  const mockHistory = useMemo(() => {
    if (!initial) return []
    const now = Date.now()
    return [
      { time: now - 3_600_000 * 2,   action: 'Password copied' },
      { time: now - 86_400_000,       action: 'Credential viewed' },
      { time: now - 86_400_000 * 3,   action: 'Password copied' },
      { time: now - 86_400_000 * 7,   action: 'Credential edited' },
      { time: now - 86_400_000 * 14,  action: 'Credential created' },
    ]
  }, [initial])

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
    setSubmitAttempted(true)
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

        {/* pass 5: tab bar — Details / History / Notes */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid rgba(42,51,71,0.4)', paddingBottom: 0, marginBottom: -8 }}>
          {(['details', 'history', 'notes'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: 12, padding: '6px 14px', borderRadius: '6px 6px 0 0',
                border: 'none', cursor: 'pointer', fontWeight: activeTab === tab ? 600 : 400,
                background: activeTab === tab ? 'rgba(247,129,102,0.1)' : 'transparent',
                color: activeTab === tab ? '#f78166' : '#8b949e',
                borderBottom: activeTab === tab ? '2px solid #f78166' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s, background 0.15s',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'history' && initial && (
                <span style={{ marginLeft: 5, fontSize: 9, background: 'rgba(247,129,102,0.15)', color: '#f78166', borderRadius: 8, padding: '1px 5px' }}>5</span>
              )}
            </button>
          ))}
        </div>

        {/* History tab */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
            {!initial ? (
              <div style={{ fontSize: 12, color: '#484f58', textAlign: 'center', padding: '24px 0' }}>No history yet — save first</div>
            ) : mockHistory.map((entry, i) => {
              const d = new Date(entry.time)
              const daysAgo = Math.floor((Date.now() - entry.time) / 86_400_000)
              const label = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, background: 'rgba(42,51,71,0.12)', border: '1px solid rgba(42,51,71,0.2)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#484f58', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: '#c9d1d9' }}>{entry.action}</span>
                  <span style={{ fontSize: 10, color: '#484f58', fontFamily: 'JetBrains Mono, monospace' }}>
                    {label} · {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Notes tab */}
        {activeTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
            <label style={{ fontSize: 11, color: '#8b949e' }}>Secure Notes</label>
            <textarea
              value={extraNotes}
              onChange={e => setExtraNotes(e.target.value)}
              placeholder="Add secure notes for this credential…"
              style={{ resize: 'vertical', minHeight: 140 }}
            />
            <button
              type="button"
              className="btn btn-accent"
              style={{ alignSelf: 'flex-end', fontSize: 12, padding: '5px 14px' }}
              onClick={() => {
                setNotes(extraNotes)
                setActiveTab('details')
              }}
            >
              Save Notes
            </button>
          </div>
        )}

        {/* Details tab / Template picker / Form */}
        {activeTab === 'details' && (
          <>
        {/* Template picker */}
        {showTemplates && <TemplatesPicker onSelect={applyTemplate} />}

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
                <ValidatedInput
                  value={username}
                  onChange={setUsername}
                  placeholder="admin"
                  required
                  submitAttempted={submitAttempted}
                  autoFocus
                />
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
              {showGen && <PasswordGeneratorPanel onFill={setPassword} />}

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
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <select value={service} onChange={e => setService(e.target.value)} style={{ flex: 1 }}>
                    {SERVICE_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ValidationIcon valid={!!service.trim()} touched={submitAttempted} />
                </div>
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
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
