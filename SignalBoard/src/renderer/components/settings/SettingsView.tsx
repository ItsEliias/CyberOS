// SettingsView — feed refresh, relevance, notifications, AI, alert rules, digest
import { useEffect, useState } from 'react'
import { useStore } from '../../store'
import ThemeSection from './SettingsTheme'
import { AlertRulesEditor, DigestEditor } from './SettingsEditors'
import CustomFeedsEditor from './CustomFeedsEditor'
import HelpTip from '../ui/HelpTip'
import type { AppSettings } from '../../../shared/types'

// ── helpers ──────────────────────────────────────────────────────────────────

function Section({ id, title, help, children }: { id?: string; title: string; help?: { title: string; text: string }; children: React.ReactNode }) {
  return (
    <div id={id} className="mb-6">
      <h3 className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-3 pb-1.5 border-b border-border/40 flex items-center gap-2">
        <span>{title}</span>
        {help && <HelpTip title={help.title} text={help.text} />}
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

// ── SettingsView ──────────────────────────────────────────────────────────────

export default function SettingsView() {
  const settings    = useStore(s => s.settings)
  const setSettings = useStore(s => s.setSettings)

  const [saved, setSaved]               = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)

  async function patch(p: Partial<AppSettings>) {
    const updated = await window.electronAPI.setSettings(p)
    setSettings(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  // Scroll to Custom Feeds when palette command requests it
  useEffect(() => {
    function onScrollRequest(e: Event) {
      const detail = (e as CustomEvent<{ section?: string }>).detail
      const id = detail?.section
      if (!id) return
      requestAnimationFrame(() => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
    window.addEventListener('signalboard:settings-scroll', onScrollRequest)
    return () => window.removeEventListener('signalboard:settings-scroll', onScrollRequest)
  }, [])

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

        <Section title="Appearance">
          <ThemeSection />
        </Section>

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
              options={[
                { label: '10',  value: 10  }, { label: '20', value: 20 },
                { label: '30',  value: 30  }, { label: '50', value: 50 },
                { label: '100', value: 100 },
              ]}
            />
          </Row>
          <Row label="Auto-clear items older than">
            <SelectInput
              value={settings.autoClearDays}
              onChange={v => patch({ autoClearDays: Number(v) })}
              options={[
                { label: '7 days',  value: 7  }, { label: '14 days', value: 14 },
                { label: '30 days', value: 30 }, { label: '60 days', value: 60 },
                { label: 'Never',   value: 0  },
              ]}
            />
          </Row>
          <Row label="Reader light mode" description="White background, dark text, serif font in reading pane.">
            <Toggle checked={!!settings.readerLightMode} onChange={v => patch({ readerLightMode: v })} />
          </Row>
        </Section>

        <Section
          id="custom-feeds-section"
          title="Custom Feeds"
          help={{
            title: 'Custom Feeds',
            text: 'Add your own RSS or Atom feed URLs. Items are fetched on launch and after each add, then merged into the main Signal Feed with a "Custom" badge so you can tell them apart from the built-in sources.',
          }}
        >
          <CustomFeedsEditor />
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
              options={[
                { label: 'Claude (Anthropic)', value: 'claude' },
                { label: 'Ollama (local)',      value: 'ollama' },
              ]}
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
                <button
                  onClick={() => setApiKeyVisible(v => !v)}
                  className="text-[10px] text-muted hover:text-text transition-colors px-1"
                >
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
