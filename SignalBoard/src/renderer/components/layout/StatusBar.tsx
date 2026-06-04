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
    <footer className="h-6 flex items-center justify-between px-4 border-t border-border/50 flex-shrink-0 bg-panel/20">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-warning animate-pulse' : 'bg-success'}`}
        />
        <span className="text-[10px] text-muted">SignalBoard Active</span>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted">
        <span><span className="text-text">{total}</span> items</span>
        {unread > 0 && <span><span className="text-accent">{unread}</span> unread</span>}
        <span><span className="text-text">{enabled}</span> sources</span>
        {lastRefreshed && !refreshing && (
          <span>Last refresh: <span className="text-text">{timeAgo(lastRefreshed)}</span></span>
        )}
        {refreshing && <span className="text-warning">Refreshing…</span>}
      </div>
    </footer>
  )
}
