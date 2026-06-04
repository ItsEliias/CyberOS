// TitleBar — SignalBoard
import { useState } from 'react'
import { useStore } from '../../store'
import NotificationDropdown from '../notifications/NotificationDropdown'

interface TitleBarProps {
  onHelp?: () => void
}

export default function TitleBar({ onHelp }: TitleBarProps) {
  const version       = useStore(s => s.version)
  const items         = useStore(s => s.items)
  const context       = useStore(s => s.context)
  const refreshing    = useStore(s => s.refreshing)
  const settings      = useStore(s => s.settings)
  const setSearchOpen = useStore(s => s.setSearchOpen)
  const [showNotif, setShowNotif] = useState(false)

  const threshold = settings.notificationThreshold
  const highCount = items.filter(i => !i.read && i.relevanceScore >= threshold).length

  function doRefresh() {
    window.electronAPI.refresh()
  }

  return (
    <header
      className="drag-region h-10 flex items-center justify-between px-4 flex-shrink-0 relative"
      style={{
        background: 'rgba(7,8,15,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Coral accent underline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,107,107,0.2) 40%, rgba(255,107,107,0.2) 60%, transparent 100%)' }}
      />

      {/* Traffic light spacer */}
      <div className="flex items-center gap-2.5">
        <div className="w-[72px]" />
        {/* Brand icon */}
        <div style={{ filter: 'drop-shadow(0 0 6px rgba(255,107,107,0.45))' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#ff6b6b' }}>
            <path d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110-2 1 1 0 010 2z"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#ff6b6b' }}>
          SignalBoard
        </span>
        <span
          className="text-[9px] font-mono px-1.5 py-0.5 rounded-xs"
          style={{
            background: 'rgba(255,107,107,0.08)',
            border: '1px solid rgba(255,107,107,0.18)',
            color: 'rgba(255,107,107,0.7)',
          }}
        >
          v{version}
        </span>
      </div>

      <div className="no-drag flex items-center gap-1.5">
        {/* Context badges */}
        {context.lab && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-xs font-mono"
            style={{ background: 'rgba(180,79,255,0.1)', border: '1px solid rgba(180,79,255,0.2)', color: '#b44fff' }}
          >
            lab: {context.lab}
          </span>
        )}
        {context.ip && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-xs font-mono"
            style={{ background: 'rgba(210,153,34,0.1)', border: '1px solid rgba(210,153,34,0.2)', color: '#d29922' }}
          >
            {context.ip}
          </span>
        )}

        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1 transition-all duration-150 group"
          style={{
            background: 'rgba(19,21,37,0.8)',
            border: '1px solid rgba(42,51,71,0.6)',
            color: '#484f58',
            borderRadius: '8px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#8b949e'
            e.currentTarget.style.borderColor = 'rgba(255,107,107,0.25)'
            e.currentTarget.style.background = 'rgba(255,107,107,0.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#484f58'
            e.currentTarget.style.borderColor = 'rgba(42,51,71,0.6)'
            e.currentTarget.style.background = 'rgba(19,21,37,0.8)'
          }}
          title="Search all items (Cmd+K)"
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[11px]">Search</span>
          <kbd className="text-[9px] font-mono px-1 py-px rounded ml-0.5" style={{ background: 'rgba(42,51,71,0.4)', border: '1px solid rgba(42,51,71,0.7)', color: 'rgba(139,148,158,0.5)' }}>⌘K</kbd>
        </button>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(v => !v)}
            className="relative w-8 h-8 flex items-center justify-center rounded-sm transition-colors"
            style={{ color: highCount > 0 ? '#d29922' : '#484f58' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {highCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 flex items-center justify-center rounded-full bg-danger text-[9px] text-white font-bold leading-none">
                {highCount > 99 ? '99+' : highCount}
              </span>
            )}
          </button>
          {showNotif && <NotificationDropdown onClose={() => setShowNotif(false)} />}
        </div>

        {/* Refresh */}
        <button
          onClick={doRefresh}
          disabled={refreshing}
          className="w-8 h-8 flex items-center justify-center transition-all duration-150 disabled:opacity-40"
          style={{ color: refreshing ? '#ff6b6b' : '#484f58', borderRadius: '8px' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,107,107,0.08)'
            e.currentTarget.style.color = '#ff6b6b'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = refreshing ? '#ff6b6b' : '#484f58'
          }}
          title={refreshing ? 'Refreshing…' : 'Refresh feeds'}
        >
          <svg
            className={`w-[14px] h-[14px] ${refreshing ? 'animate-spin' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* CYBERTOOLS badge */}
        <span
          className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(74,158,255,0.06)', color: '#2a3347', border: '1px solid rgba(74,158,255,0.1)' }}
        >
          <span>⬡</span>
          <span>CYBERTOOLS</span>
        </span>

        {onHelp && (
          <button
            onClick={onHelp}
            className="w-8 h-8 flex items-center justify-center rounded-sm text-xs font-bold transition-colors"
            style={{ color: '#484f58' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = 'rgba(255,107,107,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#484f58'; e.currentTarget.style.background = 'transparent' }}
            title="Help & onboarding"
          >
            ?
          </button>
        )}
      </div>
    </header>
  )
}
