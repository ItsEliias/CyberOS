// ReconDesk — OverviewTab sub-panels (split for 500-line limit)

// ─── Screenshots Panel ────────────────────────────────────────────────────────

interface ScreenshotsPanelProps {
  screenshots: any[]
  busy: boolean
  panelCls: string
  labelCls: string
  onCapture: () => void
  onView: (src: string) => void
}

export function ScreenshotsPanel({ screenshots, busy, panelCls, labelCls, onCapture, onView }: ScreenshotsPanelProps) {
  return (
    <div className={`${panelCls} mb-4`}>
      <div className="flex items-center justify-between mb-3">
        <p className={labelCls} style={{ color: '#484f58', marginBottom: 0 }}>Screenshots</p>
        <button
          onClick={onCapture} disabled={busy}
          className="text-[10px] px-2.5 py-1 rounded border border-[rgba(210,153,34,0.25)] bg-[rgba(210,153,34,0.07)] text-[#d29922] hover:bg-[rgba(210,153,34,0.15)] transition-colors disabled:opacity-40"
        >
          {busy ? 'Capturing...' : '+ Screenshot'}
        </button>
      </div>
      {screenshots.length === 0 ? (
        <p className="text-xs" style={{ color: '#484f58' }}>No screenshots yet. Click to capture the current screen.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {screenshots.map(sc => (
            <button key={sc.id} onClick={() => onView(sc.thumbnail ?? sc.path)} className="group relative rounded overflow-hidden border border-[rgba(42,51,71,0.6)] hover:border-[rgba(210,153,34,0.30)] transition-colors">
              {sc.thumbnail
                ? <img src={sc.thumbnail} alt={sc.label} className="w-24 h-16 object-cover" />
                : <div className="w-24 h-16 flex items-center justify-center text-[10px]" style={{ background: 'rgba(42,51,71,0.40)', color: '#484f58' }}>Screenshot</div>
              }
              <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity truncate" style={{ background: 'rgba(0,0,0,0.7)', color: '#8b949e' }}>{sc.label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AI Suggestions Panel ─────────────────────────────────────────────────────

interface AiSuggestionsPanelProps {
  panelCls: string
  labelCls: string
  hasKey: boolean
  loading: boolean
  suggestions: string[] | null
  expanded: boolean
  onToggle: () => void
  onFetch: () => void
  onAddPlaybook: (step: string) => void
}

export function AiSuggestionsPanel({
  panelCls, labelCls, hasKey, loading, suggestions, expanded, onToggle, onFetch, onAddPlaybook,
}: AiSuggestionsPanelProps) {
  return (
    <div className={panelCls}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className={labelCls} style={{ color: '#484f58', marginBottom: 0 }}>AI Suggestions</p>
          {!hasKey && (
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(72,79,88,0.10)', border: '1px solid rgba(72,79,88,0.25)', color: '#484f58' }}>
              API key required
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {suggestions && (
            <button onClick={onToggle} className="text-[10px] text-[#484f58] hover:text-[#8b949e] transition-colors">
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          <button
            onClick={onFetch} disabled={!hasKey || loading}
            className="text-[10px] px-2.5 py-1 rounded border border-[rgba(210,153,34,0.30)] bg-[rgba(210,153,34,0.10)] text-[#d29922] hover:bg-[rgba(210,153,34,0.18)] transition-colors disabled:opacity-40"
          >
            {loading ? 'Thinking...' : 'Suggest Next Steps'}
          </button>
        </div>
      </div>
      {expanded && suggestions && (
        <div className="flex flex-col gap-2 mt-2">
          {suggestions.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded group" style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.5)' }}>
              <span className="text-[10px] font-mono flex-shrink-0 mt-0.5" style={{ color: 'rgba(210,153,34,0.60)' }}>{String(i + 1).padStart(2, '0')}</span>
              <span className="text-xs flex-1 leading-relaxed" style={{ color: '#e6edf3' }}>{step}</span>
              <button onClick={() => onAddPlaybook(step)} className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded border bg-[rgba(210,153,34,0.10)] border-[rgba(210,153,34,0.25)] text-[#d29922] transition-all flex-shrink-0">
                + Playbook
              </button>
            </div>
          ))}
        </div>
      )}
      {!suggestions && !loading && hasKey && (
        <p className="text-[10px] text-[#484f58]">Click "Suggest Next Steps" to get AI-generated enumeration recommendations.</p>
      )}
    </div>
  )
}

// ─── Network Diagram ──────────────────────────────────────────────────────────

interface NetworkDiagramProps { ip: string; openPortCount: number; panelCls: string }

export function NetworkDiagram({ ip, openPortCount, panelCls }: NetworkDiagramProps) {
  const portLabel = openPortCount > 0 ? `${openPortCount} open ports` : 'no ports yet'
  return (
    <div className={`${panelCls} mb-4`}>
      <svg width="100%" height="54" viewBox="0 0 480 54" preserveAspectRatio="xMidYMid meet" className="overflow-visible">
        <line x1="148" y1="27" x2="332" y2="27" stroke="rgba(210,153,34,0.35)" strokeWidth="1.5" strokeDasharray="6 4" />
        <polygon points="332,27 322,22 322,32" fill="rgba(210,153,34,0.55)" />
        <g transform="translate(112,27)">
          <rect x="-14" y="-14" width="28" height="28" rx="3" transform="rotate(45)" fill="rgba(210,153,34,0.12)" stroke="rgba(210,153,34,0.55)" strokeWidth="1.5" />
          <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '8px', fill: 'rgba(210,153,34,0.9)', fontFamily: 'monospace' }}>YOU</text>
        </g>
        <g transform="translate(368,27)">
          <circle r="18" fill="rgba(42,51,71,0.4)" stroke="rgba(139,148,158,0.45)" strokeWidth="1.5" />
          <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '7px', fill: '#8b949e', fontFamily: 'monospace', fontWeight: 600 }}>TGT</text>
        </g>
        <text x="112" y="50" textAnchor="middle" style={{ fontSize: '9px', fill: 'rgba(210,153,34,0.6)', fontFamily: 'monospace' }}>attacker</text>
        <text x="368" y="50" textAnchor="middle" style={{ fontSize: '9px', fill: '#6b7585', fontFamily: 'monospace' }}>{ip}</text>
        <rect x="206" y="17" width="68" height="14" rx="3" fill="rgba(7,8,15,0.8)" stroke="rgba(42,51,71,0.5)" strokeWidth="1" />
        <text x="240" y="24.5" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '8px', fill: '#484f58', fontFamily: 'monospace' }}>{portLabel}</text>
      </svg>
    </div>
  )
}
