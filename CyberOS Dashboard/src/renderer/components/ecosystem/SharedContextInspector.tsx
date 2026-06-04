// CyberOS Dashboard — Shared Context Inspector

import { useDashboardStore } from '../../stores/useDashboardStore'
import { timeAgo } from '../../utils/timeAgo'

export default function SharedContextInspector() {
  const config = useDashboardStore((s) => s.config)
  const ctx = config.shared_context

  const fields = [
    { label: 'Active Lab',     value: ctx?.activeLab },
    { label: 'Active Target',  value: ctx?.activeTarget },
    { label: 'Active IP',      value: ctx?.activeIP,       mono: true },
    { label: 'Active Playbook',value: ctx?.activePlaybook },
    { label: 'Last Updated',   value: ctx?.lastUpdated ? timeAgo(ctx.lastUpdated) : null },
    { label: 'Updated By',     value: ctx?.updatedBy },
  ]

  const activeCount = fields.filter((f) => !!f.value).length

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--elevation-1)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          Shared Context
        </span>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{
            background: activeCount > 0 ? 'rgba(74,158,255,0.1)' : 'rgba(42,51,71,0.4)',
            color: activeCount > 0 ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          {activeCount}/{fields.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {fields.map((field) => (
          <div key={field.label} className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-text-secondary shrink-0">{field.label}</span>
            {field.value ? (
              <span
                className="text-[11px] text-text-primary truncate max-w-[180px]"
                style={{ fontFamily: field.mono ? 'var(--font-mono)' : 'var(--font-display)' }}
              >
                {field.value}
              </span>
            ) : (
              <span className="text-[11px] text-text-muted italic">Not set</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
