// TitleBar — SignalBoard
import { useState } from 'react'
import { useStore } from '../../store'
import NotificationDropdown from '../notifications/NotificationDropdown'

interface TitleBarProps {
  onHelp?: () => void
}

export default function TitleBar({ onHelp }: TitleBarProps) {
  const version      = useStore(s => s.version)
  const items        = useStore(s => s.items)
  const context      = useStore(s => s.context)
  const refreshing   = useStore(s => s.refreshing)
  const settings     = useStore(s => s.settings)
  const setSearchOpen = useStore(s => s.setSearchOpen)
  const [showNotif, setShowNotif] = useState(false)

  const threshold  = settings.notificationThreshold
  const highCount  = items.filter(i => !i.read && i.relevanceScore >= threshold).length

  function doRefresh() {
    window.electronAPI.refresh()
  }

  return (
    <header className="drag-region h-12 flex items-center justify-between px-5 border-b border-border/60 flex-shrink-0 bg-panel/20">
      <div className="flex items-center gap-3">
        <div className="w-[72px]" />
        <span className="text-[11px] font-semibold tracking-widest text-accent uppercase">SignalBoard</span>
        <span className="text-[10px] text-muted/40 font-light">v{version}</span>
      </div>

      <div className="no-drag flex items-center gap-3">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1 rounded border border-border/50 bg-panel/40 hover:bg-border/40 text-muted hover:text-text transition-colors"
          title="Search all items (Cmd+K)"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[11px]">Search</span>
          <span className="text-[9px] font-mono text-muted/40 ml-0.5">⌘K</span>
        </button>

        {context.lab && (
          <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded font-mono">
            lab: {context.lab}
          </span>
        )}
        {context.ip && (
          <span className="text-[10px] px-2 py-0.5 bg-warning/10 border border-warning/20 text-warning rounded font-mono">
            {context.ip}
          </span>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(v => !v)}
            className="relative flex items-center gap-1.5 px-2.5 py-1 rounded border border-border/50 bg-panel/40 hover:bg-border/40 text-muted hover:text-text transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {highCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full bg-accent text-[9px] text-white font-bold">
                {highCount > 99 ? '99+' : highCount}
              </span>
            )}
          </button>
          {showNotif && <NotificationDropdown onClose={() => setShowNotif(false)} />}
        </div>

        {/* Refresh button */}
        <button
          onClick={doRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border/50 bg-panel/40 hover:bg-border/40 text-muted hover:text-text transition-colors disabled:opacity-40"
        >
          <svg
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-[11px]">{refreshing ? 'Refreshing' : 'Refresh'}</span>
        </button>

        {/* CYBERTOOLS badge */}
        <span
          className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(74,158,255,0.08)', color: '#4a5568', border: '1px solid rgba(74,158,255,0.12)' }}
        >
          <span>⬡</span>
          <span>CYBERTOOLS</span>
        </span>

        {/* Help button */}
        {onHelp && (
          <button
            onClick={onHelp}
            className="flex items-center justify-center w-7 h-7 rounded border border-border/50 text-muted hover:text-accent hover:border-accent/40 transition-colors text-xs font-bold"
            title="Help & onboarding"
          >
            ?
          </button>
        )}
      </div>
    </header>
  )
}
