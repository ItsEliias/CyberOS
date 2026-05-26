import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import type { PortState, CredType } from '../../shared/types'

const PORT_STATES: PortState[]  = ['open', 'filtered', 'closed']
const CRED_TYPES:  CredType[]   = ['plaintext', 'hash', 'key', 'token']

const STATE_COLOR: Record<PortState, string> = {
  open:     'text-success',
  filtered: 'text-warning',
  closed:   'text-muted',
}

// ─── Ports ────────────────────────────────────────────────────────────────────

function PortsSection({ targetId }: { targetId: string }) {
  const target     = useStore(s => s.targets.find(t => t.id === targetId))
  const addPort    = useStore(s => s.addPort)
  const removePort = useStore(s => s.removePort)
  const [adding, setAdding] = useState(false)
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
              className="group flex items-center gap-2 py-1.5 px-2 rounded hover:bg-border/30 transition-colors"
            >
              <span className={`text-xs font-mono font-medium w-12 flex-shrink-0 ${STATE_COLOR[port.state]}`}>
                {port.number}
              </span>
              <span className="text-[10px] text-muted w-6 flex-shrink-0">{port.protocol}</span>
              <span className="text-xs text-text flex-1 truncate">{port.service || '—'}</span>
              {port.version && (
                <span className="text-[10px] text-muted truncate max-w-[100px]">{port.version}</span>
              )}
              <button
                onClick={() => removePort(targetId, port.id)}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger text-[10px] transition-all flex-shrink-0"
              >✕</button>
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
