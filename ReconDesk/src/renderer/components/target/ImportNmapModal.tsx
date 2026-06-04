import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRecondeskStore } from '../../stores/useRecondeskStore'

interface Props {
  targetId: string
  onClose: () => void
}

export default function ImportNmapModal({ targetId, onClose }: Props) {
  const importPortsFromNmap = useRecondeskStore(s => s.importPortsFromNmap)
  const [xml, setXml]      = useState('')
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  function handleImport() {
    const r = importPortsFromNmap(targetId, xml)
    setResult(r)
    if (r.errors.length === 0 && r.imported > 0) {
      setTimeout(onClose, 1200)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-[#12131a] border border-[#2a3347] rounded-lg w-[540px] max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3347]">
          <div>
            <h2 className="text-sm font-semibold text-[#e2e8f0]">Import nmap XML</h2>
            <p className="text-[11px] text-[#4a5568] mt-0.5">
              Paste output from <code className="text-[#d29922]/70 font-mono text-[10px]">nmap -oX -</code> or an XML file
            </p>
          </div>
          <button onClick={onClose} className="text-[#4a5568] hover:text-[#e2e8f0] text-lg leading-none transition-colors">×</button>
        </div>

        <div className="flex flex-col gap-3 p-4 overflow-y-auto">
          <textarea
            autoFocus
            value={xml}
            onChange={e => { setXml(e.target.value); setResult(null) }}
            placeholder={'<?xml version="1.0"?>\n<nmaprun>\n  ...\n</nmaprun>'}
            rows={12}
            className="w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-3 py-2 text-[11px] font-mono text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] resize-none transition-colors"
          />

          {result && (
            <div className={`rounded px-3 py-2 text-xs border ${
              result.errors.length > 0
                ? 'bg-[#f85149]/5 border-[#f85149]/20 text-[#f85149]'
                : 'bg-[#3fb950]/5 border-[#3fb950]/20 text-[#3fb950]'
            }`}>
              {result.errors.length > 0 ? (
                result.errors.map((e, i) => <p key={i}>{e}</p>)
              ) : (
                <p>
                  Imported <strong>{result.imported}</strong> port{result.imported !== 1 ? 's' : ''}
                  {result.skipped > 0 && <span className="text-[#d29922]"> · {result.skipped} skipped (duplicates)</span>}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-[#2a3347]/40 hover:bg-[#2a3347]/70 text-[#8b949e] text-xs py-2 rounded border border-[#2a3347] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!xml.trim()}
              className="flex-1 bg-[#d29922]/15 hover:bg-[#d29922]/25 border border-[#d29922]/30 text-[#d29922] text-xs py-2 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import Ports
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
