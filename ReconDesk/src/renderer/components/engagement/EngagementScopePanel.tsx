import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRecondeskStore } from '../../stores/useRecondeskStore'

interface Props {
  engagementId: string
  onClose: () => void
}

export default function EngagementScopePanel({ engagementId, onClose }: Props) {
  const engagements    = useRecondeskStore(s => s.engagements)
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

  const inputCls    = 'w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-2.5 py-1.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#d29922] transition-colors'
  const labelCls    = 'text-[10px] font-medium text-[#4a5568] uppercase tracking-widest mb-1 block'
  const textareaCls = `${inputCls} resize-none`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="bg-[#12131a] border border-[#d29922]/30 rounded-xl w-[600px] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3347]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: eng.color }} />
            <div>
              <h2 className="text-sm font-semibold text-[#e2e8f0]">Engagement / Scope</h2>
              <p className="text-[10px] text-[#4a5568]">Rules of Engagement · {eng.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#4a5568] hover:text-[#e2e8f0] text-xl leading-none transition-colors">×</button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
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
              className={textareaCls}
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
              className={textareaCls}
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
              className={textareaCls}
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
              className={inputCls}
              placeholder="e.g. /home/user/engagements/sow.pdf"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#2a3347]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-[#8b949e] hover:text-[#e2e8f0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-1.5 text-xs bg-[#d29922]/15 hover:bg-[#d29922]/25 border border-[#d29922]/30 text-[#d29922] rounded transition-colors"
          >
            Save Scope
          </button>
        </div>
      </motion.div>
    </div>
  )
}
