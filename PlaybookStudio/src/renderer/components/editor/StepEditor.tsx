import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PlaybookStep, StepCategory, StepType } from '@shared/types'

const STEP_CATS: StepCategory[] = ['recon', 'enum', 'exploit', 'post', 'privesc', 'loot', 'report']
const STEP_TYPES: StepType[] = ['action', 'verification', 'documentation', 'command', 'decision']

const STEP_TYPE_COLORS: Record<StepType, string> = {
  action:        '#4a9eff',
  verification:  '#3fb950',
  documentation: '#8b949e',
  command:       '#d29922',
  decision:      '#bc8cff',
}

// Step type icons (SVG paths, 12×12 viewBox)
function StepTypeIcon({ type, color }: { type: StepType; color: string }) {
  if (type === 'command') {
    // Wrench
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 1.5a2.5 2.5 0 0 1 0 4L3 11 1 9l5.5-5.5a2.5 2.5 0 0 1 2-2z" />
      </svg>
    )
  }
  if (type === 'action') {
    // Person
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="3" r="2" />
        <path d="M2 11c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      </svg>
    )
  }
  if (type === 'verification') {
    // Checkmark
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6l3 3 5-5" />
      </svg>
    )
  }
  if (type === 'documentation') {
    // Pencil
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2l2 2-6 6H2v-2z" />
        <path d="M7 3l2 2" />
      </svg>
    )
  }
  if (type === 'decision') {
    // Diamond
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 1l5 5-5 5-5-5z" />
      </svg>
    )
  }
  return null
}

// Segmented pill for step type selection
const STEP_TYPE_LABELS: { type: StepType; label: string }[] = [
  { type: 'command',       label: 'Tool' },
  { type: 'action',        label: 'Manual' },
  { type: 'verification',  label: 'Check' },
  { type: 'documentation', label: 'Note' },
  { type: 'decision',      label: 'Decision' },
]

// Commands editor with line numbers
function CommandsEditor({ value, disabled, onChange }: {
  value: string; disabled: boolean; onChange: (v: string) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const numbersRef  = useRef<HTMLDivElement>(null)
  const lines = value.split('\n')

  // Sync scroll between textarea and line numbers
  function handleScroll() {
    if (numbersRef.current && textareaRef.current) {
      numbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  return (
    <div
      className="flex rounded overflow-hidden"
      style={{ background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}
    >
      {/* Line numbers */}
      <div
        ref={numbersRef}
        className="flex-shrink-0 overflow-hidden select-none"
        style={{
          width: 28,
          background: 'rgba(42,51,71,0.2)',
          borderRight: '1px solid rgba(42,51,71,0.5)',
          padding: '6px 0',
          fontSize: 11,
          lineHeight: '18px',
          textAlign: 'right',
          color: '#484f58',
          overflowY: 'hidden',
          userSelect: 'none',
        }}
      >
        {lines.map((_, i) => (
          <div key={i} style={{ paddingRight: 5 }}>{i + 1}</div>
        ))}
      </div>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={Math.max(3, lines.length)}
        className="flex-1 px-2 py-1.5 text-xs font-mono resize-none"
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text)',
          lineHeight: '18px',
          fontSize: 11,
        }}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
      />
    </div>
  )
}

function VariableToken({ text }: { text: string }) {
  const parts = text.split(/({{[^}]+}})/)
  return (
    <>
      {parts.map((p, i) =>
        /^{{.+}}$/.test(p)
          ? <span key={i} style={{ color: '#2dd4bf', background: 'rgba(45,212,191,0.12)', borderRadius: 3, padding: '0 2px' }}>{p}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

interface Props {
  step: PlaybookStep
  index: number
  total: number
  allSteps: PlaybookStep[]
  disabled: boolean
  onChange: (s: PlaybookStep) => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export default function StepEditor({
  step, index, total, allSteps, disabled,
  onChange, onDelete, onDuplicate, onMoveUp, onMoveDown,
}: Props) {
  const [open, setOpen] = useState(false)
  const [showCondition, setShowCondition] = useState(false)

  const typeColor = STEP_TYPE_COLORS[step.stepType ?? 'action']

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid var(--border)`, borderLeft: `3px solid ${typeColor}` }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none" style={{ background: 'var(--bg)' }} onClick={() => setOpen(o => !o)}>
        <span className="text-xs w-5 h-5 rounded flex items-center justify-center font-mono flex-shrink-0" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>
          {index + 1}
        </span>
        <span
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center"
          style={{ background: `${typeColor}18` }}
          title={step.stepType ?? 'action'}
        >
          <StepTypeIcon type={step.stepType ?? 'action'} color={typeColor} />
        </span>
        <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          {step.title || <span style={{ color: 'var(--text-muted)' }}>Untitled step</span>}
        </span>
        {step.mitreTechniqueId && (
          <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 font-mono" style={{ background: 'rgba(188,140,255,0.12)', color: '#bc8cff' }}>
            {step.mitreTechniqueId}
          </span>
        )}
        <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: `${typeColor}1a`, color: typeColor }}>
          {step.stepType ?? 'action'}
        </span>
        {step.required && <span className="text-xs flex-shrink-0" style={{ color: 'var(--warning)' }}>req</span>}
        {step.condition && <span className="text-xs flex-shrink-0" style={{ color: '#bc8cff' }}>if</span>}
        <motion.svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <path d="M2 4l4 4 4-4" />
        </motion.svg>
      </div>

      <AnimatePresence initial={false}>
        {open && (
        <motion.div
          key="step-body"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ overflow: 'hidden' }}
        >
        <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          {/* Row 1: title + category */}
          <div className="flex gap-2 mt-2">
            <div className="flex-1">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Title</label>
              <input className="w-full rounded px-2 py-1 text-sm" style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={step.title} disabled={disabled} onChange={e => onChange({ ...step, title: e.target.value })} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Category</label>
              <select className="rounded px-2 py-1 text-sm" style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={step.category} disabled={disabled} onChange={e => onChange({ ...step, category: e.target.value as StepCategory })}>
                {STEP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Step type segmented pill selector */}
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Step Type</label>
            <div
              className="flex items-center gap-1 p-0.5 rounded-full"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: 'fit-content' }}
            >
              {STEP_TYPE_LABELS.map(({ type, label }) => {
                const active = (step.stepType ?? 'action') === type
                const tColor = STEP_TYPE_COLORS[type]
                return (
                  <button
                    key={type}
                    onClick={() => !disabled && onChange({ ...step, stepType: type })}
                    disabled={disabled}
                    className="text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all"
                    style={{
                      background: active ? `${tColor}22` : 'transparent',
                      color: active ? tColor : 'var(--text-muted)',
                      border: `1px solid ${active ? `${tColor}44` : 'transparent'}`,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <StepTypeIcon type={type} color={active ? tColor : 'var(--text-muted)'} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Description</label>
            <div className="text-xs px-2 py-1 rounded min-h-[2rem]" style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-dim)', lineHeight: 1.6 }}>
              <VariableToken text={step.description} />
            </div>
            <textarea rows={2} className="w-full rounded px-2 py-1 text-sm mt-1" style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={step.description} disabled={disabled} onChange={e => onChange({ ...step, description: e.target.value })} />
          </div>

          {/* Commands */}
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Commands (one per line)</label>
            <CommandsEditor
              value={step.commands.join('\n')}
              disabled={disabled}
              onChange={v => onChange({ ...step, commands: v.split('\n') })}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Guidance notes</label>
            <textarea rows={2} className="w-full rounded px-2 py-1 text-sm" style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={step.notes} disabled={disabled} onChange={e => onChange({ ...step, notes: e.target.value })} />
          </div>

          {/* MITRE + Dependencies row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>MITRE ID (e.g. T1059.001)</label>
              <input className="w-full rounded px-2 py-1 text-xs font-mono" style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: '#bc8cff' }}
                value={step.mitreTechniqueId ?? ''} disabled={disabled} placeholder="T1234.001"
                onChange={e => onChange({ ...step, mitreTechniqueId: e.target.value || undefined })} />
            </div>
            <div className="flex-1">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>MITRE Technique Name</label>
              <input className="w-full rounded px-2 py-1 text-xs" style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
                value={step.mitreTechniqueName ?? ''} disabled={disabled} placeholder="Command and Scripting Interpreter"
                onChange={e => onChange({ ...step, mitreTechniqueName: e.target.value || undefined })} />
            </div>
          </div>

          {/* Depends on */}
          {!disabled && allSteps.length > 1 && (
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Depends on steps</label>
              <div className="flex flex-wrap gap-1">
                {allSteps.filter(s => s.id !== step.id).map(s => {
                  const checked = (step.dependsOn ?? []).includes(s.id)
                  return (
                    <button key={s.id} onClick={() => {
                      const deps = step.dependsOn ?? []
                      onChange({ ...step, dependsOn: checked ? deps.filter(d => d !== s.id) : [...deps, s.id] })
                    }} className="text-xs px-2 py-0.5 rounded transition-colors" style={{
                      background: checked ? 'rgba(74,158,255,0.2)' : 'var(--border)',
                      color: checked ? '#4a9eff' : 'var(--text-muted)',
                      border: `1px solid ${checked ? 'rgba(74,158,255,0.4)' : 'transparent'}`,
                    }}>
                      {s.order}. {s.title.slice(0, 20) || 'Untitled'}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Condition */}
          {!disabled && (
            <div>
              <button onClick={() => setShowCondition(v => !v)} className="text-xs px-2 py-1 rounded transition-colors" style={{
                background: step.condition ? 'rgba(188,140,255,0.15)' : 'var(--border)',
                color: step.condition ? '#bc8cff' : 'var(--text-muted)',
              }}>
                {step.condition ? 'Edit Condition' : '+ Add Condition'}
              </button>
              {step.condition && !showCondition && (
                <span className="ml-2 text-xs" style={{ color: '#bc8cff' }}>
                  if {step.condition.variableKey} {step.condition.operator} "{step.condition.value}"
                </span>
              )}
              {showCondition && (
                <ConditionEditor
                  condition={step.condition}
                  allSteps={allSteps.filter(s => s.id !== step.id)}
                  onChange={c => { onChange({ ...step, condition: c }); setShowCondition(false) }}
                  onRemove={() => { onChange({ ...step, condition: undefined }); setShowCondition(false) }}
                />
              )}
            </div>
          )}

          {/* Footer controls */}
          <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-dim)' }}>
              <input type="checkbox" checked={step.required} disabled={disabled} onChange={e => onChange({ ...step, required: e.target.checked })} />
              Required
            </label>
            <div className="flex items-center gap-1">
              <button onClick={onMoveUp} disabled={index === 0 || disabled} className="text-xs px-1.5 py-1 rounded" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>↑</button>
              <button onClick={onMoveDown} disabled={index === total - 1 || disabled} className="text-xs px-1.5 py-1 rounded" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>↓</button>
              <button onClick={onDuplicate} disabled={disabled} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>Dup</button>
              <button onClick={onDelete} disabled={disabled} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(248,81,73,0.15)', color: 'var(--error)' }}>Del</button>
            </div>
          </div>
        </div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ConditionEditor({
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
