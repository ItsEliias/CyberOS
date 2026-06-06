// NetLab — SnippetsView.tsx

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNetLabStore } from '../store'
import type { CommandSnippet, SnippetCategory } from '@shared/types'

const CATEGORIES: SnippetCategory[] = [
  'Cisco Routing', 'Cisco Switching', 'ACL', 'NAT', 'Linux Networking', 'FortiGate', 'Verification',
]

function SnippetCard({ snippet, onDelete }: { snippet: CommandSnippet; onDelete?: () => void }) {
  const [copied, setCopied] = useState(false)
  // Only user-added snippets get the delete button — built-in snippets
  // ship from BUILTIN_SNIPPETS with their own ids and would otherwise
  // come right back on next mount.
  const isCustom = snippet.id.startsWith('custom-')

  async function copy() {
    await navigator.clipboard.writeText(snippet.command)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <motion.div
      className="rounded border border-border-subtle p-3"
      style={{ background: '#0f1117' }}
      whileHover={{ borderColor: '#2a3347' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-medium text-text-primary leading-tight">{snippet.title}</p>
        <div className="flex items-center gap-1 shrink-0">
          {isCustom && onDelete && (
            <button
              onClick={onDelete}
              title="Delete snippet"
              className="text-2xs px-1.5 py-0.5 rounded transition-colors"
              style={{ background: '#161b27', color: '#8b949e' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f85149' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8b949e' }}
            >
              ✕
            </button>
          )}
          <button
            onClick={copy}
            className="text-2xs px-2 py-0.5 rounded transition-colors"
            style={copied
              ? { background: 'rgba(63,185,80,0.2)', color: '#3fb950' }
              : { background: '#161b27', color: '#8b949e' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <pre
        className="text-xs font-mono-code rounded p-2 mb-2 overflow-x-auto"
        style={{ background: '#0a0a0f', color: '#5ec4ff' }}
      >
        {snippet.command}
      </pre>

      {snippet.description && (
        <p className="text-2xs text-text-muted">{snippet.description}</p>
      )}

      {snippet.variables && snippet.variables.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {snippet.variables.map(v => (
            <span key={v} className="text-2xs px-1.5 py-0.5 rounded font-mono-code"
              style={{ background: 'rgba(210,153,34,0.1)', color: '#d29922' }}>
              {v}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function AddSnippetForm({ onAdd, onCancel }: { onAdd: (s: CommandSnippet) => void; onCancel: () => void }) {
  const [title, setTitle]       = useState('')
  const [command, setCommand]   = useState('')
  const [category, setCategory] = useState<SnippetCategory>('Verification')
  const [desc, setDesc]         = useState('')

  function submit() {
    if (!title.trim() || !command.trim()) return
    onAdd({
      id: `custom-${Date.now()}`,
      title: title.trim(),
      command: command.trim(),
      category,
      description: desc.trim() || undefined,
    })
  }

  return (
    <div className="p-4 rounded border border-border-default" style={{ background: '#0f1117' }}>
      <p className="text-sm font-semibold text-text-primary mb-3">Add Custom Snippet</p>
      <div className="flex flex-col gap-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          className="px-3 py-2 rounded text-sm bg-bg-elevated border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-[#5ec4ff]"
        />
        <textarea
          value={command}
          onChange={e => setCommand(e.target.value)}
          placeholder="Command(s)"
          rows={3}
          className="px-3 py-2 rounded text-sm font-mono-code bg-bg-elevated border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-[#5ec4ff] resize-none"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value as SnippetCategory)}
          className="px-3 py-2 rounded text-sm bg-bg-elevated border border-border-default text-text-primary focus:outline-none focus:border-[#5ec4ff]"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Description (optional)"
          className="px-3 py-2 rounded text-sm bg-bg-elevated border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-[#5ec4ff]"
        />
        <div className="flex gap-2">
          <motion.button onClick={submit}
            className="flex-1 py-2 rounded text-sm font-semibold"
            style={{ background: '#5ec4ff', color: '#0a0a0f' }}
            whileHover={{ opacity: 0.85 }}>
            Add Snippet
          </motion.button>
          <button onClick={onCancel}
            className="px-4 py-2 rounded text-sm"
            style={{ background: '#161b27', color: '#8b949e' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SnippetsView() {
  const snippets      = useNetLabStore(s => s.snippets)
  const addSnippet    = useNetLabStore(s => s.addSnippet)
  const deleteSnippet = useNetLabStore(s => s.deleteSnippet)

  const [category, setCategory] = useState<SnippetCategory | 'All'>('All')
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)

  const filtered = snippets.filter(s => {
    const matchCat = category === 'All' || s.category === category
    const matchSrch = !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.command.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSrch
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border-subtle shrink-0">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search snippets..."
          className="w-64 px-3 py-1.5 rounded text-sm bg-bg-elevated border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-[#5ec4ff]"
        />
        <div className="flex-1 flex flex-wrap gap-1.5">
          {(['All', ...CATEGORIES] as const).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="text-2xs px-2 py-1 rounded transition-colors"
              style={category === c
                ? { background: 'rgba(94,196,255,0.15)', color: '#5ec4ff', border: '1px solid #5ec4ff' }
                : { background: '#161b27', color: '#8b949e', border: '1px solid #2a3347' }}
            >
              {c}
            </button>
          ))}
        </div>
        <motion.button
          onClick={() => setShowAdd(v => !v)}
          className="px-3 py-1.5 rounded text-sm font-medium shrink-0"
          style={{ background: showAdd ? 'rgba(94,196,255,0.1)' : '#161b27', color: '#5ec4ff', border: '1px solid #5ec4ff' }}
          whileHover={{ opacity: 0.85 }}
        >
          + Add Snippet
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {showAdd && (
          <div className="mb-6 max-w-xl">
            <AddSnippetForm
              onAdd={s => { addSnippet(s); setShowAdd(false) }}
              onCancel={() => setShowAdd(false)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(snippet => (
            <SnippetCard
              key={snippet.id}
              snippet={snippet}
              onDelete={() => deleteSnippet(snippet.id)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-text-muted col-span-full">No snippets match your filters.</p>
          )}
        </div>
      </div>
    </div>
  )
}
