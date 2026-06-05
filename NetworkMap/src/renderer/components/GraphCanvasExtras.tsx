// NetworkMap — GraphCanvasExtras.tsx — FloatingLegend and EmptyState presentational components

// ─── Floating graph legend ─────────────────────────────────────────────────
export function GraphLegend() {
  const entries = [
    { color: '#3fb950', label: '1–2 open ports',  dotGlow: true },
    { color: '#d29922', label: '3–5 open ports',  dotGlow: true },
    { color: '#f85149', label: '6+ open ports',   dotGlow: true },
    { color: '#484f58', label: 'Host down',        dotGlow: false },
    { color: '#ff8c42', label: 'No open ports',   dotGlow: false },
  ]
  return (
    <div style={{
      position: 'absolute', bottom: 208, right: 16, zIndex: 19,
      background: 'rgba(13,14,24,0.93)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
      backdropFilter: 'blur(12px)',
      padding: '8px 12px 10px',
      minWidth: 148,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8,
        borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 5,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,140,66,0.5)', flexShrink: 0 }} />
        <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: '#8b949e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          legend
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {entries.map(e => (
          <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: e.color,
              boxShadow: e.dotGlow ? `0 0 5px ${e.color}70` : 'none',
            }} />
            <span style={{ fontSize: 9, color: '#e2e8f0', lineHeight: 1 }}>{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Canvas empty state ────────────────────────────────────────────────────
export function CanvasEmptyState({ savedCount }: { savedCount: number }) {
  return (
    <div className="fade-up" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 16,
    }}>
      <svg width="96" height="80" viewBox="0 0 96 80" fill="none" aria-hidden="true">
        <defs>
          <filter id="cGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="cBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,140,66,0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <ellipse cx="48" cy="40" rx="44" ry="36" fill="url(#cBg)" />
        <circle cx="48" cy="40" r="28" stroke="rgba(255,140,66,0.12)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
        <circle cx="48" cy="14" r="7" fill="rgba(42,51,71,0.4)" stroke="rgba(42,51,71,0.7)" strokeWidth="1.5" />
        <circle cx="22" cy="50" r="6" fill="rgba(42,51,71,0.3)" stroke="rgba(42,51,71,0.6)" strokeWidth="1.5" />
        <circle cx="74" cy="50" r="6" fill="rgba(42,51,71,0.3)" stroke="rgba(42,51,71,0.6)" strokeWidth="1.5" />
        <circle cx="48" cy="66" r="5" fill="rgba(42,51,71,0.25)" stroke="rgba(42,51,71,0.5)" strokeWidth="1.5" />
        <line x1="48" y1="21" x2="22" y2="44" stroke="rgba(42,51,71,0.35)" strokeWidth="1" strokeDasharray="2 3" />
        <line x1="48" y1="21" x2="74" y2="44" stroke="rgba(42,51,71,0.35)" strokeWidth="1" strokeDasharray="2 3" />
        <line x1="22" y1="56" x2="48" y2="61" stroke="rgba(42,51,71,0.25)" strokeWidth="1" strokeDasharray="2 3" />
        <line x1="74" y1="56" x2="48" y2="61" stroke="rgba(42,51,71,0.25)" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="48" cy="40" r="12" fill="rgba(255,140,66,0.04)" stroke="rgba(255,140,66,0.2)" strokeWidth="1.5" filter="url(#cGlow)" />
        <line x1="48" y1="35" x2="48" y2="45" stroke="rgba(255,140,66,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="43" y1="40" x2="53" y2="40" stroke="rgba(255,140,66,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Empty graph</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Go back to the library and import nodes</p>
      </div>
      {savedCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(255,140,66,0.06)',
          border: '1px solid rgba(255,140,66,0.18)',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="rgba(255,140,66,0.7)" strokeWidth="1.2" fill="none" />
            <circle cx="5" cy="5" r="1.5" fill="rgba(255,140,66,0.7)" />
          </svg>
          <span style={{ fontSize: 10, color: 'rgba(255,140,66,0.7)', fontVariantNumeric: 'tabular-nums' }}>
            You have <span style={{ fontWeight: 700, color: '#ff8c42' }}>{savedCount}</span> saved {savedCount === 1 ? 'graph' : 'graphs'} — switch from the sidebar
          </span>
        </div>
      )}
    </div>
  )
}
