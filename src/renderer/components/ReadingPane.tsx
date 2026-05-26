import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'

export default function ReadingPane() {
  const items      = useStore(s => s.items)
  const sources    = useStore(s => s.sources)
  const selectedId = useStore(s => s.selectedId)
  const patchItem  = useStore(s => s.patchItem)

  const item       = items.find(i => i.id === selectedId)
  const source     = sources.find(s => s.id === item?.sourceId)

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
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted/60 text-center px-6 leading-relaxed">
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
      >
        {/* Article header */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            {source && (
              <span className="text-xs font-medium" style={{ color: source.color }}>{source.name}</span>
            )}
            <span className="text-muted/40">·</span>
            <span className="text-xs text-muted">{pubDate}</span>
            {item.relevanceScore >= 20 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded ml-auto">
                relevant to active context
              </span>
            )}
          </div>

          <h1 className="text-base font-semibold text-text leading-snug mb-4">{item.title}</h1>

          {/* Actions */}
          <div className="flex items-center gap-2 no-drag">
            <button
              onClick={() => window.electronAPI.openUrl(item.url)}
              className="text-xs px-3 py-1.5 bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent rounded transition-colors"
            >
              Open in browser →
            </button>
            <button
              onClick={handleSaveToVault}
              disabled={item.saved}
              className="text-xs px-3 py-1.5 bg-panel hover:bg-border/60 border border-border text-muted hover:text-text rounded transition-colors disabled:opacity-40"
              title={item.saved ? 'Already saved to vault' : 'Save to vault'}
            >
              {item.saved ? '✓ Saved' : '+ Save to vault'}
            </button>
            <button
              onClick={handleToggleSaved}
              className="text-xs px-2.5 py-1.5 bg-panel hover:bg-border/60 border border-border text-muted hover:text-text rounded transition-colors"
              title="Bookmark"
            >
              {item.saved ? '★' : '☆'}
            </button>
          </div>
        </div>

        {/* Summary content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-sm text-text/90 leading-relaxed whitespace-pre-wrap">{item.summary}</p>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-5">
              {item.tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-border/40 text-muted rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-border">
            <button
              onClick={() => window.electronAPI.openUrl(item.url)}
              className="no-drag text-xs text-accent hover:text-accent2 transition-colors"
            >
              Read full article at {new URL(item.url).hostname} →
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
