// CredVault — Title Bar (polish)
// Header identity: lockup + app-name (600) + subname (muted, caption).
// Separators: ╱. Metric strip with · separators + left border.

import { useState } from 'react'
import { useStore } from '../store'

interface Props {
  onAdd?: () => void
  onHelp?: () => void
}

/** 13×13 lock icon — vault domain glyph */
function LockIcon({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" fill={color} />
    </svg>
  )
}

/** 13×13 plus icon */
function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function TitleBar({ onAdd, onHelp }: Props) {
  const setUnlocked = useStore(s => s.setUnlocked)
  const credentials = useStore(s => s.credentials)
  const [locking, setLocking] = useState(false)
  const isMac = window.electronAPI.platform === 'darwin'

  async function handleLock() {
    setLocking(true)
    await window.electronAPI.lockVault()
    setUnlocked(false)
    setLocking(false)
  }

  return (
    <div
      className="flex items-center px-4 drag-region shrink-0 relative"
      style={{ height: 32, background: 'var(--surface-0)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      {isMac && <div className="w-[70px] no-drag" />}

      {/* Brand lockup */}
      <div className="flex items-center gap-2 no-drag">
        <LockIcon color="var(--accent)" />
        <div className="flex items-baseline gap-1.5">
          <span style={{ fontSize: 'var(--type-body)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            CredVault
          </span>
          <span style={{ color: 'var(--border-default)', userSelect: 'none' }}>╱</span>
          <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            Vault
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Flat metric strip */}
      {credentials.length > 0 && (
        <div
          className="flex items-center no-drag mr-3"
          style={{
            fontSize: 'var(--type-caption)', color: 'var(--text-muted)',
            borderLeft: '1px solid var(--border-subtle)', paddingLeft: 8,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>{credentials.length}</span>
          <span style={{ margin: '0 4px', color: 'var(--border-default)' }}>·</span>
          <span>creds</span>
        </div>
      )}

      {/* CYBERTOOLS badge */}
      <span
        className="flex items-center gap-1 no-drag mr-3"
        style={{
          fontSize: 'var(--type-caption)', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        CYBERTOOLS
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1.5 no-drag">
        {onHelp && (
          <button
            onClick={onHelp}
            className="w-6 h-6 flex items-center justify-center rounded transition-all"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', background: 'transparent', fontSize: 'var(--type-caption)', fontWeight: 700 }}
            title="Help & onboarding"
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            ?
          </button>
        )}

        <button
          onClick={handleLock}
          disabled={locking}
          className="flex items-center gap-1.5 h-6 px-2.5 rounded transition-all disabled:opacity-50"
          style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', background: 'transparent' }}
          title="Lock vault"
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <LockIcon size={11} />
          Lock
        </button>

        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 h-6 px-2.5 rounded transition-opacity hover:opacity-85"
            style={{ background: 'var(--accent)', color: '#07080f', border: 'none', fontSize: 'var(--type-caption)', fontWeight: 600 }}
            title="Add credential"
          >
            <PlusIcon />
            Add
          </button>
        )}
      </div>
    </div>
  )
}
