// CyberOS Dashboard — Config Inspector

import { useDashboardStore } from '../../stores/useDashboardStore'

export default function ConfigInspector() {
  const config = useDashboardStore((s) => s.config)
  const error = useDashboardStore((s) => s.error)

  const configPath = '~/cybertools-config.json'
  const isValid = !error && Object.keys(config).length > 0

  const handleCopyPath = () => { navigator.clipboard.writeText(configPath) }
  const handleOpenInEditor = () => { window.electronAPI.openUrl(`file://${configPath.replace('~', '')}`) }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--elevation-1)',
      }}
    >
      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest block mb-4">
        Config File Health
      </span>

      <div className="space-y-3">
        {/* Path */}
        <Row label="Path">
          <div className="flex items-center gap-1.5">
            <code
              className="text-[11px] font-mono text-text-primary px-2 py-0.5 rounded"
              style={{ background: 'rgba(42,51,71,0.4)' }}
            >
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
        </Row>

        {/* Validity */}
        <Row label="Valid JSON">
          <div
            className="flex items-center gap-1.5 text-[11px] font-semibold"
            style={{ color: isValid ? 'var(--state-online)' : 'var(--sev-critical)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: isValid ? 'var(--state-online)' : 'var(--sev-critical)' }}
            />
            {isValid ? 'Valid' : 'Invalid / Missing'}
          </div>
        </Row>

        {/* Key count */}
        <Row label="Top-level keys">
          <span className="text-[11px] text-text-primary font-mono">{Object.keys(config).length}</span>
        </Row>

        {/* Error */}
        {error && (
          <div
            className="rounded-lg p-3 mt-1"
            style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)' }}
          >
            <p className="text-[11px] text-danger">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2">
          <button
            onClick={handleOpenInEditor}
            className="text-[11px] font-medium px-3 py-1.5 rounded transition-colors"
            style={{
              color: 'var(--accent)',
              background: 'rgba(74,158,255,0.1)',
              border: '1px solid rgba(74,158,255,0.2)',
            }}
          >
            Open in editor
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] text-text-secondary shrink-0">{label}</span>
      {children}
    </div>
  )
}
