import { useState } from 'react'
import { useRecondeskStore } from '../../stores/useRecondeskStore'
import NotificationBell from '../NotificationCenter'
import ToolLauncher from '../ToolLauncher'

interface TitleBarProps {
  onHelp?: () => void
}

export default function TitleBar({ onHelp }: TitleBarProps) {
  const targets         = useRecondeskStore(s => s.targets)
  const activeTargetId  = useRecondeskStore(s => s.activeTargetId)
  const settings        = useRecondeskStore(s => s.settings)
  const setSettingsOpen = useRecondeskStore(s => s.setSettingsOpen)
  const isSettingsOpen  = useRecondeskStore(s => s.isSettingsOpen)

  const [toolsOpen, setToolsOpen] = useState(false)
  const active = targets.find(t => t.id === activeTargetId)
  const isMac = window.electronAPI.platform === 'darwin'

  function openSearch() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  }

  return (
    <>
      <header
        className="drag-region flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height: 44,
          background: 'var(--surface-0, #07080f)',
          borderBottom: '1px solid var(--border-subtle, rgba(42,51,71,0.35))',
        }}
      >
        {/* Left: macOS traffic-light spacer (hidden off-mac) + brand identity */}
        <div className="flex items-center gap-2 no-drag">
          {isMac && <div className="w-[72px]" />}
          {/* Target/crosshair glyph */}
          <div style={{ color: '#d29922', opacity: 0.9 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
              stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7.5" cy="7.5" r="5.5" />
              <circle cx="7.5" cy="7.5" r="2" />
              <line x1="7.5" y1="1" x2="7.5" y2="3" />
              <line x1="7.5" y1="12" x2="7.5" y2="14" />
              <line x1="1" y1="7.5" x2="3" y2="7.5" />
              <line x1="12" y1="7.5" x2="14" y2="7.5" />
            </svg>
          </div>
          <span
            className="font-semibold"
            style={{ fontSize: 'var(--type-body-md, 14px)', color: 'var(--text-primary, #e6edf3)' }}
          >
            ReconDesk
          </span>
          <span style={{ color: 'var(--text-muted, #8b949e)', fontSize: 'var(--type-caption, 10px)' }}>╱</span>
          <span style={{ fontSize: 'var(--type-caption, 10px)', color: 'var(--text-muted, #8b949e)' }}>recon</span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 no-drag">
          {settings.showLabContextInHeader && active && (
            <div
              className="flex items-center gap-2 px-2 py-1 rounded-md mr-1"
              style={{ background: 'rgba(210,153,34,0.05)', border: '1px solid rgba(210,153,34,0.15)' }}
            >
              <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(210,153,34,0.6)' }}>Active Lab</span>
              <span className="text-xs font-medium" style={{ color: '#e6edf3' }}>{active.name}</span>
              <span className="text-xs font-mono" style={{ color: 'rgba(210,153,34,0.75)' }}>{active.ip}</span>
            </div>
          )}

          {/* Global Search trigger */}
          <button
            onClick={openSearch}
            title="Global Search (Cmd+K)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
            style={{ border: '1px solid rgba(42,51,71,0.6)', color: '#484f58' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#8b949e';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(210,153,34,0.3)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#484f58';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(42,51,71,0.6)'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="text-[10px] font-mono">⌘K</span>
          </button>

          {/* Tool Launcher */}
          <button
            onClick={() => setToolsOpen(o => !o)}
            title="Tool Launcher"
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={toolsOpen
              ? { background: 'rgba(210,153,34,0.12)', color: '#d29922', border: '1px solid rgba(210,153,34,0.22)' }
              : { color: '#8b949e', border: '1px solid transparent' }
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(!isSettingsOpen)}
            title="Settings"
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={isSettingsOpen
              ? { background: 'rgba(210,153,34,0.12)', color: '#d29922', border: '1px solid rgba(210,153,34,0.22)' }
              : { color: '#8b949e', border: '1px solid transparent' }
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {onHelp && (
            <button
              onClick={onHelp}
              title="Help & onboarding"
              className="w-8 h-8 flex items-center justify-center rounded-md transition-colors text-sm font-bold"
              style={{ color: '#484f58', border: '1px solid transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#d29922' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#484f58' }}
            >
              ?
            </button>
          )}
        </div>
      </header>

      <ToolLauncher open={toolsOpen} onClose={() => setToolsOpen(false)} />
    </>
  )
}
