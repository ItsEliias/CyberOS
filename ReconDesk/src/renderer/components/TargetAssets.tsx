import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import type { PortState, CredType } from '../../shared/types'
import { CvePanel } from './CvePanel'

const PORT_STATES: PortState[]  = ['open', 'filtered', 'closed']
const CRED_TYPES:  CredType[]   = ['plaintext', 'hash', 'key', 'token']

const STATE_COLOR: Record<PortState, string> = {
  open:     'text-success',
  filtered: 'text-warning',
  closed:   'text-muted',
}

// ─── Nmap XML Parser ──────────────────────────────────────────────────────────

interface NmapPort {
  number: number
  protocol: 'tcp' | 'udp'
  service: string
  version: string
}

function parseNmapXml(xml: string): { ports: NmapPort[]; error?: string } {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    const parseError = doc.querySelector('parsererror')
    if (parseError) return { ports: [], error: 'Invalid XML: ' + parseError.textContent?.slice(0, 80) }

    const ports: NmapPort[] = []
    const portEls = doc.querySelectorAll('host ports port')
    portEls.forEach(portEl => {
      const stateEl   = portEl.querySelector('state')
      const serviceEl = portEl.querySelector('service')
      const state     = stateEl?.getAttribute('state') ?? ''
      if (state !== 'open') return

      const protocol = (portEl.getAttribute('protocol') ?? 'tcp') as 'tcp' | 'udp'
      const portId   = parseInt(portEl.getAttribute('portid') ?? '0')
      if (!portId) return

      const name    = serviceEl?.getAttribute('name') ?? ''
      const product = serviceEl?.getAttribute('product') ?? ''
      const ver     = serviceEl?.getAttribute('version') ?? ''
      const version = [product, ver].filter(Boolean).join(' ')

      ports.push({ number: portId, protocol, service: name, version })
    })

    return { ports }
  } catch (e) {
    return { ports: [], error: 'Parse error: ' + (e as Error).message }
  }
}

// ─── Nmap Import Modal ────────────────────────────────────────────────────────

function NmapImportModal({ targetId, onClose }: { targetId: string; onClose: () => void }) {
  const addPort = useStore(s => s.addPort)
  const [xml, setXml] = useState('')
  const [preview, setPreview] = useState<NmapPort[] | null>(null)
  const [error, setError] = useState('')

  function handleParse() {
    setError('')
    const { ports, error: err } = parseNmapXml(xml)
    if (err) { setError(err); return }
    if (ports.length === 0) { setError('No open ports found in XML.'); return }
    setPreview(ports)
  }

  function handleImport() {
    if (!preview) return
    preview.forEach(p => {
      addPort(targetId, {
        number: p.number, protocol: p.protocol,
        service: p.service || undefined,
        version: p.version || undefined,
        state: 'open',
      })
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-panel border border-border rounded-lg w-[520px] max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-xs font-semibold text-text">Import nmap XML</span>
          <button onClick={onClose} className="text-muted hover:text-text text-sm transition-colors">✕</button>
        </div>

        <div className="flex flex-col gap-3 p-4 overflow-y-auto flex-1">
          {!preview ? (
            <>
              <p className="text-[11px] text-muted">Paste nmap XML output below (from <code className="text-accent/70">nmap -oX</code> or stdout with <code className="text-accent/70">-oX -</code>).</p>
              <textarea
                autoFocus
                value={xml}
                onChange={e => setXml(e.target.value)}
                placeholder="<?xml version=&quot;1.0&quot;?>&#10;<nmaprun>&#10;  ...&#10;</nmaprun>"
                rows={10}
                className="w-full bg-bg border border-border rounded px-3 py-2 text-[11px] font-mono text-text placeholder-muted focus:outline-none focus:border-accent resize-none transition-colors"
              />
              {error && <p className="text-[11px] text-error">{error}</p>}
              <button
                onClick={handleParse}
                disabled={!xml.trim()}
                className="w-full bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs py-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Parse XML
              </button>
            </>
          ) : (
            <>
              <p className="text-[11px] text-muted">
                Found <span className="text-success font-medium">{preview.length}</span> open port{preview.length !== 1 ? 's' : ''}:
              </p>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {preview.map(p => (
                  <div key={`${p.number}-${p.protocol}`} className="flex items-center gap-2 py-1 px-2 bg-bg rounded text-xs">
                    <span className="font-mono text-success w-14 flex-shrink-0">{p.number}/{p.protocol.toUpperCase()}</span>
                    <span className="text-text flex-1">{p.service || '—'}</span>
                    {p.version && <span className="text-muted text-[10px] truncate max-w-[160px]">{p.version}</span>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => { setPreview(null); setError('') }}
                  className="flex-1 bg-border/40 hover:bg-border/60 text-muted text-xs py-1.5 rounded transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs py-1.5 rounded transition-colors"
                >
                  Import all
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Ports ────────────────────────────────────────────────────────────────────

function PortsSection({ targetId }: { targetId: string }) {
  const target     = useStore(s => s.targets.find(t => t.id === targetId))
  const addPort    = useStore(s => s.addPort)
  const removePort = useStore(s => s.removePort)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [form, setForm] = useState({
    number: '', protocol: 'tcp' as 'tcp' | 'udp',
    service: '', version: '', state: 'open' as PortState, notes: ''
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(form.number)
    if (!num || num < 1 || num > 65535) return
    addPort(targetId, {
      number: num,
      protocol: form.protocol,
      service:  form.service  || undefined,
      version:  form.version  || undefined,
      state:    form.state,
      notes:    form.notes    || undefined,
    })
    setForm({ number: '', protocol: 'tcp', service: '', version: '', state: 'open', notes: '' })
    setAdding(false)
  }

  const ports = target?.ports ?? []

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Ports</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setImporting(true)}
            className="px-2 h-5 flex items-center justify-center text-muted hover:text-accent hover:bg-accent/10 border border-transparent hover:border-accent/20 rounded transition-colors text-[10px] font-medium"
            title="Import nmap XML"
          >
            nmap
          </button>
          <button
            onClick={() => setAdding(v => !v)}
            className="w-5 h-5 flex items-center justify-center text-muted hover:text-text hover:bg-border rounded transition-colors text-sm"
          >
            {adding ? '✕' : '+'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {importing && (
          <NmapImportModal targetId={targetId} onClose={() => setImporting(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={submit}
            className="overflow-hidden mb-3"
          >
            <div className="bg-bg border border-border rounded p-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="number"
                  placeholder="Port"
                  min={1} max={65535}
                  value={form.number}
                  onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  className="w-20 bg-panel border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
                <select
                  value={form.protocol}
                  onChange={e => setForm(f => ({ ...f, protocol: e.target.value as 'tcp' | 'udp' }))}
                  className="bg-panel border border-border rounded px-2 py-1 text-xs text-muted focus:outline-none focus:border-accent transition-colors"
                >
                  <option>tcp</option>
                  <option>udp</option>
                </select>
                <select
                  value={form.state}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value as PortState }))}
                  className="flex-1 bg-panel border border-border rounded px-2 py-1 text-xs text-muted focus:outline-none focus:border-accent transition-colors"
                >
                  {PORT_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="Service (e.g. http)"
                  value={form.service}
                  onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  className="flex-1 bg-panel border border-border rounded px-2 py-1 text-xs text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
                <input
                  placeholder="Version"
                  value={form.version}
                  onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                  className="flex-1 bg-panel border border-border rounded px-2 py-1 text-xs text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs py-1 rounded transition-colors"
              >
                Add Port
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {ports.length === 0 ? (
        <p className="text-[11px] text-muted/60 py-2">No ports recorded.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {ports.map(port => (
            <motion.div
              key={port.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="group flex flex-col rounded hover:bg-border/30 transition-colors px-2"
            >
              <div className="flex items-center gap-2 py-1.5">
                <span className={`text-xs font-mono font-medium w-12 flex-shrink-0 ${STATE_COLOR[port.state]}`}>
                  {port.number}
                </span>
                <span className="text-[10px] text-muted w-6 flex-shrink-0">{port.protocol}</span>
                <span className="text-xs text-text flex-1 truncate">{port.service || '—'}</span>
                {port.version && (
                  <span className="text-[10px] text-muted truncate max-w-[100px]">{port.version}</span>
                )}
                {(port.service || port.version) && (
                  <CvePanel service={port.service} version={port.version} />
                )}
                <button
                  onClick={() => removePort(targetId, port.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger text-[10px] transition-all flex-shrink-0"
                >✕</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Credentials ──────────────────────────────────────────────────────────────

function CredsSection({ targetId }: { targetId: string }) {
  const target         = useStore(s => s.targets.find(t => t.id === targetId))
  const addCredential  = useStore(s => s.addCredential)
  const removeCredential = useStore(s => s.removeCredential)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    username: '', password: '', hash: '', type: 'plaintext' as CredType, service: ''
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.username && !form.hash) return
    addCredential(targetId, {
      username: form.username || undefined,
      password: form.password || undefined,
      hash:     form.hash     || undefined,
      type:     form.type,
      service:  form.service  || undefined,
    })
    setForm({ username: '', password: '', hash: '', type: 'plaintext', service: '' })
    setAdding(false)
  }

  const creds = target?.credentials ?? []

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Credentials</span>
        <button
          onClick={() => setAdding(v => !v)}
          className="w-5 h-5 flex items-center justify-center text-muted hover:text-text hover:bg-border rounded transition-colors text-sm"
        >
          {adding ? '✕' : '+'}
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={submit}
            className="overflow-hidden mb-3"
          >
            <div className="bg-bg border border-border rounded p-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as CredType }))}
                  className="bg-panel border border-border rounded px-2 py-1 text-xs text-muted focus:outline-none focus:border-accent transition-colors"
                >
                  {CRED_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <input
                  placeholder="Service (e.g. ssh)"
                  value={form.service}
                  onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  className="flex-1 bg-panel border border-border rounded px-2 py-1 text-xs text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <input
                autoFocus
                placeholder="Username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full bg-panel border border-border rounded px-2 py-1 text-xs text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />
              {form.type === 'plaintext' ? (
                <input
                  placeholder="Password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-panel border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              ) : (
                <input
                  placeholder="Hash / Key / Token"
                  value={form.hash}
                  onChange={e => setForm(f => ({ ...f, hash: e.target.value }))}
                  className="w-full bg-panel border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              )}
              <button
                type="submit"
                className="w-full bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs py-1 rounded transition-colors"
              >
                Add Credential
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {creds.length === 0 ? (
        <p className="text-[11px] text-muted/60 py-2">No credentials captured.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {creds.map(cred => (
            <motion.div
              key={cred.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="group flex items-start gap-2 py-1.5 px-2 rounded hover:bg-border/30 transition-colors"
            >
              <span className="text-[10px] text-muted/60 w-16 flex-shrink-0 mt-0.5">{cred.type}</span>
              <div className="flex-1 min-w-0">
                {cred.username && (
                  <p className="text-xs text-text font-medium truncate">{cred.username}</p>
                )}
                {(cred.password || cred.hash) && (
                  <p className="text-[11px] font-mono text-accent/70 truncate">{cred.password || cred.hash}</p>
                )}
                {cred.service && (
                  <p className="text-[10px] text-muted">{cred.service}</p>
                )}
              </div>
              <button
                onClick={() => removeCredential(targetId, cred.id)}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger text-[10px] transition-all flex-shrink-0 mt-0.5"
              >✕</button>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function TargetAssets() {
  const activeId = useStore(s => s.activeTargetId)
  const targets  = useStore(s => s.targets)
  const active   = targets.find(t => t.id === activeId)

  if (!activeId || !active) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted">Select a target to view its assets</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Target context bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium text-text">{active.name}</span>
        {active.os && <span className="text-xs text-muted">{active.os}</span>}
        <span className="text-xs font-mono text-accent/70">{active.ip}</span>
        <span className="text-xs text-muted/50 px-1.5 py-0.5 bg-border/30 rounded">{active.platform}</span>
        <span className="ml-auto text-[11px] text-muted">
          {active.ports.length} port{active.ports.length !== 1 ? 's' : ''} · {active.credentials.length} cred{active.credentials.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl flex flex-col gap-8">
          <PortsSection targetId={activeId} />
          <div className="border-t border-border" />
          <CredsSection targetId={activeId} />
        </div>
      </div>
    </div>
  )
}
