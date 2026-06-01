import { useState, FormEvent, type ReactNode } from 'react'
import type { Credential } from '@shared/types'

const SERVICE_OPTS = ['Web Panel', 'SSH', 'FTP', 'Windows Login', 'SMB', 'Database', 'RDP', 'VPN', 'API', 'Other']
const HASH_TYPES   = ['ntlm', 'sha256', 'md5', 'bcrypt', 'sha1', 'lm', 'other']
const SOURCE_OPTS  = ['Manual', 'ReconDesk import', 'CyberLab session']
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
  const [tags, setTags]           = useState(initial?.tags?.join(', ') ?? '')
  const [notes, setNotes]         = useState(initial?.notes ?? '')
  const [verified, setVerified]   = useState(initial?.verified ?? false)
  const [status, setStatus]       = useState<Credential['status']>(initial?.status ?? 'active')
  const [error, setError]         = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim()) { setError('Username is required'); return }
    if (!service.trim())  { setError('Service is required'); return }

    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
    onSave({
      username: username.trim(),
      password: password || undefined,
      hash:     hash || undefined,
      hashType: hashType || undefined,
      service:  service.trim(),
      ip:       ip || undefined,
      port:     parsePort(port),
      protocol: protocol || undefined,
      source:   source.trim(),
      labName:  labName || undefined,
      targetName: targetName || undefined,
      tags:     tagArr,
      notes:    notes || undefined,
      verified,
      status,
    })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(14,17,23,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        width: 520,
        maxHeight: '88vh',
        overflowY: 'auto',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {initial ? 'Edit Credential' : 'Add Credential'}
          </span>
          <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={onClose}>
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Identity */}
          <SectionLabel>Identity</SectionLabel>
          <Row label="Username *">
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoFocus />
          </Row>
          <Row label="Password">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Cleartext password" />
          </Row>
          <Row label="Hash">
            <input value={hash} onChange={e => setHash(e.target.value)} placeholder="NTLM / SHA256 / MD5…" style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </Row>
          <Row label="Hash Type">
            <select value={hashType} onChange={e => setHashType(e.target.value)}>
              <option value="">— none —</option>
              {HASH_TYPES.map(h => <option key={h} value={h}>{h.toUpperCase()}</option>)}
            </select>
          </Row>

          {/* Context */}
          <SectionLabel>Context</SectionLabel>
          <Row label="Service *">
            <select value={service} onChange={e => setService(e.target.value)}>
              {SERVICE_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Row>
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

          {/* Origin */}
          <SectionLabel>Origin</SectionLabel>
          <Row label="Source">
            <select value={source} onChange={e => setSource(e.target.value)}>
              {SOURCE_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Row>
          <Row label="Lab Name">
            <input value={labName} onChange={e => setLabName(e.target.value)} placeholder="Pickle Rick" />
          </Row>
          <Row label="Target Name">
            <input value={targetName} onChange={e => setTargetName(e.target.value)} placeholder="Web server" />
          </Row>

          {/* Metadata */}
          <SectionLabel>Metadata</SectionLabel>
          <Row label="Tags">
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="htb, linux, web (comma separated)" />
          </Row>
          <Row label="Notes">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional context…"
              style={{ resize: 'vertical', minHeight: 56 }}
            />
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'center' }}>
            <Row label="Status">
              <select value={status} onChange={e => setStatus(e.target.value as Credential['status'])}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Row>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
              <input
                type="checkbox"
                id="verified"
                checked={verified}
                onChange={e => setVerified(e.target.checked)}
                style={{ width: 14, height: 14, cursor: 'pointer' }}
              />
              <label htmlFor="verified" style={{ fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer' }}>
                Verified (successfully used)
              </label>
            </div>
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--error)' }}>{error}</div>}

          <button type="submit" className="btn btn-accent" style={{ alignSelf: 'flex-end', marginTop: 4 }}>
            {initial ? 'Save Changes' : 'Add Credential'}
          </button>
        </form>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      paddingTop: 4,
      borderTop: '1px solid var(--border)'
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
