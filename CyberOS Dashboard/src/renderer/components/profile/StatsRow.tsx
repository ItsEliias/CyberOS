// CyberOS Dashboard — Stats Row Component
// 4 metric cards for the operator profile full view

import { useDashboardStore } from '../../stores/useDashboardStore'
import MetricCard from '../shared/MetricCard'

export default function StatsRow() {
  const config = useDashboardStore((s) => s.config)
  const profile = config.operator_profile

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        label="Total Labs"
        value={profile?.totalLabsCompleted ?? 0}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
          </svg>
        }
      />
      <MetricCard
        label="Total Flags"
        value={profile?.totalFlags ?? 0}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        }
        accentColor="#3fb950"
      />
      <MetricCard
        label="Total Credentials"
        value={profile?.totalCredentials ?? 0}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        }
        accentColor="#f78166"
      />
      <MetricCard
        label="Current Streak"
        value={profile?.currentStreak ?? 0}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        }
        accentColor="#d29922"
      />
    </div>
  )
}
