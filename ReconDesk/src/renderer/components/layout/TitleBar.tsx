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
  const runSearch       = useRecondeskStore(s => s.runSearch)

  const [toolsOpen, setToolsOpen] = useState(false)
  const active = targets.find(t => t.id === activeTargetId)

  function openSearch() {
    // Trigger the GlobalSearch by firing a synthetic keyboard event
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  }

  return (
    <>
      <header className="drag-region h-12 flex items-center justify-between px-5 border-b border-[#2a3347] flex-shrink-0">
        <div className="flex items-center gap-3 no-drag">
          <div className="w-[72px]" />
          <span className="text-[#d29922] text-xs font-semibold tracking-widest">⬡</span>
          <span className="text-sm font-semibold tracking-wide text-[#e2e8f0]">RECONDESK</span>
          <span className="text-xs text-[#4a5568] font-light">// ItsEliias</span>
        </div>

        <div className="flex items-center gap-2 no-drag">
          {/* CYBERTOOLS badge */}
          <span
            className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(74,158,255,0.08)', color: '#4a5568', border: '1px solid rgba(74,158,255,0.12)' }}
          >
            <span>⬡</span>
            <span>CYBERTOOLS</span>
          </span>

          {settings.showLabContextInHeader && active && (
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-[#d29922]/5 border border-[#d29922]/15">
              <span className="text-[10px] text-[#d29922]/60 uppercase tracking-widest">Active Lab</span>
              <span className="text-xs font-medium text-[#e2e8f0]">{active.name}</span>
              <span className="text-xs font-mono text-[#d29922]/70">{active.ip}</span>
            </div>
          )}

          {/* Global Search trigger */}
          <button
            onClick={openSearch}
            title="Global Search (Cmd+K)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#2a3347] text-[#4a5568] hover:text-[#8b949e] hover:border-[#d29922]/30 transition-colors"
          >
            <span className="text-xs">⌕</span>
            <span className="text-[10px] font-mono">⌘K</span>
          </button>

          {/* Tool Launcher */}
          <button
            onClick={() => setToolsOpen(o => !o)}
            title="Tool Launcher"
            className={`w-7 h-7 flex items-center justify-center rounded border transition-colors text-xs ${
              toolsOpen
                ? 'bg-[#d29922]/10 border-[#d29922]/20 text-[#d29922]'
                : 'border-transparent text-[#8b949e] hover:text-[#e2e8f0] hover:bg-[#2a3347]/40'
            }`}
          >
            ⚒
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(!isSettingsOpen)}
            title="Settings"
            className={`w-7 h-7 flex items-center justify-center rounded border transition-colors text-sm ${
              isSettingsOpen
                ? 'bg-[#d29922]/10 border-[#d29922]/20 text-[#d29922]'
                : 'border-transparent text-[#8b949e] hover:text-[#e2e8f0] hover:bg-[#2a3347]/40'
            }`}
          >
            ⚙
          </button>

          {onHelp && (
            <button
              onClick={onHelp}
              title="Help & onboarding"
              className="w-7 h-7 flex items-center justify-center rounded border border-transparent text-sm font-bold text-[#4a5568] hover:text-[#d29922] hover:border-[#d29922]/30 transition-colors"
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
