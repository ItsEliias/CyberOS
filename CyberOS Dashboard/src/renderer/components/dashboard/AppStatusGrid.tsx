// CyberOS Dashboard — App Status Grid

import { useDashboardStore } from '../../stores/useDashboardStore'
import { buildAppCards } from '../../utils/configParser'
import AppStatusCard from './AppStatusCard'

export default function AppStatusGrid() {
  const config = useDashboardStore((s) => s.config)
  const cards = buildAppCards(config)

  return (
    <div>
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">
        Applications
      </p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, index) => (
          <AppStatusCard key={card.id} card={card} index={index} />
        ))}
      </div>
    </div>
  )
}
