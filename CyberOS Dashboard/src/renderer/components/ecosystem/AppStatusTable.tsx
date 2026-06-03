// CyberOS Dashboard — App Status Table (Deep View)
// Full table of all 12 apps with status, version, exec path, metrics

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { buildAppCards } from '../../utils/configParser'
import { timeAgo } from '../../utils/timeAgo'
import StatusBadge from '../shared/StatusBadge'

export default function AppStatusTable() {
  const config = useDashboardStore((s) => s.config)
  const cards = buildAppCards(config)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const getRegistration = (id: string) => {
    const key = id === 'vaultcore' ? 'vaultscraper' : id
    return (config as any)[key] ?? {}
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          App Status Table
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left px-4 py-2 text-text-secondary font-medium">App</th>
              <th className="text-left px-4 py-2 text-text-secondary font-medium">Status</th>
              <th className="text-left px-4 py-2 text-text-secondary font-medium">Last Active</th>
              <th className="text-left px-4 py-2 text-text-secondary font-medium">Version</th>
              <th className="text-left px-4 py-2 text-text-secondary font-medium">Exec Path</th>
              <th className="text-left px-4 py-2 text-text-secondary font-medium">Key Metric</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => {
              const reg = getRegistration(card.id)
              const isExpanded = expandedId === card.id
              return (
                <>
                  <tr
                    key={card.id}
                    className="border-b border-border-subtle/50 hover:bg-bg-interactive/30 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : card.id)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: card.accentColor }}
                        />
                        <span className="text-text-primary font-medium">{card.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={card.active ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-4 py-2 text-text-secondary font-mono">
                      {timeAgo(card.lastActive)}
                    </td>
                    <td className="px-4 py-2 text-text-secondary font-mono">
                      {reg.version ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-text-muted font-mono max-w-[200px] truncate" title={card.execPath ?? '—'}>
                      {card.execPath ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-text-primary">
                      {card.metrics[0]?.value ?? '—'}
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
                            <div className="py-3 px-4 bg-bg-interactive/20 rounded-md my-1">
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
