import { useState } from 'react'
import { useRecondeskStore } from '../../stores/useRecondeskStore'
import HelpTip from '../ui/HelpTip'
import type { Platform } from '../../types/recondesk'

const PLATFORMS: Platform[] = ['HTB', 'THM', 'CTF', 'Client', 'Internal']

export default function SettingsPanel() {
  const settings        = useRecondeskStore(s => s.settings)
  const updateSettings  = useRecondeskStore(s => s.updateSettings)
  const setSettingsOpen = useRecondeskStore(s => s.setSettingsOpen)
  const [newWordlist, setNewWordlist] = useState('')

  function addWordlist() {
    const w = newWordlist.trim()
    if (!w || settings.globalWordlists.includes(w)) return
    updateSettings({ globalWordlists: [...settings.globalWordlists, w] })
    setNewWordlist('')
  }

  function removeWordlist(w: string) {
    updateSettings({ globalWordlists: settings.globalWordlists.filter(x => x !== w) })
  }

  const inputCls  = "bg-[#0a0a0f] border border-[#2a3347] rounded px-2.5 py-1.5 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#d29922] transition-colors"

  function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-[#2a3347]/50 last:border-none">
        <div>
          <p className="text-xs font-medium text-[#e2e8f0]">{label}</p>
          {description && <p className="text-[10px] text-[#4a5568] mt-0.5">{description}</p>}
        </div>
        <div className="ml-4 flex-shrink-0">{children}</div>
      </div>
    )
  }

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          value ? 'bg-[#d29922]' : 'bg-[#2a3347]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[#e2e8f0]">
              Settings
              <HelpTip
                title="Settings"
                body="ReconDesk preferences: default platform for new targets, ecosystem context sharing, AI keys, wordlist defaults. Changes save instantly to local storage."
              />
            </h2>
            <p className="text-[10px] text-[#4a5568] mt-0.5">ReconDesk preferences</p>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-[10px] px-2.5 py-1.5 rounded border border-[#2a3347] text-[#4a5568] hover:text-[#8b949e] hover:border-[#d29922]/30 transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* General */}
        <section className="mb-6">
          <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-3">General</p>
          <div className="bg-[#12131a] border border-[#2a3347] rounded-lg px-4">
            <Row
              label="Default Platform"
              description="Platform pre-selected when creating a new target"
            >
              <select
                value={settings.defaultPlatform}
                onChange={e => updateSettings({ defaultPlatform: e.target.value as Platform })}
                className={inputCls}
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Row>

            <Row
              label="Auto-write Shared Context"
              description="Write shared_context.activeTarget and activeIP when selecting a target"
            >
              <Toggle
                value={settings.autoWriteSharedContext}
                onChange={v => updateSettings({ autoWriteSharedContext: v })}
              />
            </Row>

            <Row
              label="Auto-create Timeline Entries"
              description="Log port adds, card moves, and status changes to the timeline"
            >
              <Toggle
                value={settings.autoTimeline}
                onChange={v => updateSettings({ autoTimeline: v })}
              />
            </Row>
          </div>
        </section>

        {/* Ecosystem */}
        <section className="mb-6">
          <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-3">Ecosystem</p>
          <div className="bg-[#12131a] border border-[#2a3347] rounded-lg px-4">
            <Row
              label="Show Active Lab in Header"
              description="Display the active target name and IP in the title bar"
            >
              <Toggle
                value={settings.showLabContextInHeader}
                onChange={v => updateSettings({ showLabContextInHeader: v })}
              />
            </Row>

            <Row
              label="Config Path"
              description="Shared ecosystem configuration file location"
            >
              <span className="text-[10px] font-mono text-[#4a5568]">~/cybertools-config.json</span>
            </Row>

            <Row
              label="Events Log"
              description="Ecosystem-wide event bus"
            >
              <span className="text-[10px] font-mono text-[#4a5568]">~/ecosystem-events.json</span>
            </Row>
          </div>
        </section>

        {/* AI Integration */}
        <section className="mb-6">
          <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-3">AI Integration</p>
          <div className="bg-[#12131a] border border-[#2a3347] rounded-lg px-4">
            <Row label="Anthropic API Key" description="Used for AI next-step suggestions (Feature 18)">
              <input
                type="password"
                value={settings.anthropicApiKey}
                onChange={e => updateSettings({ anthropicApiKey: e.target.value })}
                placeholder="sk-ant-..."
                className={`${inputCls} w-48 font-mono`}
              />
            </Row>
            <Row label="AI Model" description="Claude model for suggestions">
              <span className="text-[10px] font-mono text-[#4a5568]">claude-haiku-4-5-20251001</span>
            </Row>
          </div>
        </section>

        {/* Wordlists */}
        <section className="mb-6">
          <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-3">Wordlists</p>
          <div className="bg-[#12131a] border border-[#2a3347] rounded-lg p-4">
            <div className="flex flex-col gap-1.5 mb-3">
              {settings.globalWordlists.map(w => (
                <div key={w} className="flex items-center gap-2 group">
                  <span className="flex-1 text-[10px] font-mono text-[#8b949e] truncate">{w}</span>
                  <button
                    onClick={() => removeWordlist(w)}
                    className="opacity-0 group-hover:opacity-100 text-[#4a5568] hover:text-[#f85149] text-[10px] transition-all"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={newWordlist}
                onChange={e => setNewWordlist(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addWordlist() }}
                placeholder="/path/to/wordlist.txt"
                className={`${inputCls} flex-1 font-mono`}
              />
              <button
                onClick={addWordlist}
                className="px-2.5 py-1.5 text-xs bg-[#d29922]/10 border border-[#d29922]/20 text-[#d29922] rounded hover:bg-[#d29922]/20 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-3">About</p>
          <div className="bg-[#12131a] border border-[#2a3347] rounded-lg px-4">
            <Row label="App" >
              <span className="text-xs font-semibold text-[#d29922]">ReconDesk</span>
            </Row>
            <Row label="Part of" >
              <span className="text-xs text-[#8b949e]">CyberOS Ecosystem</span>
            </Row>
            <Row label="Author" >
              <span className="text-[10px] text-[#4a5568]">ItsEliias</span>
            </Row>
          </div>
        </section>
      </div>
    </div>
  )
}
