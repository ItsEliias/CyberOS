// CyberOS Dashboard — App Status Grid
// 3-column grid showing all 12 app cards — dense layout

import { useDashboardStore } from '../../stores/useDashboardStore'
import { buildAppCards } from '../../utils/configParser'
import AppStatusCard from './AppStatusCard'

export default function AppStatusGrid() {
  const config = useDashboardStore((s) => s.config)
  const cards = buildAppCards(config)

  return (
    <div>
      <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest mb-2">
        Ecosystem Applications
      </p>
      <div className="grid grid-cols-3 gap-2.5">
        {cards.map((card, index) => (
          <AppStatusCard key={card.id} card={card} index={index} />
        ))}
      </div>
    </div>
  )
}
