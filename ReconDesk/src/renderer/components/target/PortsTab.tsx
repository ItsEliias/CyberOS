import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useRecondeskStore } from '../../stores/useRecondeskStore'
import ImportNmapModal from './ImportNmapModal'
import type { PortState } from '../../types/recondesk'

const STATE_BADGE: Record<PortState, string> = {
  open:     'text-[#3fb950] bg-[#3fb950]/10 border-[#3fb950]/25',
  filtered: 'text-[#d29922] bg-[#d29922]/10 border-[#d29922]/25',
  closed:   'text-[#4a5568] bg-[#4a5568]/10 border-[#4a5568]/25',
}

// Risk-score mock: high-risk ports get 'high', safe/common get 'low', rest 'med'
const HIGH_RISK_PORTS = new Set([21, 23, 25, 110, 135, 137, 139, 445, 512, 513, 514, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 27017])
const LOW_RISK_PORTS  = new Set([22, 80, 443, 8080, 8443])

function portRisk(port: number): 'low' | 'med' | 'high' {
  if (HIGH_RISK_PORTS.has(port)) return 'high'
  if (LOW_RISK_PORTS.has(port))  return 'low'
  return 'med'
}

const RISK_PILL: Record<'low' | 'med' | 'high', { label: string; cls: string }> = {
  low:  { label: 'low',  cls: 'text-[#3fb950] bg-[#3fb950]/08 border-[#3fb950]/20' },
  med:  { label: 'med',  cls: 'text-[#d29922] bg-[#d29922]/08 border-[#d29922]/20' },
  high: { label: 'high', cls: 'text-[#f85149] bg-[#f85149]/08 border-[#f85149]/20' },
}

const SORT_OPTIONS = ['port', 'service', 'state'] as const
type SortKey = typeof SORT_OPTIONS[number]

export default function PortsTab({ targetId }: { targetId: string }) {
  const targets     = useRecondeskStore(s => s.targets)
  const addPort     = useRecondeskStore(s => s.addPort)
  const updatePort  = useRecondeskStore(s => s.updatePort)
  const deletePort  = useRecondeskStore(s => s.deletePort)

  const target = targets.find(t => t.id === targetId)
  const ports  = target?.ports ?? []

  const [showImport,  setShowImport]  = useState(false)
  const [showAdd,     setShowAdd]     = useState(false)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)
  const [sortBy,      setSortBy]      = useState<SortKey>('port')

  const [addForm, setAddForm] = useState({
    port: '', protocol: 'tcp' as 'tcp' | 'udp',
    service: '', version: '', state: 'open' as PortState, notes: '',
  })

  const sorted = [...ports].sort((a, b) => {
    if (sortBy === 'port')    return a.port - b.port
    if (sortBy === 'service') return (a.service || '').localeCompare(b.service || '')
    if (sortBy === 'state')   return a.state.localeCompare(b.state)
    return 0
  })

  function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    const portNum = parseInt(addForm.port)
    if (!portNum || portNum < 1 || portNum > 65535) return
    addPort(targetId, {
      port:     portNum,
      protocol: addForm.protocol,
      state:    addForm.state,
      service:  addForm.service,
      version:  addForm.version,
      notes:    addForm.notes,
      source:   'manual',
    })
    setAddForm({ port: '', protocol: 'tcp', service: '', version: '', state: 'open', notes: '' })
    setShowAdd(false)
  }

  const openCount = ports.filter(p => p.state === 'open').length
  const inputCls  = "bg-[#0a0a0f] border border-[#2a3347] rounded px-2 py-1.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] transition-colors"

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(42,51,71,0.5)', background: 'rgba(7,8,15,0.3)' }}>
        <div className="flex items-center gap-2">
          <span className="heading-sm" style={{ color: '#e6edf3' }}>
            Ports <span className="text-[10px] font-normal" style={{ color: '#484f58' }}>({openCount} open)</span>
          </span>
          <div className="flex items-center gap-1 ml-2">
            {SORT_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  sortBy === s
                    ? 'bg-[#d29922]/15 text-[#d29922] border border-[#d29922]/25'
                    : 'text-[#4a5568] hover:text-[#8b949e]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-2.5 py-1.5 text-xs border border-[#2a3347] text-[#8b949e] rounded hover:text-[#d29922] hover:border-[#d29922]/30 transition-colors"
          >
            Import nmap XML
          </button>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="px-2.5 py-1.5 text-xs bg-[#d29922]/10 border border-[#d29922]/20 text-[#d29922] rounded hover:bg-[#d29922]/20 transition-colors"
          >
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={submitAdd}
            className="overflow-hidden border-b border-[#2a3347] flex-shrink-0"
          >
            <div className="p-4 flex flex-wrap gap-2 items-end bg-[#0d0d14]">
              <div>
                <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Port</label>
                <input
                  autoFocus type="number" min={1} max={65535} placeholder="80"
                  value={addForm.port}
                  onChange={e => setAddForm(f => ({ ...f, port: e.target.value }))}
                  className={`${inputCls} w-20 font-mono`}
                />
              </div>
              <div>
                <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Protocol</label>
                <select value={addForm.protocol} onChange={e => setAddForm(f => ({ ...f, protocol: e.target.value as 'tcp'|'udp' }))} className={inputCls}>
                  <option>tcp</option><option>udp</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">State</label>
                <select value={addForm.state} onChange={e => setAddForm(f => ({ ...f, state: e.target.value as PortState }))} className={inputCls}>
                  <option>open</option><option>filtered</option><option>closed</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Service</label>
                <input placeholder="http" value={addForm.service} onChange={e => setAddForm(f => ({ ...f, service: e.target.value }))} className={`${inputCls} w-28`} />
              </div>
              <div>
                <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Version</label>
                <input placeholder="Apache 2.4" value={addForm.version} onChange={e => setAddForm(f => ({ ...f, version: e.target.value }))} className={`${inputCls} w-36`} />
              </div>
              <button type="submit" className="px-3 py-1.5 bg-[#d29922]/15 hover:bg-[#d29922]/25 border border-[#d29922]/30 text-[#d29922] text-xs rounded transition-colors">
                Add Port
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {ports.length === 0 ? (
          <motion.div
            className="flex items-center justify-center h-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="absolute w-16 h-16 rounded-full" style={{ background: 'radial-gradient(circle, rgba(74,158,255,0.07) 0%, transparent 70%)' }} />
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ color: '#4a9eff', opacity: 0.35 }}>
                  <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 10h2M15 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#8b949e' }}>No ports recorded</p>
              <p className="text-xs mt-1" style={{ color: '#484f58' }}>Import nmap XML or add manually above</p>
            </div>
          </motion.div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(42,51,71,0.6)', background: 'rgba(7,8,15,0.5)' }}>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest w-20" style={{ color: '#484f58', letterSpacing: '0.07em' }}>Port</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest w-16" style={{ color: '#484f58', letterSpacing: '0.07em' }}>Proto</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#484f58', letterSpacing: '0.07em' }}>Service</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#484f58', letterSpacing: '0.07em' }}>Version</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest w-20" style={{ color: '#484f58', letterSpacing: '0.07em' }}>State</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest w-16" style={{ color: '#484f58', letterSpacing: '0.07em' }}>Risk</th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {sorted.map((port, i) => (
                  <>
                    <motion.tr
                      key={port.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.15 }}
                      className="table-row-alt group cursor-pointer"
                      style={{
                        borderBottom: '1px solid rgba(42,51,71,0.25)',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        transition: 'background 120ms ease, border-color 120ms ease',
                      }}
                      onClick={() => setExpandedId(expandedId === port.id ? null : port.id)}
                    >
                      <td className="px-4 py-2.5 font-mono font-bold text-[#e2e8f0]">{port.port}</td>
                      <td className="px-2 py-2.5 font-mono text-[#8b949e]">{port.protocol}</td>
                      <td className="px-2 py-2.5 text-[#e2e8f0]">{port.service || <span className="text-[#4a5568]">—</span>}</td>
                      <td className="px-2 py-2.5 text-[#8b949e] max-w-[200px] truncate">{port.version || <span className="text-[#4a5568]">—</span>}</td>
                      <td className="px-2 py-2.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${STATE_BADGE[port.state]}`}>
                          {port.state}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        {port.state === 'open' && (() => {
                          const risk = portRisk(port.port)
                          const rp   = RISK_PILL[risk]
                          return (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${rp.cls}`}>
                              {rp.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); setExpandedId(port.id) }}
                            className="text-[#4a5568] hover:text-[#8b949e] text-[10px] px-1 py-0.5 rounded hover:bg-[#2a3347] transition-colors"
                            title="Edit notes"
                          >
                            ✎
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); deletePort(targetId, port.id) }}
                            className="text-[#4a5568] hover:text-[#f85149] text-[10px] px-1 py-0.5 rounded hover:bg-[#f85149]/10 transition-colors"
                            title="Delete port"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    {expandedId === port.id && (
                      <tr key={`${port.id}-notes`} className="bg-[#0d0d14]">
                        <td colSpan={7} className="px-4 py-3">
                          <textarea
                            value={port.notes}
                            onChange={e => updatePort(targetId, port.id, { notes: e.target.value })}
                            placeholder="Notes for this port..."
                            rows={2}
                            className="w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-2.5 py-1.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] resize-none transition-colors"
                            onClick={e => e.stopPropagation()}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Import nmap modal */}
      <AnimatePresence>
        {showImport && <ImportNmapModal targetId={targetId} onClose={() => setShowImport(false)} />}
      </AnimatePresence>
    </div>
  )
}
