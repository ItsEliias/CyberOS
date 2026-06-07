// CyberOS Dashboard — Config Inspector

import { useMemo, useState } from 'react'
import { useDashboardStore } from '../../stores/useDashboardStore'

/** Tokenize a JSON string for syntax highlighting */
function tokenizeJson(json: string): Array<{ text: string; type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punct' | 'plain' }> {
  const tokens: Array<{ text: string; type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punct' | 'plain' }> = []
  // Regex that matches: keys, strings, numbers, booleans, null, punctuation
  const re = /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}\[\],:])|(\s+|[^\s{}\[\],:]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(json)) !== null) {
    if (m[1]) tokens.push({ text: m[1], type: 'key' })
    else if (m[2]) tokens.push({ text: m[2], type: 'string' })
    else if (m[3]) tokens.push({ text: m[3], type: 'number' })
    else if (m[4]) tokens.push({ text: m[4], type: 'boolean' })
    else if (m[5]) tokens.push({ text: m[5], type: 'null' })
    else if (m[6]) tokens.push({ text: m[6], type: 'punct' })
    else tokens.push({ text: m[0], type: 'plain' })
  }
  return tokens
}

const TOKEN_COLORS: Record<string, string> = {
  key:     '#8b949e', // muted white — keys
  string:  '#3fb950', // green
  number:  '#d29922', // amber
  boolean: '#4a9eff', // blue
  null:    '#f85149', // red
  punct:   '#586069', // dim
  plain:   'var(--text-secondary)',
}

function JsonHighlight({ value }: { value: string }) {
  const tokens = useMemo(() => tokenizeJson(value), [value])
  return (
    <pre
      className="text-[10px] font-mono leading-relaxed overflow-auto rounded-lg p-3"
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(42,51,71,0.35)',
        maxHeight: '180px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {tokens.map((tok, i) => (
        <span key={i} style={{ color: TOKEN_COLORS[tok.type] }}>{tok.text}</span>
      ))}
    </pre>
  )
}

export default function ConfigInspector() {
  const config = useDashboardStore((s) => s.config)
  const error = useDashboardStore((s) => s.error)

  const configPath = '~/cybertools-config.json'
  const isValid = !error && Object.keys(config).length > 0

  // Build a compact JSON snippet of top-level keys for preview
  const previewJson = useMemo(() => {
    const preview: Record<string, unknown> = {}
    const keys = Object.keys(config).slice(0, 6)
    for (const k of keys) preview[k] = (config as Record<string, unknown>)[k]
    return JSON.stringify(preview, null, 2)
  }, [config])

  const [pathCopied, setPathCopied] = useState(false)
  async function handleCopyPath() {
    try {
      await navigator.clipboard.writeText(configPath)
      setPathCopied(true)
      setTimeout(() => setPathCopied(false), 1400)
    } catch { /* clipboard write rejected — show no fake confirmation */ }
  }
  const handleOpenInEditor = () => { window.electronAPI.openUrl(`file://${configPath.replace('~', '')}`) }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--elevation-1), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest block mb-4">
        Config File Health
      </span>

      <div className="space-y-3">
        {/* Path */}
        <Row label="Path">
          <div className="flex items-center gap-1.5">
            <code
              className="text-[11px] font-mono text-text-primary px-2 py-0.5 rounded"
              style={{ background: 'rgba(42,51,71,0.4)' }}
            >
              {configPath}
            </code>
            <button
              onClick={handleCopyPath}
              className="transition-colors"
              style={{ color: pathCopied ? '#3fb950' : undefined }}
              title={pathCopied ? 'Copied!' : 'Copy path'}
            >
              {pathCopied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted hover:text-text-primary">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
        </Row>

        {/* Validity */}
        <Row label="Valid JSON">
          <div
            className="flex items-center gap-1.5 text-[11px] font-semibold"
            style={{ color: isValid ? 'var(--state-online)' : 'var(--sev-critical)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: isValid ? 'var(--state-online)' : 'var(--sev-critical)' }}
            />
            {isValid ? 'Valid' : 'Invalid / Missing'}
          </div>
        </Row>

        {/* Key count */}
        <Row label="Top-level keys">
          <span className="text-[11px] text-text-primary font-mono tabular-nums">{Object.keys(config).length}</span>
        </Row>

        {/* Error */}
        {error && (
          <div
            className="rounded-lg p-3 mt-1"
            style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)' }}
          >
            <p className="text-[11px] text-danger">{error}</p>
          </div>
        )}

        {/* JSON Preview with syntax highlighting */}
        {isValid && (
          <div className="pt-1">
            <span className="text-[9px] font-semibold text-text-muted uppercase tracking-widest block mb-1.5">
              Preview
            </span>
            <JsonHighlight value={previewJson} />
          </div>
        )}

        {/* Actions */}
        <div className="pt-2">
          <button
            onClick={handleOpenInEditor}
            className="flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded transition-colors"
            style={{
              color: 'var(--accent)',
              background: 'rgba(74,158,255,0.1)',
              border: '1px solid rgba(74,158,255,0.2)',
            }}
            title="Open config file in default editor (⌘E)"
          >
            Open in editor
            <kbd
              className="text-[9px] font-mono px-1 py-0.5 rounded"
              style={{
                background: 'rgba(74,158,255,0.12)',
                border: '1px solid rgba(74,158,255,0.22)',
                color: 'rgba(74,158,255,0.7)',
                lineHeight: 1,
              }}
            >
              ⌘E
            </kbd>
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] text-text-secondary shrink-0">{label}</span>
      {children}
    </div>
  )
}
