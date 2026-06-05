// SettingsEditors — AlertRulesEditor + DigestEditor for SettingsView
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import type { AlertRule, AlertSeverity, DigestConfig } from '../../../shared/types'

// ── shared helpers used by DigestEditor ───────────────────────────────────────

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text">{label}</p>
        {description && <p className="text-[10px] text-muted/50 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full border transition-all relative ${
        checked ? 'bg-accent/30 border-accent/50' : 'bg-border/30 border-border/60'
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
          checked ? 'right-0.5 bg-accent' : 'left-0.5 bg-muted/60'
        }`}
      />
    </button>
  )
}

function SelectInput({ value, onChange, options }: {
  value: string | number;
  onChange: (v: string) => void;
  options: { label: string; value: string | number }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-bg border border-border/60 rounded px-2.5 py-1 text-xs text-text focus:outline-none focus:border-accent transition-colors no-drag"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

// ── Alert Rules Editor ────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: '#ff6b6b',
  high:     '#f85149',
  medium:   '#d29922',
  low:      '#4a5568',
}

export function AlertRulesEditor() {
  const settings    = useStore(s => s.settings)
  const setSettings = useStore(s => s.setSettings)
  const rules = settings.alertRules ?? []

  const [newRegex, setNewRegex]     = useState('')
  const [newLabel, setNewLabel]     = useState('')
  const [newSeverity, setNewSeverity] = useState<AlertSeverity>('high')
  const [regexError, setRegexError] = useState('')

  async function addRule() {
    if (!newRegex.trim() || !newLabel.trim()) return
    try { new RegExp(newRegex); setRegexError('') } catch { setRegexError('Invalid regex'); return }
    const rule: AlertRule = {
      id:       `rule-${Date.now()}`,
      regex:    newRegex.trim(),
      label:    newLabel.trim(),
      severity: newSeverity,
      color:    SEVERITY_COLORS[newSeverity],
    }
    const updated = await window.electronAPI.setSettings({ alertRules: [...rules, rule] })
    setSettings(updated)
    setNewRegex('')
    setNewLabel('')
  }

  async function removeRule(id: string) {
    const updated = await window.electronAPI.setSettings({ alertRules: rules.filter(r => r.id !== id) })
    setSettings(updated)
  }

  return (
    <div>
      {rules.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <AnimatePresence>
            {rules.map(rule => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-2 rounded border border-border/40 bg-panel/30 group"
              >
                <span className="text-[9px] font-bold uppercase px-1.5 py-px rounded flex-shrink-0"
                  style={{ color: rule.color, background: `${rule.color}18`, border: `1px solid ${rule.color}33` }}>
                  {rule.severity}
                </span>
                <span className="text-[11px] font-medium text-text/80 flex-shrink-0">{rule.label}</span>
                <code className="text-[10px] font-mono text-muted/50 flex-1 truncate">{rule.regex}</code>
                <button onClick={() => removeRule(rule.id)}
                  className="text-[10px] text-danger/50 hover:text-danger transition-colors opacity-0 group-hover:opacity-100">×</button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <div className="p-3 bg-panel/20 border border-border/30 rounded space-y-2">
        <p className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest">New Rule</p>
        <div className="flex gap-2">
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label (e.g. RCE)"
            className="w-28 bg-bg border border-border/60 rounded px-2 py-1 text-xs text-text placeholder-muted/40 focus:outline-none focus:border-accent no-drag" />
          <input value={newRegex} onChange={e => { setNewRegex(e.target.value); setRegexError('') }}
            placeholder="Regex pattern (e.g. RCE|remote code)"
            className="flex-1 bg-bg border border-border/60 rounded px-2 py-1 text-xs text-text placeholder-muted/40 focus:outline-none focus:border-accent no-drag font-mono" />
          <select value={newSeverity} onChange={e => setNewSeverity(e.target.value as AlertSeverity)}
            className="bg-bg border border-border/60 rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-accent no-drag">
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button onClick={addRule} disabled={!newRegex.trim() || !newLabel.trim()}
            className="px-3 py-1 text-xs bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent rounded transition-colors disabled:opacity-40">
            Add
          </button>
        </div>
        {regexError && <p className="text-[10px] text-danger">{regexError}</p>}
        <p className="text-[10px] text-muted/40">Regex tested against "title + summary". Matching items get a badge; critical triggers a beep.</p>
      </div>
    </div>
  )
}

// ── Digest Config ─────────────────────────────────────────────────────────────

export function DigestEditor() {
  const settings    = useStore(s => s.settings)
  const setSettings = useStore(s => s.setSettings)
  const sources     = useStore(s => s.sources)
  const cfg = settings.digestConfig ?? { enabled: false, hour: 8, minute: 0, sourceIds: [], maxItemsPerSource: 5 }

  async function patchDigest(patch: Partial<DigestConfig>) {
    const next = { ...cfg, ...patch }
    const updated = await window.electronAPI.setSettings({ digestConfig: next })
    setSettings(updated)
  }

  function toggleSource(id: string) {
    const ids = cfg.sourceIds.includes(id)
      ? cfg.sourceIds.filter(s => s !== id)
      : [...cfg.sourceIds, id]
    patchDigest({ sourceIds: ids })
  }

  return (
    <div className="space-y-3">
      <Row label="Enable daily digest" description="Compile top items at a scheduled time.">
        <Toggle checked={cfg.enabled} onChange={v => patchDigest({ enabled: v })} />
      </Row>
      {cfg.enabled && (
        <>
          <Row label="Delivery time">
            <div className="flex items-center gap-1.5 no-drag">
              <input type="number" min="0" max="23" value={cfg.hour}
                onChange={e => patchDigest({ hour: Number(e.target.value) })}
                className="w-12 bg-bg border border-border/60 rounded px-2 py-1 text-xs text-center text-text focus:outline-none focus:border-accent" />
              <span className="text-muted">:</span>
              <input type="number" min="0" max="59" value={cfg.minute}
                onChange={e => patchDigest({ minute: Number(e.target.value) })}
                className="w-12 bg-bg border border-border/60 rounded px-2 py-1 text-xs text-center text-text focus:outline-none focus:border-accent" />
            </div>
          </Row>
          <Row label="Max items per source">
            <SelectInput value={cfg.maxItemsPerSource} onChange={v => patchDigest({ maxItemsPerSource: Number(v) })}
              options={[{ label: '3', value: 3 }, { label: '5', value: 5 }, { label: '10', value: 10 }]} />
          </Row>
          <div>
            <p className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-2">Sources to include</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {sources.map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cfg.sourceIds.includes(s.id)} onChange={() => toggleSource(s.id)}
                    className="w-3 h-3 rounded" style={{ accentColor: '#ff6b6b' }} />
                  <span className="text-[11px] text-muted/80">{s.name}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
