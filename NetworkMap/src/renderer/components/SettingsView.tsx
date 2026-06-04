// NetworkMap — SettingsView.tsx
import { useState, useEffect } from 'react'

export interface NetworkMapSettings {
  nodeLabel: 'ip' | 'ip-hostname' | 'hostname'
  showInferredEdges: boolean
  animationEnabled: boolean
  defaultNameFormat: 'date' | 'target'
  autoImportFromReconDesk: boolean
}

export interface AppTheme {
  accentColor: string
  bgColor: string
  textColor: string
}

export const DEFAULT_THEME: AppTheme = {
  accentColor: '#d29922',
  bgColor: '#0a0a0f',
  textColor: '#e2e8f0',
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

export function loadTheme(): AppTheme {
  try {
    const raw = localStorage.getItem('networkmap-theme')
    if (!raw) return DEFAULT_THEME
    return { ...DEFAULT_THEME, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_THEME
  }
}

function saveTheme(t: AppTheme): void {
  localStorage.setItem('networkmap-theme', JSON.stringify(t))
}

export function applyTheme(t: AppTheme): void {
  const root = document.documentElement
  root.style.setProperty('--app-accent', t.accentColor)
  root.style.setProperty('--app-bg', t.bgColor)
  root.style.setProperty('--app-text', t.textColor)
  // Keep derived vars in sync
  root.style.setProperty('--accent', t.accentColor)
}

// Apply saved theme on module load
;(function initTheme() {
  if (typeof document !== 'undefined') {
    applyTheme(loadTheme())
  }
})()

const ACCENT_SWATCHES = [
  { color: '#d29922', label: 'Amber (default)' },
  { color: '#4a9eff', label: 'Blue' },
  { color: '#3fb950', label: 'Green' },
  { color: '#ff6b6b', label: 'Red' },
  { color: '#b44fff', label: 'Purple' },
  { color: '#f78166', label: 'Coral' },
]

const BG_OPTIONS = [
  { color: '#0a0a0f', label: 'Dark' },
  { color: '#111318', label: 'Graphite' },
  { color: '#0d1117', label: 'Navy' },
  { color: '#000000', label: 'OLED' },
]

interface Props {
  onBack: () => void
}

export default function SettingsView({ onBack }: Props) {
  const [settings, setSettings] = useState<NetworkMapSettings>(loadSettings)
  const [theme, setTheme]       = useState<AppTheme>(loadTheme)
  const [saved, setSaved]       = useState(false)

  // Reactively apply theme as user changes it
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function update<K extends keyof NetworkMapSettings>(key: K, value: NetworkMapSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function updateTheme<K extends keyof AppTheme>(key: K, value: AppTheme[K]) {
    setTheme(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    saveSettings(settings)
    saveTheme(theme)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleResetTheme() {
    setTheme(DEFAULT_THEME)
    applyTheme(DEFAULT_THEME)
    setSaved(false)
  }

  // Text brightness from hex color to slider 0-100
  function hexToLightness(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return Math.round(((Math.max(r, g, b) + Math.min(r, g, b)) / 2) * 100)
  }

  function lightnessToHex(pct: number): string {
    const v = Math.round((pct / 100) * 255)
    const h = v.toString(16).padStart(2, '0')
    // Clamp min lightness to ensure readable text (#c9d1d9 = ~83%)
    const clamped = Math.max(v, 0xc9)
    const ch = clamped.toString(16).padStart(2, '0')
    return `#${ch}${ch}${ch}`
  }

  const textLightness = hexToLightness(theme.textColor)

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
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--app-text)', WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'] }}>
          Settings
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 540 }}>

        {/* Theme section */}
        <Section title="Appearance">
          {/* Accent color */}
          <SettingRow label="Accent color" description="Primary highlight and interactive color">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ACCENT_SWATCHES.map(sw => (
                <button
                  key={sw.color}
                  title={sw.label}
                  onClick={() => updateTheme('accentColor', sw.color)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', border: 'none',
                    background: sw.color, cursor: 'pointer', flexShrink: 0,
                    outline: theme.accentColor === sw.color
                      ? `2px solid ${sw.color}`
                      : '2px solid transparent',
                    outlineOffset: 2,
                    boxShadow: theme.accentColor === sw.color
                      ? `0 0 8px ${sw.color}80`
                      : 'none',
                    transition: 'all 150ms',
                  }}
                />
              ))}
            </div>
          </SettingRow>

          {/* Background */}
          <SettingRow label="Background" description="Canvas and panel background color">
            <div style={{ display: 'flex', gap: 6 }}>
              {BG_OPTIONS.map(bg => (
                <button
                  key={bg.color}
                  title={bg.label}
                  onClick={() => updateTheme('bgColor', bg.color)}
                  style={{
                    width: 24, height: 24, borderRadius: 6, cursor: 'pointer', flexShrink: 0,
                    background: bg.color,
                    border: `2px solid ${theme.bgColor === bg.color ? '#e2e8f0' : 'rgba(42,51,71,0.75)'}`,
                    transition: 'all 150ms',
                  }}
                />
              ))}
            </div>
          </SettingRow>

          {/* Text brightness */}
          <SettingRow label="Text brightness" description="Primary text lightness (min #c9d1d9)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range" min={83} max={100} value={textLightness}
                onChange={e => updateTheme('textColor', lightnessToHex(Number(e.target.value)))}
                style={{
                  width: 100, accentColor: theme.accentColor, cursor: 'pointer',
                }}
              />
              <span style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', color: theme.textColor,
                background: 'rgba(42,51,71,0.4)', borderRadius: 4, padding: '2px 6px',
                minWidth: 56, textAlign: 'center',
              }}>{theme.textColor}</span>
            </div>
          </SettingRow>

          {/* Preview swatch */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            background: theme.bgColor,
            border: `1px solid rgba(42,51,71,0.6)`,
            marginTop: 4,
          }}>
            <span style={{ fontSize: 11, color: theme.accentColor, fontWeight: 600 }}>Preview</span>
            <span style={{ fontSize: 11, color: theme.textColor }}>Primary text</span>
            <span style={{ fontSize: 11, color: '#8b949e' }}>Secondary</span>
            <button
              onClick={handleResetTheme}
              style={{
                marginLeft: 'auto', fontSize: 10, padding: '3px 8px', borderRadius: 5,
                background: 'rgba(42,51,71,0.3)', border: '1px solid rgba(42,51,71,0.6)',
                color: '#8b949e', cursor: 'pointer', transition: 'all 150ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e2e8f0' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8b949e' }}
            >Reset to defaults</button>
          </div>
        </Section>

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
              accent={theme.accentColor}
            />
          </SettingRow>

          <SettingRow
            label="Force animation"
            description="Animate force simulation layout"
          >
            <Toggle
              checked={settings.animationEnabled}
              onChange={v => update('animationEnabled', v)}
              accent={theme.accentColor}
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
              accent={theme.accentColor}
            />
          </SettingRow>
        </Section>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 24 }}>
          <button
            onClick={handleSave}
            style={{
              height: 34, padding: '0 16px', borderRadius: 6,
              background: theme.accentColor, border: 'none',
              color: '#0a0a0f', fontWeight: 500, fontSize: 13,
              cursor: 'pointer', transition: 'opacity 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >Save Settings</button>
          {saved && <span style={{ fontSize: 12, color: '#3fb950' }}>Saved</span>}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: '#8b949e',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: 12, paddingBottom: 6,
        borderBottom: '1px solid rgba(42,51,71,0.6)',
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
        <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 2 }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: '#8b949e' }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, accent }: { checked: boolean; onChange: (v: boolean) => void; accent: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        background: checked ? accent : 'rgba(42,51,71,0.75)',
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
  background: 'rgba(22,27,39,0.75)', border: '1px solid rgba(42,51,71,0.6)',
  color: '#e2e8f0', fontSize: 12, cursor: 'pointer',
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(10,10,15,0.8)', border: '1px solid rgba(42,51,71,0.6)',
  borderRadius: 5, color: '#e2e8f0', fontSize: 12,
  padding: '4px 8px', outline: 'none',
}
