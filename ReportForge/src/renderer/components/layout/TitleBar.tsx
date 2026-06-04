// ReportForge — Title Bar (redesigned)

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
      className="h-10 flex items-center px-4 drag-region shrink-0 relative"
      style={{
        background: 'rgba(7,8,15,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Blue accent underline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(74,158,255,0.18) 40%, rgba(74,158,255,0.18) 60%, transparent 100%)' }}
      />

      {/* Traffic-light spacer */}
      <div className="w-[70px] no-drag" />

      {/* Brand */}
      <div className="flex items-center gap-2 no-drag">
        <div style={{ filter: 'drop-shadow(0 0 5px rgba(74,158,255,0.45))' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="text-accent">
            <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="12.5" cy="12.5" r="2.5" fill="currentColor" />
            <path d="M11.5 12.5L12.2 13.2L13.5 11.8" stroke="#07080f" strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-[13px] text-text-secondary font-semibold tracking-wide">
          {view === 'editor' && activeReport ? activeReport.title : 'ReportForge'}
        </span>
        {view === 'editor' && dirty && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent-glow)' }}
            title="Unsaved changes"
          />
        )}
      </div>

      <div className="flex-1" />

      {/* CYBERTOOLS badge */}
      <span
        className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full no-drag mr-2"
        style={{ background: 'rgba(74,158,255,0.06)', color: '#484f58', border: '1px solid rgba(74,158,255,0.10)' }}
      >
        <span>⬡</span>
        <span>CYBERTOOLS</span>
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1.5 no-drag">
        {view === 'library' && onNew && (
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 h-7 px-3 rounded-sm text-xs font-semibold transition-all"
            style={{ background: 'rgba(74,158,255,0.15)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.30)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.15)'; }}
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
                className="h-7 px-3 rounded-sm text-xs font-medium transition-all"
                style={dirty
                  ? { color: '#4a9eff', border: '1px solid rgba(74,158,255,0.35)', background: 'transparent' }
                  : { color: '#484f58', border: '1px solid rgba(42,51,71,0.5)', background: 'transparent' }
                }
              >
                {dirty ? 'Save' : 'Saved'}
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowExport(v => !v)}
                disabled={exporting}
                className="flex items-center gap-1 h-7 px-3 rounded-sm text-xs font-semibold disabled:opacity-40 transition-all"
                style={{ background: 'rgba(74,158,255,0.15)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.30)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.25)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.15)'; }}
              >
                {exporting ? 'Exporting…' : 'Export'}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M5 7L1 3h8L5 7z" />
                </svg>
              </button>

              {showExport && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExport(false)} />
                  <div className="glass-card absolute top-full right-0 mt-1 z-50 py-1 min-w-[160px]"
                    style={{ boxShadow: 'var(--elevation-3)' }}>
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

        {onHelp && (
          <button
            onClick={onHelp}
            className="w-7 h-7 flex items-center justify-center rounded-sm text-xs font-bold transition-all"
            style={{ border: '1px solid rgba(42,51,71,0.5)', color: '#484f58' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(74,158,255,0.4)';
              (e.currentTarget as HTMLButtonElement).style.color = '#4a9eff';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(42,51,71,0.5)';
              (e.currentTarget as HTMLButtonElement).style.color = '#484f58';
            }}
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
      className="w-full px-4 py-2 text-left text-xs text-text-secondary hover:text-text-primary transition-colors"
      style={{ background: 'none' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.06)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
    >
      {children}
    </button>
  )
}
