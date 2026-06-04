// NetworkMap — SettingsView.tsx
import { useState } from 'react'

export interface NetworkMapSettings {
  nodeLabel: 'ip' | 'ip-hostname' | 'hostname'
  showInferredEdges: boolean
  animationEnabled: boolean
  defaultNameFormat: 'date' | 'target'
  autoImportFromReconDesk: boolean
}

export const DEFAULT_SETTINGS: NetworkMapSettings = {
  nodeLabel: 'ip-hostname',
  showInferredEdges: true,
  animationEnabled: true,
  defaultNameFormat: 'date',
  autoImportFromReconDesk: false,
}

export function loadSettings(): NetworkMapSettings {
  try {
    const raw = localStorage.getItem('networkmap-settings')
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(s: NetworkMapSettings): void {
  localStorage.setItem('networkmap-settings', JSON.stringify(s))
}

interface Props {
  onBack: () => void
}

export default function SettingsView({ onBack }: Props) {
  const [settings, setSettings] = useState<NetworkMapSettings>(loadSettings)
  const [saved, setSaved]       = useState(false)

  function update<K extends keyof NetworkMapSettings>(key: K, value: NetworkMapSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderBottom: '1px solid var(--border)', minHeight: 50,
        WebkitAppRegion: 'drag' as React.CSSProperties['WebkitAppRegion'],
      }}>
        <div style={{ paddingLeft: 70, WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'] }}>
          <button onClick={onBack} style={btnStyle}>← Back</button>
        </div>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'] }}>
          Settings
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 520 }}>
        {/* Display */}
        <Section title="Display">
          <SettingRow
            label="Node label"
            description="What to show below each node"
          >
            <select
              value={settings.nodeLabel}
              onChange={e => update('nodeLabel', e.target.value as NetworkMapSettings['nodeLabel'])}
              style={selectStyle}
            >
              <option value="ip">IP only</option>
              <option value="ip-hostname">IP + hostname</option>
              <option value="hostname">Hostname only</option>
            </select>
          </SettingRow>

          <SettingRow
            label="Show inferred edges"
            description="Display inferred connections between nodes"
          >
            <Toggle
              checked={settings.showInferredEdges}
              onChange={v => update('showInferredEdges', v)}
            />
          </SettingRow>

          <SettingRow
            label="Force animation"
            description="Animate force simulation layout"
          >
            <Toggle
              checked={settings.animationEnabled}
              onChange={v => update('animationEnabled', v)}
            />
          </SettingRow>
        </Section>

        {/* Import */}
        <Section title="Import">
          <SettingRow
            label="Default graph name format"
            description="How to name newly imported graphs"
          >
            <select
              value={settings.defaultNameFormat}
              onChange={e => update('defaultNameFormat', e.target.value as NetworkMapSettings['defaultNameFormat'])}
              style={selectStyle}
            >
              <option value="date">Date-based (e.g. Scan 6/3/2026)</option>
              <option value="target">Target-based</option>
            </select>
          </SettingRow>

          <SettingRow
            label="Auto-import from ReconDesk"
            description="Automatically import when ReconDesk target changes"
          >
            <Toggle
              checked={settings.autoImportFromReconDesk}
              onChange={v => update('autoImportFromReconDesk', v)}
            />
          </SettingRow>
        </Section>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 24 }}>
          <button
            onClick={handleSave}
            style={{
              padding: '7px 18px', borderRadius: 6,
              background: 'var(--accent)', border: 'none',
              color: '#0d1117', fontWeight: 600, fontSize: 12,
            }}
          >Save Settings</button>
          {saved && <span style={{ fontSize: 12, color: 'var(--success)' }}>Saved</span>}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: 12, paddingBottom: 6,
        borderBottom: '1px solid var(--border)',
      }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}

function SettingRow({
  label, description, children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        background: checked ? 'var(--accent)' : 'var(--border)',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%',
        background: 'white',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 6,
  background: 'var(--panel)', border: '1px solid var(--border)',
  color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 5, color: 'var(--text)', fontSize: 12,
  padding: '4px 8px',
}
