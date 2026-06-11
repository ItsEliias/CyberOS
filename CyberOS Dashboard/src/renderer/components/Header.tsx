// CyberOS Dashboard — Header.tsx (polish)

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
  return (
    <span className="status-metric tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
      {time}
    </span>
  )
}

/* 13×13 dashboard/grid/cockpit identity glyph */
function DashboardGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="4" height="4" rx="0.5" />
      <rect x="7.5" y="1.5" width="4" height="4" rx="0.5" />
      <rect x="7.5" y="7.5" width="4" height="4" rx="0.5" />
      <rect x="1.5" y="7.5" width="4" height="4" rx="0.5" />
    </svg>
  )
}

function FullscreenIcon({ isFullscreen }: { isFullscreen: boolean }) {
  if (isFullscreen) {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.5 2.5H2.5v3M10.5 2.5h3v3M5.5 13.5H2.5v-3M10.5 13.5h3v-3" />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 5.5V2.5h3M10.5 2.5h3v3M13.5 10.5v3h-3M5.5 13.5h-3v-3" />
    </svg>
  )
}

interface HeaderProps {
  alertCount: number
  onBellClick: () => void
}

export default function Header({ alertCount, onBellClick }: HeaderProps) {
  const version       = useStore(s => s.version)
  const config        = useStore(s => s.config)
  const isFullscreen  = useStore(s => s.isFullscreen)
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
    <header className="drag-region flex items-center justify-between px-5 border-b border-border flex-shrink-0"
      style={{ height: 32 }}>

      {/* Left: lockup */}
      <div className="flex items-center gap-2">
        {isMac && <div style={{ width: 72 }} />}
        <span style={{ color: 'var(--accent)', opacity: 0.9 }}>
          <DashboardGlyph />
        </span>
        <span style={{ fontSize: 'var(--type-body)', fontWeight: 600, color: 'var(--text-primary)' }}>
          CYBEROS
        </span>
        <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>╱</span>
        <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>
          ItsEliias
        </span>

        {/* Flat metric strip */}
        <div className="flex items-center" style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 10, marginLeft: 6 }}>
          <span className="status-metric">
            <strong>{online}</strong> / 6 apps online
          </span>
        </div>
      </div>

      {/* Right: clock + actions */}
      <div className="no-drag flex items-center gap-3">
        <LiveClock />

        <span className="status-metric" style={{ fontFamily: 'var(--font-mono)' }}>
          v{version}
        </span>

        {/* Bell / Alerts */}
        <button
          onClick={onBellClick}
          className="no-drag flex items-center justify-center"
          style={{
            width: 24, height: 24, borderRadius: 'var(--radius-sm)',
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            transition: 'color var(--motion-fast) var(--ease)',
            position: 'relative',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
          aria-label="Alerts"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6v3.5L2 11h12l-1.5-1.5V6A4.5 4.5 0 0 0 8 1.5Z" />
            <path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
          </svg>
          {alertCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              minWidth: 12, height: 12, borderRadius: 999,
              background: 'var(--sev-critical)', fontSize: 8,
              color: '#fff', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, padding: '0 2px',
            }}>
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={handleFullscreen}
          className="no-drag flex items-center justify-center"
          style={{
            width: 24, height: 24, borderRadius: 'var(--radius-sm)',
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            transition: 'color var(--motion-fast) var(--ease)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <FullscreenIcon isFullscreen={isFullscreen} />
        </button>
      </div>
    </header>
  )
}
