// SourcesView — manage feed sources: list grouped by category, add, toggle, delete, health
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import HelpTip from '../ui/HelpTip'
import type { FeedSource, FeedType, FeedCategory } from '../../../shared/types'

// ── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 10_000)    return 'just now'
  if (diff < 60_000)    return `${Math.floor(diff / 1_000)}s ago`
  if (diff < 3600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

function healthColor(source: FeedSource): string {
  if (!source.enabled) return '#4a5568'
  const attempts = source.attemptCount ?? (source.successCount ?? 0) + (source.errorCount ?? 0)
  if (!attempts) return '#4a9eff'
  const rate = (source.successCount ?? 0) / attempts
  if (source.consecutiveFailures && source.consecutiveFailures >= 3) return '#f85149'
  if (rate >= 0.8) return '#3fb950'
  if (rate >= 0.5) return '#d29922'
  return '#f85149'
}

// ── SourceRow ─────────────────────────────────────────────────────────────────

function SourceRow({ source }: { source: FeedSource }) {
  const setSources        = useStore(s => s.setSources)
  const setRefreshing     = useStore(s => s.setRefreshing)
  const setItems          = useStore(s => s.setItems)
  const setLastRefreshed  = useStore(s => s.setLastRefreshed)
  const [delConfirm, setDelConfirm]       = useState(false)
  const [refreshing, setLocalRefreshing]  = useState(false)
  const [editInterval, setEditInterval]   = useState(false)
  const [interval, setInterval]           = useState(source.pollIntervalMinutes ?? 0)

  const hColor = healthColor(source)

  async function handleToggle() {
    const updated = await window.electronAPI.toggleSource(source.id)
    setSources(updated)
  }

  async function handleRefresh() {
    setLocalRefreshing(true)
    setRefreshing(true)
    await window.electronAPI.refreshSource(source.id)
    const state = await window.electronAPI.getState()
    setSources(state.sources)
    setItems(state.items)
    setLastRefreshed(new Date().toISOString())
    setRefreshing(false)
    setLocalRefreshing(false)
  }

  async function handleDelete() {
    const updated = await window.electronAPI.deleteSource(source.id)
    setSources(updated)
    setDelConfirm(false)
  }

  async function saveInterval() {
    const updated = await window.electronAPI.updateSource(source.id, { pollIntervalMinutes: interval || undefined })
    setSources(updated)
    setEditInterval(false)
  }

  const attempts = source.attemptCount ?? (source.successCount ?? 0) + (source.errorCount ?? 0)
  const successRate = attempts > 0 ? Math.round(((source.successCount ?? 0) / attempts) * 100) : null

  let hostname = ''
  try { hostname = new URL(source.url).hostname } catch { hostname = source.url.slice(0, 30) }

  return (
    <div className="group px-4 py-3 border-b border-border/40 hover:bg-border/10 transition-colors">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: hColor }} title={`Health: ${successRate !== null ? successRate + '%' : 'unknown'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text truncate">{source.name}</span>
            <span className="text-[9px] px-1 py-px bg-border/40 text-muted/60 rounded uppercase font-mono">{source.type}</span>
            {source.category && (
              <span className="text-[9px] px-1 py-px bg-border/30 text-muted/50 rounded">{source.category}</span>
            )}
          </div>
          <p className="text-[10px] text-muted/50 truncate mt-0.5">{hostname}</p>
        </div>

        {/* Health stats */}
        <div className="flex items-center gap-2 text-[10px]">
          {successRate !== null && (
            <span style={{ color: hColor }}>{successRate}%</span>
          )}
          <span className="text-muted/50 w-20 text-right flex-shrink-0">{timeAgo(source.lastSuccess)}</span>
          <span className="font-mono text-text/70 w-8 text-right flex-shrink-0">{source.itemCount}</span>
          {source.errorCount > 0 && (
            <span className="text-danger/70 w-10 text-right flex-shrink-0">{source.errorCount}x err</span>
          )}
        </div>

        {/* Poll interval */}
        <div className="flex-shrink-0">
          {editInterval ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={interval}
                onChange={e => setInterval(Number(e.target.value))}
                className="w-14 bg-bg border border-border/60 rounded px-1 py-0.5 text-[10px] text-text text-center focus:outline-none focus:border-accent no-drag"
                placeholder="min"
              />
              <button onClick={saveInterval} className="text-[9px] px-1.5 py-0.5 bg-accent/15 border border-accent/30 text-accent rounded">OK</button>
              <button onClick={() => setEditInterval(false)} className="text-[9px] px-1 text-muted">×</button>
            </div>
          ) : (
            <button
              onClick={() => setEditInterval(true)}
              className="text-[9px] px-2 py-0.5 rounded border border-border/40 text-muted/50 hover:text-text hover:border-border transition-colors"
              title="Set per-source poll interval"
            >
              {source.pollIntervalMinutes ? `${source.pollIntervalMinutes}m` : 'auto'}
            </button>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={handleToggle}
          className={`w-8 h-4 rounded-full border transition-all flex-shrink-0 relative ${source.enabled ? 'bg-accent/30 border-accent/50' : 'bg-border/30 border-border/60'}`}
        >
          <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${source.enabled ? 'right-0.5 bg-accent' : 'left-0.5 bg-muted/60'}`} />
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleRefresh}
            disabled={refreshing || !source.enabled}
            className="text-[10px] px-2 py-0.5 bg-border/40 hover:bg-border/70 text-muted hover:text-text rounded transition-colors disabled:opacity-30"
          >
            {refreshing ? '…' : '↻'}
          </button>
          {!delConfirm ? (
            <button
              onClick={() => setDelConfirm(true)}
              className="text-[10px] px-2 py-0.5 bg-danger/10 hover:bg-danger/25 border border-danger/20 text-danger/70 hover:text-danger rounded transition-colors"
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted/60">Sure?</span>
              <button onClick={handleDelete} className="text-[10px] px-2 py-0.5 bg-danger/25 border border-danger/40 text-danger rounded">Yes</button>
              <button onClick={() => setDelConfirm(false)} className="text-[10px] px-2 py-0.5 bg-border/40 text-muted rounded">No</button>
            </div>
          )}
        </div>
      </div>
      {source.error && source.errorCount >= 1 && (
        <p className="text-[10px] text-danger/70 mt-1 pl-5 truncate">{source.error}</p>
      )}
    </div>
  )
}

// ── AddSourceModal ────────────────────────────────────────────────────────────

function AddSourceModal({ onClose }: { onClose: () => void }) {
  const setSources = useStore(s => s.setSources)
  const [name, setName]    = useState('')
  const [url, setUrl]      = useState('')
  const [type, setType]    = useState<FeedType>('rss')
  const [category, setCategory] = useState<FeedCategory>('Security News')
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; count?: number; error?: string } | null>(null)
  const [adding, setAdding] = useState(false)

  const urlLabel = type === 'github' ? 'GitHub repo slug (e.g. owner/repo)' : type === 'uptime' ? 'URL to monitor (HEAD request)' : 'Feed URL'
  const urlPlaceholder = type === 'github' ? 'danielmiessler/SecLists' : type === 'uptime' ? 'https://example.com' : 'https://example.com/feed.rss'

  async function handleTest() {
    if (!url.trim()) return
    if (type === 'uptime' || type === 'github') {
      setTestResult({ ok: true, count: 0 })
      return
    }
    setTesting(true)
    setTestResult(null)
    const res = await window.electronAPI.testSource(url.trim())
    setTestResult(res)
    setTesting(false)
  }

  async function handleAdd() {
    if (!name.trim() || !url.trim()) return
    setAdding(true)
    const effectiveUrl = type === 'github' && !url.startsWith('http')
      ? url.trim()
      : url.trim()
    const updated = await window.electronAPI.addSource({
      name:     name.trim(),
      url:      effectiveUrl,
      type,
      category,
      enabled:  true,
    })
    setSources(updated)
    setAdding(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="w-[440px] bg-panel border border-border/80 rounded shadow-glow"
      >
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <span className="text-sm font-semibold text-text">Add Source</span>
          <button onClick={onClose} className="text-muted hover:text-text transition-colors text-lg leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-1.5">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Source name"
              className="w-full bg-bg border border-border/60 rounded px-3 py-2 text-xs text-text placeholder-muted/40 focus:outline-none focus:border-accent transition-colors no-drag"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-1.5">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as FeedType)}
              className="w-full bg-bg border border-border/60 rounded px-3 py-2 text-xs text-text focus:outline-none focus:border-accent transition-colors no-drag"
            >
              <option value="rss">RSS</option>
              <option value="atom">Atom</option>
              <option value="cve">CVE / JSON</option>
              <option value="uptime">Uptime Monitor (HTTP HEAD)</option>
              <option value="github">GitHub Repo Watcher</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-1.5">{urlLabel}</label>
            <input
              value={url}
              onChange={e => { setUrl(e.target.value); setTestResult(null) }}
              placeholder={urlPlaceholder}
              className="w-full bg-bg border border-border/60 rounded px-3 py-2 text-xs text-text placeholder-muted/40 focus:outline-none focus:border-accent transition-colors no-drag font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as FeedCategory)}
              className="w-full bg-bg border border-border/60 rounded px-3 py-2 text-xs text-text focus:outline-none focus:border-accent transition-colors no-drag"
            >
              <option>Security News</option>
              <option>Threat Intel</option>
              <option>CVE</option>
              <option>Malware</option>
              <option>Research</option>
              <option>Uptime</option>
              <option>GitHub</option>
              <option>Custom</option>
            </select>
          </div>
          {testResult && (
            <div className={`text-[11px] px-3 py-2 rounded border ${testResult.ok ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'}`}>
              {testResult.ok ? (testResult.count ? `Found ${testResult.count} items` : 'URL reachable') : `Error: ${testResult.error}`}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleTest}
              disabled={!url.trim() || testing}
              className="px-3 py-1.5 text-xs bg-border/40 hover:bg-border/70 text-muted hover:text-text border border-border/60 rounded transition-colors disabled:opacity-40"
            >
              {testing ? 'Testing…' : 'Test'}
            </button>
            <button
              onClick={handleAdd}
              disabled={!name.trim() || !url.trim() || adding}
              className="px-4 py-1.5 text-xs bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent rounded transition-colors disabled:opacity-40"
            >
              {adding ? 'Adding…' : 'Add Source'}
            </button>
            <button onClick={onClose} className="ml-auto px-3 py-1.5 text-xs text-muted hover:text-text transition-colors">Cancel</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Category Group ────────────────────────────────────────────────────────────

function CategoryGroup({ category, sources }: { category: string; sources: FeedSource[] }) {
  const [collapsed, setCollapsed] = useState(false)
  const active  = sources.filter(s => s.enabled).length
  const errored = sources.filter(s => (s.errorCount ?? 0) >= 3 && s.enabled).length

  return (
    <div>
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 bg-panel/30 border-b border-border/30 hover:bg-panel/50 transition-colors text-left"
      >
        <span className="text-[10px] font-semibold text-muted/70 uppercase tracking-widest flex-1">{category}</span>
        <span className="text-[9px] font-mono text-muted/50">{active}/{sources.length}</span>
        {errored > 0 && <span className="text-[9px] text-danger">{errored} err</span>}
        <span className="text-[10px] text-muted/40">{collapsed ? '▸' : '▾'}</span>
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {sources.map(s => <SourceRow key={s.id} source={s} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── SourcesView ───────────────────────────────────────────────────────────────

export default function SourcesView() {
  const sources     = useStore(s => s.sources)
  const [showModal, setShowModal] = useState(false)

  const active   = sources.filter(s => s.enabled).length
  const errored  = sources.filter(s => (s.errorCount ?? 0) >= 3 && s.enabled).length

  const byCategory = useMemo(() => {
    const map = new Map<string, FeedSource[]>()
    sources.forEach(src => {
      const cat = src.category ?? 'Custom'
      const arr = map.get(cat) ?? []
      arr.push(src)
      map.set(cat, arr)
    })
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [sources])

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-5 py-4 border-b border-border/50 flex-shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text">Sources</h2>
            <HelpTip
              title="Sources"
              text="Every feed SignalBoard polls. Toggle a source to include or exclude it from the Signal Feed, set per-source poll intervals, or test new URLs. Custom user-added feeds live here too — see Settings → Custom Feeds for a focused view."
            />
          </div>
          <p className="text-xs text-muted/50 mt-0.5">
            {sources.length} configured · {active} active
            {errored > 0 && <span className="text-danger ml-1">· {errored} errored</span>}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 text-xs bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent rounded transition-colors"
        >
          + Add Source
        </button>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-panel/20 text-[9px] font-semibold text-muted/50 uppercase tracking-widest">
        <span className="w-2 flex-shrink-0" />
        <span className="flex-1">Source</span>
        <span className="w-10">Rate</span>
        <span className="w-20 text-right">Last OK</span>
        <span className="w-8 text-right">Items</span>
        <span className="w-10 text-right">Errors</span>
        <span className="w-14 text-center">Interval</span>
        <span className="w-8" />
        <span className="w-[88px]" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <p className="text-xs text-muted/40">No sources configured.</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-accent hover:text-accent/70 transition-colors">+ Add your first source</button>
          </div>
        ) : (
          byCategory.map(([cat, srcs]) => (
            <CategoryGroup key={cat} category={cat} sources={srcs} />
          ))
        )}
      </div>

      <AnimatePresence>
        {showModal && <AddSourceModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  )
}
