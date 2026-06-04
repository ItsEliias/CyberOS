// CyberOS Dashboard — App Status Grid

import { useDashboardStore } from '../../stores/useDashboardStore'
import { buildAppCards } from '../../utils/configParser'
import AppStatusCard from './AppStatusCard'

function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-3 overflow-hidden"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid rgba(42,51,71,0.4)',
        borderLeft: '2px solid rgba(42,51,71,0.5)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full skeleton" />
          <span className="w-16 h-2.5 skeleton" />
        </div>
        <span className="w-6 h-2 skeleton" />
      </div>
      {/* Metric */}
      <div className="w-10 h-5 skeleton mb-2" />
      {/* Sparkline */}
      <div className="w-full h-[34px] skeleton mb-2" style={{ borderRadius: '6px' }} />
      {/* Secondary metrics */}
      <div className="space-y-1.5 mb-2">
        <div className="flex justify-between">
          <span className="w-10 h-2 skeleton" />
          <span className="w-8 h-2 skeleton" />
        </div>
        <div className="flex justify-between">
          <span className="w-12 h-2 skeleton" />
          <span className="w-6 h-2 skeleton" />
        </div>
      </div>
      {/* Footer */}
      <div className="pt-1.5 border-t border-[rgba(42,51,71,0.25)]">
        <span className="w-14 h-2 skeleton" />
      </div>
    </div>
  )
}

export default function AppStatusGrid() {
  const config = useDashboardStore((s) => s.config)
  const isLoading = useDashboardStore((s) => s.isLoading)
  const cards = buildAppCards(config)

  return (
    <div>
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">
        Applications
      </p>
      <div className="grid grid-cols-4 gap-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((card, index) => (
              <AppStatusCard key={card.id} card={card} index={index} />
            ))}
      </div>
    </div>
  )
}
