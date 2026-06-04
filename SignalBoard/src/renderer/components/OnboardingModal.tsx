// SignalBoard — OnboardingModal
// Auto-shows on launch unless user dismissed with "Don't show again"

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'onboarding_dismissed_SignalBoard'
const DOCS_PATH   = '/Users/codyliddell/Documents/Claude/Projects/CyberOS/Manus-Prompts/06_SignalBoard.md'
const ACCENT      = '#ff6b6b'

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
    window.electronAPI.openUrl(DOCS_PATH)
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
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.49 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.4 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.4a16 16 0 0 0 5.69 5.69l1.06-1.06a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.06 15z" />
            </svg>
            <h2 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>Welcome to SignalBoard</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              What is SignalBoard?
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#8b949e' }}>
              SignalBoard is an OSINT and threat intelligence feed aggregator. It monitors
              Hacker News Security, the NVD CVE feed, and other configurable sources — surfacing
              high-relevance signals and trending topics in real time.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              How to use it
            </h3>
            <ul className="text-sm leading-relaxed space-y-1.5" style={{ color: '#8b949e' }}>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                The <strong style={{ color: '#e2e8f0' }}>Feed</strong> view shows all items ranked by relevance score — click any item to read it.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Use <strong style={{ color: '#e2e8f0' }}>Sources</strong> to add, remove, or configure feed URLs and refresh intervals.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                The <strong style={{ color: '#e2e8f0' }}>Trends</strong> panel aggregates topic frequency over time to surface emerging threats.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Set notification thresholds in Settings — alerts appear for items above your chosen relevance score.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              Ecosystem connections
            </h3>
            <ul className="text-sm leading-relaxed space-y-1.5" style={{ color: '#8b949e' }}>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(255,107,107,0.12)', color: ACCENT, border: '1px solid rgba(255,107,107,0.2)' }}>
                  ReconDesk
                </span>
                CVEs matching your active targets are flagged directly in ReconDesk.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(255,107,107,0.12)', color: ACCENT, border: '1px solid rgba(255,107,107,0.2)' }}>
                  VaultCore
                </span>
                Monitored sources and their configs are versioned and tracked in VaultCore.
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
