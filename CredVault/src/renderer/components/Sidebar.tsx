import { useState, useMemo } from 'react'
import { useStore, type View } from '../store'

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'vault',    label: 'Vault',    icon: '🗄️' },
  { id: 'import',   label: 'Import',   icon: '📥' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar() {
  const activeView     = useStore(s => s.activeView)
  const setView        = useStore(s => s.setView)
  const credentials    = useStore(s => s.credentials)
  const pendingCount   = useStore(s => s.pendingCount)
  const filterFolder   = useStore(s => s.filterFolder)
  const setFilterFolder= useStore(s => s.setFilterFolder)
  const resetFilters   = useStore(s => s.resetFilters)

  const [foldersOpen, setFoldersOpen] = useState(true)
  const [notesOpen, setNotesOpen]     = useState(false)

  const folders = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of credentials) {
      if (c.folder) counts[c.folder] = (counts[c.folder] ?? 0) + 1
    }
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))
  }, [credentials])

  const noteCount = useMemo(() => credentials.filter(c => c.type === 'note').length, [credentials])
  const credCount = credentials.length

  function navClick(id: View) {
    setView(id)
    resetFilters()
  }

  function folderClick(f: string | null) {
    if (activeView !== 'vault') setView('vault')
    setFilterFolder(filterFolder === f ? null : f)
  }

  function notesClick() {
    if (activeView !== 'vault') setView('vault')
    // filter by type: note — use folder field with a special marker isn't available,
    // so we use filterCategory which is the closest filter that can hold a custom value.
    // Instead, we toggle secure notes by setting a known filterFolder sentinel.
    setFilterFolder(filterFolder === '__notes__' ? null : '__notes__')
  }

  return (
    <aside style={{
      width: 180, borderRight: '1px solid var(--border)', background: 'var(--panel)',
      display: 'flex', flexDirection: 'column', padding: '12px 0', flexShrink: 0, userSelect: 'none',
      overflowY: 'auto',
    }}>
      {/* Main nav */}
      {NAV.map(item => {
        const active = activeView === item.id && !filterFolder
        return (
          <button
            key={item.id}
            onClick={() => navClick(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 16px', fontSize: 13, fontWeight: active ? 500 : 400,
              color: active ? 'var(--text)' : 'var(--text-dim)',
              background: active ? 'var(--accent-dim)' : 'transparent',
              borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
            {item.id === 'vault' && credCount > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 10, background: 'var(--accent-dim)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(247,129,102,0.3)' }}>
                {credCount}
              </span>
            )}
            {item.id === 'import' && pendingCount > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(255,193,7,0.15)', color: '#ffc107', padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(255,193,7,0.35)', fontWeight: 600, animation: 'pulse 1.5s ease-in-out infinite' }}>
                {pendingCount}
              </span>
            )}
          </button>
        )
      })}

      {/* Secure Notes section */}
      {noteCount > 0 && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 12px' }} />
          <button
            onClick={() => { setNotesOpen(s => !s); notesClick() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 16px', fontSize: 12, fontWeight: filterFolder === '__notes__' ? 500 : 400,
              color: filterFolder === '__notes__' ? 'var(--text)' : 'var(--text-dim)',
              background: filterFolder === '__notes__' ? 'var(--accent-dim)' : 'transparent',
              borderLeft: filterFolder === '__notes__' ? '2px solid var(--accent)' : '2px solid transparent',
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span>📝</span>
            Secure Notes
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{noteCount}</span>
          </button>
        </>
      )}

      {/* Folder tree */}
      {folders.length > 0 && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 12px' }} />
          <button
            onClick={() => setFoldersOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 16px', fontSize: 10, fontWeight: 600,
              color: 'var(--text-muted)', background: 'none', border: 'none',
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}
          >
            <span style={{ fontSize: 9, transition: 'transform 0.15s', transform: foldersOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
            Folders
          </button>

          {foldersOpen && (
            <div>
              {folders.map(([folder, count]) => {
                const active = filterFolder === folder
                return (
                  <button
                    key={folder}
                    onClick={() => folderClick(folder)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 16px 6px 28px', fontSize: 12,
                      fontWeight: active ? 500 : 400,
                      color: active ? 'var(--text)' : 'var(--text-dim)',
                      background: active ? 'rgba(247,129,102,0.06)' : 'transparent',
                      borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <span style={{ fontSize: 11 }}>📁</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 8 }}>{count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </aside>
  )
}
