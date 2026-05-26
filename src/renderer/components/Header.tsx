import { useStore } from '../store'

export default function Header() {
  const targets = useStore(s => s.targets)
  const activeId = useStore(s => s.activeTargetId)
  const active = targets.find(t => t.id === activeId)

  return (
    <header className="drag-region h-12 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
      <div className="flex items-center gap-3 no-drag">
        {/* macOS traffic lights offset — 72px left margin */}
        <div className="w-[72px]" />
        <span className="text-sm font-semibold tracking-wide text-text">RECONDESK</span>
        <span className="text-xs text-muted font-light">// ItsEliias</span>
      </div>

      <div className="flex items-center gap-2 no-drag">
        {active && (
          <span className="text-xs font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">
            {active.ip}
          </span>
        )}
      </div>
    </header>
  )
}
