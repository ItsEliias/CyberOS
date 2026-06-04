import { useState } from 'react'
import { useStore } from '../store'
import type { Playbook } from '@shared/types'

const API_KEY_STORAGE = 'playbookstudio_anthropic_key'

export default function SettingsView() {
  const playbooks    = useStore(s => s.playbooks)
  const setPlaybooks = useStore(s => s.setPlaybooks)
  const context      = useStore(s => s.context)

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

  // Only custom playbooks are exported/imported (built-ins are bundled)
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

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Settings</span>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6 max-w-2xl">

        {/* Playbooks section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
            Playbooks
          </h2>

          <div
            className="rounded-lg p-4 flex flex-col gap-3"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
          >
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Storage path</div>
              <div
                className="text-xs font-mono rounded px-3 py-2"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
              >
                {APP_DATA}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                playbooks.json · runs.json
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex-1">
                <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--text)' }}>Export all custom playbooks</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Downloads a JSON backup of your {customPlaybooks.length} custom playbook{customPlaybooks.length !== 1 ? 's' : ''}.
                </div>
                {exportStatus && (
                  <div className="text-xs mt-1" style={{ color: 'var(--success)' }}>{exportStatus}</div>
                )}
              </div>
              <button
                onClick={handleExport}
                disabled={customPlaybooks.length === 0}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors"
                style={{
                  background: customPlaybooks.length === 0 ? 'var(--border)' : 'var(--accent-dim)',
                  color:      customPlaybooks.length === 0 ? 'var(--text-muted)' : 'var(--accent)',
                  cursor:     customPlaybooks.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Export JSON
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex-1">
                <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--text)' }}>Import playbooks</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Restore from a JSON backup. Built-in playbooks are never overwritten.
                </div>
                {importStatus && (
                  <div
                    className="text-xs mt-1"
                    style={{ color: importStatus.startsWith('Import failed') ? 'var(--error)' : 'var(--success)' }}
                  >
                    {importStatus}
                  </div>
                )}
              </div>
              <button
                onClick={handleImport}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                Import JSON
              </button>
            </div>
          </div>
        </section>

        {/* AI section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
            AI Step Generator
          </h2>
          <div
            className="rounded-lg p-4 flex flex-col gap-3"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
          >
            <div>
              <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--text)' }}>Anthropic API Key</div>
              <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                Used for AI step generation in the editor. Stored locally only, never sent to any server.
              </div>
              <div className="flex items-center gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="flex-1 rounded px-2 py-1.5 text-xs font-mono"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  onKeyDown={e => e.key === 'Enter' && saveApiKey()}
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  className="text-xs px-2 py-1.5 rounded"
                  style={{ background: 'var(--border)', color: 'var(--text-dim)' }}
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? '🙈' : '👁'}
                </button>
                <button
                  onClick={saveApiKey}
                  className="text-xs px-3 py-1.5 rounded font-medium"
                  style={{
                    background: apiKeySaved ? 'rgba(63,185,80,0.15)' : 'var(--accent-dim)',
                    color: apiKeySaved ? 'var(--success)' : 'var(--accent)',
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
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
            Integration
          </h2>

          <div
            className="rounded-lg p-4 flex flex-col gap-3"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
          >
            <IntegrationToggle
              label="Auto-read session context"
              description="Read active lab and target IP from cybertools-config.json (shared_context)."
              defaultOn
            />
            <IntegrationToggle
              label="Write active playbook to shared context"
              description="Write shared_context.activePlaybook when a run starts so other apps know what's running."
              defaultOn
            />
            <IntegrationToggle
              label="Write playbook events to ecosystem-events.json"
              description="Emit playbook:started, step:completed, playbook:completed events for the CyberOS dashboard."
              defaultOn
            />
          </div>
        </section>

        {/* Current session context */}
        {(context.activeLab || context.activeTarget || context.activeIP) && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
              Current Session Context
            </h2>
            <div
              className="rounded-lg p-4 flex flex-col gap-2"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
            >
              {context.activeLab && (
                <ContextRow label="Active Lab" value={context.activeLab} />
              )}
              {context.activeTarget && (
                <ContextRow label="Target Name" value={context.activeTarget} />
              )}
              {context.activeIP && (
                <ContextRow label="Target IP" value={context.activeIP} mono />
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Sourced from ~/cybertools-config.json · updates every 10s
              </p>
            </div>
          </section>
        )}

        {/* Playbook inventory */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
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
  label, description, defaultOn,
}: {
  label: string
  description: string
  defaultOn?: boolean
}) {
  const [on, setOn] = useState(defaultOn ?? true)
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <button
        onClick={() => setOn(v => !v)}
        className="flex-shrink-0 mt-0.5 w-8 h-4 rounded-full transition-colors relative"
        style={{ background: on ? 'var(--accent)' : 'var(--border)' }}
        title={on ? 'Enabled' : 'Disabled'}
      >
        <span
          className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
          style={{
            background: '#fff',
            left: on ? '18px' : '2px',
          }}
        />
      </button>
    </div>
  )
}

function ContextRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-28 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span
        className="text-xs"
        style={{ color: 'var(--text-dim)', fontFamily: mono ? 'var(--font-mono, monospace)' : undefined }}
      >
        {value}
      </span>
    </div>
  )
}
