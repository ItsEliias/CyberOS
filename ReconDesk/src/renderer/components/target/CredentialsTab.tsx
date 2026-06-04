import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useRecondeskStore } from '../../stores/useRecondeskStore'
import type { HashType } from '../../types/recondesk'

function credAgeDays(addedAt: string): number {
  try {
    return Math.floor((Date.now() - new Date(addedAt).getTime()) / 86_400_000)
  } catch { return 0 }
}

function AgeBadge({ addedAt }: { addedAt: string }) {
  const days = credAgeDays(addedAt)
  if (days < 1) return null
  const isOld    = days > 90
  const isStale  = days > 30
  const color    = isOld ? '#f85149' : isStale ? '#d29922' : '#484f58'
  const bg       = isOld ? 'rgba(248,81,73,0.10)' : isStale ? 'rgba(210,153,34,0.10)' : 'rgba(42,51,71,0.25)'
  const border   = isOld ? 'rgba(248,81,73,0.25)' : isStale ? 'rgba(210,153,34,0.25)' : 'rgba(42,51,71,0.4)'
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded font-mono tabular-nums flex-shrink-0"
      style={{ color, background: bg, border: `1px solid ${border}` }}
      title={`Added ${days} day${days !== 1 ? 's' : ''} ago`}
    >
      {days}d old
    </span>
  )
}

const HASH_TYPE_BADGE: Record<HashType, string> = {
  NTLM:   'text-[#f85149] bg-[#f85149]/10 border-[#f85149]/20',
  MD5:    'text-[#d29922] bg-[#d29922]/10 border-[#d29922]/20',
  SHA1:   'text-[#4a9eff] bg-[#4a9eff]/10 border-[#4a9eff]/20',
  bcrypt: 'text-[#b44fff] bg-[#b44fff]/10 border-[#b44fff]/20',
  other:  'text-[#4a5568] bg-[#4a5568]/10 border-[#4a5568]/20',
}

const HASH_TYPES: HashType[] = ['NTLM', 'MD5', 'SHA1', 'bcrypt', 'other']

export default function CredentialsTab({ targetId }: { targetId: string }) {
  const targets            = useRecondeskStore(s => s.targets)
  const addCredential      = useRecondeskStore(s => s.addCredential)
  const updateCredential   = useRecondeskStore(s => s.updateCredential)
  const deleteCredential   = useRecondeskStore(s => s.deleteCredential)

  const target = targets.find(t => t.id === targetId)
  const creds  = target?.credentials ?? []

  const [showAdd,   setShowAdd]   = useState(false)
  const [revealed,  setRevealed]  = useState<Set<string>>(new Set())
  const [copied,    setCopied]    = useState<string | null>(null)

  const [addForm, setAddForm] = useState({
    username:   '',
    password:   '',
    hash:       '',
    hashType:   'NTLM' as HashType,
    service:    '',
    port:       '',
    notes:      '',
    source:     '',
    verified:   false,
    useHash:    false,
  })

  function toggleReveal(id: string) {
    setRevealed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.username.trim() && !addForm.hash.trim()) return
    addCredential(targetId, {
      username:  addForm.username,
      password:  addForm.useHash ? undefined : (addForm.password || undefined),
      hash:      addForm.useHash ? (addForm.hash || undefined) : undefined,
      hashType:  addForm.useHash && addForm.hash ? addForm.hashType : undefined,
      service:   addForm.service,
      port:      addForm.port ? parseInt(addForm.port) : undefined,
      notes:     addForm.notes,
      source:    addForm.source,
      verified:  addForm.verified,
    })
    setAddForm({ username: '', password: '', hash: '', hashType: 'NTLM', service: '', port: '', notes: '', source: '', verified: false, useHash: false })
    setShowAdd(false)
  }

  const inputCls = "bg-[#0a0a0f] border border-[#2a3347] rounded px-2 py-1.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] transition-colors"

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(42,51,71,0.5)', background: 'rgba(7,8,15,0.3)' }}>
        <span className="heading-sm" style={{ color: '#e6edf3' }}>
          Credentials <span className="text-[10px] font-normal" style={{ color: '#484f58' }}>({creds.length})</span>
        </span>
        <div className="flex items-center gap-2">
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
            <div className="p-4 bg-[#0d0d14] flex flex-col gap-3">
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 text-xs text-[#8b949e] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.useHash}
                    onChange={e => setAddForm(f => ({ ...f, useHash: e.target.checked }))}
                    className="accent-[#d29922]"
                  />
                  Hash credential
                </label>
              </div>
              <div className="flex gap-2 flex-wrap">
                <div>
                  <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Username</label>
                  <input autoFocus placeholder="root" value={addForm.username} onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))} className={`${inputCls} w-36 font-mono`} />
                </div>
                {!addForm.useHash ? (
                  <div>
                    <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Password</label>
                    <input type="password" placeholder="••••••" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} className={`${inputCls} w-36 font-mono`} />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Hash</label>
                      <input placeholder="hash value" value={addForm.hash} onChange={e => setAddForm(f => ({ ...f, hash: e.target.value }))} className={`${inputCls} w-52 font-mono`} />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Hash Type</label>
                      <select value={addForm.hashType} onChange={e => setAddForm(f => ({ ...f, hashType: e.target.value as HashType }))} className={inputCls}>
                        {HASH_TYPES.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Service</label>
                  <input placeholder="ssh" value={addForm.service} onChange={e => setAddForm(f => ({ ...f, service: e.target.value }))} className={`${inputCls} w-24`} />
                </div>
                <div>
                  <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Port</label>
                  <input type="number" min={1} max={65535} placeholder="22" value={addForm.port} onChange={e => setAddForm(f => ({ ...f, port: e.target.value }))} className={`${inputCls} w-20 font-mono`} />
                </div>
                <div>
                  <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Source</label>
                  <input placeholder="gobuster, manual..." value={addForm.source} onChange={e => setAddForm(f => ({ ...f, source: e.target.value }))} className={`${inputCls} w-40`} />
                </div>
              </div>
              <div>
                <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-1">Notes</label>
                <input placeholder="Additional notes..." value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} w-full`} />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-[#8b949e] cursor-pointer">
                  <input type="checkbox" checked={addForm.verified} onChange={e => setAddForm(f => ({ ...f, verified: e.target.checked }))} className="accent-[#3fb950]" />
                  Verified
                </label>
                <button type="submit" className="px-3 py-1.5 bg-[#d29922]/15 hover:bg-[#d29922]/25 border border-[#d29922]/30 text-[#d29922] text-xs rounded transition-colors">
                  Add Credential
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {creds.length === 0 ? (
          <motion.div
            className="flex items-center justify-center h-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="absolute w-16 h-16 rounded-full" style={{ background: 'radial-gradient(circle, rgba(248,81,73,0.06) 0%, transparent 70%)' }} />
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ color: '#f85149', opacity: 0.35 }}>
                  <circle cx="8" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M14.5 10H21M17 7.5l3 2.5-3 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 21v-1a4 4 0 0 1 4-4h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#8b949e' }}>No credentials captured</p>
              <p className="text-xs mt-1" style={{ color: '#484f58' }}>Add credentials found during enumeration</p>
            </div>
          </motion.div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(42,51,71,0.6)', background: 'rgba(7,8,15,0.5)' }}>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#484f58', letterSpacing: '0.07em' }}>Username</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#484f58', letterSpacing: '0.07em' }}>Password / Hash</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#484f58', letterSpacing: '0.07em' }}>Service</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest w-16" style={{ color: '#484f58', letterSpacing: '0.07em' }}>Port</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest w-20" style={{ color: '#484f58', letterSpacing: '0.07em' }}>Status</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest w-20" style={{ color: '#484f58', letterSpacing: '0.07em' }}>Age</th>
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {creds.map((cred, i) => {
                  const isRevealed = revealed.has(cred.id)
                  const secret     = cred.password ?? cred.hash ?? ''
                  const isCopied   = copied === cred.id
                  const isUserCopied = copied === `user-${cred.id}`

                  return (
                    <motion.tr
                      key={cred.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.15 }}
                      className="table-row-alt table-row-accent group"
                      style={{
                        borderBottom: '1px solid rgba(42,51,71,0.25)',
                        transition: 'background 120ms ease',
                      }}
                    >
                      {/* Username cell — monospace, icon-only copy */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[#e2e8f0] text-[11px] tracking-tight">{cred.username || <span className="text-[#4a5568]">—</span>}</span>
                          {cred.username && (
                            <button
                              onClick={() => copyToClipboard(cred.username, `user-${cred.id}`)}
                              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded transition-all flex-shrink-0"
                              style={{
                                background: isUserCopied ? 'rgba(63,185,80,0.15)' : 'rgba(42,51,71,0.45)',
                                color: isUserCopied ? '#3fb950' : '#4a5568',
                              }}
                              title="Copy username"
                            >
                              {isUserCopied
                                ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                : <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M4 3V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1" stroke="currentColor" strokeWidth="1.2"/></svg>
                              }
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Secret cell — monospace, show/hide/icon-only copy */}
                      <td className="px-2 py-2.5 max-w-[220px]">
                        {secret ? (
                          <div className="flex items-center gap-1">
                            <span
                              className="font-mono text-[11px] truncate flex-1 tracking-tight"
                              style={{ color: isRevealed ? (cred.hash ? '#4a9eff' : '#d29922') : '#8b949e', opacity: isRevealed ? 1 : 0.7 }}
                            >
                              {isRevealed
                                ? (cred.hash
                                    ? (secret.length > 32 ? secret.slice(0, 32) + '…' : secret)
                                    : secret)
                                : '••••••••••'}
                            </span>
                            {cred.hashType && (
                              <span className={`text-[9px] px-1 py-0.5 rounded border flex-shrink-0 font-mono ${HASH_TYPE_BADGE[cred.hashType]}`}>
                                {cred.hashType}
                              </span>
                            )}
                            {/* Reveal toggle — icon eye */}
                            <button
                              onClick={() => toggleReveal(cred.id)}
                              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded transition-all flex-shrink-0"
                              style={{ background: 'rgba(42,51,71,0.45)', color: isRevealed ? '#d29922' : '#4a5568' }}
                              title={isRevealed ? 'Hide' : 'Reveal'}
                            >
                              {isRevealed
                                ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.2"/><circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2 2l8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                                : <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.2"/><circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                              }
                            </button>
                            {/* Copy — icon clipboard */}
                            <button
                              onClick={() => copyToClipboard(secret, cred.id)}
                              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded transition-all flex-shrink-0"
                              style={{
                                background: isCopied ? 'rgba(63,185,80,0.15)' : 'rgba(42,51,71,0.45)',
                                color: isCopied ? '#3fb950' : '#4a5568',
                              }}
                              title="Copy secret"
                            >
                              {isCopied
                                ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                : <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M4 3V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1" stroke="currentColor" strokeWidth="1.2"/></svg>
                              }
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#4a5568]">—</span>
                        )}
                      </td>

                      <td className="px-2 py-2.5 font-mono text-[11px]" style={{ color: '#8b949e' }}>{cred.service || <span className="text-[#4a5568]">—</span>}</td>
                      <td className="px-2 py-2.5 font-mono text-[11px] tabular-nums" style={{ color: '#8b949e' }}>{cred.port ?? <span className="text-[#4a5568]">—</span>}</td>
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => updateCredential(targetId, cred.id, { verified: !cred.verified })}
                          className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border transition-all"
                          style={cred.verified
                            ? { color: '#3fb950', background: 'rgba(63,185,80,0.10)', borderColor: 'rgba(63,185,80,0.25)' }
                            : { color: '#484f58', background: 'transparent', borderColor: 'rgba(42,51,71,0.4)' }
                          }
                          title={cred.verified ? 'Verified — click to unverify' : 'Click to mark verified'}
                        >
                          {cred.verified ? '✓ verified' : '○ unverified'}
                        </button>
                      </td>
                      <td className="px-2 py-2.5">
                        <AgeBadge addedAt={cred.addedAt} />
                      </td>
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => deleteCredential(targetId, cred.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#4a5568] hover:text-[#f85149] text-[10px] px-1 py-0.5 rounded hover:bg-[#f85149]/10 transition-all"
                        >
                          ✕
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
