// CyberOS Dashboard — App Status Table (full ecosystem table)

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { buildAppCards } from '../../utils/configParser'
import { timeAgo } from '../../utils/timeAgo'

export default function AppStatusTable() {
  const config = useDashboardStore((s) => s.config)
  const cards = buildAppCards(config)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const getRegistration = (id: string) => {
    const key = id === 'vaultcore' ? 'vaultscraper' : id
    return (config as Record<string, unknown>)[key] ?? {}
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--elevation-1)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(42,51,71,0.35)' }}
      >
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          App Status Table
        </span>
        <span
          className="text-[10px] font-mono"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span style={{ color: 'var(--state-online)' }}>{cards.filter((c) => c.active).length}</span>
          /{cards.length} online
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(42,51,71,0.25)' }}>
              {['App', 'Status', 'Last Active', 'Version', 'Exec Path', 'Key Metric'].map((h) => (
                <th key={h} className="text-left px-4 py-2 font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => {
              const reg = getRegistration(card.id) as Record<string, string>
              const isExpanded = expandedId === card.id
              return (
                <>
                  <tr
                    key={card.id}
                    className="cursor-pointer transition-colors hover:bg-white/[0.025]"
                    style={{ borderBottom: '1px solid rgba(42,51,71,0.2)' }}
                    onClick={() => setExpandedId(isExpanded ? null : card.id)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: card.accentColor,
                            opacity: card.active ? 1 : 0.35,
                            boxShadow: card.active ? `0 0 5px ${card.accentColor}88` : 'none',
                          }}
                        />
                        <span className="font-medium text-text-primary">{card.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: card.active ? 'rgba(63,185,80,0.12)' : 'rgba(72,79,88,0.25)',
                          color: card.active ? 'var(--state-online)' : 'var(--text-muted)',
                          border: `1px solid ${card.active ? 'rgba(63,185,80,0.25)' : 'rgba(72,79,88,0.3)'}`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: card.active ? 'var(--state-online)' : 'var(--text-muted)' }}
                        />
                        {card.active ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-text-secondary font-mono">{timeAgo(card.lastActive)}</td>
                    <td className="px-4 py-2 text-text-secondary font-mono">{reg.version ?? '—'}</td>
                    <td
                      className="px-4 py-2 text-text-muted font-mono max-w-[180px] truncate"
                      title={card.execPath ?? '—'}
                    >
                      {card.execPath ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="font-mono font-semibold"
                        style={{ color: card.accentColor }}
                      >
                        {card.metrics[0]?.value ?? '—'}
                      </span>
                      {card.metrics[0]?.label && (
                        <span className="text-text-muted ml-1">{card.metrics[0].label}</span>
                      )}
                    </td>
                  </tr>

                  <AnimatePresence>
                    {isExpanded && (
                      <tr key={`${card.id}-expanded`}>
                        <td colSpan={6} className="px-4 py-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="my-1.5 rounded-lg p-3"
                              style={{ background: 'rgba(42,51,71,0.2)', border: '1px solid rgba(42,51,71,0.3)' }}
                            >
                              <pre className="text-[10px] text-text-secondary font-mono whitespace-pre-wrap">
                                {JSON.stringify(reg, null, 2)}
                              </pre>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
