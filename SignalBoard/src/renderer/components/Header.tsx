import { useStore } from '../store'

export default function Header() {
  const version      = useStore(s => s.version)
  const items        = useStore(s => s.items)
  const context      = useStore(s => s.context)
  const refreshing   = useStore(s => s.refreshing)

  const unread = items.filter(i => !i.read).length

  return (
    <header className="drag-region h-12 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-[72px]" />
        <span className="text-sm font-semibold tracking-wide text-text">SIGNALBOARD</span>
        <span className="text-xs text-muted font-light">// ItsEliias</span>
        <span className="text-[10px] text-muted/50 ml-1">v{version}</span>
      </div>

      <div className="no-drag flex items-center gap-4">
        {/* Active context pills */}
        {context.lab && (
          <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded font-mono">
            lab: {context.lab}
          </span>
        )}
        {context.target && (
          <span className="text-[10px] px-2 py-0.5 bg-warning/10 border border-warning/20 text-warning rounded font-mono">
            target: {context.target}
          </span>
        )}
        {unread > 0 && (
          <span className="text-[11px] text-muted">
            <span className="text-accent font-medium">{unread}</span> unread
          </span>
        )}
        {refreshing && (
          <span className="text-[11px] text-accent animate-pulse">Refreshing…</span>
        )}
      </div>
    </header>
  )
}
