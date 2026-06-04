// CustomKeywords — manage custom relevance keywords
import { useState } from 'react'
import { useStore } from '../../store'

export default function CustomKeywords() {
  const context   = useStore(s => s.context)
  const setContext = useStore(s => s.setContext)
  const [input, setInput] = useState('')

  const keywords: string[] = context.customKeywords ?? []

  async function addKeyword() {
    const kw = input.trim().toLowerCase()
    if (!kw || keywords.includes(kw)) return
    const next = [...keywords, kw]
    setContext({ ...context, customKeywords: next })
    setInput('')
    await window.electronAPI.writeKeywords(next)
    await window.electronAPI.rescore()
  }

  async function removeKeyword(kw: string) {
    const next = keywords.filter(k => k !== kw)
    setContext({ ...context, customKeywords: next })
    await window.electronAPI.writeKeywords(next)
    await window.electronAPI.rescore()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') addKeyword()
  }

  return (
    <div className="px-3 py-3">
      <span className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest block mb-2">Custom Keywords</span>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {keywords.map(kw => (
          <button
            key={kw}
            onClick={() => removeKeyword(kw)}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 border border-accent/20 text-accent/80 rounded text-[10px] hover:bg-danger/20 hover:border-danger/30 hover:text-danger transition-colors"
            title="Click to remove"
          >
            {kw}
            <span className="opacity-60">×</span>
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="+ add keyword"
          className="flex-1 bg-bg border border-border/50 rounded px-2 py-1 text-[10px] text-text placeholder-muted/40 focus:outline-none focus:border-accent transition-colors no-drag"
        />
        <button
          onClick={addKeyword}
          className="px-2 py-1 bg-accent/15 border border-accent/30 text-accent rounded text-[10px] hover:bg-accent/25 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}
