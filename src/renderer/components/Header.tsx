import { useEffect, useState } from 'react'
import { useStore } from '../store'

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className="font-mono text-xs text-muted">{time}</span>
}

export default function Header() {
  const version = useStore(s => s.version)
  const config  = useStore(s => s.config)

  const online = [
    config.cyberlab_status?.active,
    config.vaultscraper_status?.active,
    config.ghostvault_status?.active,
    config.recondesk_status?.active,
  ].filter(Boolean).length

  return (
    <header className="drag-region h-12 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-[72px]" /> {/* macOS traffic lights */}
        <span className="text-sm font-semibold tracking-wide text-text">CYBEROS</span>
        <span className="text-xs text-muted font-light">// ItsEliias</span>
        <span className="text-[10px] text-muted/50 ml-1">v{version}</span>
      </div>

      <div className="no-drag flex items-center gap-4">
        <span className="text-[11px] text-muted">
          <span className={online > 0 ? 'text-success' : 'text-muted'}>{online}</span>
          <span className="text-muted/60"> / 4 apps online</span>
        </span>
        <LiveClock />
      </div>
    </header>
  )
}
