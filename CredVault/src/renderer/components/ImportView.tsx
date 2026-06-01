import { useState, type ReactNode, type CSSProperties } from 'react'
import { useStore } from '../store'
import CredentialModal from './CredentialModal'
import type { Credential, ReconTarget, ImportPreviewRow } from '@shared/types'

export default function ImportView() {
  const setCredentials  = useStore(s => s.setCredentials)
  const setStats        = useStore(s => s.setStats)
  const addImportHistory = useStore(s => s.addImportHistory)
  const importHistory   = useStore(s => s.importHistory)

  const [targets, setTargets]           = useState<ReconTarget[]>([])
  const [loadingTargets, setLoadingTargets] = useState(false)
  const [preview, setPreview]           = useState<ImportPreviewRow[] | null>(null)
  const [importDone, setImportDone]     = useState<{ count: number; label: string } | null>(null)
  const [showManual, setShowManual]     = useState(false)
  const [statusMsg, setStatusMsg]       = useState('')

  async function refreshData() {
    const [creds, stats] = await Promise.all([
      window.electronAPI.getCredentials(),
      window.electronAPI.getStats()
    ])
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
      if (raw.length === 0) {
        setStatusMsg('No ReconDesk targets found in cybertools-config.json')
      } else {
        // Build preview rows
        const rows: ImportPreviewRow[] = []
        for (const t of raw) {
          for (const rc of (t.credentials ?? [])) {
            rows.push({
              selected: true,
              sourceTarget: t.name,
              credential: {
                username:   rc.username ?? '(unknown)',
                password:   rc.password,
                hash:       rc.hash,
                hashType:   rc.type,
                service:    rc.service ?? 'Unknown',
                source:     'ReconDesk import',
                targetName: t.name,
                ip:         t.ip,
                tags:       [],
                notes:      rc.notes,
                verified:   false,
                status:     'active',
              }
            })
          }
        }
        setPreview(rows)
        if (rows.length === 0) setStatusMsg('No credentials found on any ReconDesk target.')
      }
    } catch (e) {
      setStatusMsg(`Error: ${(e as Error).message}`)
    }
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

  function toggleRow(idx: number) {
    setPreview(prev => prev ? prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r) : prev)
  }

  function toggleAll(val: boolean) {
    setPreview(prev => prev ? prev.map(r => ({ ...r, selected: val })) : prev)
  }

  async function handleManualAdd(data: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>) {
    await window.electronAPI.addCredential(data)
    setShowManual(false)
    await refreshData()
  }

  const selectedCount = preview?.filter(r => r.selected).length ?? 0

  return (
    <div style={{ padding: 24, maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>Import Credentials</h2>

      {/* Import from ReconDesk */}
      <Section title="Import from ReconDesk">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <button className="btn btn-ghost" onClick={loadReconTargets} disabled={loadingTargets}>
            {loadingTargets ? 'Loading…' : 'Scan ReconDesk targets'}
          </button>
          {targets.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {targets.length} target{targets.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {statusMsg && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>{statusMsg}</div>
        )}

        {importDone && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(63,185,80,0.1)',
            border: '1px solid rgba(63,185,80,0.25)',
            borderRadius: 6,
            fontSize: 12,
            color: 'var(--success)',
            marginBottom: 10
          }}>
            Imported {importDone.count} credential{importDone.count !== 1 ? 's' : ''} successfully.
          </div>
        )}

        {preview && preview.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {selectedCount} of {preview.length} selected
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => toggleAll(true)}>All</button>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => toggleAll(false)}>None</button>
                <button
                  className="btn btn-accent"
                  style={{ fontSize: 12 }}
                  disabled={selectedCount === 0}
                  onClick={doImport}
                >
                  Import Selected ({selectedCount})
                </button>
              </div>
            </div>

            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 6,
              overflow: 'hidden',
              maxHeight: 300,
              overflowY: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                    <th style={thStyle}></th>
                    <th style={thStyle}>Target</th>
                    <th style={thStyle}>Username</th>
                    <th style={thStyle}>Service</th>
                    <th style={thStyle}>Has Password</th>
                    <th style={thStyle}>Has Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr
                      key={i}
                      onClick={() => toggleRow(i)}
                      style={{
                        cursor: 'pointer',
                        background: row.selected ? 'rgba(247,129,102,0.04)' : 'transparent',
                        borderBottom: '1px solid var(--border)',
                        opacity: row.selected ? 1 : 0.45
                      }}
                    >
                      <td style={tdStyle}>
                        <input type="checkbox" checked={row.selected} onChange={() => toggleRow(i)} onClick={e => e.stopPropagation()} />
                      </td>
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

      {/* Manual Add */}
      <Section title="Manual Add">
        <button className="btn btn-ghost" onClick={() => setShowManual(true)}>
          + Add Credential Manually
        </button>
      </Section>

      {/* Import History */}
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

      {showManual && (
        <CredentialModal
          onSave={handleManualAdd}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden'
    }}>
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
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

const thStyle: CSSProperties = {
  padding: '7px 12px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 500,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

const tdStyle: CSSProperties = {
  padding: '7px 12px',
  fontSize: 12,
  color: 'var(--text)'
}
