// SettingsView — feed refresh, relevance, notifications, AI, alert rules, digest
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import type { AppSettings, AlertRule, AlertSeverity, DigestConfig } from '../../../shared/types'

// ── helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-3 pb-1.5 border-b border-border/40">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

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

function AlertRulesEditor() {
  const settings    = useStore(s => s.settings)
  const setSettings = useStore(s => s.setSettings)
  const rules = settings.alertRules ?? []

  const [newRegex, setNewRegex]     = useState('')
  const [newLabel, setNewLabel]     = useState('')
  const [newSeverity, setNewSeverity] = useState<AlertSeverity>('high')
  const [regexError, setRegexError] = useState('')

  async function addRule() {
    if (!newRegex.trim() || !newLabel.trim()) return
    try {
      new RegExp(newRegex)
      setRegexError('')
    } catch {
      setRegexError('Invalid regex')
      return
    }
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
                <span
                  className="text-[9px] font-bold uppercase px-1.5 py-px rounded flex-shrink-0"
                  style={{ color: rule.color, background: `${rule.color}18`, border: `1px solid ${rule.color}33` }}
                >
                  {rule.severity}
                </span>
                <span className="text-[11px] font-medium text-text/80 flex-shrink-0">{rule.label}</span>
                <code className="text-[10px] font-mono text-muted/50 flex-1 truncate">{rule.regex}</code>
                <button
                  onClick={() => removeRule(rule.id)}
                  className="text-[10px] text-danger/50 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add rule form */}
      <div className="p-3 bg-panel/20 border border-border/30 rounded space-y-2">
        <p className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest">New Rule</p>
        <div className="flex gap-2">
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Label (e.g. RCE)"
            className="w-28 bg-bg border border-border/60 rounded px-2 py-1 text-xs text-text placeholder-muted/40 focus:outline-none focus:border-accent no-drag"
          />
          <input
            value={newRegex}
            onChange={e => { setNewRegex(e.target.value); setRegexError('') }}
            placeholder="Regex pattern (e.g. RCE|remote code)"
            className="flex-1 bg-bg border border-border/60 rounded px-2 py-1 text-xs text-text placeholder-muted/40 focus:outline-none focus:border-accent no-drag font-mono"
          />
          <select
            value={newSeverity}
            onChange={e => setNewSeverity(e.target.value as AlertSeverity)}
            className="bg-bg border border-border/60 rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-accent no-drag"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={addRule}
            disabled={!newRegex.trim() || !newLabel.trim()}
            className="px-3 py-1 text-xs bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent rounded transition-colors disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {regexError && <p className="text-[10px] text-danger">{regexError}</p>}
        <p className="text-[10px] text-muted/40">Regex is tested against "title + summary". Matching items get a colored badge and a beep on critical.</p>
      </div>
    </div>
  )
}

// ── Digest Config ─────────────────────────────────────────────────────────────

function DigestEditor() {
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
              <input
                type="number"
                min="0" max="23"
                value={cfg.hour}
                onChange={e => patchDigest({ hour: Number(e.target.value) })}
                className="w-12 bg-bg border border-border/60 rounded px-2 py-1 text-xs text-center text-text focus:outline-none focus:border-accent"
              />
              <span className="text-muted">:</span>
              <input
                type="number"
                min="0" max="59"
                value={cfg.minute}
                onChange={e => patchDigest({ minute: Number(e.target.value) })}
                className="w-12 bg-bg border border-border/60 rounded px-2 py-1 text-xs text-center text-text focus:outline-none focus:border-accent"
              />
            </div>
          </Row>
          <Row label="Max items per source">
            <SelectInput
              value={cfg.maxItemsPerSource}
              onChange={v => patchDigest({ maxItemsPerSource: Number(v) })}
              options={[
                { label: '3',  value: 3  },
                { label: '5',  value: 5  },
                { label: '10', value: 10 },
              ]}
            />
          </Row>
          <div>
            <p className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-2">Sources to include</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {sources.map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.sourceIds.includes(s.id)}
                    onChange={() => toggleSource(s.id)}
                    className="w-3 h-3 rounded"
                    style={{ accentColor: '#ff6b6b' }}
                  />
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

// ── SettingsView ──────────────────────────────────────────────────────────────

export default function SettingsView() {
  const settings    = useStore(s => s.settings)
  const setSettings = useStore(s => s.setSettings)

  const [saved, setSaved] = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)

  async function patch(p: Partial<AppSettings>) {
    const updated = await window.electronAPI.setSettings(p)
    setSettings(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-text">Settings</h2>
            <p className="text-xs text-muted/50 mt-0.5">Configure SignalBoard behavior.</p>
          </div>
          {saved && (
            <span className="text-[10px] text-success bg-success/10 border border-success/30 px-2 py-0.5 rounded">
              Saved
            </span>
          )}
        </div>

        <Section title="Feed">
          <Row label="Refresh interval" description="How often to fetch new items from all sources.">
            <SelectInput
              value={settings.refreshInterval}
              onChange={v => patch({ refreshInterval: Number(v) as AppSettings['refreshInterval'] })}
              options={[
                { label: '15 minutes',  value: 15 },
                { label: '30 minutes',  value: 30 },
                { label: '1 hour',      value: 60 },
                { label: 'Manual only', value: 0  },
              ]}
            />
          </Row>
          <Row label="Max items per source">
            <SelectInput
              value={settings.maxItemsPerSource}
              onChange={v => patch({ maxItemsPerSource: Number(v) })}
              options={[{ label: '10', value: 10 }, { label: '20', value: 20 }, { label: '30', value: 30 }, { label: '50', value: 50 }, { label: '100', value: 100 }]}
            />
          </Row>
          <Row label="Auto-clear items older than">
            <SelectInput
              value={settings.autoClearDays}
              onChange={v => patch({ autoClearDays: Number(v) })}
              options={[{ label: '7 days', value: 7 }, { label: '14 days', value: 14 }, { label: '30 days', value: 30 }, { label: '60 days', value: 60 }, { label: 'Never', value: 0 }]}
            />
          </Row>
          <Row label="Reader light mode" description="White background, dark text, serif font in reading pane.">
            <Toggle checked={!!settings.readerLightMode} onChange={v => patch({ readerLightMode: v })} />
          </Row>
        </Section>

        <Section title="Alert Rules">
          <AlertRulesEditor />
        </Section>

        <Section title="Daily Digest">
          <DigestEditor />
        </Section>

        <Section title="Relevance Scoring">
          <Row label="Notification threshold" description="Items scoring at or above this threshold appear in the bell dropdown.">
            <SelectInput
              value={settings.notificationThreshold}
              onChange={v => patch({ notificationThreshold: Number(v) })}
              options={[
                { label: 'Score ≥ 20', value: 20 }, { label: 'Score ≥ 30', value: 30 },
                { label: 'Score ≥ 40', value: 40 }, { label: 'Score ≥ 50', value: 50 },
                { label: 'Score ≥ 60', value: 60 }, { label: 'Score ≥ 80', value: 80 },
              ]}
            />
          </Row>
          <div className="p-3 bg-panel/30 border border-border/40 rounded text-[10px] text-muted/70 leading-relaxed">
            <p className="font-semibold text-muted/80 mb-1">Scoring algorithm</p>
            <p>+5 per security keyword match (30 keywords)</p>
            <p>+10 per match of active lab / target / IP</p>
            <p>+10 per custom keyword match</p>
          </div>
        </Section>

        <Section title="Notifications">
          <Row label="macOS notifications" description="Show system notifications for high-relevance items.">
            <Toggle checked={settings.notificationsEnabled} onChange={v => patch({ notificationsEnabled: v })} />
          </Row>
        </Section>

        <Section title="AI Summarisation">
          <Row label="Provider">
            <SelectInput
              value={settings.aiProvider}
              onChange={v => patch({ aiProvider: v as AppSettings['aiProvider'] })}
              options={[{ label: 'Claude (Anthropic)', value: 'claude' }, { label: 'Ollama (local)', value: 'ollama' }]}
            />
          </Row>
          {settings.aiProvider === 'claude' && (
            <Row label="Claude API key" description="Used to call the Anthropic Messages API. Stored locally.">
              <div className="flex items-center gap-1.5 no-drag">
                <input
                  type={apiKeyVisible ? 'text' : 'password'}
                  value={settings.claudeApiKey}
                  onChange={e => patch({ claudeApiKey: e.target.value })}
                  placeholder="sk-ant-api03-…"
                  className="w-48 bg-bg border border-border/60 rounded px-2.5 py-1 text-xs text-text placeholder-muted/40 font-mono focus:outline-none focus:border-accent transition-colors"
                />
                <button onClick={() => setApiKeyVisible(v => !v)} className="text-[10px] text-muted hover:text-text transition-colors px-1">
                  {apiKeyVisible ? '🙈' : '👁'}
                </button>
              </div>
            </Row>
          )}
          <Row label="Auto-summarise on open" description="Automatically call AI when you open an article (uses API credits).">
            <Toggle checked={settings.aiAutoSummarise} onChange={v => patch({ aiAutoSummarise: v })} />
          </Row>
        </Section>

        <Section title="About">
          <div className="p-3 bg-panel/20 border border-border/30 rounded space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted/70">SignalBoard</span>
              <span className="text-[11px] font-mono text-text/70">v2.1.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted/70">Part of CyberOS</span>
              <span className="text-[11px] text-muted/50">by ItsEliias</span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
