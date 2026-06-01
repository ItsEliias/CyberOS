import { useState, FormEvent, type ReactNode } from 'react'
import { useStore } from '../store'

const AUTO_LOCK_OPTIONS = [
  { label: 'Never', ms: 0 },
  { label: '5 minutes', ms: 5 * 60_000 },
  { label: '15 minutes', ms: 15 * 60_000 },
  { label: '30 minutes', ms: 30 * 60_000 },
]

export default function SettingsView() {
  const stats       = useStore(s => s.stats)
  const autoLockMs  = useStore(s => s.autoLockMs)
  const setAutoLockMs = useStore(s => s.setAutoLockMs)

  // Change password form
  const [curPw, setCurPw]   = useState('')
  const [newPw, setNewPw]   = useState('')
  const [confPw, setConfPw] = useState('')
  const [pwMsg, setPwMsg]   = useState<{ ok: boolean; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  // Export backup form
  const [expPw, setExpPw]   = useState('')
  const [expMsg, setExpMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [expLoading, setExpLoading] = useState(false)

  // Import backup form
  const [impPw, setImpPw]   = useState('')
  const [impMsg, setImpMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [impLoading, setImpLoading] = useState(false)

  async function handleChangePw(e: FormEvent) {
    e.preventDefault()
    if (newPw !== confPw) { setPwMsg({ ok: false, text: 'New passwords do not match' }); return }
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
    setExpLoading(true)
    const res = await window.electronAPI.exportBackup({ exportPassword: expPw })
    setExpLoading(false)
    if (res.ok) {
      setExpMsg({ ok: true, text: 'Backup exported successfully' })
      setExpPw('')
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

  return (
    <div style={{ padding: 24, maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>Settings</h2>

      {/* Auto-lock */}
      <Card title="Auto-Lock">
        <div style={{ display: 'flex', gap: 8 }}>
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
        {autoLockMs > 0 && (
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
            Vault will lock after {AUTO_LOCK_OPTIONS.find(o => o.ms === autoLockMs)?.label} of unlock time.
            Takes effect on next unlock.
          </p>
        )}
      </Card>

      {/* Change password */}
      <Card title="Change Master Password">
        <form onSubmit={handleChangePw} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder="Current password" value={curPw} onChange={e => setCurPw(e.target.value)} />
          <input type="password" placeholder="New password (min 8 chars)" value={newPw} onChange={e => setNewPw(e.target.value)} />
          <input type="password" placeholder="Confirm new password" value={confPw} onChange={e => setConfPw(e.target.value)} />
          {pwMsg && (
            <p style={{ fontSize: 12, color: pwMsg.ok ? 'var(--success)' : 'var(--error)' }}>{pwMsg.text}</p>
          )}
          <button type="submit" className="btn btn-accent" style={{ alignSelf: 'flex-start' }} disabled={pwLoading || !curPw || !newPw}>
            {pwLoading ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </Card>

      {/* Export backup */}
      <Card title="Export Encrypted Backup">
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
          Creates an AES-256-GCM encrypted .cvault backup file with a separate export password.
        </p>
        <form onSubmit={handleExport} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder="Export password" value={expPw} onChange={e => setExpPw(e.target.value)} />
          {expMsg && (
            <p style={{ fontSize: 12, color: expMsg.ok ? 'var(--success)' : 'var(--error)' }}>{expMsg.text}</p>
          )}
          <button type="submit" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} disabled={expLoading || !expPw}>
            {expLoading ? 'Exporting…' : 'Export Backup…'}
          </button>
        </form>
      </Card>

      {/* Import backup */}
      <Card title="Import from Backup">
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
          Import credentials from a .cvault backup. Duplicate entries are skipped.
        </p>
        <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder="Backup password" value={impPw} onChange={e => setImpPw(e.target.value)} />
          {impMsg && (
            <p style={{ fontSize: 12, color: impMsg.ok ? 'var(--success)' : 'var(--error)' }}>{impMsg.text}</p>
          )}
          <button type="submit" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} disabled={impLoading || !impPw}>
            {impLoading ? 'Importing…' : 'Choose Backup File…'}
          </button>
        </form>
      </Card>

      {/* Vault stats */}
      {stats && (
        <Card title="Vault Statistics">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <StatBlock label="Total Credentials" value={stats.total} />
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

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        padding: '10px 16px',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--text-dim)'
      }}>
        {title}
      </div>
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
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
