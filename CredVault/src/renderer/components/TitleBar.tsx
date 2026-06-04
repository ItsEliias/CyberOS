// CredVault — Title Bar
// Frameless macOS title bar with drag region, lock button, add button

import { useState } from 'react'
import { useStore } from '../store'

interface Props {
  onAdd?: () => void
  onHelp?: () => void
}

export default function TitleBar({ onAdd, onHelp }: Props) {
  const setUnlocked    = useStore(s => s.setUnlocked)
  const credentials    = useStore(s => s.credentials)
  const [locking, setLocking] = useState(false)

  async function handleLock() {
    setLocking(true)
    await window.electronAPI.lockVault()
    setUnlocked(false)
    setLocking(false)
  }

  return (
    <div
      className="h-10 border-b border-border-subtle/50 flex items-center px-4 drag-region shrink-0"
      style={{ background: 'rgba(10, 10, 15, 0.9)' }}
    >
      {/* Traffic light spacer (macOS) */}
      <div className="w-[70px] no-drag" />

      {/* App icon + name */}
      <div className="flex items-center gap-2 no-drag">
        {/* Key icon */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-accent" stroke="currentColor" strokeWidth="2">
          <circle cx="7.5" cy="15.5" r="4.5" />
          <path d="M21 2l-9.6 9.6" />
          <path d="M15.5 7.5l3 3" />
          <path d="M14 9l3 3" />
        </svg>
        <span className="text-sm text-text-secondary font-medium">CredVault</span>
      </div>

      <div className="flex-1" />

      {/* CYBERTOOLS badge */}
      <span
        className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full no-drag mr-3"
        style={{ background: 'rgba(74,158,255,0.08)', color: '#4a5568', border: '1px solid rgba(74,158,255,0.12)' }}
      >
        <span>⬡</span>
        <span>CYBERTOOLS</span>
      </span>

      {/* Actions */}
      <div className="flex items-center gap-2 no-drag">
        {/* Lock button */}
        <button
          onClick={handleLock}
          disabled={locking}
          className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium text-text-secondary border border-border-default/60 hover:border-accent/40 hover:text-accent transition-all"
          title="Lock vault"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Lock
        </button>

        {/* Add credential button */}
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium bg-accent text-bg-base hover:opacity-85 transition-opacity"
            title="Add credential"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        )}

        {/* Credential count badge */}
        {credentials.length > 0 && !onAdd && (
          <span className="text-xs text-text-muted font-mono tabular-nums">
            {credentials.length} creds
          </span>
        )}

        {/* Help button */}
        {onHelp && (
          <button
            onClick={onHelp}
            className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold text-text-muted border border-border-default/60 hover:border-accent/40 hover:text-accent transition-all"
            title="Help & onboarding"
          >
            ?
          </button>
        )}
      </div>
    </div>
  )
}
