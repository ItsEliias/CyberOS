// AutoContextPanel — shows shared_context with AUTO badge
import { useStore } from '../../store'

export default function AutoContextPanel() {
  const context = useStore(s => s.context)

  const hasContext = !!(context.lab || context.target || context.ip)

  return (
    <div className="px-3 py-3 border-b border-border/40">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest">Auto-Context</span>
        {context.isAuto && hasContext && (
          <span className="text-[8px] px-1 py-px bg-accent/15 border border-accent/30 text-accent rounded font-mono">AUTO</span>
        )}
      </div>

      {!hasContext ? (
        <p className="text-[10px] text-muted/40 leading-relaxed">No active session.<br />Launch CyberLab or ReconDesk.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {context.lab && (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 status-dot-pulse" style={{ '--pulse-color': 'rgba(255,107,107,0.4)', '--pulse-color-fade': 'rgba(255,107,107,0)' } as React.CSSProperties} />
              <span className="text-[11px] text-text truncate font-mono">{context.lab}</span>
            </div>
          )}
          {context.target && (
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
              <span className="text-[11px] text-warning/90 truncate font-mono">{context.target}</span>
            </div>
          )}
          {context.ip && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 flex-shrink-0 flex items-center justify-center text-info">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                </svg>
              </span>
              <span className="text-[11px] text-info/80 truncate font-mono">{context.ip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
