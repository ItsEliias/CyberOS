import { useState } from 'react'
import { useStore, DEFAULT_THEME, type AppTheme } from '../store'
import type { Playbook } from '@shared/types'
import HelpTip from './ui/HelpTip'

const API_KEY_STORAGE = 'playbookstudio_anthropic_key'

// ─── Theme section ────────────────────────────────────────────────────────────

const ACCENT_SWATCHES = [
  { color: '#4a9eff', label: 'Blue (default)' },
  { color: '#2dd4bf', label: 'Teal' },
  { color: '#3fb950', label: 'Green' },
  { color: '#d29922', label: 'Amber' },
  { color: '#b44fff', label: 'Purple' },
  { color: '#f78166', label: 'Coral' },
]

const BG_PRESETS = [
  { color: '#0a0a0f', label: 'Dark' },
  { color: '#131520', label: 'Graphite' },
  { color: '#0d1117', label: 'Navy' },
  { color: '#000000', label: 'OLED' },
]

function ThemeSection() {
  const theme    = useStore(s => s.theme)
  const setTheme = useStore(s => s.setTheme)
  const [preview, setPreview] = useState<AppTheme>(theme)

  function commit(partial: Partial<AppTheme>) {
    const next = { ...theme, ...partial }
    setPreview(next)
    setTheme(next)
  }

  function handleTextSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10)
    // 0=darkest (#8b949e) to 100=brightest (#ffffff), default at ~89%=#e2e8f0
    const hex = Math.round(val * 2.55).toString(16).padStart(2, '0')
    commit({ textColor: `#${hex}${hex}${hex}` })
  }

  function textSliderValue(): number {
    const c = preview.textColor
    if (!c.startsWith('#') || c.length < 7) return 89
    const r = parseInt(c.slice(1, 3), 16)
    return Math.round(r / 2.55)
  }

  function reset() {
    setPreview(DEFAULT_THEME)
    setTheme(DEFAULT_THEME)
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-2" style={{ color: preview.accentColor }}>
        Appearance
        <HelpTip
          title="Appearance"
          body="Pick an accent color, background, and text brightness. Updates apply live across the app."
          accent={preview.accentColor}
        />
      </h2>
      <div
        className="rounded-lg p-4 flex flex-col gap-4"
        style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        {/* Accent */}
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: '#e2e8f0' }}>Accent Color</div>
          <div className="flex items-center gap-2 flex-wrap">
            {ACCENT_SWATCHES.map(s => (
              <button
                key={s.color}
                onClick={() => commit({ accentColor: s.color })}
                title={s.label}
                className="w-7 h-7 rounded-full transition-all"
                style={{
                  background: s.color,
                  border: preview.accentColor === s.color ? `3px solid #e2e8f0` : '2px solid rgba(255,255,255,0.12)',
                  transform: preview.accentColor === s.color ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Background */}
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: '#e2e8f0' }}>Background</div>
          <div className="flex items-center gap-2 flex-wrap">
            {BG_PRESETS.map(bg => (
              <button
                key={bg.color}
                onClick={() => commit({ bgColor: bg.color })}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-all"
                style={{
                  background: bg.color,
                  border: `1px solid ${preview.bgColor === bg.color ? preview.accentColor : 'rgba(42,51,71,0.6)'}`,
                  color: preview.bgColor === bg.color ? preview.accentColor : '#8b949e',
                }}
              >
                <span
                  className="w-3 h-3 rounded-full border"
                  style={{ background: bg.color, borderColor: 'rgba(255,255,255,0.2)' }}
                />
                {bg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text brightness */}
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: '#e2e8f0' }}>
            Text Brightness
            <span className="ml-2 font-mono text-xs" style={{ color: '#8b949e' }}>{preview.textColor}</span>
          </div>
          <input
            type="range" min="50" max="100" value={textSliderValue()}
            onChange={handleTextSlider}
            className="w-full h-1.5 rounded-full appearance-none"
            style={{ accentColor: preview.accentColor, background: `rgba(42,51,71,0.5)` }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: '#4a5568' }}>Dim</span>
            <span className="text-xs" style={{ color: '#4a5568' }}>Bright</span>
          </div>
        </div>

        {/* Live preview */}
        <div
          className="rounded-md p-3 flex items-center gap-3"
          style={{
            background: preview.bgColor,
            border: `1px solid ${preview.accentColor}44`,
          }}
        >
          <span className="text-xs font-semibold" style={{ color: preview.accentColor }}>Preview</span>
          <span className="text-sm" style={{ color: preview.textColor }}>Playbook Studio</span>
          <span className="text-xs" style={{ color: preview.textColor, opacity: 0.6 }}>Step 3 of 8</span>
          <button
            className="ml-auto text-xs px-3 py-1 rounded font-medium"
            style={{ background: preview.accentColor, color: '#0a0a0f' }}
          >
            Run
          </button>
        </div>

        {/* Reset */}
        <div className="flex justify-end">
          <button
            onClick={reset}
            className="text-xs px-3 py-1.5 rounded"
            style={{ background: 'rgba(42,51,71,0.35)', color: '#8b949e', border: '1px solid rgba(42,51,71,0.5)' }}
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── SettingsView ─────────────────────────────────────────────────────────────

export default function SettingsView() {
  const playbooks    = useStore(s => s.playbooks)
  const setPlaybooks = useStore(s => s.setPlaybooks)
  const context      = useStore(s => s.context)
  const theme        = useStore(s => s.theme)
  const accent       = theme.accentColor

  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [apiKey, setApiKey]             = useState(() => localStorage.getItem(API_KEY_STORAGE) ?? '')
  const [apiKeySaved, setApiKeySaved]   = useState(false)
  const [showKey, setShowKey]           = useState(false)

  function saveApiKey() {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE, apiKey.trim())
    } else {
      localStorage.removeItem(API_KEY_STORAGE)
    }
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  const customPlaybooks = playbooks.filter(p => !p.isBuiltIn)

  async function handleExport() {
    try {
      const data = JSON.stringify(customPlaybooks, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `playbooks-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus(`Exported ${customPlaybooks.length} custom playbook${customPlaybooks.length !== 1 ? 's' : ''}`)
      setTimeout(() => setExportStatus(null), 3000)
    } catch (e) {
      setExportStatus('Export failed: ' + (e as Error).message)
    }
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type  = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text) as Playbook[]
        if (!Array.isArray(imported)) throw new Error('Invalid format: expected JSON array')
        let count = 0
        for (const pb of imported) {
          if (!pb.id || !pb.name || !pb.steps) continue
          const toSave = { ...pb, isBuiltIn: false }
          const res = await window.electronAPI.savePlaybook(toSave)
          if (res.ok) count++
        }
        const all = await window.electronAPI.getAllPlaybooks()
        setPlaybooks(all)
        setImportStatus(`Imported ${count} playbook${count !== 1 ? 's' : ''}`)
        setTimeout(() => setImportStatus(null), 3000)
      } catch (e) {
        setImportStatus('Import failed: ' + (e as Error).message)
        setTimeout(() => setImportStatus(null), 5000)
      }
    }
    input.click()
  }

  const APP_DATA = `~/Library/Application Support/PlaybookStudio/`

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: '#e2e8f0',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-sm font-medium inline-flex items-center gap-2" style={{ color: '#e2e8f0' }}>
          Settings
          <HelpTip
            title="Settings"
            body="Configure theme, playbook storage, AI key, and CyberOS integration. Changes apply immediately."
          />
        </span>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6 max-w-2xl">

        {/* Theme */}
        <ThemeSection />

        {/* Playbooks section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-2" style={{ color: accent }}>
            Playbooks
            <HelpTip
              title="Playbooks"
              body="See where playbooks are stored on disk, export your custom set as JSON, or import a backup. Built-ins are read-only."
              accent={accent}
            />
          </h2>

          <div
            className="rounded-lg p-4 flex flex-col gap-3"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
          >
            <div>
              <div className="text-xs mb-1" style={{ color: '#4a5568' }}>Storage path</div>
              <div
                className="text-xs font-mono rounded px-3 py-2"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: '#8b949e' }}
              >
                {APP_DATA}
              </div>
              <div className="text-xs mt-1" style={{ color: '#4a5568' }}>
                playbooks.json · runs.json
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex-1">
                <div className="text-xs font-medium mb-0.5" style={{ color: '#e2e8f0' }}>Export all custom playbooks</div>
                <div className="text-xs" style={{ color: '#4a5568' }}>
                  Downloads a JSON backup of your {customPlaybooks.length} custom playbook{customPlaybooks.length !== 1 ? 's' : ''}.
                </div>
                {exportStatus && (
                  <div className="text-xs mt-1" style={{ color: '#3fb950' }}>{exportStatus}</div>
                )}
              </div>
              <button
                onClick={handleExport}
                disabled={customPlaybooks.length === 0}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors"
                style={{
                  background: customPlaybooks.length === 0 ? 'rgba(42,51,71,0.3)' : `${accent}22`,
                  color:      customPlaybooks.length === 0 ? '#4a5568' : accent,
                  border:     `1px solid ${customPlaybooks.length === 0 ? 'rgba(42,51,71,0.5)' : `${accent}44`}`,
                  cursor:     customPlaybooks.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Export JSON
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex-1">
                <div className="text-xs font-medium mb-0.5" style={{ color: '#e2e8f0' }}>Import playbooks</div>
                <div className="text-xs" style={{ color: '#4a5568' }}>
                  Restore from a JSON backup. Built-in playbooks are never overwritten.
                </div>
                {importStatus && (
                  <div
                    className="text-xs mt-1"
                    style={{ color: importStatus.startsWith('Import failed') ? '#f85149' : '#3fb950' }}
                  >
                    {importStatus}
                  </div>
                )}
              </div>
              <button
                onClick={handleImport}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors"
                style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
              >
                Import JSON
              </button>
            </div>
          </div>
        </section>

        {/* AI section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-2" style={{ color: accent }}>
            AI Step Generator
            <HelpTip
              title="AI Step Generator"
              body="Stores your Anthropic API key locally so the editor can draft new steps for you. Leave blank to disable AI features."
              accent={accent}
            />
          </h2>
          <div
            className="rounded-lg p-4 flex flex-col gap-3"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
          >
            <div>
              <div className="text-xs font-medium mb-0.5" style={{ color: '#e2e8f0' }}>Anthropic API Key</div>
              <div className="text-xs mb-2" style={{ color: '#4a5568' }}>
                Used for AI step generation. Stored locally only.
              </div>
              <div className="flex items-center gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="flex-1 rounded px-2 py-1.5 text-xs font-mono"
                  style={inputStyle}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  onKeyDown={e => e.key === 'Enter' && saveApiKey()}
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  className="text-xs px-2 py-1.5 rounded"
                  style={{ background: 'rgba(42,51,71,0.3)', color: '#8b949e', border: '1px solid rgba(42,51,71,0.5)' }}
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={saveApiKey}
                  className="text-xs px-3 py-1.5 rounded font-medium"
                  style={{
                    background: apiKeySaved ? 'rgba(63,185,80,0.15)' : `${accent}22`,
                    color: apiKeySaved ? '#3fb950' : accent,
                    border: `1px solid ${apiKeySaved ? 'rgba(63,185,80,0.3)' : `${accent}44`}`,
                  }}
                >
                  {apiKeySaved ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Integration section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-2" style={{ color: accent }}>
            Integration
            <HelpTip
              title="Integration"
              body="Toggle CyberOS data exchange — reading lab/target context and writing playbook events for the dashboard."
              accent={accent}
            />
          </h2>
          <div
            className="rounded-lg p-4 flex flex-col gap-3"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
          >
            <IntegrationToggle
              accentColor={accent}
              label="Auto-read session context"
              description="Read active lab and target IP from cybertools-config.json."
              defaultOn
            />
            <IntegrationToggle
              accentColor={accent}
              label="Write active playbook to shared context"
              description="Write shared_context.activePlaybook when a run starts."
              defaultOn
            />
            <IntegrationToggle
              accentColor={accent}
              label="Write playbook events to ecosystem-events.json"
              description="Emit playbook events for the CyberOS dashboard."
              defaultOn
            />
          </div>
        </section>

        {/* Current session context */}
        {(context.activeLab || context.activeTarget || context.activeIP) && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
              Current Session Context
            </h2>
            <div
              className="rounded-lg p-4 flex flex-col gap-2"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
            >
              {context.activeLab    && <ContextRow label="Active Lab"   value={context.activeLab} />}
              {context.activeTarget && <ContextRow label="Target Name"  value={context.activeTarget} />}
              {context.activeIP     && <ContextRow label="Target IP"    value={context.activeIP} mono />}
              <p className="text-xs mt-1" style={{ color: '#4a5568' }}>
                Sourced from ~/cybertools-config.json · updates every 10s
              </p>
            </div>
          </section>
        )}

        {/* Playbook inventory */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
            Playbook Inventory
          </h2>
          <div
            className="rounded-lg p-4 flex flex-col gap-1.5"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
          >
            <ContextRow label="Built-in" value={String(playbooks.filter(p => p.isBuiltIn).length)} />
            <ContextRow label="Custom"   value={String(customPlaybooks.length)} />
            <ContextRow label="Total"    value={String(playbooks.length)} />
          </div>
        </section>

      </div>
    </div>
  )
}

function IntegrationToggle({
  label, description, defaultOn, accentColor,
}: {
  label: string
  description: string
  defaultOn?: boolean
  accentColor: string
}) {
  const [on, setOn] = useState(defaultOn ?? true)
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <div className="text-xs font-medium" style={{ color: '#e2e8f0' }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: '#4a5568' }}>{description}</div>
      </div>
      <button
        onClick={() => setOn(v => !v)}
        className="flex-shrink-0 mt-0.5 w-8 h-4 rounded-full transition-colors relative"
        style={{ background: on ? accentColor : 'rgba(42,51,71,0.6)' }}
        title={on ? 'Enabled' : 'Disabled'}
      >
        <span
          className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
          style={{ background: '#fff', left: on ? '18px' : '2px' }}
        />
      </button>
    </div>
  )
}

function ContextRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-28 flex-shrink-0" style={{ color: '#4a5568' }}>{label}</span>
      <span
        className="text-xs"
        style={{ color: '#8b949e', fontFamily: mono ? 'var(--font-mono, monospace)' : undefined }}
      >
        {value}
      </span>
    </div>
  )
}
