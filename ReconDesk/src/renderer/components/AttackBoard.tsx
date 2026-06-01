import { useState, useRef, useEffect } from 'react'
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

// ─── Asset link dropdown ─────────────────────────────────────────────────────

function AssetLinkDropdown({ card, onClose }: { card: AttackCard; onClose: () => void }) {
  const target     = useStore(s => s.targets.find(t => t.id === card.targetId))
  const updateCard = useStore(s => s.updateCard)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const ports  = target?.ports ?? []
  const creds  = target?.credentials ?? []
  const linked = card.linkedAssets ?? []

  function toggle(assetId: string) {
    const next = linked.includes(assetId)
      ? linked.filter(id => id !== assetId)
      : [...linked, assetId]
    updateCard(card.id, { linkedAssets: next })
  }

  if (ports.length === 0 && creds.length === 0) {
    return (
      <div ref={ref} className="absolute right-0 top-6 z-30 bg-panel border border-border rounded shadow-lg w-48 p-2">
        <p className="text-[10px] text-muted text-center py-1">No assets yet</p>
      </div>
    )
  }

  return (
    <div ref={ref} className="absolute right-0 top-6 z-30 bg-panel border border-border rounded shadow-lg w-52 py-1 max-h-48 overflow-y-auto">
      {ports.length > 0 && (
        <>
          <p className="text-[9px] text-muted/60 uppercase tracking-widest px-2 py-0.5 mt-0.5">Ports</p>
          {ports.map(p => {
            const id = `port:${p.id}`
            const isLinked = linked.includes(id)
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-border/40 transition-colors ${isLinked ? 'text-accent' : 'text-text'}`}
              >
                <span className={`w-3 h-3 flex-shrink-0 rounded border ${isLinked ? 'bg-accent border-accent' : 'border-border'}`} />
                <span className="text-[11px] font-mono">{p.number}/{p.protocol}</span>
                {p.service && <span className="text-[10px] text-muted truncate">{p.service}</span>}
              </button>
            )
          })}
        </>
      )}
      {creds.length > 0 && (
        <>
          <p className="text-[9px] text-muted/60 uppercase tracking-widest px-2 py-0.5 mt-1">Credentials</p>
          {creds.map(c => {
            const id = `cred:${c.id}`
            const isLinked = linked.includes(id)
            const label = c.username ?? c.type
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-border/40 transition-colors ${isLinked ? 'text-accent' : 'text-text'}`}
              >
                <span className={`w-3 h-3 flex-shrink-0 rounded border ${isLinked ? 'bg-accent border-accent' : 'border-border'}`} />
                <span className="text-[11px] truncate">{label}</span>
                {c.service && <span className="text-[10px] text-muted truncate">{c.service}</span>}
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}

// ─── Linked asset tags ────────────────────────────────────────────────────────

function LinkedAssetTags({ card }: { card: AttackCard }) {
  const target = useStore(s => s.targets.find(t => t.id === card.targetId))
  const linked = card.linkedAssets ?? []
  if (linked.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1.5 pl-4">
      {linked.map(id => {
        const isPort = id.startsWith('port:')
        const rawId  = id.slice(id.indexOf(':') + 1)
        let label = id
        if (isPort) {
          const p = target?.ports.find(p => p.id === rawId)
          if (p) label = `${p.number}/${p.protocol}${p.service ? ` ${p.service}` : ''}`
        } else {
          const c = target?.credentials.find(c => c.id === rawId)
          if (c) label = c.username ?? c.type
        }
        return (
          <span
            key={id}
            className={`text-[9px] px-1.5 py-0.5 rounded border ${
              isPort
                ? 'border-accent/30 text-accent/70 bg-accent/5'
                : 'border-success/30 text-success/70 bg-success/5'
            }`}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CardItem({ card }: { card: AttackCard }) {
  const updateCard = useStore(s => s.updateCard)
  const removeCard = useStore(s => s.removeCard)
  const moveCard   = useStore(s => s.moveCard)
  const [expanded, setExpanded] = useState(false)
  const [linking, setLinking]   = useState(false)

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

        <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setLinking(v => !v)}
            title="Link assets"
            className={`opacity-0 group-hover:opacity-100 text-[10px] transition-all px-1 rounded ${
              (card.linkedAssets?.length ?? 0) > 0
                ? '!opacity-100 text-accent hover:text-accent/70'
                : 'text-muted hover:text-accent'
            }`}
          >
            ⛓
          </button>
          <AnimatePresence>
            {linking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute"
              >
                <AssetLinkDropdown card={card} onClose={() => setLinking(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={e => { e.stopPropagation(); removeCard(card.id) }}
          className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger text-[10px] transition-all flex-shrink-0"
        >✕</button>
      </div>

      <LinkedAssetTags card={card} />

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

// ─── Stage column ─────────────────────────────────────────────────────────────

function StageColumn({ stage, cards }: { stage: typeof STAGES[0]; cards: AttackCard[] }) {
  const addCard  = useStore(s => s.addCard)
  const activeId = useStore(s => s.activeTargetId)
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

      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {cards.map(card => <CardItem key={card.id} card={card} />)}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Board ────────────────────────────────────────────────────────────────────

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
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium text-text">{active?.name}</span>
        {active?.os && <span className="text-xs text-muted">{active.os}</span>}
        <span className="text-xs font-mono text-accent/70">{active?.ip}</span>
        <span className="text-xs text-muted/50 px-1.5 py-0.5 bg-border/30 rounded">{active?.platform}</span>
      </div>

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
