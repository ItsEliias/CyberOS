import { useState, FormEvent, type ReactNode, useMemo } from 'react'
import { useStore } from '../store'
import { auditPasswords, type AuditReport, type AuditIssue } from '../utils/passwordAudit'
import { setAudioVolume, getAudioVolume, playAutoLock } from '../utils/audioNotify'
import MetricCard from './ui/MetricCard'
import type { Credential } from '@shared/types'

const AUTO_LOCK_OPTIONS = [
  { label: 'Never',    ms: 0 },
  { label: '5 min',   ms: 5  * 60_000 },
  { label: '15 min',  ms: 15 * 60_000 },
  { label: '30 min',  ms: 30 * 60_000 },
]

const CLIPBOARD_CLEAR_OPTIONS = [
  { label: '30s',   ms: 30_000 },
  { label: '60s',   ms: 60_000 },
  { label: 'Never', ms: 0 },
]

export default function SettingsView() {
  const stats              = useStore(s => s.stats)
  const autoLockMs         = useStore(s => s.autoLockMs)
  const setAutoLockMs      = useStore(s => s.setAutoLockMs)
  const clipboardClearMs   = useStore(s => s.clipboardClearMs)
  const setClipboardClearMs = useStore(s => s.setClipboardClearMs)

  // Local UI-only toggles (persisted only in renderer state for this session)
  const [lockOnHide, setLockOnHide]         = useState(false)
  const [allowCrossApp, setAllowCrossApp]   = useState(true)
  const [showImportNotif, setShowImportNotif] = useState(true)

  // Change password form
  const [curPw, setCurPw]   = useState('')
  const [newPw, setNewPw]   = useState('')
  const [confPw, setConfPw] = useState('')
  const [pwMsg, setPwMsg]   = useState<{ ok: boolean; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  // Export backup form
  const [expPw, setExpPw]   = useState('')
  const [expConf, setExpConf] = useState('')
  const [expMsg, setExpMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [expLoading, setExpLoading] = useState(false)

  // Import backup form
  const [impPw, setImpPw]   = useState('')
  const [impMsg, setImpMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [impLoading, setImpLoading] = useState(false)

  // Password audit
  const credentials       = useStore(s => s.credentials)
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null)
  const [auditRunning, setAuditRunning] = useState(false)

  // Audio notifications volume (0–1)
  const [audioVolume, setAudioVolumeState] = useState(getAudioVolume)

  async function handleChangePw(e: FormEvent) {
    e.preventDefault()
    if (newPw !== confPw) { setPwMsg({ ok: false, text: 'New passwords do not match' }); return }
    if (newPw.length < 8) { setPwMsg({ ok: false, text: 'New password must be at least 8 characters' }); return }
    setPwLoading(true)
    const res = await window.electronAPI.changePassword(curPw, newPw)
    setPwLoading(false)
    if (res.ok) {
      setPwMsg({ ok: true, text: 'Password changed successfully' })
      setCurPw(''); setNewPw(''); setConfPw('')
    } else {
      setPwMsg({ ok: false, text: res.error ?? 'Failed to change password' })
    }
  }

  async function handleExport(e: FormEvent) {
    e.preventDefault()
    if (!expPw) return
    if (expPw !== expConf) { setExpMsg({ ok: false, text: 'Export passwords do not match' }); return }
    setExpLoading(true)
    const res = await window.electronAPI.exportBackup({ exportPassword: expPw })
    setExpLoading(false)
    if (res.ok) {
      setExpMsg({ ok: true, text: 'Backup exported successfully' })
      setExpPw(''); setExpConf('')
    } else {
      setExpMsg({ ok: false, text: res.error ?? 'Export failed' })
    }
  }

  async function handleImport(e: FormEvent) {
    e.preventDefault()
    if (!impPw) return
    setImpLoading(true)
    const res = await window.electronAPI.importBackup(impPw)
    setImpLoading(false)
    if (res.ok) {
      setImpMsg({ ok: true, text: `Imported ${res.count ?? 0} credential${(res.count ?? 0) !== 1 ? 's' : ''}` })
      setImpPw('')
    } else {
      setImpMsg({ ok: false, text: res.error ?? 'Import failed' })
    }
  }

  function handleAudit() {
    setAuditRunning(true)
    const report = auditPasswords(credentials)
    setAuditReport(report)
    setAuditRunning(false)
  }

  return (
    <div style={{ padding: 24, maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f78166" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3', letterSpacing: '-0.2px' }}>Settings</h2>
      </div>

      {/* ── Security ──────────────────────────────────────────────────────── */}
      <Card title="Security">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Auto-lock timeout */}
          <SettingRow label="Auto-lock timeout" description="Lock the vault after this period of idle time">
            <div style={{ display: 'flex', gap: 6 }}>
              {AUTO_LOCK_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  className={autoLockMs === opt.ms ? 'btn btn-accent' : 'btn btn-ghost'}
                  style={{ fontSize: 12 }}
                  onClick={() => setAutoLockMs(opt.ms)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SettingRow>

          {/* Lock on hide */}
          <SettingRow label="Lock on app hide" description="Lock the vault when the window is hidden or minimized">
            <Toggle value={lockOnHide} onChange={setLockOnHide} />
          </SettingRow>

        </div>
      </Card>

      {/* ── Clipboard ─────────────────────────────────────────────────────── */}
      <Card title="Clipboard">
        <SettingRow
          label="Clipboard clear timer"
          description="Overwrite the clipboard after copying a password or hash"
        >
          <div style={{ display: 'flex', gap: 6 }}>
            {CLIPBOARD_CLEAR_OPTIONS.map(opt => (
              <button
                key={opt.label}
                className={clipboardClearMs === opt.ms ? 'btn btn-accent' : 'btn btn-ghost'}
                style={{ fontSize: 12 }}
                onClick={() => setClipboardClearMs(opt.ms)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SettingRow>
      </Card>

      {/* ── Audio ─────────────────────────────────────────────────────────── */}
      <Card title="Audio Notifications">
        <SettingRow
          label="Notification volume"
          description="Beep on auto-lock, breach detection, and TOTP expiry. Set to 0 to disable."
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={audioVolume}
              onChange={e => {
                const v = parseFloat(e.target.value)
                setAudioVolumeState(v)
                setAudioVolume(v)
              }}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-dim)', minWidth: 32, textAlign: 'right' }}>
              {Math.round(audioVolume * 100)}%
            </span>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => playAutoLock()}
              title="Play a test tone"
            >
              Test
            </button>
          </div>
        </SettingRow>
      </Card>

      {/* ── Integration ───────────────────────────────────────────────────── */}
      <Card title="Integration">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SettingRow
            label="Allow cross-app credential queries"
            description="Other CyberOS apps can query non-sensitive credential fields via IPC"
          >
            <Toggle value={allowCrossApp} onChange={setAllowCrossApp} />
          </SettingRow>
          <SettingRow
            label="Show notification on import"
            description="Display a notification when credentials are imported from ReconDesk"
          >
            <Toggle value={showImportNotif} onChange={setShowImportNotif} />
          </SettingRow>
        </div>
      </Card>

      {/* ── Change master password ────────────────────────────────────────── */}
      <Card title="Change Master Password">
        <form onSubmit={handleChangePw} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder="Current password" value={curPw} onChange={e => setCurPw(e.target.value)} />
          <input type="password" placeholder="New password (min 8 chars)" value={newPw} onChange={e => setNewPw(e.target.value)} />
          <input type="password" placeholder="Confirm new password" value={confPw} onChange={e => setConfPw(e.target.value)} />
          {pwMsg && (
            <p style={{ fontSize: 12, color: pwMsg.ok ? 'var(--success)' : 'var(--error)' }}>{pwMsg.text}</p>
          )}
          <button
            type="submit"
            className="btn btn-accent"
            style={{ alignSelf: 'flex-start' }}
            disabled={pwLoading || !curPw || !newPw || !confPw}
          >
            {pwLoading ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </Card>

      {/* ── Export encrypted backup ───────────────────────────────────────── */}
      <Card title="Export Encrypted Backup">
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.5 }}>
          The backup will be encrypted with a separate export password (not your master password).
          {stats && stats.total > 0 && (
            <span style={{ color: 'var(--text-muted)' }}> {stats.total} credential{stats.total !== 1 ? 's' : ''} will be exported.</span>
          )}
        </p>
        <form onSubmit={handleExport} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder="Export password" value={expPw} onChange={e => setExpPw(e.target.value)} />
          <input type="password" placeholder="Confirm export password" value={expConf} onChange={e => setExpConf(e.target.value)} />
          {expMsg && (
            <p style={{ fontSize: 12, color: expMsg.ok ? 'var(--success)' : 'var(--error)' }}>{expMsg.text}</p>
          )}
          <button
            type="submit"
            className="btn btn-ghost"
            style={{ alignSelf: 'flex-start' }}
            disabled={expLoading || !expPw || !expConf}
          >
            {expLoading ? 'Exporting…' : 'Export Backup…'}
          </button>
        </form>
      </Card>

      {/* ── Import from backup ────────────────────────────────────────────── */}
      <Card title="Import from Backup">
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.5 }}>
          Import credentials from a <span style={{ fontFamily: 'monospace' }}>.cvcrypt</span> backup file.
          This will merge with your existing vault — duplicate credentials are skipped.
        </p>
        <div style={{
          background: 'rgba(210,153,34,0.08)',
          border: '1px solid rgba(210,153,34,0.25)',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 11,
          color: 'var(--warning)',
          lineHeight: 1.5,
          marginBottom: 12,
        }}>
          This will MERGE with your existing vault. Duplicate credentials will be skipped.
        </div>
        <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder="Backup password" value={impPw} onChange={e => setImpPw(e.target.value)} />
          {impMsg && (
            <p style={{ fontSize: 12, color: impMsg.ok ? 'var(--success)' : 'var(--error)' }}>{impMsg.text}</p>
          )}
          <button
            type="submit"
            className="btn btn-ghost"
            style={{ alignSelf: 'flex-start' }}
            disabled={impLoading || !impPw}
          >
            {impLoading ? 'Importing…' : 'Select Backup File…'}
          </button>
        </form>
      </Card>

      {/* ── Password Audit ───────────────────────────────────────────────── */}
      <Card title="Password Audit">
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.5 }}>
          Check stored passwords against common password lists and detect weak, short, or reused passwords. No network required.
        </p>
        <button
          className="btn btn-ghost"
          style={{ alignSelf: 'flex-start', marginBottom: 12 }}
          onClick={handleAudit}
          disabled={auditRunning || credentials.filter(c => c.password).length === 0}
        >
          {auditRunning ? 'Auditing…' : 'Audit Passwords'}
        </button>

        {auditReport && (
          <div>
            {auditReport.entries.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--success)', padding: '8px 12px', background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.2)', borderRadius: 6 }}>
                No issues found — all passwords passed the audit.
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 8, fontWeight: 500 }}>
                  {auditReport.entries.length} credential{auditReport.entries.length !== 1 ? 's' : ''} with issues
                  {auditReport.reusedGroups > 0 && ` · ${auditReport.reusedGroups} reuse group${auditReport.reusedGroups !== 1 ? 's' : ''}`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {auditReport.entries.map(entry => (
                    <div key={entry.id} style={{ padding: '8px 12px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{entry.service}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{entry.username}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {entry.issues.map((issue, i) => (
                          <AuditIssueBadge key={i} issue={issue} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
                  Checked at {new Date(auditReport.checkedAt).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Vault Health Score ────────────────────────────────────────────── */}
      {credentials.length > 0 && (
        <Card title="Vault Health Score">
          <VaultHealthRing credentials={credentials} />
        </Card>
      )}

      {/* ── Vault statistics — improvement #3: count-up MetricCards ─────── */}
      {stats && (
        <Card title="Vault Statistics">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <MetricCard
              label="Total"
              value={stats.total}
              accentColor="var(--accent)"
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
              sublabel="credentials"
            />
            <MetricCard
              label="Active"
              value={credentials.filter(c => c.status === 'active').length}
              accentColor="#3fb950"
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
              sublabel="in use"
            />
            <MetricCard
              label="Rotated"
              value={credentials.filter(c => c.status === 'rotated').length}
              accentColor="#d29922"
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>}
              sublabel="rotated"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {Object.keys(stats.byService).length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  By Service
                </div>
                {Object.entries(stats.byService).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 3 }}>
                    {k}: <span style={{ color: 'var(--text)' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            {Object.keys(stats.byLab).length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  By Lab
                </div>
                {Object.entries(stats.byLab).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 3 }}>
                    {k}: <span style={{ color: 'var(--text)' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            {Object.keys(stats.bySource).length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  By Source
                </div>
                {Object.entries(stats.bySource).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 3 }}>
                    {k}: <span style={{ color: 'var(--text)' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Vault Health Ring ────────────────────────────────────────────────────────

function VaultHealthRing({ credentials }: { credentials: Credential[] }) {
  const score = useMemo(() => {
    if (!credentials.length) return 0
    let pts = 0
    const total = credentials.length
    const active = credentials.filter(c => c.status === 'active').length
    const withPw = credentials.filter(c => c.password).length
    const strongPw = credentials.filter(c => {
      if (!c.password) return false
      return c.password.length >= 14
    }).length
    const expired = credentials.filter(c => c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()).length
    pts += Math.round((active / total) * 30)
    pts += withPw > 0 ? Math.round((strongPw / withPw) * 40) : 40
    pts += Math.round(Math.max(0, 1 - expired / total) * 30)
    return Math.min(100, pts)
  }, [credentials])

  const r = 36
  const circ = 2 * Math.PI * r
  const dashOff = circ * (1 - score / 100)
  const color = score >= 80 ? '#3fb950' : score >= 50 ? '#d29922' : '#f85149'
  const label = score >= 80 ? 'Healthy' : score >= 50 ? 'Fair' : 'Needs Attention'

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
        <div style={{ fontSize: 16, fontWeight: 600, color }}>
          {label}
        </div>
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: ReactNode }) {
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

function SettingRow({
  label, description, children
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

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        cursor: 'pointer',
        background: value ? 'var(--accent)' : 'var(--border)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: value ? 21 : 3,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--accent)' }}>{value}</div>
    </div>
  )
}

const ISSUE_COLORS: Record<AuditIssue['type'], string> = {
  common: '#f85149',
  weak:   '#d29922',
  short:  '#f85149',
  reused: '#a78bfa',
}

function AuditIssueBadge({ issue }: { issue: AuditIssue }) {
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
