import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'

export function FlagsSection({ targetId }: { targetId: string }) {
  const target     = useStore(s => s.targets.find(t => t.id === targetId))
  const addFlag    = useStore(s => s.addFlag)
  const removeFlag = useStore(s => s.removeFlag)
  const [adding, setAdding]   = useState(false)
  const [input, setInput]     = useState('')

  const flags = target?.flags ?? []

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const trimmed = input.trim()
      if (!trimmed) return
      addFlag(targetId, trimmed)
      setInput('')
      setAdding(false)
    }
    if (e.key === 'Escape') {
      setInput('')
      setAdding(false)
    }
  }

  const [copied, setCopied] = useState(false)

  async function copyAll() {
    await navigator.clipboard.writeText(flags.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Flags</span>
        <div className="flex items-center gap-1">
          {flags.length >= 2 && (
            <button
              onClick={copyAll}
              className="h-5 px-1.5 flex items-center text-[9px] font-medium rounded transition-colors"
              style={{ color: copied ? 'var(--success)' : 'var(--text-muted)', background: copied ? 'rgba(63,185,80,0.1)' : 'transparent' }}
              title="Copy all flags"
            >
              {copied ? 'copied!' : 'copy all'}
            </button>
          )}
          <button
            onClick={() => setAdding(v => !v)}
            className="w-5 h-5 flex items-center justify-center text-muted hover:text-text hover:bg-border rounded transition-colors text-sm"
          >
            {adding ? '✕' : '+'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mb-3"
          >
            <input
              autoFocus
              type="text"
              placeholder="flag{...}"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-bg border border-border rounded px-3 py-1.5 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {flags.length === 0 ? (
        <p className="text-[11px] text-muted/60 py-2">No flags captured.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {flags.map((flag, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="group flex items-center gap-2 py-1.5 px-2 rounded hover:bg-border/30 transition-colors"
            >
              <span className="flex-1 text-xs font-mono text-success/80 truncate">{flag}</span>
              <button
                onClick={() => removeFlag(targetId, flag)}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-error text-[10px] transition-all flex-shrink-0"
              >✕</button>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}
