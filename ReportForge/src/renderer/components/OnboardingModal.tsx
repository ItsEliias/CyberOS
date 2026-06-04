// ReportForge — OnboardingModal
// Auto-shows on launch unless user dismissed with "Don't show again"

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'onboarding_dismissed_ReportForge'
const DOCS_PATH   = '/Users/codyliddell/Documents/Claude/Projects/CyberOS/Manus-Prompts/09_ReportForge.md'
const ACCENT      = '#3fb950'

interface Props {
  onClose: () => void
}

export default function OnboardingModal({ onClose }: Props) {
  const [dontShow, setDontShow] = useState(false)

  function handleClose() {
    if (dontShow) localStorage.setItem(STORAGE_KEY, 'true')
    onClose()
  }

  function handleMoreInfo() {
    window.reportforge.openExternal(DOCS_PATH)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-[520px] rounded-xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <h2 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>Welcome to ReportForge</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              What is ReportForge?
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#8b949e' }}>
              ReportForge is a professional security report generator with a markdown editor,
              structured findings management, severity classification, and one-click PDF export.
              Transform raw pentest data into polished, client-ready reports.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              How to use it
            </h3>
            <ul className="text-sm leading-relaxed space-y-1.5" style={{ color: '#8b949e' }}>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Click <strong style={{ color: '#e2e8f0' }}>New Report</strong> and follow the wizard to set client, scope, and date.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Add findings with title, severity, description, proof-of-concept, and remediation.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Use the markdown editor for executive summary and scope sections.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Export to PDF via the <strong style={{ color: '#e2e8f0' }}>Export</strong> button — print-ready layout is generated automatically.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              Ecosystem connections
            </h3>
            <ul className="text-sm leading-relaxed space-y-1.5" style={{ color: '#8b949e' }}>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(63,185,80,0.12)', color: ACCENT, border: '1px solid rgba(63,185,80,0.2)' }}>
                  GhostVault
                </span>
                Import notes from GhostVault directly as report sections or finding evidence.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(63,185,80,0.12)', color: ACCENT, border: '1px solid rgba(63,185,80,0.2)' }}>
                  ReconDesk
                </span>
                Import target findings and timeline data from ReconDesk into the report.
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={e => setDontShow(e.target.checked)}
              className="w-3.5 h-3.5 rounded"
              style={{ accentColor: ACCENT }}
            />
            <span className="text-xs" style={{ color: '#4a5568' }}>Don't show again</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMoreInfo}
              className="h-8 px-4 rounded text-xs font-medium border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#8b949e', background: 'transparent' }}
              onMouseEnter={e => { const el = e.target as HTMLElement; el.style.borderColor = ACCENT; el.style.color = ACCENT }}
              onMouseLeave={e => { const el = e.target as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.1)'; el.style.color = '#8b949e' }}
            >
              More Info
            </button>
            <button
              onClick={handleClose}
              className="h-8 px-4 rounded text-xs font-medium text-white transition-opacity hover:opacity-80"
              style={{ background: ACCENT }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function useOnboarding() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true'
    if (!dismissed) setShow(true)
  }, [])

  return { show, open: () => setShow(true), close: () => setShow(false) }
}
