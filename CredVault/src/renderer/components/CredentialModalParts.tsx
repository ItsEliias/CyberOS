// CredVault — CredentialModal helper components and constants (extracted for file-size compliance)

import { useState } from 'react'
import type { CredentialCategory } from '@shared/types'
import { scorePassword } from '../utils/passwordStrength'

// ─── Password generator ───────────────────────────────────────────────────────

export interface GenOptions {
  length:  number
  upper:   boolean
  lower:   boolean
  numbers: boolean
  symbols: boolean
  noAmbig: boolean
}

export function generatePassword(opts: GenOptions): string {
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

export function StrengthBar({ password }: { password: string }) {
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
              flex: 1, height: 3, borderRadius: 2,
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

export function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
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

export const CATEGORY_COLORS: Record<CredentialCategory, string> = {
  'SSH':         '#4a9eff',
  'API Key':     '#a78bfa',
  'Web':         '#3fb950',
  'Database':    '#f78166',
  'Certificate': '#d29922',
  'Token':       '#e879f9',
  'Other':       '#8b949e',
}

export const CATEGORIES: CredentialCategory[] = ['SSH', 'API Key', 'Web', 'Database', 'Certificate', 'Token', 'Other']
export const SERVICE_OPTS  = ['Web Panel', 'SSH', 'FTP', 'Windows Login', 'SMB', 'Database', 'RDP', 'VPN', 'API', 'Other']
export const HASH_TYPES    = ['ntlm', 'sha256', 'md5', 'bcrypt', 'sha1', 'lm', 'other']
export const SOURCE_OPTS   = ['Manual', 'ReconDesk import', 'CyberLab session']

// ─── Self-hosted service templates ────────────────────────────────────────────

export interface ServiceTemplate {
  label:    string
  service:  string
  username: string
  category: CredentialCategory
  tags:     string[]
  notes:    string
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  { label: 'Gitea',          service: 'Web Panel', username: 'admin',      category: 'Web',     tags: ['self-hosted', 'git'],        notes: 'Gitea admin — also fill in URL and API token' },
  { label: 'Nextcloud',      service: 'Web Panel', username: 'admin',      category: 'Web',     tags: ['self-hosted', 'cloud'],      notes: 'Nextcloud admin panel' },
  { label: 'Vaultwarden',    service: 'Web Panel', username: 'admin',      category: 'Web',     tags: ['self-hosted', 'vault'],      notes: 'Vaultwarden bitwarden-compatible server' },
  { label: 'Grafana',        service: 'Web Panel', username: 'admin',      category: 'Web',     tags: ['self-hosted', 'monitoring'], notes: 'Grafana dashboard — default user: admin' },
  { label: 'Portainer',      service: 'Web Panel', username: 'admin',      category: 'Web',     tags: ['self-hosted', 'docker'],     notes: 'Portainer Docker management UI' },
  { label: 'Jellyfin',       service: 'Web Panel', username: 'admin',      category: 'Web',     tags: ['self-hosted', 'media'],      notes: 'Jellyfin media server admin' },
  { label: 'Home Assistant', service: 'Web Panel', username: 'admin',      category: 'Token',   tags: ['self-hosted', 'automation'], notes: 'Home Assistant — store long-lived token in password field' },
  { label: 'Pi-hole',        service: 'Web Panel', username: 'admin',      category: 'Web',     tags: ['self-hosted', 'dns'],        notes: 'Pi-hole admin panel — web password in password field' },
  { label: 'Proxmox',        service: 'Web Panel', username: 'root',       category: 'Web',     tags: ['self-hosted', 'hypervisor'], notes: 'Proxmox VE — realm: pam' },
  { label: 'Traefik',        service: 'Web Panel', username: 'admin',      category: 'Web',     tags: ['self-hosted', 'proxy'],      notes: 'Traefik dashboard — basic auth credentials' },
  { label: 'Authentik',      service: 'Web Panel', username: 'akadmin',    category: 'Web',     tags: ['self-hosted', 'auth'],       notes: 'Authentik SSO — default superuser' },
  { label: 'MinIO',          service: 'API',       username: 'minioadmin', category: 'API Key', tags: ['self-hosted', 's3'],         notes: 'MinIO — access key in username, secret key in password' },
]

// ─── Password generator panel ─────────────────────────────────────────────────

export function PasswordGeneratorPanel({ onFill }: { onFill: (pw: string) => void }) {
  const [genLen, setGenLen]         = useState(20)
  const [genUpper, setGenUpper]     = useState(true)
  const [genLower, setGenLower]     = useState(true)
  const [genNumbers, setGenNumbers] = useState(true)
  const [genSymbols, setGenSymbols] = useState(true)
  const [genNoAmbig, setGenNoAmbig] = useState(false)

  return (
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
          ['A-Z', genUpper, setGenUpper],
          ['a-z', genLower, setGenLower],
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
        onClick={() => onFill(generatePassword({ length: genLen, upper: genUpper, lower: genLower, numbers: genNumbers, symbols: genSymbols, noAmbig: genNoAmbig }))}
      >
        Generate &amp; Fill
      </button>
    </div>
  )
}

// ─── Service templates picker ─────────────────────────────────────────────────

export function TemplatesPicker({ onSelect }: { onSelect: (tpl: ServiceTemplate) => void }) {
  return (
    <div style={{
      border: '1px solid var(--accent-border)', borderRadius: 6,
      background: 'rgba(247,129,102,0.04)', padding: '10px 12px',
      display: 'flex', flexWrap: 'wrap', gap: 6,
    }}>
      {SERVICE_TEMPLATES.map(tpl => (
        <button
          key={tpl.label}
          type="button"
          onClick={() => onSelect(tpl)}
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
  )
}
