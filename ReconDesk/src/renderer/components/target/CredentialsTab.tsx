import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecondeskStore } from '../../stores/useRecondeskStore'
import type { HashType } from '../../types/recondesk'

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
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a3347] flex-shrink-0">
        <span className="text-sm font-medium text-[#e2e8f0]">
          Credentials <span className="text-[#4a5568] text-xs font-normal">({creds.length})</span>
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
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-[#4a5568]">No credentials captured</p>
              <p className="text-xs text-[#4a5568]/60 mt-1">Add credentials found during enumeration</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a3347]">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-[#4a5568] uppercase tracking-widest">Username</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-[#4a5568] uppercase tracking-widest">Password / Hash</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-[#4a5568] uppercase tracking-widest">Service</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-[#4a5568] uppercase tracking-widest w-16">Port</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-[#4a5568] uppercase tracking-widest w-20">Verified</th>
                <th className="px-4 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {creds.map((cred, i) => {
                  const isRevealed = revealed.has(cred.id)
                  const secret     = cred.password ?? cred.hash ?? ''
                  const isCopied   = copied === cred.id

                  return (
                    <motion.tr
                      key={cred.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.15 }}
                      className="group border-b border-[#2a3347]/50 hover:bg-[#2a3347]/20 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[#e2e8f0]">{cred.username || <span className="text-[#4a5568]">—</span>}</span>
                          {cred.username && (
                            <button
                              onClick={() => copyToClipboard(cred.username, `user-${cred.id}`)}
                              className="opacity-0 group-hover:opacity-100 text-[9px] px-1 py-0.5 rounded bg-[#2a3347] text-[#4a5568] hover:text-[#8b949e] transition-all"
                            >
                              {copied === `user-${cred.id}` ? '✓' : 'copy'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 max-w-[200px]">
                        {secret ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[#d29922]/70 truncate">
                              {isRevealed
                                ? cred.hash
                                  ? (secret.length > 32 ? secret.slice(0, 32) + '…' : secret)
                                  : secret
                                : '••••••••'}
                            </span>
                            {cred.hashType && (
                              <span className={`text-[9px] px-1 py-0.5 rounded border flex-shrink-0 ${HASH_TYPE_BADGE[cred.hashType]}`}>
                                {cred.hashType}
                              </span>
                            )}
                            <button
                              onClick={() => toggleReveal(cred.id)}
                              className="opacity-0 group-hover:opacity-100 text-[9px] px-1 py-0.5 rounded bg-[#2a3347] text-[#4a5568] hover:text-[#8b949e] transition-all flex-shrink-0"
                            >
                              {isRevealed ? 'hide' : 'show'}
                            </button>
                            {isRevealed && (
                              <button
                                onClick={() => copyToClipboard(secret, cred.id)}
                                className="opacity-0 group-hover:opacity-100 text-[9px] px-1 py-0.5 rounded bg-[#2a3347] text-[#4a5568] hover:text-[#8b949e] transition-all flex-shrink-0"
                              >
                                {isCopied ? '✓' : 'copy'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#4a5568]">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 font-mono text-[#8b949e]">{cred.service || <span className="text-[#4a5568]">—</span>}</td>
                      <td className="px-2 py-2.5 font-mono text-[#8b949e]">{cred.port ?? <span className="text-[#4a5568]">—</span>}</td>
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => updateCredential(targetId, cred.id, { verified: !cred.verified })}
                          className={`text-sm transition-colors ${cred.verified ? 'text-[#3fb950]' : 'text-[#4a5568] hover:text-[#8b949e]'}`}
                          title={cred.verified ? 'Verified — click to unverify' : 'Click to mark verified'}
                        >
                          {cred.verified ? '✓' : '○'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
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
