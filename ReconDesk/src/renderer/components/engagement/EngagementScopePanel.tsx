import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRecondeskStore } from '../../stores/useRecondeskStore'

interface Props {
  engagementId: string
  onClose: () => void
}

const inputCls = [
  'w-full rounded px-2.5 py-1.5 text-xs placeholder-[#484f58]',
  'focus:outline-none transition-colors',
].join(' ')

const inputStyle = {
  background: '#07080f',
  border: '1px solid rgba(42,51,71,0.75)',
  color: '#e6edf3',
}

const labelCls = 'text-[10px] font-semibold uppercase tracking-widest mb-1 block'

export default function EngagementScopePanel({ engagementId, onClose }: Props) {
  const engagements      = useRecondeskStore(s => s.engagements)
  const updateEngagement = useRecondeskStore(s => s.updateEngagement)

  const eng = engagements.find(e => e.id === engagementId)
  if (!eng) return null

  const [form, setForm] = useState({
    name:                eng.name,
    authorisedBy:        eng.authorisedBy        ?? '',
    authorisedDate:      eng.authorisedDate       ?? '',
    inScope:             eng.inScope              ?? '',
    outOfScope:          eng.outOfScope           ?? '',
    windowStart:         eng.windowStart          ?? '',
    windowEnd:           eng.windowEnd            ?? '',
    allowedActivity:     eng.allowedActivity      ?? '',
    emergencyContact:    eng.emergencyContact      ?? '',
    authStorageLocation: eng.authStorageLocation  ?? '',
  })

  function save() {
    updateEngagement(engagementId, {
      name:                form.name.trim() || eng.name,
      authorisedBy:        form.authorisedBy.trim()        || undefined,
      authorisedDate:      form.authorisedDate             || undefined,
      inScope:             form.inScope.trim()             || undefined,
      outOfScope:          form.outOfScope.trim()          || undefined,
      windowStart:         form.windowStart                || undefined,
      windowEnd:           form.windowEnd                  || undefined,
      allowedActivity:     form.allowedActivity.trim()     || undefined,
      emergencyContact:    form.emergencyContact.trim()    || undefined,
      authStorageLocation: form.authStorageLocation.trim() || undefined,
    })
    onClose()
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#d29922'
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'rgba(42,51,71,0.75)'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="w-[600px] max-h-[85vh] overflow-hidden flex flex-col"
        style={{ background: '#0d0e18', border: '1px solid rgba(210,153,34,0.25)', borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.65)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(42,51,71,0.5)' }}>
          <div className="flex items-center gap-3">
            <div style={{ filter: 'drop-shadow(0 0 4px rgba(210,153,34,0.4))' }}>
              <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: eng.color }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Engagement / Scope</h2>
              <p className="text-[10px]" style={{ color: '#484f58' }}>Rules of Engagement · {eng.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-xl leading-none transition-colors"
            style={{ color: '#484f58' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(42,51,71,0.4)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#484f58'; (e.currentTarget as HTMLButtonElement).style.background = '' }}
          >×</button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Engagement name */}
          <div>
            <label className={labelCls} style={{ color: '#484f58' }}>Engagement Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputCls}
              style={inputStyle}
              placeholder="Engagement name"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Auth */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: '#484f58' }}>Authorised By</label>
              <input
                value={form.authorisedBy}
                onChange={e => setForm(f => ({ ...f, authorisedBy: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                placeholder="Name or role"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: '#484f58' }}>Authorised Date</label>
              <input
                type="date"
                value={form.authorisedDate}
                onChange={e => setForm(f => ({ ...f, authorisedDate: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          {/* Testing window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={{ color: '#484f58' }}>Window Start</label>
              <input
                type="datetime-local"
                value={form.windowStart}
                onChange={e => setForm(f => ({ ...f, windowStart: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: '#484f58' }}>Window End</label>
              <input
                type="datetime-local"
                value={form.windowEnd}
                onChange={e => setForm(f => ({ ...f, windowEnd: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          {/* In scope */}
          <div>
            <label className={labelCls} style={{ color: '#484f58' }}>In Scope</label>
            <textarea
              value={form.inScope}
              onChange={e => setForm(f => ({ ...f, inScope: e.target.value }))}
              className={`${inputCls} resize-none`}
              style={inputStyle}
              rows={3}
              placeholder="IPs, CIDR ranges, hostnames, services..."
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Out of scope */}
          <div>
            <label className={labelCls} style={{ color: '#484f58' }}>Out of Scope</label>
            <textarea
              value={form.outOfScope}
              onChange={e => setForm(f => ({ ...f, outOfScope: e.target.value }))}
              className={`${inputCls} resize-none`}
              style={inputStyle}
              rows={2}
              placeholder="Explicitly excluded targets or actions..."
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Allowed activity */}
          <div>
            <label className={labelCls} style={{ color: '#484f58' }}>Allowed Activity</label>
            <textarea
              value={form.allowedActivity}
              onChange={e => setForm(f => ({ ...f, allowedActivity: e.target.value }))}
              className={`${inputCls} resize-none`}
              style={inputStyle}
              rows={2}
              placeholder="e.g. port scanning, web app testing — no DoS..."
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Emergency contact */}
          <div>
            <label className={labelCls} style={{ color: '#484f58' }}>Emergency Contact</label>
            <input
              value={form.emergencyContact}
              onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))}
              className={inputCls}
              style={inputStyle}
              placeholder="Name / phone / email for incident escalation"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Auth document */}
          <div>
            <label className={labelCls} style={{ color: '#484f58' }}>Authorisation Document Location</label>
            <input
              value={form.authStorageLocation}
              onChange={e => setForm(f => ({ ...f, authStorageLocation: e.target.value }))}
              className={inputCls}
              style={inputStyle}
              placeholder="e.g. /home/user/engagements/sow.pdf"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid rgba(42,51,71,0.5)' }}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs transition-colors"
            style={{ color: '#8b949e' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8b949e' }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-1.5 text-xs rounded transition-colors"
            style={{ background: 'rgba(210,153,34,0.15)', border: '1px solid rgba(210,153,34,0.30)', color: '#d29922' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(210,153,34,0.25)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(210,153,34,0.15)' }}
          >
            Save Scope
          </button>
        </div>
      </motion.div>
    </div>
  )
}
