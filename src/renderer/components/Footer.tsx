import { useStore } from '../store'

export default function Footer() {
  const items   = useStore(s => s.items)
  const sources = useStore(s => s.sources)

  const total   = items.length
  const saved   = items.filter(i => i.saved).length
  const enabled = sources.filter(s => s.enabled).length

  return (
    <footer className="h-7 flex items-center justify-between px-4 border-t border-border flex-shrink-0">
      <span className="text-[11px] text-muted">ItsEliias // SignalBoard</span>
      <div className="flex items-center gap-4 text-[11px] text-muted">
        <span><span className="text-text">{enabled}</span> sources active</span>
        <span><span className="text-text">{total}</span> items cached</span>
        <span><span className="text-text">{saved}</span> saved to vault</span>
      </div>
    </footer>
  )
}
