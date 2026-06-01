// NetworkMap — NodeDetail.tsx
import { useState } from 'react'
import type { NetworkNode } from '@shared/types'

interface Props {
  node: NetworkNode
  onClose: () => void
}

function stateColor(state: string): string {
  if (state === 'open')     return 'var(--success)'
  if (state === 'filtered') return 'var(--warning)'
  return 'var(--text-muted)'
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(console.error)
}

export default function NodeDetail({ node, onClose }: Props) {
  const openPorts = node.ports.filter(p => p.state === 'open')
  const [rdMsg, setRdMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function handlePushToReconDesk() {
    const payload = {
      ip: node.ip,
      ports: node.ports.map(p => ({
        number:   p.port,
        protocol: p.protocol,
        service:  p.service,
        version:  p.version,
        state:    p.state,
      })),
    }
    const result = await window.electronAPI.pushToReconDesk(payload)
    if (result.ok) {
      setRdMsg({ text: `${result.portsAdded} port${result.portsAdded === 1 ? '' : 's'} added to ReconDesk target "${result.targetName}"`, ok: true })
    } else {
      setRdMsg({ text: result.reason ?? 'Unknown error', ok: false })
    }
    setTimeout(() => setRdMsg(null), 3500)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 0,
      borderTop: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 12px',
        background: 'rgba(210,153,34,0.06)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em' }}>
          HOST DETAIL
        </span>
        <button
          onClick={onClose}
          style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}
        >×</button>
      </div>

      <div style={{ padding: '12px', overflow: 'auto' }}>
        {/* IP + status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {node.ip}
          </span>
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: node.status === 'up' ? 'rgba(63,185,80,0.12)' : 'rgba(139,148,158,0.12)',
            color: node.status === 'up' ? 'var(--success)' : 'var(--text-muted)',
            border: `1px solid ${node.status === 'up' ? 'rgba(63,185,80,0.25)' : 'rgba(139,148,158,0.2)'}`,
          }}>
            {node.status}
          </span>
        </div>

        {node.hostname && (
          <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 4 }}>
            {node.hostname}
          </div>
        )}
        {node.os && (
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 10 }}>
            {node.os}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <ActionBtn onClick={() => copyToClipboard(node.ip)}>Copy IP</ActionBtn>
          <ActionBtn onClick={() => {
            const line = `${node.ip}${node.hostname ? ` (${node.hostname})` : ''} — ${openPorts.map(p => `${p.port}/${p.protocol}`).join(', ')}`
            copyToClipboard(line)
          }}>Copy nmap line</ActionBtn>
        </div>

        {/* Ports */}
        {node.ports.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>No port data</p>
        ) : (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>
              PORTS ({node.ports.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {(['PORT', 'SERVICE', 'STATE'] as const).map(h => (
                    <th key={h} style={{
                      textAlign: 'left', fontSize: 9, fontWeight: 600,
                      color: 'var(--text-muted)', letterSpacing: '0.05em',
                      paddingBottom: 5, borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {node.ports.map(p => (
                  <tr key={`${p.port}-${p.protocol}`}>
                    <td style={{ padding: '4px 0', fontFamily: 'monospace', fontSize: 11, color: 'var(--text)' }}>
                      {p.port}/{p.protocol}
                    </td>
                    <td style={{ padding: '4px 4px', fontSize: 11, color: 'var(--text-dim)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.service || '—'}
                    </td>
                    <td style={{ padding: '4px 0', fontSize: 11, color: stateColor(p.state) }}>
                      {p.state}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ReconDesk push */}
        {node.ports.length > 0 && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <ActionBtn onClick={handlePushToReconDesk}>Add to ReconDesk</ActionBtn>
            {rdMsg && (
              <div style={{
                marginTop: 8, fontSize: 11, padding: '5px 8px', borderRadius: 5,
                background: rdMsg.ok ? 'rgba(63,185,80,0.10)' : 'rgba(255,68,68,0.10)',
                border: `1px solid ${rdMsg.ok ? 'rgba(63,185,80,0.25)' : 'rgba(255,68,68,0.25)'}`,
                color: rdMsg.ok ? 'var(--success)' : 'var(--error)',
              }}>
                {rdMsg.text}
              </div>
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
        padding: '5px 10px',
        borderRadius: 5,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        color: 'var(--text-dim)',
        fontSize: 11,
      }}
    >
      {children}
    </button>
  )
}
