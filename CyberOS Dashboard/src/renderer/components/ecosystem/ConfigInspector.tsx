// CyberOS Dashboard — Config Inspector
// Shows config file health, path, and validity

import { useDashboardStore } from '../../stores/useDashboardStore'

export default function ConfigInspector() {
  const config = useDashboardStore((s) => s.config)
  const error = useDashboardStore((s) => s.error)

  const configPath = '~/cybertools-config.json'
  const isValid = !error && Object.keys(config).length > 0

  const handleCopyPath = () => {
    navigator.clipboard.writeText(configPath)
  }

  const handleOpenInEditor = () => {
    window.electronAPI.openUrl(`file://${configPath.replace('~', '')}`)
  }

  return (
    <div className="glass-card p-4">
      <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest mb-3">
        Config File Health
      </p>

      <div className="space-y-3">
        {/* Path */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Path</span>
          <div className="flex items-center gap-2">
            <code className="text-xs text-text-primary font-mono bg-bg-interactive px-2 py-0.5 rounded">
              {configPath}
            </code>
            <button
              onClick={handleCopyPath}
              className="text-text-muted hover:text-text-primary transition-colors"
              title="Copy path"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Valid JSON */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Valid JSON</span>
          <span className={`flex items-center gap-1.5 text-xs font-medium ${isValid ? 'text-success' : 'text-danger'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isValid ? 'bg-success' : 'bg-danger'}`} />
            {isValid ? 'Valid' : 'Invalid / Missing'}
          </span>
        </div>

        {/* Key count */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Top-level keys</span>
          <span className="text-xs text-text-primary font-mono">{Object.keys(config).length}</span>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-md p-3 mt-2">
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleOpenInEditor}
            className="text-xs text-accent hover:text-accent-emphasis px-3 py-1.5 rounded bg-accent/10 hover:bg-accent/20 transition-colors"
          >
            Open in editor
          </button>
        </div>
      </div>
    </div>
  )
}
