import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PlaybookStep, StepCategory, StepType } from '@shared/types'
import ConditionEditor from './ConditionEditor'

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

// Variable autocomplete dropdown
function VarAutocomplete({ vars, onSelect }: { vars: string[]; onSelect: (v: string) => void }) {
  if (vars.length === 0) return null
  return (
    <div
      className="absolute left-8 z-30 rounded overflow-hidden"
      style={{
        top: '100%',
        minWidth: 160,
        background: '#0d0e18',
        border: '1px solid rgba(45,212,191,0.35)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
        marginTop: 2,
      }}
    >
      <div className="px-2 py-1" style={{ fontSize: 9, color: '#484f58', borderBottom: '1px solid rgba(42,51,71,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Variables
      </div>
      {vars.map(v => (
        <button
          key={v}
          onMouseDown={e => { e.preventDefault(); onSelect(v) }}
          className="w-full text-left px-2 py-1 text-xs font-mono flex items-center gap-1.5 transition-colors"
          style={{ color: '#2dd4bf', background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(45,212,191,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ color: '#484f58' }}>{'{{'}</span>{v}<span style={{ color: '#484f58' }}>{'}} '}</span>
        </button>
      ))}
    </div>
  )
}

// Commands editor with line numbers
function CommandsEditor({ value, disabled, onChange, knownVars = [] }: {
  value: string; disabled: boolean; onChange: (v: string) => void; knownVars?: string[]
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const numbersRef  = useRef<HTMLDivElement>(null)
  const [showVarHint, setShowVarHint] = useState(false)
  const lines = value.split('\n')

  // Sync scroll between textarea and line numbers
  function handleScroll() {
    if (numbersRef.current && textareaRef.current) {
      numbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value
    onChange(v)
    const pos = e.target.selectionStart ?? 0
    const before = v.slice(0, pos)
    setShowVarHint(before.endsWith('{{') && knownVars.length > 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') setShowVarHint(false)
  }

  function insertVar(varName: string) {
    const ta = textareaRef.current
    if (!ta) return
    const pos = ta.selectionStart ?? 0
    const before = value.slice(0, pos)
    // Remove trailing {{ since we insert the full token
    const trimBefore = before.endsWith('{{') ? before.slice(0, -2) : before
    const after = value.slice(pos)
    const newVal = `${trimBefore}{{${varName}}}${after}`
    onChange(newVal)
    setShowVarHint(false)
    // Restore focus with cursor after inserted token
    setTimeout(() => {
      ta.focus()
      const newPos = trimBefore.length + varName.length + 4
      ta.setSelectionRange(newPos, newPos)
    }, 0)
  }

  return (
    <div className="relative">
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
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowVarHint(false), 150)}
          onScroll={handleScroll}
          spellCheck={false}
        />
      </div>
      {showVarHint && (
        <VarAutocomplete vars={knownVars} onSelect={insertVar} />
      )}
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
  knownVars?: string[]
  onChange: (s: PlaybookStep) => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export default function StepEditor({
  step, index, total, allSteps, disabled, knownVars = [],
  onChange, onDelete, onDuplicate, onMoveUp, onMoveDown,
}: Props) {
  const [open, setOpen] = useState(false)
  const [showCondition, setShowCondition] = useState(false)
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)

  // Auto-disarm the delete button after 3s so a primed click can't sit
  // there indefinitely waiting for a stray mouse click after the user
  // moved on. Effect cleanup clears the timer if the user actually
  // confirms or re-disarms.
  useEffect(() => {
    if (!deleteArmed) return
    const t = setTimeout(() => setDeleteArmed(false), 3000)
    return () => clearTimeout(t)
  }, [deleteArmed])

  const titleEmpty = step.title.trim().length === 0
  const titleInvalid = !disabled && saveAttempted && step.required && titleEmpty

  const typeColor = STEP_TYPE_COLORS[step.stepType ?? 'action']

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid var(--border)`, borderLeft: `3px solid ${typeColor}` }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none" style={{ background: 'var(--bg)' }} onClick={() => {
        if (open && step.required && titleEmpty && !disabled) {
          setSaveAttempted(true)
          return // prevent collapse when required title is empty
        }
        setOpen(o => !o)
      }}>
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
              <label className="text-xs block mb-1" style={{ color: titleInvalid ? '#f85149' : 'var(--text-muted)' }}>
                Title{titleInvalid && <span style={{ marginLeft: 4, fontWeight: 700 }}>— Required</span>}
              </label>
              <input
                className="w-full rounded px-2 py-1 text-sm"
                style={{
                  background: 'var(--panel)',
                  border: titleInvalid ? '1.5px solid #f85149' : '1px solid var(--border)',
                  color: 'var(--text)',
                  boxShadow: titleInvalid ? '0 0 0 2px rgba(248,81,73,0.18)' : 'none',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                value={step.title} disabled={disabled}
                onChange={e => { onChange({ ...step, title: e.target.value }); if (e.target.value.trim()) setSaveAttempted(false) }}
              />
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
              knownVars={knownVars}
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
              <button
                onClick={() => {
                  if (deleteArmed) { onDelete(); setDeleteArmed(false) }
                  else setDeleteArmed(true)
                }}
                disabled={disabled}
                title={deleteArmed ? 'Click again to confirm deletion' : 'Delete step'}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{
                  background: deleteArmed ? 'var(--error)' : 'rgba(248,81,73,0.15)',
                  color: deleteArmed ? '#0a0a0f' : 'var(--error)',
                  fontWeight: deleteArmed ? 600 : 400,
                }}
              >
                {deleteArmed ? 'Confirm Del' : 'Del'}
              </button>
            </div>
          </div>
        </div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

