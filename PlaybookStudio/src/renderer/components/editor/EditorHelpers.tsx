import { useState } from 'react'
import type { PlaybookStep } from '@shared/types'

const API_KEY_STORAGE = 'playbookstudio_anthropic_key'

// ─── AI Generate Modal ────────────────────────────────────────────────────────

export function AiGenerateModal({
  onInsert, onClose,
}: {
  onInsert: (steps: Partial<PlaybookStep>[]) => void
  onClose: () => void
}) {
  const [objective, setObjective] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [preview,   setPreview]   = useState<Partial<PlaybookStep>[] | null>(null)
  const apiKey = localStorage.getItem(API_KEY_STORAGE) ?? ''

  async function generate() {
    if (!objective.trim()) { setError('Enter an objective.'); return }
    if (!apiKey) { setError('Configure your Anthropic API key in Settings first.'); return }
    setLoading(true); setError('')
    const res = await window.electronAPI.generateSteps(objective.trim(), apiKey)
    setLoading(false)
    if (!res.ok || !res.steps) { setError(res.error ?? 'Generation failed'); return }
    setPreview(res.steps)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div style={{
        width: 500, maxHeight: '80vh',
        background: '#0d0e18',
        border: '1px solid rgba(42,51,71,0.75)',
        borderRadius: 12,
        boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
        display: 'flex', flexDirection: 'column', padding: 20, gap: 16, overflow: 'hidden',
      }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Generate Steps with AI</h2>
          <p className="text-xs mt-0.5" style={{ color: '#484f58' }}>Uses Claude Haiku to generate playbook steps from an objective.</p>
        </div>

        {!apiKey && (
          <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(210,153,34,0.06)', border: '1px solid rgba(210,153,34,0.2)', color: '#d29922' }}>
            No API key. Go to Settings and add your Anthropic API key.
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#8b949e' }}>Objective</label>
          <input
            className="w-full rounded px-2.5 py-2 text-sm"
            style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.75)', color: '#e6edf3' }}
            placeholder="e.g. Enumerate an Active Directory environment with BloodHound"
            value={objective}
            onChange={e => setObjective(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && generate()}
            disabled={loading || !apiKey}
            autoFocus
          />
        </div>

        {error && <p className="text-xs" style={{ color: '#f85149' }}>{error}</p>}

        {preview && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
            <div className="text-xs font-semibold" style={{ color: '#8b949e' }}>Preview — {preview.length} steps</div>
            {preview.map((s, i) => (
              <div key={i} className="rounded px-3 py-2" style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.5)' }}>
                <div className="text-xs font-medium" style={{ color: '#e6edf3' }}>{i + 1}. {s.title}</div>
                {s.description && <div className="text-xs mt-0.5" style={{ color: '#8b949e' }}>{s.description}</div>}
                {s.commands && s.commands.length > 0 && (
                  <div className="text-xs font-mono mt-1" style={{ color: '#2dd4bf' }}>{s.commands[0]}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={onClose} className="flex-1 text-xs py-2 rounded" style={{ background: 'rgba(42,51,71,0.35)', color: '#8b949e', border: '1px solid rgba(42,51,71,0.5)' }}>
            Cancel
          </button>
          {!preview ? (
            <button
              onClick={generate}
              disabled={loading || !apiKey}
              className="flex-1 text-xs py-2 rounded font-semibold"
              style={{
                background: (loading || !apiKey) ? 'rgba(42,51,71,0.35)' : 'rgba(45,212,191,0.14)',
                color: (loading || !apiKey) ? '#484f58' : '#2dd4bf',
                border: `1px solid ${(loading || !apiKey) ? 'rgba(42,51,71,0.5)' : 'rgba(45,212,191,0.28)'}`,
              }}
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>
          ) : (
            <>
              <button onClick={() => setPreview(null)} className="text-xs py-2 px-3 rounded" style={{ background: 'rgba(42,51,71,0.35)', color: '#8b949e', border: '1px solid rgba(42,51,71,0.5)' }}>
                Retry
              </button>
              <button
                onClick={() => onInsert(preview)}
                className="flex-1 text-xs py-2 rounded font-semibold"
                style={{ background: 'rgba(63,185,80,0.14)', color: '#3fb950', border: '1px solid rgba(63,185,80,0.28)' }}
              >
                Insert {preview.length} Steps
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Variables Panel ──────────────────────────────────────────────────────────

export function VariablesPanel({ vars, disabled, onChange }: {
  vars: Record<string, string>; disabled: boolean; onChange: (v: Record<string, string>) => void
}) {
  const [newKey, setNewKey] = useState('')

  function addVar() {
    if (!newKey.trim() || vars[newKey] !== undefined) return
    onChange({ ...vars, [newKey.trim()]: '' })
    setNewKey('')
  }

  return (
    <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: '#0d0e18', border: '1px solid rgba(42,51,71,0.6)' }}>
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2"
          style={{ color: '#2dd4bf' }}
        >
          <div className="w-px h-3 rounded-full" style={{ background: '#2dd4bf' }} />
          Variables
        </span>
        <span className="text-xs" style={{ color: '#484f58' }}>Use {'{{key}}'} in descriptions &amp; commands</span>
      </div>
      {Object.entries(vars).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: 'rgba(45,212,191,0.08)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.18)', minWidth: 80 }}
          >
            {'{{'}{k}{'}}'}
          </span>
          <input
            className="flex-1 rounded px-2 py-1 text-xs font-mono"
            style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.6)', color: '#e6edf3' }}
            value={v} disabled={disabled} placeholder="default value"
            onChange={e => onChange({ ...vars, [k]: e.target.value })}
          />
          {!disabled && (
            <button
              onClick={() => { const n = { ...vars }; delete n[k]; onChange(n) }}
              className="text-xs px-1.5 py-1 rounded flex-shrink-0"
              style={{ background: 'rgba(248,81,73,0.08)', color: '#f85149', border: '1px solid rgba(248,81,73,0.2)' }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid rgba(42,51,71,0.35)' }}>
          <input
            className="flex-1 rounded px-2 py-1 text-xs font-mono"
            style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.6)', color: '#e6edf3' }}
            placeholder="new variable name" value={newKey}
            onChange={e => setNewKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addVar()}
          />
          <button
            onClick={addVar}
            className="text-xs px-3 py-1 rounded"
            style={{ background: 'rgba(45,212,191,0.08)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.20)' }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

