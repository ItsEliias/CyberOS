import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecondeskStore, calcHealthScore } from '../../stores/useRecondeskStore'
import { calcCvssScore, cvssColor } from './CvssWidget'
import { CardDetailModal } from './AttackBoardCardModal'
import type { AttackCard, AttackStage, CardStatus, Target } from '../../types/recondesk'

const STAGES: { id: AttackStage; label: string; color: string; wip: number }[] = [
  { id: 'recon',   label: 'Recon',   color: '#4a9eff', wip: 5 },
  { id: 'enum',    label: 'Enum',    color: '#d29922', wip: 5 },
  { id: 'exploit', label: 'Exploit', color: '#f85149', wip: 4 },
  { id: 'post',    label: 'Post',    color: '#b44fff', wip: 4 },
  { id: 'privesc', label: 'PrivEsc', color: '#ff8c42', wip: 3 },
  { id: 'loot',    label: 'Loot',    color: '#3fb950', wip: 5 },
]

const STATUS_OPTIONS: { id: CardStatus; label: string; color: string }[] = [
  { id: 'todo',       label: 'Todo',        color: '#4a5568' },
  { id: 'inprogress', label: 'In Progress', color: '#d29922' },
  { id: 'done',       label: 'Done',        color: '#3fb950' },
  { id: 'blocked',    label: 'Blocked',     color: '#f85149' },
]

function statusColor(s: CardStatus): string {
  return STATUS_OPTIONS.find(o => o.id === s)?.color ?? '#4a5568'
}

// ─── Due-date badge helper ────────────────────────────────────────────────────

function DueDateBadge({ dueDate }: { dueDate: string }) {
  const due = new Date(dueDate)
  const now = new Date()
  // Compare date only (strip time)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffMs = dueDay.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / 86_400_000)

  let label: string
  let color: string
  let bg: string
  let border: string

  if (diffDays < 0) {
    label  = `${Math.abs(diffDays)}d overdue`
    color  = '#f85149'
    bg     = 'rgba(248,81,73,0.12)'
    border = 'rgba(248,81,73,0.30)'
  } else if (diffDays === 0) {
    label  = 'Due today'
    color  = '#f85149'
    bg     = 'rgba(248,81,73,0.12)'
    border = 'rgba(248,81,73,0.30)'
  } else if (diffDays <= 2) {
    label  = `Due ${diffDays}d`
    color  = '#d29922'
    bg     = 'rgba(210,153,34,0.12)'
    border = 'rgba(210,153,34,0.30)'
  } else {
    label  = `Due ${diffDays}d`
    color  = '#484f58'
    bg     = 'rgba(42,51,71,0.25)'
    border = 'rgba(42,51,71,0.45)'
  }

  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded font-mono tabular-nums flex-shrink-0"
      style={{ color, background: bg, border: `1px solid ${border}` }}
      title={`Due: ${due.toLocaleDateString()}`}
    >
      {label}
    </span>
  )
}

function healthColor(score: number): string {
  if (score >= 75) return '#3fb950'
  if (score >= 45) return '#d29922'
  return '#f85149'
}

// ─── Add Card Form ────────────────────────────────────────────────────────────

function AddCardForm({ targetId, stage, onClose }: { targetId: string; stage: AttackStage; onClose: () => void }) {
  const addAttackCard = useRecondeskStore(s => s.addAttackCard)
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    addAttackCard(targetId, { title: title.trim(), description: description.trim(), stage, status: 'todo', linkedPortIds: [], linkedCredentialIds: [], notes: '' })
    onClose()
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
      onSubmit={submit}
      className="bg-[#1a1b26] border border-[#d29922]/20 rounded-lg p-3 flex flex-col gap-2 mt-2"
      onClick={e => e.stopPropagation()}
    >
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Card title..." className="w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-2 py-1.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] transition-colors" />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." rows={2} className="w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-2 py-1.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] resize-none transition-colors" />
      <div className="flex gap-1.5">
        <button type="button" onClick={onClose} className="flex-1 text-[10px] py-1 rounded bg-[#2a3347]/40 text-[#4a5568] hover:text-[#8b949e] border border-[#2a3347] transition-colors">Cancel</button>
        <button type="submit" className="flex-1 text-[10px] py-1 rounded bg-[#d29922]/15 border border-[#d29922]/30 text-[#d29922] hover:bg-[#d29922]/25 transition-colors">Add</button>
      </div>
    </motion.form>
  )
}

// ─── Inline editable title ────────────────────────────────────────────────────

interface InlineTitleProps { value: string; done: boolean; onSave: (v: string) => void }

function InlineTitle({ value, done, onSave }: InlineTitleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)
  const inputRef              = useRef<HTMLInputElement>(null)

  function startEdit(e: React.MouseEvent) { e.stopPropagation(); setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0) }
  function commit() { setEditing(false); const v = draft.trim(); if (v && v !== value) onSave(v) }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commit() }
    if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
    e.stopPropagation()
  }

  if (editing) return (
    <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={onKey} onClick={e => e.stopPropagation()}
      className="w-full bg-[#0a0a0f] border border-[#d29922]/40 rounded px-1 py-0.5 text-xs text-[#e2e8f0] focus:outline-none" />
  )

  return (
    <span className={`text-xs font-medium leading-tight flex-1 cursor-text ${done ? 'text-[#8b949e] line-through' : 'text-[#e2e8f0]'}`} onDoubleClick={startEdit} title="Double-click to edit">
      {value}
    </span>
  )
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

interface KanbanCardProps { card: AttackCard; target: Target; delay: number; onOpen: () => void; onDragStart: (e: React.DragEvent) => void }

function KanbanCard({ card, target, delay, onOpen, onDragStart }: KanbanCardProps) {
  const updateAttackCard = useRecondeskStore(s => s.updateAttackCard)
  const linkedPorts = target.ports.filter(p => card.linkedPortIds.includes(p.id))
  const linkedCreds = target.credentials.filter(c => card.linkedCredentialIds.includes(c.id))
  const statusDotColor  = statusColor(card.status)
  const subtaskDone     = card.subtasks?.filter(s => s.done).length ?? 0
  const subtaskTotal    = card.subtasks?.length ?? 0
  const cardBg = card.status === 'done'
    ? { background: 'rgba(63,185,80,0.04)', borderColor: 'rgba(63,185,80,0.18)' }
    : card.status === 'blocked'
    ? { background: 'rgba(248,81,73,0.04)', borderColor: 'rgba(248,81,73,0.18)' }
    : { background: '#12131a', borderColor: 'rgba(42,51,71,0.7)' }

  // Derive left border color from CVSS severity
  const cvssLeftBorder = (() => {
    if (!card.cvss) return null
    const score = calcCvssScore(card.cvss)
    return cvssColor(score)
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }} transition={{ delay, duration: 0.18 }}
      draggable onDragStart={onDragStart} onClick={onOpen}
      className="kanban-card rounded-lg border p-3 cursor-pointer group"
      style={{
        ...cardBg,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
        borderLeft: cvssLeftBorder ? `3px solid ${cvssLeftBorder}70` : undefined,
      }}
    >
      <div className="flex items-start gap-1.5 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: statusDotColor }} />
        <InlineTitle value={card.title} done={card.status === 'done'} onSave={v => updateAttackCard(target.id, card.id, { title: v })} />
      </div>
      {card.description && <p className="text-[10px] text-[#4a5568] leading-relaxed mb-2 line-clamp-2 pl-3">{card.description}</p>}
      {(linkedPorts.length > 0 || linkedCreds.length > 0) && (
        <div className="flex flex-wrap gap-1 pl-3 mb-2">
          {linkedPorts.map(p => <span key={p.id} className="text-[9px] px-1 py-0.5 rounded bg-[#4a9eff]/10 text-[#4a9eff]/70 font-mono border border-[#4a9eff]/15">:{p.port}</span>)}
          {linkedCreds.map(c => <span key={c.id} className="text-[9px] px-1 py-0.5 rounded bg-[#f85149]/10 text-[#f85149]/70 font-mono border border-[#f85149]/15">{c.username || 'cred'}</span>)}
        </div>
      )}
      {card.dueDate && <div className="pl-3 mb-1"><DueDateBadge dueDate={card.dueDate} /></div>}
      <div className="flex items-center justify-between mt-1 pl-3 gap-1 flex-wrap">
        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium capitalize" style={{ color: statusDotColor, backgroundColor: `${statusDotColor}15`, border: `1px solid ${statusDotColor}25` }}>
          {card.status === 'inprogress' ? 'in progress' : card.status}
        </span>
        <div className="flex items-center gap-1">
          {card.cvss && (() => {
            const score = calcCvssScore(card.cvss)
            const col   = cvssColor(score)
            return <span className="text-[9px] px-1 py-0.5 rounded font-bold font-mono" style={{ color: col, background: `${col}15`, border: `1px solid ${col}25` }}>{score}</span>
          })()}
          {subtaskTotal > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(42,51,71,0.5)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((subtaskDone / subtaskTotal) * 100)}%`,
                    background: subtaskDone === subtaskTotal ? '#3fb950' : '#d29922',
                  }}
                />
              </div>
              <span className={`text-[9px] font-mono tabular-nums ${subtaskDone === subtaskTotal ? 'text-[#3fb950]' : 'text-[#8b949e]'}`}>
                {subtaskDone}/{subtaskTotal}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Attack Board Tab ─────────────────────────────────────────────────────────

export default function AttackBoardTab({ targetId }: { targetId: string }) {
  const targets        = useRecondeskStore(s => s.targets)
  const moveAttackCard = useRecondeskStore(s => s.moveAttackCard)
  const target         = targets.find(t => t.id === targetId)

  const [addingInStage, setAddingInStage] = useState<AttackStage | null>(null)
  const [openCardId,    setOpenCardId]    = useState<string | null>(null)
  const [dragCardId,    setDragCardId]    = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<AttackStage | null>(null)

  if (!target) return null

  const { ports, credentials: creds, attackCards: cards } = target
  const openCard = cards.find(c => c.id === openCardId) ?? null
  const health   = calcHealthScore(target)

  function handleDragStart(e: React.DragEvent, cardId: string) {
    setDragCardId(cardId); e.dataTransfer.effectAllowed = 'move'
  }
  function handleDragOver(e: React.DragEvent, stageId: AttackStage) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStage(stageId)
  }
  function handleDrop(e: React.DragEvent, stageId: AttackStage) {
    e.preventDefault()
    if (dragCardId) {
      const card = cards.find(c => c.id === dragCardId)
      if (card && card.stage !== stageId) moveAttackCard(targetId, dragCardId, stageId, card.status)
    }
    setDragCardId(null); setDragOverStage(null)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(42,51,71,0.5)', background: 'rgba(7,8,15,0.3)' }}>
        <div className="flex items-center gap-3">
          <span className="heading-sm" style={{ color: '#e6edf3' }}>Attack Board <span className="text-[10px] font-normal" style={{ color: '#484f58' }}>({cards.length} cards)</span></span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ color: healthColor(health), background: `${healthColor(health)}15`, border: `1px solid ${healthColor(health)}25` }}>
            Health {health}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#4a5568]">
          {STATUS_OPTIONS.map(s => {
            const count = cards.filter(c => c.status === s.id).length
            if (count === 0) return null
            return (
              <span key={s.id} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span style={{ color: s.color }}>{count}</span>
                <span>{s.label.toLowerCase()}</span>
              </span>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-0 min-w-max">
          {STAGES.map(stage => {
            const stageCards = cards.filter(c => c.stage === stage.id)
            const isAdding   = addingInStage === stage.id
            const isDragOver = dragOverStage === stage.id

            return (
              <div
                key={stage.id}
                className={`w-[200px] flex flex-col border-r flex-shrink-0 transition-colors ${isDragOver ? 'border-[#d29922]/40 bg-[#d29922]/4' : 'border-[#2a3347]/50'}`}
                onDragOver={e => handleDragOver(e, stage.id)}
                onDrop={e => handleDrop(e, stage.id)}
                onDragLeave={() => setDragOverStage(null)}
              >
                {/* Column header — colored left border accent */}
                {(() => {
                  const atWip = stageCards.length >= stage.wip
                  const wipColor = atWip ? '#d29922' : stage.color
                  return (
                    <div
                      className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a3347]/50 flex-shrink-0"
                      style={{ borderLeft: `3px solid ${atWip ? 'rgba(210,153,34,0.55)' : stage.color + '55'}` }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: wipColor }} />
                        <span
                          className="text-[10px] font-semibold uppercase tracking-widest"
                          style={{ color: wipColor }}
                        >
                          {stage.label}
                        </span>
                        {atWip && (
                          <span
                            className="text-[8px] px-1 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse"
                            style={{ color: '#d29922', background: 'rgba(210,153,34,0.12)', border: '1px solid rgba(210,153,34,0.25)' }}
                          >
                            WIP
                          </span>
                        )}
                      </div>
                      {/* X/Y WIP limit chip */}
                      <span
                        className="text-[9px] font-bold font-mono tabular-nums min-w-[32px] h-[18px] flex items-center justify-center rounded-full px-1.5"
                        style={{
                          color:      atWip ? '#d29922' : (stageCards.length > 0 ? stage.color : '#484f58'),
                          background: atWip ? 'rgba(210,153,34,0.15)' : (stageCards.length > 0 ? `${stage.color}18` : 'rgba(42,51,71,0.18)'),
                          border:     `1px solid ${atWip ? 'rgba(210,153,34,0.35)' : (stageCards.length > 0 ? stage.color + '30' : 'rgba(42,51,71,0.3)')}`,
                        }}
                        title={`${stageCards.length} of ${stage.wip} WIP limit`}
                      >
                        {stageCards.length}/{stage.wip}
                      </span>
                    </div>
                  )
                })()}

                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                  <AnimatePresence initial>
                    {stageCards.map((card, i) => (
                      <KanbanCard
                        key={card.id} card={card} target={target} delay={i * 0.07}
                        onOpen={() => setOpenCardId(card.id)}
                        onDragStart={e => handleDragStart(e, card.id)}
                      />
                    ))}
                  </AnimatePresence>
                  {stageCards.length === 0 && !isAdding && (
                    <div className="flex flex-col items-center justify-center flex-1 py-6 gap-1.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${stage.color}12`, border: `1px dashed ${stage.color}30` }}>
                        <span style={{ color: `${stage.color}60`, fontSize: 10 }}>0</span>
                      </div>
                      <span className="text-[10px]" style={{ color: '#484f58' }}>No cards</span>
                    </div>
                  )}
                  <AnimatePresence>
                    {isAdding && <AddCardForm key="add-form" targetId={targetId} stage={stage.id} onClose={() => setAddingInStage(null)} />}
                  </AnimatePresence>
                </div>

                {!isAdding && (
                  <div className="p-2 flex-shrink-0">
                    <button
                      onClick={() => setAddingInStage(stage.id)}
                      className="w-full text-[10px] py-1.5 rounded border border-dashed border-[#2a3347] text-[#4a5568] hover:text-[#d29922] hover:border-[#d29922]/30 transition-colors group/add flex items-center justify-center gap-1.5"
                      title="Add card (click)"
                    >
                      <span>+ Add</span>
                      <kbd className="hidden group-hover/add:inline-flex items-center px-1 py-0.5 rounded text-[8px] font-mono leading-none transition-all"
                        style={{ background: 'rgba(42,51,71,0.6)', color: '#4a5568', border: '1px solid rgba(42,51,71,0.8)' }}>
                        click
                      </kbd>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {openCard && (
          <CardDetailModal key={openCard.id} card={openCard} targetId={targetId} ports={ports} creds={creds} onClose={() => setOpenCardId(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
