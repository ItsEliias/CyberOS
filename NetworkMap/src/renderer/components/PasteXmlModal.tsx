// NetworkMap — PasteXmlModal.tsx
// Uses renderer-side DOMParser (per spec: no external XML library)
import { useState } from 'react'
import type { NetworkNode } from '@shared/types'
import { parseNmapXml } from '../lib/nmapParser'

interface Props {
  onClose: () => void
  onImport: (nodes: NetworkNode[]) => void
}

export default function PasteXmlModal({ onClose, onImport }: Props) {
  const [xml, setXml]           = useState('')
  const [preview, setPreview]   = useState<NetworkNode[] | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [parsing, setParsing]   = useState(false)

  function handleParse() {
    if (!xml.trim()) { setError('Please paste nmap XML content.'); return }
    setParsing(true)
    setError(null)
    try {
      const result = parseNmapXml(xml)
      if (result.errors.length > 0 && result.nodes.length === 0) {
        setError(result.errors[0])
        setPreview(null)
      } else if (result.nodes.length === 0) {
        setError('No hosts found. Make sure this is valid nmap XML output (-oX format).')
        setPreview(null)
      } else {
        setPreview(result.nodes)
      }
    } catch (e) {
      setError((e as Error).message)
      setPreview(null)
    } finally {
      setParsing(false)
    }
  }

  function handleImport() {
    if (preview) onImport(preview)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        width: 560,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Paste nmap XML</span>
          <button
            onClick={onClose}
            style={{ background: 'transparent', color: 'var(--text-dim)', fontSize: 20, lineHeight: 1 }}
          >×</button>
        </div>

        {/* Textarea */}
        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            value={xml}
            onChange={e => { setXml(e.target.value); setPreview(null); setError(null) }}
            placeholder="Paste nmap XML output here..."
            style={{
              flex: 1,
              minHeight: 240,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: 12,
              color: 'var(--text)',
              fontSize: 12,
              fontFamily: 'monospace',
              resize: 'none',
            }}
          />

          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(255,68,68,0.1)',
              border: '1px solid rgba(255,68,68,0.3)',
              borderRadius: 6,
              color: 'var(--error)',
              fontSize: 12,
            }}>
              {error}
            </div>
          )}

          {preview && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(63,185,80,0.08)',
              border: '1px solid rgba(63,185,80,0.25)',
              borderRadius: 6,
              color: 'var(--success)',
              fontSize: 12,
            }}>
              Found {preview.length} {preview.length === 1 ? 'host' : 'hosts'} — ready to import
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px', borderRadius: 6,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
            }}
          >Cancel</button>
          <button
            onClick={handleParse}
            disabled={parsing || !xml.trim()}
            style={{
              padding: '7px 14px', borderRadius: 6,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              opacity: parsing || !xml.trim() ? 0.5 : 1,
            }}
          >{parsing ? 'Parsing…' : 'Parse'}</button>
          {preview && (
            <button
              onClick={handleImport}
              style={{
                padding: '7px 14px', borderRadius: 6,
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                color: '#0d1117',
                fontWeight: 600,
              }}
            >Import {preview.length} {preview.length === 1 ? 'host' : 'hosts'}</button>
          )}
        </div>
      </div>
    </div>
  )
}
