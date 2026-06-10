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
        background: 'var(--surface-0)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {/* Read-progress bar — 1px, no box */}
      <div className="h-px relative overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full"
          style={{
            width: `${readPct}%`,
            background: 'linear-gradient(90deg, var(--accent-tint3), var(--accent-dim))',
            transition: 'width 0.6s cubic-bezier(0.2,0.8,0.2,1)',
          }}
        />
      </div>

      {/* Flat metric strip — left: status  ·  right: metrics */}
      <div className="h-6 flex items-center justify-between px-4">
        {/* Left: live indicator */}
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 status-dot-pulse"
            style={{
              background: refreshing ? 'var(--warning)' : 'var(--success)',
              boxShadow: refreshing ? '0 0 5px rgba(210,153,34,0.5)' : '0 0 5px rgba(63,185,80,0.4)',
            }}
          />
          <span className="status-metric">SignalBoard</span>
          <span className="status-sep" aria-hidden>·</span>
          <span
            className="metric-chip"
            style={refreshing
              ? { color: 'var(--warning)', borderColor: 'rgba(210,153,34,0.2)' }
              : { color: 'var(--success)', borderColor: 'rgba(63,185,80,0.18)' }
            }
          >
            {refreshing ? 'Syncing' : 'Live'}
          </span>
        </div>

        {/* Right: flat metrics separated by · */}
        <div className="flex items-center">
          <span className="status-metric">
            <strong>{total}</strong> items
          </span>
          {unread > 0 && (
            <>
              <span className="status-sep" aria-hidden>·</span>
              <span className="status-metric">
                <strong style={{ color: 'var(--accent)' }}>{unread}</strong> unread
              </span>
            </>
          )}
          <span className="status-sep" aria-hidden>·</span>
          <span className="status-metric">
            <strong>{enabled}</strong> sources
          </span>
          {lastRefreshed && !refreshing && (
            <>
              <span className="status-sep" aria-hidden>·</span>
              <span className="status-metric">
                synced <strong style={{ color: 'var(--accent)' }}>{timeAgo(lastRefreshed)}</strong>
              </span>
            </>
          )}
          {refreshing && (
            <>
              <span className="status-sep" aria-hidden>·</span>
              <span className="status-metric animate-pulse" style={{ color: 'var(--warning)' }}>
                Refreshing…
              </span>
            </>
          )}
        </div>
      </div>
    </footer>
  )
}
