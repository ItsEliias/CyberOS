// ReconDesk — OnboardingModal
// Auto-shows on launch unless user dismissed with "Don't show again"

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'onboarding_dismissed_ReconDesk'
const DOCS_PATH   = '/Users/codyliddell/Documents/Claude/Projects/CyberOS/Manus-Prompts/03_ReconDesk.md'
const ACCENT      = '#d29922'

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
            <span style={{ color: ACCENT, fontSize: 20 }}>⬡</span>
            <h2 className="text-base font-semibold tracking-wide" style={{ color: '#e2e8f0' }}>Welcome to ReconDesk</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              What is ReconDesk?
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#8b949e' }}>
              ReconDesk is your recon target management hub. It provides a Kanban attack board,
              timeline tracking, target notes, port and credential tabs, and one-click export —
              keeping all your reconnaissance data organised in one place.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              How to use it
            </h3>
            <ul className="text-sm leading-relaxed space-y-1.5" style={{ color: '#8b949e' }}>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Add targets via the sidebar — each target gets its own overview, ports, creds, board, and timeline.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Drag cards between Kanban columns to track attack progress (Recon → Exploit → Post-Exploit → Done).
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                The <strong style={{ color: '#e2e8f0' }}>Timeline</strong> tab auto-logs every change with timestamps.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Use <strong style={{ color: '#e2e8f0' }}>Export</strong> to generate a JSON report of findings for a target.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              Ecosystem connections
            </h3>
            <ul className="text-sm leading-relaxed space-y-1.5" style={{ color: '#8b949e' }}>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(210,153,34,0.12)', color: ACCENT, border: '1px solid rgba(210,153,34,0.2)' }}>
                  NetworkMap
                </span>
                Import nmap scan results into NetworkMap for visual topology from this target.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(210,153,34,0.12)', color: ACCENT, border: '1px solid rgba(210,153,34,0.2)' }}>
                  CredVault
                </span>
                Discovered credentials are pushed to CredVault for secure storage.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(210,153,34,0.12)', color: ACCENT, border: '1px solid rgba(210,153,34,0.2)' }}>
                  SignalBoard
                </span>
                CVEs from SignalBoard can be flagged against targets tracked here.
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
