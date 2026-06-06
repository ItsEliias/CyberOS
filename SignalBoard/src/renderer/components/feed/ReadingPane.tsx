// ReadingPane — full article view with AI summary, reader mode, CVE info, bookmarks, ReconDesk
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import { ReadingPaneEmpty, ReadingPaneBody } from './ReadingPaneSlots'

function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

// Drop-cap style injected once
const DROP_CAP_STYLE = `
.prose-drop-cap::first-letter {
  float: left;
  font-size: 3.2em;
  line-height: 0.85;
  padding-right: 6px;
  padding-top: 2px;
  font-weight: 700;
  color: #ff6b6b;
}
`

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

  // Font size: 3 steps persisted in localStorage
  type FontStep = 'sm' | 'base' | 'lg'
  const FONT_SIZES: Record<FontStep, number> = { sm: 12, base: 14, lg: 16 }
  const FONT_STEPS: FontStep[] = ['sm', 'base', 'lg']
  const [fontStep, setFontStep] = useState<FontStep>(() => {
    try { return (localStorage.getItem('sb-reading-font') as FontStep) || 'base' } catch { return 'base' }
  })
  function cycleFontSize(dir: 1 | -1) {
    const idx = FONT_STEPS.indexOf(fontStep)
    const next = FONT_STEPS[Math.max(0, Math.min(FONT_STEPS.length - 1, idx + dir))]
    setFontStep(next)
    try { localStorage.setItem('sb-reading-font', next) } catch {}
  }
  const [cveData, setCveData]       = useState<Record<string, { cvss?: number; severity?: string }>>({})
  const [reconResult, setReconResult] = useState<{ targets: string[] } | null>(null)
  const [tagInput, setTagInput]     = useState('')
  const [copyToast, setCopyToast]   = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [scrollPct, setScrollPct]   = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const rafRef     = useRef<number | null>(null)

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const el = contentRef.current
      if (!el) return
      const max = el.scrollHeight - el.clientHeight
      setScrollPct(max > 0 ? Math.round((el.scrollTop / max) * 100) : 0)
    })
  }, [])

  const item = items.find(i => i.id === selectedId)
  const isBookmarked = item ? bookmarks.includes(item.id) : false

  // Reset progress when item changes
  useEffect(() => {
    setScrollPct(0)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [item?.id])

  // Inject drop-cap styles once
  useEffect(() => {
    const id = 'signalboard-dropcap'
    if (!document.getElementById(id)) {
      const s = document.createElement('style')
      s.id = id
      s.textContent = DROP_CAP_STYLE
      document.head.appendChild(s)
    }
  }, [])

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
    if (res.ok) {
      patchItem(item.id, { saved: true })
      setSaveError(null)
    } else {
      setSaveError(res.error ?? 'Failed to save')
      setTimeout(() => setSaveError(null), 4000)
    }
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
    window.electronAPI.saveBookmarks(bookmarks, { ...bookmarkTags, [item.id]: next })
  }

  if (!item) return <ReadingPaneEmpty />

  const tier     = TIER_CONFIG[item.relevanceTier]
  const pubDate  = new Date(item.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const cveIds   = extractCveIds(`${item.title} ${item.summary}`)
  const readMins = estimateReadTime(`${item.title} ${item.summary}`)

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
        {/* Scroll progress bar */}
        <div className="flex-shrink-0 h-[2px] w-full" style={{ background: readerMode ? '#f3f4f6' : 'rgba(42,51,71,0.3)' }}>
          <div
            className="h-full"
            style={{
              width: `${scrollPct}%`,
              background: `linear-gradient(90deg, ${tier.color}99, ${tier.color})`,
              transition: 'width 0.1s linear',
            }}
          />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border/50 flex-shrink-0" style={{ borderColor: readerMode ? '#e5e7eb' : undefined }}>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setSelectedId(null)} className="text-[10px] hover:opacity-80 transition-opacity mr-1" style={{ color: readerMode ? '#6b7280' : undefined }}>← Back</button>
            <span className="text-xs" style={{ color: readerMode ? '#6b7280' : '#8b949e' }}>{item.sourceName}</span>
            <span className="text-xs" style={{ color: readerMode ? '#9ca3af' : '#8b949e' }}>·</span>
            <span className="text-xs" style={{ color: readerMode ? '#9ca3af' : '#8b949e' }}>{pubDate}</span>
            <span className="text-[9px] px-1.5 py-px rounded font-medium" style={{ background: readerMode ? '#f3f4f6' : 'rgba(42,51,71,0.4)', color: readerMode ? '#6b7280' : '#8b949e', border: `1px solid ${readerMode ? '#e5e7eb' : 'rgba(42,51,71,0.5)'}` }}>
              {readMins} min read
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {/* Font size controls */}
              <button
                onClick={() => cycleFontSize(-1)}
                disabled={fontStep === 'sm'}
                className="text-[10px] px-1.5 py-0.5 rounded border transition-colors"
                style={{
                  color: readerMode ? '#374151' : '#8b949e',
                  borderColor: readerMode ? '#d1d5db' : 'rgba(42,51,71,0.6)',
                  background: 'transparent',
                  opacity: fontStep === 'sm' ? 0.35 : 1,
                }}
                title="Decrease font size"
              >
                A−
              </button>
              <button
                onClick={() => cycleFontSize(1)}
                disabled={fontStep === 'lg'}
                className="text-[10px] px-1.5 py-0.5 rounded border transition-colors"
                style={{
                  color: readerMode ? '#374151' : '#8b949e',
                  borderColor: readerMode ? '#d1d5db' : 'rgba(42,51,71,0.6)',
                  background: 'transparent',
                  opacity: fontStep === 'lg' ? 0.35 : 1,
                }}
                title="Increase font size"
              >
                A+
              </button>
              <button
                onClick={() => setReaderMode(v => !v)}
                className="text-[10px] px-2 py-0.5 rounded border transition-colors"
                style={{ color: readerMode ? '#374151' : '#8b949e', borderColor: readerMode ? '#d1d5db' : 'rgba(42,51,71,0.6)', background: readerMode ? '#f9fafb' : 'transparent' }}
                title="Toggle reader mode"
              >
                Aa
              </button>
            </div>
          </div>

          <h1 className="text-sm font-semibold leading-snug mb-2" style={{ color: readerMode ? '#111827' : '#e2e8f0' }}>{item.title}</h1>

          {cveIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {cveIds.map(id => {
                const info = cveData[id]
                const sev  = info?.severity
                const sevColor = sev === 'critical' ? '#ff6b6b' : sev === 'high' ? '#f85149' : sev === 'medium' ? '#d29922' : '#4a9eff'
                return (
                  <button key={id} onClick={() => window.electronAPI.openUrl(`https://nvd.nist.gov/vuln/detail/${id}`)} className="text-[9px] font-mono px-1.5 py-px rounded border hover:opacity-80 transition-opacity" style={{ color: sevColor, background: `${sevColor}15`, borderColor: `${sevColor}40` }}>
                    {id}{info?.cvss ? ` CVSS ${info.cvss}` : ''}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[9px] font-bold uppercase px-1.5 py-px rounded border" style={{ background: `${tier.color}20`, color: tier.color, borderColor: `${tier.color}40` }}>{tier.label}</span>
            <span className="text-[10px] font-mono" style={{ color: tier.color }}>[{item.relevanceScore}]</span>
            {item.alertMatches?.map(m => (
              <span key={m.ruleId} className="text-[9px] font-bold uppercase px-1.5 py-px rounded border" style={{ background: `${m.color}20`, color: m.color, borderColor: `${m.color}40` }}>ALERT: {m.label}</span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 no-drag flex-wrap">
            <button onClick={() => window.electronAPI.openUrl(item.url)} className="text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5" style={{ background: 'rgba(255,107,107,0.15)', borderColor: 'rgba(255,107,107,0.3)', color: '#ff6b6b', borderRadius: '8px' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open
            </button>
            <button onClick={() => { navigator.clipboard.writeText(item.url); setCopyToast(true); setTimeout(() => setCopyToast(false), 1800) }} className="text-xs px-2.5 py-1 border transition-colors flex items-center gap-1.5" style={{ background: copyToast ? 'rgba(63,185,80,0.12)' : readerMode ? '#f9fafb' : 'rgba(22,27,39,0.6)', borderColor: copyToast ? 'rgba(63,185,80,0.3)' : readerMode ? '#d1d5db' : 'rgba(42,51,71,0.5)', color: copyToast ? '#3fb950' : readerMode ? '#374151' : '#8b949e', borderRadius: '8px' }}>
              {copyToast ? (<><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Copied</>) : (<><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>Copy Link</>)}
            </button>
            <button onClick={handleToggleBookmark} className="text-xs px-2.5 py-1 border transition-colors flex items-center gap-1.5" style={{ background: isBookmarked ? 'rgba(210,153,34,0.15)' : readerMode ? '#f9fafb' : 'rgba(22,27,39,0.6)', borderColor: isBookmarked ? 'rgba(210,153,34,0.3)' : readerMode ? '#d1d5db' : 'rgba(42,51,71,0.5)', color: isBookmarked ? '#d29922' : readerMode ? '#374151' : '#8b949e', borderRadius: '8px' }}>
              {isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
            </button>
            <button onClick={() => { items.filter(i => !i.read).forEach(i => { window.electronAPI.markRead(i.id); patchItem(i.id, { read: true }) }) }} className="text-xs px-2.5 py-1 border transition-colors flex items-center gap-1.5" style={{ background: readerMode ? '#f9fafb' : 'rgba(22,27,39,0.6)', borderColor: readerMode ? '#d1d5db' : 'rgba(42,51,71,0.5)', color: readerMode ? '#374151' : '#8b949e', borderRadius: '8px' }} title="Mark all feed items as read">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Mark all read
            </button>
            <button onClick={handleSaveToVault} className="text-xs px-2.5 py-1 border transition-colors" style={{ background: saveError ? 'rgba(248,81,73,0.12)' : readerMode ? '#f9fafb' : 'rgba(22,27,39,0.6)', borderColor: saveError ? 'rgba(248,81,73,0.3)' : readerMode ? '#d1d5db' : 'rgba(42,51,71,0.5)', color: saveError ? '#f85149' : readerMode ? '#374151' : '#8b949e', borderRadius: '8px' }} title={saveError ?? 'Save to Vault'}>{saveError ? 'Save failed' : 'Save to Vault'}</button>
            <button onClick={handleReconDesk} className="text-xs px-2.5 py-1 border transition-colors" style={{ background: 'rgba(74,158,255,0.1)', borderColor: 'rgba(74,158,255,0.25)', color: '#4a9eff', borderRadius: '8px' }} title="Extract IPs/hostnames and send to ReconDesk">+ ReconDesk</button>
          </div>

          {reconResult && reconResult.targets.length > 0 && (
            <div className="mt-2 p-2 rounded text-[10px] bg-info/10 border border-info/30 text-info/80">
              Sent to ReconDesk: {reconResult.targets.join(', ')}
            </div>
          )}
        </div>

        <ReadingPaneBody
          item={item}
          readerMode={readerMode}
          aiLoading={aiLoading}
          aiError={aiError}
          tagInput={tagInput}
          setTagInput={setTagInput}
          onAiSummarise={handleAiSummarise}
          onAddBookmarkTag={addBookmarkTag}
          hostname={hostname}
          contentRef={contentRef}
          onScroll={handleScroll}
          fontSize={FONT_SIZES[fontStep]}
        />
      </motion.div>
    </AnimatePresence>
  )
}
