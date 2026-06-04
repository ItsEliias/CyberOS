// ReconDesk — CSV Import Modal (Feature 9)
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecondeskStore } from '../../stores/useRecondeskStore'

interface CsvRow { ip: string; hostname: string; description: string; engagement: string }

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length === 0) return []

  // Detect header
  const firstLine = lines[0].toLowerCase()
  const hasHeader = firstLine.includes('ip') || firstLine.includes('host')
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines.map(line => {
    const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
    return {
      ip:          cols[0] ?? '',
      hostname:    cols[1] ?? '',
      description: cols[2] ?? '',
      engagement:  cols[3] ?? '',
    }
  }).filter(r => r.ip)
}

export default function CsvImportModal() {
  const setCsvImportOpen  = useRecondeskStore(s => s.setCsvImportOpen)
  const importCsvTargets  = useRecondeskStore(s => s.importCsvTargets)
  const showToast         = useRecondeskStore(s => s.showToast)

  const [text,    setText]    = useState('')
  const [preview, setPreview] = useState<CsvRow[] | null>(null)
  const [loading, setLoading] = useState(false)

  function handleParse() {
    const rows = parseCsv(text)
    setPreview(rows)
  }

  async function handleFileOpen() {
    try {
      const res = await (window.electronAPI as any).openFileDialog({ filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }], title: 'Open CSV' })
      if (res.canceled || !res.filePaths[0]) return
      // Read via fetch (file:// in Electron renderer)
      const resp = await fetch(res.filePaths[0])
      const t    = await resp.text()
      setText(t)
      setPreview(parseCsv(t))
    } catch { /* no-op */ }
  }

  function handleImport() {
    if (!preview || preview.length === 0) return
    setLoading(true)
    const count = importCsvTargets(preview)
    showToast(`Imported ${count} target${count !== 1 ? 's' : ''}`, 'success')
    setLoading(false)
    setCsvImportOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setCsvImportOpen(false)}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}
        className="bg-[#12131a] border border-[#2a3347] rounded-lg w-[560px] max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3347] flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[#e2e8f0]">Import CSV</h2>
            <p className="text-[10px] text-[#4a5568] mt-0.5">Format: ip, hostname, description, engagement</p>
          </div>
          <button onClick={() => setCsvImportOpen(false)} className="text-[#4a5568] hover:text-[#e2e8f0] text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
          {/* Input area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-[#4a5568] uppercase tracking-widest">CSV Data</label>
              <button
                onClick={handleFileOpen}
                className="text-[10px] px-2.5 py-1 rounded border border-[#2a3347] text-[#8b949e] hover:text-[#d29922] hover:border-[#d29922]/30 transition-colors"
              >
                Open File
              </button>
            </div>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setPreview(null) }}
              placeholder={'ip,hostname,description,engagement\n10.10.10.1,target1,Web server,HTB\n10.10.10.2,target2,AD controller,Client'}
              rows={6}
              className="w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-3 py-2.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] resize-none transition-colors font-mono"
            />
          </div>

          {/* Parse button */}
          {!preview && text.trim() && (
            <button
              onClick={handleParse}
              className="w-full py-2 text-xs border border-[#d29922]/30 bg-[#d29922]/10 text-[#d29922] hover:bg-[#d29922]/20 rounded transition-colors"
            >
              Preview Import ({parseCsv(text).length} rows)
            </button>
          )}

          {/* Preview table */}
          <AnimatePresence>
            {preview && preview.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-[#4a5568] uppercase tracking-widest">{preview.length} Targets to Import</p>
                  <button onClick={() => setPreview(null)} className="text-[10px] text-[#4a5568] hover:text-[#8b949e]">Edit</button>
                </div>
                <div className="max-h-52 overflow-y-auto rounded border border-[#2a3347]">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-[#2a3347] bg-[#0d0d14]">
                        <th className="px-3 py-1.5 text-left text-[9px] uppercase tracking-widest text-[#4a5568] font-semibold">IP</th>
                        <th className="px-3 py-1.5 text-left text-[9px] uppercase tracking-widest text-[#4a5568] font-semibold">Hostname</th>
                        <th className="px-3 py-1.5 text-left text-[9px] uppercase tracking-widest text-[#4a5568] font-semibold">Description</th>
                        <th className="px-3 py-1.5 text-left text-[9px] uppercase tracking-widest text-[#4a5568] font-semibold">Engagement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className={`border-b border-[#2a3347]/50 ${i % 2 === 0 ? '' : 'bg-[#0d0d14]/50'}`}>
                          <td className="px-3 py-1.5 font-mono text-[#d29922]/80">{row.ip}</td>
                          <td className="px-3 py-1.5 text-[#e2e8f0]">{row.hostname || <span className="text-[#4a5568]">—</span>}</td>
                          <td className="px-3 py-1.5 text-[#8b949e] max-w-[120px] truncate">{row.description || <span className="text-[#4a5568]">—</span>}</td>
                          <td className="px-3 py-1.5 text-[#8b949e]">{row.engagement || 'Default'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {preview && preview.length === 0 && (
            <p className="text-xs text-[#f85149]">No valid rows found. Ensure CSV has an ip column.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-[#2a3347] flex-shrink-0">
          <button onClick={() => setCsvImportOpen(false)} className="flex-1 bg-[#2a3347]/40 hover:bg-[#2a3347]/70 text-[#8b949e] text-xs py-2 rounded border border-[#2a3347] transition-colors">Cancel</button>
          <button
            onClick={handleImport}
            disabled={!preview || preview.length === 0 || loading}
            className="flex-1 bg-[#d29922]/15 hover:bg-[#d29922]/25 border border-[#d29922]/30 text-[#d29922] text-xs py-2 rounded transition-colors font-medium disabled:opacity-40"
          >
            {loading ? 'Importing…' : `Import ${preview?.length ?? 0} Targets`}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
