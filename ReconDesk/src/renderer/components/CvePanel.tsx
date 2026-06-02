// ReconDesk — CvePanel.tsx
// ItsEliias — CVE lookup panel for port entries

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CveResult } from '../../shared/types'

function severityColor(s: string | null): string {
  switch (s?.toUpperCase()) {
    case 'CRITICAL': return '#ef4444'
    case 'HIGH':     return '#f97316'
    case 'MEDIUM':   return '#eab308'
    case 'LOW':      return '#22c55e'
    default:         return 'var(--text-muted, #6b7280)'
  }
}

export function CvePanel({ service, version }: { service?: string; version?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [results, setResults] = useState<CveResult[]>([])
  const [open, setOpen] = useState(false)
  const query = [service, version].filter(Boolean).join(' ')

  async function lookup() {
    if (state === 'loading') return
    if (open && state === 'done') { setOpen(false); return }
    setOpen(true)
    setState('loading')
    try {
      const res = await window.electronAPI.cveLookup(service ?? '', version ?? '')
      setResults(res)
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <span className="flex flex-col items-end flex-shrink-0">
      <button
        onClick={lookup}
        title={`Look up CVEs for "${query}"`}
        className="px-1.5 h-5 flex items-center justify-center text-[9px] font-semibold tracking-wide rounded border transition-colors"
        style={{
          color:       open ? '#ef4444' : 'var(--text-muted, #6b7280)',
          borderColor: open ? '#ef444440' : 'transparent',
          background:  open ? '#ef444410' : 'transparent',
        }}
      >
        {state === 'loading' ? '…' : 'CVE'}
      </button>

      <AnimatePresence>
        {open && state === 'done' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden w-[320px] max-w-xs"
            style={{ position: 'relative', zIndex: 10 }}
          >
            <div className="mt-1 rounded border border-border bg-bg text-[10px] overflow-hidden">
              <div className="px-2 py-1 border-b border-border text-muted/70 font-mono">
                CVEs for &quot;{query}&quot;
              </div>
              {results.length === 0 ? (
                <p className="px-2 py-1.5 text-muted/60">No results found.</p>
              ) : (
                results.map(cve => (
                  <div key={cve.id} className="px-2 py-1.5 border-b border-border/50 last:border-b-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold" style={{ color: severityColor(cve.severity) }}>
                        {cve.id}
                      </span>
                      {cve.severity && (
                        <span className="text-[9px] font-bold px-1 rounded" style={{
                          color:      severityColor(cve.severity),
                          background: severityColor(cve.severity) + '20',
                        }}>
                          {cve.severity}
                        </span>
                      )}
                      {cve.score !== null && (
                        <span className="text-[9px]" style={{ color: severityColor(cve.severity) }}>
                          {cve.score}
                        </span>
                      )}
                      <span className="text-muted/50 ml-auto">{cve.published}</span>
                      <button
                        onClick={() => window.electronAPI.openUrl(cve.url)}
                        className="text-accent/70 hover:text-accent transition-colors ml-1"
                        title="Open in NVD"
                      >↗</button>
                    </div>
                    <p className="text-muted/80 leading-tight line-clamp-2">{cve.description}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {open && state === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-1 px-2 py-1 rounded border border-border bg-bg text-[10px] text-error/80 w-[220px]"
          >
            Lookup failed — check network.
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
