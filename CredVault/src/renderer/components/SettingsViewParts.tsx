// CredVault — SettingsView helper components (extracted for file-size compliance)

import { useMemo, type ReactNode } from 'react'
import type { Credential } from '@shared/types'
import type { AuditIssue } from '../utils/passwordAudit'
import { useStore, type AppTheme } from '../store'

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

export function Card({ title, children, help }: { title: string; children: ReactNode; help?: ReactNode }) {
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
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>{title}</span>
        {help}
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

// ─── Theme Section ────────────────────────────────────────────────────────────

const ACCENT_PRESETS = ['#f78166', '#4a9eff', '#3fb950', '#d29922', '#b44fff', '#ff6b6b']
const BG_PRESETS: { label: string; value: string }[] = [
  { label: 'Dark',     value: '#0a0a0f' },
  { label: 'Graphite', value: '#111318' },
  { label: 'Navy',     value: '#0d1117' },
  { label: 'OLED',     value: '#000000' },
]

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

// Interpolate between #8b949e and #ffffff based on 0-1 slider
function brightnessToTextColor(t: number): string {
  const lo = hexToRgb('#8b949e')!
  const hi = hexToRgb('#ffffff')!
  return rgbToHex(
    Math.round(lo[0] + (hi[0] - lo[0]) * t),
    Math.round(lo[1] + (hi[1] - lo[1]) * t),
    Math.round(lo[2] + (hi[2] - lo[2]) * t),
  )
}

function textColorToBrightness(hex: string): number {
  const c = hexToRgb(hex)
  if (!c) return 0.5
  const lo = hexToRgb('#8b949e')!
  const hi = hexToRgb('#ffffff')!
  const range = hi[0] - lo[0]
  if (range === 0) return 0
  return Math.max(0, Math.min(1, (c[0] - lo[0]) / range))
}

export function ThemeSection() {
  const theme     = useStore(s => s.theme)
  const setTheme  = useStore(s => s.setTheme)
  const resetTheme = useStore(s => s.resetTheme)

  const brightness = textColorToBrightness(theme.textColor)

  return (
    <Card title="Theme">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Accent color */}
        <SettingRow label="Accent color" description="Primary highlight colour used throughout the UI">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ACCENT_PRESETS.map(color => (
              <button
                key={color}
                title={color}
                onClick={() => setTheme({ accentColor: color })}
                style={{
                  width: 22, height: 22, borderRadius: '50%', border: 'none',
                  background: color, cursor: 'pointer', flexShrink: 0,
                  outline: theme.accentColor === color ? `2px solid ${color}` : '2px solid transparent',
                  outlineOffset: 2,
                  transition: 'outline 0.15s, transform 0.15s',
                  transform: theme.accentColor === color ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </SettingRow>

        {/* Background */}
        <SettingRow label="Background" description="App background darkness preset">
          <div style={{ display: 'flex', gap: 6 }}>
            {BG_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => setTheme({ bgColor: p.value })}
                style={{
                  fontSize: 10, padding: '3px 9px', borderRadius: 6,
                  border: `1px solid ${theme.bgColor === p.value ? theme.accentColor : 'rgba(42,51,71,0.6)'}`,
                  background: theme.bgColor === p.value ? `${theme.accentColor}15` : p.value,
                  color: theme.bgColor === p.value ? theme.accentColor : '#8b949e',
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </SettingRow>

        {/* Text brightness slider */}
        <SettingRow label="Text brightness" description="Adjust base text brightness">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={brightness}
              onChange={e => setTheme({ textColor: brightnessToTextColor(parseFloat(e.target.value)) })}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: 11, color: theme.textColor, minWidth: 56, fontFamily: 'JetBrains Mono, monospace' }}>
              {theme.textColor}
            </span>
          </div>
        </SettingRow>

        {/* Live preview swatch */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', borderRadius: 8,
          background: theme.bgColor,
          border: `1px solid rgba(42,51,71,0.5)`,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: theme.accentColor, flexShrink: 0 }} title="Accent" />
          <div style={{ width: 28, height: 28, borderRadius: 6, background: theme.bgColor, border: '1px solid rgba(42,51,71,0.5)', flexShrink: 0 }} title="Background" />
          <span style={{ fontSize: 13, color: theme.textColor, fontWeight: 500, flex: 1 }}>Preview text</span>
          <span style={{ fontSize: 11, color: theme.accentColor }}>Accent label</span>
        </div>

        <button
          className="btn btn-ghost"
          style={{ alignSelf: 'flex-start', fontSize: 11 }}
          onClick={resetTheme}
        >
          Reset to defaults
        </button>
      </div>
    </Card>
  )
}
