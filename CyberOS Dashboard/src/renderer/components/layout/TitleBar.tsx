// CyberOS Dashboard — Title Bar Component
// Custom frameless title bar with traffic lights, app name, and actions

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
    <div className="h-10 border-b border-border-subtle/50 flex items-center px-4 drag-region shrink-0" style={{ background: 'rgba(10, 10, 15, 0.9)' }}>
      {/* Traffic light spacer (macOS) */}
      <div className="w-[70px] no-drag" />

      {/* App icon + name */}
      <div className="flex items-center gap-2 no-drag">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent">
          <path
            d="M8 1L14.5 4.75V11.25L8 15L1.5 11.25V4.75L8 1Z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="8" cy="8" r="2" fill="currentColor" />
        </svg>
        <span className="text-sm text-text-secondary font-medium">CyberOS Dashboard</span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2 no-drag">
        {/* Alert bell */}
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-bg-interactive transition-colors"
          title="Alerts"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {visibleAlertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger rounded-full text-[9px] font-bold text-white flex items-center justify-center">
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Fullscreen */}
        <button
          onClick={handleFullscreen}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-bg-interactive transition-colors"
          title="Toggle Fullscreen"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
