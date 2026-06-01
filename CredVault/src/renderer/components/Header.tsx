import { useStore } from '../store'

export default function Header() {
  const version     = useStore(s => s.version)
  const setUnlocked = useStore(s => s.setUnlocked)

  async function handleLock() {
    await window.electronAPI.lockVault()
    setUnlocked(false)
  }

  return (
    <header style={{
      height: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--panel)',
      flexShrink: 0,
      userSelect: 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>🔐</span>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent)', letterSpacing: '-0.2px' }}>
          CredVault
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>
          v{version}
        </span>
      </div>

      <button
        className="btn btn-ghost"
        onClick={handleLock}
        style={{ fontSize: 12, padding: '4px 10px' }}
      >
        Lock Vault
      </button>
    </header>
  )
}
