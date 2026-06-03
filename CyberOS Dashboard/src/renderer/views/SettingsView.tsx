// CyberOS Dashboard — Settings View
// General, Notifications, Display, Config Paths

import { useDashboardStore } from '../stores/useDashboardStore'

export default function SettingsView() {
  const settings = useDashboardStore((s) => s.settings)
  const updateSettings = useDashboardStore((s) => s.updateSettings)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-text-primary">Settings</h1>

      {/* General */}
      <section className="bg-bg-elevated/75 backdrop-blur-sm border border-border-default/60 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">General</h2>
        <div className="space-y-4">
          {/* Operator name */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-primary font-medium">Operator Name</p>
              <p className="text-[10px] text-text-muted">Displayed in the profile card</p>
            </div>
            <input
              type="text"
              value={settings.operatorName}
              onChange={(e) => updateSettings({ operatorName: e.target.value })}
              className="bg-bg-interactive border border-border-default rounded-md px-3 py-1.5 text-xs text-text-primary w-[180px] focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
          </div>

          {/* Refresh interval */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-primary font-medium">Refresh Interval</p>
              <p className="text-[10px] text-text-muted">How often to poll config file</p>
            </div>
            <select
              value={settings.refreshInterval}
              onChange={(e) => updateSettings({ refreshInterval: Number(e.target.value) as any })}
              className="bg-bg-interactive border border-border-default rounded-md px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/50"
            >
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
            </select>
          </div>

          {/* Default view */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-primary font-medium">Default View</p>
              <p className="text-[10px] text-text-muted">Screen shown on app open</p>
            </div>
            <select
              value={settings.defaultView}
              onChange={(e) => updateSettings({ defaultView: e.target.value as any })}
              className="bg-bg-interactive border border-border-default rounded-md px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/50"
            >
              <option value="dashboard">Main Dashboard</option>
              <option value="profile">Operator Profile</option>
              <option value="ecosystem">Ecosystem Status</option>
            </select>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-bg-elevated/75 backdrop-blur-sm border border-border-default/60 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Notifications</h2>
        <div className="space-y-4">
          <ToggleRow
            label="macOS Notifications"
            description="Show system notifications for ecosystem events"
            checked={settings.notifications}
            onChange={(v) => updateSettings({ notifications: v })}
          />
          <ToggleRow
            label="Alert Sound"
            description="Play sound on threshold breach"
            checked={settings.alertSound}
            onChange={(v) => updateSettings({ alertSound: v })}
          />
        </div>
      </section>

      {/* Display */}
      <section className="bg-bg-elevated/75 backdrop-blur-sm border border-border-default/60 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Display</h2>
        <div className="space-y-4">
          <ToggleRow
            label="Full-screen Mode"
            description="Launch in full-screen by default"
            checked={settings.fullscreen}
            onChange={(v) => updateSettings({ fullscreen: v })}
          />

          {/* Feed max items */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-primary font-medium">Activity Feed Items</p>
              <p className="text-[10px] text-text-muted">Maximum events shown in feed</p>
            </div>
            <select
              value={settings.feedMaxItems}
              onChange={(e) => updateSettings({ feedMaxItems: Number(e.target.value) as any })}
              className="bg-bg-interactive border border-border-default rounded-md px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/50"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </section>

      {/* Config Paths */}
      <section className="bg-bg-elevated/75 backdrop-blur-sm border border-border-default/60 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Config Paths</h2>
        <div className="space-y-3">
          <PathRow
            label="Config File"
            path="~/cybertools-config.json"
          />
          <PathRow
            label="Event Bus"
            path="~/Library/Application Support/CyberTools/ecosystem-events.json"
          />
        </div>
      </section>
    </div>
  )
}

// ─── Toggle Row ──────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-text-primary font-medium">{label}</p>
        <p className="text-[10px] text-text-muted">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-bg-interactive border border-border-default'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

// ─── Path Row ────────────────────────────────────────────────────────────────

function PathRow({ label, path }: { label: string; path: string }) {
  const handleReveal = () => {
    window.electronAPI.openUrl(`file://${path.replace('~', '')}`)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(path)
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-text-primary font-medium">{label}</p>
        <code className="text-[10px] text-text-muted font-mono">{path}</code>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="text-[10px] text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-bg-interactive transition-colors"
        >
          Copy
        </button>
        <button
          onClick={handleReveal}
          className="text-[10px] text-accent hover:text-accent-emphasis px-2 py-1 rounded hover:bg-accent/10 transition-colors"
        >
          Reveal
        </button>
      </div>
    </div>
  )
}
