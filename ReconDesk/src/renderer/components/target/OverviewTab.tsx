import { useState, useEffect, useRef } from 'react'
import { useRecondeskStore, calcHealthScore } from '../../stores/useRecondeskStore'
import type { TargetStatus, Platform, Difficulty, AttackStage } from '../../types/recondesk'

const PLATFORM_COLORS: Record<Platform, string> = {
  HTB:      'text-[#f85149] bg-[#f85149]/10 border-[#f85149]/20',
  THM:      'text-[#3fb950] bg-[#3fb950]/10 border-[#3fb950]/20',
  CTF:      'text-[#b44fff] bg-[#b44fff]/10 border-[#b44fff]/20',
  Client:   'text-[#4a9eff] bg-[#4a9eff]/10 border-[#4a9eff]/20',
  Internal: 'text-[#8b949e] bg-[#8b949e]/10 border-[#8b949e]/20',
}

const STATUS_COLORS: Record<TargetStatus, string> = {
  active:    '#3fb950',
  completed: '#4a9eff',
  abandoned: '#4a5568',
  paused:    '#d29922',
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy:   '#3fb950',
  Medium: '#d29922',
  Hard:   '#f85149',
  Insane: '#b44fff',
}

const STAGES: AttackStage[] = ['recon', 'enum', 'exploit', 'post', 'privesc', 'loot']

function healthColor(score: number): string {
  if (score >= 75) return '#3fb950'
  if (score >= 45) return '#d29922'
  return '#f85149'
}

export default function OverviewTab({ targetId }: { targetId: string }) {
  const targets         = useRecondeskStore(s => s.targets)
  const updateTarget    = useRecondeskStore(s => s.updateTarget)
  const addScreenshot   = useRecondeskStore(s => s.addScreenshot)
  const ecosystemCtx    = useRecondeskStore(s => s.ecosystemContext)
  const setActiveTab    = useRecondeskStore(s => s.setActiveTab)

  const target = targets.find(t => t.id === targetId)
  if (!target) return null

  const [editMode, setEditMode]           = useState(false)
  const [notesMode, setNotesMode]         = useState<'edit' | 'preview'>('edit')
  const [notes, setNotes]                 = useState(target.notes)
  const [credVaultItems, setCredVaultItems] = useState<any[]>([])
  const [screenshotBusy, setScreenshotBusy] = useState(false)
  const [fullImg, setFullImg]             = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null)
  const [aiLoading, setAiLoading]         = useState(false)
  const [aiExpanded, setAiExpanded]       = useState(false)
  const settings                          = useRecondeskStore(s => s.settings)
  const addTimelineEntry                  = useRecondeskStore(s => s.addTimelineEntry)
  const engagements                       = useRecondeskStore(s => s.engagements)
  const emitEvent                         = useRecondeskStore(s => s.emitEvent)

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

  // Fetch CredVault on mount
  useEffect(() => {
    ;(window.electronAPI as any).fetchCredVault?.(target.ip, target.name)
      .then((items: any[]) => setCredVaultItems(items ?? []))
      .catch(() => {})
  }, [target.ip, target.name])

  function saveEdit() {
    updateTarget(targetId, {
      name:          editForm.name.trim() || target.name,
      ip:            editForm.ip.trim() || target.ip,
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
      const ports    = target.ports.filter(p => p.state === 'open').map(p => `${p.port}/${p.protocol}${p.service ? ` (${p.service})` : ''}`)
      const cves     = target.attackCards.filter(c => c.notes?.toLowerCase().includes('cve')).map(c => c.title)
      const engName  = engagements.find(e => e.id === target.engagementId)?.name ?? ''
      const result   = await (window.electronAPI as any).aiSuggest?.({
        apiKey: settings.anthropicApiKey,
        ports, os: target.os, cves, engagement: engName,
      })
      if (result) {
        setAiSuggestions(result)
        setAiExpanded(true)
        addTimelineEntry(targetId, 'note_added', 'AI suggestions generated')
      }
    } finally {
      setAiLoading(false)
    }
  }

  const totalCards  = target.attackCards.length
  const doneCards   = target.attackCards.filter(c => c.status === 'done').length
  const progressPct = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0
  const health      = calcHealthScore(target)

  const targetEngagement = engagements.find(e => e.id === target.engagementId)
  const showScopeBanner  = (target.platform === 'Client' || target.platform === 'Internal') && !targetEngagement?.inScope

  const inputCls    = "bg-[#0a0a0f] border border-[#2a3347] rounded px-2 py-1 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#d29922] transition-colors"

  const enrichBadge = target.enrichment?.status === 'pending' ? (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#d29922]/10 border border-[#d29922]/25 text-[#d29922] animate-pulse">Enriching...</span>
  ) : target.enrichment?.status === 'done' ? (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#3fb950]/10 border border-[#3fb950]/25 text-[#3fb950]">Enriched</span>
  ) : target.enrichment?.status === 'error' ? (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#f85149]/10 border border-[#f85149]/25 text-[#f85149]">Enrich failed</span>
  ) : null

  const geoLabel = target.geo?.status === 'done' ? (
    <span className="text-xs text-[#8b949e]">
      {target.geo.flag} {target.geo.city}{target.geo.city && target.geo.country ? ', ' : ''}{target.geo.country}
    </span>
  ) : target.geo?.status === 'private' ? (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#4a5568]/20 border border-[#4a5568]/30 text-[#4a5568]">Private IP</span>
  ) : null

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-4xl">
        {/* Scope warning banner — Client/Internal targets with no RoE defined */}
        {showScopeBanner && (
          <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-[#d29922]/8 border border-[#d29922]/35">
            <span className="text-[#d29922] text-base flex-shrink-0 mt-0.5">⚠</span>
            <div>
              <p className="text-xs font-semibold text-[#d29922]">Scope not defined</p>
              <p className="text-[10px] text-[#d29922]/65">
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
                  <button onClick={saveEdit} className="px-3 py-1 text-xs bg-[#d29922]/15 hover:bg-[#d29922]/25 border border-[#d29922]/30 text-[#d29922] rounded transition-colors">Save</button>
                  <button onClick={() => setEditMode(false)} className="px-3 py-1 text-xs bg-[#2a3347]/40 text-[#8b949e] rounded transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[target.status] }} />
                  <h1 className="text-xl font-bold text-[#e2e8f0]">{target.name}</h1>
                  {enrichBadge}
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ color: healthColor(health), background: `${healthColor(health)}12`, border: `1px solid ${healthColor(health)}25` }}>
                    {health}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono text-sm text-[#d29922]/80 cursor-context-menu"
                    onContextMenu={e => { e.preventDefault(); openInNetworkMap() }}
                    title="Right-click: View in NetworkMap"
                  >
                    {target.ip}
                  </span>
                  {geoLabel}
                  <span className="text-[#4a5568]">·</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PLATFORM_COLORS[target.platform]}`}>{target.platform}</span>
                  {target.os && <span className="text-xs text-[#8b949e]">{target.os}</span>}
                  {target.difficulty && <span className="text-xs font-medium" style={{ color: DIFFICULTY_COLORS[target.difficulty] }}>{target.difficulty}</span>}
                  <span className="text-xs capitalize" style={{ color: STATUS_COLORS[target.status] }}>{target.status}</span>
                </div>
                {target.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {target.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a3347]/60 text-[#8b949e] border border-[#2a3347]">{tag}</span>
                    ))}
                  </div>
                )}
                {target.enrichment?.resolvedHostname && (
                  <p className="text-[10px] font-mono text-[#4a5568] mt-1">DNS: {target.enrichment.resolvedHostname}</p>
                )}
              </>
            )}
          </div>

          {!editMode && (
            <div className="flex items-center gap-2">
              <button onClick={openInNetworkMap} className="px-2.5 py-1.5 text-xs border border-[#2a3347] text-[#4a9eff] rounded hover:bg-[#4a9eff]/10 hover:border-[#4a9eff]/30 transition-colors" title="View in NetworkMap">Map</button>
              <button onClick={() => setEditMode(true)} className="px-3 py-1.5 text-xs border border-[#2a3347] text-[#8b949e] rounded hover:text-[#e2e8f0] hover:border-[#d29922]/40 transition-colors">Edit</button>
              <button onClick={() => setActiveTab('export')} className="px-3 py-1.5 text-xs bg-[#d29922]/10 border border-[#d29922]/25 text-[#d29922] rounded hover:bg-[#d29922]/20 transition-colors">Export</button>
            </div>
          )}
        </div>

        {/* Stats + Attack Progress + Context */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-[#12131a] border border-[#2a3347] rounded-lg p-3.5">
            <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-3">Quick Stats</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Ports',       value: target.ports.length,          color: '#4a9eff' },
                { label: 'Creds',       value: target.credentials.length,    color: '#f85149' },
                { label: 'Cards',       value: target.attackCards.length,    color: '#d29922' },
                { label: 'Screenshots', value: target.screenshots.length,    color: '#b44fff' },
              ].map(item => (
                <div key={item.label} className="flex flex-col">
                  <span className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>{item.value}</span>
                  <span className="text-[10px] text-[#4a5568]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#12131a] border border-[#2a3347] rounded-lg p-3.5">
            <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-3">Attack Progress</p>
            {totalCards === 0 ? (
              <p className="text-xs text-[#4a5568]">No attack cards yet</p>
            ) : (
              <>
                <div className="flex gap-0.5 mb-2.5 rounded overflow-hidden h-3">
                  {STAGES.map(stage => {
                    const sc = target.attackCards.filter(c => c.stage === stage)
                    if (sc.length === 0) return null
                    const done    = sc.filter(c => c.status === 'done').length
                    const inprog  = sc.filter(c => c.status === 'inprogress').length
                    const blocked = sc.filter(c => c.status === 'blocked').length
                    return (
                      <div key={stage} className="flex flex-1 gap-0.5" title={`${stage}: ${sc.length}`}>
                        {done    > 0 && <div className="flex-none bg-[#3fb950]" style={{ width: `${(done/sc.length)*100}%` }} />}
                        {inprog  > 0 && <div className="flex-none bg-[#d29922]" style={{ width: `${(inprog/sc.length)*100}%` }} />}
                        {blocked > 0 && <div className="flex-none bg-[#f85149]" style={{ width: `${(blocked/sc.length)*100}%` }} />}
                        <div className="flex-1 bg-[#2a3347]" />
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-[#8b949e]">
                  <span className="text-[#3fb950] font-medium">{doneCards}</span>
                  <span className="text-[#4a5568]"> of </span>
                  <span className="text-[#e2e8f0] font-medium">{totalCards}</span>
                  <span className="text-[#4a5568]"> cards · {progressPct}%</span>
                </p>
              </>
            )}
          </div>

          <div className="bg-[#12131a] border border-[#2a3347] rounded-lg p-3.5">
            <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-3">Linked Context</p>
            <div className="flex flex-col gap-1.5 text-xs">
              <div><span className="text-[#4a5568]">Lab: </span><span className="text-[#e2e8f0]">{target.name}</span></div>
              {ecosystemCtx.activePlaybook && <div><span className="text-[#4a5568]">Playbook: </span><span className="text-[#e2e8f0]">{ecosystemCtx.activePlaybook}</span></div>}
              <div><span className="text-[#4a5568]">Added: </span><span className="text-[#8b949e]">{new Date(target.createdAt).toLocaleDateString()}</span></div>
              {target.scheduledDate && <div><span className="text-[#4a5568]">Scheduled: </span><span className="text-[#d29922]">{target.scheduledDate}</span></div>}
              {target.completedAt && <div><span className="text-[#4a5568]">Done: </span><span className="text-[#3fb950]">{new Date(target.completedAt).toLocaleDateString()}</span></div>}
              {target.geo?.status === 'done' && <div><span className="text-[#4a5568]">Org: </span><span className="text-[#8b949e] truncate">{target.geo.org}</span></div>}
            </div>
          </div>
        </div>

        {/* Screenshots */}
        <div className="bg-[#12131a] border border-[#2a3347] rounded-lg p-3.5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#4a5568] uppercase tracking-widest">Screenshots</p>
            <button
              onClick={captureScreenshot}
              disabled={screenshotBusy}
              className="text-[10px] px-2.5 py-1 rounded border border-[#d29922]/25 bg-[#d29922]/8 text-[#d29922] hover:bg-[#d29922]/18 transition-colors disabled:opacity-40"
            >
              {screenshotBusy ? 'Capturing...' : '+ Screenshot'}
            </button>
          </div>
          {target.screenshots.length === 0 ? (
            <p className="text-xs text-[#4a5568]">No screenshots yet. Click to capture the current screen.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {target.screenshots.map(sc => (
                <button key={sc.id} onClick={() => setFullImg(sc.thumbnail ?? sc.path)} className="group relative rounded overflow-hidden border border-[#2a3347] hover:border-[#d29922]/30 transition-colors">
                  {sc.thumbnail
                    ? <img src={sc.thumbnail} alt={sc.label} className="w-24 h-16 object-cover" />
                    : <div className="w-24 h-16 bg-[#2a3347]/40 flex items-center justify-center text-[10px] text-[#4a5568]">Screenshot</div>
                  }
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[8px] text-[#8b949e] opacity-0 group-hover:opacity-100 transition-opacity truncate">{sc.label}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CredVault Linked Credentials */}
        {credVaultItems.length > 0 && (
          <div className="bg-[#12131a] border border-[#2a3347] rounded-lg p-3.5 mb-4">
            <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-3">Linked Credentials (CredVault)</p>
            <div className="flex flex-col gap-1.5">
              {credVaultItems.slice(0, 10).map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-xs px-2 py-1.5 rounded bg-[#0d0d14] border border-[#2a3347]">
                  <span className="font-mono text-[#f85149]/80">{c.username || '—'}</span>
                  <span className="text-[#4a5568]">@</span>
                  <span className="text-[#8b949e]">{c.service || c.targetIP || '—'}</span>
                  {c.type && <span className="text-[9px] px-1 py-0.5 rounded bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20 ml-auto">{c.type}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes editor */}
        <div className="bg-[#12131a] border border-[#2a3347] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#4a5568] uppercase tracking-widest">Notes</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setNotesMode(m => m === 'edit' ? 'preview' : 'edit')} className="text-[10px] text-[#4a5568] hover:text-[#8b949e] transition-colors">{notesMode === 'edit' ? 'Preview' : 'Edit'}</button>
              <button onClick={() => updateTarget(targetId, { notes })} className="text-[10px] px-2 py-0.5 rounded bg-[#d29922]/10 border border-[#d29922]/20 text-[#d29922] hover:bg-[#d29922]/20 transition-colors">Save</button>
            </div>
          </div>
          {notesMode === 'edit' ? (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Markdown notes for this target..." className="w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-3 py-2.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] resize-none transition-colors font-mono leading-relaxed" rows={10} />
          ) : (
            <div className="min-h-[120px] text-xs text-[#e2e8f0] leading-relaxed whitespace-pre-wrap font-mono bg-[#0a0a0f] rounded px-3 py-2.5 border border-[#2a3347]">
              {notes || <span className="text-[#4a5568]">No notes yet.</span>}
            </div>
          )}
        </div>

        {/* AI Next-Step Suggestions (Feature 18) */}
        <div className="bg-[#12131a] border border-[#2a3347] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-[#4a5568] uppercase tracking-widest">AI Suggestions</p>
              {!settings.anthropicApiKey && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#4a5568]/10 border border-[#4a5568]/25 text-[#4a5568]">API key required</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {aiSuggestions && (
                <button onClick={() => setAiExpanded(e => !e)} className="text-[10px] text-[#4a5568] hover:text-[#8b949e] transition-colors">
                  {aiExpanded ? 'Collapse' : 'Expand'}
                </button>
              )}
              <button
                onClick={fetchAiSuggestions}
                disabled={!settings.anthropicApiKey || aiLoading}
                className="text-[10px] px-2.5 py-1 rounded border border-[#d29922]/30 bg-[#d29922]/10 text-[#d29922] hover:bg-[#d29922]/20 disabled:opacity-40 transition-colors"
              >
                {aiLoading ? 'Thinking...' : 'Suggest Next Steps'}
              </button>
            </div>
          </div>
          {aiExpanded && aiSuggestions && (
            <div className="flex flex-col gap-2 mt-2">
              {aiSuggestions.map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 bg-[#0a0a0f] rounded border border-[#2a3347] group">
                  <span className="text-[10px] font-mono text-[#d29922]/60 flex-shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-xs text-[#e2e8f0] flex-1 leading-relaxed">{step}</span>
                  <button
                    onClick={() => emitEvent('playbookstudio:add-step', { step, targetName: target.name, targetIP: target.ip })}
                    className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded bg-[#d29922]/10 border border-[#d29922]/25 text-[#d29922] hover:bg-[#d29922]/20 transition-all flex-shrink-0"
                  >
                    + Playbook
                  </button>
                </div>
              ))}
            </div>
          )}
          {!aiSuggestions && !aiLoading && settings.anthropicApiKey && (
            <p className="text-[10px] text-[#4a5568]">Click "Suggest Next Steps" to get AI-generated enumeration recommendations based on this target's ports, OS, and CVEs.</p>
          )}
        </div>
      </div>

      {/* Full-screen image viewer */}
      {fullImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setFullImg(null)}>
          <img src={fullImg} alt="Screenshot" className="max-w-[90vw] max-h-[90vh] rounded border border-[#2a3347]" />
          <button className="absolute top-4 right-4 text-[#8b949e] hover:text-white text-2xl">×</button>
        </div>
      )}
    </div>
  )
}
