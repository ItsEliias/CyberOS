// NotificationDropdown — top-5 high relevance items
import { useEffect, useRef } from 'react'
import { useStore } from '../../store'
import type { FeedItem } from '../../../shared/types'

const TIER_COLOR: Record<string, string> = {
  critical: '#ff6b6b',
  high:     '#f85149',
  medium:   '#d29922',
  low:      '#8b949e',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 3600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

export default function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const items     = useStore(s => s.items)
  const settings  = useStore(s => s.settings)
  const setSelectedId = useStore(s => s.setSelectedId)
  const setActiveView = useStore(s => s.setActiveView)
  const patchItem  = useStore(s => s.patchItem)
  const ref = useRef<HTMLDivElement>(null)

  const threshold = settings.notificationThreshold
  const top5: FeedItem[] = [...items]
    .filter(i => i.relevanceScore >= threshold)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function selectItem(item: FeedItem) {
    setActiveView('feed')
    setSelectedId(item.id)
    if (!item.read) {
      window.electronAPI.markRead(item.id)
      patchItem(item.id, { read: true })
    }
    onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-panel border border-border/80 rounded shadow-glow z-50"
    >
      <div className="px-3 py-2 border-b border-border/50">
        <span className="text-[10px] font-semibold text-muted/70 uppercase tracking-widest">
          High-Relevance Items
        </span>
      </div>
      {top5.length === 0 ? (
        <div className="px-3 py-4 text-[11px] text-muted/50 text-center">No high-relevance items</div>
      ) : (
        top5.map(item => (
          <button
            key={item.id}
            onClick={() => selectItem(item)}
            className="w-full text-left px-3 py-2.5 border-b border-border/30 last:border-0 hover:bg-border/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-[9px] font-bold uppercase px-1 py-px rounded"
                style={{ background: `${TIER_COLOR[item.relevanceTier]}20`, color: TIER_COLOR[item.relevanceTier], border: `1px solid ${TIER_COLOR[item.relevanceTier]}40` }}
              >
                {item.relevanceTier}
              </span>
              <span className="text-[9px] font-mono text-muted/60 ml-auto">[{item.relevanceScore}]</span>
            </div>
            <p className={`text-[11px] leading-snug ${item.read ? 'text-muted' : 'text-text font-medium'}`}>
              {item.title.length > 60 ? item.title.slice(0, 60) + '…' : item.title}
            </p>
            <p className="text-[10px] text-muted/50 mt-0.5">{item.sourceName} · {timeAgo(item.publishedAt)}</p>
          </button>
        ))
      )}
    </div>
  )
}
