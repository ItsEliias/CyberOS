// NetworkMap — NodeDetailParts.tsx — Presentational sub-components for NodeDetail
import type { CSSProperties } from 'react'

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
