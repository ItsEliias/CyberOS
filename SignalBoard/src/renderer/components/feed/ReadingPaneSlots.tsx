// ReadingPaneSlots — sub-components for ReadingPane to stay under 500 lines
import { motion } from 'framer-motion'
import { useStore } from '../../store'
import type { FeedItem } from '../../../shared/types'

// ── Empty state ───────────────────────────────────────────────────────────────

export function ReadingPaneEmpty() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center px-8 float-up">
        <div className="relative w-20 h-20 mx-auto mb-5">
          <svg className="w-20 h-20" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke="rgba(255,107,107,0.07)" strokeWidth="1.5" />
            <circle cx="40" cy="40" r="26" stroke="rgba(255,107,107,0.09)" strokeWidth="1" />
            <circle cx="40" cy="40" r="16" stroke="rgba(255,107,107,0.12)" strokeWidth="1" />
            <circle cx="40" cy="40" r="4" fill="rgba(255,107,107,0.2)" />
            <line x1="40" y1="4" x2="40" y2="76" stroke="rgba(255,107,107,0.05)" strokeWidth="1" />
            <line x1="4" y1="40" x2="76" y2="40" stroke="rgba(255,107,107,0.05)" strokeWidth="1" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'spin 4s linear infinite' }}>
            <svg className="w-20 h-20" viewBox="0 0 80 80" fill="none">
              <path d="M40 40 L40 6" stroke="rgba(255,107,107,0.35)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M40 40 L40 6 A34 34 0 0 1 52 9 Z" fill="rgba(255,107,107,0.05)" />
            </svg>
          </div>
        </div>
        <p className="text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Scanning for signals</p>
        <p className="text-xs leading-relaxed max-w-[200px] mx-auto" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Select an item from the feed to read the full article and AI summary
        </p>
        <div className="mt-4 flex items-center justify-center gap-3 text-[10px]" style={{ color: 'rgba(255,107,107,0.3)' }}>
          <span>↑↓ navigate</span>
          <span>·</span>
          <span>Enter select</span>
        </div>
      </div>
    </div>
  )
}

// ── Content body ──────────────────────────────────────────────────────────────

interface ContentProps {
  item: FeedItem
  readerMode: boolean
  aiLoading: boolean
  aiError: string | null
  tagInput: string
  setTagInput: (v: string) => void
  onAiSummarise: () => void
  onAddBookmarkTag: (tag: string) => void
  hostname: string
  contentRef: React.RefObject<HTMLDivElement>
  onScroll: () => void
}

export function ReadingPaneBody({
  item, readerMode, aiLoading, aiError,
  tagInput, setTagInput, onAiSummarise, onAddBookmarkTag,
  hostname, contentRef, onScroll,
}: ContentProps) {
  const bookmarks    = useStore(s => s.bookmarks)
  const bookmarkTags = useStore(s => s.bookmarkTags)
  const isBookmarked = bookmarks.includes(item.id)
  const bmTags       = bookmarkTags[item.id] ?? []

  return (
    <div ref={contentRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-5 py-4">
      {/* Bookmark tags */}
      {isBookmarked && (
        <div className="mb-4 p-3 rounded border" style={{ borderColor: readerMode ? '#e5e7eb' : 'rgba(42,51,71,0.5)', background: readerMode ? '#f9fafb' : 'rgba(22,27,39,0.3)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: readerMode ? '#6b7280' : '#8b949e' }}>Bookmark Tags</p>
          <div className="flex flex-wrap gap-1.5 items-center">
            {bmTags.map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-px rounded" style={{ background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.25)' }}>
                {tag}
                <button
                  onClick={() => {
                    const next = bmTags.filter(t => t !== tag)
                    useStore.getState().setItemBookmarkTags(item.id, next)
                    window.electronAPI.saveBookmarks(bookmarks, { ...bookmarkTags, [item.id]: next })
                  }}
                  className="ml-1 opacity-60 hover:opacity-100"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  onAddBookmarkTag(tagInput)
                  setTagInput('')
                }
              }}
              placeholder="+ tag"
              className="text-[10px] bg-transparent outline-none w-12"
              style={{ color: readerMode ? '#374151' : '#8b949e' }}
            />
          </div>
        </div>
      )}

      {/* AI Summary */}
      <div className="mb-5 p-3 rounded border" style={{ borderColor: readerMode ? '#e5e7eb' : 'rgba(42,51,71,0.4)', background: readerMode ? '#f9fafb' : 'rgba(22,27,39,0.3)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: readerMode ? '#9ca3af' : '#4a5568' }}>AI Summary</span>
          {item.aiSummary && item.aiSummary.length > 0 && (
            <span className="text-[8px] px-1 py-px bg-success/15 border border-success/30 text-success rounded">Ready</span>
          )}
        </div>
        {item.aiSummary && item.aiSummary.length > 0 ? (
          <ul className="space-y-1.5">
            {item.aiSummary.map((bullet, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="text-xs leading-relaxed flex gap-2"
                style={{ color: readerMode ? '#374151' : '#e2e8f0cc' }}
              >
                <span style={{ color: '#ff6b6b' }} className="flex-shrink-0 mt-px">•</span>
                <span>{bullet.replace(/^[•\-]\s*/, '')}</span>
              </motion.li>
            ))}
          </ul>
        ) : aiLoading ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1 h-1 rounded-full bg-accent" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }} />
              ))}
            </div>
            <span className="text-[11px]" style={{ color: readerMode ? '#9ca3af' : '#4a5568' }}>Generating summary…</span>
          </div>
        ) : (
          <div>
            {aiError && <p className="text-[11px] text-danger mb-2">{aiError}</p>}
            <button
              onClick={onAiSummarise}
              className="text-xs px-3 py-1.5 rounded border transition-colors"
              style={{ background: 'rgba(255,107,107,0.12)', borderColor: 'rgba(255,107,107,0.3)', color: '#ff6b6b' }}
            >
              Summarise with AI
            </button>
          </div>
        )}
      </div>

      {/* Full content */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: readerMode ? '#9ca3af' : '#4a5568' }}>Full Content</p>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p
            className="prose-drop-cap text-[13.5px] whitespace-pre-wrap"
            style={{
              color: readerMode ? '#1f2937' : 'rgba(226,232,240,0.82)',
              lineHeight: '1.75',
              letterSpacing: '0.01em',
              fontFamily: readerMode ? "'Georgia', 'Times New Roman', serif" : 'inherit',
            }}
          >
            {item.summary}
          </p>
        </div>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {item.tags.map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: readerMode ? '#f3f4f6' : 'rgba(42,51,71,0.4)', color: readerMode ? '#6b7280' : '#8b949e' }}>{tag}</span>
            ))}
          </div>
        )}
        <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${readerMode ? '#e5e7eb' : 'rgba(42,51,71,0.4)'}` }}>
          <button
            onClick={() => window.electronAPI.openUrl(item.url)}
            className="no-drag text-xs transition-colors hover:opacity-70"
            style={{ color: '#ff6b6b' }}
          >
            Read full article at {hostname} →
          </button>
        </div>
      </div>
    </div>
  )
}
