import { useStore } from '../store'
import type { FeedCategory } from '../../shared/types'

const CATEGORY_LABELS: Record<FeedCategory, string> = {
  news:      'News',
  research:  'Research',
  community: 'Community',
  exploits:  'Exploits',
  cve:       'CVEs',
  custom:    'Custom',
}

const CATEGORY_ORDER: FeedCategory[] = ['news', 'research', 'exploits', 'cve', 'community', 'custom']

export default function SourcePanel() {
  const sources        = useStore(s => s.sources)
  const activeSourceId = useStore(s => s.activeSourceId)
  const setActiveSourceId = useStore(s => s.setActiveSourceId)

  async function toggle(id: string) {
    const updated = await window.electronAPI.toggleSource(id)
    useStore.getState().setSources(updated)
  }

  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof sources>>((acc, cat) => {
    const items = sources.filter(s => s.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  return (
    <aside className="w-52 flex flex-col border-r border-border flex-shrink-0 bg-panel/40">
      <div className="px-3 py-2.5 border-b border-border">
        <button
          onClick={() => setActiveSourceId(null)}
          className={`text-xs w-full text-left px-1.5 py-1 rounded transition-colors ${
            activeSourceId === null ? 'text-text font-medium' : 'text-muted hover:text-text'
          }`}
        >
          All Sources
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {Object.entries(grouped).map(([cat, srcs]) => (
          <div key={cat} className="mb-3">
            <p className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest px-3 mb-1">
              {CATEGORY_LABELS[cat as FeedCategory]}
            </p>
            {srcs.map(src => (
              <div
                key={src.id}
                onClick={() => setActiveSourceId(activeSourceId === src.id ? null : src.id)}
                className={`group flex items-center gap-2 mx-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                  activeSourceId === src.id ? 'bg-border/60' : 'hover:bg-border/30'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: src.color }} />
                <span className={`text-xs flex-1 truncate transition-colors ${src.enabled ? 'text-text' : 'text-muted/50'}`}>
                  {src.name}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); toggle(src.id) }}
                  className={`opacity-0 group-hover:opacity-100 w-3.5 h-3.5 rounded-sm border flex-shrink-0 transition-all ${
                    src.enabled
                      ? 'border-accent/40 bg-accent/20'
                      : 'border-border bg-transparent'
                  }`}
                  title={src.enabled ? 'Disable' : 'Enable'}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}
