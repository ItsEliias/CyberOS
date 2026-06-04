// StatusBar — SignalBoard
import { useStore } from '../../store'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 10_000)   return 'just now'
  if (diff < 60_000)   return `${Math.floor(diff / 1_000)}s ago`
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3600_000)}h ago`
}

export default function StatusBar() {
  const items         = useStore(s => s.items)
  const sources       = useStore(s => s.sources)
  const lastRefreshed = useStore(s => s.lastRefreshed)
  const refreshing    = useStore(s => s.refreshing)

  const total   = items.length
  const unread  = items.filter(i => !i.read).length
  const enabled = sources.filter(s => s.enabled).length
  const readPct = total > 0 ? Math.round(((total - unread) / total) * 100) : 100

  return (
    <footer
      className="flex-shrink-0"
      style={{
        background: 'rgba(7,8,15,0.9)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Progress bar for read percentage */}
      <div className="h-px relative overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full"
          style={{
            width: `${readPct}%`,
            background: 'linear-gradient(90deg, rgba(255,107,107,0.25), rgba(255,107,107,0.45))',
            transition: 'width 0.6s cubic-bezier(0.2,0.8,0.2,1)',
          }}
        />
      </div>

      <div className="h-6 flex items-center justify-between px-4">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 status-dot-pulse"
            style={{
              background: refreshing ? '#d29922' : '#3fb950',
              boxShadow: refreshing ? '0 0 6px rgba(210,153,34,0.5)' : '0 0 6px rgba(63,185,80,0.4)',
              '--pulse-rgb': refreshing ? '210,153,34' : '63,185,80',
            } as React.CSSProperties}
          />
          <span className="text-[10px]" style={{ color: '#484f58' }}>SignalBoard</span>
          <span
            className="text-[9px] px-1.5 py-0 rounded-sm font-mono"
            style={{ background: 'rgba(63,185,80,0.08)', color: 'rgba(63,185,80,0.6)', border: '1px solid rgba(63,185,80,0.15)' }}
          >
            {refreshing ? 'Syncing' : 'Live'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] tabular-nums" style={{ color: '#484f58' }}>
            <span style={{ color: '#8b949e' }}>{total}</span> items
          </span>
          {unread > 0 && (
            <span className="flex items-center gap-1 text-[10px] tabular-nums" style={{ color: '#484f58' }}>
              <span
                className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold leading-none"
                style={{ background: 'rgba(255,107,107,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.25)' }}
              >
                {unread}
              </span>
              <span style={{ color: '#484f58' }}>unread</span>
            </span>
          )}
          <span className="text-[10px] tabular-nums" style={{ color: '#484f58' }}>
            <span style={{ color: '#8b949e' }}>{enabled}</span> sources
          </span>
          {lastRefreshed && !refreshing && (
            <span className="text-[10px]" style={{ color: '#484f58' }}>
              Updated <span style={{ color: '#8b949e' }}>{timeAgo(lastRefreshed)}</span>
            </span>
          )}
          {refreshing && (
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: '#d29922' }}>
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#d29922' }} />
              Refreshing…
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}
