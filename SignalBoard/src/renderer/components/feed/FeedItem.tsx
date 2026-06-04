// FeedItem card — alert highlights, CVE badges, bookmark, dedup
import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store'
import type { FeedItem as FeedItemType } from '../../../shared/types'

// Stagger delay cap: first 10 items stagger, rest appear instantly
const MAX_STAGGER_IDX = 10

const TIER_CONFIG = {
  critical: { label: 'CRITICAL', color: '#ff6b6b', bgAlpha: '22' },
  high:     { label: 'HIGH',     color: '#f85149', bgAlpha: '22' },
  medium:   { label: 'MEDIUM',   color: '#d29922', bgAlpha: '22' },
  low:      { label: 'LOW',      color: '#4a5568', bgAlpha: '22' },
}

// Generate a deterministic color from a source name for the favicon avatar
function sourceInitialColor(name: string): string {
  const PALETTE = ['#ff6b6b','#f85149','#d29922','#4a9eff','#3fb950','#a78bfa','#f472b6','#34d399','#fbbf24','#60a5fa']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function SourceAvatar({ name, color }: { name: string; color: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?'
  const avatarColor = sourceInitialColor(name)
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded flex-shrink-0 text-[9px] font-bold leading-none select-none"
      style={{ background: `${avatarColor}20`, color: avatarColor, border: `1px solid ${avatarColor}35` }}
      title={name}
    >
      {initial}
    </span>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 3600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

export default function FeedItemCard({ item, index = 0 }: { item: FeedItemType; index?: number }) {
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
      transition={{ duration: 0.15, delay: Math.min(index, MAX_STAGGER_IDX) * 0.04 }}
      whileHover={{ y: -1, boxShadow: `0 4px 16px rgba(0,0,0,0.35), 0 0 0 1px ${alertColor ? `${alertColor}30` : selected ? 'rgba(255,107,107,0.2)' : 'rgba(42,51,71,0.6)'}` }}
      onClick={handleClick}
      className="group cursor-pointer mx-3 my-1.5 rounded-lg"
      style={{
        background: bgColor,
        border: `1px solid ${alertColor ? `${alertColor}40` : selected ? 'rgba(255,107,107,0.3)' : 'rgba(42, 51, 71, 0.5)'}`,
        opacity: item.read ? 0.65 : 1,
        borderLeft: `3px solid ${borderLeftColor}`,
        transition: 'background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease',
      }}
    >
      <div className="px-3 py-2.5">
        {/* Row 1: source avatar + badge + badges + timestamp */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {!item.read && (
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#ff6b6b' }} />
          )}
          <SourceAvatar name={item.sourceName} color={sourceColor} />
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
        <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-150">
          <button
            onClick={handleBookmark}
            className="text-[10px] px-2.5 py-1 border transition-all duration-150"
            style={{
              color: isBookmarked ? '#d29922' : '#8b949e',
              borderColor: isBookmarked ? 'rgba(210,153,34,0.35)' : 'rgba(42,51,71,0.5)',
              background: isBookmarked ? 'rgba(210,153,34,0.12)' : 'rgba(42,51,71,0.2)',
              borderRadius: '8px',
            }}
            onMouseEnter={e => { if (!isBookmarked) { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.borderColor = 'rgba(42,51,71,0.8)' } }}
            onMouseLeave={e => { if (!isBookmarked) { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.borderColor = 'rgba(42,51,71,0.5)' } }}
          >
            {isBookmarked ? '★' : '☆'}
          </button>
          <button
            onClick={handleOpen}
            className="text-[10px] px-2.5 py-1 border border-white/10 text-white/40 transition-all duration-150"
            style={{ borderRadius: '8px', background: 'rgba(42,51,71,0.2)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
          >
            Open ↗
          </button>
          <button
            onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(item.url) }}
            className="text-[10px] px-2.5 py-1 border border-white/10 text-white/40 transition-all duration-150"
            style={{ borderRadius: '8px', background: 'rgba(42,51,71,0.2)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            title="Copy link"
          >
            ⎘ Copy
          </button>
          <button
            onClick={handleVault}
            className="text-[10px] px-2.5 py-1 border border-white/10 text-white/40 transition-all duration-150"
            style={{ borderRadius: '8px', background: 'rgba(42,51,71,0.2)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
          >
            Vault
          </button>
          <span className="ml-auto text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded-md" style={{ color: tier.color, background: `${tier.color}12`, border: `1px solid ${tier.color}25` }}>
            {item.relevanceScore}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
