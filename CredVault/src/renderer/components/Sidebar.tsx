import { useStore, type View } from '../store'

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'vault',    label: 'Vault',    icon: '🗄️' },
  { id: 'import',   label: 'Import',   icon: '📥' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar() {
  const activeView   = useStore(s => s.activeView)
  const setView      = useStore(s => s.setView)
  const credentials  = useStore(s => s.credentials)
  const pendingCount = useStore(s => s.pendingCount)

  return (
    <aside style={{
      width: 180,
      borderRight: '1px solid var(--border)',
      background: 'var(--panel)',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 0',
      flexShrink: 0,
      userSelect: 'none'
    }}>
      {NAV.map(item => {
        const active = activeView === item.id
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--text)' : 'var(--text-dim)',
              background: active ? 'var(--accent-dim)' : 'transparent',
              borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
            {item.id === 'vault' && credentials.length > 0 && (
              <span style={{
                marginLeft: 'auto',
                fontSize: 10,
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                padding: '1px 6px',
                borderRadius: 10,
                border: '1px solid rgba(247,129,102,0.3)'
              }}>
                {credentials.length}
              </span>
            )}
            {item.id === 'import' && pendingCount > 0 && (
              <span style={{
                marginLeft: 'auto',
                fontSize: 10,
                background: 'rgba(255,193,7,0.15)',
                color: '#ffc107',
                padding: '1px 6px',
                borderRadius: 10,
                border: '1px solid rgba(255,193,7,0.35)',
                fontWeight: 600,
                animation: 'pulse 1.5s ease-in-out infinite'
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        )
      })}
    </aside>
  )
}
