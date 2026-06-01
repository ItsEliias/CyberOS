import { motion } from 'framer-motion'

interface Metric { label: string; value: string | number; highlight?: boolean }

interface AppCardProps {
  name: string
  subtitle: string
  active: boolean
  lastActive?: string
  metrics: Metric[]
  execPath?: string
  accentColor?: string
}

function timeAgo(iso?: string): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)  return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

export default function AppCard({ name, subtitle, active, lastActive, metrics, execPath, accentColor = '#4a9eff' }: AppCardProps) {
  async function handleLaunch() {
    if (!execPath) return
    await window.electronAPI.launchApp(execPath)
  }

  return (
    <motion.div
      layout
      className="relative bg-panel border border-border rounded-lg p-4 flex flex-col gap-3 overflow-hidden"
      whileHover={{ borderColor: active ? accentColor + '60' : '#484f58' }}
      transition={{ duration: 0.15 }}
    >
      {/* Subtle top accent line when active */}
      {active && (
        <motion.div
          layoutId={`accent-${name}`}
          className="absolute top-0 left-4 right-4 h-px"
          style={{ background: accentColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">{name}</h3>
          <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-success' : 'bg-border'}`} />
            <span className="text-[10px] text-muted">{active ? 'online' : 'offline'}</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="bg-bg/60 rounded px-2.5 py-2">
            <p className="text-[10px] text-muted/70 mb-0.5">{m.label}</p>
            <p className={`text-xs font-medium truncate ${m.highlight ? 'text-accent' : 'text-text'}`}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-[10px] text-muted/60">
          {active ? 'active' : `last seen ${timeAgo(lastActive)}`}
        </span>
        {execPath && (
          <button
            onClick={handleLaunch}
            className="no-drag text-[11px] px-2.5 py-1 rounded border transition-colors"
            style={active
              ? { color: accentColor, borderColor: accentColor + '40', background: accentColor + '12' }
              : { color: '#8b949e', borderColor: '#30363d', background: 'transparent' }
            }
          >
            {active ? 'Focus' : 'Open'} →
          </button>
        )}
      </div>
    </motion.div>
  )
}
