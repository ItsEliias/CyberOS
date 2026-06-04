import { useState } from 'react'
import type { PlaybookStep } from '@shared/types'

export default function ConditionEditor({
  condition, allSteps, onChange, onRemove,
}: {
  condition?: PlaybookStep['condition']
  allSteps: PlaybookStep[]
  onChange: (c: PlaybookStep['condition']) => void
  onRemove: () => void
}) {
  const [varKey, setVarKey]   = useState(condition?.variableKey ?? '')
  const [op, setOp]           = useState<'equals'|'not_equals'|'contains'>(condition?.operator ?? 'equals')
  const [val, setVal]         = useState(condition?.value ?? '')
  const [skipIds, setSkipIds] = useState<string[]>(condition?.skipStepIds ?? [])

  function handleSave() {
    if (!varKey.trim()) return
    onChange({ variableKey: varKey, operator: op, value: val, skipStepIds: skipIds })
  }

  return (
    <div className="mt-2 p-2 rounded flex flex-col gap-2" style={{ background: 'var(--panel)', border: '1px solid rgba(188,140,255,0.3)' }}>
      <div className="flex gap-2">
        <input className="flex-1 rounded px-2 py-1 text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          placeholder="variable key" value={varKey} onChange={e => setVarKey(e.target.value)} />
        <select className="rounded px-2 py-1 text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          value={op} onChange={e => setOp(e.target.value as typeof op)}>
          <option value="equals">equals</option>
          <option value="not_equals">not equals</option>
          <option value="contains">contains</option>
        </select>
        <input className="flex-1 rounded px-2 py-1 text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          placeholder="value" value={val} onChange={e => setVal(e.target.value)} />
      </div>
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Skip these steps if condition fails:</label>
        <div className="flex flex-wrap gap-1">
          {allSteps.map(s => {
            const checked = skipIds.includes(s.id)
            return (
              <button key={s.id} onClick={() => setSkipIds(ids => checked ? ids.filter(i => i !== s.id) : [...ids, s.id])}
                className="text-xs px-2 py-0.5 rounded" style={{
                  background: checked ? 'rgba(248,81,73,0.15)' : 'var(--border)',
                  color: checked ? 'var(--error)' : 'var(--text-muted)',
                }}>
                {s.order}. {s.title.slice(0, 16) || 'Untitled'}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="text-xs px-3 py-1 rounded font-medium" style={{ background: '#bc8cff', color: '#000' }}>Save</button>
        <button onClick={onRemove} className="text-xs px-3 py-1 rounded" style={{ background: 'var(--border)', color: 'var(--error)' }}>Remove</button>
      </div>
    </div>
  )
}
