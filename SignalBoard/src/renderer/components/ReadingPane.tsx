import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'

export default function ReadingPane() {
  const items      = useStore(s => s.items)
  const sources    = useStore(s => s.sources)
  const selectedId = useStore(s => s.selectedId)
  const patchItem  = useStore(s => s.patchItem)

  const item   = items.find(i => i.id === selectedId)
  const source = sources.find(s => s.id === item?.sourceId)

  async function handleSaveToVault() {
    if (!item) return
    const res = await window.electronAPI.saveToVault(item.id)
    if (res.ok) patchItem(item.id, { saved: true })
    else alert(res.error ?? 'Failed to save')
  }

  async function handleToggleSaved() {
    if (!item) return
    const saved = await window.electronAPI.toggleSaved(item.id)
    patchItem(item.id, { saved })
  }

  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div style={{ filter: 'drop-shadow(0 0 12px rgba(255,107,107,0.12))' }}>
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: '#1e2030' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </div>
        <p className="text-sm text-center px-6 leading-relaxed" style={{ color: '#2a3347' }}>
          Select an article to read
        </p>
      </div>
    )
  }

  const pubDate = new Date(item.publishedAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  })

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={item.id}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="flex-1 flex flex-col min-w-0"
        style={{ background: 'rgba(7,8,15,0.6)' }}
      >
        {/* Article header */}
        <div
          className="px-6 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(42,51,71,0.35)' }}
        >
          {/* Source + date + relevance row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {source && (
              <span className="text-[11px] font-semibold" style={{ color: source.color }}>
                {source.name}
              </span>
            )}
            <span style={{ color: '#2a3347' }}>·</span>
            <span className="text-[11px]" style={{ color: '#484f58' }}>{pubDate}</span>
            {item.relevanceScore >= 20 && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-xs ml-auto"
                style={{ background: 'rgba(210,153,34,0.1)', border: '1px solid rgba(210,153,34,0.2)', color: '#d29922' }}
              >
                relevant to active context
              </span>
            )}
          </div>

          <h1 className="text-[15px] font-semibold leading-snug mb-4" style={{ color: '#e6edf3' }}>
            {item.title}
          </h1>

          {/* Actions */}
          <div className="flex items-center gap-2 no-drag flex-wrap">
            <button
              onClick={() => window.electronAPI.openUrl(item.url)}
              className="text-xs px-3 py-1.5 rounded-sm font-medium transition-all"
              style={{
                background: 'rgba(255,107,107,0.1)',
                border: '1px solid rgba(255,107,107,0.25)',
                color: '#ff6b6b',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.1)')}
            >
              Open in browser →
            </button>
            <button
              onClick={handleSaveToVault}
              disabled={item.saved}
              className="text-xs px-3 py-1.5 rounded-sm font-medium transition-all disabled:opacity-40"
              style={{
                background: 'rgba(19,21,37,0.8)',
                border: '1px solid rgba(42,51,71,0.6)',
                color: item.saved ? '#3fb950' : '#8b949e',
              }}
              onMouseEnter={e => { if (!item.saved) (e.currentTarget as HTMLElement).style.color = '#e6edf3' }}
              onMouseLeave={e => { if (!item.saved) (e.currentTarget as HTMLElement).style.color = '#8b949e' }}
              title={item.saved ? 'Already saved to vault' : 'Save to vault'}
            >
              {item.saved ? '✓ Saved' : '+ Save to vault'}
            </button>
            <button
              onClick={handleToggleSaved}
              className="text-sm px-2.5 py-1.5 rounded-sm transition-all"
              style={{
                background: 'rgba(19,21,37,0.8)',
                border: '1px solid rgba(42,51,71,0.6)',
                color: item.saved ? '#ff6b6b' : '#484f58',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,107,107,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(42,51,71,0.6)')}
              title="Bookmark"
            >
              {item.saved ? '★' : '☆'}
            </button>
          </div>
        </div>

        {/* Summary content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Glass content card */}
          <div
            className="rounded-md p-4 mb-4"
            style={{
              background: 'rgba(13,14,24,0.6)',
              border: '1px solid rgba(42,51,71,0.3)',
            }}
          >
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(230,237,243,0.85)' }}>
              {item.summary}
            </p>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {item.tags.map(tag => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-xs"
                  style={{ background: 'rgba(42,51,71,0.3)', border: '1px solid rgba(42,51,71,0.5)', color: '#484f58' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div
            className="pt-4"
            style={{ borderTop: '1px solid rgba(42,51,71,0.3)' }}
          >
            <button
              onClick={() => window.electronAPI.openUrl(item.url)}
              className="no-drag text-xs font-medium transition-colors"
              style={{ color: 'rgba(255,107,107,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,107,107,0.6)')}
            >
              Read full article at {new URL(item.url).hostname} →
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
