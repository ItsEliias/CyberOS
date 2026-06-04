// BookmarksView — saved items with tags, filter by tag, export
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import type { FeedItem } from '../../../shared/types'

const TIER_COLOR: Record<string, string> = {
  critical: '#ff6b6b',
  high:     '#f85149',
  medium:   '#d29922',
  low:      '#4a5568',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 3600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

// ── Tag chip input ────────────────────────────────────────────────────────────

function TagChipInput({ itemId }: { itemId: string }) {
  const bookmarkTags      = useStore(s => s.bookmarkTags)
  const setItemBookmarkTags = useStore(s => s.setItemBookmarkTags)
  const bookmarks         = useStore(s => s.bookmarks)
  const [input, setInput] = useState('')

  const tags = bookmarkTags[itemId] ?? []

  function addTag(tag: string) {
    const clean = tag.trim().toLowerCase()
    if (!clean || tags.includes(clean)) return
    const next = [...tags, clean]
    setItemBookmarkTags(itemId, next)
    const allTags = { ...bookmarkTags, [itemId]: next }
    window.electronAPI.saveBookmarks(bookmarks, allTags)
  }

  function removeTag(tag: string) {
    const next = tags.filter(t => t !== tag)
    setItemBookmarkTags(itemId, next)
    const allTags = { ...bookmarkTags, [itemId]: next }
    window.electronAPI.saveBookmarks(bookmarks, allTags)
  }

  return (
    <div className="flex flex-wrap gap-1 items-center mt-1.5">
      {tags.map(t => (
        <span
          key={t}
          className="text-[10px] px-1.5 py-px rounded flex items-center gap-1"
          style={{ background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.25)' }}
        >
          {t}
          <button onClick={() => removeTag(t)} className="text-[9px] opacity-60 hover:opacity-100 ml-0.5">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag(input)
            setInput('')
          }
        }}
        placeholder="+ tag"
        className="text-[10px] bg-transparent outline-none text-muted/60 placeholder-muted/30 w-12"
      />
    </div>
  )
}

// ── BookmarkCard ──────────────────────────────────────────────────────────────

function BookmarkCard({ item }: { item: FeedItem }) {
  const toggleBookmark   = useStore(s => s.toggleBookmark)
  const bookmarks        = useStore(s => s.bookmarks)
  const bookmarkTags     = useStore(s => s.bookmarkTags)
  const setSelectedId    = useStore(s => s.setSelectedId)
  const setActiveView    = useStore(s => s.setActiveView)

  const tierColor = TIER_COLOR[item.relevanceTier] ?? '#4a5568'

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    toggleBookmark(item.id)
    const next = bookmarks.filter(id => id !== item.id)
    window.electronAPI.saveBookmarks(next, bookmarkTags)
  }

  function handleOpen() {
    setActiveView('feed')
    setSelectedId(item.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="p-3 border border-border/40 rounded bg-panel/20 hover:bg-panel/40 transition-colors cursor-pointer"
      onClick={handleOpen}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold uppercase px-1 py-px rounded" style={{ color: tierColor, background: `${tierColor}18`, border: `1px solid ${tierColor}33` }}>
              {item.relevanceTier}
            </span>
            <span className="text-[10px] text-muted/50 truncate">{item.sourceName}</span>
            <span className="ml-auto text-[10px] text-muted/30 flex-shrink-0">{timeAgo(item.publishedAt)}</span>
          </div>
          <p className="text-xs font-semibold text-text/90 leading-snug mb-1">{item.title}</p>
          {item.summary && (
            <p className="text-[11px] text-muted/60 line-clamp-2 leading-relaxed">{item.summary}</p>
          )}
          <TagChipInput itemId={item.id} />
        </div>
        <button
          onClick={handleRemove}
          className="flex-shrink-0 text-warning/60 hover:text-warning transition-colors text-sm mt-0.5"
          title="Remove bookmark"
        >
          ★
        </button>
      </div>
    </motion.div>
  )
}

// ── BookmarksView ─────────────────────────────────────────────────────────────

export default function BookmarksView() {
  const items        = useStore(s => s.items)
  const bookmarks    = useStore(s => s.bookmarks)
  const bookmarkTags = useStore(s => s.bookmarkTags)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const bookmarkedItems = useMemo(() => {
    const byId = new Map(items.map(i => [i.id, i]))
    let result = bookmarks.map(id => byId.get(id)).filter(Boolean) as FeedItem[]
    if (tagFilter) {
      result = result.filter(item => (bookmarkTags[item.id] ?? []).includes(tagFilter))
    }
    return result
  }, [items, bookmarks, bookmarkTags, tagFilter])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    bookmarks.forEach(id => (bookmarkTags[id] ?? []).forEach(t => tagSet.add(t)))
    return [...tagSet].sort()
  }, [bookmarks, bookmarkTags])

  async function handleExport(format: 'json' | 'csv') {
    setExporting(true)
    const res = await window.electronAPI.exportBookmarks(format, bookmarks, bookmarkTags)
    setExporting(false)
    if (!res.ok && res.error) alert(`Export failed: ${res.error}`)
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50 flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text">Bookmarks</h2>
          <p className="text-xs text-muted/50 mt-0.5">
            {bookmarks.length} saved · {bookmarkedItems.length} shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('json')}
            disabled={exporting || bookmarks.length === 0}
            className="text-xs px-2.5 py-1 bg-border/30 hover:bg-border/60 border border-border/50 text-muted hover:text-text rounded transition-colors disabled:opacity-40"
          >
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting || bookmarks.length === 0}
            className="text-xs px-2.5 py-1 bg-border/30 hover:bg-border/60 border border-border/50 text-muted hover:text-text rounded transition-colors disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 px-5 py-2 border-b border-border/30 flex-shrink-0 flex-wrap">
          <button
            onClick={() => setTagFilter(null)}
            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${!tagFilter ? 'bg-accent/20 text-accent border border-accent/40' : 'bg-border/30 text-muted hover:text-text border border-border/40'}`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${tagFilter === tag ? 'bg-accent/20 text-accent border border-accent/40' : 'bg-border/30 text-muted hover:text-text border border-border/40'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {bookmarkedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-8 h-8 text-muted/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <p className="text-sm text-muted/40">{tagFilter ? 'No bookmarks with this tag' : 'No bookmarks yet'}</p>
            <p className="text-xs text-muted/25 mt-1">Star items in the feed to bookmark them</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2 max-w-2xl">
              {bookmarkedItems.map(item => (
                <BookmarkCard key={item.id} item={item} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
