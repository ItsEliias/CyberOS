// ReportForge — Title Bar
// Frameless macOS title bar with traffic-light spacer, app icon, report title, and actions

import { useState } from 'react'
import { useStore } from '../../store'

interface Props {
  onNew?: () => void
  onExportMd?: () => Promise<void>
  onExportPdf?: () => Promise<void>
  onSave?: () => Promise<void>
  onHelp?: () => void
  exporting?: boolean
}

export default function TitleBar({ onNew, onExportMd, onExportPdf, onSave, onHelp, exporting }: Props) {
  const { view, activeReport, dirty } = useStore()
  const [showExport, setShowExport] = useState(false)

  return (
    <div
      className="h-10 border-b border-border-subtle/50 flex items-center px-4 drag-region shrink-0"
      style={{ background: 'rgba(10, 10, 15, 0.95)' }}
    >
      {/* Traffic-light spacer */}
      <div className="w-[70px] no-drag" />

      {/* Icon + name */}
      <div className="flex items-center gap-2 no-drag">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="text-accent">
          <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1.2" />
          <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" />
          <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="12.5" cy="12.5" r="2.5" fill="currentColor" />
          <path d="M11.5 12.5L12.2 13.2L13.5 11.8" stroke="#0a0a0f" strokeWidth="0.9" strokeLinecap="round" />
        </svg>
        <span className="text-sm text-text-secondary font-medium">
          {view === 'editor' && activeReport
            ? activeReport.title
            : 'ReportForge'}
        </span>
        {view === 'editor' && dirty && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent/70" title="Unsaved changes" />
        )}
      </div>

      <div className="flex-1" />

      {/* CYBERTOOLS badge */}
      <span
        className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full no-drag mr-2"
        style={{ background: 'rgba(74,158,255,0.08)', color: '#4a5568', border: '1px solid rgba(74,158,255,0.12)' }}
      >
        <span>⬡</span>
        <span>CYBERTOOLS</span>
      </span>

      {/* Actions (no-drag zone) */}
      <div className="flex items-center gap-2 no-drag">
        {view === 'library' && onNew && (
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-semibold bg-accent text-black hover:bg-accent/90 transition-colors"
          >
            <span className="text-sm leading-none">+</span>
            New Report
          </button>
        )}

        {view === 'editor' && activeReport && (
          <>
            {onSave && (
              <button
                onClick={onSave}
                disabled={!dirty}
                className={`h-7 px-3 rounded text-xs font-medium border transition-colors ${
                  dirty
                    ? 'border-accent/50 text-accent hover:bg-accent/10'
                    : 'border-border-default/50 text-text-muted cursor-default'
                }`}
              >
                {dirty ? 'Save' : 'Saved'}
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowExport(v => !v)}
                disabled={exporting}
                className="flex items-center gap-1 h-7 px-3 rounded text-xs font-semibold bg-accent text-black hover:bg-accent/90 disabled:opacity-40 transition-colors"
              >
                {exporting ? 'Exporting…' : 'Export'}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M5 7L1 3h8L5 7z" />
                </svg>
              </button>

              {showExport && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowExport(false)}
                  />
                  <div className="glass-card absolute top-full right-0 mt-1 z-50 py-1 min-w-[160px] shadow-glow">
                    <ExportItem onClick={() => { setShowExport(false); onExportMd?.() }}>
                      Export Markdown
                    </ExportItem>
                    <ExportItem onClick={() => { setShowExport(false); onExportPdf?.() }}>
                      Export PDF
                    </ExportItem>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Help button */}
        {onHelp && (
          <button
            onClick={onHelp}
            className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold border border-border-default/50 text-text-muted hover:border-accent/40 hover:text-accent transition-colors"
            title="Help & onboarding"
          >
            ?
          </button>
        )}
      </div>
    </div>
  )
}

function ExportItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-bg-interactive transition-colors"
    >
      {children}
    </button>
  )
}
