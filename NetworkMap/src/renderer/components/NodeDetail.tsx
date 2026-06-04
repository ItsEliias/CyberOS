// NetworkMap — NodeDetail.tsx  (tabbed: Ports | Port Timeline | Vulns | ReconDesk)
import { useState } from 'react'
import type { NetworkNode } from '@shared/types'
import { osIcon } from '../lib/nmapParser'

interface Props {
  node: NetworkNode
  onClose: () => void
  allScans?: { scanName: string; nodes: NetworkNode[] }[]
  onAnnotate?: (text: string) => void
}

type Tab = 'ports' | 'timeline' | 'vulns' | 'recondesk'

function stateColor(state: string): string {
  if (state === 'open')     return 'var(--success)'
  if (state === 'filtered') return 'var(--warning)'
  return 'var(--text-muted)'
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(console.error)
}

// ─── Port Timeline Tab ────────────────────────────────────────────────────────
function PortTimeline({ node, allScans }: { node: NetworkNode; allScans: { scanName: string; nodes: NetworkNode[] }[] }) {
  const scans = allScans.filter(s => s.nodes.some(n => n.id === node.id))
  if (scans.length === 0) {
    return <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: 8 }}>No multi-scan timeline data available. Import multiple scans to compare.</p>
  }

  const allPorts = new Set<number>()
  for (const s of scans) {
    const n = s.nodes.find(nd => nd.id === node.id)
    n?.ports.forEach(p => allPorts.add(p.port))
  }
  const sortedPorts = Array.from(allPorts).sort((a, b) => a - b)

  function cellColor(state: string | undefined): string {
    if (state === 'open') return 'rgba(63,185,80,0.6)'
    if (state === 'filtered' || state === 'closed') return 'rgba(248,81,73,0.5)'
    return 'rgba(139,148,158,0.2)'
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 10, minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={thStyle}>PORT</th>
            {scans.map(s => <th key={s.scanName} style={thStyle}>{s.scanName.slice(0, 10)}</th>)}
          </tr>
        </thead>
        <tbody>
          {sortedPorts.map(port => (
            <tr key={port}>
              <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{port}</td>
              {scans.map(s => {
                const n = s.nodes.find(nd => nd.id === node.id)
                const p = n?.ports.find(pp => pp.port === port)
                return (
                  <td key={s.scanName} style={{ ...tdStyle, background: cellColor(p?.state), width: 32 }}>
                    {p ? p.state[0].toUpperCase() : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Vulns Tab ────────────────────────────────────────────────────────────────
function VulnsTab({ node }: { node: NetworkNode }) {
  const vulns = node.vulns ?? []
  if (vulns.length === 0) {
    return <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: 8 }}>No vulnerability data loaded for this host. Use "Import Vulns" in the toolbar.</p>
  }

  function sevColor(s: string): string {
    if (s === 'critical') return '#f85149'
    if (s === 'high')     return '#d29922'
    if (s === 'medium')   return '#e8b84b'
    if (s === 'low')      return '#3fb950'
    return '#8b949e'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {vulns.map((v, i) => (
        <div key={i} style={{
          padding: '8px 10px', borderRadius: 6,
          border: `1px solid ${sevColor(v.severity)}44`,
          background: `${sevColor(v.severity)}0a`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: sevColor(v.severity), textTransform: 'uppercase' }}>
              {v.severity}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {v.cves.map(cve => (
              <span key={cve} style={{
                fontSize: 10, fontFamily: 'monospace', padding: '1px 6px', borderRadius: 3,
                background: 'rgba(139,148,158,0.15)', color: 'var(--text-dim)',
              }}>{cve}</span>
            ))}
          </div>
          {v.description && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{v.description}</div>}
        </div>
      ))}
    </div>
  )
}

// ─── Main NodeDetail ──────────────────────────────────────────────────────────
export default function NodeDetail({ node, onClose, allScans = [], onAnnotate }: Props) {
  const openPorts = node.ports.filter(p => p.state === 'open')
  const [rdMsg, setRdMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [tab, setTab] = useState<Tab>('ports')
  const [annotationDraft, setAnnotationDraft] = useState(node.annotation ?? '')

  async function handlePushToReconDesk() {
    const payload = {
      ip: node.ip,
      ports: node.ports.map(p => ({
        number: p.port, protocol: p.protocol,
        service: p.service, version: p.version, state: p.state,
      })),
    }
    const result = await window.electronAPI.pushToReconDesk(payload)
    if (result.ok) {
      setRdMsg({ text: `${result.portsAdded} port(s) added to "${result.targetName}"`, ok: true })
    } else {
      setRdMsg({ text: result.reason ?? 'Unknown error', ok: false })
    }
    setTimeout(() => setRdMsg(null), 3500)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ports', label: 'Ports' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'vulns', label: `Vulns${node.vulns?.length ? ` (${node.vulns.length})` : ''}` },
    { id: 'recondesk', label: 'Actions' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 12px',
        background: 'rgba(210,153,34,0.06)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em' }}>HOST DETAIL</span>
        <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>×</button>
      </div>

      {/* Identity block */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{node.ip}</span>
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: node.status === 'up' ? 'rgba(63,185,80,0.12)' : 'rgba(139,148,158,0.12)',
            color: node.status === 'up' ? 'var(--success)' : 'var(--text-muted)',
            border: `1px solid ${node.status === 'up' ? 'rgba(63,185,80,0.25)' : 'rgba(139,148,158,0.2)'}`,
          }}>{node.status}</span>
        </div>
        {node.hostname && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{node.hostname}</div>}
        {node.os && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>{osIcon(node.os)}</span>
            <span>{node.os}{node.osAccuracy ? ` (${node.osAccuracy}%)` : ''}</span>
          </div>
        )}
        {node.annotation && (
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--accent)', fontStyle: 'italic' }}>
            {node.annotation}
          </div>
        )}
      </div>

      {/* Annotation input */}
      {onAnnotate && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <input
            value={annotationDraft}
            onChange={e => setAnnotationDraft(e.target.value)}
            onBlur={() => onAnnotate(annotationDraft)}
            placeholder="Add annotation..."
            style={{
              width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '4px 8px', color: 'var(--text)', fontSize: 11,
            }}
          />
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '7px 4px', fontSize: 10, fontWeight: 500,
              background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {tab === 'ports' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <ActionBtn onClick={() => copyToClipboard(node.ip)}>Copy IP</ActionBtn>
              <ActionBtn onClick={() => {
                const line = `${node.ip}${node.hostname ? ` (${node.hostname})` : ''} — ${openPorts.map(p => `${p.port}/${p.protocol}`).join(', ')}`
                copyToClipboard(line)
              }}>Copy line</ActionBtn>
            </div>
            {node.ports.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No port data</p>
            ) : (
              <>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>
                  PORTS ({node.ports.length})
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {(['PORT', 'SERVICE', 'STATE'] as const).map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', paddingBottom: 5, borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {node.ports.map(p => (
                      <tr key={`${p.port}-${p.protocol}`}>
                        <td style={{ padding: '4px 0', fontFamily: 'monospace', fontSize: 11, color: 'var(--text)' }}>{p.port}/{p.protocol}</td>
                        <td style={{ padding: '4px 4px', fontSize: 11, color: 'var(--text-dim)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.service || '—'}</td>
                        <td style={{ padding: '4px 0', fontSize: 11, color: stateColor(p.state) }}>{p.state}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
        {tab === 'timeline' && <PortTimeline node={node} allScans={allScans} />}
        {tab === 'vulns' && <VulnsTab node={node} />}
        {tab === 'recondesk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ActionBtn onClick={handlePushToReconDesk}>Add to ReconDesk</ActionBtn>
            {rdMsg && (
              <div style={{
                fontSize: 11, padding: '5px 8px', borderRadius: 5,
                background: rdMsg.ok ? 'rgba(63,185,80,0.10)' : 'rgba(255,68,68,0.10)',
                border: `1px solid ${rdMsg.ok ? 'rgba(63,185,80,0.25)' : 'rgba(255,68,68,0.25)'}`,
                color: rdMsg.ok ? 'var(--success)' : 'var(--error)',
              }}>{rdMsg.text}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 10px', borderRadius: 5,
      background: 'var(--bg)', border: '1px solid var(--border)',
      color: 'var(--text-dim)', fontSize: 11,
    }}>{children}</button>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)',
  letterSpacing: '0.05em', paddingBottom: 4, borderBottom: '1px solid var(--border)',
  padding: '3px 4px',
}

const tdStyle: React.CSSProperties = {
  padding: '3px 4px', fontSize: 10, color: 'var(--text-dim)',
  textAlign: 'center', borderBottom: '1px solid rgba(42,51,71,0.3)',
}
