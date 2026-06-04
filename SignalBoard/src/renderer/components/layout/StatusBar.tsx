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

  return (
    <footer
      className="h-6 flex items-center justify-between px-4 flex-shrink-0"
      style={{
        background: 'rgba(7,8,15,0.9)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: refreshing ? '#d29922' : '#3fb950',
            boxShadow: refreshing ? '0 0 6px rgba(210,153,34,0.5)' : '0 0 6px rgba(63,185,80,0.4)',
          }}
        />
        <span className="text-[10px]" style={{ color: '#484f58' }}>SignalBoard</span>
        <span
          className="text-[9px] px-1.5 py-0 rounded-xs font-mono"
          style={{ background: 'rgba(255,107,107,0.06)', color: 'rgba(255,107,107,0.5)', border: '1px solid rgba(255,107,107,0.1)' }}
        >
          Active
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[10px]" style={{ color: '#484f58' }}>
          <span style={{ color: '#8b949e' }}>{total}</span> items
        </span>
        {unread > 0 && (
          <span className="text-[10px]" style={{ color: '#484f58' }}>
            <span style={{ color: '#ff6b6b' }}>{unread}</span> unread
          </span>
        )}
        <span className="text-[10px]" style={{ color: '#484f58' }}>
          <span style={{ color: '#8b949e' }}>{enabled}</span> sources
        </span>
        {lastRefreshed && !refreshing && (
          <span className="text-[10px]" style={{ color: '#484f58' }}>
            Updated <span style={{ color: '#8b949e' }}>{timeAgo(lastRefreshed)}</span>
          </span>
        )}
        {refreshing && (
          <span className="text-[10px] animate-pulse" style={{ color: '#d29922' }}>
            Refreshing…
          </span>
        )}
      </div>
    </footer>
  )
}
