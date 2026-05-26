import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import type { Platform, TargetStatus } from '../../shared/types'

const STATUS_COLOR: Record<TargetStatus, string> = {
  active:    'bg-success',
  completed: 'bg-accent',
  abandoned: 'bg-muted',
}

const PLATFORMS: Platform[] = ['HTB', 'THM', 'CTF', 'Custom']

export default function TargetPanel() {
  const targets      = useStore(s => s.targets)
  const activeId     = useStore(s => s.activeTargetId)
  const setActive    = useStore(s => s.setActiveTarget)
  const addTarget    = useStore(s => s.addTarget)
  const removeTarget = useStore(s => s.removeTarget)
  const cards        = useStore(s => s.cards)

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', ip: '', platform: 'HTB' as Platform, os: '' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.ip.trim()) return
    addTarget({ name: form.name, ip: form.ip, platform: form.platform, os: form.os, status: 'active', tags: [], notes: '' })
    setForm({ name: '', ip: '', platform: 'HTB', os: '' })
    setAdding(false)
  }

  return (
    <aside className="w-56 flex flex-col border-r border-border flex-shrink-0 bg-panel/50">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Targets</span>
        <button
          onClick={() => setAdding(v => !v)}
          className="w-5 h-5 flex items-center justify-center text-muted hover:text-text hover:bg-border rounded transition-colors text-sm no-drag"
        >
          {adding ? '✕' : '+'}
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onSubmit={submit}
            className="overflow-hidden border-b border-border"
          >
            <div className="p-3 flex flex-col gap-2">
              <input
                autoFocus
                placeholder="Name (e.g. Lame)"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />
              <input
                placeholder="IP address"
                value={form.ip}
                onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
                className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-text placeholder-muted focus:outline-none focus:border-accent transition-colors font-mono"
              />
              <div className="flex gap-1.5">
                <select
                  value={form.platform}
                  onChange={e => setForm(f => ({ ...f, platform: e.target.value as Platform }))}
                  className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-accent transition-colors"
                >
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
                <input
                  placeholder="OS"
                  value={form.os}
                  onChange={e => setForm(f => ({ ...f, os: e.target.value }))}
                  className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs py-1 rounded transition-colors"
              >
                Add Target
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Target list */}
      <div className="flex-1 overflow-y-auto py-1">
        {targets.length === 0 && (
          <p className="text-[11px] text-muted text-center mt-8 px-3 leading-relaxed">
            No targets yet.<br />Hit + to add one.
          </p>
        )}
        {targets.map(target => {
          const cardCount = cards.filter(c => c.targetId === target.id).length
          const isActive  = target.id === activeId
          return (
            <motion.div
              key={target.id}
              layout
              onClick={() => setActive(isActive ? null : target.id)}
              className={`group mx-1.5 my-0.5 px-2.5 py-2 rounded cursor-pointer transition-colors ${
                isActive
                  ? 'bg-accent/10 border border-accent/20'
                  : 'hover:bg-border/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLOR[target.status]}`} />
                <span className="text-xs font-medium text-text truncate flex-1">{target.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); removeTarget(target.id) }}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger text-[10px] transition-all"
                >✕</button>
              </div>
              <div className="flex items-center gap-2 mt-0.5 pl-3.5">
                <span className="text-[10px] font-mono text-muted">{target.ip}</span>
                <span className="text-[10px] text-muted/60">·</span>
                <span className="text-[10px] text-muted">{target.platform}</span>
                {cardCount > 0 && (
                  <>
                    <span className="text-[10px] text-muted/60">·</span>
                    <span className="text-[10px] text-muted">{cardCount}c</span>
                  </>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </aside>
  )
}
