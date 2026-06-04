// NetworkMap — NodeDetailParts.tsx — Presentational sub-components for NodeDetail
import type { CSSProperties } from 'react'
import type { NetworkNode } from '@shared/types'

// ─── OS SVG icons ─────────────────────────────────────────────────────────────
export function OsIcon({ os }: { os: string | undefined }) {
  if (!os) {
    return (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.55, flexShrink: 0 }}>
        <circle cx="6.5" cy="6.5" r="5.5" />
        <path d="M6.5 4.5v.5M6.5 7v2.5" strokeLinecap="round" />
        <circle cx="6.5" cy="5" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  const l = os.toLowerCase()
  if (l.includes('linux') || l.includes('ubuntu') || l.includes('debian') || l.includes('centos')) {
    return (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ opacity: 0.7, flexShrink: 0 }}>
        <ellipse cx="6.5" cy="8.5" rx="3.5" ry="3.5" />
        <ellipse cx="6.5" cy="4" rx="2" ry="2.5" />
        <ellipse cx="5.7" cy="8.4" rx="1.2" ry="1.8" fill="rgba(255,255,255,0.15)" stroke="none" />
        <circle cx="5.7" cy="3.5" r="0.5" fill="currentColor" stroke="none" />
        <circle cx="7.3" cy="3.5" r="0.5" fill="currentColor" stroke="none" />
        <path d="M5.2 5.5L4 7M7.8 5.5L9 7" strokeLinecap="round" />
      </svg>
    )
  }
  if (l.includes('windows')) {
    return (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ opacity: 0.7, flexShrink: 0 }}>
        <rect x="2" y="2" width="4" height="4" rx="0.5" />
        <rect x="7" y="2" width="4" height="4" rx="0.5" />
        <rect x="2" y="7" width="4" height="4" rx="0.5" />
        <rect x="7" y="7" width="4" height="4" rx="0.5" />
      </svg>
    )
  }
  if (l.includes('mac') || l.includes('osx') || l.includes('darwin')) {
    return (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ opacity: 0.7, flexShrink: 0 }}>
        <path d="M9.5 7.5c0 2-1.3 3.5-2.5 3.5S5 10.5 4.5 10.5C4 10.5 3 12 2 10.5c-1-1.5-.5-4.5 1-5.5.8-.5 1.5-.5 2-.5.6 0 1.1.5 1.5.5.4 0 1-.6 2-.5C9 4.5 9.5 5 9.5 7.5Z" />
        <path d="M6.5 3C6.5 1.5 8 1 8 1S7.5 3 6.5 3Z" strokeLinecap="round" />
      </svg>
    )
  }
  if (l.includes('cisco') || l.includes('router') || l.includes('switch')) {
    return (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ opacity: 0.7, flexShrink: 0 }}>
        <rect x="2" y="7" width="9" height="3" rx="1" />
        <circle cx="4.5" cy="8.5" r="0.7" fill="currentColor" stroke="none" />
        <circle cx="7" cy="8.5" r="0.7" fill="currentColor" stroke="none" />
        <path d="M6.5 7V4M5 5.5L6.5 4 8 5.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ opacity: 0.5, flexShrink: 0 }}>
      <circle cx="6.5" cy="6.5" r="5" />
      <path d="M5 5.2c0-1 .7-1.7 1.5-1.7S8 4.2 8 5.2c0 .8-.5 1.2-1 1.5S6.5 7.5 6.5 8" strokeLinecap="round" />
      <circle cx="6.5" cy="9.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

// ─── Protocol badge ────────────────────────────────────────────────────────────
export function ProtoBadge({ proto, service }: { proto: string; service?: string }) {
  const p = proto.toLowerCase()
  const isTls = service
    ? ['https', 'smtps', 'imaps', 'pop3s', 'ldaps', 'ftps'].some(s => service.toLowerCase().includes(s))
    : false
  const label  = isTls ? 'TLS' : p.toUpperCase().slice(0, 4)
  const color  = isTls ? '#3dccb0' : p === 'tcp' ? '#4a9eff' : p === 'udp' ? '#d29922' : '#8b949e'
  const bg     = isTls ? 'rgba(61,204,176,0.1)'  : p === 'tcp' ? 'rgba(74,158,255,0.1)'  : p === 'udp' ? 'rgba(210,153,34,0.1)'  : 'rgba(139,148,158,0.1)'
  const border = isTls ? 'rgba(61,204,176,0.3)'  : p === 'tcp' ? 'rgba(74,158,255,0.28)' : p === 'udp' ? 'rgba(210,153,34,0.28)' : 'rgba(139,148,158,0.25)'
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
      padding: '1px 5px', borderRadius: 4,
      background: bg, color, border: `1px solid ${border}`,
      fontFamily: 'var(--font-mono)', flexShrink: 0,
    }}>{label}</span>
  )
}

// ─── Shared table styles ──────────────────────────────────────────────────────
export const thStyle: CSSProperties = {
  textAlign: 'left', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.07em', padding: '3px 4px 5px', borderBottom: '1px solid rgba(42,51,71,0.5)',
  textTransform: 'uppercase',
}

export const tdStyle: CSSProperties = {
  padding: '3px 4px', fontSize: 10, color: 'var(--text-secondary)',
  textAlign: 'center', borderBottom: '1px solid rgba(42,51,71,0.25)',
}

// ─── Risk score bar row ───────────────────────────────────────────────────────
function RiskRow({ label, score }: { label: string; score: number }) {
  const color = score >= 7 ? '#f85149' : score >= 4 ? '#d29922' : '#3fb950'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: '#8b949e', flex: '0 0 120px', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: 'rgba(42,51,71,0.45)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${score * 10}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius: 3, transition: 'width 0.4s ease', boxShadow: `0 0 6px ${color}50`,
        }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color, fontWeight: 600, flex: '0 0 20px', textAlign: 'right' }}>{score}</span>
    </div>
  )
}

// ─── Risk Assessment panel ────────────────────────────────────────────────────
export function RiskAssessmentPanel({ node }: { node: NetworkNode }) {
  const openCount = node.ports.filter(p => p.state === 'open').length
  const portRisk = Math.min(10, openCount >= 10 ? 9 : openCount >= 5 ? 6 : openCount >= 2 ? 4 : openCount)
  const osLower = (node.os ?? '').toLowerCase()
  const osRisk = !node.os ? 7 : osLower.includes('windows') ? 5 : osLower.includes('linux') ? 3 : 4
  const riskyServices = node.ports.filter(p => p.state === 'open' && [21, 23, 139, 445, 4444, 3389].includes(p.port))
  const serviceRisk = Math.min(10, riskyServices.length * 3 + (openCount > 0 ? 1 : 0))
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#8b949e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        Risk Assessment
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '10px 12px', background: 'rgba(13,14,24,0.6)', borderRadius: 8, border: '1px solid rgba(42,51,71,0.4)' }}>
        <RiskRow label="Open port exposure" score={portRisk} />
        <RiskRow label="OS vulnerability"   score={osRisk} />
        <RiskRow label="Service risk"       score={serviceRisk} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
          <span style={{ fontSize: 9, color: 'rgba(210,153,34,0.5)' }}>scores 0–10 (mock estimate)</span>
        </div>
      </div>
    </div>
  )
}

// ─── Highlight match in text ──────────────────────────────────────────────────
export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{
        background: 'rgba(255,140,66,0.28)', color: '#ff8c42',
        borderRadius: 2, padding: '0 1px',
      }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
