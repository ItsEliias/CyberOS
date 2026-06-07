// NetworkMap — OnboardingModal
// Auto-shows on launch unless user dismissed with "Don't show again"

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'onboarding_dismissed_NetworkMap'
const DOCS_PATH   = 'https://github.com/ItsEliias/CyberOS#the-apps'
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
    window.electronAPI.openExternal(DOCS_PATH)
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
              <circle cx="12" cy="12" r="3" />
              <circle cx="4" cy="6" r="2" />
              <circle cx="20" cy="6" r="2" />
              <circle cx="4" cy="18" r="2" />
              <circle cx="20" cy="18" r="2" />
              <path d="M6 6l4.5 4.5M13.5 13.5L18 18M18 6l-4.5 4.5M10.5 13.5L6 18" />
            </svg>
            <h2 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>Welcome to NetworkMap</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              What is NetworkMap?
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#8b949e' }}>
              NetworkMap visualises network topology as an interactive D3 force graph built from nmap
              XML scan results. Explore hosts, ports, and services at a glance with zoomable node
              detail panels and saved graph history.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              How to use it
            </h3>
            <ul className="text-sm leading-relaxed space-y-1.5" style={{ color: '#8b949e' }}>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Click <strong style={{ color: '#e2e8f0' }}>Import</strong> to load an nmap XML file or paste XML directly.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Drag nodes to rearrange the graph; click a node to see full port and service details.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Use <strong style={{ color: '#e2e8f0' }}>Import from ReconDesk</strong> to pull the active target's scan data automatically.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Saved graphs appear in the Library — click any entry to reopen it.
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
                  ReconDesk
                </span>
                Scan results from ReconDesk feed directly into NetworkMap as nodes.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(210,153,34,0.12)', color: ACCENT, border: '1px solid rgba(210,153,34,0.2)' }}>
                  CredVault
                </span>
                Look up stored credentials by IP or hostname from the node detail panel.
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
