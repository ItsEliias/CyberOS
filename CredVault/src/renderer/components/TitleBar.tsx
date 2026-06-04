// CredVault — Title Bar
// Frameless macOS title bar with peach-orange accent glow

import { useState } from 'react'
import { useStore } from '../store'

interface Props {
  onAdd?: () => void
  onHelp?: () => void
}

export default function TitleBar({ onAdd, onHelp }: Props) {
  const setUnlocked = useStore(s => s.setUnlocked)
  const credentials = useStore(s => s.credentials)
  const [locking, setLocking] = useState(false)

  async function handleLock() {
    setLocking(true)
    await window.electronAPI.lockVault()
    setUnlocked(false)
    setLocking(false)
  }

  return (
    <div
      className="h-10 flex items-center px-4 drag-region shrink-0 relative"
      style={{ background: 'rgba(7,8,15,0.98)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Accent underline glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(247,129,102,0.22) 35%, rgba(247,129,102,0.22) 65%, transparent 100%)' }}
      />

      {/* Traffic light spacer */}
      <div className="w-[70px] no-drag" />

      {/* Brand */}
      <div className="flex items-center gap-2 no-drag">
        <div style={{ filter: 'drop-shadow(0 0 5px rgba(247,129,102,0.5))' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#f78166' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
        </div>
        <span className="text-[13px] text-text-secondary font-semibold tracking-wide">CredVault</span>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(247,129,102,0.08)', border: '1px solid rgba(247,129,102,0.18)', color: '#f78166' }}
        >
          Vault
        </span>
      </div>

      <div className="flex-1" />

      {/* CYBERTOOLS badge */}
      <span
        className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full no-drag mr-3"
        style={{ background: 'rgba(42,51,71,0.2)', color: '#484f58', border: '1px solid rgba(42,51,71,0.35)' }}
      >
        <span>⬡</span>
        <span>CYBERTOOLS</span>
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1.5 no-drag">
        {/* Credential count */}
        {credentials.length > 0 && (
          <span
            className="text-[10px] tabular-nums font-mono px-2 py-0.5 rounded"
            style={{ background: 'rgba(247,129,102,0.06)', color: '#8b949e', border: '1px solid rgba(247,129,102,0.12)' }}
          >
            {credentials.length} creds
          </span>
        )}

        {/* Help button */}
        {onHelp && (
          <button
            onClick={onHelp}
            className="w-7 h-7 flex items-center justify-center rounded text-[11px] font-bold transition-all"
            style={{ color: '#8b949e', border: '1px solid rgba(42,51,71,0.6)', background: 'transparent' }}
            title="Help & onboarding"
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(247,129,102,0.4)'; e.currentTarget.style.color = '#f78166' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,51,71,0.6)'; e.currentTarget.style.color = '#8b949e' }}
          >
            ?
          </button>
        )}

        {/* Lock button */}
        <button
          onClick={handleLock}
          disabled={locking}
          className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium transition-all disabled:opacity-50"
          style={{ color: '#8b949e', border: '1px solid rgba(42,51,71,0.6)', background: 'transparent' }}
          title="Lock vault"
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(247,129,102,0.4)'; e.currentTarget.style.color = '#f78166' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(42,51,71,0.6)'; e.currentTarget.style.color = '#8b949e' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Lock
        </button>

        {/* Add credential button */}
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-semibold transition-opacity hover:opacity-85"
            style={{ background: '#f78166', color: '#07080f', border: 'none' }}
            title="Add credential"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        )}
      </div>
    </div>
  )
}
