// ReconDesk — AttackBoard Card Detail Modal (split for 500-line limit)

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRecondeskStore } from '../../stores/useRecondeskStore'
import CvssWidget from './CvssWidget'
import type { AttackCard, AttackStage, CardStatus, Port, Credential } from '../../types/recondesk'

const STAGES: { id: AttackStage; label: string }[] = [
  { id: 'recon',   label: 'Recon'   },
  { id: 'enum',    label: 'Enum'    },
  { id: 'exploit', label: 'Exploit' },
  { id: 'post',    label: 'Post'    },
  { id: 'privesc', label: 'PrivEsc' },
  { id: 'loot',    label: 'Loot'    },
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

export interface CardDetailProps {
  card: AttackCard
  targetId: string
  ports: Port[]
  creds: Credential[]
  onClose: () => void
}

export function CardDetailModal({ card, targetId, ports, creds, onClose }: CardDetailProps) {
  const updateAttackCard = useRecondeskStore(s => s.updateAttackCard)
  const deleteAttackCard = useRecondeskStore(s => s.deleteAttackCard)
  const moveAttackCard   = useRecondeskStore(s => s.moveAttackCard)
  const addSubtask       = useRecondeskStore(s => s.addSubtask)
  const toggleSubtask    = useRecondeskStore(s => s.toggleSubtask)
  const deleteSubtask    = useRecondeskStore(s => s.deleteSubtask)

  const [form, setForm] = useState({
    title: card.title, description: card.description, stage: card.stage,
    status: card.status, linkedPortIds: card.linkedPortIds,
    linkedCredentialIds: card.linkedCredentialIds, notes: card.notes, cvss: card.cvss,
  })
  const [newSubtask, setNewSubtask] = useState('')

  function save() {
    if (form.stage !== card.stage || form.status !== card.status)
      moveAttackCard(targetId, card.id, form.stage as AttackStage, form.status as CardStatus)
    updateAttackCard(targetId, card.id, {
      title: form.title, description: form.description, notes: form.notes,
      linkedPortIds: form.linkedPortIds, linkedCredentialIds: form.linkedCredentialIds, cvss: form.cvss,
    })
    onClose()
  }

  function addSubtaskItem() {
    const t = newSubtask.trim(); if (!t) return
    addSubtask(targetId, card.id, t); setNewSubtask('')
  }

  function togglePort(id: string) {
    setForm(f => ({ ...f, linkedPortIds: f.linkedPortIds.includes(id) ? f.linkedPortIds.filter(x => x !== id) : [...f.linkedPortIds, id] }))
  }
  function toggleCred(id: string) {
    setForm(f => ({ ...f, linkedCredentialIds: f.linkedCredentialIds.includes(id) ? f.linkedCredentialIds.filter(x => x !== id) : [...f.linkedCredentialIds, id] }))
  }

  const inputCls  = "w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-2.5 py-1.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] transition-colors"
  const selectCls = "bg-[#0a0a0f] border border-[#2a3347] rounded px-2.5 py-1.5 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#d29922] transition-colors"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}
        className="bg-[#12131a] border border-[#2a3347] rounded-lg w-[520px] max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3347] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(form.status as CardStatus) }} />
            <span className="text-sm font-semibold text-[#e2e8f0]">Attack Card</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { deleteAttackCard(targetId, card.id); onClose() }} className="text-[10px] px-2 py-1 rounded text-[#f85149] hover:bg-[#f85149]/10 border border-transparent hover:border-[#f85149]/20 transition-colors">Delete</button>
            <button onClick={onClose} className="text-[#4a5568] hover:text-[#e2e8f0] text-lg leading-none transition-colors">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
          <div>
            <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">Title</label>
            <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="What is this attack vector?" className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">Stage</label>
              <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as AttackStage }))} className={`${selectCls} w-full`}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as CardStatus }))} className={`${selectCls} w-full`}>
                {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          {ports.length > 0 && (
            <div>
              <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1.5">Linked Ports</label>
              <div className="flex flex-wrap gap-1.5">
                {ports.map(p => {
                  const linked = form.linkedPortIds.includes(p.id)
                  return (
                    <button key={p.id} onClick={() => togglePort(p.id)} className={`text-[10px] px-1.5 py-0.5 rounded border font-mono transition-colors ${linked ? 'bg-[#4a9eff]/15 border-[#4a9eff]/30 text-[#4a9eff]' : 'bg-[#2a3347]/30 border-[#2a3347] text-[#4a5568] hover:text-[#8b949e]'}`}>
                      {p.port}/{p.protocol}{p.service ? ` (${p.service})` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {creds.length > 0 && (
            <div>
              <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1.5">Linked Credentials</label>
              <div className="flex flex-wrap gap-1.5">
                {creds.map(c => {
                  const linked = form.linkedCredentialIds.includes(c.id)
                  return (
                    <button key={c.id} onClick={() => toggleCred(c.id)} className={`text-[10px] px-1.5 py-0.5 rounded border font-mono transition-colors ${linked ? 'bg-[#f85149]/15 border-[#f85149]/30 text-[#f85149]' : 'bg-[#2a3347]/30 border-[#2a3347] text-[#4a5568] hover:text-[#8b949e]'}`}>
                      {c.username || 'unknown'}{c.service ? `@${c.service}` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div>
            <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Additional notes, findings, references..." className={`${inputCls} resize-none`} />
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest mb-1.5">Subtasks</label>
            {(card.subtasks ?? []).map(st => (
              <div key={st.id} className="flex items-center gap-2 py-1">
                <input type="checkbox" checked={st.done} onChange={() => toggleSubtask(targetId, card.id, st.id)} className="accent-[#d29922] flex-shrink-0" />
                <span className={`text-xs flex-1 ${st.done ? 'line-through text-[#4a5568]' : 'text-[#e2e8f0]'}`}>{st.title}</span>
                <button type="button" onClick={() => deleteSubtask(targetId, card.id, st.id)} className="text-[#4a5568] hover:text-[#f85149] text-[10px] transition-colors">✕</button>
              </div>
            ))}
            <div className="flex gap-1.5 mt-1.5">
              <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtaskItem() } }}
                placeholder="New subtask..." className="flex-1 bg-[#0a0a0f] border border-[#2a3347] rounded px-2 py-1 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922]" />
              <button type="button" onClick={addSubtaskItem} className="px-2 py-1 text-[10px] rounded bg-[#d29922]/15 border border-[#d29922]/30 text-[#d29922] hover:bg-[#d29922]/25 transition-colors">Add</button>
            </div>
          </div>

          {/* CVSS Widget */}
          <CvssWidget value={form.cvss} onChange={cvss => setForm(f => ({ ...f, cvss }))} />

          <div className="flex gap-4 text-[10px] text-[#4a5568]">
            <span>Created: <span className="font-mono">{new Date(card.createdAt).toLocaleString()}</span></span>
            {card.completedAt && <span className="text-[#3fb950]">Done: <span className="font-mono">{new Date(card.completedAt).toLocaleString()}</span></span>}
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-[#2a3347] flex-shrink-0">
          <button onClick={onClose} className="flex-1 bg-[#2a3347]/40 hover:bg-[#2a3347]/70 text-[#8b949e] text-xs py-2 rounded border border-[#2a3347] transition-colors">Cancel</button>
          <button onClick={save} className="flex-1 bg-[#d29922]/15 hover:bg-[#d29922]/25 border border-[#d29922]/30 text-[#d29922] text-xs py-2 rounded transition-colors font-medium">Save Card</button>
        </div>
      </motion.div>
    </div>
  )
}
