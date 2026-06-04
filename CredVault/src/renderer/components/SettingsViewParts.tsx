// CredVault — SettingsView helper components (extracted for file-size compliance)

import { useMemo, type ReactNode } from 'react'
import type { Credential } from '@shared/types'
import type { AuditIssue } from '../utils/passwordAudit'

// ─── Vault Health Ring ────────────────────────────────────────────────────────

export function VaultHealthRing({ credentials }: { credentials: Credential[] }) {
  const score = useMemo(() => {
    if (!credentials.length) return 0
    let pts = 0
    const total    = credentials.length
    const active   = credentials.filter(c => c.status === 'active').length
    const withPw   = credentials.filter(c => c.password).length
    const strongPw = credentials.filter(c => c.password && c.password.length >= 14).length
    const expired  = credentials.filter(c => c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()).length
    pts += Math.round((active / total) * 30)
    pts += withPw > 0 ? Math.round((strongPw / withPw) * 40) : 40
    pts += Math.round(Math.max(0, 1 - expired / total) * 30)
    return Math.min(100, pts)
  }, [credentials])

  const r      = 36
  const circ   = 2 * Math.PI * r
  const dashOff = circ * (1 - score / 100)
  const color  = score >= 80 ? '#3fb950' : score >= 50 ? '#d29922' : '#f85149'
  const label  = score >= 80 ? 'Healthy' : score >= 50 ? 'Fair' : 'Needs Attention'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(42,51,71,0.5)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={dashOff}
          strokeLinecap="round" transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s' }}
        />
        <text x="48" y="52" textAnchor="middle" fontSize="18" fontWeight="700" fill={color} fontFamily="inherit">
          {score}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Based on active credentials, password strength, and expiry status.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {[
            { label: 'Active',    val: `${credentials.filter(c => c.status === 'active').length}/${credentials.length}` },
            { label: 'Strong pw', val: `${credentials.filter(c => c.password && c.password.length >= 14).length}` },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Audit issue badge ────────────────────────────────────────────────────────

const ISSUE_COLORS: Record<AuditIssue['type'], string> = {
  common: '#f85149',
  weak:   '#d29922',
  short:  '#f85149',
  reused: '#a78bfa',
}

export function AuditIssueBadge({ issue }: { issue: AuditIssue }) {
  const color = ISSUE_COLORS[issue.type]
  return (
    <span
      title={issue.detail}
      style={{
        fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, cursor: 'default',
        border: `1px solid ${color}40`, background: `${color}18`, color,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}
    >
      {issue.type}
    </span>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{
      border: '1px solid rgba(42,51,71,0.6)',
      borderRadius: 10, overflow: 'hidden',
      background: 'rgba(13,14,24,0.6)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    }}>
      <div style={{
        padding: '10px 16px',
        background: 'rgba(19,21,37,0.8)',
        borderBottom: '1px solid rgba(42,51,71,0.45)',
        fontSize: 11, fontWeight: 600,
        color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {title}
      </div>
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
  )
}

// ─── SettingRow ───────────────────────────────────────────────────────────────

export function SettingRow({
  label, description, children,
}: { label: string; description?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        border: 'none', cursor: 'pointer',
        background: value ? 'var(--accent)' : 'var(--border)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  )
}
