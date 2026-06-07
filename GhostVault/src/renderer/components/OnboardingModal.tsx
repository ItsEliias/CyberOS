// GhostVault — OnboardingModal
// Auto-shows on launch unless user dismissed with "Don't show again"

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'onboarding_dismissed_GhostVault'
const DOCS_PATH   = 'https://github.com/ItsEliias/CyberOS#the-apps'
const ACCENT      = '#7bb8ff'

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
    window.ghostvault.openExternal(DOCS_PATH)
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
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" style={{ color: ACCENT }}>
              <path d="M8 2C5.8 2 4 3.8 4 6c0 2 1.2 3.4 2.4 4.4L8 14l1.6-3.6C10.8 9.4 12 8 12 6c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="8" cy="6" r="1.5" fill="currentColor" />
            </svg>
            <h2 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>Welcome to GhostVault</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              What is GhostVault?
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#8b949e' }}>
              GhostVault is a secure offline note vault with an integrated AI assistant.
              Organize findings, research, and sensitive notes in folders with tags and
              templates — fully local with optional Ollama AI support.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              How to use it
            </h3>
            <ul className="text-sm leading-relaxed space-y-1.5" style={{ color: '#8b949e' }}>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Set up your vault path in Settings — notes are stored as plain markdown files.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Create notes from <strong style={{ color: '#e2e8f0' }}>Templates</strong> for consistent pentest writeup structure.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                Use <strong style={{ color: '#e2e8f0' }}>Quick Capture</strong> (tray icon) to instantly save clipboard content as a note.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0" style={{ color: ACCENT }}>▸</span>
                The AI panel can summarise, rewrite, or expand note content using your local Ollama model.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              Ecosystem connections
            </h3>
            <ul className="text-sm leading-relaxed space-y-1.5" style={{ color: '#8b949e' }}>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(123,184,255,0.12)', color: ACCENT, border: '1px solid rgba(123,184,255,0.2)' }}>
                  ReportForge
                </span>
                Export notes directly as sections in a professional security report.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(123,184,255,0.12)', color: ACCENT, border: '1px solid rgba(123,184,255,0.2)' }}>
                  PlaybookStudio
                </span>
                Reference GhostVault notes as context within playbook steps.
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
