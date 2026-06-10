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

function FeedCard({ item, selected, threshold }: { item: FeedItem; selected: boolean; threshold: number }) {
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
      className="px-4 py-3 cursor-pointer transition-colors relative"
      style={{
        background: selected ? 'var(--accent-tint)' : 'transparent',
        borderBottom: '1px solid var(--border-subtle)',
        opacity: item.read ? 0.65 : 1,
      }}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {/* Active selection indicator */}
      {selected && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
          style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' }}
        />
      )}

      <div className="flex items-start gap-2 mb-1 pl-1">
        {/* Unread dot */}
        <span
          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 transition-opacity"
          style={{
            background: item.read ? 'transparent' : 'var(--accent)',
            boxShadow: item.read ? 'none' : '0 0 5px var(--accent-glow)',
          }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold truncate" style={{ color: sourceColor }}>
              {item.sourceName}
            </span>
            {item.relevanceScore >= threshold && (
              <span
                className="text-[9px] px-1 py-px rounded-xs flex-shrink-0"
                style={{
                  background: 'var(--sev-medium-bg)',
                  border: '1px solid rgba(210,153,34,0.25)',
                  color: 'var(--sev-medium)',
                }}
              >
                relevant
              </span>
            )}
            {item.saved && (
              <span className="text-[9px] flex-shrink-0" style={{ color: 'var(--accent)' }}>saved</span>
            )}
          </div>
          <p
            className="text-[12px] leading-snug mb-1 font-medium"
            style={{ color: item.read ? 'var(--text-muted)' : 'var(--text-primary)' }}
          >
            {item.title}
          </p>
          <p className="text-[11px] leading-relaxed line-clamp-2 text-text-muted">
            {item.summary}
          </p>
        </div>
      </div>

      <div className="pl-5">
        <span className="text-[10px] text-text-muted/60">
          {timeAgo(item.publishedAt)}
        </span>
      </div>
    </motion.div>
  )
}

const THRESHOLD_OPTIONS = [10, 20, 30, 40, 50]

export default function FeedList() {
  const items               = useStore(s => s.items)
  const sources             = useStore(s => s.sources)
  const selectedId          = useStore(s => s.selectedId)
  const activeSourceId      = useStore(s => s.activeSourceId)
  const activeTab           = useStore(s => s.activeTab)
  const search              = useStore(s => s.search)
  const refreshing          = useStore(s => s.refreshing)
  const lastRefreshed       = useStore(s => s.lastRefreshed)
  const relevanceThreshold  = useStore(s => s.relevanceThreshold)
  const setActiveTab        = useStore(s => s.setActiveTab)
  const setSearch           = useStore(s => s.setSearch)
  const setRelevanceThreshold = useStore(s => s.setRelevanceThreshold)

  const enabledSourceIds = useMemo(
    () => new Set(sources.filter(s => s.enabled).map(s => s.id)),
    [sources]
  )

  const filtered = useMemo(() => {
    let list = items.filter(i => enabledSourceIds.has(i.sourceId))
    if (activeSourceId)  list = list.filter(i => i.sourceId === activeSourceId)
    if (activeTab === 'unread')   list = list.filter(i => !i.read)
    if (activeTab === 'saved')    list = list.filter(i => i.saved)
    if (activeTab === 'relevant') list = list.filter(i => i.relevanceScore >= relevanceThreshold)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q))
    }
    return list
  }, [items, enabledSourceIds, activeSourceId, activeTab, search, relevanceThreshold])

  const counts = useMemo(() => ({
    unread:   items.filter(i => !i.read && enabledSourceIds.has(i.sourceId)).length,
    saved:    items.filter(i => i.saved && enabledSourceIds.has(i.sourceId)).length,
    relevant: items.filter(i => i.relevanceScore >= relevanceThreshold && enabledSourceIds.has(i.sourceId)).length,
  }), [items, enabledSourceIds, relevanceThreshold])

  function formatRefreshed(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60_000) return 'just now'
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
    return `${Math.floor(diff / 3600_000)}h ago`
  }

  return (
    <div
      className="w-80 flex flex-col flex-shrink-0"
      style={{ borderRight: '1px solid var(--border-subtle)' }}
    >
      {/* Search */}
      <div
        className="px-3 py-2.5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-text-muted"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search feeds…"
            className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-sm focus:outline-none transition-colors no-drag"
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent-border)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {TABS.map(tab => {
          const count = tab.id === 'unread' ? counts.unread
            : tab.id === 'saved'    ? counts.saved
            : tab.id === 'relevant' ? counts.relevant
            : null
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 text-[11px] font-medium transition-colors relative"
              style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            >
              {tab.label}
              {count != null && count > 0 && (
                <span className="ml-1 text-[9px]" style={{ color: 'var(--accent)' }}>{count}</span>
              )}
              {isActive && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-px rounded-full"
                  style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent-glow)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Meta bar */}
      <div
        className="px-3 py-1.5 flex items-center justify-between gap-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-[10px] text-text-muted">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2 flex-1 justify-end">
          {activeTab === 'relevant' && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-text-muted">min score</span>
              <select
                value={relevanceThreshold}
                onChange={e => setRelevanceThreshold(Number(e.target.value))}
                className="rounded-xs px-1 text-[10px] focus:outline-none transition-colors no-drag"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  paddingTop: 1,
                  paddingBottom: 1,
                }}
              >
                {THRESHOLD_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}
          {refreshing && (
            <span className="text-[10px] animate-pulse flex-shrink-0" style={{ color: 'var(--accent)' }}>
              Refreshing…
            </span>
          )}
          {!refreshing && lastRefreshed && (
            <span className="text-[10px] flex-shrink-0 text-text-muted">
              {formatRefreshed(lastRefreshed)}
            </span>
          )}
          <button
            onClick={() => window.electronAPI.refresh()}
            disabled={refreshing}
            className="text-[12px] transition-colors no-drag disabled:opacity-40 text-text-muted hover:text-text-secondary"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <svg className="w-8 h-8 text-text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            <p className="text-xs text-center px-4 leading-relaxed text-text-muted">
              {refreshing ? 'Loading feeds…'
                : activeTab === 'relevant'
                ? 'No relevant items.\nLaunch CyberLab or ReconDesk\nto set context.'
                : 'No items found.'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map(item => (
              <FeedCard key={item.id} item={item} selected={item.id === selectedId} threshold={relevanceThreshold} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
