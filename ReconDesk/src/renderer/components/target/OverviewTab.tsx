import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRecondeskStore, calcHealthScore } from '../../stores/useRecondeskStore'
import type { TargetStatus, Platform, Difficulty, AttackStage } from '../../types/recondesk'

const PLATFORM_STYLE: Record<Platform, { color: string; bg: string; border: string }> = {
  HTB:      { color: '#f85149', bg: 'rgba(248,81,73,0.10)',   border: 'rgba(248,81,73,0.20)'   },
  THM:      { color: '#3fb950', bg: 'rgba(63,185,80,0.10)',   border: 'rgba(63,185,80,0.20)'   },
  CTF:      { color: '#b44fff', bg: 'rgba(180,79,255,0.10)',  border: 'rgba(180,79,255,0.20)'  },
  Client:   { color: '#4a9eff', bg: 'rgba(74,158,255,0.10)',  border: 'rgba(74,158,255,0.20)'  },
  Internal: { color: '#8b949e', bg: 'rgba(139,148,158,0.10)', border: 'rgba(139,148,158,0.20)' },
}

const STATUS_COLORS: Record<TargetStatus, string> = {
  active: '#3fb950', completed: '#4a9eff', abandoned: '#484f58', paused: '#d29922',
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: '#3fb950', Medium: '#d29922', Hard: '#f85149', Insane: '#b44fff',
}

const STAGES: AttackStage[] = ['recon', 'enum', 'exploit', 'post', 'privesc', 'loot']

function healthColor(score: number): string {
  if (score >= 75) return '#3fb950'
  if (score >= 45) return '#d29922'
  return '#f85149'
}

const inputCls = [
  'bg-[#07080f] border border-[rgba(42,51,71,0.75)] rounded px-2 py-1',
  'text-xs text-[#e6edf3] placeholder-[#484f58]',
  'focus:outline-none focus:border-[#d29922] transition-colors',
].join(' ')

function OverviewSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-4xl">
        <div className="flex items-start justify-between mb-5">
          <div className="flex flex-col gap-2">
            <div className="skeleton h-5 w-48 rounded-md" />
            <div className="skeleton h-3 w-32 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-7 w-14 rounded-md" />
            <div className="skeleton h-7 w-14 rounded-md" />
            <div className="skeleton h-7 w-16 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[0,1,2].map(i => (
            <div key={i} className="panel-card rounded-lg p-3.5">
              <div className="skeleton h-2.5 w-20 rounded mb-3" />
              <div className="grid grid-cols-2 gap-2">
                {[0,1,2,3].map(j => <div key={j} className="skeleton h-8 rounded" />)}
              </div>
            </div>
          ))}
        </div>
        <div className="panel-card rounded-lg p-3.5">
          <div className="skeleton h-2.5 w-14 rounded mb-3" />
          <div className="skeleton h-28 w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}

function CountUpNumber({ value, color }: { value: number; color: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const start = 0
    const duration = 600
    const startTime = performance.now()
    function step(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (value - start) * eased))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value])
  return (
    <span className="text-2xl font-bold tabular-nums" style={{ color, textShadow: `0 0 14px ${color}40` }}>
      {display}
    </span>
  )
}

export default function OverviewTab({ targetId }: { targetId: string }) {
  const targets       = useRecondeskStore(s => s.targets)
  const updateTarget  = useRecondeskStore(s => s.updateTarget)
  const addScreenshot = useRecondeskStore(s => s.addScreenshot)
  const ecosystemCtx  = useRecondeskStore(s => s.ecosystemContext)
  const setActiveTab  = useRecondeskStore(s => s.setActiveTab)
  const settings      = useRecondeskStore(s => s.settings)
  const addTimelineEntry = useRecondeskStore(s => s.addTimelineEntry)
  const engagements   = useRecondeskStore(s => s.engagements)
  const emitEvent     = useRecondeskStore(s => s.emitEvent)

  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    setIsLoading(true)
    const t = setTimeout(() => setIsLoading(false), 280)
    return () => clearTimeout(t)
  }, [targetId])

  const target = targets.find(t => t.id === targetId)
  if (!target) return null

  const [editMode, setEditMode]             = useState(false)
  const [notesMode, setNotesMode]           = useState<'edit' | 'preview'>('edit')
  const [notes, setNotes]                   = useState(target.notes)
  const [credVaultItems, setCredVaultItems] = useState<any[]>([])
  const [screenshotBusy, setScreenshotBusy] = useState(false)
  const [fullImg, setFullImg]               = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions]  = useState<string[] | null>(null)
  const [aiLoading, setAiLoading]           = useState(false)
  const [aiExpanded, setAiExpanded]         = useState(false)

  const [editForm, setEditForm] = useState({
    name: target.name, ip: target.ip, os: target.os,
    platform: target.platform, status: target.status,
    difficulty: target.difficulty ?? '' as Difficulty | '',
    tags: target.tags.join(', '),
    scheduledDate: target.scheduledDate ?? '',
  })

  const notesRef = useRef(notes)
  notesRef.current = notes

  useEffect(() => {
    const id = setInterval(() => {
      if (notesRef.current !== target.notes) updateTarget(targetId, { notes: notesRef.current })
    }, 30_000)
    return () => clearInterval(id)
  }, [targetId, target.notes, updateTarget])

  useEffect(() => { setNotes(target.notes) }, [target.notes])

  useEffect(() => {
    ;(window.electronAPI as any).fetchCredVault?.(target.ip, target.name)
      .then((items: any[]) => setCredVaultItems(items ?? []))
      .catch(() => {})
  }, [target.ip, target.name])

  function saveEdit() {
    updateTarget(targetId, {
      name:          editForm.name.trim() || target.name,
      ip:            editForm.ip.trim()   || target.ip,
      os:            editForm.os,
      platform:      editForm.platform as Platform,
      status:        editForm.status as TargetStatus,
      difficulty:    (editForm.difficulty || undefined) as Difficulty | undefined,
      tags:          editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      scheduledDate: editForm.scheduledDate || undefined,
    })
    setEditMode(false)
  }

  async function captureScreenshot() {
    setScreenshotBusy(true)
    try {
      const result = await (window.electronAPI as any).captureScreenshot?.(`Screenshot ${new Date().toLocaleTimeString()}`)
      if (result?.ok) {
        addScreenshot(targetId, { path: result.path, thumbnail: result.thumbnail, capturedAt: new Date().toISOString(), label: `Screenshot ${new Date().toLocaleTimeString()}` })
      }
    } finally {
      setScreenshotBusy(false)
    }
  }

  async function openInNetworkMap() {
    await (window.electronAPI as any).openInNetworkMap?.(target.ip)
  }

  async function fetchAiSuggestions() {
    if (!settings.anthropicApiKey) return
    setAiLoading(true)
    try {
      const ports   = target.ports.filter(p => p.state === 'open').map(p => `${p.port}/${p.protocol}${p.service ? ` (${p.service})` : ''}`)
      const cves    = target.attackCards.filter(c => c.notes?.toLowerCase().includes('cve')).map(c => c.title)
      const engName = engagements.find(e => e.id === target.engagementId)?.name ?? ''
      const result  = await (window.electronAPI as any).aiSuggest?.({ apiKey: settings.anthropicApiKey, ports, os: target.os, cves, engagement: engName })
      if (result) { setAiSuggestions(result); setAiExpanded(true); addTimelineEntry(targetId, 'note_added', 'AI suggestions generated') }
    } finally {
      setAiLoading(false)
    }
  }

  const totalCards  = target.attackCards.length
  const doneCards   = target.attackCards.filter(c => c.status === 'done').length
  const progressPct = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0
  const health      = calcHealthScore(target)
  const pStyle      = PLATFORM_STYLE[target.platform]

  const targetEngagement = engagements.find(e => e.id === target.engagementId)
  const showScopeBanner  = (target.platform === 'Client' || target.platform === 'Internal') && !targetEngagement?.inScope

  const enrichBadge = target.enrichment?.status === 'pending'
    ? <span className="text-[9px] px-1.5 py-0.5 rounded animate-pulse bg-[rgba(210,153,34,0.10)] border border-[rgba(210,153,34,0.25)] text-[#d29922]">Enriching...</span>
    : target.enrichment?.status === 'done'
    ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(63,185,80,0.10)] border border-[rgba(63,185,80,0.25)] text-[#3fb950]">Enriched</span>
    : target.enrichment?.status === 'error'
    ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(248,81,73,0.10)] border border-[rgba(248,81,73,0.25)] text-[#f85149]">Enrich failed</span>
    : null

  const geoLabel = target.geo?.status === 'done'
    ? <span className="text-xs text-[#8b949e]">{target.geo.flag} {target.geo.city}{target.geo.city && target.geo.country ? ', ' : ''}{target.geo.country}</span>
    : target.geo?.status === 'private'
    ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(72,79,88,0.20)] border border-[rgba(72,79,88,0.30)] text-[#484f58]">Private IP</span>
    : null

  const panelCls = 'panel-card rounded-lg p-3.5'
  const labelCls = 'label-caps mb-3 block'

  if (isLoading) return <OverviewSkeleton />

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-4xl">
        {/* Scope warning banner */}
        {showScopeBanner && (
          <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(210,153,34,0.07)', border: '1px solid rgba(210,153,34,0.30)' }}>
            <span className="text-base flex-shrink-0 mt-0.5" style={{ color: '#d29922' }}>⚠</span>
            <div>
              <p className="text-xs font-semibold" style={{ color: '#d29922' }}>Scope not defined</p>
              <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(210,153,34,0.65)' }}>
                No rules of engagement are recorded for this {target.platform.toLowerCase()} target.
                Use the engagement's <strong className="font-semibold">RoE</strong> button in the sidebar to define scope before proceeding.
              </p>
            </div>
          </div>
        )}

        {/* Target header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            {editMode ? (
              <div className="flex flex-col gap-2 mb-2">
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={`${inputCls} text-lg font-semibold w-64`} />
                <div className="flex gap-2 flex-wrap">
                  <input value={editForm.ip} onChange={e => setEditForm(f => ({ ...f, ip: e.target.value }))} className={`${inputCls} font-mono w-40`} placeholder="IP" />
                  <select value={editForm.platform} onChange={e => setEditForm(f => ({ ...f, platform: e.target.value as Platform }))} className={inputCls}>
                    {(['HTB','THM','CTF','Client','Internal'] as Platform[]).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input value={editForm.os} onChange={e => setEditForm(f => ({ ...f, os: e.target.value }))} className={`${inputCls} w-28`} placeholder="OS" />
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as TargetStatus }))} className={inputCls}>
                    {(['active','paused','completed','abandoned'] as TargetStatus[]).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <select value={editForm.difficulty} onChange={e => setEditForm(f => ({ ...f, difficulty: e.target.value as Difficulty | '' }))} className={inputCls}>
                    <option value="">No difficulty</option>
                    {(['Easy','Medium','Hard','Insane'] as Difficulty[]).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} className={`${inputCls} flex-1`} placeholder="Tags (comma-separated)" />
                  <input type="date" value={editForm.scheduledDate} onChange={e => setEditForm(f => ({ ...f, scheduledDate: e.target.value }))} className={`${inputCls} w-36`} title="Scheduled date" />
                  <button onClick={saveEdit} className="px-3 py-1 text-xs rounded transition-colors" style={{ background: 'rgba(210,153,34,0.15)', border: '1px solid rgba(210,153,34,0.30)', color: '#d29922' }}>Save</button>
                  <button onClick={() => setEditMode(false)} className="px-3 py-1 text-xs rounded transition-colors" style={{ background: 'rgba(42,51,71,0.40)', color: '#8b949e' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[target.status] }} />
                  <h1 className="heading-xl" style={{ color: '#e6edf3' }}>{target.name}</h1>
                  {enrichBadge}
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ color: healthColor(health), background: `${healthColor(health)}12`, border: `1px solid ${healthColor(health)}25` }}>
                    {health}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono text-sm cursor-context-menu"
                    style={{ color: 'rgba(210,153,34,0.80)' }}
                    onContextMenu={e => { e.preventDefault(); openInNetworkMap() }}
                    title="Right-click: View in NetworkMap"
                  >
                    {target.ip}
                  </span>
                  {geoLabel}
                  <span style={{ color: '#484f58' }}>·</span>
                  <span className="text-xs px-1.5 py-0.5 rounded border font-medium" style={{ color: pStyle.color, background: pStyle.bg, borderColor: pStyle.border }}>{target.platform}</span>
                  {target.os && <span className="text-xs" style={{ color: '#8b949e' }}>{target.os}</span>}
                  {target.difficulty && <span className="text-xs font-medium" style={{ color: DIFFICULTY_COLORS[target.difficulty] }}>{target.difficulty}</span>}
                  <span className="text-xs capitalize" style={{ color: STATUS_COLORS[target.status] }}>{target.status}</span>
                </div>
                {target.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {target.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded border" style={{ background: 'rgba(42,51,71,0.40)', color: '#8b949e', borderColor: 'rgba(42,51,71,0.6)' }}>{tag}</span>
                    ))}
                  </div>
                )}
                {target.enrichment?.resolvedHostname && (
                  <p className="text-[10px] font-mono mt-1" style={{ color: '#484f58' }}>DNS: {target.enrichment.resolvedHostname}</p>
                )}
              </>
            )}
          </div>

          {!editMode && (
            <div className="flex items-center gap-2">
              <button onClick={openInNetworkMap} className="px-2.5 py-1.5 text-xs rounded border border-[rgba(42,51,71,0.6)] text-[#4a9eff] hover:bg-[rgba(74,158,255,0.10)] hover:border-[rgba(74,158,255,0.30)] transition-colors" title="View in NetworkMap">Map</button>
              <button onClick={() => setEditMode(true)} className="px-3 py-1.5 text-xs rounded border border-[rgba(42,51,71,0.6)] text-[#8b949e] hover:text-[#e6edf3] hover:border-[rgba(210,153,34,0.35)] transition-colors">Edit</button>
              <button onClick={() => setActiveTab('export')} className="px-3 py-1.5 text-xs rounded border border-[rgba(210,153,34,0.25)] bg-[rgba(210,153,34,0.10)] text-[#d29922] hover:bg-[rgba(210,153,34,0.18)] transition-colors">Export</button>
            </div>
          )}
        </div>

        {/* Stats + Attack Progress + Context */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className={panelCls}>
            <p className={labelCls} style={{ color: '#484f58' }}>Quick Stats</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Ports',       value: target.ports.length,       color: '#4a9eff' },
                { label: 'Creds',       value: target.credentials.length, color: '#f85149' },
                { label: 'Cards',       value: target.attackCards.length, color: '#d29922' },
                { label: 'Screenshots', value: target.screenshots.length, color: '#b44fff' },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  className="flex flex-col"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <CountUpNumber value={item.value} color={item.color} />
                  <span className="text-[10px]" style={{ color: '#484f58' }}>{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className={panelCls}>
            <p className={labelCls} style={{ color: '#484f58' }}>Attack Progress</p>
            {totalCards === 0 ? (
              <p className="text-xs" style={{ color: '#484f58' }}>No attack cards yet</p>
            ) : (
              <>
                <div className="flex gap-0.5 mb-2.5 rounded-full overflow-hidden h-2" style={{ background: 'rgba(42,51,71,0.4)' }}>
                  {STAGES.map(stage => {
                    const sc = target.attackCards.filter(c => c.stage === stage)
                    if (sc.length === 0) return null
                    const done    = sc.filter(c => c.status === 'done').length
                    const inprog  = sc.filter(c => c.status === 'inprogress').length
                    const blocked = sc.filter(c => c.status === 'blocked').length
                    const stagePct = (sc.length / totalCards) * 100
                    return (
                      <div key={stage} className="flex overflow-hidden" style={{ width: `${stagePct}%` }} title={`${stage}: ${sc.length}`}>
                        {done    > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${(done/sc.length)*100}%` }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} className="h-full flex-shrink-0" style={{ background: '#3fb950' }} />}
                        {inprog  > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${(inprog/sc.length)*100}%` }} transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }} className="h-full flex-shrink-0" style={{ background: '#d29922' }} />}
                        {blocked > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${(blocked/sc.length)*100}%` }} transition={{ duration: 0.7, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }} className="h-full flex-shrink-0" style={{ background: '#f85149' }} />}
                      </div>
                    )
                  })}
                </div>
                {/* Overall progress bar with percentage label */}
                <div className="progress-with-label mb-2">
                  <div className="progress-track h-1.5">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                      style={{ background: 'linear-gradient(90deg, #3fb950, #d29922)' }}
                    />
                  </div>
                  <span className="progress-pct" style={{ color: progressPct === 100 ? '#3fb950' : '#8b949e' }}>
                    {progressPct}%
                  </span>
                </div>
                <p className="text-xs"><span className="font-medium" style={{ color: '#3fb950' }}>{doneCards}</span><span style={{ color: '#484f58' }}> of </span><span className="font-medium" style={{ color: '#e6edf3' }}>{totalCards}</span><span style={{ color: '#484f58' }}> cards done</span></p>
              </>
            )}
          </div>

          <div className={panelCls}>
            <p className={labelCls} style={{ color: '#484f58' }}>Linked Context</p>
            <div className="flex flex-col gap-1.5 text-xs">
              <div><span style={{ color: '#484f58' }}>Lab: </span><span style={{ color: '#e6edf3' }}>{target.name}</span></div>
              {ecosystemCtx.activePlaybook && <div><span style={{ color: '#484f58' }}>Playbook: </span><span style={{ color: '#e6edf3' }}>{ecosystemCtx.activePlaybook}</span></div>}
              <div><span style={{ color: '#484f58' }}>Added: </span><span style={{ color: '#8b949e' }}>{new Date(target.createdAt).toLocaleDateString()}</span></div>
              {target.scheduledDate && <div><span style={{ color: '#484f58' }}>Scheduled: </span><span style={{ color: '#d29922' }}>{target.scheduledDate}</span></div>}
              {target.completedAt && <div><span style={{ color: '#484f58' }}>Done: </span><span style={{ color: '#3fb950' }}>{new Date(target.completedAt).toLocaleDateString()}</span></div>}
              {target.geo?.status === 'done' && <div><span style={{ color: '#484f58' }}>Org: </span><span className="truncate" style={{ color: '#8b949e' }}>{target.geo.org}</span></div>}
            </div>
          </div>
        </div>

        {/* Screenshots */}
        <div className={`${panelCls} mb-4`}>
          <div className="flex items-center justify-between mb-3">
            <p className={labelCls} style={{ color: '#484f58', marginBottom: 0 }}>Screenshots</p>
            <button
              onClick={captureScreenshot} disabled={screenshotBusy}
              className="text-[10px] px-2.5 py-1 rounded border border-[rgba(210,153,34,0.25)] bg-[rgba(210,153,34,0.07)] text-[#d29922] hover:bg-[rgba(210,153,34,0.15)] transition-colors disabled:opacity-40"
            >{screenshotBusy ? 'Capturing...' : '+ Screenshot'}</button>
          </div>
          {target.screenshots.length === 0 ? (
            <p className="text-xs" style={{ color: '#484f58' }}>No screenshots yet. Click to capture the current screen.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {target.screenshots.map(sc => (
                <button key={sc.id} onClick={() => setFullImg(sc.thumbnail ?? sc.path)} className="group relative rounded overflow-hidden border border-[rgba(42,51,71,0.6)] hover:border-[rgba(210,153,34,0.30)] transition-colors">
                  {sc.thumbnail
                    ? <img src={sc.thumbnail} alt={sc.label} className="w-24 h-16 object-cover" />
                    : <div className="w-24 h-16 flex items-center justify-center text-[10px]" style={{ background: 'rgba(42,51,71,0.40)', color: '#484f58' }}>Screenshot</div>
                  }
                  <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity truncate" style={{ background: 'rgba(0,0,0,0.7)', color: '#8b949e' }}>{sc.label}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CredVault Linked Credentials */}
        {credVaultItems.length > 0 && (
          <div className={`${panelCls} mb-4`}>
            <p className={labelCls} style={{ color: '#484f58' }}>Linked Credentials (CredVault)</p>
            <div className="flex flex-col gap-1.5">
              {credVaultItems.slice(0, 10).map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-xs px-2 py-1.5 rounded" style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.5)' }}>
                  <span className="font-mono" style={{ color: 'rgba(248,81,73,0.80)' }}>{c.username || '—'}</span>
                  <span style={{ color: '#484f58' }}>@</span>
                  <span style={{ color: '#8b949e' }}>{c.service || c.targetIP || '—'}</span>
                  {c.type && <span className="text-[9px] px-1 py-0.5 rounded ml-auto" style={{ background: 'rgba(210,153,34,0.10)', color: '#d29922', border: '1px solid rgba(210,153,34,0.20)' }}>{c.type}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes editor */}
        <div className={`${panelCls} mb-4`}>
          <div className="flex items-center justify-between mb-3">
            <p className={labelCls} style={{ color: '#484f58', marginBottom: 0 }}>Notes</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setNotesMode(m => m === 'edit' ? 'preview' : 'edit')} className="text-[10px] text-[#484f58] hover:text-[#8b949e] transition-colors">{notesMode === 'edit' ? 'Preview' : 'Edit'}</button>
              <button onClick={() => updateTarget(targetId, { notes })} className="text-[10px] px-2 py-0.5 rounded transition-colors" style={{ background: 'rgba(210,153,34,0.10)', border: '1px solid rgba(210,153,34,0.20)', color: '#d29922' }}>Save</button>
            </div>
          </div>
          {notesMode === 'edit' ? (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Markdown notes for this target..." rows={10}
              className="w-full rounded px-3 py-2.5 text-xs placeholder-[#484f58] focus:outline-none focus:border-[#d29922] resize-none font-mono leading-relaxed bg-[#07080f] border border-[rgba(42,51,71,0.6)] text-[#e6edf3] transition-colors" />
          ) : (
            <div className="min-h-[120px] text-xs leading-relaxed whitespace-pre-wrap font-mono rounded px-3 py-2.5" style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.5)', color: '#e6edf3' }}>
              {notes || <span style={{ color: '#484f58' }}>No notes yet.</span>}
            </div>
          )}
        </div>

        {/* AI Next-Step Suggestions */}
        <div className={panelCls}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className={labelCls} style={{ color: '#484f58', marginBottom: 0 }}>AI Suggestions</p>
              {!settings.anthropicApiKey && (
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(72,79,88,0.10)', border: '1px solid rgba(72,79,88,0.25)', color: '#484f58' }}>API key required</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {aiSuggestions && (
                <button onClick={() => setAiExpanded(e => !e)} className="text-[10px] text-[#484f58] hover:text-[#8b949e] transition-colors">{aiExpanded ? 'Collapse' : 'Expand'}</button>
              )}
              <button onClick={fetchAiSuggestions} disabled={!settings.anthropicApiKey || aiLoading}
                className="text-[10px] px-2.5 py-1 rounded border border-[rgba(210,153,34,0.30)] bg-[rgba(210,153,34,0.10)] text-[#d29922] hover:bg-[rgba(210,153,34,0.18)] transition-colors disabled:opacity-40">
                {aiLoading ? 'Thinking...' : 'Suggest Next Steps'}
              </button>
            </div>
          </div>
          {aiExpanded && aiSuggestions && (
            <div className="flex flex-col gap-2 mt-2">
              {aiSuggestions.map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded group" style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.5)' }}>
                  <span className="text-[10px] font-mono flex-shrink-0 mt-0.5" style={{ color: 'rgba(210,153,34,0.60)' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-xs flex-1 leading-relaxed" style={{ color: '#e6edf3' }}>{step}</span>
                  <button onClick={() => emitEvent('playbookstudio:add-step', { step, targetName: target.name, targetIP: target.ip })}
                    className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded border bg-[rgba(210,153,34,0.10)] border-[rgba(210,153,34,0.25)] text-[#d29922] transition-all flex-shrink-0">+ Playbook</button>
                </div>
              ))}
            </div>
          )}
          {!aiSuggestions && !aiLoading && settings.anthropicApiKey && (
            <p className="text-[10px] text-[#484f58]">Click "Suggest Next Steps" to get AI-generated enumeration recommendations.</p>
          )}
        </div>
      </div>

      {/* Full-screen image viewer */}
      {fullImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={() => setFullImg(null)}>
          <img src={fullImg} alt="Screenshot" className="max-w-[90vw] max-h-[90vh] rounded" style={{ border: '1px solid rgba(42,51,71,0.6)' }} />
          <button className="absolute top-4 right-4 text-2xl" style={{ color: '#8b949e' }}>×</button>
        </div>
      )}
    </div>
  )
}
