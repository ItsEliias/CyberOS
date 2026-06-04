import { useState, useEffect, type ReactNode, type CSSProperties } from 'react'
import { useStore } from '../store'
import CredentialModal from './CredentialModal'
import type { Credential, ReconTarget, ImportPreviewRow, PendingCredential } from '@shared/types'
import { parseCsv, type CsvFormat } from '../utils/csvImport'

const FORMAT_LABELS: Record<CsvFormat, string> = {
  '1password': '1Password',
  'bitwarden':  'Bitwarden',
  'keepass':    'KeePass',
  'unknown':    'Unknown format',
}

const FORMAT_COLORS: Record<CsvFormat, string> = {
  '1password': '#3fb950',
  'bitwarden':  '#4a9eff',
  'keepass':    '#d29922',
  'unknown':    '#8b949e',
}

export default function ImportView() {
  const setCredentials   = useStore(s => s.setCredentials)
  const setStats         = useStore(s => s.setStats)
  const addImportHistory = useStore(s => s.addImportHistory)
  const importHistory    = useStore(s => s.importHistory)
  const setPendingCount  = useStore(s => s.setPendingCount)

  const [targets, setTargets]               = useState<ReconTarget[]>([])
  const [loadingTargets, setLoadingTargets] = useState(false)
  const [preview, setPreview]               = useState<ImportPreviewRow[] | null>(null)
  const [importDone, setImportDone]         = useState<{ count: number; label: string } | null>(null)
  const [showManual, setShowManual]         = useState(false)
  const [statusMsg, setStatusMsg]           = useState('')
  const [pendingItems, setPendingItems]     = useState<PendingCredential[]>([])
  const [pendingWorking, setPendingWorking] = useState(false)

  const [csvFormat, setCsvFormat]   = useState<CsvFormat | null>(null)
  const [csvErrors, setCsvErrors]   = useState<string[]>([])
  const [csvPreview, setCsvPreview] = useState<ImportPreviewRow[] | null>(null)
  const [csvDone, setCsvDone]       = useState<{ count: number } | null>(null)
  const [csvLoading, setCsvLoading] = useState(false)

  useEffect(() => {
    window.electronAPI.pending.get().then(items => {
      setPendingItems(items)
      setPendingCount(items.length)
    })
    const handler = (_count: number) => {
      window.electronAPI.pending.get().then(items => {
        setPendingItems(items)
        setPendingCount(items.length)
      })
    }
    window.electronAPI.pending.on(handler)
    return () => window.electronAPI.pending.off(handler)
  }, [setPendingCount])

  async function approvePending(index: number) {
    setPendingWorking(true)
    try {
      const cred = await window.electronAPI.pending.approve(index)
      if (cred) {
        await window.electronAPI.addCredential({
          username: cred.username ?? '(unknown)', hash: cred.hash, hashType: cred.type,
          service: cred.service ?? 'Unknown', source: 'ReconDesk live push',
          targetName: cred.targetName, ip: cred.targetIP, tags: [], verified: false, status: 'active',
        })
        addImportHistory({ timestamp: new Date().toISOString(), count: 1, sourceLabel: `Live push from ReconDesk — ${cred.targetName}` })
        await refreshData()
      }
      const updated = await window.electronAPI.pending.get()
      setPendingItems(updated)
      setPendingCount(updated.length)
    } finally { setPendingWorking(false) }
  }

  async function dismissPending(index: number) {
    await window.electronAPI.pending.dismiss(index)
    const updated = await window.electronAPI.pending.get()
    setPendingItems(updated)
    setPendingCount(updated.length)
  }

  async function refreshData() {
    const [creds, stats] = await Promise.all([window.electronAPI.getCredentials(), window.electronAPI.getStats()])
    setCredentials(creds)
    setStats(stats)
  }

  async function loadReconTargets() {
    setLoadingTargets(true)
    setPreview(null)
    setImportDone(null)
    try {
      const raw = await window.electronAPI.getReconTargets() as ReconTarget[]
      setTargets(raw)
      if (raw.length === 0) { setStatusMsg('No ReconDesk targets found in cybertools-config.json') } else {
        const rows: ImportPreviewRow[] = []
        for (const t of raw) {
          for (const rc of (t.credentials ?? [])) {
            rows.push({ selected: true, sourceTarget: t.name, credential: {
              username: rc.username ?? '(unknown)', password: rc.password, hash: rc.hash,
              hashType: rc.type, service: rc.service ?? 'Unknown', source: 'ReconDesk import',
              targetName: t.name, ip: t.ip, tags: [], notes: rc.notes, verified: false, status: 'active',
            }})
          }
        }
        setPreview(rows)
        if (rows.length === 0) setStatusMsg('No credentials found on any ReconDesk target.')
      }
    } catch (e) { setStatusMsg(`Error: ${(e as Error).message}`) }
    setLoadingTargets(false)
  }

  async function doImport() {
    if (!preview) return
    const selected = preview.filter(r => r.selected).map(r => r.credential)
    if (selected.length === 0) { setStatusMsg('No credentials selected.'); return }
    const count = await window.electronAPI.importCredentials(selected)
    const label = `${count} credentials from ReconDesk`
    addImportHistory({ timestamp: new Date().toISOString(), count, sourceLabel: label })
    setImportDone({ count, label })
    setPreview(null)
    await refreshData()
  }

  async function handleOpenCsv() {
    setCsvLoading(true)
    setCsvFormat(null)
    setCsvErrors([])
    setCsvPreview(null)
    setCsvDone(null)
    try {
      const res = await window.electronAPI.openCsvFile()
      if (!res.ok || !res.content) { setCsvLoading(false); return }
      const result = parseCsv(res.content)
      setCsvFormat(result.format)
      setCsvErrors(result.errors)
      const rows: ImportPreviewRow[] = result.rows.map(cred => ({
        selected: true,
        sourceTarget: FORMAT_LABELS[result.format],
        credential: cred,
      }))
      setCsvPreview(rows)
    } catch (e) { setCsvErrors([(e as Error).message]) }
    setCsvLoading(false)
  }

  async function doCsvImport() {
    if (!csvPreview) return
    const selected = csvPreview.filter(r => r.selected).map(r => r.credential)
    if (!selected.length) return
    const count = await window.electronAPI.importCredentials(selected)
    addImportHistory({ timestamp: new Date().toISOString(), count, sourceLabel: `CSV import (${csvFormat ? FORMAT_LABELS[csvFormat] : 'unknown'})` })
    setCsvDone({ count })
    setCsvPreview(null)
    await refreshData()
  }

  function toggleRow(idx: number) { setPreview(p => p ? p.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r) : p) }
  function toggleAll(val: boolean) { setPreview(p => p ? p.map(r => ({ ...r, selected: val })) : p) }
  function toggleCsvRow(idx: number) { setCsvPreview(p => p ? p.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r) : p) }
  function toggleCsvAll(val: boolean) { setCsvPreview(p => p ? p.map(r => ({ ...r, selected: val })) : p) }

  async function handleManualAdd(data: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>) {
    await window.electronAPI.addCredential(data)
    setShowManual(false)
    await refreshData()
  }

  const selectedCount    = preview?.filter(r => r.selected).length ?? 0
  const csvSelectedCount = csvPreview?.filter(r => r.selected).length ?? 0

  return (
    <div style={{ padding: 24, maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>Import Credentials</h2>

      {pendingItems.length > 0 && (
        <Section title={`Live Queue — ${pendingItems.length} pending from ReconDesk`}>
          <div style={{ padding: '10px 14px', marginBottom: 12, background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: 6, fontSize: 12, color: '#ffc107', fontWeight: 500 }}>
            {pendingItems.length} new credential{pendingItems.length !== 1 ? 's' : ''} detected from ReconDesk — approve to encrypt and store
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pendingItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 500 }}>{item.targetName}</span>
                  <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>{item.targetIP}</span>
                  {item.username && <span style={{ fontFamily: 'monospace', marginLeft: 8, color: 'var(--accent)' }}>{item.username}</span>}
                  {item.hash && <span style={{ fontFamily: 'monospace', marginLeft: 6, color: 'var(--text-dim)', fontSize: 10 }}>{item.hash.slice(0, 16)}…</span>}
                  <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.type}</span>
                </div>
                <button className="btn btn-accent" style={{ fontSize: 11, padding: '4px 10px' }} disabled={pendingWorking} onClick={() => approvePending(i)}>Import &amp; Encrypt</button>
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => dismissPending(i)}>Dismiss</button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* CSV Import */}
      <Section title="Import from CSV (1Password / Bitwarden / KeePass)">
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12, lineHeight: 1.5 }}>
          Supports 1Password, Bitwarden, and KeePass CSV exports. Format is auto-detected from column headers.
        </p>
        <button className="btn btn-ghost" onClick={handleOpenCsv} disabled={csvLoading}>
          {csvLoading ? 'Reading…' : 'Open CSV File…'}
        </button>
        {csvFormat && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Detected format:</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, border: `1px solid ${FORMAT_COLORS[csvFormat]}40`, background: `${FORMAT_COLORS[csvFormat]}18`, color: FORMAT_COLORS[csvFormat] }}>
              {FORMAT_LABELS[csvFormat]}
            </span>
            {csvPreview && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{csvPreview.length} records found</span>}
          </div>
        )}
        {csvErrors.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--warning)' }}>
            {csvErrors.slice(0, 3).map((e, i) => <div key={i}>{e}</div>)}
            {csvErrors.length > 3 && <div>…and {csvErrors.length - 3} more warnings</div>}
          </div>
        )}
        {csvDone && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.25)', borderRadius: 6, fontSize: 12, color: 'var(--success)' }}>
            Imported {csvDone.count} credential{csvDone.count !== 1 ? 's' : ''} successfully.
          </div>
        )}
        {csvPreview && csvPreview.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{csvSelectedCount} of {csvPreview.length} selected</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => toggleCsvAll(true)}>All</button>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => toggleCsvAll(false)}>None</button>
                <button className="btn btn-accent" style={{ fontSize: 12 }} disabled={csvSelectedCount === 0} onClick={doCsvImport}>
                  Import Selected ({csvSelectedCount})
                </button>
              </div>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                    <th style={thStyle}></th><th style={thStyle}>Service</th><th style={thStyle}>Username</th><th style={thStyle}>URL/IP</th><th style={thStyle}>Has Password</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.map((row, i) => (
                    <tr key={i} onClick={() => toggleCsvRow(i)} style={{ cursor: 'pointer', background: row.selected ? 'rgba(247,129,102,0.04)' : 'transparent', borderBottom: '1px solid var(--border)', opacity: row.selected ? 1 : 0.45 }}>
                      <td style={tdStyle}><input type="checkbox" checked={row.selected} onChange={() => toggleCsvRow(i)} onClick={e => e.stopPropagation()} /></td>
                      <td style={tdStyle}>{row.credential.service}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{row.credential.username}</td>
                      <td style={{ ...tdStyle, fontSize: 10, color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.credential.ip ?? '—'}</td>
                      <td style={tdStyle}>{row.credential.password ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* Import from ReconDesk */}
      <Section title="Import from ReconDesk">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <button className="btn btn-ghost" onClick={loadReconTargets} disabled={loadingTargets}>
            {loadingTargets ? 'Loading…' : 'Scan ReconDesk targets'}
          </button>
          {targets.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{targets.length} target{targets.length !== 1 ? 's' : ''} found</span>}
        </div>
        {statusMsg && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>{statusMsg}</div>}
        {importDone && (
          <div style={{ padding: '10px 14px', background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.25)', borderRadius: 6, fontSize: 12, color: 'var(--success)', marginBottom: 10 }}>
            Imported {importDone.count} credential{importDone.count !== 1 ? 's' : ''} successfully.
          </div>
        )}
        {preview && preview.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{selectedCount} of {preview.length} selected</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => toggleAll(true)}>All</button>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => toggleAll(false)}>None</button>
                <button className="btn btn-accent" style={{ fontSize: 12 }} disabled={selectedCount === 0} onClick={doImport}>Import Selected ({selectedCount})</button>
              </div>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                    <th style={thStyle}></th><th style={thStyle}>Target</th><th style={thStyle}>Username</th><th style={thStyle}>Service</th><th style={thStyle}>Has Password</th><th style={thStyle}>Has Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} onClick={() => toggleRow(i)} style={{ cursor: 'pointer', background: row.selected ? 'rgba(247,129,102,0.04)' : 'transparent', borderBottom: '1px solid var(--border)', opacity: row.selected ? 1 : 0.45 }}>
                      <td style={tdStyle}><input type="checkbox" checked={row.selected} onChange={() => toggleRow(i)} onClick={e => e.stopPropagation()} /></td>
                      <td style={tdStyle}>{row.sourceTarget}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{row.credential.username}</td>
                      <td style={tdStyle}>{row.credential.service}</td>
                      <td style={tdStyle}>{row.credential.password ? '✓' : '—'}</td>
                      <td style={tdStyle}>{row.credential.hash ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      <Section title="Manual Add">
        <button className="btn btn-ghost" onClick={() => setShowManual(true)}>+ Add Credential Manually</button>
      </Section>

      {importHistory.length > 0 && (
        <Section title="Import History">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {importHistory.map((h, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {new Date(h.timestamp).toLocaleString()} — {h.sourceLabel}
              </div>
            ))}
          </div>
        </Section>
      )}

      {showManual && <CredentialModal onSave={handleManualAdd} onClose={() => setShowManual(false)} />}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: 'var(--panel)', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--text-dim)' }}>
        {title}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

const thStyle: CSSProperties = { padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const tdStyle: CSSProperties = { padding: '7px 12px', fontSize: 12, color: 'var(--text)' }
