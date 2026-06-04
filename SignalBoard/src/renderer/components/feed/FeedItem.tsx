// FeedItem card — alert highlights, CVE badges, bookmark, dedup
import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store'
import type { FeedItem as FeedItemType } from '../../../shared/types'

const TIER_CONFIG = {
  critical: { label: 'CRITICAL', color: '#ff6b6b', bgAlpha: '22' },
  high:     { label: 'HIGH',     color: '#f85149', bgAlpha: '22' },
  medium:   { label: 'MEDIUM',   color: '#d29922', bgAlpha: '22' },
  low:      { label: 'LOW',      color: '#4a5568', bgAlpha: '22' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 3600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

export default function FeedItemCard({ item }: { item: FeedItemType }) {
  const setSelectedId  = useStore(s => s.setSelectedId)
  const patchItem      = useStore(s => s.patchItem)
  const selectedId     = useStore(s => s.selectedId)
  const bookmarks      = useStore(s => s.bookmarks)
  const bookmarkTags   = useStore(s => s.bookmarkTags)
  const toggleBookmark = useStore(s => s.toggleBookmark)
  const sources        = useStore(s => s.sources)
  const selected       = item.id === selectedId
  const tier           = TIER_CONFIG[item.relevanceTier]
  const cardRef        = useRef<HTMLDivElement>(null)
  const isBookmarked   = bookmarks.includes(item.id)
  const topAlert       = item.alertMatches?.[0]

  const sourceColor = sources.find(s => s.id === item.sourceId)?.color ?? '#8b949e'

  useEffect(() => {
    if (item.relevanceScore >= 60 && cardRef.current) {
      cardRef.current.classList.add('feed-item-pulse')
      const t = setTimeout(() => cardRef.current?.classList.remove('feed-item-pulse'), 1300)
      return () => clearTimeout(t)
    }
  }, [item.relevanceScore])

  async function handleClick() {
    setSelectedId(item.id)
    if (!item.read) {
      await window.electronAPI.markRead(item.id)
      patchItem(item.id, { read: true })
    }
  }

  async function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation()
    toggleBookmark(item.id)
    const nextIds = isBookmarked ? bookmarks.filter(id => id !== item.id) : [...bookmarks, item.id]
    await window.electronAPI.saveBookmarks(nextIds, bookmarkTags)
  }

  async function handleVault(e: React.MouseEvent) {
    e.stopPropagation()
    const res = await window.electronAPI.saveToVault(item.id)
    if (res.ok) patchItem(item.id, { saved: true })
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    window.electronAPI.openUrl(item.url)
  }

  // Alert border colour takes priority over selection
  const alertColor = topAlert?.color
  const borderLeftColor = alertColor ?? (selected ? '#ff6b6b' : 'transparent')
  const bgColor = alertColor
    ? `${alertColor}10`
    : selected
    ? 'rgba(255,107,107,0.06)'
    : 'rgba(22, 27, 39, 0.6)'

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={handleClick}
      className="group cursor-pointer mx-3 my-1.5 rounded-lg transition-all"
      style={{
        background: bgColor,
        border: `1px solid ${alertColor ? `${alertColor}40` : selected ? 'rgba(255,107,107,0.3)' : 'rgba(42, 51, 71, 0.5)'}`,
        opacity: item.read ? 0.65 : 1,
        borderLeft: `3px solid ${borderLeftColor}`,
      }}
    >
      <div className="px-3 py-2.5">
        {/* Row 1: source badge + badges + timestamp */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {!item.read && (
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#ff6b6b' }} />
          )}
          <span
            className="text-[9px] font-bold uppercase px-1.5 py-[2px] rounded flex-shrink-0"
            style={{ background: `${sourceColor}18`, color: sourceColor, border: `1px solid ${sourceColor}33` }}
          >
            {item.sourceName}
          </span>
          <span
            className="text-[9px] font-bold uppercase px-1.5 py-[2px] rounded flex-shrink-0"
            style={{ background: `${tier.color}${tier.bgAlpha}`, color: tier.color, border: `1px solid ${tier.color}44` }}
          >
            {tier.label}
          </span>
          {topAlert && (
            <span
              className="text-[9px] font-bold uppercase px-1.5 py-[2px] rounded flex-shrink-0"
              style={{ background: `${topAlert.color}20`, color: topAlert.color, border: `1px solid ${topAlert.color}50` }}
            >
              {topAlert.label}
            </span>
          )}
          {item.cveIds?.slice(0, 1).map(cveId => (
            <button
              key={cveId}
              onClick={e => { e.stopPropagation(); window.electronAPI.openUrl(`https://nvd.nist.gov/vuln/detail/${cveId}`) }}
              className="text-[9px] font-mono px-1.5 py-[2px] rounded flex-shrink-0 hover:opacity-80 transition-opacity"
              style={{ background: 'rgba(210,153,34,0.15)', color: '#d29922', border: '1px solid rgba(210,153,34,0.35)' }}
            >
              {cveId}
            </button>
          ))}
          {(item.cveIds?.length ?? 0) > 1 && (
            <span className="text-[9px] text-muted/50">+{(item.cveIds!.length - 1)} CVE</span>
          )}
          {item.duplicateCount ? (
            <span className="text-[9px] text-muted/50 px-1 py-px rounded border border-border/30 flex-shrink-0">
              +{item.duplicateCount} similar
            </span>
          ) : null}
          <span className="ml-auto text-[10px] text-white/30 flex-shrink-0">{timeAgo(item.publishedAt)}</span>
        </div>

        {/* Row 2: Headline */}
        <p className="text-[13px] font-semibold leading-snug mb-1" style={{ color: item.read ? '#8b949e' : '#e2e8f0' }}>
          {item.title}
        </p>

        {/* Row 3: Summary */}
        {item.summary && (
          <p className="text-[11px] leading-relaxed line-clamp-2 text-white/45">{item.summary}</p>
        )}

        {/* Hover actions */}
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleBookmark}
            className="text-[10px] px-2 py-0.5 rounded border transition-colors"
            style={{
              color: isBookmarked ? '#d29922' : '#8b949e',
              borderColor: isBookmarked ? 'rgba(210,153,34,0.3)' : 'rgba(42,51,71,0.6)',
              background: isBookmarked ? 'rgba(210,153,34,0.1)' : 'transparent',
            }}
          >
            {isBookmarked ? '★' : '☆'}
          </button>
          <button
            onClick={handleOpen}
            className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
          >
            Open
          </button>
          <button
            onClick={handleVault}
            className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
          >
            Vault
          </button>
          <span className="ml-auto text-[10px] font-mono font-bold" style={{ color: tier.color }}>
            [{item.relevanceScore}]
          </span>
        </div>
      </div>
    </motion.div>
  )
}
