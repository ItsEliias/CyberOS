// CustomFeedsEditor — Settings → Custom Feeds.
// Lets the user view, add, toggle, and remove their personal RSS/Atom feed URLs.
// Custom feeds are surfaced as FeedSources with id prefix `custom-` and are merged
// into the regular Signal Feed view alongside built-in sources.
import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import type { FeedSource } from '../../../shared/types'

export const CUSTOM_PREFIX = 'custom-'

export function isCustomSource(s: Pick<FeedSource, 'id'>): boolean {
  return s.id.startsWith(CUSTOM_PREFIX)
}

function looksLikeUrl(u: string): boolean {
  try {
    const url = new URL(u.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function hostname(u: string): string {
  try { return new URL(u).hostname } catch { return u.slice(0, 40) }
}

// ── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ source }: { source: FeedSource }) {
  let color = '#4a5568' // disabled / unknown
  let title = 'Disabled'
  if (source.enabled) {
    const attempts = source.attemptCount ?? (source.successCount ?? 0) + (source.errorCount ?? 0)
    if (!attempts) {
      color = '#4a9eff'; title = 'Pending first fetch'
    } else if ((source.consecutiveFailures ?? 0) >= 3) {
      color = '#f85149'; title = source.error ? `Failing: ${source.error}` : 'Failing'
    } else if (source.errorCount && source.errorCount > 0) {
      color = '#d29922'; title = `Intermittent — ${source.errorCount} errors`
    } else {
      color = '#3fb950'; title = 'Healthy'
    }
  }
  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
      title={title}
    />
  )
}

// ── Row ──────────────────────────────────────────────────────────────────────

function CustomFeedRow({ source }: { source: FeedSource }) {
  const setSources = useStore(s => s.setSources)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy]             = useState(false)

  async function handleToggle() {
    setBusy(true)
    const updated = await window.electronAPI.toggleSource(source.id)
    setSources(updated)
    setBusy(false)
  }

  async function handleDelete() {
    setBusy(true)
    const updated = await window.electronAPI.deleteSource(source.id)
    setSources(updated)
    setConfirming(false)
    setBusy(false)
  }

  return (
    <div className="group flex items-center gap-2.5 py-2 px-2 rounded border border-transparent hover:border-border/40 hover:bg-panel/30 transition-colors">
      <StatusDot source={source} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text truncate">{source.name || hostname(source.url)}</span>
          <span className="text-[9px] px-1 py-px bg-accent/10 border border-accent/30 text-accent rounded uppercase font-mono">Custom</span>
        </div>
        <p className="text-[10px] text-muted/50 font-mono truncate mt-0.5">{source.url}</p>
      </div>
      <button
        onClick={handleToggle}
        disabled={busy}
        className={`w-9 h-5 rounded-full border transition-all relative flex-shrink-0 ${source.enabled ? 'bg-accent/30 border-accent/50' : 'bg-border/30 border-border/60'}`}
        title={source.enabled ? 'Disable feed' : 'Enable feed'}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${source.enabled ? 'right-0.5 bg-accent' : 'left-0.5 bg-muted/60'}`} />
      </button>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="text-[10px] px-2 py-0.5 bg-danger/10 hover:bg-danger/25 border border-danger/20 text-danger/70 hover:text-danger rounded transition-colors flex-shrink-0"
        >
          Remove
        </button>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleDelete} disabled={busy} className="text-[10px] px-2 py-0.5 bg-danger/25 border border-danger/40 text-danger rounded">Yes</button>
          <button onClick={() => setConfirming(false)} className="text-[10px] px-2 py-0.5 bg-border/40 text-muted rounded">No</button>
        </div>
      )}
    </div>
  )
}

// ── Add form ────────────────────────────────────────────────────────────────

function AddCustomFeedForm({ existingUrls }: { existingUrls: Set<string> }) {
  const setSources = useStore(s => s.setSources)
  const [url, setUrl]       = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    setError(null)
    const trimmed = url.trim()
    if (!trimmed) return
    if (!looksLikeUrl(trimmed)) {
      setError('Enter a valid http(s) URL')
      return
    }
    if (existingUrls.has(trimmed)) {
      setError('Feed already added')
      return
    }
    setAdding(true)
    try {
      // Probe: detect rss/atom and try to pull a real feed title; fall back to hostname.
      const probe = await window.electronAPI.probeFeed(trimmed)
      const name  = (probe.ok && probe.title) ? probe.title : hostname(trimmed)
      const type  = (probe.ok ? probe.type : 'rss')
      const updated = await window.electronAPI.addSource({
        name,
        url:      trimmed,
        type,
        category: 'Custom',
        enabled:  true,
      })
      setSources(updated)
      setUrl('')
      // Find the newly-added source and immediately fetch it so items appear in the
      // main Feed view without waiting for the next scheduled refresh.
      const fresh = updated.find(s => s.url === trimmed && s.id.startsWith('custom-'))
      if (fresh) {
        await window.electronAPI.refreshSource(fresh.id)
        const state = await window.electronAPI.getState()
        setSources(state.sources)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 no-drag">
        <input
          value={url}
          onChange={e => { setUrl(e.target.value); setError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder="https://example.com/feed.rss"
          className="flex-1 bg-bg border border-border/60 rounded px-2.5 py-1.5 text-xs text-text placeholder-muted/40 font-mono focus:outline-none focus:border-accent transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!url.trim() || adding}
          className="px-3 py-1.5 text-xs bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent rounded transition-colors disabled:opacity-40"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && (
        <p className="text-[10px] text-danger pl-0.5">{error}</p>
      )}
    </div>
  )
}

// ── Editor ──────────────────────────────────────────────────────────────────

export default function CustomFeedsEditor() {
  const sources = useStore(s => s.sources)
  const custom  = useMemo(() => sources.filter(isCustomSource), [sources])
  const existingUrls = useMemo(() => new Set(custom.map(s => s.url)), [custom])

  return (
    <div className="space-y-3">
      <AddCustomFeedForm existingUrls={existingUrls} />
      {custom.length === 0 ? (
        <div className="p-3 bg-panel/20 border border-border/30 rounded text-[11px] text-muted/60 text-center">
          No custom feeds yet. Paste an RSS or Atom feed URL above to add one.
        </div>
      ) : (
        <div className="space-y-1">
          {custom.map(s => (
            <CustomFeedRow key={s.id} source={s} />
          ))}
        </div>
      )}
    </div>
  )
}
