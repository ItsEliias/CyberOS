// NetworkMap — NodeDetail.tsx — Glass panel host detail (UI redesign, logic unchanged)
import { useState } from 'react'
import type { NetworkNode } from '@shared/types'
import { OsIcon, ProtoBadge, HighlightText, thStyle } from './NodeDetailParts'
import { PortTimeline, VulnsTab } from './NodeDetailTabs'

interface Props {
  node: NetworkNode
  onClose: () => void
  allScans?: { scanName: string; nodes: NetworkNode[] }[]
  onAnnotate?: (text: string) => void
  searchQuery?: string
}

type Tab = 'ports' | 'timeline' | 'vulns' | 'recondesk'

function stateColor(state: string): string {
  if (state === 'open')     return '#3fb950'
  if (state === 'filtered') return '#d29922'
  return '#484f58'
}

function stateBg(state: string): string {
  if (state === 'open')     return 'rgba(63,185,80,0.08)'
  if (state === 'filtered') return 'rgba(210,153,34,0.08)'
  return 'rgba(72,79,88,0.08)'
}

function stateBorder(state: string): string {
  if (state === 'open')     return 'rgba(63,185,80,0.22)'
  if (state === 'filtered') return 'rgba(210,153,34,0.22)'
  return 'rgba(72,79,88,0.22)'
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(console.error)
}

// Common port service names
const PORT_NAMES: Record<number, string> = {
  21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
  67: 'DHCP', 68: 'DHCP', 69: 'TFTP', 80: 'HTTP', 110: 'POP3',
  111: 'RPC', 123: 'NTP', 135: 'MSRPC', 137: 'NetBIOS', 138: 'NetBIOS',
  139: 'NetBIOS', 143: 'IMAP', 161: 'SNMP', 389: 'LDAP', 443: 'HTTPS',
  445: 'SMB', 465: 'SMTPS', 500: 'IKE', 514: 'Syslog', 515: 'LPD',
  587: 'SMTP', 631: 'IPP', 636: 'LDAPS', 993: 'IMAPS', 995: 'POP3S',
  1080: 'SOCKS', 1194: 'OpenVPN', 1433: 'MSSQL', 1521: 'Oracle',
  1723: 'PPTP', 2049: 'NFS', 2181: 'Zookeeper', 3306: 'MySQL',
  3389: 'RDP', 4444: 'Metasploit', 4899: 'Radmin', 5432: 'PostgreSQL',
  5900: 'VNC', 5985: 'WinRM', 6379: 'Redis', 6443: 'K8s API',
  8080: 'HTTP-Alt', 8443: 'HTTPS-Alt', 8888: 'HTTP-Dev', 9200: 'Elasticsearch',
  27017: 'MongoDB', 11211: 'Memcached',
}

function getServiceName(port: number, service?: string): string {
  if (service && service !== 'unknown') return service
  return PORT_NAMES[port] ?? '—'
}

// ─── Main NodeDetail ──────────────────────────────────────────────────────────
export default function NodeDetail({ node, onClose, allScans = [], onAnnotate, searchQuery = '' }: Props) {
  const openPorts = node.ports.filter(p => p.state === 'open')
  const [rdMsg, setRdMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [tab, setTab] = useState<Tab>('ports')
  const [annotationDraft, setAnnotationDraft] = useState(node.annotation ?? '')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [copyHostnameFeedback, setCopyHostnameFeedback] = useState(false)

  function handleCopyHostname() {
    if (!node.hostname) return
    copyToClipboard(node.hostname)
    setCopyHostnameFeedback(true)
    setTimeout(() => setCopyHostnameFeedback(false), 1500)
  }

  function handleCopyIP() {
    copyToClipboard(node.ip)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 1500)
  }

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
            width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms var(--ease)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
        >×</button>
      </div>

      {/* Identity block */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(42,51,71,0.5)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          {/* IP + Copy IP inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
              <HighlightText text={node.ip} query={searchQuery} />
            </span>
            <button
              onClick={handleCopyIP}
              title="Copy IP address"
              style={{
                padding: '2px 7px', borderRadius: 8, fontSize: 10, cursor: 'pointer',
                background: copyFeedback ? 'rgba(63,185,80,0.12)' : 'rgba(42,51,71,0.3)',
                border: `1px solid ${copyFeedback ? 'rgba(63,185,80,0.35)' : 'rgba(42,51,71,0.6)'}`,
                color: copyFeedback ? '#3fb950' : 'var(--text-muted)',
                transition: 'all 150ms var(--ease)', fontFamily: 'var(--font-display)',
                display: 'flex', alignItems: 'center', gap: 3,
              }}
              onMouseEnter={e => {
                if (!copyFeedback) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,66,0.35)'
                  ;(e.currentTarget as HTMLElement).style.color = '#ff8c42'
                }
              }}
              onMouseLeave={e => {
                if (!copyFeedback) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.6)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                }
              }}
            >
              {copyFeedback ? (
                <>
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 5l2.5 2.5L8 3" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="4" y="4" width="8" height="8" rx="1.5" />
                    <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1" />
                  </svg>
                  Copy IP
                </>
              )}
            </button>
          </div>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
            background: statusOnline ? 'rgba(63,185,80,0.10)' : 'rgba(72,79,88,0.18)',
            color: statusOnline ? '#3fb950' : 'var(--text-muted)',
            border: `1px solid ${statusOnline ? 'rgba(63,185,80,0.28)' : 'rgba(72,79,88,0.35)'}`,
          }}>{node.status}</span>
        </div>
        {node.hostname && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              <HighlightText text={node.hostname} query={searchQuery} />
            </span>
            <button
              onClick={handleCopyHostname}
              title="Copy hostname"
              style={{
                flexShrink: 0, padding: '1px 5px', borderRadius: 6, fontSize: 9, cursor: 'pointer',
                background: copyHostnameFeedback ? 'rgba(63,185,80,0.12)' : 'rgba(42,51,71,0.3)',
                border: `1px solid ${copyHostnameFeedback ? 'rgba(63,185,80,0.35)' : 'rgba(42,51,71,0.6)'}`,
                color: copyHostnameFeedback ? '#3fb950' : 'var(--text-muted)',
                transition: 'all 150ms var(--ease)', fontFamily: 'var(--font-display)',
                display: 'flex', alignItems: 'center', gap: 2,
              }}
              onMouseEnter={e => { if (!copyHostnameFeedback) { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,66,0.35)'; (e.currentTarget as HTMLElement).style.color = '#ff8c42'; } }}
              onMouseLeave={e => { if (!copyHostnameFeedback) { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.6)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; } }}
            >
              {copyHostnameFeedback ? (
                <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 5l2.5 2.5L8 3" /></svg>
              ) : (
                <svg width="7" height="7" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="4" width="8" height="8" rx="1.5" />
                  <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1" />
                </svg>
              )}
            </button>
          </div>
        )}
        {node.os && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <OsIcon os={node.os} />
            <span>{node.os}{node.osAccuracy ? ` (${node.osAccuracy}%)` : ''}</span>
          </div>
        )}
        {searchQuery && (() => {
          const q = searchQuery.toLowerCase()
          const matchFields: string[] = []
          if (node.ip.includes(q)) matchFields.push('IP')
          if (node.hostname && node.hostname.toLowerCase().includes(q)) matchFields.push('hostname')
          if (node.ports.some(p => String(p.port).includes(q) || (p.service ?? '').toLowerCase().includes(q))) matchFields.push('ports')
          if (matchFields.length === 0) return null
          return (
            <div style={{
              marginTop: 5, display: 'flex', alignItems: 'center', gap: 4,
              animation: 'badgePop 0.18s var(--ease)',
            }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="#ff8c42" strokeWidth="1.5">
                <circle cx="4" cy="4" r="3" /><path d="M6.5 6.5l1.5 1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 9, color: 'rgba(255,140,66,0.7)', fontWeight: 600 }}>
                Match in {matchFields.join(', ')}
              </span>
            </div>
          )
        })()}
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
              borderRadius: 8, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 11,
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
              borderRadius: 0,
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
                <div style={{ overflowY: 'auto', maxHeight: 320, borderRadius: 6, border: '1px solid rgba(42,51,71,0.4)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(13,14,24,0.98)' }}>
                      <tr>
                        {(['PORT', 'PROTO', 'SERVICE', 'STATE'] as const).map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {node.ports.map(p => (
                        <tr key={`${p.port}-${p.protocol}`}
                          style={{ transition: 'background 100ms', background: stateBg(p.state) }}
                          onMouseEnter={e => (e.currentTarget.style.background = p.state === 'open' ? 'rgba(63,185,80,0.12)' : p.state === 'filtered' ? 'rgba(210,153,34,0.12)' : 'rgba(72,79,88,0.12)')}
                          onMouseLeave={e => (e.currentTarget.style.background = stateBg(p.state))}
                        >
                          <td style={{ padding: '5px 6px 5px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {p.port}
                          </td>
                          <td style={{ padding: '5px 4px' }}>
                            <ProtoBadge proto={p.protocol} service={p.service} />
                          </td>
                          <td style={{ padding: '5px 4px', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getServiceName(p.port, p.service)}
                          </td>
                          <td style={{ padding: '5px 8px 5px 4px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              fontSize: 10, fontWeight: p.state === 'open' ? 600 : 400,
                              color: stateColor(p.state),
                              background: `${stateColor(p.state)}12`,
                              border: `1px solid ${stateBorder(p.state)}`,
                              borderRadius: 8, padding: '1px 6px', whiteSpace: 'nowrap',
                            }}>
                              <span style={{
                                width: 5, height: 5, borderRadius: '50%',
                                background: stateColor(p.state),
                                boxShadow: p.state === 'open' ? `0 0 4px ${stateColor(p.state)}` : 'none',
                                flexShrink: 0,
                              }} />
                              {p.state}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <RiskAssessmentPanel node={node} />
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
                fontSize: 11, padding: '6px 10px', borderRadius: 8,
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

/** Risk score bar row — 0-10 scale */
function RiskRow({ label, score }: { label: string; score: number }) {
  const color =
    score >= 7 ? '#f85149' :
    score >= 4 ? '#d29922' :
    '#3fb950'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: '0 0 120px', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: 'rgba(42,51,71,0.45)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${score * 10}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius: 3,
          transition: 'width 0.4s ease',
          boxShadow: `0 0 6px ${color}50`,
        }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color, fontWeight: 600, flex: '0 0 20px', textAlign: 'right' }}>{score}</span>
    </div>
  )
}

/** Risk Assessment section derived from node data */
function RiskAssessmentPanel({ node }: { node: import('@shared/types').NetworkNode }) {
  const openCount = node.ports.filter(p => p.state === 'open').length
  // Port risk: >10 = 9, >5 = 6, >2 = 4, else proportional
  const portRisk = Math.min(10, openCount >= 10 ? 9 : openCount >= 5 ? 6 : openCount >= 2 ? 4 : openCount)
  // OS vulnerability: unknown OS = higher risk; Linux/Windows known = lower
  const osLower = (node.os ?? '').toLowerCase()
  const osRisk = !node.os ? 7 : osLower.includes('windows') ? 5 : osLower.includes('linux') ? 3 : 4
  // Service risk: presence of risky services
  const riskyServices = node.ports.filter(p => p.state === 'open' && [21, 23, 139, 445, 4444, 3389].includes(p.port))
  const serviceRisk = Math.min(10, riskyServices.length * 3 + (openCount > 0 ? 1 : 0))

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        Risk Assessment
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '10px 12px', background: 'rgba(13,14,24,0.6)', borderRadius: 8, border: '1px solid rgba(42,51,71,0.4)' }}>
        <RiskRow label="Open port exposure" score={portRisk} />
        <RiskRow label="OS vulnerability"   score={osRisk} />
        <RiskRow label="Service risk"       score={serviceRisk} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,140,66,0.5)' }}>
            scores 0–10 (mock estimate)
          </span>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px', borderRadius: 8,
        background: '#07080f', border: '1px solid rgba(42,51,71,0.75)',
        color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer',
        transition: 'all 150ms', fontFamily: 'var(--font-display)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,66,0.35)'; (e.currentTarget as HTMLElement).style.color = '#ff8c42' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(42,51,71,0.75)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
    >{children}</button>
  )
}

