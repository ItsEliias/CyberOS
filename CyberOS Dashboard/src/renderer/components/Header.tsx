import { useEffect, useState } from 'react'
import { useStore } from '../store'

function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  )
  useEffect(() => {
    const t = setInterval(() =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
      1000
    )
    return () => clearInterval(t)
  }, [])
  return <span className="font-mono text-xs text-muted">{time}</span>
}

function FullscreenIcon({ isFullscreen }: { isFullscreen: boolean }) {
  if (isFullscreen) {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M5.5 2.5H2.5v3M10.5 2.5h3v3M5.5 13.5H2.5v-3M10.5 13.5h3v-3" />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2.5 5.5V2.5h3M10.5 2.5h3v3M13.5 10.5v3h-3M5.5 13.5h-3v-3" />
    </svg>
  )
}

interface HeaderProps {
  alertCount: number
  onBellClick: () => void
}

export default function Header({ alertCount, onBellClick }: HeaderProps) {
  const version      = useStore(s => s.version)
  const config       = useStore(s => s.config)
  const isFullscreen = useStore(s => s.isFullscreen)
  const setFullscreen = useStore(s => s.setFullscreen)

  const online = [
    config.cyberlab_status?.active,
    config.vaultscraper_status?.active,
    config.ghostvault_status?.active,
    config.recondesk_status?.active,
    config.signalboard_status?.active,
    config.agenticos_status?.active,
  ].filter(Boolean).length

  useEffect(() => {
    const unsub = window.electronAPI.onFullscreenChange(setFullscreen)
    return unsub
  }, [setFullscreen])

  async function handleFullscreen() {
    await window.electronAPI.toggleFullscreen()
  }

  const isMac = window.electronAPI.platform === 'darwin'
  return (
    <header className="drag-region h-12 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
      <div className="flex items-center gap-3">
        {isMac && <div className="w-[72px]" /> /* macOS traffic-light spacer */}
        <span className="text-sm font-semibold tracking-wide text-text">CYBEROS</span>
        <span className="text-xs text-muted font-light">// ItsEliias</span>
        <span className="text-[10px] text-muted/50 ml-1">v{version}</span>
      </div>

      <div className="no-drag flex items-center gap-4">
        <span className="text-[11px] text-muted">
          <span className={online > 0 ? 'text-success' : 'text-muted'}>{online}</span>
          <span className="text-muted/60"> / 6 apps online</span>
        </span>
        <LiveClock />

        {/* Bell / Alerts */}
        <button
          onClick={onBellClick}
          className="relative text-muted/60 hover:text-muted transition-colors"
          aria-label="Alerts"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6v3.5L2 11h12l-1.5-1.5V6A4.5 4.5 0 0 0 8 1.5Z" />
            <path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
          </svg>
          {alertCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-error text-[9px] text-white font-bold flex items-center justify-center leading-none"
            >
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={handleFullscreen}
          className="text-muted/60 hover:text-muted transition-colors"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <FullscreenIcon isFullscreen={isFullscreen} />
        </button>
      </div>
    </header>
  )
}
