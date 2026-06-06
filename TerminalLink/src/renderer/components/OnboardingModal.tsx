// TerminalLink — OnboardingModal
// Auto-shows on launch unless user dismissed with "Don't show again"

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'onboarding_dismissed_TerminalLink'
const DOCS_PATH   = 'https://github.com/ItsEliias/CyberOS/blob/main/Manus-Prompts/10_TerminalLink.md'
const ACCENT      = '#00ff41'

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
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: 520,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          borderRadius: 12,
          overflow: 'hidden',
          fontFamily: 'inherit',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Welcome to TerminalLink</h2>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section>
            <h3 style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT, marginBottom: 8, margin: '0 0 8px' }}>
              What is TerminalLink?
            </h3>
            <p style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6, margin: 0 }}>
              TerminalLink is a multi-session PTY terminal with persistent session history and
              replay. Run commands, capture output, and replay sessions with full fidelity —
              purpose-built for pentest workflows.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 8px' }}>
              How to use it
            </h3>
            <ul style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6, margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: ACCENT, flexShrink: 0, marginTop: 2 }}>▸</span>
                Sessions are created automatically — use the <strong style={{ color: '#e2e8f0' }}>Sessions</strong> view to name and switch between them.
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: ACCENT, flexShrink: 0, marginTop: 2 }}>▸</span>
                Enable <strong style={{ color: '#e2e8f0' }}>Split</strong> mode to run two terminal panes side by side.
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: ACCENT, flexShrink: 0, marginTop: 2 }}>▸</span>
                Open <strong style={{ color: '#e2e8f0' }}>History</strong> to see every command run in the session and replay sequences.
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: ACCENT, flexShrink: 0, marginTop: 2 }}>▸</span>
                Use the capture overlay to screenshot terminal output and annotate it.
              </li>
            </ul>
          </section>

          <section>
            <h3 style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 8px' }}>
              Ecosystem connections
            </h3>
            <ul style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6, margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', flexShrink: 0, background: `rgba(0,255,65,0.1)`, color: ACCENT, border: `1px solid rgba(0,255,65,0.2)` }}>
                  PlaybookStudio
                </span>
                Commands from playbook steps are pasted directly into TerminalLink.
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', flexShrink: 0, background: `rgba(0,255,65,0.1)`, color: ACCENT, border: `1px solid rgba(0,255,65,0.2)` }}>
                  Cyberlab
                </span>
                Active terminal sessions are shared with Cyberlab Companion for lab tracking.
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={dontShow}
              onChange={e => setDontShow(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: ACCENT }}
            />
            <span style={{ fontSize: 11, color: '#4a5568' }}>Don't show again</span>
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleMoreInfo}
              style={{ height: 32, padding: '0 16px', borderRadius: 4, fontSize: 11, fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)', color: '#8b949e', background: 'transparent', cursor: 'pointer' }}
              onMouseEnter={e => { const el = e.target as HTMLButtonElement; el.style.borderColor = ACCENT; el.style.color = ACCENT }}
              onMouseLeave={e => { const el = e.target as HTMLButtonElement; el.style.borderColor = 'rgba(255,255,255,0.1)'; el.style.color = '#8b949e' }}
            >
              More Info
            </button>
            <button
              onClick={handleClose}
              style={{ height: 32, padding: '0 16px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: ACCENT, color: '#000', border: 'none', cursor: 'pointer', opacity: 1 }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.opacity = '0.8' }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.opacity = '1' }}
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
