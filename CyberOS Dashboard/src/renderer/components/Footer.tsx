import { useStore } from '../store'

export default function Footer() {
  const config = useStore(s => s.config)
  const events = useStore(s => s.events)

  const vaultPath = config.obsidianVaultPath
  const lastEvent = events[0]

  return (
    <footer className="h-7 flex items-center justify-between px-4 border-t border-border flex-shrink-0">
      <span className="text-[11px] text-muted">ItsEliias // CyberOS Dashboard</span>
      <div className="flex items-center gap-4">
        {vaultPath && (
          <span className="text-[11px] text-muted/60 truncate max-w-xs" title={vaultPath}>
            vault: <span className="text-muted">{vaultPath.split('/').pop()}</span>
          </span>
        )}
        {lastEvent && (
          <span className="text-[11px] text-muted/60">
            last event: <span className="text-muted">{lastEvent.app} · {lastEvent.event}</span>
          </span>
        )}
      </div>
    </footer>
  )
}
