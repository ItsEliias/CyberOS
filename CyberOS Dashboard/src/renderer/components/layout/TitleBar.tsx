// CyberOS Dashboard — Title Bar

import { useDashboardStore } from '../../stores/useDashboardStore'

export default function TitleBar() {
  const showAlerts = useDashboardStore((s) => s.showAlerts)
  const setShowAlerts = useDashboardStore((s) => s.setShowAlerts)
  const alerts = useDashboardStore((s) => s.alerts)
  const dismissedIds = useDashboardStore((s) => s.dismissedAlertIds)

  const visibleAlertCount = alerts.filter((a) => !dismissedIds.has(a.id)).length

  const handleFullscreen = () => {
    window.electronAPI.toggleFullscreen()
  }

  return (
    <div
      className="h-10 flex items-center px-4 drag-region shrink-0 relative"
      style={{
        background: 'rgba(7, 8, 15, 0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Accent underline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(74,158,255,0.18) 40%, rgba(74,158,255,0.18) 60%, transparent 100%)' }}
      />

      {/* Traffic light spacer */}
      <div className="w-[70px] no-drag" />

      {/* Brand */}
      <div className="flex items-center gap-2 no-drag">
        <div style={{ filter: 'drop-shadow(0 0 5px rgba(74,158,255,0.45))' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent">
            <path d="M8 1L14.5 4.75V11.25L8 15L1.5 11.25V4.75L8 1Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
        </div>
        <span className="text-[13px] text-text-secondary font-semibold tracking-wide">CyberOS</span>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{
            background: 'rgba(74,158,255,0.08)',
            border: '1px solid rgba(74,158,255,0.18)',
            color: '#4a9eff',
          }}
        >
          Dashboard
        </span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1 no-drag">
        {/* Alert bell */}
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-bg-interactive transition-colors"
          title="Alerts"
        >
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: visibleAlertCount > 0 ? 'var(--sev-medium)' : 'var(--text-muted)' }}
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {visibleAlertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-[15px] h-[15px] bg-danger rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none">
              {visibleAlertCount}
            </span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => useDashboardStore.getState().setActiveView('settings')}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-bg-interactive transition-colors"
          title="Settings"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Fullscreen */}
        <button
          onClick={handleFullscreen}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-bg-interactive transition-colors"
          title="Toggle Fullscreen"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>
    </div>
  )
}
