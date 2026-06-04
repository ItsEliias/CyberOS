// ReadingPane — full article view with AI summary, reader mode, CVE info, bookmarks, ReconDesk
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'

const TIER_CONFIG = {
  critical: { label: 'CRITICAL', color: '#ff6b6b' },
  high:     { label: 'HIGH',     color: '#f85149' },
  medium:   { label: 'MEDIUM',   color: '#d29922' },
  low:      { label: 'LOW',      color: '#8b949e' },
}

const CVE_RE = /CVE-\d{4}-\d+/g

function extractCveIds(text: string): string[] {
  const m = text.match(CVE_RE)
  return m ? [...new Set(m.map(s => s.toUpperCase()))] : []
}

function playCriticalBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch { /* audio not available */ }
}

export default function ReadingPane() {
  const items           = useStore(s => s.items)
  const selectedId      = useStore(s => s.selectedId)
  const patchItem       = useStore(s => s.patchItem)
  const setSelectedId   = useStore(s => s.setSelectedId)
  const settings        = useStore(s => s.settings)
  const bookmarks       = useStore(s => s.bookmarks)
  const bookmarkTags    = useStore(s => s.bookmarkTags)
  const toggleBookmark  = useStore(s => s.toggleBookmark)

  const [aiLoading, setAiLoading]   = useState(false)
  const [aiError, setAiError]       = useState<string | null>(null)
  const [readerMode, setReaderMode] = useState(!!settings.readerLightMode)
  const [cveData, setCveData]       = useState<Record<string, { cvss?: number; severity?: string }>>({})
  const [reconResult, setReconResult] = useState<{ targets: string[] } | null>(null)
  const [tagInput, setTagInput]     = useState('')

  const item = items.find(i => i.id === selectedId)
  const isBookmarked = item ? bookmarks.includes(item.id) : false

  // Auto-summarise if setting enabled
  useEffect(() => {
    if (!item || !settings.aiAutoSummarise || item.aiSummary?.length || aiLoading) return
    if (!settings.claudeApiKey) return
    handleAiSummarise()
  }, [item?.id])

  // Beep on critical alert match
  useEffect(() => {
    if (item?.alertMatches?.some(m => m.severity === 'critical')) {
      playCriticalBeep()
    }
  }, [item?.id])

  // Look up CVE IDs in title+summary
  useEffect(() => {
    if (!item) return
    const ids = extractCveIds(`${item.title} ${item.summary}`)
    ids.forEach(async cveId => {
      if (cveData[cveId]) return
      const res = await window.electronAPI.cveLookup(cveId)
      if (res.ok && res.data) {
        setCveData(prev => ({ ...prev, [cveId]: res.data! }))
      }
    })
  }, [item?.id])

  async function handleSaveToVault() {
    if (!item) return
    const res = await window.electronAPI.saveToVault(item.id)
    if (res.ok) patchItem(item.id, { saved: true })
    else alert(res.error ?? 'Failed to save')
  }

  async function handleToggleBookmark() {
    if (!item) return
    toggleBookmark(item.id)
    const newIds = isBookmarked ? bookmarks.filter(id => id !== item.id) : [...bookmarks, item.id]
    await window.electronAPI.saveBookmarks(newIds, bookmarkTags)
  }

  async function handleAiSummarise() {
    if (!item) return
    if (!settings.claudeApiKey) { setAiError('Configure Claude API key in Settings.'); return }
    setAiLoading(true)
    setAiError(null)
    const res = await window.electronAPI.summarise(item, settings.claudeApiKey)
    setAiLoading(false)
    if (res.ok && res.bullets) patchItem(item.id, { aiSummary: res.bullets })
    else setAiError(res.error ?? 'AI summarise failed')
  }

  async function handleReconDesk() {
    if (!item) return
    const res = await window.electronAPI.reconDeskTarget(item.id)
    if (res.ok && res.targets) setReconResult({ targets: res.targets })
  }

  function addBookmarkTag(tag: string) {
    if (!item) return
    const clean = tag.trim().toLowerCase()
    if (!clean) return
    const current = bookmarkTags[item.id] ?? []
    if (current.includes(clean)) return
    const next = [...current, clean]
    useStore.getState().setItemBookmarkTags(item.id, next)
    const allTags = { ...bookmarkTags, [item.id]: next }
    window.electronAPI.saveBookmarks(bookmarks, allTags)
  }

  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-8 float-up">
          {/* Animated radar illustration */}
          <div className="relative w-20 h-20 mx-auto mb-5">
            <svg className="w-20 h-20" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="36" stroke="rgba(255,107,107,0.07)" strokeWidth="1.5" />
              <circle cx="40" cy="40" r="26" stroke="rgba(255,107,107,0.09)" strokeWidth="1" />
              <circle cx="40" cy="40" r="16" stroke="rgba(255,107,107,0.12)" strokeWidth="1" />
              <circle cx="40" cy="40" r="4" fill="rgba(255,107,107,0.2)" />
              {/* Cross-hairs */}
              <line x1="40" y1="4" x2="40" y2="76" stroke="rgba(255,107,107,0.05)" strokeWidth="1" />
              <line x1="4" y1="40" x2="76" y2="40" stroke="rgba(255,107,107,0.05)" strokeWidth="1" />
            </svg>
            {/* Rotating sweep */}
            <div className="absolute inset-0 flex items-center justify-center"
              style={{
                animation: 'spin 4s linear infinite',
              }}
            >
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

  const tier    = TIER_CONFIG[item.relevanceTier]
  const pubDate = new Date(item.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const cveIds  = extractCveIds(`${item.title} ${item.summary}`)
  const bmTags  = bookmarkTags[item.id] ?? []

  let hostname = ''
  try { hostname = new URL(item.url).hostname } catch { hostname = item.url }

  const bg      = readerMode ? '#ffffff' : undefined
  const textCol = readerMode ? '#111827' : undefined
  const fontFam = readerMode ? "'Georgia', 'Times New Roman', serif" : undefined

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={item.id}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -5 }}
        transition={{ duration: 0.18 }}
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{ background: bg, color: textCol, fontFamily: fontFam }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border/50 flex-shrink-0" style={{ borderColor: readerMode ? '#e5e7eb' : undefined }}>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setSelectedId(null)}
              className="text-[10px] hover:opacity-80 transition-opacity mr-1"
              style={{ color: readerMode ? '#6b7280' : undefined }}
            >
              ← Back
            </button>
            <span className="text-xs" style={{ color: readerMode ? '#6b7280' : '#8b949e' }}>{item.sourceName}</span>
            <span className="text-xs" style={{ color: readerMode ? '#9ca3af' : '#8b949e' }}>·</span>
            <span className="text-xs" style={{ color: readerMode ? '#9ca3af' : '#8b949e' }}>{pubDate}</span>
            <div className="ml-auto flex items-center gap-1.5">
              {/* Reader mode toggle */}
              <button
                onClick={() => setReaderMode(v => !v)}
                className="text-[10px] px-2 py-0.5 rounded border transition-colors"
                style={{
                  color: readerMode ? '#374151' : '#8b949e',
                  borderColor: readerMode ? '#d1d5db' : 'rgba(42,51,71,0.6)',
                  background: readerMode ? '#f9fafb' : 'transparent',
                }}
                title="Toggle reader mode"
              >
                Aa
              </button>
            </div>
          </div>

          <h1
            className="text-sm font-semibold leading-snug mb-2"
            style={{ color: readerMode ? '#111827' : '#e2e8f0' }}
          >
            {item.title}
          </h1>

          {/* CVE badges */}
          {cveIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {cveIds.map(id => {
                const info = cveData[id]
                const sev  = info?.severity
                const sevColor = sev === 'critical' ? '#ff6b6b' : sev === 'high' ? '#f85149' : sev === 'medium' ? '#d29922' : '#4a9eff'
                return (
                  <button
                    key={id}
                    onClick={() => window.electronAPI.openUrl(`https://nvd.nist.gov/vuln/detail/${id}`)}
                    className="text-[9px] font-mono px-1.5 py-px rounded border hover:opacity-80 transition-opacity"
                    style={{ color: sevColor, background: `${sevColor}15`, borderColor: `${sevColor}40` }}
                  >
                    {id}{info?.cvss ? ` CVSS ${info.cvss}` : ''}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className="text-[9px] font-bold uppercase px-1.5 py-px rounded border"
              style={{ background: `${tier.color}20`, color: tier.color, borderColor: `${tier.color}40` }}
            >
              {tier.label}
            </span>
            <span className="text-[10px] font-mono" style={{ color: tier.color }}>[{item.relevanceScore}]</span>
            {item.alertMatches?.map(m => (
              <span
                key={m.ruleId}
                className="text-[9px] font-bold uppercase px-1.5 py-px rounded border"
                style={{ background: `${m.color}20`, color: m.color, borderColor: `${m.color}40` }}
              >
                ALERT: {m.label}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 no-drag flex-wrap">
            <button
              onClick={() => window.electronAPI.openUrl(item.url)}
              className="text-xs px-2.5 py-1 rounded border transition-colors"
              style={{ background: 'rgba(255,107,107,0.15)', borderColor: 'rgba(255,107,107,0.3)', color: '#ff6b6b' }}
            >
              Open →
            </button>
            <button
              onClick={handleToggleBookmark}
              className="text-xs px-2.5 py-1 rounded border transition-colors"
              style={{
                background: isBookmarked ? 'rgba(210,153,34,0.15)' : readerMode ? '#f9fafb' : 'rgba(22,27,39,0.6)',
                borderColor: isBookmarked ? 'rgba(210,153,34,0.3)' : readerMode ? '#d1d5db' : 'rgba(42,51,71,0.5)',
                color: isBookmarked ? '#d29922' : readerMode ? '#374151' : '#8b949e',
              }}
            >
              {isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
            </button>
            <button
              onClick={handleSaveToVault}
              className="text-xs px-2.5 py-1 rounded border transition-colors"
              style={{ background: readerMode ? '#f9fafb' : 'rgba(22,27,39,0.6)', borderColor: readerMode ? '#d1d5db' : 'rgba(42,51,71,0.5)', color: readerMode ? '#374151' : '#8b949e' }}
            >
              Save to Vault
            </button>
            <button
              onClick={handleReconDesk}
              className="text-xs px-2.5 py-1 rounded border transition-colors"
              style={{ background: 'rgba(74,158,255,0.1)', borderColor: 'rgba(74,158,255,0.25)', color: '#4a9eff' }}
              title="Extract IPs/hostnames and send to ReconDesk"
            >
              + ReconDesk
            </button>
          </div>

          {/* ReconDesk result */}
          {reconResult && reconResult.targets.length > 0 && (
            <div className="mt-2 p-2 rounded text-[10px] bg-info/10 border border-info/30 text-info/80">
              Sent to ReconDesk: {reconResult.targets.join(', ')}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
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
                      addBookmarkTag(tagInput)
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
                  onClick={handleAiSummarise}
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
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: readerMode ? '#1f2937' : 'rgba(226,232,240,0.8)' }}>
              {item.summary}
            </p>
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
      </motion.div>
    </AnimatePresence>
  )
}
