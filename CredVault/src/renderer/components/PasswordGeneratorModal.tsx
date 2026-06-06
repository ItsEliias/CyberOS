// CredVault — Password Generator Modal
// Standalone generator: length slider, char-class toggles, live preview,
// copy-to-clipboard, and "Use in new credential" handoff.

import { useEffect, useMemo, useState } from 'react'
import { generatePassword, type GenOptions } from '../utils/passwordGenerator'
import { scorePassword } from '../utils/passwordStrength'
import HelpTip from './ui/HelpTip'

interface Props {
  onClose:   () => void
  onUse?:    (pw: string) => void  // hand off to Add-credential flow
}

const DEFAULTS: GenOptions = {
  length: 20,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  noAmbiguous: true,
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
        background: checked ? 'rgba(247,129,102,0.08)' : 'rgba(13,14,24,0.55)',
        border: `1px solid ${checked ? 'rgba(247,129,102,0.35)' : 'rgba(42,51,71,0.45)'}`,
        borderRadius: 8, cursor: 'pointer', color: checked ? '#e6edf3' : '#8b949e',
        fontSize: 12, fontWeight: 500, textAlign: 'left', minWidth: 0, flex: 1,
        transition: 'border-color 0.15s, background 0.15s, color 0.15s',
      }}
    >
      <span style={{
        width: 14, height: 14, borderRadius: 4, flexShrink: 0,
        background: checked ? '#f78166' : 'transparent',
        border: `1px solid ${checked ? '#f78166' : 'rgba(139,148,158,0.4)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

export default function PasswordGeneratorModal({ onClose, onUse }: Props) {
  const [opts, setOpts] = useState<GenOptions>(DEFAULTS)
  const [pw, setPw]     = useState('')
  const [copied, setCopied] = useState(false)

  function regen(o: GenOptions = opts) {
    setPw(generatePassword(o))
    setCopied(false)
  }

  useEffect(() => { regen(DEFAULTS) /* initial */ }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Live regenerate when options change
  useEffect(() => { regen(opts) }, [opts]) // eslint-disable-line react-hooks/exhaustive-deps

  const strength = useMemo(() => scorePassword(pw), [pw])

  async function copyPw() {
    if (!pw) return
    try {
      await navigator.clipboard.writeText(pw)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  const noClassesSelected = !opts.upper && !opts.lower && !opts.digits && !opts.symbols

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(5,6,12,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 460, maxWidth: 'calc(100vw - 40px)',
          background: 'rgba(13,14,24,0.98)',
          border: '1px solid rgba(42,51,71,0.6)',
          borderRadius: 14,
          padding: 22,
          display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(247,129,102,0.12)', color: '#f78166',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#e6edf3', fontWeight: 700 }}>
              Password Generator
              <HelpTip
                title="Password generator"
                body="Generates a cryptographically random password from the selected character classes. Adjust length and toggles, then copy it or hand it off straight to a new credential."
              />
            </span>
            <span style={{ fontSize: 11, color: '#8b949e' }}>Strong, random, copy-ready.</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer',
            padding: 6, borderRadius: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Preview */}
        <div style={{
          background: 'rgba(7,8,15,0.85)',
          border: '1px solid rgba(42,51,71,0.55)',
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          minHeight: 56,
        }}>
          <span style={{
            flex: 1, fontFamily: 'JetBrains Mono, monospace',
            fontSize: 14, color: '#e6edf3', wordBreak: 'break-all',
            userSelect: 'all',
          }}>
            {pw || (noClassesSelected ? 'Select at least one character class.' : '…')}
          </span>
          <button onClick={() => regen()} title="Regenerate" style={{
            background: 'transparent', border: '1px solid rgba(42,51,71,0.6)',
            color: '#8b949e', borderRadius: 6, padding: '5px 7px', cursor: 'pointer',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>

        {/* Strength meter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(42,51,71,0.45)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${strength.score}%`,
              background: strength.color, transition: 'width 0.2s, background 0.2s',
              boxShadow: pw ? `0 0 6px ${strength.color}80` : 'none',
            }} />
          </div>
          <span style={{ fontSize: 11, color: strength.color, fontWeight: 600, minWidth: 72, textAlign: 'right' }}>
            {strength.label || '—'}
          </span>
        </div>

        {/* Length slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Length</span>
            <span style={{ fontSize: 11, color: '#e6edf3', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{opts.length}</span>
          </div>
          <input
            type="range" min={8} max={64} step={1}
            value={opts.length}
            onChange={e => setOpts({ ...opts, length: parseInt(e.target.value, 10) })}
            style={{ width: '100%', accentColor: '#f78166' }}
          />
        </div>

        {/* Character classes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Character classes</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            <Toggle checked={opts.upper}   onChange={v => setOpts({ ...opts, upper: v })}   label="A–Z uppercase" />
            <Toggle checked={opts.lower}   onChange={v => setOpts({ ...opts, lower: v })}   label="a–z lowercase" />
            <Toggle checked={opts.digits}  onChange={v => setOpts({ ...opts, digits: v })}  label="0–9 digits" />
            <Toggle checked={opts.symbols} onChange={v => setOpts({ ...opts, symbols: v })} label="!@#$ symbols" />
          </div>
          <Toggle checked={opts.noAmbiguous} onChange={v => setOpts({ ...opts, noAmbiguous: v })} label="Skip ambiguous chars (O 0 I l 1)" />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={copyPw} disabled={!pw}
            style={{
              flex: 1, padding: '9px 14px', borderRadius: 8,
              border: '1px solid rgba(42,51,71,0.6)', background: 'rgba(13,14,24,0.6)',
              color: pw ? '#e6edf3' : '#4a5568',
              fontSize: 12, fontWeight: 600, cursor: pw ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {copied ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ color: '#3fb950' }}>Copied</span>
              </>
            ) : 'Copy'}
          </button>
          {onUse && (
            <button onClick={() => { if (pw) { onUse(pw); onClose() } }} disabled={!pw}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 8,
                border: '1px solid rgba(247,129,102,0.5)',
                background: pw ? 'rgba(247,129,102,0.9)' : 'rgba(247,129,102,0.3)',
                color: '#0a0a0f',
                fontSize: 12, fontWeight: 700, cursor: pw ? 'pointer' : 'not-allowed',
              }}
            >
              Use in new credential
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
