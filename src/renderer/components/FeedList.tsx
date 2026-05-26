import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import type { FeedItem } from '../../shared/types'
import type { TabId } from '../store'

const TABS: { id: TabId; label: string }[] = [
  { id: 'all',      label: 'All'      },
  { id: 'unread',   label: 'Unread'   },
  { id: 'saved',    label: 'Saved'    },
  { id: 'relevant', label: 'Relevant' },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 3600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

function FeedCard({ item, selected }: { item: FeedItem; selected: boolean }) {
  const setSelectedId = useStore(s => s.setSelectedId)
  const patchItem     = useStore(s => s.patchItem)
  const sources       = useStore(s => s.sources)
  const sourceColor   = sources.find(s => s.id === item.sourceId)?.color ?? '#8b949e'

  async function handleClick() {
    setSelectedId(item.id)
    if (!item.read) {
      await window.electronAPI.markRead(item.id)
      patchItem(item.id, { read: true })
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={handleClick}
      className={`px-4 py-3 cursor-pointer border-b border-border/50 transition-colors ${
        selected ? 'bg-accent/8' : 'hover:bg-border/20'
      } ${item.read ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-2 mb-1">
        {/* Unread dot */}
        {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />}
        {item.read  && <span className="w-1.5 h-1.5 flex-shrink-0" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-medium" style={{ color: sourceColor }}>{item.sourceName}</span>
            {item.relevanceScore >= 20 && (
              <span className="text-[9px] px-1 py-px bg-warning/15 text-warning border border-warning/20 rounded">
                relevant
              </span>
            )}
            {item.saved && <span className="text-[9px] text-accent">saved</span>}
          </div>
          <p className={`text-xs leading-snug mb-1 ${item.read ? 'text-muted' : 'text-text font-medium'}`}>
            {item.title}
          </p>
          <p className="text-[11px] text-muted/70 leading-relaxed line-clamp-2">{item.summary}</p>
        </div>
      </div>
      <div className="pl-3.5">
        <span className="text-[10px] text-muted/50">{timeAgo(item.publishedAt)}</span>
      </div>
    </motion.div>
  )
}

export default function FeedList() {
  const items          = useStore(s => s.items)
  const sources        = useStore(s => s.sources)
  const selectedId     = useStore(s => s.selectedId)
  const activeSourceId = useStore(s => s.activeSourceId)
  const activeTab      = useStore(s => s.activeTab)
  const search         = useStore(s => s.search)
  const refreshing     = useStore(s => s.refreshing)
  const lastRefreshed  = useStore(s => s.lastRefreshed)
  const setActiveTab   = useStore(s => s.setActiveTab)
  const setSearch      = useStore(s => s.setSearch)

  const enabledSourceIds = useMemo(
    () => new Set(sources.filter(s => s.enabled).map(s => s.id)),
    [sources]
  )

  const filtered = useMemo(() => {
    let list = items.filter(i => enabledSourceIds.has(i.sourceId))
    if (activeSourceId)  list = list.filter(i => i.sourceId === activeSourceId)
    if (activeTab === 'unread')   list = list.filter(i => !i.read)
    if (activeTab === 'saved')    list = list.filter(i => i.saved)
    if (activeTab === 'relevant') list = list.filter(i => i.relevanceScore >= 20)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q))
    }
    return list
  }, [items, enabledSourceIds, activeSourceId, activeTab, search])

  const counts = useMemo(() => ({
    unread:   items.filter(i => !i.read && enabledSourceIds.has(i.sourceId)).length,
    saved:    items.filter(i => i.saved && enabledSourceIds.has(i.sourceId)).length,
    relevant: items.filter(i => i.relevanceScore >= 20 && enabledSourceIds.has(i.sourceId)).length,
  }), [items, enabledSourceIds])

  function formatRefreshed(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60_000) return 'just now'
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
    return `${Math.floor(diff / 3600_000)}h ago`
  }

  return (
    <div className="w-80 flex flex-col border-r border-border flex-shrink-0">
      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search feeds..."
          className="w-full bg-bg border border-border rounded px-2.5 py-1.5 text-xs text-text placeholder-muted focus:outline-none focus:border-accent transition-colors no-drag"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map(tab => {
          const count = tab.id === 'unread' ? counts.unread : tab.id === 'saved' ? counts.saved : tab.id === 'relevant' ? counts.relevant : null
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-[11px] transition-colors relative ${
                activeTab === tab.id ? 'text-text' : 'text-muted hover:text-text'
              }`}
            >
              {tab.label}
              {count != null && count > 0 && (
                <span className="ml-1 text-[9px] text-accent">{count}</span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-px bg-accent" />
              )}
            </button>
          )
        })}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
        <span className="text-[10px] text-muted/60">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          {refreshing && <span className="text-[10px] text-accent animate-pulse">Refreshing…</span>}
          {!refreshing && lastRefreshed && (
            <span className="text-[10px] text-muted/60">Updated {formatRefreshed(lastRefreshed)}</span>
          )}
          <button
            onClick={() => window.electronAPI.refresh()}
            disabled={refreshing}
            className="text-[10px] text-muted hover:text-text transition-colors no-drag disabled:opacity-40"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-xs text-muted/60 text-center px-4">
              {refreshing ? 'Loading feeds…' : activeTab === 'relevant' ? 'No relevant items.\nLaunch CyberLab or ReconDesk\nto set context.' : 'No items found.'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map(item => (
              <FeedCard key={item.id} item={item} selected={item.id === selectedId} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
