// NetLab — SettingsView.tsx

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNetLabStore } from '../store'
import type { NetLabPrefs } from '@shared/types'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-10 h-5 rounded-full transition-colors shrink-0"
      style={{ background: checked ? '#5ec4ff' : '#2a3347' }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
        style={{ background: '#e6edf3', transform: checked ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }}
      />
    </button>
  )
}

function SettingRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border-subtle last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsView() {
  const progress = useNetLabStore(s => s.progress)
  const setProgress = useNetLabStore(s => s.setProgress)

  const [prefs, setPrefs] = useState<NetLabPrefs>({ ghostVaultAutoSave: false })
  const [saved, setSaved] = useState(false)
  const [version, setVersion] = useState('1.0.0')

  useEffect(() => {
    window.electronAPI.prefs.get().then(setPrefs).catch(console.error)
    window.electronAPI.app.version().then(setVersion).catch(console.error)
  }, [])

  async function save() {
    await window.electronAPI.prefs.set(prefs)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function exportProgress() {
    const json = JSON.stringify(progress, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `netlab-progress-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function resetProgress() {
    if (!confirm('Reset all progress? This cannot be undone.')) return
    setProgress({})
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-xl">
        <h2 className="text-base font-semibold text-text-primary mb-6">Settings</h2>

        {/* Appearance */}
        <div className="mb-6">
          <p className="text-2xs text-text-muted uppercase tracking-wider mb-3">Appearance</p>
          <div className="p-4 rounded border border-border-subtle" style={{ background: '#0f1117' }}>
            <SettingRow
              label="Theme"
              description="Dark only by design — NetLab is optimized for dark mode."
            >
              <span className="text-xs px-2 py-1 rounded"
                style={{ background: '#161b27', color: '#8b949e', border: '1px solid #2a3347' }}>
                Dark
              </span>
            </SettingRow>
          </div>
        </div>

        {/* Integrations */}
        <div className="mb-6">
          <p className="text-2xs text-text-muted uppercase tracking-wider mb-3">Integrations</p>
          <div className="p-4 rounded border border-border-subtle" style={{ background: '#0f1117' }}>
            <SettingRow
              label="TerminalLink Path"
              description="Path to TerminalLink app for executing commands directly."
            >
              <input
                value={prefs.terminalLinkPath ?? ''}
                onChange={e => setPrefs(p => ({ ...p, terminalLinkPath: e.target.value }))}
                placeholder="Auto-detected"
                className="w-48 px-2 py-1.5 rounded text-xs font-mono-code bg-bg-elevated border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-[#5ec4ff]"
              />
            </SettingRow>
            <SettingRow
              label="GhostVault Auto-Save"
              description="Automatically save lab configs to GhostVault vault."
            >
              <Toggle
                checked={prefs.ghostVaultAutoSave}
                onChange={v => setPrefs(p => ({ ...p, ghostVaultAutoSave: v }))}
              />
            </SettingRow>
          </div>
        </div>

        {/* Data */}
        <div className="mb-6">
          <p className="text-2xs text-text-muted uppercase tracking-wider mb-3">Data</p>
          <div className="p-4 rounded border border-border-subtle" style={{ background: '#0f1117' }}>
            <SettingRow
              label="Lab Data Directory"
              description="Where custom lab files are stored."
            >
              <input
                value={prefs.labDataDir ?? ''}
                onChange={e => setPrefs(p => ({ ...p, labDataDir: e.target.value }))}
                placeholder="Default (App Support)"
                className="w-48 px-2 py-1.5 rounded text-xs font-mono-code bg-bg-elevated border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-[#5ec4ff]"
              />
            </SettingRow>
            <SettingRow
              label="Export Progress"
              description="Download your lab progress as JSON."
            >
              <motion.button
                onClick={exportProgress}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{ background: '#161b27', color: '#5ec4ff', border: '1px solid #5ec4ff' }}
                whileHover={{ opacity: 0.85 }}
              >
                Export JSON
              </motion.button>
            </SettingRow>
            <SettingRow
              label="Reset Progress"
              description="Clear all lab progress and start fresh."
            >
              <motion.button
                onClick={resetProgress}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149', border: '1px solid rgba(248,81,73,0.3)' }}
                whileHover={{ opacity: 0.85 }}
              >
                Reset All
              </motion.button>
            </SettingRow>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <motion.button
            onClick={save}
            className="px-6 py-2 rounded text-sm font-semibold transition-colors"
            style={{ background: '#5ec4ff', color: '#0a0a0f' }}
            whileHover={{ opacity: 0.85 }}
            whileTap={{ scale: 0.97 }}
          >
            Save Settings
          </motion.button>
          {saved && (
            <span className="text-sm" style={{ color: '#3fb950' }}>Saved!</span>
          )}
        </div>

        {/* Version info */}
        <div className="mt-8 pt-4 border-t border-border-subtle">
          <p className="text-2xs text-text-muted">
            NetLab v{version} — Part of the CYBERTOOLS ecosystem by ItsEliias
          </p>
        </div>
      </div>
    </div>
  )
}
