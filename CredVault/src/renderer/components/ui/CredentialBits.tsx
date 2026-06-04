// ─── CredentialBits — presentational micro-components for CredentialRow ───────
// Extracted in pass 3 to keep CredentialRow.tsx under 500 lines.

import type { CredentialCategory } from '@shared/types'
import { scorePassword } from '../../utils/passwordStrength'

// ─── Shared colors ─────────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<CredentialCategory, string> = {
  'SSH':         '#4a9eff',
  'API Key':     '#a78bfa',
  'Web':         '#3fb950',
  'Database':    '#f78166',
  'Certificate': '#d29922',
  'Token':       '#e879f9',
  'Other':       '#8b949e',
}

// ─── Category pill ─────────────────────────────────────────────────────────────

export function CategoryPill({ cat }: { cat: CredentialCategory }) {
  const color = CATEGORY_COLORS[cat]
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
      border: `1px solid ${color}40`, background: `${color}14`, color,
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {cat}
    </span>
  )
}

// ─── Credential type icons (pass 3) ───────────────────────────────────────────

export function CredTypeIcon({ category }: { category?: CredentialCategory }) {
  const color = category ? (CATEGORY_COLORS[category] ?? '#8b949e') : '#484f58'
  if (category === 'SSH') return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="7" width="7" height="14" rx="1.5" />
      <path d="M9 11h12M18 8l3 3-3 3" />
    </svg>
  )
  if (category === 'API Key' || category === 'Token') return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
  if (category === 'Certificate') return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="8" r="5" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
  if (category === 'Database') return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

// ─── Password strength gradient bar (pass 3) ──────────────────────────────────

const GRADIENT_MAP: Record<number, string> = {
  0: 'transparent',
  1: 'linear-gradient(90deg, #f85149 0%, #ff6b5b 100%)',
  2: 'linear-gradient(90deg, #f85149 0%, #d29922 100%)',
  3: 'linear-gradient(90deg, #d29922 0%, #4a9eff 100%)',
  4: 'linear-gradient(90deg, #4a9eff 0%, #3fb950 100%)',
}

export function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null
  const s = scorePassword(password)
  const pct = [0, 25, 50, 75, 100][s.level]
  return (
    <div style={{ marginTop: 6 }}>
      <div className="pw-strength-gradient">
        <div
          className="pw-strength-gradient-fill"
          style={{ width: `${pct}%`, background: GRADIENT_MAP[s.level] }}
        />
      </div>
      {s.label && (
        <span style={{ fontSize: 9, color: s.color, fontWeight: 600, letterSpacing: '0.04em', marginTop: 3, display: 'block' }}>
          {s.label}
        </span>
      )}
    </div>
  )
}

// ─── Expiry badge with critical pulse (pass 3) ────────────────────────────────

export function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const now     = Date.now()
  const exp     = new Date(expiresAt).getTime()
  const diff    = exp - now
  const days    = Math.ceil(diff / 86_400_000)
  let color     = '#3fb950'
  let label     = `${days}d`
  let critical  = false
  if (diff < 0)        { color = '#f85149'; label = 'Expired'; critical = true }
  else if (days <= 7)  { color = '#f85149'; label = `${days}d`; critical = true }
  else if (days <= 30) { color = '#d29922'; label = `${days}d` }
  return (
    <span
      className={critical ? 'expiry-chip-critical' : undefined}
      style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 6, border: `1px solid ${color}40`, background: `${color}14`, color, display: 'inline-flex', alignItems: 'center', gap: 3 }}
    >
      {critical && (
        <svg width="7" height="7" viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      )}
      {label}
    </span>
  )
}
