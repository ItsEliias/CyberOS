// CredVault — OnboardingModal
// Auto-shows on launch unless user dismissed with "Don't show again"

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'onboarding_dismissed_CredVault'
const DOCS_PATH   = 'https://github.com/ItsEliias/CyberOS/blob/main/Manus-Prompts/11_CredVault.md'
const ACCENT      = '#f78166'

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
    // DOCS_PATH is a local .md file. open-external (now scheme-allowlisted to
    // http/https) rejects it, so route through the canonical CredVault GitHub
    // docs page instead. Falls back silently if there's no API at runtime.
    const docsUrl = 'https://github.com/ItsEliias/CyberOS#credvault'
    void window.electronAPI.openExternal(docsUrl)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-[520px] rounded-xl border overflow-hidden"
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
              <circle cx="7.5" cy="15.5" r="4.5" />
              <path d="M21 2l-9.6 9.6" />
              <path d="M15.5 7.5l3 3" />
              <path d="M14 9l3 3" />
            </svg>
            <h2 className="text-base font-semibold text-text-primary">Welcome to CredVault</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Section 1 */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              What is CredVault?
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              CredVault is an AES-256 encrypted credential vault for your cybersecurity toolkit.
              Store passwords, API keys, and secrets locally — protected by a master password
              that never leaves your machine.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              How to use it
            </h3>
            <ul className="text-sm text-text-secondary leading-relaxed space-y-1.5 list-none">
              <li className="flex items-start gap-2">
                <span style={{ color: ACCENT }} className="mt-0.5 shrink-0">▸</span>
                Set a strong master password on first launch to encrypt your vault.
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: ACCENT }} className="mt-0.5 shrink-0">▸</span>
                Use the <strong className="text-text-primary">Add</strong> button to create credentials with title, username, password, and tags.
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: ACCENT }} className="mt-0.5 shrink-0">▸</span>
                Click any credential to copy fields securely to your clipboard (auto-clears after 30s).
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: ACCENT }} className="mt-0.5 shrink-0">▸</span>
                Use <strong className="text-text-primary">Import</strong> to pull pending credentials discovered by ReconDesk.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              Ecosystem connections
            </h3>
            <ul className="text-sm text-text-secondary leading-relaxed space-y-1.5 list-none">
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(247,129,102,0.12)', color: ACCENT, border: '1px solid rgba(247,129,102,0.2)' }}>
                  ReconDesk
                </span>
                Discovered credentials are automatically queued for import here.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(247,129,102,0.12)', color: ACCENT, border: '1px solid rgba(247,129,102,0.2)' }}>
                  NetworkMap
                </span>
                Look up stored credentials by IP/hostname directly from the topology view.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(247,129,102,0.12)', color: ACCENT, border: '1px solid rgba(247,129,102,0.2)' }}>
                  PlaybookStudio
                </span>
                Inject stored credentials into playbook steps automatically.
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
            <span className="text-xs text-text-muted">Don't show again</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMoreInfo}
              className="h-8 px-4 rounded text-xs font-medium border transition-colors"
              style={{
                borderColor: 'rgba(255,255,255,0.1)',
                color: '#8b949e',
                background: 'transparent',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = ACCENT; (e.target as HTMLElement).style.color = ACCENT }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.target as HTMLElement).style.color = '#8b949e' }}
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
