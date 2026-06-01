import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import type { AttackStage, CardStatus, AttackCard } from '../../shared/types'

const STAGES: { id: AttackStage; label: string }[] = [
  { id: 'recon',   label: 'Recon'   },
  { id: 'enum',    label: 'Enum'    },
  { id: 'exploit', label: 'Exploit' },
  { id: 'post',    label: 'Post'    },
  { id: 'privesc', label: 'PrivEsc' },
  { id: 'loot',    label: 'Loot'    },
]

const STATUS_STYLES: Record<CardStatus, string> = {
  todo:       'border-border',
  inprogress: 'border-accent/40',
  done:       'border-success/40 opacity-60',
  blocked:    'border-danger/40',
}

const STATUS_DOT: Record<CardStatus, string> = {
  todo:       'bg-muted',
  inprogress: 'bg-accent',
  done:       'bg-success',
  blocked:    'bg-danger',
}

function CardItem({ card }: { card: AttackCard }) {
  const updateCard = useStore(s => s.updateCard)
  const removeCard = useStore(s => s.removeCard)
  const moveCard   = useStore(s => s.moveCard)
  const [expanded, setExpanded] = useState(false)

  const nextStatus = (): CardStatus => {
    const cycle: CardStatus[] = ['todo', 'inprogress', 'done', 'blocked']
    return cycle[(cycle.indexOf(card.status) + 1) % cycle.length]
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={`group bg-panel border rounded p-2.5 cursor-pointer transition-colors hover:border-accent/30 ${STATUS_STYLES[card.status]}`}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={e => { e.stopPropagation(); moveCard(card.id, card.stage, nextStatus()) }}
          className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${STATUS_DOT[card.status]} hover:ring-2 ring-offset-1 ring-offset-panel ring-accent/40 transition-all`}
        />
        <span className="text-xs text-text flex-1 leading-relaxed">{card.title}</span>
        <button
          onClick={e => { e.stopPropagation(); removeCard(card.id) }}
          className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger text-[10px] transition-all flex-shrink-0"
        >✕</button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mt-2 pl-4"
            onClick={e => e.stopPropagation()}
          >
            {card.command && (
              <code className="block text-[10px] font-mono text-accent/80 bg-bg rounded px-2 py-1 mb-2 break-all">
                {card.command}
              </code>
            )}
            <textarea
              value={card.notes || ''}
              onChange={e => updateCard(card.id, { notes: e.target.value })}
              placeholder="Notes..."
              rows={2}
              className="w-full bg-bg border border-border rounded px-2 py-1 text-[11px] text-text placeholder-muted focus:outline-none focus:border-accent resize-none transition-colors"
            />
            <select
              value={card.stage}
              onChange={e => moveCard(card.id, e.target.value as AttackStage, card.status)}
              className="mt-1.5 bg-bg border border-border rounded px-1.5 py-0.5 text-[10px] text-muted focus:outline-none focus:border-accent transition-colors"
            >
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function StageColumn({ stage, cards }: { stage: typeof STAGES[0]; cards: AttackCard[] }) {
  const addCard    = useStore(s => s.addCard)
  const activeId   = useStore(s => s.activeTargetId)
  const [adding, setAdding] = useState(false)
  const [title, setTitle]   = useState('')
  const [cmd, setCmd]       = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !activeId) return
    addCard({ targetId: activeId, title, command: cmd || undefined, stage: stage.id, status: 'todo', notes: '' })
    setTitle('')
    setCmd('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col min-w-[180px] flex-1">
      {/* Column header */}
      <div className="flex items-center justify-between px-2 py-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">{stage.label}</span>
          {cards.length > 0 && (
            <span className="text-[10px] text-muted/60">{cards.length}</span>
          )}
        </div>
        {activeId && (
          <button
            onClick={() => setAdding(v => !v)}
            className="w-4 h-4 flex items-center justify-center text-muted hover:text-text text-xs rounded hover:bg-border transition-colors"
          >
            {adding ? '✕' : '+'}
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={submit}
            className="overflow-hidden mb-2"
          >
            <div className="bg-panel border border-accent/20 rounded p-2 flex flex-col gap-1.5">
              <input
                autoFocus
                placeholder="Card title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />
              <input
                placeholder="Command (optional)"
                value={cmd}
                onChange={e => setCmd(e.target.value)}
                className="w-full bg-bg border border-border rounded px-2 py-1 text-[11px] font-mono text-accent/80 placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="submit"
                className="w-full bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-[11px] py-0.5 rounded transition-colors"
              >
                Add
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Cards */}
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {cards.map(card => <CardItem key={card.id} card={card} />)}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function AttackBoard() {
  const activeId = useStore(s => s.activeTargetId)
  const targets  = useStore(s => s.targets)
  const cards    = useStore(s => s.cards)

  const active   = targets.find(t => t.id === activeId)
  const filtered = activeId ? cards.filter(c => c.targetId === activeId) : []

  if (!activeId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted">Select a target to view its attack board</p>
          <p className="text-xs text-muted/60 mt-1">or add a new target with +</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Target context bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium text-text">{active?.name}</span>
        {active?.os && <span className="text-xs text-muted">{active.os}</span>}
        <span className="text-xs font-mono text-accent/70">{active?.ip}</span>
        <span className="text-xs text-muted/50 px-1.5 py-0.5 bg-border/30 rounded">{active?.platform}</span>
      </div>

      {/* Board columns */}
      <div className="flex-1 flex gap-3 overflow-x-auto p-4">
        {STAGES.map(stage => (
          <StageColumn
            key={stage.id}
            stage={stage}
            cards={filtered.filter(c => c.stage === stage.id)}
          />
        ))}
      </div>
    </div>
  )
}
