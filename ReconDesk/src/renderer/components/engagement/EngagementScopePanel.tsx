import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRecondeskStore } from '../../stores/useRecondeskStore'

interface Props {
  engagementId: string
  onClose: () => void
}

const inputCls = 'field-premium w-full rounded-md px-3 py-2 text-xs'
const inputStyle = {}
const labelCls = 'label-caps mb-1.5 block'

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-[620px] max-h-[88vh] overflow-hidden flex flex-col"
        style={{
          background: 'rgba(13,14,24,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(210,153,34,0.22)',
          borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            borderBottom: '1px solid rgba(42,51,71,0.45)',
            background: 'linear-gradient(180deg, rgba(210,153,34,0.04) 0%, transparent 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(210,153,34,0.10)',
                border: '1px solid rgba(210,153,34,0.20)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: eng.color, boxShadow: `0 0 6px ${eng.color}80` }} />
            </div>
            <div>
              <h2 className="heading-md" style={{ color: '#e6edf3' }}>Engagement / Scope</h2>
              <p className="text-[10px] mt-0.5" style={{ color: '#484f58' }}>Rules of Engagement · {eng.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-xl leading-none transition-all"
            style={{ color: '#484f58' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(42,51,71,0.45)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#484f58'; (e.currentTarget as HTMLButtonElement).style.background = '' }}
          >×</button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
          {/* Engagement name */}
          <div>
            <label className={labelCls}>Engagement Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputCls}
              placeholder="Engagement name"
            />
          </div>

          {/* Auth */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Authorised By</label>
              <input
                value={form.authorisedBy}
                onChange={e => setForm(f => ({ ...f, authorisedBy: e.target.value }))}
                className={inputCls}
                placeholder="Name or role"
              />
            </div>
            <div>
              <label className={labelCls}>Authorised Date</label>
              <input
                type="date"
                value={form.authorisedDate}
                onChange={e => setForm(f => ({ ...f, authorisedDate: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Testing window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Window Start</label>
              <input
                type="datetime-local"
                value={form.windowStart}
                onChange={e => setForm(f => ({ ...f, windowStart: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Window End</label>
              <input
                type="datetime-local"
                value={form.windowEnd}
                onChange={e => setForm(f => ({ ...f, windowEnd: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {/* In scope */}
          <div>
            <label className={labelCls}>In Scope</label>
            <textarea
              value={form.inScope}
              onChange={e => setForm(f => ({ ...f, inScope: e.target.value }))}
              className={`${inputCls} resize-none font-mono`}
              rows={3}
              placeholder="IPs, CIDR ranges, hostnames, services..."
            />
          </div>

          {/* Out of scope */}
          <div>
            <label className={labelCls}>Out of Scope</label>
            <textarea
              value={form.outOfScope}
              onChange={e => setForm(f => ({ ...f, outOfScope: e.target.value }))}
              className={`${inputCls} resize-none font-mono`}
              rows={2}
              placeholder="Explicitly excluded targets or actions..."
            />
          </div>

          {/* Allowed activity */}
          <div>
            <label className={labelCls}>Allowed Activity</label>
            <textarea
              value={form.allowedActivity}
              onChange={e => setForm(f => ({ ...f, allowedActivity: e.target.value }))}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="e.g. port scanning, web app testing — no DoS..."
            />
          </div>

          {/* Emergency contact */}
          <div>
            <label className={labelCls}>Emergency Contact</label>
            <input
              value={form.emergencyContact}
              onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))}
              className={inputCls}
              placeholder="Name / phone / email for incident escalation"
            />
          </div>

          {/* Auth document */}
          <div>
            <label className={labelCls}>Authorisation Document Location</label>
            <input
              value={form.authStorageLocation}
              onChange={e => setForm(f => ({ ...f, authStorageLocation: e.target.value }))}
              className={`${inputCls} font-mono`}
              placeholder="e.g. /home/user/engagements/sow.pdf"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3.5"
          style={{
            borderTop: '1px solid rgba(42,51,71,0.45)',
            background: 'rgba(7,8,15,0.4)',
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs rounded-md transition-all"
            style={{ color: '#8b949e', background: 'transparent' }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.color = '#e6edf3'; b.style.background = 'rgba(42,51,71,0.4)' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.color = '#8b949e'; b.style.background = 'transparent' }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 text-xs rounded-md font-medium transition-all"
            style={{
              background: 'rgba(210,153,34,0.15)',
              border: '1px solid rgba(210,153,34,0.32)',
              color: '#d29922',
              boxShadow: '0 1px 4px rgba(210,153,34,0.08)',
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'rgba(210,153,34,0.26)'; b.style.boxShadow = '0 2px 8px rgba(210,153,34,0.18)' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'rgba(210,153,34,0.15)'; b.style.boxShadow = '0 1px 4px rgba(210,153,34,0.08)' }}
          >
            Save Scope
          </button>
        </div>
      </motion.div>
    </div>
  )
}
