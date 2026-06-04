// ReconDesk — Notification Center (Feature 15)
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecondeskStore } from '../stores/useRecondeskStore'

export default function NotificationBell() {
  const notifications         = useRecondeskStore(s => s.notifications)
  const markNotificationRead  = useRecondeskStore(s => s.markNotificationRead)
  const clearNotifications    = useRecondeskStore(s => s.clearNotifications)
  const setActiveTarget       = useRecondeskStore(s => s.setActiveTarget)
  const [open, setOpen]       = useState(false)

  const unread = notifications.filter(n => !n.readAt).length

  function handleClick(n: typeof notifications[number]) {
    markNotificationRead(n.id)
    if (n.targetId) setActiveTarget(n.targetId)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        className={`relative w-7 h-7 flex items-center justify-center rounded border transition-colors ${
          open ? 'bg-[#d29922]/10 border-[#d29922]/20 text-[#d29922]' : 'border-transparent text-[#8b949e] hover:text-[#e2e8f0] hover:bg-[#2a3347]/40'
        }`}
      >
        <span className="text-sm">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#f85149] text-white text-[8px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-9 z-40 w-72 bg-[#12131a] border border-[#2a3347] rounded-lg shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a3347]">
                <span className="text-xs font-semibold text-[#e2e8f0]">
                  Notifications
                  {unread > 0 && <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-[#f85149]/15 text-[#f85149] border border-[#f85149]/25">{unread} new</span>}
                </span>
                {notifications.length > 0 && (
                  <button onClick={clearNotifications} className="text-[10px] text-[#4a5568] hover:text-[#8b949e] transition-colors">
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-[#4a5568]">No notifications</p>
                  </div>
                ) : (
                  notifications.slice().reverse().map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-3 py-2.5 border-b border-[#2a3347]/50 last:border-none hover:bg-[#2a3347]/30 transition-colors ${!n.readAt ? 'bg-[#d29922]/3' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.readAt && <span className="w-1.5 h-1.5 rounded-full bg-[#d29922] flex-shrink-0 mt-1" />}
                        {n.readAt && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs truncate ${!n.readAt ? 'text-[#e2e8f0] font-medium' : 'text-[#8b949e]'}`}>{n.title}</p>
                          <p className="text-[10px] text-[#4a5568] truncate mt-0.5">{n.body}</p>
                          <p className="text-[9px] text-[#4a5568] mt-0.5 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
