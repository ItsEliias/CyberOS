import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore, type View } from '../store'

const CATEGORY_COLORS: Record<string, string> = {
  'SSH':         '#4a9eff',
  'API Key':     '#a78bfa',
  'Web':         '#3fb950',
  'Database':    '#f78166',
  'Certificate': '#d29922',
  'Token':       '#e879f9',
  'Other':       '#8b949e',
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

function VaultIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}

function ImportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// ─── Category icons (pass 3) ───────────────────────────────────────────────────

function CategoryIcon({ cat }: { cat: string }) {
  const s: React.CSSProperties = { flexShrink: 0 }
  if (cat === 'SSH') return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <rect x="2" y="7" width="7" height="14" rx="1.5" />
      <path d="M9 11h12M18 8l3 3-3 3" />
    </svg>
  )
  if (cat === 'API Key') return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
  if (cat === 'Token') return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
  if (cat === 'Certificate') return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <circle cx="12" cy="8" r="5" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
  if (cat === 'Database') return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
  if (cat === 'Web') return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
  // Other / fallback
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

// ─── Nav config ────────────────────────────────────────────────────────────────

const NAV: { id: View; label: string; Icon: () => JSX.Element }[] = [
  { id: 'vault',    label: 'Vault',    Icon: VaultIcon    },
  { id: 'import',   label: 'Import',   Icon: ImportIcon   },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]

// ─── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const activeView         = useStore(s => s.activeView)
  const setView            = useStore(s => s.setView)
  const credentials        = useStore(s => s.credentials)
  const pendingCount       = useStore(s => s.pendingCount)
  const filterFolder       = useStore(s => s.filterFolder)
  const filterCategory     = useStore(s => s.filterCategory)
  const setFilterFolder    = useStore(s => s.setFilterFolder)
  const setFilterCategory  = useStore(s => s.setFilterCategory)
  const resetFilters       = useStore(s => s.resetFilters)

  const [foldersOpen, setFoldersOpen]     = useState(true)
  const [categoriesOpen, setCategoriesOpen] = useState(true)

  const folders = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of credentials) {
      if (c.folder) counts[c.folder] = (counts[c.folder] ?? 0) + 1
    }
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))
  }, [credentials])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of credentials) {
      if (c.category) counts[c.category] = (counts[c.category] ?? 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [credentials])

  const noteCount = useMemo(() => credentials.filter(c => c.type === 'note').length, [credentials])
  const credCount = credentials.length

  function navClick(id: View) { setView(id); resetFilters() }

  function folderClick(f: string | null) {
    if (activeView !== 'vault') setView('vault')
    setFilterFolder(filterFolder === f ? null : f)
  }

  function notesClick() {
    if (activeView !== 'vault') setView('vault')
    setFilterFolder(filterFolder === '__notes__' ? null : '__notes__')
  }

  return (
    <aside
      className="shrink-0 flex flex-col py-3 overflow-y-auto"
      style={{ width: 180, background: 'rgba(13,14,24,0.95)', borderRight: '1px solid rgba(42,51,71,0.35)' }}
    >
      {/* Section label */}
      <div className="px-4 mb-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#484f58' }}>
          Navigation
        </span>
      </div>

      {/* Main nav — improvement #6: glow on active nav items */}
      {NAV.map(({ id, label, Icon }) => {
        const active = activeView === id && !filterFolder
        return (
          <button
            key={id}
            onClick={() => navClick(id)}
            className={`sidebar-nav-item flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium relative${active ? ' active' : ''}`}
            style={{
              color: active ? '#e6edf3' : '#8b949e',
              background: active ? 'rgba(247,129,102,0.08)' : 'transparent',
              borderLeft: active ? '3px solid #f78166' : '3px solid transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ color: active ? '#f78166' : '#484f58', transition: 'color 0.18s' }}><Icon /></span>
            <span style={{ flex: 1 }}>{label}</span>
            {id === 'vault' && credCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded tabular-nums"
                style={{ background: 'rgba(247,129,102,0.1)', color: '#f78166', border: '1px solid rgba(247,129,102,0.2)' }}
              >
                {credCount}
              </span>
            )}
            {id === 'import' && pendingCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded tabular-nums font-semibold"
                style={{ background: 'rgba(210,153,34,0.15)', color: '#d29922', border: '1px solid rgba(210,153,34,0.35)' }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        )
      })}

      {/* Secure Notes */}
      {noteCount > 0 && (
        <>
          <div className="mx-4 my-2 h-px" style={{ background: 'rgba(42,51,71,0.35)' }} />
          <button
            onClick={notesClick}
            className={`sidebar-nav-item flex items-center gap-2.5 px-4 py-2 text-[12px] font-medium${filterFolder === '__notes__' ? ' active' : ''}`}
            style={{
              color: filterFolder === '__notes__' ? '#e6edf3' : '#8b949e',
              background: filterFolder === '__notes__' ? 'rgba(247,129,102,0.08)' : 'transparent',
              borderLeft: filterFolder === '__notes__' ? '3px solid #f78166' : '3px solid transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ color: filterFolder === '__notes__' ? '#f78166' : '#484f58' }}><NoteIcon /></span>
            <span style={{ flex: 1 }}>Secure Notes</span>
            <span className="text-[10px]" style={{ color: '#484f58' }}>{noteCount}</span>
          </button>
        </>
      )}

      {/* Category filter */}
      {categoryCounts.length > 0 && (
        <>
          <div className="mx-4 my-2 h-px" style={{ background: 'rgba(42,51,71,0.35)' }} />
          <button
            onClick={() => setCategoriesOpen(o => !o)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors"
            style={{ color: '#484f58', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span
              className="text-[9px] transition-transform duration-150"
              style={{ transform: categoriesOpen ? 'rotate(90deg)' : 'none', display: 'inline-block' }}
            >
              ▶
            </span>
            Categories
          </button>

          {categoriesOpen && (
            <div>
              {categoryCounts.map(([cat, count]) => {
                const active = filterCategory === cat
                const color  = CATEGORY_COLORS[cat] ?? '#8b949e'
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      if (activeView !== 'vault') setView('vault')
                      setFilterCategory(filterCategory === cat ? null : cat)
                    }}
                    className="flex items-center gap-2 py-1.5 pr-4 text-[12px] transition-all w-full"
                    style={{
                      paddingLeft: 24,
                      color: active ? '#e6edf3' : '#8b949e',
                      background: active ? `${color}12` : 'transparent',
                      borderLeft: active ? `2px solid ${color}` : '2px solid transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {/* Pass 3: category icon instead of dot */}
                    <span
                      className="cat-icon-wrap"
                      style={{ background: active ? `${color}18` : 'rgba(42,51,71,0.25)', color: active ? color : '#484f58', borderRadius: 4 }}
                    >
                      <CategoryIcon cat={cat} />
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
                    {/* Pass 3: animated count badge */}
                    <motion.span
                      key={count}
                      initial={{ scale: 1.4, opacity: 0.6 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                      className="text-[10px] px-1.5 py-0.5 rounded tabular-nums"
                      style={{ background: active ? `${color}20` : 'rgba(42,51,71,0.5)', color: active ? color : '#484f58', border: `1px solid ${active ? color + '40' : 'transparent'}`, display: 'inline-block' }}
                    >
                      {count}
                    </motion.span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Folder tree */}
      {folders.length > 0 && (
        <>
          <div className="mx-4 my-2 h-px" style={{ background: 'rgba(42,51,71,0.35)' }} />
          <button
            onClick={() => setFoldersOpen(o => !o)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors"
            style={{ color: '#484f58', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span
              className="text-[9px] transition-transform duration-150"
              style={{ transform: foldersOpen ? 'rotate(90deg)' : 'none', display: 'inline-block' }}
            >
              ▶
            </span>
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
                    className="flex items-center gap-2 py-1.5 pr-4 text-[12px] transition-all w-full"
                    style={{
                      paddingLeft: 28,
                      color: active ? '#e6edf3' : '#8b949e',
                      background: active ? 'rgba(247,129,102,0.06)' : 'transparent',
                      borderLeft: active ? '2px solid #f78166' : '2px solid transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ color: active ? '#f78166' : '#484f58' }}><FolderIcon /></span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder}</span>
                    <span className="text-[10px]" style={{ color: '#484f58' }}>{count}</span>
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
