// CyberOS Dashboard — Shared Context Inspector
// Live view of the shared_context object from config

import { useDashboardStore } from '../../stores/useDashboardStore'
import { timeAgo } from '../../utils/timeAgo'

export default function SharedContextInspector() {
  const config = useDashboardStore((s) => s.config)
  const ctx = config.shared_context

  const fields = [
    { label: 'Active Lab', value: ctx?.activeLab },
    { label: 'Active Target', value: ctx?.activeTarget },
    { label: 'Active IP', value: ctx?.activeIP },
    { label: 'Active Playbook', value: ctx?.activePlaybook },
    { label: 'Last Updated', value: ctx?.lastUpdated ? timeAgo(ctx.lastUpdated) : null },
    { label: 'Updated By', value: ctx?.updatedBy },
  ]

  return (
    <div className="bg-bg-elevated/75 backdrop-blur-sm border border-border-default/60 rounded-lg p-4">
      <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest mb-3">
        Shared Context
      </p>

      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.label} className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">{field.label}</span>
            {field.value ? (
              <span className="text-xs text-text-primary font-mono">{field.value}</span>
            ) : (
              <span className="text-xs text-text-muted italic">Not set</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
