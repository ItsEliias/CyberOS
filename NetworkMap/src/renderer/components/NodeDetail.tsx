// NetworkMap — NodeDetail.tsx — Glass panel host detail (UI redesign, logic unchanged)
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
  if (state === 'open')     return '#3fb950'
  if (state === 'filtered') return '#d29922'
  return 'var(--text-muted)'
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(console.error)
}

// ─── Port Timeline ─────────────────────────────────────────────────────────────
function PortTimeline({ node, allScans }: { node: NetworkNode; allScans: { scanName: string; nodes: NetworkNode[] }[] }) {
  const scans = allScans.filter(s => s.nodes.some(n => n.id === node.id))
  if (scans.length === 0) {
    return (
      <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: 8 }}>
        No multi-scan timeline data. Import multiple scans to compare.
      </p>
    )
  }

  const allPorts = new Set<number>()
  for (const s of scans) {
    s.nodes.find(nd => nd.id === node.id)?.ports.forEach(p => allPorts.add(p.port))
  }
  const sortedPorts = Array.from(allPorts).sort((a, b) => a - b)

  function cellColor(state: string | undefined): string {
    if (state === 'open')     return 'rgba(63,185,80,0.55)'
    if (state === 'filtered' || state === 'closed') return 'rgba(248,81,73,0.45)'
    return 'rgba(139,148,158,0.15)'
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
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{port}</td>
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
    return (
      <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: 8 }}>
        No vulnerability data loaded. Use "Import Vulns" in the toolbar.
      </p>
    )
  }

  function sevColor(s: string): string {
    if (s === 'critical') return '#f85149'
    if (s === 'high')     return '#ff8c42'
    if (s === 'medium')   return '#d29922'
    if (s === 'low')      return '#3fb950'
    return '#8b949e'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {vulns.map((v, i) => (
        <div key={i} style={{
          padding: '8px 10px', borderRadius: 8,
          border: `1px solid ${sevColor(v.severity)}38`,
          background: `${sevColor(v.severity)}09`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              color: sevColor(v.severity), textTransform: 'uppercase',
              background: `${sevColor(v.severity)}18`,
              border: `1px solid ${sevColor(v.severity)}35`,
              borderRadius: 4, padding: '1px 6px',
            }}>{v.severity}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {v.cves.map(cve => (
              <span key={cve} style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4,
                background: 'rgba(139,148,158,0.12)', color: 'var(--text-secondary)',
                border: '1px solid rgba(42,51,71,0.5)',
              }}>{cve}</span>
            ))}
          </div>
          {v.description && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{v.description}</div>
          )}
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

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'ports',     label: 'Ports' },
    { id: 'timeline',  label: 'Timeline' },
    { id: 'vulns',     label: 'Vulns', count: node.vulns?.length },
    { id: 'recondesk', label: 'Actions' },
  ]

  const statusOnline = node.status === 'up'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'rgba(13,14,24,0.99)', borderLeft: '1px solid rgba(255,255,255,0.04)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '11px 14px', flexShrink: 0,
        background: 'linear-gradient(90deg, rgba(255,140,66,0.06) 0%, rgba(255,140,66,0.02) 60%, transparent 100%)',
        borderBottom: '1px solid rgba(255,140,66,0.10)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle shimmer line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,140,66,0.4) 50%, transparent 100%)',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 2, height: 16, borderRadius: 1, background: 'linear-gradient(180deg, #ff8c42, rgba(255,140,66,0.3))', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#ff8c42', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Host Detail
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
            width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms var(--ease)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
        >×</button>
      </div>

      {/* Identity block */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(42,51,71,0.5)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            {node.ip}
          </span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
            background: statusOnline ? 'rgba(63,185,80,0.10)' : 'rgba(72,79,88,0.18)',
            color: statusOnline ? '#3fb950' : 'var(--text-muted)',
            border: `1px solid ${statusOnline ? 'rgba(63,185,80,0.28)' : 'rgba(72,79,88,0.35)'}`,
          }}>{node.status}</span>
        </div>
        {node.hostname && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.hostname}
          </div>
        )}
        {node.os && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <span>{osIcon(node.os)}</span>
            <span>{node.os}{node.osAccuracy ? ` (${node.osAccuracy}%)` : ''}</span>
          </div>
        )}
        {node.annotation && (
          <div style={{ marginTop: 5, fontSize: 11, color: '#ff8c42', fontStyle: 'italic', opacity: 0.85 }}>
            {node.annotation}
          </div>
        )}
      </div>

      {/* Annotation input */}
      {onAnnotate && (
        <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(42,51,71,0.5)', flexShrink: 0 }}>
          <input
            value={annotationDraft}
            onChange={e => setAnnotationDraft(e.target.value)}
            onBlur={e => { onAnnotate(annotationDraft); e.currentTarget.style.borderColor = 'rgba(42,51,71,0.75)' }}
            placeholder="Add annotation…"
            style={{
              width: '100%', background: '#07080f', border: '1px solid rgba(42,51,71,0.75)',
              borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 11,
              fontFamily: 'var(--font-display)', transition: 'border-color 150ms',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,140,66,0.4)')}
          />
        </div>
      )}

      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid rgba(42,51,71,0.5)',
        flexShrink: 0, padding: '0 6px', gap: 0,
        background: 'rgba(13,14,24,0.98)',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '8px 4px', fontSize: 10, fontWeight: tab === t.id ? 600 : 400,
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${tab === t.id ? '#ff8c42' : 'transparent'}`,
              color: tab === t.id ? '#ff8c42' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 180ms var(--ease)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
            }}
            onMouseEnter={e => { if (tab !== t.id) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { if (tab !== t.id) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                key={t.count}
                className="badge-animate"
                style={{
                  fontSize: 9,
                  background: tab === t.id ? 'rgba(255,140,66,0.18)' : 'rgba(42,51,71,0.45)',
                  color: tab === t.id ? '#ff8c42' : '#484f58',
                  borderRadius: 5, padding: '0 5px',
                  transition: 'all 180ms var(--ease)',
                }}
              >{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {tab === 'ports' && (
          <>
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
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
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
                  Ports ({node.ports.length})
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {(['PORT', 'SERVICE', 'STATE'] as const).map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {node.ports.map(p => (
                      <tr key={`${p.port}-${p.protocol}`} style={{ transition: 'background 100ms' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '4px 0', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)' }}>
                          {p.port}/{p.protocol}
                        </td>
                        <td style={{ padding: '4px 4px', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.service || '—'}
                        </td>
                        <td style={{ padding: '4px 0', fontSize: 11, color: stateColor(p.state), fontWeight: p.state === 'open' ? 600 : 400 }}>
                          {p.state}
                        </td>
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
                fontSize: 11, padding: '6px 10px', borderRadius: 6,
                background: rdMsg.ok ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)',
                border: `1px solid ${rdMsg.ok ? 'rgba(63,185,80,0.25)' : 'rgba(248,81,73,0.25)'}`,
                color: rdMsg.ok ? '#3fb950' : '#f85149',
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
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px', borderRadius: 6,
        background: '#07080f', border: '1px solid rgba(42,51,71,0.75)',
        color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer',
        transition: 'all 150ms', fontFamily: 'var(--font-display)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,66,0.35)'; (e.currentTarget as HTMLElement).style.color = '#ff8c42' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.75)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
    >{children}</button>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.07em', padding: '3px 4px 5px', borderBottom: '1px solid rgba(42,51,71,0.5)',
  textTransform: 'uppercase',
}

const tdStyle: React.CSSProperties = {
  padding: '3px 4px', fontSize: 10, color: 'var(--text-secondary)',
  textAlign: 'center', borderBottom: '1px solid rgba(42,51,71,0.25)',
}
